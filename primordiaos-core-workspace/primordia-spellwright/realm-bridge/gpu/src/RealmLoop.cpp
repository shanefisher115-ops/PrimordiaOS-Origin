#include "primordia/gpu/RealmLoop.h"

#include "primordia/gpu/Png.h"

#include <algorithm>
#include <cmath>
#include <cstdio>

namespace primordia::gpu
{
RealmLoop::RealmLoop(const RealmLoopOptions& Options) : Opts(Options), State(DefaultRealm())
{
	ContextOptions CtxOptions;
	CtxOptions.bValidation = Opts.bValidation;
	CtxOptions.bSwapchain = Opts.bWindow;
	CtxOptions.PreferredDevice = Opts.PreferredDevice;
	Ctx = std::make_unique<VulkanContext>(CtxOptions);
	if (!Trees.Compiler.Error().empty())
	{
		throw std::runtime_error("default behavior trees: " + Trees.Compiler.Error());
	}

	VkFormat Output = VK_FORMAT_R8G8B8A8_UNORM;
	VkExtent2D Extent{ Opts.Width, Opts.Height };
	if (Opts.bWindow)
	{
		Window = std::make_unique<Win32Window>("PrimordiaOS realm", Opts.Width, Opts.Height);
		Chain = std::make_unique<Swapchain>(*Ctx, *Window, MCP::FramesInFlight, Opts.bVsync);
		Output = Chain->Format();
		Extent = Chain->Extent();
	}
	Telemetry = std::make_unique<Onyx>(*Ctx, MCP::FramesInFlight, Opts.BudgetMs);
	Compute = std::make_unique<MCP>(*Ctx, *Telemetry, Opts.Config, Opts.ShaderDir);
	Renderer = std::make_unique<RealmRenderer>(*Ctx, *Telemetry, *Compute, Opts.ShaderDir, Output, Extent);

	Compute->SetBehaviorTrees(Trees.Compiler.Nodes());
	Compute->SubmitSigilEvaluation(State.BuildSigils());
	SpawnActors(Opts.Actors);
}

RealmLoop::~RealmLoop()
{
	if (Ctx)
	{
		vkDeviceWaitIdle(Ctx->Device());
	}
	Renderer.reset();
	Compute.reset();
	Telemetry.reset();
	Chain.reset();
	Window.reset();
	Ctx.reset();
}

bool RealmLoop::ApplyManifest(const Json& Manifest, std::string& Error)
{
	const std::string PreviousId = State.RealmId;
	const uint32_t PreviousSeed = State.Seed;
	if (!State.ApplyManifest(Manifest, Error))
	{
		return false;
	}
	Compute->SubmitSigilEvaluation(State.BuildSigils());
	if (State.RealmId != PreviousId || State.Seed != PreviousSeed)
	{
		SpawnActors(static_cast<uint32_t>(Population.size()));
	}
	return true;
}

void RealmLoop::ApplyMetaphysics(const Json& Metaphysics)
{
	State.Meta.Apply(Metaphysics);
}

void RealmLoop::SpawnActors(uint32_t Count)
{
	Population = SpawnPopulation(State, std::min(Count, Compute->Config().MaxActors), Trees.Pilgrim, Trees.Warden);
	UploadPopulation();
}

void RealmLoop::SetQuality(double Scale)
{
	const double Clamped = std::clamp(Scale, 0.05, 1.0);
	if (std::abs(Clamped - QualityScale) < 1e-3)
	{
		return;
	}
	QualityScale = Clamped;
	UploadPopulation();
}

void RealmLoop::UploadPopulation()
{
	// The simulated share of the population. The latest GPU state of the survivors is kept
	// when there is one, so a quality change does not teleport anyone back to spawn.
	const size_t Active = std::max<size_t>(1, static_cast<size_t>(std::round(Population.size() * QualityScale)));
	std::vector<FActorGPU> Submit(Population.begin(), Population.begin() + std::min(Active, Population.size()));
	if (Latest)
	{
		for (size_t I = 0; I < Submit.size() && I < Latest->Actors.size(); ++I)
		{
			Submit[I] = Latest->Actors[I];
		}
	}
	Compute->SubmitActorCognition(Submit);
}

bool RealmLoop::Step(float Dt)
{
	if (Window && !Window->Pump())
	{
		return false;
	}

	// 1. PrimordiaOS -> next tick (state already updated by Apply*; stamp the clock).
	State.Dt = std::clamp(Dt, 1.f / 480.f, 0.1f);
	Telemetry->BeginFrame(State);

	// 2. MCP: GPU cognition and topology mutation for this tick.
	const uint64_t Tick = Compute->SubmitRealmTick(State);

	// Results of earlier ticks (never waits). Keep a few, so per-actor cost can be computed
	// from the same tick Onyx just resolved timings for.
	if (auto Results = Compute->GetGPUResults())
	{
		RecentResults.push_back(*Results);
		while (RecentResults.size() > 4)
		{
			RecentResults.pop_front();
		}
		Latest = std::move(Results);
	}
	const GpuStats& Stats = Telemetry->LatestStats();
	for (const MCPResults& R : RecentResults)
	{
		if (R.Tick == Stats.Tick)
		{
			Telemetry->ReportMCPWork(Stats, R.Actors, R.Costs, R.SigilVoxels);
			Telemetry->ReportStructures(R.Structures);
		}
	}

	// 3. Vulkan renders the tick.
	const Camera Cam = Camera::Orbit(State, State.Time);
	if (Chain)
	{
		Swapchain::Frame F;
		if (!Chain->Acquire(static_cast<uint32_t>(Tick % MCP::FramesInFlight), F))
		{
			Chain->Recreate();
			Renderer->Resize(Chain->Extent());
			// This tick still has to signal the graphics timeline: render it offscreen.
			Renderer->Render(Tick, State, Cam, Renderer->OffscreenTarget());
		}
		else
		{
			FrameTarget Target;
			Target.Image = F.Image;
			Target.View = F.View;
			Target.Extent = Chain->Extent();
			Target.FinalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;
			Target.WaitBinary = F.Acquired;
			Target.SignalBinary = F.Rendered;
			Renderer->Render(Tick, State, Cam, Target);
			if (!Chain->Present(F))
			{
				Chain->Recreate();
				Renderer->Resize(Chain->Extent());
			}
		}
	}
	else
	{
		Renderer->Render(Tick, State, Cam, Renderer->OffscreenTarget());
	}
	LastRendered = Tick;

	// 4 + 5. Onyx closes the frame and hands it to the sinks (PrimordiaOS feedback).
	Telemetry->EndFrame(State, Stats);
	if (Window && Tick % 30 == 0)
	{
		const OnyxFrame& F = Telemetry->LastFrame();
		char Title[256];
		std::snprintf(Title, sizeof(Title), "PrimordiaOS realm  |  %s  |  %.0f fps  gpu %.2f ms (mcp %.2f, render %.2f)  actors %u",
			State.RealmName.c_str(), F.Fps, F.FrameGpuMs, F.RealmTickGpuMs, F.RenderGpuMs, Compute->ActorCount());
		Window->SetTitle(Title);
	}
	return true;
}

bool RealmLoop::SaveFrame(const std::string& Path)
{
	if (Chain || LastRendered == 0)
	{
		return false;
	}
	std::vector<uint8_t> Rgba;
	if (!Renderer->ReadOffscreen(LastRendered, Rgba))
	{
		return false;
	}
	const VkExtent2D E = Renderer->Extent();
	return WritePngRgba(Path, E.width, E.height, Rgba);
}
} // namespace primordia::gpu
