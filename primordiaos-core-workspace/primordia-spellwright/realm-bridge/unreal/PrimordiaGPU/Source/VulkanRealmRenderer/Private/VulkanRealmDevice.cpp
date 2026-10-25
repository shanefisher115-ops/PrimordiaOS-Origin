#include "VulkanRealmDevice.h"

#include "DynamicRHI.h"
#include "Onyx.h"
#include "RHI.h"

#if PRIMORDIA_WITH_VULKAN
#include "IVulkanDynamicRHI.h"
#endif

DEFINE_LOG_CATEGORY_STATIC(LogVulkanRealm, Log, All);

namespace
{
FVulkanRealmDeviceInfo GInfo;

#if PRIMORDIA_WITH_VULKAN
PFN_vkGetPhysicalDeviceMemoryProperties2 GetMemoryProperties2 = nullptr;
VkPhysicalDevice PhysicalDevice = VK_NULL_HANDLE;

bool SampleMemoryBudget(uint64& OutUsage, uint64& OutBudget)
{
	if (!GetMemoryProperties2 || !PhysicalDevice)
	{
		return false;
	}
	VkPhysicalDeviceMemoryBudgetPropertiesEXT Budget{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_MEMORY_BUDGET_PROPERTIES_EXT };
	VkPhysicalDeviceMemoryProperties2 Props{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_MEMORY_PROPERTIES_2 };
	Props.pNext = &Budget;
	GetMemoryProperties2(PhysicalDevice, &Props);
	OutUsage = 0;
	OutBudget = 0;
	for (uint32 H = 0; H < Props.memoryProperties.memoryHeapCount; ++H)
	{
		if (Props.memoryProperties.memoryHeaps[H].flags & VK_MEMORY_HEAP_DEVICE_LOCAL_BIT)
		{
			OutUsage += Budget.heapUsage[H];
			OutBudget += Budget.heapBudget[H];
		}
	}
	return OutBudget > 0;
}
#endif
} // namespace

const FVulkanRealmDeviceInfo& FVulkanRealmDevice::Info()
{
	return GInfo;
}

void FVulkanRealmDevice::Probe()
{
	GInfo = FVulkanRealmDeviceInfo();
	if (!GDynamicRHI)
	{
		return;
	}
	GInfo.RHIName = GDynamicRHI->GetName();
	GInfo.DeviceName = GRHIAdapterName;
#if PRIMORDIA_WITH_VULKAN
	if (RHIGetInterfaceType() == ERHIInterfaceType::Vulkan)
	{
		IVulkanDynamicRHI* Vulkan = GetIVulkanDynamicRHI();
		PhysicalDevice = Vulkan->RHIGetVkPhysicalDevice();
		GInfo.bVulkan = true;
		GInfo.ApiVersion = Vulkan->RHIGetVulkanVersion();
		GInfo.ApiVersionString = FString::Printf(TEXT("%u.%u.%u"), VK_API_VERSION_MAJOR(GInfo.ApiVersion), VK_API_VERSION_MINOR(GInfo.ApiVersion), VK_API_VERSION_PATCH(GInfo.ApiVersion));
		GInfo.GraphicsFamily = Vulkan->RHIGetGraphicsQueueFamilyIndex();
		GInfo.GraphicsQueueIndex = Vulkan->RHIGetGraphicsQueueIndex();

		auto GetQueueFamilies = reinterpret_cast<PFN_vkGetPhysicalDeviceQueueFamilyProperties>(Vulkan->RHIGetVkInstanceProcAddr("vkGetPhysicalDeviceQueueFamilyProperties"));
		if (GetQueueFamilies)
		{
			uint32 Count = 0;
			GetQueueFamilies(PhysicalDevice, &Count, nullptr);
			TArray<VkQueueFamilyProperties> Families;
			Families.SetNumZeroed(Count);
			GetQueueFamilies(PhysicalDevice, &Count, Families.GetData());
			for (uint32 F = 0; F < Count; ++F)
			{
				const VkQueueFlags Flags = Families[F].queueFlags;
				const bool bGraphics = (Flags & VK_QUEUE_GRAPHICS_BIT) != 0;
				const bool bCompute = (Flags & VK_QUEUE_COMPUTE_BIT) != 0;
				const bool bTransfer = (Flags & VK_QUEUE_TRANSFER_BIT) != 0;
				GInfo.bAsyncComputeFamily |= bCompute && !bGraphics;
				GInfo.bTransferFamily |= bTransfer && !bCompute && !bGraphics;
				GInfo.QueueFamilies.Add(FString::Printf(TEXT("family %u: %u queue(s)%s%s%s, %u timestamp bits"), F, Families[F].queueCount,
					bGraphics ? TEXT(" graphics") : TEXT(""), bCompute ? TEXT(" compute") : TEXT(""), bTransfer ? TEXT(" transfer") : TEXT(""), Families[F].timestampValidBits));
			}
		}

		for (const VkExtensionProperties& Ext : Vulkan->RHIGetAllDeviceExtensions(PhysicalDevice))
		{
			GInfo.bMemoryBudget |= FCStringAnsi::Strcmp(Ext.extensionName, VK_EXT_MEMORY_BUDGET_EXTENSION_NAME) == 0;
		}
		GetMemoryProperties2 = reinterpret_cast<PFN_vkGetPhysicalDeviceMemoryProperties2>(Vulkan->RHIGetVkInstanceProcAddr("vkGetPhysicalDeviceMemoryProperties2"));
		if (GInfo.bMemoryBudget && GetMemoryProperties2)
		{
			FOnyx::Get().SetMemorySampler(&SampleMemoryBudget, GInfo.DeviceName);
		}

		UE_LOG(LogVulkanRealm, Log, TEXT("Vulkan %s on %s: graphics queue %u.%u, async compute family %s, transfer family %s, memory budget %s"),
			*GInfo.ApiVersionString, *GInfo.DeviceName,
			GInfo.GraphicsFamily, GInfo.GraphicsQueueIndex, GInfo.bAsyncComputeFamily ? TEXT("yes") : TEXT("no"), GInfo.bTransferFamily ? TEXT("yes") : TEXT("no"),
			GInfo.bMemoryBudget ? TEXT("yes") : TEXT("no"));
		for (const FString& Family : GInfo.QueueFamilies)
		{
			UE_LOG(LogVulkanRealm, Log, TEXT("  %s"), *Family);
		}
		return;
	}
#endif
	UE_LOG(LogVulkanRealm, Log, TEXT("RHI is %s, not Vulkan: realm rendering runs through the render graph; Onyx uses RHI memory statistics. Launch with -vulkan for native Vulkan telemetry."),
		*GInfo.RHIName);
}
