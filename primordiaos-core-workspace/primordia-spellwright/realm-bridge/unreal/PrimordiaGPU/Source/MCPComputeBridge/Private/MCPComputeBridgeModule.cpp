// Maps the plugin's Shaders/ folder to /Plugin/PrimordiaGPU (this module loads at
// PostConfigInit, so the mapping and the MCP global shader types exist before Unreal compiles
// its global shader map), and registers the MCP console commands:
//   mcp.Demo [actors]   run MCP in the current world on the reference realm (no bridge needed)
//   mcp.Report          log the latest MCP results and Onyx GPU scopes
// -MCPSmokeTest on the command line runs mcp.Demo in the first world, waits for GPU results,
// logs "MCPSmokeTest PASS|FAIL ..." and exits (exit code 1 on failure).
#include "Containers/Ticker.h"
#include "MCPGPUState.h"
#include "Misc/CoreDelegates.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "MCPCrowdVisualizer.h"
#include "HAL/IConsoleManager.h"
#include "Interfaces/IPluginManager.h"
#include "MCPComputeSubsystem.h"
#include "Misc/CommandLine.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "Onyx.h"
#include "ShaderCore.h"

DEFINE_LOG_CATEGORY_STATIC(LogMCP, Log, All);

namespace
{
/** The reference realm (examples/genesis-5eed1e55 plus one ward), as the standalone engine runs it. */
void RunDemo(UMCPComputeSubsystem& MCP, int32 Actors)
{
	auto Glyph = [](const TCHAR* Id, EMCPGlyphKind Kind, FVector Position, float Diameter, int32 Symmetry, float Complexity, float Hue, const TCHAR* Intent)
	{
		FMCPSigil S;
		S.Id = Id;
		S.Kind = Kind;
		S.PositionMeters = Position;
		S.DiameterMeters = Diameter;
		S.Symmetry = Symmetry;
		S.Complexity = Complexity;
		S.Hue = Hue;
		S.bBound = Kind == EMCPGlyphKind::Soul;
		S.Intent = Intent;
		return S;
	};
	MCP.SubmitSigilEvaluation({
		Glyph(TEXT("soul"), EMCPGlyphKind::Soul, FVector(0, 0, 14), 6.f, 6, 0.5f, 0.62f, TEXT("LUMENNE HOLLOW")),
		Glyph(TEXT("sigil-0"), EMCPGlyphKind::Gate, FVector(-3.805, -31.773, 10.92), 3.07f, 3, 0.4f, 0.635f, TEXT("RETURN THE DAWN OF LUMENNE")),
		Glyph(TEXT("sigil-1"), EMCPGlyphKind::Gate, FVector(17.32, 26.91, 12.61), 4.08f, 8, 0.33f, 0.454f, TEXT("CROSS THE DAWN OF LUMENNE")),
		Glyph(TEXT("ward-0"), EMCPGlyphKind::Ward, FVector(34, -12, 9.5), 5.f, 5, 0.7f, 0.02f, TEXT("GUARD THE DREAM OF LUMENNE")),
	});
	FMCPRealmTick Realm;
	Realm.RealmId = TEXT("realm-5eed1e55");
	Realm.Seed = 0x5eed1e55;
	Realm.GroundRadiusMeters = 120.f;
	Realm.TerraceCount = 5.f;
	Realm.Roughness = 0.2185f;
	MCP.SubmitRealmTick(Realm);
	MCP.SpawnCrowd(Actors);

	// Make the population visible (the realm bridge binding spawns one too when a realm arrives).
	UWorld* World = MCP.GetWorld();
	if (World && !TActorIterator<AMCPCrowdVisualizer>(World))
	{
		FActorSpawnParameters Params;
		Params.ObjectFlags |= RF_Transient;
		World->SpawnActor<AMCPCrowdVisualizer>(Params);
	}
}

FString Report(const UMCPComputeSubsystem& MCP)
{
	const FMCPResults& R = MCP.LatestResults();
	const FOnyxGpuStats Gpu = FOnyx::Get().SampleGpu();
	FString Actions;
	static const TCHAR* const Names[] = { TEXT("idle"), TEXT("wander"), TEXT("seek"), TEXT("flee"), TEXT("rest"), TEXT("commune") };
	for (int32 A = 0; A < R.ActionCounts.Num() && A < UE_ARRAY_COUNT(Names); ++A)
	{
		Actions += FString::Printf(TEXT("%s %d "), Names[A], R.ActionCounts[A]);
	}
	FString Voxels;
	for (int32 V : R.SigilVoxels)
	{
		Voxels += FString::Printf(TEXT("%d "), V);
	}
	FString Scopes;
	for (const FOnyxScope& S : Gpu.Scopes)
	{
		Scopes += FString::Printf(TEXT("%s %.3f  "), *S.Name, S.Ms);
	}
	return FString::Printf(TEXT("tick %lld  actors %d  [%s]  spires %d  sigil voxels [%s]  rhi %s  device %s  gpu frame %.2f ms  memory %.0f/%.0f MB  scopes [%s]"),
		R.Tick, R.Actors.Num(), *Actions.TrimEnd(), R.Structures, *Voxels.TrimEnd(), *Gpu.RHIName, *Gpu.Device, Gpu.FrameGpuMs,
		Gpu.DeviceLocalUsage / 1048576.0, Gpu.DeviceLocalBudget / 1048576.0, *Scopes);
}

UMCPComputeSubsystem* FirstMCPWorld()
{
	if (!GEngine)
	{
		return nullptr;
	}
	for (const FWorldContext& Context : GEngine->GetWorldContexts())
	{
		if (UWorld* World = Context.World())
		{
			if (UMCPComputeSubsystem* MCP = World->GetSubsystem<UMCPComputeSubsystem>())
			{
				return MCP;
			}
		}
	}
	return nullptr;
}
} // namespace

