//! The MCP ritual: Vulkan setup plus the pre-recorded three-glyph command
//! buffer (frame → parse → respond) submitted once per tick on the compute conduit.

use crate::grimoire::{self, IN_CAP, MAX_MSGS, MSG_RECORD_WORDS, OUT_CAP, SCRATCH_WORDS};
use crate::reliquary::{self, Reliquary};
use ash::vk;
use std::error::Error;

// Sigil binding slots (common.glsl).
const B_IN: usize = 0;
const B_CTL: usize = 1;
const B_MSGS: usize = 2;
const B_OUT: usize = 3;
const B_GRIMOIRE: usize = 4;
const B_TEMPLATES: usize = 5;
const B_HOST_CALLS: usize = 6;
// 7: scratch reliquary, only touched by the glyphs.
const BINDINGS: usize = 8;
// 8: the indirect reliquary (dispatch args), host-written for frame, frame-written for parse/respond.
const SET_BINDINGS: usize = BINDINGS + 1;
/// Byte offset of parse/respond's dispatch args in the indirect reliquary.
const MSG_ARGS: u64 = 12;

// Control sigil word slots.
const C_IN_LEN: usize = 0;
const C_MSG_COUNT: usize = 1;
const C_CONSUMED: usize = 2;
const C_OUT_LEN: usize = 3;
const C_HOST_CALLS: usize = 4;
const C_FLAGS: usize = 5;

pub struct GlyphInfo {
    pub name: &'static str,
    pub local_size: u32,
    pub groups: u32,
    pub role: &'static str,
}

pub const GLYPHS: [GlyphInfo; 3] = [
    // frame is dispatched indirectly: ceil(input bytes / 1024) groups, up to this many.
    GlyphInfo { name: "frame", local_size: 256, groups: (IN_CAP / 4 / 256) as u32, role: "one threadling per 4 request bytes (indirect dispatch sized to the input); finds '\\n' message boundaries" },
    // parse and respond are dispatched indirectly: ceil(messages / 64) groups (frame writes it), up to this many.
    GlyphInfo { name: "parse", local_size: 64, groups: (MAX_MSGS / 64) as u32, role: "one threadling per message (indirect dispatch sized by frame); extracts id/method/params, routes by FNV-1a hash" },
    GlyphInfo { name: "respond", local_size: 64, groups: (MAX_MSGS / 64) as u32, role: "one threadling per message (indirect dispatch sized by frame); runs GPU tool spells, serializes JSON-RPC replies" },
];

pub struct HostCall {
    pub spell: u32,
    pub id: Vec<u8>,
    /// Trimmed start offset of the message within this tick's input.
    pub msg_start: usize,
}

/// Where the respond glyph put one message's reply.
pub struct ReplySpan {
    /// Trimmed start offset of the message within this tick's input.
    pub msg_start: usize,
    /// Byte offset of the reply within `TickResult::out`.
    pub out_offset: usize,
    pub out_len: usize,
}

pub struct TickResult {
    pub consumed: usize,
    pub overflow: bool,
    pub out: Vec<u8>,
    pub host_calls: Vec<HostCall>,
    /// One span per message answered on the GPU (record aux0/aux1), in message order.
    pub replies: Vec<ReplySpan>,
}

pub struct Ritual {
    _entry: ash::Entry,
    pub instance: ash::Instance,
    pub physical: vk::PhysicalDevice,
    pub device_name: String,
    device: ash::Device,
    queue: vk::Queue,
    reliquaries: Vec<Reliquary>,
    indirect: Reliquary,
    set_layout: vk::DescriptorSetLayout,
    pool: vk::DescriptorPool,
    pipeline_layout: vk::PipelineLayout,
    modules: Vec<vk::ShaderModule>,
    pipelines: Vec<vk::Pipeline>,
    cmd_pool: vk::CommandPool,
    cmd: vk::CommandBuffer,
    fence: vk::Fence,
    query_pool: vk::QueryPool,
    ts_period_ns: f64,
    ts_mask: u64,
    prev_out_len: usize,
    /// GPU time of the last tick (timestamp queries), if the queue supports them.
    pub last_gpu_ns: Option<f64>,
}

fn spirv(bytes: &[u8]) -> Result<Vec<u32>, Box<dyn Error>> {
    Ok(ash::util::read_spv(&mut std::io::Cursor::new(bytes))?)
}

