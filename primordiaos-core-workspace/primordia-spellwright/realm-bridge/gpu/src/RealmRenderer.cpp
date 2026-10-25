#include "primordia/gpu/RealmRenderer.h"

#include "../shaders/Bindings.hlsli"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace primordia::gpu
{
namespace
{
constexpr VkFormat HdrFormat = VK_FORMAT_R16G16B16A16_SFLOAT;
constexpr VkFormat DepthFormat = VK_FORMAT_D32_SFLOAT;
constexpr uint32_t MemoryBarsShown = 256;

const char* const PassFiles[] = { "terrain", "spire", "actor", "sigil", "memory", "tonemap" };
const char* const PipelineNames[] = { "render.terrain", "render.spire", "render.actor", "render.sigil", "render.memory", "render.tonemap" };
// Onyx times render passes, not draws: draws inside one pass overlap in the pipeline, so a
// timestamp pair around one draw measures its neighbors too.
enum ERenderScope : uint32_t { ROpaque, ROverlay, RTonemap, RenderScopeCount };
const char* const RenderScopes[] = { "render.opaque", "render.overlay", "render.tonemap" };
const double RenderScopeShare[] = { 0.65, 0.15, 0.20 };
constexpr double RenderBudgetShare = 0.60;

void AttachmentBarrier(VkCommandBuffer Cmd, VkImage Color, VkImage Depth)
{
	// The overlay pass loads what the opaque pass stored: color for blending, depth for testing.
	VkImageMemoryBarrier2 B[2] = { { VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2 }, { VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2 } };
	B[0].srcStageMask = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT;
	B[0].srcAccessMask = VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT;
	B[0].dstStageMask = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT;
	B[0].dstAccessMask = VK_ACCESS_2_COLOR_ATTACHMENT_READ_BIT | VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT;
	B[0].oldLayout = B[0].newLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
	B[0].image = Color;
	B[0].subresourceRange = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1 };
	B[1].srcStageMask = VK_PIPELINE_STAGE_2_EARLY_FRAGMENT_TESTS_BIT | VK_PIPELINE_STAGE_2_LATE_FRAGMENT_TESTS_BIT;
	B[1].srcAccessMask = VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT;
	B[1].dstStageMask = VK_PIPELINE_STAGE_2_EARLY_FRAGMENT_TESTS_BIT | VK_PIPELINE_STAGE_2_LATE_FRAGMENT_TESTS_BIT;
	B[1].dstAccessMask = VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_READ_BIT;
	B[1].oldLayout = B[1].newLayout = VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL;
	B[1].image = Depth;
	B[1].subresourceRange = { VK_IMAGE_ASPECT_DEPTH_BIT, 0, 1, 0, 1 };
	for (VkImageMemoryBarrier2& X : B)
	{
		X.srcQueueFamilyIndex = X.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
	}
	VkDependencyInfo Dep{ VK_STRUCTURE_TYPE_DEPENDENCY_INFO };
	Dep.imageMemoryBarrierCount = 2;
	Dep.pImageMemoryBarriers = B;
	vkCmdPipelineBarrier2(Cmd, &Dep);
}

struct Mat4
{
	float M[16] = {}; // column-major: M[col * 4 + row]
};

Mat4 Multiply(const Mat4& A, const Mat4& B)
{
	Mat4 R;
	for (int C = 0; C < 4; ++C)
	{
		for (int Row = 0; Row < 4; ++Row)
		{
			float Sum = 0.f;
			for (int K = 0; K < 4; ++K)
			{
				Sum += A.M[K * 4 + Row] * B.M[C * 4 + K];
			}
			R.M[C * 4 + Row] = Sum;
		}
	}
	return R;
}

void Normalize(float V[3])
{
	const float L = std::sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2]);
	for (int I = 0; I < 3; ++I)
	{
		V[I] /= std::max(L, 1e-6f);
	}
}

void Cross(const float A[3], const float B[3], float Out[3])
{
	Out[0] = A[1] * B[2] - A[2] * B[1];
	Out[1] = A[2] * B[0] - A[0] * B[2];
	Out[2] = A[0] * B[1] - A[1] * B[0];
}

