// Realm renderer: draws one MCP tick on the graphics queue.
//
// Passes (dynamic rendering, Vulkan 1.3):
//   scene (RGBA16F + D32): terrain (vertex-pulled height field, sigil-field tint),
//     spires (vkCmdDrawIndirect: the GPU wrote the instance count), actors (instanced),
//     sigils (additive glyph discs), world-memory strip (per-actor recall bars)
//   tonemap: HDR -> the frame target (swapchain image or offscreen readback image)
// Frame k waits compute(k) and signals graphics(k) on its timeline; with a swapchain it also
// waits the acquire semaphore and signals the present semaphore.
#pragma once

#include "primordia/gpu/MCP.h"
#include "primordia/gpu/Onyx.h"
#include "primordia/gpu/RealmState.h"
#include "primordia/gpu/VulkanContext.h"

#include <array>
#include <string>
#include <vector>

namespace primordia::gpu
{
struct Camera
{
	float Eye[3] = { 150.f, -150.f, 95.f };
	float Target[3] = { 0.f, 0.f, 6.f };
	float FovYDegrees = 50.f;
	float Near = 0.5f;
	float Far = 3000.f;

	/** Slow orbit around the realm center, framed to the ground radius. */
	static Camera Orbit(const RealmState& Realm, double Seconds);
};

struct FrameTarget
{
	VkImage Image = VK_NULL_HANDLE;
	VkImageView View = VK_NULL_HANDLE;
	VkExtent2D Extent{};
	VkImageLayout FinalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;
	VkSemaphore WaitBinary = VK_NULL_HANDLE;   // swapchain acquire
	VkSemaphore SignalBinary = VK_NULL_HANDLE; // swapchain present
	bool bOffscreen = false;
};

class RealmRenderer
{
public:
	RealmRenderer(VulkanContext& Context, Onyx& Telemetry, MCP& Compute, const std::string& ShaderDir, VkFormat OutputFormat, VkExtent2D Extent);
	~RealmRenderer();
	RealmRenderer(const RealmRenderer&) = delete;
	RealmRenderer& operator=(const RealmRenderer&) = delete;

	void Resize(VkExtent2D Extent);
	/** Records and submits the frame for MCP tick `Tick`. */
	void Render(uint64_t Tick, const RealmState& Realm, const Camera& Cam, const FrameTarget& Target);
	/** The renderer's own offscreen target (headless mode). */
	FrameTarget OffscreenTarget() const;
	/** Waits for frame `Tick` and copies its offscreen pixels (RGBA8, top row first). */
	bool ReadOffscreen(uint64_t Tick, std::vector<uint8_t>& Rgba);
	VkSemaphore Timeline() const { return GraphicsSem; }
	VkExtent2D Extent() const { return Size; }

private:
	struct Slot
	{
		VkCommandPool Pool = VK_NULL_HANDLE;
		VkCommandBuffer Cmd = VK_NULL_HANDLE;
		Buffer Readback;
		uint64_t Tick = 0;
		std::array<uint64_t, 3> Invocations{}; // per timed render pass (opaque, overlay, tonemap)
		std::array<uint32_t, 3> Draws{};
	};
	enum EPass : uint32_t
	{
		PTerrain,
		PSpire,
		PActor,
		PSigil,
		PMemory,
		PTonemap,
		PassCount
	};

	void CreateTargets();
	void DestroyTargets();
	void CreatePipelines(const std::string& ShaderDir);
	void WriteTonemapSet();
	void ReportPasses(const Slot& Previous);

	VulkanContext& Ctx;
	Onyx& Telemetry;
	MCP& Compute;
	VkFormat OutFormat;
	VkExtent2D Size;

	Image Hdr;
	Image Depth;
	Image Offscreen;
	VkSampler Sampler = VK_NULL_HANDLE;
	std::array<Slot, MCP::FramesInFlight> Slots;

	VkDescriptorSetLayout SceneSetLayout = VK_NULL_HANDLE;
	VkDescriptorSetLayout TonemapSetLayout = VK_NULL_HANDLE;
	VkPipelineLayout SceneLayout = VK_NULL_HANDLE;
	VkPipelineLayout TonemapLayout = VK_NULL_HANDLE;
	VkDescriptorPool DescriptorPool = VK_NULL_HANDLE;
	std::array<VkDescriptorSet, 2> SceneSets{};
	VkDescriptorSet TonemapSet = VK_NULL_HANDLE;
	std::array<VkPipeline, PassCount> Pipelines{};
	VkSemaphore GraphicsSem = VK_NULL_HANDLE;
};
} // namespace primordia::gpu
