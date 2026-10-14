//! GPU LZ4 block decoder: decodes many independent pack blocks (src/pack.rs) at once with the
//! `lz4_decode` glyph, one threadling per block.
//!
//! The host fills `input_mut()` with compressed bytes (blocks at any byte offset), describes each
//! block with a `BlockJob`, and calls `decode`, which returns the output buffer. Every job's
//! status is checked; the first failing job is reported as an error.
//!
//! Bounded dispatches: a threadling decodes its block serially, so instead of running each block
//! to completion a dispatch gives every job at most `STEP_BUDGET` work steps, after which the job
//! saves its position and reports "pending". `decode` records `ROUNDS_PER_SUBMIT` rounds of
//! dispatches (with barriers between them) and resubmits until no job is pending. Large job lists
//! are also split into dispatches of at most `JOBS_PER_DISPATCH` jobs.
//!
//! Job rules (checked on the host, and again in the shader):
//! - `[in_offset, in_offset + len)` lies inside the input buffer;
//! - `[out_offset, out_offset + raw_size)` lies inside the output buffer, `out_offset` is a
//!   multiple of 4, and no two jobs' output ranges overlap (blocks of a pack laid out back to back
//!   satisfy this, since block_size is a multiple of 4);
//! - `raw_size <= MAX_JOB_RAW`: one LZ4 sequence cannot be split across dispatches, so this bounds
//!   the work a job can do past its step budget.

use crate::pack::{BlockEntry, STORED_BIT};
use crate::reliquary::{self, Reliquary};
use ash::vk;
use std::error::Error;

/// Input buffer capacity: 64 MiB of compressed blocks plus room for the 4-byte padding between
/// blocks when whole file ranges are read straight in.
pub const INPUT_CAPACITY: usize = 65 << 20;
pub const OUTPUT_CAPACITY: usize = 64 << 20;
/// Most jobs per `decode` call.
pub const MAX_JOBS: usize = 1 << 16;
/// Largest raw size of one job (= the largest pack block size).
pub const MAX_JOB_RAW: u32 = crate::pack::MAX_BLOCK_SIZE;
/// Work steps (one LZ4 sequence, or one 4-byte / 16-byte copy) per job per dispatch.
pub const STEP_BUDGET: u32 = 4096;
/// Dispatch rounds recorded per submit; `decode` resubmits while jobs are pending.
pub const ROUNDS_PER_SUBMIT: usize = 4;
/// Jobs per dispatch before a large batch is split.
pub const JOBS_PER_DISPATCH: usize = 256;
const LOCAL_SIZE: u32 = 64; // lz4_decode.comp local_size_x
const PAGE: usize = 4096;

/// Status codes reported per job by the shader (see shaders/lz4_decode.comp).
pub const STATUS_OK: u32 = 0;
pub const STATUS_PENDING: u32 = 7;
pub const STATUS_NOT_RUN: u32 = u32::MAX;

pub fn status_name(code: u32) -> &'static str {
    match code {
        0 => "ok",
        1 => "bad job range",
        2 => "truncated input",
        3 => "output overrun",
        4 => "bad match offset",
        5 => "decoded size mismatch",
        6 => "stored size mismatch",
        STATUS_PENDING => "pending",
        STATUS_NOT_RUN => "not run",
        _ => "unknown error",
    }
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct BlockJob {
    pub in_offset: u32,
    /// Raw pack field, including the stored bit (bit 31).
    pub comp_size: u32,
    pub raw_size: u32,
    pub out_offset: u32,
}

impl BlockJob {
    pub fn new(entry: &BlockEntry, in_offset: u32, out_offset: u32) -> Self {
        Self { in_offset, comp_size: entry.comp_size, raw_size: entry.raw_size, out_offset }
    }

    fn len(&self) -> u32 {
        self.comp_size & !STORED_BIT
    }
}

