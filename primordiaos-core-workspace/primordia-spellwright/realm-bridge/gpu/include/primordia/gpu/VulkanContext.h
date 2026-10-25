// Vulkan foundation of the standalone PrimordiaOS GPU engine: instance, device, the three
// queue roles, memory (VMA), timeline semaphores and debug names.
//
// Queue roles. The engine always asks for three roles and maps them onto what the GPU has:
//   Graphics  - a family with graphics + compute (realm renderer, presentation)
//   Compute   - a compute family without graphics if one exists (MCP runs as async compute,
//               overlapping the renderer); otherwise a second queue of the graphics family,
//               otherwise the graphics queue itself
//   Transfer  - a transfer-only family if one exists (DMA engine: uploads from PrimordiaOS);
//               otherwise the compute queue's family
// Buffers shared between roles use VK_SHARING_MODE_CONCURRENT across the distinct families,
// so no queue-family ownership transfers are needed; cross-queue ordering and memory
// visibility come entirely from timeline-semaphore signal/wait pairs.
#pragma once

#include <vulkan/vulkan.h>

#include "vma/vk_mem_alloc.h"

#include <array>
#include <atomic>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <vector>

namespace primordia::gpu
{
class VulkanError : public std::runtime_error
{
public:
	VulkanError(VkResult InResult, const std::string& What) : std::runtime_error(What), Result(InResult) {}
	VkResult Result;
};

const char* ResultName(VkResult Result);
void Check(VkResult Result, const char* What);
#define PGPU_CHECK(Expr) ::primordia::gpu::Check((Expr), #Expr)

enum class QueueRole : uint32_t
{
	Graphics = 0,
	Compute = 1,
	Transfer = 2,
};
constexpr uint32_t QueueRoleCount = 3;
const char* QueueRoleName(QueueRole Role);

struct QueueInfo
{
	VkQueue Queue = VK_NULL_HANDLE;
	uint32_t Family = UINT32_MAX;
	uint32_t Index = 0;
	/** True when this role has a queue no other role shares. */
	bool bDedicated = false;
	/** True when the family is not the graphics family (truly asynchronous hardware). */
	bool bSeparateFamily = false;
	uint32_t TimestampValidBits = 0;
};

enum class MemoryKind
{
	DeviceLocal, // GPU-only
	Upload,      // host-visible, written sequentially by the CPU, persistently mapped
	Readback,    // host-visible, cached, read by the CPU, persistently mapped
};

struct Buffer
{
	VkBuffer Handle = VK_NULL_HANDLE;
	VmaAllocation Allocation = VK_NULL_HANDLE;
	VkDeviceSize Size = 0;
	void* Mapped = nullptr;
};

struct Image
{
	VkImage Handle = VK_NULL_HANDLE;
	VmaAllocation Allocation = VK_NULL_HANDLE;
	VkImageView View = VK_NULL_HANDLE;
	VkFormat Format = VK_FORMAT_UNDEFINED;
	VkExtent2D Extent{};
};

struct ContextOptions
{
	bool bValidation = false;
	bool bSwapchain = false;   // enable surface/swapchain extensions (windowed mode)
	std::string PreferredDevice; // substring of the device name; empty = best available
};

struct DeviceCaps
{
	VkPhysicalDeviceProperties Properties{};
	bool bMemoryBudget = false;        // VK_EXT_memory_budget
	bool bCalibratedTimestamps = false; // VK_EXT_calibrated_timestamps
	bool bPipelineStatistics = false;
	bool bDebugUtils = false;
};

class VulkanContext
{
public:
	explicit VulkanContext(const ContextOptions& Options);
	~VulkanContext();
	VulkanContext(const VulkanContext&) = delete;
	VulkanContext& operator=(const VulkanContext&) = delete;

	VkInstance Instance() const { return VkInstanceHandle; }
	VkPhysicalDevice Physical() const { return PhysicalDevice; }
	VkDevice Device() const { return DeviceHandle; }
	VmaAllocator Allocator() const { return VmaHandle; }
	const DeviceCaps& Caps() const { return Capabilities; }
	const QueueInfo& Queue(QueueRole Role) const { return Queues[static_cast<uint32_t>(Role)]; }
	std::string DeviceName() const { return Capabilities.Properties.deviceName; }
	/** Distinct queue families used by the roles (for CONCURRENT sharing). */
	const std::vector<uint32_t>& Families() const { return DistinctFamilies; }
	/** Nanoseconds per timestamp tick. */
	double TimestampPeriodNs() const { return Capabilities.Properties.limits.timestampPeriod; }