class FMCPComputeBridgeModule : public IModuleInterface
{
public:
	virtual void StartupModule() override
	{
		const TSharedPtr<IPlugin> Plugin = IPluginManager::Get().FindPlugin(TEXT("PrimordiaGPU"));
		if (Plugin.IsValid())
		{
			AddShaderSourceDirectoryMapping(TEXT("/Plugin/PrimordiaGPU"), FPaths::Combine(Plugin->GetBaseDir(), TEXT("Shaders")));
		}

		PreExitHandle = FCoreDelegates::OnEnginePreExit.AddStatic(&FMCPGPUState::ReleaseAll);

		Commands.Add(IConsoleManager::Get().RegisterConsoleCommand(TEXT("mcp.Demo"), TEXT("mcp.Demo [actors]: run MCP in this world on the reference realm."),
			FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>& Args, UWorld* World)
			{
				if (UMCPComputeSubsystem* MCP = World ? World->GetSubsystem<UMCPComputeSubsystem>() : nullptr)
				{
					RunDemo(*MCP, Args.Num() > 0 ? FCString::Atoi(*Args[0]) : 1024);
					UE_LOG(LogMCP, Display, TEXT("MCP demo realm started in %s"), *World->GetName());
				}
			})));
		Commands.Add(IConsoleManager::Get().RegisterConsoleCommand(TEXT("mcp.Report"), TEXT("Logs the latest MCP results and Onyx GPU scopes."),
			FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>&, UWorld* World)
			{
				if (const UMCPComputeSubsystem* MCP = World ? World->GetSubsystem<UMCPComputeSubsystem>() : nullptr)
				{
					UE_LOG(LogMCP, Display, TEXT("%s"), *Report(*MCP));
				}
			})));

		if (FParse::Param(FCommandLine::Get(), TEXT("MCPSmokeTest")))
		{
			SmokeTicker = FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateRaw(this, &FMCPComputeBridgeModule::SmokeTick), 0.f);
		}
	}

	virtual void ShutdownModule() override
	{
		FCoreDelegates::OnEnginePreExit.Remove(PreExitHandle);
		FTSTicker::GetCoreTicker().RemoveTicker(SmokeTicker);
		for (IConsoleObject* C : Commands)
		{
			IConsoleManager::Get().UnregisterConsoleObject(C);
		}
		Commands.Reset();
	}

private:
	/** -MCPSmokeTest: demo realm, wait for real GPU results, report, exit. */
	bool SmokeTick(float DeltaTime)
	{
		SmokeSeconds += DeltaTime;
		UMCPComputeSubsystem* MCP = FirstMCPWorld();
		if (!MCP)
		{
			return SmokeSeconds < 600.f || Finish(false, TEXT("no world with MCP"));
		}
		if (!MCP->HasRealm())
		{
			RunDemo(*MCP, 1024);
			return true;
		}
		const FMCPResults& R = MCP->LatestResults();
		const bool bScopes = FOnyx::Get().SampleGpu().ScopeMs(TEXT("mcp.cognition")) > 0.0;
		if (R.Tick >= 240 && (bScopes || SmokeSeconds > 400.f))
		{
			int32 Moving = 0;
			for (int32 A = 1; A < R.ActionCounts.Num(); ++A)
			{
				Moving += R.ActionCounts[A];
			}
			bool bVoxels = R.SigilVoxels.Num() == 4;
			for (int32 V : R.SigilVoxels)
			{
				bVoxels &= V > 0;
			}
			const bool bPass = R.Actors.Num() == 1024 && Moving > 0 && bVoxels && bScopes;
			return Finish(bPass, Report(*MCP));
		}
		return SmokeSeconds < 600.f || Finish(false, FString::Printf(TEXT("timed out at tick %lld: %s"), R.Tick, *Report(*MCP)));
	}

	bool Finish(bool bPass, const FString& Detail)
	{
		UE_LOG(LogMCP, Display, TEXT("MCPSmokeTest %s %s"), bPass ? TEXT("PASS") : TEXT("FAIL"), *Detail);
		FPlatformMisc::RequestExitWithStatus(false, bPass ? 0 : 1);
		return false;
	}

	TArray<IConsoleObject*> Commands;
	FTSTicker::FDelegateHandle SmokeTicker;
	FDelegateHandle PreExitHandle;
	float SmokeSeconds = 0.f;
};

IMPLEMENT_MODULE(FMCPComputeBridgeModule, MCPComputeBridge)