/** Right-handed view, world +Z up. */
Mat4 LookAt(const float Eye[3], const float Target[3])
{
	float F[3] = { Target[0] - Eye[0], Target[1] - Eye[1], Target[2] - Eye[2] };
	Normalize(F);
	const float Up[3] = { 0.f, 0.f, 1.f };
	float S[3];
	Cross(F, Up, S);
	Normalize(S);
	float U[3];
	Cross(S, F, U);
	Mat4 V;
	V.M[0] = S[0]; V.M[4] = S[1]; V.M[8] = S[2];
	V.M[1] = U[0]; V.M[5] = U[1]; V.M[9] = U[2];
	V.M[2] = -F[0]; V.M[6] = -F[1]; V.M[10] = -F[2];
	V.M[12] = -(S[0] * Eye[0] + S[1] * Eye[1] + S[2] * Eye[2]);
	V.M[13] = -(U[0] * Eye[0] + U[1] * Eye[1] + U[2] * Eye[2]);
	V.M[14] = F[0] * Eye[0] + F[1] * Eye[1] + F[2] * Eye[2];
	V.M[15] = 1.f;
	return V;
}

/** Vulkan clip space: y points down, depth 0..1. */
Mat4 Perspective(float FovY, float Aspect, float Near, float Far)
{
	const float F = 1.f / std::tan(FovY * 0.5f);
	Mat4 P;
	P.M[0] = F / Aspect;
	P.M[5] = -F;
	P.M[10] = Far / (Near - Far);
	P.M[11] = -1.f;
	P.M[14] = Near * Far / (Near - Far);
	return P;
}

struct ScenePush
{
	float ViewProj[16];
	float Camera[4];
	float View[4];
};
static_assert(sizeof(ScenePush) == 96, "matches FRealmPush in RealmCommon.hlsli");

void ImageBarrier(VkCommandBuffer Cmd, VkImage Image, VkImageAspectFlags Aspect, VkImageLayout Old, VkImageLayout New,
	VkPipelineStageFlags2 SrcStage, VkAccessFlags2 SrcAccess, VkPipelineStageFlags2 DstStage, VkAccessFlags2 DstAccess)
{
	VkImageMemoryBarrier2 B{ VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2 };
	B.srcStageMask = SrcStage;
	B.srcAccessMask = SrcAccess;
	B.dstStageMask = DstStage;
	B.dstAccessMask = DstAccess;
	B.oldLayout = Old;
	B.newLayout = New;
	B.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
	B.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
	B.image = Image;
	B.subresourceRange = { Aspect, 0, 1, 0, 1 };
	VkDependencyInfo Dep{ VK_STRUCTURE_TYPE_DEPENDENCY_INFO };
	Dep.imageMemoryBarrierCount = 1;
	Dep.pImageMemoryBarriers = &B;
	vkCmdPipelineBarrier2(Cmd, &Dep);
}
} // namespace

Camera Camera::Orbit(const RealmState& Realm, double Seconds)
{
	Camera C;
	const double Angle = -0.8 + Seconds * 0.05;
	const float Distance = Realm.GroundRadius * 1.55f;
	C.Eye[0] = static_cast<float>(std::cos(Angle)) * Distance;
	C.Eye[1] = static_cast<float>(std::sin(Angle)) * Distance;
	C.Eye[2] = Realm.GroundRadius * 0.85f;
	C.Target[2] = Realm.MaxTerrainHeight() * 0.3f;
	C.Far = Realm.GroundRadius * 20.f;
	return C;
}

RealmRenderer::RealmRenderer(VulkanContext& Context, Onyx& InTelemetry, MCP& InCompute, const std::string& ShaderDir, VkFormat OutputFormat, VkExtent2D Extent)
	: Ctx(Context), Telemetry(InTelemetry), Compute(InCompute), OutFormat(OutputFormat), Size(Extent)
{
	VkSamplerCreateInfo SamplerInfo{ VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO };
	SamplerInfo.magFilter = VK_FILTER_LINEAR;
	SamplerInfo.minFilter = VK_FILTER_LINEAR;
	SamplerInfo.addressModeU = SamplerInfo.addressModeV = SamplerInfo.addressModeW = VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE;
	PGPU_CHECK(vkCreateSampler(Ctx.Device(), &SamplerInfo, nullptr, &Sampler));

	CreatePipelines(ShaderDir);
	CreateTargets();
	GraphicsSem = Ctx.CreateTimeline(0, "render.timeline.graphics");
	Compute.SetGraphicsTimeline(GraphicsSem);
	for (Slot& S : Slots)
	{
		S.Pool = Ctx.CreateCommandPool(QueueRole::Graphics, "render.pool");
		VkCommandBufferAllocateInfo Alloc{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO };
		Alloc.commandPool = S.Pool;
		Alloc.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
		Alloc.commandBufferCount = 1;
		PGPU_CHECK(vkAllocateCommandBuffers(Ctx.Device(), &Alloc, &S.Cmd));
	}
}

