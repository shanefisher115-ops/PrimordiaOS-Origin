// The continuous realm loop: the five steps of the PrimordiaOS GPU pipeline, once per frame.
//   1. PrimordiaOS generates the next realm tick (manifest, metaphysics, population arrive
//      through Apply*/SetQuality; Step() stamps the tick).
//   2. MCP runs the tick on the GPU: topology mutation, sigil field, cognition, memory.
//   3. Vulkan renders the updated realm (window or offscreen).
//   4. Onyx captures GPU and realm metrics.
//   5. The OnyxFrame goes back to PrimordiaOS (sinks: the sidecar's stdout, the window title),
//      whose tuner answers with manifest density changes or SetQuality().
#pragma once

#include "primordia/gpu/MCP.h"
#include "MCPBehaviorTree.h" // unreal/PrimordiaGPU/Shaders/Shared: one compiler for both hosts
#include "primordia/gpu/Onyx.h"
#include "primordia/gpu/RealmRenderer.h"
#include "primordia/gpu/RealmState.h"
#include "primordia/gpu/Swapchain.h"
#include "primordia/gpu/VulkanContext.h"

#include <deque>
#include <memory>
#include <optional>
#include <string>

namespace primordia::gpu
{
struct RealmLoopOptions
{
	bool bValidation = false;
	bool bWindow = false;
	bool bVsync = true;
	uint32_t Width = 1280;
	uint32_t Height = 720;
	uint32_t Actors = 2048;
	double BudgetMs = 1000.0 / 60.0;
	std::string ShaderDir;
	std::string PreferredDevice;
	MCPConfig Config;
};

class RealmLoop
{
public:
	explicit RealmLoop(const RealmLoopOptions& Options);
	~RealmLoop();

	// --- PrimordiaOS -> engine --------------------------------------------------------
	/** A PRS-1 manifest. A new realm respawns the population. */
	bool ApplyManifest(const Json& Manifest, std::string& Error);
	void ApplyMetaphysics(const Json& Metaphysics);
	/** Replaces the population with Count deterministic actors. */
	void SpawnActors(uint32_t Count);
	/** GPU cost knob for PrimordiaOS's tuner: the share of the population that is simulated. */
	void SetQuality(double Scale);
	void SetBudgetMs(double Ms) { Telemetry->SetBudgetMs(Ms); }

	/** One frame of the loop. Returns false when the window was closed. */
	bool Step(float Dt);

	/** Writes the newest rendered frame as PNG (headless mode only). */
	bool SaveFrame(const std::string& Path);

	const OnyxFrame& LastTelemetry() const { return Telemetry->LastFrame(); }
	const std::optional<MCPResults>& LastResults() const { return Latest; }
	RealmState& Realm() { return State; }
	VulkanContext& Context() { return *Ctx; }
	Onyx& GetOnyx() { return *Telemetry; }
	MCP& GetMCP() { return *Compute; }
	double Quality() const { return QualityScale; }
	uint32_t PopulationSize() const { return static_cast<uint32_t>(Population.size()); }

private:
	void UploadPopulation();

	RealmLoopOptions Opts;
	std::unique_ptr<VulkanContext> Ctx;
	std::unique_ptr<Win32Window> Window;
	std::unique_ptr<Swapchain> Chain;
	std::unique_ptr<Onyx> Telemetry;
	std::unique_ptr<MCP> Compute;
	std::unique_ptr<RealmRenderer> Renderer;
	PrimordiaMCP::DefaultTrees Trees;
	RealmState State;
	std::vector<FActorGPU> Population;
	double QualityScale = 1.0;
	std::deque<MCPResults> RecentResults; // matched to Onyx's resolved tick for cost attribution
	std::optional<MCPResults> Latest;
	uint64_t LastRendered = 0;
};
} // namespace primordia::gpu