pub struct GpuDecoder {
    _entry: ash::Entry,
    instance: ash::Instance,
    pub device_name: String,
    device: ash::Device,
    queue: vk::Queue,
    jobs: Reliquary,
    input: Reliquary,
    /// Byte offset of the page-aligned input window within `input`.
    input_pad: usize,
    output: Reliquary,
    status: Reliquary,
    state: Reliquary,
    set_layout: vk::DescriptorSetLayout,
    pool: vk::DescriptorPool,
    set: vk::DescriptorSet,
    pipeline_layout: vk::PipelineLayout,
    module: vk::ShaderModule,
    pipeline: vk::Pipeline,
    cmd_pool: vk::CommandPool,
    cmd: vk::CommandBuffer,
    fence: vk::Fence,
    query_pool: vk::QueryPool,
    ts_period_ns: f64,
    ts_mask: u64,
    last_jobs: usize,
    /// GPU time of the last `decode` (all its dispatches), if the queue supports timestamps.
    pub last_gpu_ns: Option<f64>,
    /// Longest dispatch round of the last `decode` (a bound on each of its dispatches).
    pub last_longest_round_ns: Option<f64>,
    /// Dispatches per round, and submits, of the last `decode`.
    pub last_dispatches: usize,
    pub last_submits: usize,
}