RealmRenderer::~RealmRenderer()
{
	vkDeviceWaitIdle(Ctx.Device());
	Compute.SetGraphicsTimeline(VK_NULL_HANDLE);
	for (Slot& S : Slots)
	{
		vkDestroyCommandPool(Ctx.Device(), S.Pool, nullptr);
		Ctx.DestroyBuffer(S.Readback);
	}
	DestroyTargets();
	for (VkPipeline P : Pipelines)
	{
		vkDestroyPipeline(Ctx.Device(), P, nullptr);
	}
	vkDestroyPipelineLayout(Ctx.Device(), SceneLayout, nullptr);
	vkDestroyPipelineLayout(Ctx.Device(), TonemapLayout, nullptr);
	vkDestroyDescriptorPool(Ctx.Device(), DescriptorPool, nullptr);
	vkDestroyDescriptorSetLayout(Ctx.Device(), SceneSetLayout, nullptr);
	vkDestroyDescriptorSetLayout(Ctx.Device(), TonemapSetLayout, nullptr);
	vkDestroySampler(Ctx.Device(), Sampler, nullptr);
	vkDestroySemaphore(Ctx.Device(), GraphicsSem, nullptr);
}

void RealmRenderer::CreateTargets()
{
	Hdr = Ctx.CreateImage2D(Size, HdrFormat, VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_SAMPLED_BIT, VK_IMAGE_ASPECT_COLOR_BIT, "render.hdr");
	Depth = Ctx.CreateImage2D(Size, DepthFormat, VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT, VK_IMAGE_ASPECT_DEPTH_BIT, "render.depth");
	Offscreen = Ctx.CreateImage2D(Size, OutFormat, VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT, VK_IMAGE_ASPECT_COLOR_BIT, "render.offscreen");
	for (Slot& S : Slots)
	{
		Ctx.DestroyBuffer(S.Readback);
		S.Readback = Ctx.CreateBuffer(VkDeviceSize(Size.width) * Size.height * 4, VK_BUFFER_USAGE_TRANSFER_DST_BIT, MemoryKind::Readback, "render.readback");
	}
	WriteTonemapSet();
}

void RealmRenderer::DestroyTargets()
{
	Ctx.DestroyImage(Hdr);
	Ctx.DestroyImage(Depth);
	Ctx.DestroyImage(Offscreen);
}

void RealmRenderer::Resize(VkExtent2D Extent)
{
	if (Extent.width == Size.width && Extent.height == Size.height)
	{
		return;
	}
	vkDeviceWaitIdle(Ctx.Device());
	DestroyTargets();
	Size = Extent;
	CreateTargets();
}

