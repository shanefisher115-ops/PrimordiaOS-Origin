#include "primordia/gpu/VulkanContext.h"

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <map>
#include <set>

namespace primordia::gpu
{
const char* ResultName(VkResult Result)
{
	switch (Result)
	{
	case VK_SUCCESS: return "VK_SUCCESS";
	case VK_NOT_READY: return "VK_NOT_READY";
	case VK_TIMEOUT: return "VK_TIMEOUT";
	case VK_SUBOPTIMAL_KHR: return "VK_SUBOPTIMAL_KHR";
	case VK_ERROR_OUT_OF_HOST_MEMORY: return "VK_ERROR_OUT_OF_HOST_MEMORY";
	case VK_ERROR_OUT_OF_DEVICE_MEMORY: return "VK_ERROR_OUT_OF_DEVICE_MEMORY";
	case VK_ERROR_INITIALIZATION_FAILED: return "VK_ERROR_INITIALIZATION_FAILED";
	case VK_ERROR_DEVICE_LOST: return "VK_ERROR_DEVICE_LOST";
	case VK_ERROR_LAYER_NOT_PRESENT: return "VK_ERROR_LAYER_NOT_PRESENT";
	case VK_ERROR_EXTENSION_NOT_PRESENT: return "VK_ERROR_EXTENSION_NOT_PRESENT";
	case VK_ERROR_FEATURE_NOT_PRESENT: return "VK_ERROR_FEATURE_NOT_PRESENT";
	case VK_ERROR_INCOMPATIBLE_DRIVER: return "VK_ERROR_INCOMPATIBLE_DRIVER";
	case VK_ERROR_OUT_OF_DATE_KHR: return "VK_ERROR_OUT_OF_DATE_KHR";
	case VK_ERROR_SURFACE_LOST_KHR: return "VK_ERROR_SURFACE_LOST_KHR";
	default: return "VkResult(other)";
	}
}

void Check(VkResult Result, const char* What)
{
	if (Result != VK_SUCCESS)
	{
		throw VulkanError(Result, std::string(What) + " failed: " + ResultName(Result));
	}
}

const char* QueueRoleName(QueueRole Role)
{
	switch (Role)
	{
	case QueueRole::Graphics: return "graphics";
	case QueueRole::Compute: return "compute";
	default: return "transfer";
	}
}

namespace
{
bool HasExtension(const std::vector<VkExtensionProperties>& List, const char* Name)
{
	return std::any_of(List.begin(), List.end(), [Name](const VkExtensionProperties& E) { return std::strcmp(E.extensionName, Name) == 0; });
}

std::vector<VkExtensionProperties> DeviceExtensions(VkPhysicalDevice Device)
{
	uint32_t Count = 0;
	vkEnumerateDeviceExtensionProperties(Device, nullptr, &Count, nullptr);
	std::vector<VkExtensionProperties> List(Count);
	vkEnumerateDeviceExtensionProperties(Device, nullptr, &Count, List.data());
	return List;
}
} // namespace

VKAPI_ATTR VkBool32 VKAPI_CALL VulkanContext::DebugCallback(VkDebugUtilsMessageSeverityFlagBitsEXT Severity, VkDebugUtilsMessageTypeFlagsEXT Types,
	const VkDebugUtilsMessengerCallbackDataEXT* Data, void* User)
{
	auto* Self = static_cast<VulkanContext*>(User);
	if ((Types & (VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT)) == 0)
	{
		// General messages come from the loader about the machine (for example a third-party
		// implicit layer whose manifest was deleted), not from this engine's API usage.
		std::fprintf(stderr, "[vulkan] loader: %s\n", Data->pMessage);
		return VK_FALSE;
	}
	if (Severity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT)
	{
		++Self->ErrorCount;
		std::fprintf(stderr, "[vulkan] ERROR %s\n", Data->pMessage);
	}
	else if (Severity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT)
	{
		++Self->WarningCount;
		std::fprintf(stderr, "[vulkan] warning %s\n", Data->pMessage);
	}
	return VK_FALSE;
}

VulkanContext::VulkanContext(const ContextOptions& Options)
{
	// --- Instance ------------------------------------------------------------------
	uint32_t ExtCount = 0;
	vkEnumerateInstanceExtensionProperties(nullptr, &ExtCount, nullptr);
	std::vector<VkExtensionProperties> InstanceExts(ExtCount);
	vkEnumerateInstanceExtensionProperties(nullptr, &ExtCount, InstanceExts.data());

	std::vector<const char*> Extensions;
	std::vector<const char*> Layers;
	Capabilities.bDebugUtils = HasExtension(InstanceExts, VK_EXT_DEBUG_UTILS_EXTENSION_NAME);
	if (Capabilities.bDebugUtils)
	{
		Extensions.push_back(VK_EXT_DEBUG_UTILS_EXTENSION_NAME);
	}
	if (Options.bSwapchain)
	{
		Extensions.push_back(VK_KHR_SURFACE_EXTENSION_NAME);
#ifdef _WIN32
		Extensions.push_back("VK_KHR_win32_surface"); // VK_KHR_WIN32_SURFACE_EXTENSION_NAME, without pulling in windows.h
#endif
	}
	if (Options.bValidation)
	{
		uint32_t LayerCount = 0;
		vkEnumerateInstanceLayerProperties(&LayerCount, nullptr);
		std::vector<VkLayerProperties> Available(LayerCount);
		vkEnumerateInstanceLayerProperties(&LayerCount, Available.data());
		const bool bHasValidation = std::any_of(Available.begin(), Available.end(),
			[](const VkLayerProperties& L) { return std::strcmp(L.layerName, "VK_LAYER_KHRONOS_validation") == 0; });
		if (!bHasValidation)
		{
			throw VulkanError(VK_ERROR_LAYER_NOT_PRESENT, "VK_LAYER_KHRONOS_validation is not installed (Vulkan SDK)");
		}
		Layers.push_back("VK_LAYER_KHRONOS_validation");
	}

	VkApplicationInfo App{ VK_STRUCTURE_TYPE_APPLICATION_INFO };
	App.pApplicationName = "PrimordiaOS realm engine";
	App.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
	App.pEngineName = "PrimordiaOS";
	App.engineVersion = VK_MAKE_VERSION(1, 0, 0);
	App.apiVersion = VK_API_VERSION_1_3;

	VkDebugUtilsMessengerCreateInfoEXT MessengerInfo{ VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT };
	MessengerInfo.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
	MessengerInfo.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
	MessengerInfo.pfnUserCallback = &VulkanContext::DebugCallback;
	MessengerInfo.pUserData = this;

	// Synchronization validation catches missing barriers between the MCP passes and across queues.
	const VkValidationFeatureEnableEXT EnabledValidation[] = { VK_VALIDATION_FEATURE_ENABLE_SYNCHRONIZATION_VALIDATION_EXT };
	VkValidationFeaturesEXT ValidationFeatures{ VK_STRUCTURE_TYPE_VALIDATION_FEATURES_EXT };
	ValidationFeatures.enabledValidationFeatureCount = 1;
	ValidationFeatures.pEnabledValidationFeatures = EnabledValidation;
	ValidationFeatures.pNext = Capabilities.bDebugUtils ? &MessengerInfo : nullptr;

	VkInstanceCreateInfo InstanceInfo{ VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO };
	InstanceInfo.pApplicationInfo = &App;
	InstanceInfo.enabledExtensionCount = static_cast<uint32_t>(Extensions.size());
	InstanceInfo.ppEnabledExtensionNames = Extensions.data();
	InstanceInfo.enabledLayerCount = static_cast<uint32_t>(Layers.size());
	InstanceInfo.ppEnabledLayerNames = Layers.data();
	InstanceInfo.pNext = Options.bValidation ? static_cast<const void*>(&ValidationFeatures) : nullptr;
	PGPU_CHECK(vkCreateInstance(&InstanceInfo, nullptr, &VkInstanceHandle));

	if (Capabilities.bDebugUtils)
	{
		auto CreateMessenger = reinterpret_cast<PFN_vkCreateDebugUtilsMessengerEXT>(vkGetInstanceProcAddr(VkInstanceHandle, "vkCreateDebugUtilsMessengerEXT"));
		SetObjectName = reinterpret_cast<PFN_vkSetDebugUtilsObjectNameEXT>(vkGetInstanceProcAddr(VkInstanceHandle, "vkSetDebugUtilsObjectNameEXT"));
		if (CreateMessenger && Options.bValidation)
		{
			PGPU_CHECK(CreateMessenger(VkInstanceHandle, &MessengerInfo, nullptr, &Messenger));
		}
	}

	PickDevice(Options);
	CreateDevice(Options);
}

void VulkanContext::PickDevice(const ContextOptions& Options)
{
	uint32_t Count = 0;
	vkEnumeratePhysicalDevices(VkInstanceHandle, &Count, nullptr);
	if (Count == 0)
	{
		throw VulkanError(VK_ERROR_INITIALIZATION_FAILED, "no Vulkan devices");
	}
	std::vector<VkPhysicalDevice> Devices(Count);
	vkEnumeratePhysicalDevices(VkInstanceHandle, &Count, Devices.data());

	int BestScore = -1;
	for (VkPhysicalDevice D : Devices)
	{
		VkPhysicalDeviceProperties Props;
		vkGetPhysicalDeviceProperties(D, &Props);
		if (Props.apiVersion < VK_API_VERSION_1_3)
		{
			continue;
		}
		VkPhysicalDeviceVulkan12Features F12{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES };
		VkPhysicalDeviceVulkan13Features F13{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES };
		F12.pNext = &F13;
		VkPhysicalDeviceFeatures2 F{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2 };
		F.pNext = &F12;
		vkGetPhysicalDeviceFeatures2(D, &F);
		if (!F12.timelineSemaphore || !F12.hostQueryReset || !F13.synchronization2 || !F13.dynamicRendering || !F13.shaderDemoteToHelperInvocation)
		{
			continue;
		}
		if (Options.bSwapchain && !HasExtension(DeviceExtensions(D), VK_KHR_SWAPCHAIN_EXTENSION_NAME))
		{
			continue;
		}
		int Score = Props.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU ? 1000 : Props.deviceType == VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU ? 500 : 100;
		if (!Options.PreferredDevice.empty() && std::string(Props.deviceName).find(Options.PreferredDevice) != std::string::npos)
		{
			Score += 10000;
		}
		if (Score > BestScore)
		{
			BestScore = Score;
			PhysicalDevice = D;
			Capabilities.Properties = Props;
		}
	}
	if (!PhysicalDevice)
	{
		throw VulkanError(VK_ERROR_FEATURE_NOT_PRESENT, "no device with Vulkan 1.3, timeline semaphores, synchronization2, dynamic rendering and demote-to-helper");
	}
}

void VulkanContext::CreateDevice(const ContextOptions& Options)
{
	uint32_t FamilyCount = 0;
	vkGetPhysicalDeviceQueueFamilyProperties(PhysicalDevice, &FamilyCount, nullptr);
	std::vector<VkQueueFamilyProperties> Families(FamilyCount);
	vkGetPhysicalDeviceQueueFamilyProperties(PhysicalDevice, &FamilyCount, Families.data());

	auto FindFamily = [&](VkQueueFlags Must, VkQueueFlags MustNot) -> uint32_t
	{
		for (uint32_t I = 0; I < FamilyCount; ++I)
		{
			if ((Families[I].queueFlags & Must) == Must && (Families[I].queueFlags & MustNot) == 0)
			{
				return I;
			}
		}
		return UINT32_MAX;
	};

	const uint32_t GraphicsFamily = FindFamily(VK_QUEUE_GRAPHICS_BIT | VK_QUEUE_COMPUTE_BIT, 0);
	if (GraphicsFamily == UINT32_MAX)
	{
		throw VulkanError(VK_ERROR_FEATURE_NOT_PRESENT, "no graphics+compute queue family");
	}
	uint32_t ComputeFamily = FindFamily(VK_QUEUE_COMPUTE_BIT, VK_QUEUE_GRAPHICS_BIT);
	uint32_t TransferFamily = FindFamily(VK_QUEUE_TRANSFER_BIT, VK_QUEUE_GRAPHICS_BIT | VK_QUEUE_COMPUTE_BIT);

	// Queue indices per family, handed out in role order until the family runs out.
	std::map<uint32_t, uint32_t> Used;
	auto Take = [&](QueueRole Role, uint32_t Family)
	{
		QueueInfo& Q = Queues[static_cast<uint32_t>(Role)];
		Q.Family = Family;
		const uint32_t Next = Used[Family];
		if (Next < Families[Family].queueCount)
		{
			Q.Index = Next;
			Used[Family] = Next + 1;
			Q.bDedicated = true;
		}
		else
		{
			Q.Index = Families[Family].queueCount - 1; // share the family's last queue
			Q.bDedicated = false;
		}
		Q.bSeparateFamily = Family != GraphicsFamily;
		Q.TimestampValidBits = Families[Family].timestampValidBits;
	};
	Take(QueueRole::Graphics, GraphicsFamily);
	Take(QueueRole::Compute, ComputeFamily != UINT32_MAX ? ComputeFamily : GraphicsFamily);
	Take(QueueRole::Transfer, TransferFamily != UINT32_MAX ? TransferFamily : Queues[1].Family);
	// A role that had to share marks its partner as shared too.
	for (uint32_t A = 0; A < QueueRoleCount; ++A)
	{
		for (uint32_t B = 0; B < QueueRoleCount; ++B)
		{
			if (A != B && Queues[A].Family == Queues[B].Family && Queues[A].Index == Queues[B].Index)
			{
				Queues[A].bDedicated = Queues[B].bDedicated = false;
			}
		}
	}

	std::vector<VkDeviceQueueCreateInfo> QueueInfos;
	std::vector<std::vector<float>> Priorities;
	for (const auto& [Family, CountUsed] : Used)
	{
		const uint32_t QueueCount = std::max(1u, CountUsed);
		// Graphics highest, async compute next, DMA lowest.
		std::vector<float> P(QueueCount, 0.5f);
		for (const QueueInfo& Q : Queues)
		{
			if (Q.Family == Family && Q.Index < QueueCount)
			{
				const bool bGraphics = &Q == &Queues[0];
				const bool bCompute = &Q == &Queues[1];
				P[Q.Index] = bGraphics ? 1.0f : bCompute ? 0.75f : 0.25f;
			}
		}
		Priorities.push_back(std::move(P));
		VkDeviceQueueCreateInfo Info{ VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO };
		Info.queueFamilyIndex = Family;
		Info.queueCount = QueueCount;
		Info.pQueuePriorities = Priorities.back().data();
		QueueInfos.push_back(Info);
	}

	const std::vector<VkExtensionProperties> Available = DeviceExtensions(PhysicalDevice);
	std::vector<const char*> Extensions;
	if (Options.bSwapchain)
	{
		Extensions.push_back(VK_KHR_SWAPCHAIN_EXTENSION_NAME);
	}
	Capabilities.bMemoryBudget = HasExtension(Available, VK_EXT_MEMORY_BUDGET_EXTENSION_NAME);
	if (Capabilities.bMemoryBudget)
	{
		Extensions.push_back(VK_EXT_MEMORY_BUDGET_EXTENSION_NAME);
	}
	Capabilities.bCalibratedTimestamps = HasExtension(Available, VK_EXT_CALIBRATED_TIMESTAMPS_EXTENSION_NAME);
	if (Capabilities.bCalibratedTimestamps)
	{
		Extensions.push_back(VK_EXT_CALIBRATED_TIMESTAMPS_EXTENSION_NAME);
	}

	VkPhysicalDeviceFeatures Supported;
	vkGetPhysicalDeviceFeatures(PhysicalDevice, &Supported);
	Capabilities.bPipelineStatistics = Supported.pipelineStatisticsQuery == VK_TRUE;

	VkPhysicalDeviceVulkan13Features F13{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES };
	F13.synchronization2 = VK_TRUE;
	F13.dynamicRendering = VK_TRUE;
	F13.shaderDemoteToHelperInvocation = VK_TRUE; // HLSL discard compiles to OpDemoteToHelperInvocation
	VkPhysicalDeviceVulkan12Features F12{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES };
	F12.timelineSemaphore = VK_TRUE;
	F12.hostQueryReset = VK_TRUE;
	F12.pNext = &F13;
	VkPhysicalDeviceFeatures2 Features{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2 };
	Features.features.pipelineStatisticsQuery = Capabilities.bPipelineStatistics ? VK_TRUE : VK_FALSE;
	Features.pNext = &F12;

	VkDeviceCreateInfo DeviceInfo{ VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO };
	DeviceInfo.pNext = &Features;
	DeviceInfo.queueCreateInfoCount = static_cast<uint32_t>(QueueInfos.size());
	DeviceInfo.pQueueCreateInfos = QueueInfos.data();
	DeviceInfo.enabledExtensionCount = static_cast<uint32_t>(Extensions.size());
	DeviceInfo.ppEnabledExtensionNames = Extensions.data();
	PGPU_CHECK(vkCreateDevice(PhysicalDevice, &DeviceInfo, nullptr, &DeviceHandle));

	std::set<uint32_t> Distinct;
	for (QueueInfo& Q : Queues)
	{
		vkGetDeviceQueue(DeviceHandle, Q.Family, Q.Index, &Q.Queue);
		Distinct.insert(Q.Family);
	}
	DistinctFamilies.assign(Distinct.begin(), Distinct.end());
	for (uint32_t R = 0; R < QueueRoleCount; ++R)
	{
		SetName(VK_OBJECT_TYPE_QUEUE, Queues[R].Queue, (std::string("queue.") + QueueRoleName(static_cast<QueueRole>(R))).c_str());
	}

	VmaAllocatorCreateInfo AllocatorInfo{};
	AllocatorInfo.instance = VkInstanceHandle;
	AllocatorInfo.physicalDevice = PhysicalDevice;
	AllocatorInfo.device = DeviceHandle;
	AllocatorInfo.vulkanApiVersion = VK_API_VERSION_1_3;
	AllocatorInfo.flags = Capabilities.bMemoryBudget ? VMA_ALLOCATOR_CREATE_EXT_MEMORY_BUDGET_BIT : 0;
	PGPU_CHECK(vmaCreateAllocator(&AllocatorInfo, &VmaHandle));

	for (uint32_t R = 0; R < QueueRoleCount; ++R)
	{
		ImmediatePools[R] = CreateCommandPool(static_cast<QueueRole>(R), "pool.immediate");
	}
	VkFenceCreateInfo FenceInfo{ VK_STRUCTURE_TYPE_FENCE_CREATE_INFO };
	PGPU_CHECK(vkCreateFence(DeviceHandle, &FenceInfo, nullptr, &ImmediateFence));
}

VulkanContext::~VulkanContext()
{
	if (DeviceHandle)
	{
		vkDeviceWaitIdle(DeviceHandle);
		vkDestroyFence(DeviceHandle, ImmediateFence, nullptr);
		for (VkCommandPool Pool : ImmediatePools)
		{
			vkDestroyCommandPool(DeviceHandle, Pool, nullptr);
		}
		vmaDestroyAllocator(VmaHandle);
		vkDestroyDevice(DeviceHandle, nullptr);
	}
	if (Messenger)
	{
		auto DestroyMessenger = reinterpret_cast<PFN_vkDestroyDebugUtilsMessengerEXT>(vkGetInstanceProcAddr(VkInstanceHandle, "vkDestroyDebugUtilsMessengerEXT"));
		if (DestroyMessenger)
		{
			DestroyMessenger(VkInstanceHandle, Messenger, nullptr);
		}
	}
	if (VkInstanceHandle)
	{
		vkDestroyInstance(VkInstanceHandle, nullptr);
	}
}

Buffer VulkanContext::CreateBuffer(VkDeviceSize Size, VkBufferUsageFlags Usage, MemoryKind Kind, const char* Name)
{
	VkBufferCreateInfo Info{ VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO };
	Info.size = std::max<VkDeviceSize>(Size, 16);
	Info.usage = Usage;
	if (DistinctFamilies.size() > 1)
	{
		Info.sharingMode = VK_SHARING_MODE_CONCURRENT;
		Info.queueFamilyIndexCount = static_cast<uint32_t>(DistinctFamilies.size());
		Info.pQueueFamilyIndices = DistinctFamilies.data();
	}
	VmaAllocationCreateInfo Alloc{};
	Alloc.usage = Kind == MemoryKind::DeviceLocal ? VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE : VMA_MEMORY_USAGE_AUTO;
	if (Kind == MemoryKind::Upload)
	{
		Alloc.flags = VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT;
	}
	else if (Kind == MemoryKind::Readback)
	{
		Alloc.flags = VMA_ALLOCATION_CREATE_HOST_ACCESS_RANDOM_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT;
	}
	Buffer B;
	B.Size = Info.size;
	VmaAllocationInfo Result{};
	PGPU_CHECK(vmaCreateBuffer(VmaHandle, &Info, &Alloc, &B.Handle, &B.Allocation, &Result));
	B.Mapped = Result.pMappedData;
	SetName(VK_OBJECT_TYPE_BUFFER, B.Handle, Name);
	vmaSetAllocationName(VmaHandle, B.Allocation, Name);
	return B;
}

void VulkanContext::DestroyBuffer(Buffer& B)
{
	if (B.Handle)
	{
		vmaDestroyBuffer(VmaHandle, B.Handle, B.Allocation);
	}
	B = Buffer{};
}

void VulkanContext::Flush(const Buffer& B, VkDeviceSize Offset, VkDeviceSize Size)
{
	PGPU_CHECK(vmaFlushAllocation(VmaHandle, B.Allocation, Offset, Size));
}

void VulkanContext::Invalidate(const Buffer& B, VkDeviceSize Offset, VkDeviceSize Size)
{
	PGPU_CHECK(vmaInvalidateAllocation(VmaHandle, B.Allocation, Offset, Size));
}

Image VulkanContext::CreateImage2D(VkExtent2D Extent, VkFormat Format, VkImageUsageFlags Usage, VkImageAspectFlags Aspect, const char* Name)
{
	VkImageCreateInfo Info{ VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO };
	Info.imageType = VK_IMAGE_TYPE_2D;
	Info.format = Format;
	Info.extent = { Extent.width, Extent.height, 1 };
	Info.mipLevels = 1;
	Info.arrayLayers = 1;
	Info.samples = VK_SAMPLE_COUNT_1_BIT;
	Info.tiling = VK_IMAGE_TILING_OPTIMAL;
	Info.usage = Usage;
	Info.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
	VmaAllocationCreateInfo Alloc{};
	Alloc.usage = VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE;
	Alloc.flags = VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT; // render targets get their own block
	Image I;
	I.Format = Format;
	I.Extent = Extent;
	PGPU_CHECK(vmaCreateImage(VmaHandle, &Info, &Alloc, &I.Handle, &I.Allocation, nullptr));
	VkImageViewCreateInfo ViewInfo{ VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO };
	ViewInfo.image = I.Handle;
	ViewInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
	ViewInfo.format = Format;
	ViewInfo.subresourceRange = { Aspect, 0, 1, 0, 1 };
	PGPU_CHECK(vkCreateImageView(DeviceHandle, &ViewInfo, nullptr, &I.View));
	SetName(VK_OBJECT_TYPE_IMAGE, I.Handle, Name);
	return I;
}

void VulkanContext::DestroyImage(Image& I)
{
	if (I.View)
	{
		vkDestroyImageView(DeviceHandle, I.View, nullptr);
	}
	if (I.Handle)
	{
		vmaDestroyImage(VmaHandle, I.Handle, I.Allocation);
	}
	I = Image{};
}

VkShaderModule VulkanContext::LoadShader(const std::string& Path) const
{
	std::ifstream File(Path, std::ios::binary | std::ios::ate);
	if (!File)
	{
		throw VulkanError(VK_ERROR_INITIALIZATION_FAILED, "cannot open shader " + Path);
	}
	const std::streamsize Size = File.tellg();
	std::vector<uint32_t> Code(static_cast<size_t>(Size + 3) / 4);
	File.seekg(0);
	File.read(reinterpret_cast<char*>(Code.data()), Size);
	VkShaderModuleCreateInfo Info{ VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO };
	Info.codeSize = static_cast<size_t>(Size);
	Info.pCode = Code.data();
	VkShaderModule Module;
	PGPU_CHECK(vkCreateShaderModule(DeviceHandle, &Info, nullptr, &Module));
	return Module;
}

VkSemaphore VulkanContext::CreateTimeline(uint64_t Initial, const char* Name)
{
	VkSemaphoreTypeCreateInfo Type{ VK_STRUCTURE_TYPE_SEMAPHORE_TYPE_CREATE_INFO };
	Type.semaphoreType = VK_SEMAPHORE_TYPE_TIMELINE;
	Type.initialValue = Initial;
	VkSemaphoreCreateInfo Info{ VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO };
	Info.pNext = &Type;
	VkSemaphore S;
	PGPU_CHECK(vkCreateSemaphore(DeviceHandle, &Info, nullptr, &S));
	SetName(VK_OBJECT_TYPE_SEMAPHORE, S, Name);
	return S;
}

VkSemaphore VulkanContext::CreateBinarySemaphore(const char* Name)
{
	VkSemaphoreCreateInfo Info{ VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO };
	VkSemaphore S;
	PGPU_CHECK(vkCreateSemaphore(DeviceHandle, &Info, nullptr, &S));
	SetName(VK_OBJECT_TYPE_SEMAPHORE, S, Name);
	return S;
}

uint64_t VulkanContext::TimelineValue(VkSemaphore Timeline) const
{
	uint64_t Value = 0;
	PGPU_CHECK(vkGetSemaphoreCounterValue(DeviceHandle, Timeline, &Value));
	return Value;
}

bool VulkanContext::WaitTimeline(VkSemaphore Timeline, uint64_t Value, uint64_t TimeoutNs) const
{
	VkSemaphoreWaitInfo Info{ VK_STRUCTURE_TYPE_SEMAPHORE_WAIT_INFO };
	Info.semaphoreCount = 1;
	Info.pSemaphores = &Timeline;
	Info.pValues = &Value;
	const VkResult R = vkWaitSemaphores(DeviceHandle, &Info, TimeoutNs);
	if (R == VK_TIMEOUT)
	{
		return false;
	}
	PGPU_CHECK(R);
	return true;
}

VkCommandPool VulkanContext::CreateCommandPool(QueueRole Role, const char* Name)
{
	VkCommandPoolCreateInfo Info{ VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO };
	Info.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
	Info.queueFamilyIndex = Queue(Role).Family;
	VkCommandPool Pool;
	PGPU_CHECK(vkCreateCommandPool(DeviceHandle, &Info, nullptr, &Pool));
	SetName(VK_OBJECT_TYPE_COMMAND_POOL, Pool, Name);
	return Pool;
}

VkCommandBuffer VulkanContext::BeginImmediate(QueueRole Role)
{
	VkCommandBufferAllocateInfo Alloc{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO };
	Alloc.commandPool = ImmediatePools[static_cast<uint32_t>(Role)];
	Alloc.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
	Alloc.commandBufferCount = 1;
	VkCommandBuffer Cmd;
	PGPU_CHECK(vkAllocateCommandBuffers(DeviceHandle, &Alloc, &Cmd));
	VkCommandBufferBeginInfo Begin{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO };
	Begin.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
	PGPU_CHECK(vkBeginCommandBuffer(Cmd, &Begin));
	return Cmd;
}

void VulkanContext::EndImmediate(QueueRole Role, VkCommandBuffer Cmd)
{
	PGPU_CHECK(vkEndCommandBuffer(Cmd));
	VkCommandBufferSubmitInfo CmdInfo{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO };
	CmdInfo.commandBuffer = Cmd;
	VkSubmitInfo2 Submit{ VK_STRUCTURE_TYPE_SUBMIT_INFO_2 };
	Submit.commandBufferInfoCount = 1;
	Submit.pCommandBufferInfos = &CmdInfo;
	PGPU_CHECK(vkResetFences(DeviceHandle, 1, &ImmediateFence));
	PGPU_CHECK(vkQueueSubmit2(Queue(Role).Queue, 1, &Submit, ImmediateFence));
	PGPU_CHECK(vkWaitForFences(DeviceHandle, 1, &ImmediateFence, VK_TRUE, UINT64_MAX));
	vkFreeCommandBuffers(DeviceHandle, ImmediatePools[static_cast<uint32_t>(Role)], 1, &Cmd);
}

void VulkanContext::SetName(VkObjectType Type, uint64_t Handle, const char* Name) const
{
	if (SetObjectName && Name && Handle)
	{
		VkDebugUtilsObjectNameInfoEXT Info{ VK_STRUCTURE_TYPE_DEBUG_UTILS_OBJECT_NAME_INFO_EXT };
		Info.objectType = Type;
		Info.objectHandle = Handle;
		Info.pObjectName = Name;
		SetObjectName(DeviceHandle, &Info);
	}
}

std::vector<VulkanContext::HeapBudget> VulkanContext::HeapBudgets() const
{
	const VkPhysicalDeviceMemoryProperties* Props = nullptr;
	vmaGetMemoryProperties(VmaHandle, &Props);
	std::vector<VmaBudget> Budgets(Props->memoryHeapCount);
	vmaGetHeapBudgets(VmaHandle, Budgets.data());
	std::vector<HeapBudget> Out;
	for (uint32_t H = 0; H < Props->memoryHeapCount; ++H)
	{
		HeapBudget B;
		B.Usage = Budgets[H].usage;
		B.Budget = Budgets[H].budget;
		B.bDeviceLocal = (Props->memoryHeaps[H].flags & VK_MEMORY_HEAP_DEVICE_LOCAL_BIT) != 0;
		Out.push_back(B);
	}
	return Out;
}
} // namespace primordia::gpu
