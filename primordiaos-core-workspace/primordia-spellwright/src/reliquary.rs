//! Reliquaries: storage buffers in persistently mapped, host-coherent memory.

use ash::vk;
use std::error::Error;

const HOST: vk::MemoryPropertyFlags =
    vk::MemoryPropertyFlags::from_raw(vk::MemoryPropertyFlags::HOST_VISIBLE.as_raw() | vk::MemoryPropertyFlags::HOST_COHERENT.as_raw());

/// Buffers the host only writes: write-combined device-local memory is fine.
pub const UPLOAD: &[vk::MemoryPropertyFlags] =
    &[vk::MemoryPropertyFlags::from_raw(HOST.as_raw() | vk::MemoryPropertyFlags::DEVICE_LOCAL.as_raw()), HOST];
/// Buffers the host reads back every tick: uncached reads are very slow, so prefer CPU-cached memory.
pub const READBACK: &[vk::MemoryPropertyFlags] =
    &[vk::MemoryPropertyFlags::from_raw(HOST.as_raw() | vk::MemoryPropertyFlags::HOST_CACHED.as_raw()), HOST];
/// GPU-only buffers. Still mapped so they start zeroed, so device-local only if also host-visible.
pub const SCRATCH: &[vk::MemoryPropertyFlags] = UPLOAD;

pub struct Reliquary {
    pub buffer: vk::Buffer,
    pub memory: vk::DeviceMemory,
    pub size: usize,
    /// Property flags of the memory type actually chosen.
    pub flags: vk::MemoryPropertyFlags,
    ptr: *mut u8,
}

impl Reliquary {
    pub unsafe fn new(
        device: &ash::Device,
        props: &vk::PhysicalDeviceMemoryProperties,
        size: usize,
        usage: vk::BufferUsageFlags,
        prefs: &[vk::MemoryPropertyFlags],
    ) -> Result<Self, Box<dyn Error>> {
        let size = size.max(4).next_multiple_of(4);
        let buffer = device.create_buffer(
            &vk::BufferCreateInfo::default()
                .size(size as u64)
                .usage(usage)
                .sharing_mode(vk::SharingMode::EXCLUSIVE),
            None,
        )?;
        let req = device.get_buffer_memory_requirements(buffer);
        // First preference (in order) that some allowed memory type satisfies.
        let type_index = prefs
            .iter()
            .find_map(|&want| {
                (0..props.memory_type_count).find(|&i| {
                    req.memory_type_bits & (1 << i) != 0
                        && props.memory_types[i as usize].property_flags.contains(want)
                })
            })
            .ok_or("no memory type matches the reliquary's preferences")?;
        let flags = props.memory_types[type_index as usize].property_flags;
        let memory = device.allocate_memory(
            &vk::MemoryAllocateInfo::default().allocation_size(req.size).memory_type_index(type_index),
            None,
        )?;
        device.bind_buffer_memory(buffer, memory, 0)?;
        let ptr = device.map_memory(memory, 0, vk::WHOLE_SIZE, vk::MemoryMapFlags::empty())? as *mut u8;
        std::ptr::write_bytes(ptr, 0, size);
        Ok(Self { buffer, memory, size, flags, ptr })
    }

    pub fn bytes(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self.ptr, self.size) }
    }

    #[allow(clippy::mut_from_ref)]
    pub fn bytes_mut(&self) -> &mut [u8] {
        unsafe { std::slice::from_raw_parts_mut(self.ptr, self.size) }
    }

    pub fn words(&self) -> &[u32] {
        unsafe { std::slice::from_raw_parts(self.ptr as *const u32, self.size / 4) }
    }

    #[allow(clippy::mut_from_ref)]
    pub fn words_mut(&self) -> &mut [u32] {
        unsafe { std::slice::from_raw_parts_mut(self.ptr as *mut u32, self.size / 4) }
    }

    pub unsafe fn destroy(&self, device: &ash::Device) {
        device.unmap_memory(self.memory);
        device.destroy_buffer(self.buffer, None);
        device.free_memory(self.memory, None);
    }
}