impl GpuDecoder {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        unsafe { Self::forge() }
    }

    unsafe fn forge() -> Result<Self, Box<dyn Error>> {
        let entry = ash::Entry::load()?;
        let app = vk::ApplicationInfo::default()
            .application_name(c"primordia-spellwright-lz4")
            .api_version(vk::API_VERSION_1_2);
        let instance = entry.create_instance(&vk::InstanceCreateInfo::default().application_info(&app), None)?;

        // Same device choice as the ritual: $SPELLWRIGHT_DEVICE, else discrete, else first with compute.
        let devices = instance.enumerate_physical_devices()?;
        let compute_family = |pd: vk::PhysicalDevice| {
            instance
                .get_physical_device_queue_family_properties(pd)
                .iter()
                .position(|q| q.queue_flags.contains(vk::QueueFlags::COMPUTE))
                .map(|i| i as u32)
        };
        let forced = std::env::var("SPELLWRIGHT_DEVICE").ok().and_then(|s| s.parse::<usize>().ok());
        let candidates: Vec<_> = devices.iter().copied().filter(|&pd| compute_family(pd).is_some()).collect();
        let physical = match forced {
            Some(i) => *devices.get(i).ok_or("SPELLWRIGHT_DEVICE out of range")?,
            None => candidates
                .iter()
                .copied()
                .find(|&pd| instance.get_physical_device_properties(pd).device_type == vk::PhysicalDeviceType::DISCRETE_GPU)
                .or_else(|| candidates.first().copied())
                .ok_or("no Vulkan device with a compute queue")?,
        };
        let family = compute_family(physical).ok_or("selected device has no compute queue")?;
        let ts_bits = instance.get_physical_device_queue_family_properties(physical)[family as usize].timestamp_valid_bits;
        let props = instance.get_physical_device_properties(physical);
        let device_name = props.device_name_as_c_str()?.to_string_lossy().into_owned();

        let priorities = [1.0f32];
        let queue_info = [vk::DeviceQueueCreateInfo::default().queue_family_index(family).queue_priorities(&priorities)];
        let device = instance.create_device(physical, &vk::DeviceCreateInfo::default().queue_create_infos(&queue_info), None)?;
        let queue = device.get_device_queue(family, 0);

        // Host-written buffers in (possibly write-combined) device-local memory; the host reads
        // output and status back, so those want HOST_CACHED.
        let mem_props = instance.get_physical_device_memory_properties(physical);
        let storage = vk::BufferUsageFlags::STORAGE_BUFFER;
        let jobs = Reliquary::new(&device, &mem_props, MAX_JOBS * 16, storage, reliquary::UPLOAD)?;
        let input = Reliquary::new(&device, &mem_props, INPUT_CAPACITY + PAGE, storage, reliquary::UPLOAD)?;
        let output = Reliquary::new(&device, &mem_props, OUTPUT_CAPACITY, storage, reliquary::READBACK)?;
        let status = Reliquary::new(&device, &mem_props, MAX_JOBS * 8, storage, reliquary::READBACK)?;
        let state = Reliquary::new(&device, &mem_props, MAX_JOBS * 16, storage, reliquary::SCRATCH)?;

        // Page-align the input window so unbuffered file reads can target it directly.
        let input_pad = (input.bytes().as_ptr() as usize).next_multiple_of(PAGE) - input.bytes().as_ptr() as usize;
        let min_align = props.limits.min_storage_buffer_offset_alignment as usize;
        if input_pad % min_align.max(1) != 0 {
            return Err(format!("mapped input at offset {input_pad} is not a valid storage buffer offset").into());
        }

        let bindings: Vec<_> = (0..5)
            .map(|b| {
                vk::DescriptorSetLayoutBinding::default()
                    .binding(b)
                    .descriptor_type(vk::DescriptorType::STORAGE_BUFFER)
                    .descriptor_count(1)
                    .stage_flags(vk::ShaderStageFlags::COMPUTE)
            })
            .collect();
        let set_layout =
            device.create_descriptor_set_layout(&vk::DescriptorSetLayoutCreateInfo::default().bindings(&bindings), None)?;
        let pool_sizes = [vk::DescriptorPoolSize { ty: vk::DescriptorType::STORAGE_BUFFER, descriptor_count: 5 }];
        let pool = device
            .create_descriptor_pool(&vk::DescriptorPoolCreateInfo::default().max_sets(1).pool_sizes(&pool_sizes), None)?;
        let layouts = [set_layout];
        let set = device
            .allocate_descriptor_sets(&vk::DescriptorSetAllocateInfo::default().descriptor_pool(pool).set_layouts(&layouts))?[0];
        let infos = [
            [vk::DescriptorBufferInfo { buffer: jobs.buffer, offset: 0, range: vk::WHOLE_SIZE }],
            [vk::DescriptorBufferInfo { buffer: input.buffer, offset: input_pad as u64, range: INPUT_CAPACITY as u64 }],
            [vk::DescriptorBufferInfo { buffer: output.buffer, offset: 0, range: OUTPUT_CAPACITY as u64 }],
            [vk::DescriptorBufferInfo { buffer: status.buffer, offset: 0, range: vk::WHOLE_SIZE }],
            [vk::DescriptorBufferInfo { buffer: state.buffer, offset: 0, range: vk::WHOLE_SIZE }],
        ];
        let writes: Vec<_> = infos
            .iter()
            .enumerate()
            .map(|(b, info)| {
                vk::WriteDescriptorSet::default()
                    .dst_set(set)
                    .dst_binding(b as u32)
                    .descriptor_type(vk::DescriptorType::STORAGE_BUFFER)
                    .buffer_info(info)
            })
            .collect();
        device.update_descriptor_sets(&writes, &[]);

        let push_range =
            [vk::PushConstantRange { stage_flags: vk::ShaderStageFlags::COMPUTE, offset: 0, size: 20 }];
        let pipeline_layout = device.create_pipeline_layout(
            &vk::PipelineLayoutCreateInfo::default().set_layouts(&layouts).push_constant_ranges(&push_range),
            None,
        )?;
        let code = ash::util::read_spv(&mut std::io::Cursor::new(
            &include_bytes!(concat!(env!("OUT_DIR"), "/lz4_decode.spv"))[..],
        ))?;
        let module = device.create_shader_module(&vk::ShaderModuleCreateInfo::default().code(&code), None)?;
        let info = vk::ComputePipelineCreateInfo::default()
            .stage(
                vk::PipelineShaderStageCreateInfo::default()
                    .stage(vk::ShaderStageFlags::COMPUTE)
                    .module(module)
                    .name(c"main"),
            )
            .layout(pipeline_layout);
        let pipeline = device.create_compute_pipelines(vk::PipelineCache::null(), &[info], None).map_err(|(_, e)| e)?[0];

        let cmd_pool = device.create_command_pool(
            &vk::CommandPoolCreateInfo::default()
                .queue_family_index(family)
                .flags(vk::CommandPoolCreateFlags::RESET_COMMAND_BUFFER),
            None,
        )?;
        let cmd = device.allocate_command_buffers(
            &vk::CommandBufferAllocateInfo::default()
                .command_pool(cmd_pool)
                .level(vk::CommandBufferLevel::PRIMARY)
                .command_buffer_count(1),
        )?[0];
        let query_pool = device.create_query_pool(
            &vk::QueryPoolCreateInfo::default()
                .query_type(vk::QueryType::TIMESTAMP)
                .query_count(ROUNDS_PER_SUBMIT as u32 + 1),
            None,
        )?;
        let fence = device.create_fence(&vk::FenceCreateInfo::default(), None)?;

        Ok(Self {
            _entry: entry,
            instance,
            device_name,
            device,
            queue,
            jobs,
            input,
            input_pad,
            output,
            status,
            state,
            set_layout,
            pool,
            set,
            pipeline_layout,
            module,
            pipeline,
            cmd_pool,
            cmd,
            fence,
            query_pool,
            ts_period_ns: props.limits.timestamp_period as f64,
            ts_mask: if ts_bits >= 64 { u64::MAX } else { (1u64 << ts_bits) - 1 },
            last_jobs: 0,
            last_gpu_ns: None,
            last_longest_round_ns: None,
            last_dispatches: 0,
            last_submits: 0,
        })
    }

    /// The mapped, GPU-readable input buffer (page-aligned start). The host should only write
    /// it: it may be uncached, write-combined memory, which is very slow to read.
    pub fn input_mut(&mut self) -> &mut [u8] {
        &mut self.input.bytes_mut()[self.input_pad..self.input_pad + INPUT_CAPACITY]
    }

    pub fn input_capacity(&self) -> usize {
        INPUT_CAPACITY
    }

    pub fn output_capacity(&self) -> usize {
        OUTPUT_CAPACITY
    }

    /// The output buffer, writable, e.g. to place guard bytes around job ranges in tests.
    /// Bytes outside every job's output range are never written by `decode`.
    pub fn output_mut(&mut self) -> &mut [u8] {
        &mut self.output.bytes_mut()[..OUTPUT_CAPACITY]
    }

    /// `[code, detail]` per job of the last `decode` (see `status_name`; detail is the input
    /// position, relative to the job's in_offset, where decoding stopped).
    pub fn job_status(&self) -> &[[u32; 2]] {
        let words = self.status.words();
        unsafe { std::slice::from_raw_parts(words.as_ptr() as *const [u32; 2], self.last_jobs) }
    }

    /// Decodes every job and returns the whole output buffer (`output_capacity()` bytes).
    pub fn decode(&mut self, jobs: &[BlockJob]) -> Result<&[u8], Box<dyn Error>> {
        validate(jobs)?;
        self.run(jobs)?;
        if let Some((i, s)) = self.job_status().iter().enumerate().find(|(_, s)| s[0] != STATUS_OK) {
            let j = jobs[i];
            return Err(format!(
                "lz4 decode: job {i} (in_offset {}, comp_size {:#x}, raw_size {}) failed: {} (code {}) at input byte {}",
                j.in_offset,
                j.comp_size,
                j.raw_size,
                status_name(s[0]),
                s[0],
                s[1]
            )
            .into());
        }
        Ok(&self.output.bytes()[..OUTPUT_CAPACITY])
    }

    /// Like `decode` but skips the host-side job checks, so the shader's own range checks can be
    /// tested. Output ranges must still not overlap. Statuses are left in `job_status()`.
    #[doc(hidden)]
    pub fn decode_unchecked_for_tests(&mut self, jobs: &[BlockJob]) -> Result<(), Box<dyn Error>> {
        if jobs.len() > MAX_JOBS {
            return Err("too many jobs".into());
        }
        self.run(jobs)
    }

    fn run(&mut self, jobs: &[BlockJob]) -> Result<(), Box<dyn Error>> {
        // Upload jobs, mark every status "not run" so skipped jobs cannot pass as ok.
        let words = self.jobs.words_mut();
        for (k, j) in jobs.iter().enumerate() {
            words[k * 4..k * 4 + 4].copy_from_slice(&[j.in_offset, j.comp_size, j.raw_size, j.out_offset]);
        }
        self.status.words_mut()[..jobs.len() * 2].fill(STATUS_NOT_RUN);
        self.last_jobs = jobs.len();

        let chunks: Vec<(u32, u32)> = (0..jobs.len())
            .step_by(JOBS_PER_DISPATCH)
            .map(|b| (b as u32, (jobs.len() - b).min(JOBS_PER_DISPATCH) as u32))
            .collect();
        self.last_dispatches = chunks.len();

        unsafe {
            let d = &self.device;
            d.reset_command_buffer(self.cmd, vk::CommandBufferResetFlags::empty())?;
            d.begin_command_buffer(self.cmd, &vk::CommandBufferBeginInfo::default())?;
            d.cmd_reset_query_pool(self.cmd, self.query_pool, 0, ROUNDS_PER_SUBMIT as u32 + 1);
            d.cmd_write_timestamp(self.cmd, vk::PipelineStageFlags::TOP_OF_PIPE, self.query_pool, 0);
            d.cmd_bind_pipeline(self.cmd, vk::PipelineBindPoint::COMPUTE, self.pipeline);
            d.cmd_bind_descriptor_sets(self.cmd, vk::PipelineBindPoint::COMPUTE, self.pipeline_layout, 0, &[self.set], &[]);
            let between_rounds = [vk::MemoryBarrier::default()
                .src_access_mask(vk::AccessFlags::SHADER_WRITE)
                .dst_access_mask(vk::AccessFlags::SHADER_READ | vk::AccessFlags::SHADER_WRITE)];
            for round in 0..ROUNDS_PER_SUBMIT {
                if round > 0 {
                    d.cmd_pipeline_barrier(
                        self.cmd,
                        vk::PipelineStageFlags::COMPUTE_SHADER,
                        vk::PipelineStageFlags::COMPUTE_SHADER,
                        vk::DependencyFlags::empty(),
                        &between_rounds,
                        &[],
                        &[],
                    );
                }
                // Dispatches within a round write disjoint ranges, so no barriers between them.
                for &(base, count) in &chunks {
                    let push = [base, count, INPUT_CAPACITY as u32, OUTPUT_CAPACITY as u32, STEP_BUDGET];
                    let bytes: Vec<u8> = push.iter().flat_map(|w| w.to_le_bytes()).collect();
                    d.cmd_push_constants(self.cmd, self.pipeline_layout, vk::ShaderStageFlags::COMPUTE, 0, &bytes);
                    d.cmd_dispatch(self.cmd, count.div_ceil(LOCAL_SIZE), 1, 1);
                }
                d.cmd_write_timestamp(self.cmd, vk::PipelineStageFlags::BOTTOM_OF_PIPE, self.query_pool, round as u32 + 1);
            }
            let host_barrier = [vk::MemoryBarrier::default()
                .src_access_mask(vk::AccessFlags::SHADER_WRITE)
                .dst_access_mask(vk::AccessFlags::HOST_READ)];
            d.cmd_pipeline_barrier(
                self.cmd,
                vk::PipelineStageFlags::COMPUTE_SHADER,
                vk::PipelineStageFlags::HOST,
                vk::DependencyFlags::empty(),
                &host_barrier,
                &[],
                &[],
            );
            d.end_command_buffer(self.cmd)?;

            // Every round lets each pending job make progress (at least one sequence or one
            // 16-byte copy), so this terminates; the cap only guards against bugs.
            let max_submits = 2 + (MAX_JOB_RAW as usize + INPUT_CAPACITY) / ROUNDS_PER_SUBMIT;
            let (mut total_ns, mut longest_ns) = (Some(0f64), Some(0f64));
            self.last_submits = 0;
            loop {
                let cmds = [self.cmd];
                let submit = [vk::SubmitInfo::default().command_buffers(&cmds)];
                d.queue_submit(self.queue, &submit, self.fence)?;
                d.wait_for_fences(&[self.fence], true, u64::MAX)?;
                d.reset_fences(&[self.fence])?;
                self.last_submits += 1;

                let mut ts = [0u64; ROUNDS_PER_SUBMIT + 1];
                let have_ts = self.ts_mask != 0
                    && d.get_query_pool_results(self.query_pool, 0, &mut ts, vk::QueryResultFlags::TYPE_64).is_ok();
                if have_ts {
                    let mask = self.ts_mask;
                    let ns = |a: u64, b: u64| ((b & mask).wrapping_sub(a & mask) & mask) as f64 * self.ts_period_ns;
                    total_ns = total_ns.map(|t| t + ns(ts[0], ts[ROUNDS_PER_SUBMIT]));
                    longest_ns = longest_ns.map(|l| ts.windows(2).map(|w| ns(w[0], w[1])).fold(l, f64::max));
                } else {
                    (total_ns, longest_ns) = (None, None);
                }

                if !self.job_status().iter().any(|s| s[0] == STATUS_PENDING) {
                    break;
                }
                if self.last_submits >= max_submits {
                    return Err("lz4 decode: jobs still pending after the submit limit".into());
                }
            }
            self.last_gpu_ns = total_ns;
            self.last_longest_round_ns = longest_ns;
        }
        Ok(())
    }
}