void RealmRenderer::CreatePipelines(const std::string& ShaderDir)
{
	// Scene: the eight MCP output buffers, visible to both stages.
	std::array<VkDescriptorSetLayoutBinding, RR_BINDING_COUNT> Bindings{};
	for (uint32_t B = 0; B < RR_BINDING_COUNT; ++B)
	{
		Bindings[B] = { B, VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, 1, VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT, nullptr };
	}
	VkDescriptorSetLayoutCreateInfo SetInfo{ VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO };
	SetInfo.bindingCount = RR_BINDING_COUNT;
	SetInfo.pBindings = Bindings.data();
	PGPU_CHECK(vkCreateDescriptorSetLayout(Ctx.Device(), &SetInfo, nullptr, &SceneSetLayout));

	const VkDescriptorSetLayoutBinding ToneBindings[2] = {
		{ 0, VK_DESCRIPTOR_TYPE_SAMPLED_IMAGE, 1, VK_SHADER_STAGE_FRAGMENT_BIT, nullptr },
		{ 1, VK_DESCRIPTOR_TYPE_SAMPLER, 1, VK_SHADER_STAGE_FRAGMENT_BIT, nullptr },
	};
	SetInfo.bindingCount = 2;
	SetInfo.pBindings = ToneBindings;
	PGPU_CHECK(vkCreateDescriptorSetLayout(Ctx.Device(), &SetInfo, nullptr, &TonemapSetLayout));

	VkPushConstantRange ScenePushRange{ VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT, 0, sizeof(ScenePush) };
	VkPipelineLayoutCreateInfo LayoutInfo{ VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO };
	LayoutInfo.setLayoutCount = 1;
	LayoutInfo.pSetLayouts = &SceneSetLayout;
	LayoutInfo.pushConstantRangeCount = 1;
	LayoutInfo.pPushConstantRanges = &ScenePushRange;
	PGPU_CHECK(vkCreatePipelineLayout(Ctx.Device(), &LayoutInfo, nullptr, &SceneLayout));
	VkPushConstantRange TonePushRange{ VK_SHADER_STAGE_FRAGMENT_BIT, 0, 16 };
	LayoutInfo.pSetLayouts = &TonemapSetLayout;
	LayoutInfo.pPushConstantRanges = &TonePushRange;
	PGPU_CHECK(vkCreatePipelineLayout(Ctx.Device(), &LayoutInfo, nullptr, &TonemapLayout));

	const VkDescriptorPoolSize PoolSizes[3] = {
		{ VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, RR_BINDING_COUNT * 2 },
		{ VK_DESCRIPTOR_TYPE_SAMPLED_IMAGE, 1 },
		{ VK_DESCRIPTOR_TYPE_SAMPLER, 1 },
	};
	VkDescriptorPoolCreateInfo PoolInfo{ VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO };
	PoolInfo.maxSets = 3;
	PoolInfo.poolSizeCount = 3;
	PoolInfo.pPoolSizes = PoolSizes;
	PGPU_CHECK(vkCreateDescriptorPool(Ctx.Device(), &PoolInfo, nullptr, &DescriptorPool));
	const VkDescriptorSetLayout Layouts[3] = { SceneSetLayout, SceneSetLayout, TonemapSetLayout };
	VkDescriptorSet Allocated[3];
	VkDescriptorSetAllocateInfo Alloc{ VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO };
	Alloc.descriptorPool = DescriptorPool;
	Alloc.descriptorSetCount = 3;
	Alloc.pSetLayouts = Layouts;
	PGPU_CHECK(vkAllocateDescriptorSets(Ctx.Device(), &Alloc, Allocated));
	SceneSets = { Allocated[0], Allocated[1] };
	TonemapSet = Allocated[2];

	for (uint32_t P = 0; P < 2; ++P)
	{
		const MCP::TickBuffers T = Compute.OutputsForParity(P);
		const Buffer* Table[RR_BINDING_COUNT] = {};
		Table[RR_B_TICK] = T.Tick;
		Table[RR_B_TERRAIN] = T.Terrain;
		Table[RR_B_STRUCTURES] = T.Structures;
		Table[RR_B_STRUCTURE_ARGS] = T.StructureArgs;
		Table[RR_B_SIGILS] = T.Sigils;
		Table[RR_B_SIGIL_FIELD] = T.Field;
		Table[RR_B_ACTORS] = T.Actors;
		Table[RR_B_RECALL] = T.Recall;
		std::array<VkDescriptorBufferInfo, RR_BINDING_COUNT> Infos{};
		std::array<VkWriteDescriptorSet, RR_BINDING_COUNT> Writes{};
		for (uint32_t B = 0; B < RR_BINDING_COUNT; ++B)
		{
			Infos[B] = { Table[B]->Handle, 0, VK_WHOLE_SIZE };
			Writes[B] = { VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET };
			Writes[B].dstSet = SceneSets[P];
			Writes[B].dstBinding = B;
			Writes[B].descriptorCount = 1;
			Writes[B].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
			Writes[B].pBufferInfo = &Infos[B];
		}
		vkUpdateDescriptorSets(Ctx.Device(), RR_BINDING_COUNT, Writes.data(), 0, nullptr);
	}

	for (uint32_t Pass = 0; Pass < PassCount; ++Pass)
	{
		const std::string Base = ShaderDir + "/" + PassFiles[Pass];
		VkShaderModule Vs = Ctx.LoadShader(Base + ".vs.spv");
		VkShaderModule Ps = Ctx.LoadShader(Base + ".ps.spv");
		VkPipelineShaderStageCreateInfo Stages[2] = { { VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO }, { VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO } };
		Stages[0].stage = VK_SHADER_STAGE_VERTEX_BIT;
		Stages[0].module = Vs;
		Stages[0].pName = "MainVS";
		Stages[1].stage = VK_SHADER_STAGE_FRAGMENT_BIT;
		Stages[1].module = Ps;
		Stages[1].pName = "MainPS";

		VkPipelineVertexInputStateCreateInfo VertexInput{ VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO };
		VkPipelineInputAssemblyStateCreateInfo Assembly{ VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO };
		Assembly.topology = VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST;
		VkPipelineViewportStateCreateInfo Viewport{ VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO };
		Viewport.viewportCount = 1;
		Viewport.scissorCount = 1;
		VkPipelineRasterizationStateCreateInfo Raster{ VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO };
		Raster.polygonMode = VK_POLYGON_MODE_FILL;
		Raster.cullMode = VK_CULL_MODE_NONE;
		Raster.frontFace = VK_FRONT_FACE_COUNTER_CLOCKWISE;
		Raster.lineWidth = 1.f;
		VkPipelineMultisampleStateCreateInfo Multisample{ VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO };
		Multisample.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT;
		VkPipelineDepthStencilStateCreateInfo DepthState{ VK_STRUCTURE_TYPE_PIPELINE_DEPTH_STENCIL_STATE_CREATE_INFO };
		const bool bScene = Pass != PTonemap;
		DepthState.depthTestEnable = bScene && Pass != PMemory ? VK_TRUE : VK_FALSE;
		DepthState.depthWriteEnable = bScene && Pass != PMemory && Pass != PSigil ? VK_TRUE : VK_FALSE;
		DepthState.depthCompareOp = VK_COMPARE_OP_LESS;
		VkPipelineColorBlendAttachmentState Blend{};
		Blend.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT | VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT;
		if (Pass == PSigil)
		{
			Blend.blendEnable = VK_TRUE; // additive light
			Blend.srcColorBlendFactor = VK_BLEND_FACTOR_ONE;
			Blend.dstColorBlendFactor = VK_BLEND_FACTOR_ONE;
			Blend.colorBlendOp = VK_BLEND_OP_ADD;
			Blend.srcAlphaBlendFactor = VK_BLEND_FACTOR_ZERO;
			Blend.dstAlphaBlendFactor = VK_BLEND_FACTOR_ONE;
			Blend.alphaBlendOp = VK_BLEND_OP_ADD;
		}
		VkPipelineColorBlendStateCreateInfo BlendState{ VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO };
		BlendState.attachmentCount = 1;
		BlendState.pAttachments = &Blend;
		const VkDynamicState Dynamic[2] = { VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR };
		VkPipelineDynamicStateCreateInfo DynamicState{ VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO };
		DynamicState.dynamicStateCount = 2;
		DynamicState.pDynamicStates = Dynamic;

		const VkFormat ColorFormat = bScene ? HdrFormat : OutFormat;
		VkPipelineRenderingCreateInfo Rendering{ VK_STRUCTURE_TYPE_PIPELINE_RENDERING_CREATE_INFO };
		Rendering.colorAttachmentCount = 1;
		Rendering.pColorAttachmentFormats = &ColorFormat;
		Rendering.depthAttachmentFormat = bScene ? DepthFormat : VK_FORMAT_UNDEFINED;

		VkGraphicsPipelineCreateInfo Info{ VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO };
		Info.pNext = &Rendering;
		Info.stageCount = 2;
		Info.pStages = Stages;
		Info.pVertexInputState = &VertexInput;
		Info.pInputAssemblyState = &Assembly;
		Info.pViewportState = &Viewport;
		Info.pRasterizationState = &Raster;
		Info.pMultisampleState = &Multisample;
		Info.pDepthStencilState = &DepthState;
		Info.pColorBlendState = &BlendState;
		Info.pDynamicState = &DynamicState;
		Info.layout = bScene ? SceneLayout : TonemapLayout;
		PGPU_CHECK(vkCreateGraphicsPipelines(Ctx.Device(), VK_NULL_HANDLE, 1, &Info, nullptr, &Pipelines[Pass]));
		Ctx.SetName(VK_OBJECT_TYPE_PIPELINE, Pipelines[Pass], PipelineNames[Pass]);
		vkDestroyShaderModule(Ctx.Device(), Vs, nullptr);
		vkDestroyShaderModule(Ctx.Device(), Ps, nullptr);
	}
}