	Buffer CreateBuffer(VkDeviceSize Size, VkBufferUsageFlags Usage, MemoryKind Kind, const char* Name);
	void DestroyBuffer(Buffer& B);
	/** Makes host writes to an Upload buffer visible to the device (no-op on coherent memory). */
	void Flush(const Buffer& B, VkDeviceSize Offset = 0, VkDeviceSize Size = VK_WHOLE_SIZE);
	/** Makes device writes to a Readback buffer visible to the host. */
	void Invalidate(const Buffer& B, VkDeviceSize Offset = 0, VkDeviceSize Size = VK_WHOLE_SIZE);

	Image CreateImage2D(VkExtent2D Extent, VkFormat Format, VkImageUsageFlags Usage, VkImageAspectFlags Aspect, const char* Name);
	void DestroyImage(Image& I);

	VkShaderModule LoadShader(const std::string& Path) const;
	VkSemaphore CreateTimeline(uint64_t Initial, const char* Name);
	VkSemaphore CreateBinarySemaphore(const char* Name);
	uint64_t TimelineValue(VkSemaphore Timeline) const;
	/** Host wait. Returns false on timeout. */
	bool WaitTimeline(VkSemaphore Timeline, uint64_t Value, uint64_t TimeoutNs = UINT64_MAX) const;

	VkCommandPool CreateCommandPool(QueueRole Role, const char* Name);
	/** Records Fn into a fresh command buffer on Role, submits it with a fence and waits on that
	 *  fence. For setup work only (initial clears, layout transitions), never per frame. */
	template <typename FnType>
	void ImmediateSubmit(QueueRole Role, FnType&& Fn)
	{
		VkCommandBuffer Cmd = BeginImmediate(Role);
		Fn(Cmd);
		EndImmediate(Role, Cmd);
	}

	void SetName(VkObjectType Type, uint64_t Handle, const char* Name) const;
	template <typename HandleType>
	void SetName(VkObjectType Type, HandleType Handle, const char* Name) const
	{
		SetName(Type, reinterpret_cast<uint64_t>(Handle), Name);
	}

	/** Warnings and errors the validation layer has reported so far. */
	uint32_t ValidationWarnings() const { return WarningCount.load(); }
	uint32_t ValidationErrors() const { return ErrorCount.load(); }

	/** Device-local heap usage/budget pairs, bytes (VMA, which reads VK_EXT_memory_budget). */
	struct HeapBudget
	{
		uint64_t Usage = 0;
		uint64_t Budget = 0;
		bool bDeviceLocal = false;
	};
	std::vector<HeapBudget> HeapBudgets() const;

private:
	static VKAPI_ATTR VkBool32 VKAPI_CALL DebugCallback(VkDebugUtilsMessageSeverityFlagBitsEXT Severity, VkDebugUtilsMessageTypeFlagsEXT Types,
		const VkDebugUtilsMessengerCallbackDataEXT* Data, void* User);
	void PickDevice(const ContextOptions& Options);
	void CreateDevice(const ContextOptions& Options);
	VkCommandBuffer BeginImmediate(QueueRole Role);
	void EndImmediate(QueueRole Role, VkCommandBuffer Cmd);

	VkInstance VkInstanceHandle = VK_NULL_HANDLE;
	VkDebugUtilsMessengerEXT Messenger = VK_NULL_HANDLE;
	VkPhysicalDevice PhysicalDevice = VK_NULL_HANDLE;
	VkDevice DeviceHandle = VK_NULL_HANDLE;
	VmaAllocator VmaHandle = VK_NULL_HANDLE;
	DeviceCaps Capabilities;
	std::array<QueueInfo, QueueRoleCount> Queues{};
	std::vector<uint32_t> DistinctFamilies;
	std::array<VkCommandPool, QueueRoleCount> ImmediatePools{};
	VkFence ImmediateFence = VK_NULL_HANDLE;
	PFN_vkSetDebugUtilsObjectNameEXT SetObjectName = nullptr;
	std::atomic<uint32_t> WarningCount{ 0 };
	std::atomic<uint32_t> ErrorCount{ 0 };
};
} // namespace primordia::gpu