impl Ritual {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        unsafe { Self::forge() }
    }

    unsafe fn forge() -> Result<Self, Box<dyn Error>> {
        let entry = ash::Entry::load()?;
        let app = vk::ApplicationInfo::default()
            .application_name(c"primordia-spellwright")
            .api_version(vk::API_VERSION_1_2);
        let instance = entry.create_instance(&vk::InstanceCreateInfo::default().application_info(&app), None)?;

        // Pick a device: $SPELLWRIGHT_DEVICE index, else discrete, else the first with compute.
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

        // Reliquaries.
        let mem_props = instance.get_physical_device_memory_properties(physical);
        let (grimoire_bytes, template_bytes) = grimoire::inscribe();
        // Host-written buffers may live in write-combined device-local memory;
        // anything the host reads back (or clears, like the response reliquary) wants HOST_CACHED.
        let layout = [
            ("request", IN_CAP, reliquary::UPLOAD),
            ("control", 64, reliquary::READBACK),
            ("messages", MAX_MSGS * MSG_RECORD_WORDS * 4, reliquary::READBACK),
            ("response", OUT_CAP, reliquary::READBACK),
            ("grimoire", grimoire_bytes.len(), reliquary::UPLOAD),
            ("templates", template_bytes.len(), reliquary::UPLOAD),
            ("host calls", MAX_MSGS * 8, reliquary::READBACK),
            ("scratch", SCRATCH_WORDS * 4, reliquary::SCRATCH),
        ];
        let mut reliquaries = Vec::with_capacity(BINDINGS);
        for (binding, (name, size, prefs)) in layout.into_iter().enumerate() {
            let r = Reliquary::new(&device, &mem_props, size, vk::BufferUsageFlags::STORAGE_BUFFER, prefs)?;
            eprintln!("spellwright: reliquary {binding} {name:<10} {:?}", r.flags);
            reliquaries.push(r);
        }
        // Two VkDispatchIndirectCommands: frame's, then parse/respond's (frame writes it).
        let indirect = Reliquary::new(
            &device,
            &mem_props,
            24,
            vk::BufferUsageFlags::INDIRECT_BUFFER | vk::BufferUsageFlags::STORAGE_BUFFER,
            reliquary::UPLOAD,
        )?;
        eprintln!("spellwright: reliquary - indirect   {:?}", indirect.flags);
        reliquaries[B_GRIMOIRE].bytes_mut()[..grimoire_bytes.len()].copy_from_slice(&grimoire_bytes);
        reliquaries[B_TEMPLATES].bytes_mut()[..template_bytes.len()].copy_from_slice(&template_bytes);

        // Sigils: one descriptor set of nine storage buffers shared by all glyphs.
        let bindings: Vec<_> = (0..SET_BINDINGS as u32)
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
        let pool_sizes = [vk::DescriptorPoolSize { ty: vk::DescriptorType::STORAGE_BUFFER, descriptor_count: SET_BINDINGS as u32 }];
        let pool = device.create_descriptor_pool(
            &vk::DescriptorPoolCreateInfo::default().max_sets(1).pool_sizes(&pool_sizes),
            None,
        )?;
        let layouts = [set_layout];
        let set = device.allocate_descriptor_sets(
            &vk::DescriptorSetAllocateInfo::default().descriptor_pool(pool).set_layouts(&layouts),
        )?[0];
        let infos: Vec<[vk::DescriptorBufferInfo; 1]> = reliquaries
            .iter()
            .chain(std::iter::once(&indirect))
            .map(|r| [vk::DescriptorBufferInfo { buffer: r.buffer, offset: 0, range: vk::WHOLE_SIZE }])
            .collect();
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

        // Spells: one compute pipeline per glyph.
        let pipeline_layout =
            device.create_pipeline_layout(&vk::PipelineLayoutCreateInfo::default().set_layouts(&layouts), None)?;
        let sources: [&[u8]; 3] = [
            include_bytes!(concat!(env!("OUT_DIR"), "/frame.spv")),
            include_bytes!(concat!(env!("OUT_DIR"), "/parse.spv")),
            include_bytes!(concat!(env!("OUT_DIR"), "/respond.spv")),
        ];
        let mut modules = Vec::new();
        let mut pipelines = Vec::new();
        for src in sources {
            let code = spirv(src)?;
            let module = device.create_shader_module(&vk::ShaderModuleCreateInfo::default().code(&code), None)?;
            modules.push(module);
            let info = vk::ComputePipelineCreateInfo::default()
                .stage(
                    vk::PipelineShaderStageCreateInfo::default()
                        .stage(vk::ShaderStageFlags::COMPUTE)
                        .module(module)
                        .name(c"main"),
                )
                .layout(pipeline_layout);
            let p = device
                .create_compute_pipelines(vk::PipelineCache::null(), &[info], None)
                .map_err(|(_, e)| e)?;
            pipelines.push(p[0]);
        }

        // The ritual: recorded once, resubmitted every tick.
        let cmd_pool = device.create_command_pool(&vk::CommandPoolCreateInfo::default().queue_family_index(family), None)?;
        let cmd = device.allocate_command_buffers(
            &vk::CommandBufferAllocateInfo::default()
                .command_pool(cmd_pool)
                .level(vk::CommandBufferLevel::PRIMARY)
                .command_buffer_count(1),
        )?[0];
        let query_pool = device.create_query_pool(
            &vk::QueryPoolCreateInfo::default().query_type(vk::QueryType::TIMESTAMP).query_count(2),
            None,
        )?;
        device.begin_command_buffer(cmd, &vk::CommandBufferBeginInfo::default())?;
        device.cmd_reset_query_pool(cmd, query_pool, 0, 2);
        device.cmd_write_timestamp(cmd, vk::PipelineStageFlags::TOP_OF_PIPE, query_pool, 0);
        device.cmd_bind_descriptor_sets(cmd, vk::PipelineBindPoint::COMPUTE, pipeline_layout, 0, &[set], &[]);
        let compute_barrier = [vk::MemoryBarrier::default()
            .src_access_mask(vk::AccessFlags::SHADER_WRITE)
            .dst_access_mask(vk::AccessFlags::SHADER_READ | vk::AccessFlags::SHADER_WRITE)];
        // After frame, its group count for parse/respond is also read as indirect args.
        let frame_barrier = [vk::MemoryBarrier::default()
            .src_access_mask(vk::AccessFlags::SHADER_WRITE)
            .dst_access_mask(vk::AccessFlags::SHADER_READ | vk::AccessFlags::SHADER_WRITE | vk::AccessFlags::INDIRECT_COMMAND_READ)];
        for (i, pipeline) in pipelines.iter().enumerate() {
            if i > 0 {
                let (dst_stage, barrier) = if i == 1 {
                    (vk::PipelineStageFlags::COMPUTE_SHADER | vk::PipelineStageFlags::DRAW_INDIRECT, &frame_barrier)
                } else {
                    (vk::PipelineStageFlags::COMPUTE_SHADER, &compute_barrier)
                };
                device.cmd_pipeline_barrier(
                    cmd,
                    vk::PipelineStageFlags::COMPUTE_SHADER,
                    dst_stage,
                    vk::DependencyFlags::empty(),
                    barrier,
                    &[],
                    &[],
                );
            }
            device.cmd_bind_pipeline(cmd, vk::PipelineBindPoint::COMPUTE, *pipeline);
            device.cmd_dispatch_indirect(cmd, indirect.buffer, if i == 0 { 0 } else { MSG_ARGS });
        }
        device.cmd_write_timestamp(cmd, vk::PipelineStageFlags::BOTTOM_OF_PIPE, query_pool, 1);
        let host_barrier = [vk::MemoryBarrier::default()
            .src_access_mask(vk::AccessFlags::SHADER_WRITE)
            .dst_access_mask(vk::AccessFlags::HOST_READ)];
        device.cmd_pipeline_barrier(
            cmd,
            vk::PipelineStageFlags::COMPUTE_SHADER,
            vk::PipelineStageFlags::HOST,
            vk::DependencyFlags::empty(),
            &host_barrier,
            &[],
            &[],
        );
        device.end_command_buffer(cmd)?;
        let fence = device.create_fence(&vk::FenceCreateInfo::default(), None)?;

        Ok(Self {
            _entry: entry,
            instance,
            physical,
            device_name,
            device,
            queue,
            reliquaries,
            indirect,
            set_layout,
            pool,
            pipeline_layout,
            modules,
            pipelines,
            cmd_pool,
            cmd,
            fence,
            query_pool,
            ts_period_ns: props.limits.timestamp_period as f64,
            ts_mask: if ts_bits >= 64 { u64::MAX } else { (1u64 << ts_bits) - 1 },
            prev_out_len: 0,
            last_gpu_ns: None,
        })
    }

    /// One tick: upload request bytes, run frame → parse → respond, collect replies.
    pub fn tick(&mut self, input: &[u8]) -> Result<TickResult, Box<dyn Error>> {
        assert!(input.len() <= IN_CAP);
        let r = &self.reliquaries;

        // The response glyph ORs bytes in, so clear what the last tick wrote.
        r[B_OUT].bytes_mut()[..self.prev_out_len.next_multiple_of(4).min(OUT_CAP)].fill(0);
        r[B_IN].bytes_mut()[..input.len()].copy_from_slice(input);
        let ctl = r[B_CTL].words_mut();
        ctl[C_IN_LEN] = input.len() as u32;
        ctl[C_MSG_COUNT] = 0;
        ctl[C_CONSUMED] = 0;
        ctl[C_OUT_LEN] = 0;
        ctl[C_HOST_CALLS] = 0;
        ctl[C_FLAGS] = 0;
        // Group 0 also bumps the tick counter, so always dispatch at least one.
        // parse/respond start at 0 groups; frame raises that to cover the messages it finds.
        let frame_groups = input.len().div_ceil(4 * 256).max(1) as u32;
        self.indirect.words_mut()[..6].copy_from_slice(&[frame_groups, 1, 1, 0, 1, 1]);

        unsafe {
            let cmds = [self.cmd];
            let submit = [vk::SubmitInfo::default().command_buffers(&cmds)];
            self.device.queue_submit(self.queue, &submit, self.fence)?;
            self.device.wait_for_fences(&[self.fence], true, u64::MAX)?;
            self.device.reset_fences(&[self.fence])?;
            let mut ts = [0u64; 2];
            self.last_gpu_ns = if self.ts_mask == 0 {
                None
            } else {
                self.device
                    .get_query_pool_results(self.query_pool, 0, &mut ts, vk::QueryResultFlags::TYPE_64)
                    .ok()
                    .map(|_| ((ts[1] & self.ts_mask).wrapping_sub(ts[0] & self.ts_mask) & self.ts_mask) as f64 * self.ts_period_ns)
            };
        }

        let ctl = r[B_CTL].words();
        let out_len = (ctl[C_OUT_LEN] as usize).min(OUT_CAP);
        self.prev_out_len = out_len;
        let overflow = ctl[C_FLAGS] != 0 || ctl[C_MSG_COUNT] as usize > MAX_MSGS;

        let msgs = r[B_MSGS].words();
        let calls = r[B_HOST_CALLS].words();
        let host_calls = (0..(ctl[C_HOST_CALLS] as usize).min(MAX_MSGS))
            .map(|k| {
                let (msg, spell) = (calls[2 * k] as usize, calls[2 * k + 1]);
                let rec = &msgs[msg * MSG_RECORD_WORDS..];
                let (id_s, id_e) = (rec[2] as usize, rec[3] as usize);
                HostCall { spell, id: input[id_s.min(id_e)..id_e.min(input.len())].to_vec(), msg_start: rec[0] as usize }
            })
            .collect();
        let replies = msgs
            .chunks_exact(MSG_RECORD_WORDS)
            .take((ctl[C_MSG_COUNT] as usize).min(MAX_MSGS))
            .filter(|rec| rec[10] > 0)
            .map(|rec| ReplySpan { msg_start: rec[0] as usize, out_offset: rec[9] as usize, out_len: rec[10] as usize })
            .collect();

        Ok(TickResult {
            consumed: ctl[C_CONSUMED] as usize,
            overflow,
            out: r[B_OUT].bytes()[..out_len].to_vec(),
            host_calls,
            replies,
        })
    }

    pub fn max_workgroup_invocations(&self) -> u32 {
        unsafe { self.instance.get_physical_device_properties(self.physical).limits.max_compute_work_group_invocations }
    }
}

impl Drop for Ritual {
    fn drop(&mut self) {
        unsafe {
            let _ = self.device.device_wait_idle();
            self.device.destroy_fence(self.fence, None);
            self.device.destroy_query_pool(self.query_pool, None);
            self.device.destroy_command_pool(self.cmd_pool, None);
            for &p in &self.pipelines {
                self.device.destroy_pipeline(p, None);
            }
            for &m in &self.modules {
                self.device.destroy_shader_module(m, None);
            }
            self.device.destroy_pipeline_layout(self.pipeline_layout, None);
            self.device.destroy_descriptor_pool(self.pool, None);
            self.device.destroy_descriptor_set_layout(self.set_layout, None);
            for r in &self.reliquaries {
                r.destroy(&self.device);
            }
            self.indirect.destroy(&self.device);
            self.device.destroy_device(None);
            self.instance.destroy_instance(None);
        }
    }
}