void RealmRenderer::WriteTonemapSet()
{
	VkDescriptorImageInfo ImageInfo{ VK_NULL_HANDLE, Hdr.View, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL };
	VkDescriptorImageInfo SamplerInfo{ Sampler, VK_NULL_HANDLE, VK_IMAGE_LAYOUT_UNDEFINED };
	VkWriteDescriptorSet Writes[2] = { { VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET }, { VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET } };
	Writes[0].dstSet = TonemapSet;
	Writes[0].dstBinding = 0;
	Writes[0].descriptorCount = 1;
	Writes[0].descriptorType = VK_DESCRIPTOR_TYPE_SAMPLED_IMAGE;
	Writes[0].pImageInfo = &ImageInfo;
	Writes[1].dstSet = TonemapSet;
	Writes[1].dstBinding = 1;
	Writes[1].descriptorCount = 1;
	Writes[1].descriptorType = VK_DESCRIPTOR_TYPE_SAMPLER;
	Writes[1].pImageInfo = &SamplerInfo;
	vkUpdateDescriptorSets(Ctx.Device(), 2, Writes, 0, nullptr);
}

FrameTarget RealmRenderer::OffscreenTarget() const
{
	FrameTarget T;
	T.Image = Offscreen.Handle;
	T.View = Offscreen.View;
	T.Extent = Size;
	T.FinalLayout = VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL;
	T.bOffscreen = true;
	return T;
}

