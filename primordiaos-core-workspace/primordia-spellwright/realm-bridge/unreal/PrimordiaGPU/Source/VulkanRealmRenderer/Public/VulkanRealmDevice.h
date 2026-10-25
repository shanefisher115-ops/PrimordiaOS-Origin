// What the Vulkan device under Unreal looks like to PrimordiaOS. When the RHI is Vulkan
// (-vulkan, or DefaultGraphicsRHI_Vulkan), Probe() reads the native device through
// IVulkanDynamicRHI: API version, queue families (is there async compute? a DMA queue?) and
// VK_EXT_memory_budget, which it hands to Onyx as its memory sampler. On other RHIs Onyx
// keeps the RHI's generic memory statistics.
#pragma once

#include "CoreMinimal.h"

struct FVulkanRealmDeviceInfo
{
	bool bVulkan = false;
	FString RHIName;
	FString DeviceName;
	uint32 ApiVersion = 0;
	FString ApiVersionString; // "1.3.260"
	uint32 GraphicsFamily = 0;
	uint32 GraphicsQueueIndex = 0;
	bool bAsyncComputeFamily = false; // a compute family without graphics
	bool bTransferFamily = false;     // a transfer-only family
	bool bMemoryBudget = false;
	TArray<FString> QueueFamilies;    // human-readable, one per family
};

class VULKANREALMRENDERER_API FVulkanRealmDevice
{
public:
	/** Game thread, after the RHI exists (OnPostEngineInit). */
	static void Probe();
	static const FVulkanRealmDeviceInfo& Info();
};
