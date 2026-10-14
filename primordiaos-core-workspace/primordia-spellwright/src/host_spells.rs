//! Host spells: tools that need Vulkan API calls a shader cannot make. The
//! response glyph queues them in the host-call sigil; the conduit runs them here.

use crate::grimoire::{escape, SP_HOST_LIST_DEVICES, SP_HOST_PIPELINE_INFO, IN_CAP, MAX_MSGS, OUT_CAP, SCRATCH_WORDS};
use crate::ritual::{HostCall, Ritual, GLYPHS};
use ash::vk;

pub fn cast(ritual: &Ritual, call: &HostCall) -> Vec<u8> {
    let text = match call.spell {
        SP_HOST_LIST_DEVICES => list_devices(ritual),
        SP_HOST_PIPELINE_INFO => pipeline_info(ritual),
        other => format!("unknown host spell {other}"),
    };
    let id = if call.id.is_empty() { "null".into() } else { String::from_utf8_lossy(&call.id).into_owned() };
    format!(
        "{{\"jsonrpc\":\"2.0\",\"id\":{id},\"result\":{{\"content\":[{{\"type\":\"text\",\"text\":\"{}\"}}],\"isError\":false}}}}\n",
        escape(&text)
    )
    .into_bytes()
}

fn list_devices(ritual: &Ritual) -> String {
    let instance = &ritual.instance;
    let devices = match unsafe { instance.enumerate_physical_devices() } {
        Ok(d) => d,
        Err(e) => return format!("vkEnumeratePhysicalDevices failed: {e}"),
    };
    let mut lines = Vec::new();
    for (i, &pd) in devices.iter().enumerate() {
        let p = unsafe { instance.get_physical_device_properties(pd) };
        let name = p.device_name_as_c_str().map(|c| c.to_string_lossy().into_owned()).unwrap_or_default();
        let kind = match p.device_type {
            vk::PhysicalDeviceType::DISCRETE_GPU => "discrete",
            vk::PhysicalDeviceType::INTEGRATED_GPU => "integrated",
            vk::PhysicalDeviceType::VIRTUAL_GPU => "virtual",
            vk::PhysicalDeviceType::CPU => "cpu",
            _ => "other",
        };
        let compute_queues: u32 = unsafe { instance.get_physical_device_queue_family_properties(pd) }
            .iter()
            .filter(|q| q.queue_flags.contains(vk::QueueFlags::COMPUTE))
            .map(|q| q.queue_count)
            .sum();
        let v = p.api_version;
        lines.push(format!(
            "[{i}] {name} ({kind}) Vulkan {}.{}.{} computeQueues={compute_queues}{}",
            vk::api_version_major(v),
            vk::api_version_minor(v),
            vk::api_version_patch(v),
            if pd == ritual.physical { " <- hosting the MCP glyphs" } else { "" }
        ));
    }
    lines.join("\n")
}

fn pipeline_info(ritual: &Ritual) -> String {
    let mut lines = vec![format!(
        "device: {} (maxComputeWorkGroupInvocations={})",
        ritual.device_name,
        ritual.max_workgroup_invocations()
    )];
    for g in GLYPHS.iter() {
        lines.push(format!("glyph {}: local_size_x={} groups={} - {}", g.name, g.local_size, g.groups, g.role));
    }
    lines.push(format!(
        "sigils (set 0): 0 request reliquary {IN_CAP}B, 1 control, 2 messages x{MAX_MSGS}, 3 response reliquary {OUT_CAP}B, 4 grimoire, 5 templates, 6 host calls, 7 scratch {SCRATCH_WORDS} words"
    ));
    lines.join("\n")
}