void RealmRenderer::ReportPasses(const Slot& Previous)
{
	const GpuStats& Stats = Telemetry.LatestStats();
	if (Previous.Tick == 0 || Stats.Tick != Previous.Tick)
	{
		return;
	}
	const double Budget = Telemetry.BudgetMs() * RenderBudgetShare;
	for (uint32_t R = 0; R < RenderScopeCount; ++R)
	{
		PipelineMetrics M;
		M.GpuMs = Stats.ScopeMs(RenderScopes[R]);
		M.BudgetMs = Budget * RenderScopeShare[R];
		M.Invocations = Previous.Invocations[R];
		M.Dispatches = Previous.Draws[R];
		Telemetry.ReportPipelinePressure(RenderScopes[R], M);
	}
}

void RealmRenderer::Render(uint64_t Tick, const RealmState& Realm, const Camera& Cam, const FrameTarget& Target)
{
	const uint32_t SlotIndex = static_cast<uint32_t>(Tick % MCP::FramesInFlight);
	Slot& S = Slots[SlotIndex];
	if (S.Tick != 0)
	{
		Ctx.WaitTimeline(GraphicsSem, S.Tick); // MCP already waited for this; cheap when done
	}
	Telemetry.BeginSlot(SlotIndex, Tick);
	ReportPasses(S);

	const MCP::TickBuffers Out = Compute.Outputs(Tick);
	const uint32_t P = static_cast<uint32_t>(Tick & 1u);
	VkCommandBuffer Cmd = S.Cmd;
	PGPU_CHECK(vkResetCommandBuffer(Cmd, 0));
	VkCommandBufferBeginInfo Begin{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO };
	Begin.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
	PGPU_CHECK(vkBeginCommandBuffer(Cmd, &Begin));
	Telemetry.BeginStatistics(Cmd, QueueRole::Graphics, SlotIndex);

	// Last frame's tonemap sampled the HDR image and its depth test wrote depth; both are
	// discarded and rewritten now.
	ImageBarrier(Cmd, Hdr.Handle, VK_IMAGE_ASPECT_COLOR_BIT, VK_IMAGE_LAYOUT_UNDEFINED, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
		VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT, 0, VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT, VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT);
	ImageBarrier(Cmd, Depth.Handle, VK_IMAGE_ASPECT_DEPTH_BIT, VK_IMAGE_LAYOUT_UNDEFINED, VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL,
		VK_PIPELINE_STAGE_2_LATE_FRAGMENT_TESTS_BIT, VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT,
		VK_PIPELINE_STAGE_2_EARLY_FRAGMENT_TESTS_BIT | VK_PIPELINE_STAGE_2_LATE_FRAGMENT_TESTS_BIT, VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_READ_BIT | VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT);

	const float Lum = Realm.Meta.Luminosity;
	VkRenderingAttachmentInfo Color{ VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO };
	Color.imageView = Hdr.View;
	Color.imageLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
	Color.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;
	Color.storeOp = VK_ATTACHMENT_STORE_OP_STORE;
	for (int I = 0; I < 3; ++I)
	{
		const float Night[3] = { 0.015f, 0.02f, 0.045f };
		Color.clearValue.color.float32[I] = (Night[I] + Realm.Meta.Essence[I] * 0.06f) * (0.5f + Lum);
	}
	Color.clearValue.color.float32[3] = 1.f;
	VkRenderingAttachmentInfo DepthAttachment{ VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO };
	DepthAttachment.imageView = Depth.View;
	DepthAttachment.imageLayout = VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL;
	DepthAttachment.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;
	DepthAttachment.storeOp = VK_ATTACHMENT_STORE_OP_STORE; // the overlay pass tests against it
	DepthAttachment.clearValue.depthStencil = { 1.f, 0 };
	VkRenderingInfo Scene{ VK_STRUCTURE_TYPE_RENDERING_INFO };
	Scene.renderArea = { { 0, 0 }, Size };
	Scene.layerCount = 1;
	Scene.colorAttachmentCount = 1;
	Scene.pColorAttachments = &Color;
	Scene.pDepthAttachment = &DepthAttachment;

	const VkViewport Viewport{ 0.f, 0.f, static_cast<float>(Size.width), static_cast<float>(Size.height), 0.f, 1.f };
	const VkRect2D Scissor{ { 0, 0 }, Size };
	const float Aspect = static_cast<float>(Size.width) / static_cast<float>(std::max(1u, Size.height));
	const Mat4 ViewProj = Multiply(Perspective(Cam.FovYDegrees * 3.14159265f / 180.f, Aspect, Cam.Near, Cam.Far), LookAt(Cam.Eye, Cam.Target));
	ScenePush Push{};
	std::memcpy(Push.ViewProj, ViewProj.M, sizeof(Push.ViewProj));
	Push.Camera[0] = Cam.Eye[0];
	Push.Camera[1] = Cam.Eye[1];
	Push.Camera[2] = Cam.Eye[2];
	Push.Camera[3] = static_cast<float>(Realm.Time);
	const uint32_t Bars = std::min(MemoryBarsShown, Out.ActorCount);
	Push.View[0] = 1.f;
	Push.View[1] = Aspect;
	Push.View[2] = std::max(0.5f, Realm.GroundRadius / 160.f);
	Push.View[3] = static_cast<float>(Bars);

	const uint32_t N = Compute.Config().TerrainN;
	S.Invocations = {};
	S.Draws = {};
	auto Draw = [&](ERenderScope Scope, EPass Pass, uint32_t Vertices, uint32_t Instances)
	{
		vkCmdBindPipeline(Cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, Pipelines[Pass]);
		if (Vertices && Instances)
		{
			vkCmdDraw(Cmd, Vertices, Instances, 0, 0);
		}
		S.Invocations[Scope] += uint64_t(Vertices) * Instances;
		++S.Draws[Scope];
	};
	auto BeginScene = [&](const VkRenderingInfo& Info)
	{
		vkCmdBeginRendering(Cmd, &Info);
		vkCmdSetViewport(Cmd, 0, 1, &Viewport);
		vkCmdSetScissor(Cmd, 0, 1, &Scissor);
		vkCmdBindDescriptorSets(Cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, SceneLayout, 0, 1, &SceneSets[P], 0, nullptr);
		vkCmdPushConstants(Cmd, SceneLayout, VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT, 0, sizeof(Push), &Push);
	};

	// Opaque: terrain, GPU-grown spires (indirect), actors.
	{
		auto Scope = Telemetry.GpuScope(Cmd, QueueRole::Graphics, SlotIndex, RenderScopes[ROpaque]);
		BeginScene(Scene);
		Draw(ROpaque, PTerrain, (N - 1) * (N - 1) * 6, 1);
		vkCmdBindPipeline(Cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, Pipelines[PSpire]);
		vkCmdDrawIndirect(Cmd, Out.StructureArgs->Handle, 0, 1, sizeof(VkDrawIndirectCommand));
		S.Invocations[ROpaque] += MCP_SPIRE_VERTICES; // per spire; the count lives on the GPU
		++S.Draws[ROpaque];
		Draw(ROpaque, PActor, 24, Out.ActorCount);
		vkCmdEndRendering(Cmd);
	}
	AttachmentBarrier(Cmd, Hdr.Handle, Depth.Handle);

	// Overlay: additive glyphs (depth-tested against the opaque scene) and the memory strip.
	{
		auto Scope = Telemetry.GpuScope(Cmd, QueueRole::Graphics, SlotIndex, RenderScopes[ROverlay], true);
		Color.loadOp = VK_ATTACHMENT_LOAD_OP_LOAD;
		DepthAttachment.loadOp = VK_ATTACHMENT_LOAD_OP_LOAD;
		DepthAttachment.storeOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
		BeginScene(Scene);
		Draw(ROverlay, PSigil, 6, Out.SigilCount);
		Draw(ROverlay, PMemory, 6, Bars * 2);
		vkCmdEndRendering(Cmd);
	}

	ImageBarrier(Cmd, Hdr.Handle, VK_IMAGE_ASPECT_COLOR_BIT, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL,
		VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT, VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT, VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT, VK_ACCESS_2_SHADER_SAMPLED_READ_BIT);
	// Swapchain images arrive through the acquire semaphore (waited at color output); the
	// offscreen image was last read by the previous frame's copy.
	ImageBarrier(Cmd, Target.Image, VK_IMAGE_ASPECT_COLOR_BIT, VK_IMAGE_LAYOUT_UNDEFINED, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
		Target.bOffscreen ? VK_PIPELINE_STAGE_2_COPY_BIT : VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT, 0,
		VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT, VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT);

	VkRenderingAttachmentInfo OutColor{ VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO };
	OutColor.imageView = Target.View;
	OutColor.imageLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
	OutColor.loadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
	OutColor.storeOp = VK_ATTACHMENT_STORE_OP_STORE;
	VkRenderingInfo Tone{ VK_STRUCTURE_TYPE_RENDERING_INFO };
	Tone.renderArea = { { 0, 0 }, Size };
	Tone.layerCount = 1;
	Tone.colorAttachmentCount = 1;
	Tone.pColorAttachments = &OutColor;
	{
		auto Scope = Telemetry.GpuScope(Cmd, QueueRole::Graphics, SlotIndex, RenderScopes[RTonemap], true);
		vkCmdBeginRendering(Cmd, &Tone);
		vkCmdSetViewport(Cmd, 0, 1, &Viewport);
		vkCmdSetScissor(Cmd, 0, 1, &Scissor);
		vkCmdBindPipeline(Cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, Pipelines[PTonemap]);
		vkCmdBindDescriptorSets(Cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, TonemapLayout, 0, 1, &TonemapSet, 0, nullptr);
		const float Params[4] = { 0.45f + 0.35f * Lum, 0.35f, 0.f, 0.f };
		vkCmdPushConstants(Cmd, TonemapLayout, VK_SHADER_STAGE_FRAGMENT_BIT, 0, sizeof(Params), Params);
		vkCmdDraw(Cmd, 3, 1, 0, 0);
		vkCmdEndRendering(Cmd);
		S.Invocations[RTonemap] = 3;
		S.Draws[RTonemap] = 1;
	}

	if (Target.bOffscreen)
	{
		ImageBarrier(Cmd, Target.Image, VK_IMAGE_ASPECT_COLOR_BIT, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
			VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT, VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT, VK_PIPELINE_STAGE_2_COPY_BIT, VK_ACCESS_2_TRANSFER_READ_BIT);
		VkBufferImageCopy Region{};
		Region.imageSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 };
		Region.imageExtent = { Size.width, Size.height, 1 };
		vkCmdCopyImageToBuffer(Cmd, Target.Image, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, S.Readback.Handle, 1, &Region);
	}
	else
	{
		ImageBarrier(Cmd, Target.Image, VK_IMAGE_ASPECT_COLOR_BIT, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL, Target.FinalLayout,
			VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT, VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT, VK_PIPELINE_STAGE_2_NONE, 0);
	}
	Telemetry.EndStatistics(Cmd, QueueRole::Graphics, SlotIndex);
	PGPU_CHECK(vkEndCommandBuffer(Cmd));

	std::vector<VkSemaphoreSubmitInfo> Waits;
	VkSemaphoreSubmitInfo ComputeWait{ VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO };
	ComputeWait.semaphore = Compute.ComputeTimeline();
	ComputeWait.value = Tick;
	ComputeWait.stageMask = VK_PIPELINE_STAGE_2_DRAW_INDIRECT_BIT | VK_PIPELINE_STAGE_2_VERTEX_SHADER_BIT | VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT;
	Waits.push_back(ComputeWait);
	if (Target.WaitBinary)
	{
		VkSemaphoreSubmitInfo Acquire{ VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO };
		Acquire.semaphore = Target.WaitBinary;
		Acquire.stageMask = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT;
		Waits.push_back(Acquire);
	}
	std::vector<VkSemaphoreSubmitInfo> Signals;
	VkSemaphoreSubmitInfo Done{ VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO };
	Done.semaphore = GraphicsSem;
	Done.value = Tick;
	Done.stageMask = VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT;
	Signals.push_back(Done);
	if (Target.SignalBinary)
	{
		VkSemaphoreSubmitInfo Present{ VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO };
		Present.semaphore = Target.SignalBinary;
		Present.stageMask = VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT;
		Signals.push_back(Present);
	}
	VkCommandBufferSubmitInfo CmdInfo{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO };
	CmdInfo.commandBuffer = Cmd;
	VkSubmitInfo2 Submit{ VK_STRUCTURE_TYPE_SUBMIT_INFO_2 };
	Submit.waitSemaphoreInfoCount = static_cast<uint32_t>(Waits.size());
	Submit.pWaitSemaphoreInfos = Waits.data();
	Submit.commandBufferInfoCount = 1;
	Submit.pCommandBufferInfos = &CmdInfo;
	Submit.signalSemaphoreInfoCount = static_cast<uint32_t>(Signals.size());
	Submit.pSignalSemaphoreInfos = Signals.data();
	PGPU_CHECK(vkQueueSubmit2(Ctx.Queue(QueueRole::Graphics).Queue, 1, &Submit, VK_NULL_HANDLE));
	S.Tick = Tick;
}

bool RealmRenderer::ReadOffscreen(uint64_t Tick, std::vector<uint8_t>& Rgba)
{
	const Slot& S = Slots[Tick % MCP::FramesInFlight];
	if (S.Tick != Tick)
	{
		return false;
	}
	Ctx.WaitTimeline(GraphicsSem, Tick);
	Ctx.Invalidate(S.Readback);
	const size_t Bytes = size_t(Size.width) * Size.height * 4;
	Rgba.resize(Bytes);
	std::memcpy(Rgba.data(), S.Readback.Mapped, Bytes);
	if (OutFormat == VK_FORMAT_B8G8R8A8_UNORM)
	{
		for (size_t I = 0; I < Bytes; I += 4)
		{
			std::swap(Rgba[I], Rgba[I + 2]);
		}
	}
	return true;
}
} // namespace primordia::gpu