/// Host-side job checks: ranges inside the buffers, aligned non-overlapping outputs, bounded work.
fn validate(jobs: &[BlockJob]) -> Result<(), Box<dyn Error>> {
    if jobs.len() > MAX_JOBS {
        return Err(format!("{} jobs exceed the per-decode limit of {MAX_JOBS}", jobs.len()).into());
    }
    for (i, j) in jobs.iter().enumerate() {
        let bad = |why: &str| -> Box<dyn Error> { format!("lz4 decode: job {i} rejected: {why}").into() };
        if j.in_offset as u64 + j.len() as u64 > INPUT_CAPACITY as u64 {
            return Err(bad("input range exceeds the input buffer"));
        }
        if j.out_offset as u64 + j.raw_size as u64 > OUTPUT_CAPACITY as u64 {
            return Err(bad("output range exceeds the output buffer"));
        }
        if j.out_offset % 4 != 0 {
            return Err(bad("out_offset is not 4-byte aligned"));
        }
        if j.raw_size > MAX_JOB_RAW {
            return Err(bad("raw_size exceeds MAX_JOB_RAW"));
        }
    }
    let mut order: Vec<usize> = (0..jobs.len()).filter(|&i| jobs[i].raw_size > 0).collect();
    order.sort_unstable_by_key(|&i| jobs[i].out_offset);
    for w in order.windows(2) {
        let (a, b) = (&jobs[w[0]], &jobs[w[1]]);
        if a.out_offset as u64 + a.raw_size as u64 > b.out_offset as u64 {
            return Err(format!("lz4 decode: jobs {} and {} have overlapping output ranges", w[0], w[1]).into());
        }
    }
    Ok(())
}

impl Drop for GpuDecoder {
    fn drop(&mut self) {
        unsafe {
            let _ = self.device.device_wait_idle();
            self.device.destroy_fence(self.fence, None);
            self.device.destroy_query_pool(self.query_pool, None);
            self.device.destroy_command_pool(self.cmd_pool, None);
            self.device.destroy_pipeline(self.pipeline, None);
            self.device.destroy_shader_module(self.module, None);
            self.device.destroy_pipeline_layout(self.pipeline_layout, None);
            self.device.destroy_descriptor_pool(self.pool, None);
            self.device.destroy_descriptor_set_layout(self.set_layout, None);
            for r in [&self.jobs, &self.input, &self.output, &self.status, &self.state] {
                r.destroy(&self.device);
            }
            self.device.destroy_device(None);
            self.instance.destroy_instance(None);
        }
    }
}
