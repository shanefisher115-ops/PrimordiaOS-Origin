#include "PrimordiaRealmGPUSubsystem.h"

#include "Actors/RealmRootActor.h"
#include "Dom/JsonObject.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "HAL/IConsoleManager.h"
#include "MCPComputeSubsystem.h"
#include "MCPCrowdVisualizer.h"
#include "MCPRealmTypes.h"
#include "Modules/ModuleManager.h"
#include "Onyx.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaBridgeSubsystem.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace
{
TAutoConsoleVariable<float> CVarTelemetryHz(TEXT("primordia.gpu.TelemetryHz"), 4.f, TEXT("Onyx telemetry frames sent to PrimordiaOS per second (0 = off)."));
TAutoConsoleVariable<int32> CVarCrowd(TEXT("primordia.gpu.Crowd"), 1, TEXT("Spawn the MCP crowd visualizer when a realm arrives."));

EMCPGlyphKind KindOf(FName Kind)
{
	if (Kind == TEXT("soul")) return EMCPGlyphKind::Soul;
	if (Kind == TEXT("ward")) return EMCPGlyphKind::Ward;
	if (Kind == TEXT("gate")) return EMCPGlyphKind::Gate;
	return EMCPGlyphKind::Sigil;
}
} // namespace

bool UPrimordiaRealmGPUSubsystem::DoesSupportWorldType(const EWorldType::Type WorldType) const
{
	return WorldType == EWorldType::Game || WorldType == EWorldType::PIE || WorldType == EWorldType::Editor;
}

void UPrimordiaRealmGPUSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	Bridge = Collection.InitializeDependency<UPrimordiaBridgeSubsystem>();
	MCP = Collection.InitializeDependency<UMCPComputeSubsystem>();
	if (Bridge.IsValid())
	{
		Bridge->OnRealmManifest.AddDynamic(this, &UPrimordiaRealmGPUSubsystem::HandleManifest);
		bBound = true;
	}
}

void UPrimordiaRealmGPUSubsystem::Deinitialize()
{
	if (bBound && Bridge.IsValid())
	{
		Bridge->OnRealmManifest.RemoveDynamic(this, &UPrimordiaRealmGPUSubsystem::HandleManifest);
	}
	Super::Deinitialize();
}

TStatId UPrimordiaRealmGPUSubsystem::GetStatId() const
{
	RETURN_QUICK_DECLARE_CYCLE_STAT(UPrimordiaRealmGPUSubsystem, STATGROUP_Tickables);
}

FMCPRealmTick UPrimordiaRealmGPUSubsystem::ToRealmTick(const FPrimordiaRealmManifest& M, float UnitsPerMeter)
{
	FMCPRealmTick T;
	T.RealmId = M.RealmId;
	T.Seed = M.Seed;
	T.Entropy = M.Metaphysics.Entropy;
	T.Luminosity = M.Metaphysics.Luminosity;
	T.Coherence = M.Metaphysics.Coherence;
	T.Resonance = M.Metaphysics.Resonance;
	T.Inversion = M.Metaphysics.Inversion;
	T.Lucidity = M.Metaphysics.Lucidity;
	T.TimeDilation = M.Metaphysics.TimeDilation;
	T.Essence = M.Metaphysics.Essence;
	for (const FPrimordiaRealmLayer& Layer : M.Layers)
	{
		if (Layer.Kind == TEXT("ground"))
		{
			T.GroundRadiusMeters = Layer.Radius / UnitsPerMeter;
			T.TerraceCount = Layer.Param(TEXT("terrace_count"), T.TerraceCount);
			T.Roughness = Layer.Param(TEXT("roughness"), T.Roughness);
		}
	}
	return T;
}

TArray<FMCPSigil> UPrimordiaRealmGPUSubsystem::ToSigils(const FPrimordiaRealmManifest& M, float UnitsPerMeter)
{
	TArray<FMCPSigil> Out;
	for (const FPrimordiaGlyphSpec& G : M.Glyphs)
	{
		FMCPSigil S;
		S.Id = G.Id;
		S.Kind = KindOf(G.Kind);
		S.PositionMeters = G.Position / UnitsPerMeter;
		S.DiameterMeters = G.Scale / UnitsPerMeter;
		S.Symmetry = G.Symmetry;
		S.Complexity = G.Complexity;
		S.Hue = G.Hue;
		S.bBound = !G.BoundTo.IsEmpty();
		S.Intent = G.Intent;
		Out.Add(S);
	}
	return Out;
}

float UPrimordiaRealmGPUSubsystem::GpuQuality(const FPrimordiaRealmManifest& M)
{
	TSharedPtr<FJsonObject> Json;
	double Quality = 1.0;
	if (!M.SourceJson.IsEmpty() && FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(M.SourceJson), Json) && Json.IsValid())
	{
		Json->TryGetNumberField(TEXT("gpu_quality"), Quality);
	}
	return static_cast<float>(FMath::Clamp(Quality, 0.05, 1.0));
}

void UPrimordiaRealmGPUSubsystem::HandleManifest(const FPrimordiaRealmManifest& Manifest, ARealmRootActor* Realm)
{
	UMCPComputeSubsystem* Compute = MCP.Get();
	if (!Compute)
	{
		return;
	}
	const float UnitsPerMeter = GetDefault<UPrimordiaBridgeSettings>()->UnitsPerMeter;
	RealmRoot = Realm;
	Compute->SetRealmTransform(Realm ? Realm->GetActorTransform() : FTransform::Identity, UnitsPerMeter);
	Compute->SubmitRealmTick(ToRealmTick(Manifest, UnitsPerMeter));
	Compute->SubmitSigilEvaluation(ToSigils(Manifest, UnitsPerMeter));
	Compute->SetQuality(GpuQuality(Manifest)); // PrimordiaOS's tuner thins the population too

	UWorld* World = GetWorld();
	if (CVarCrowd.GetValueOnGameThread() != 0 && World && !Crowd.IsValid())
	{
		for (TActorIterator<AMCPCrowdVisualizer> It(World); It; ++It)
		{
			Crowd = *It;
		}
		if (!Crowd.IsValid())
		{
			FActorSpawnParameters Params;
			Params.ObjectFlags |= RF_Transient;
			Crowd = World->SpawnActor<AMCPCrowdVisualizer>(Params);
		}
	}
}

bool UPrimordiaRealmGPUSubsystem::SendTelemetry()
{
	UPrimordiaBridgeSubsystem* Link = Bridge.Get();
	if (!Link || !Link->IsConnected())
	{
		return false;
	}
	const FOnyxFrame Frame = FOnyx::Get().LatestFrame();
	if (Frame.Tick <= 0)
	{
		return false;
	}
	TSharedRef<FJsonObject> Payload = FOnyx::ToJson(Frame);
	Payload->SetStringField(TEXT("type"), TEXT("telemetry"));
	Payload->SetStringField(TEXT("source"), TEXT("unreal"));
	if (const UMCPComputeSubsystem* Compute = MCP.Get())
	{
		Payload->SetNumberField(TEXT("quality"), 1.0); // what Unreal renders is already the thinned manifest
		Payload->SetNumberField(TEXT("mcp_actors"), Compute->GetActorCount());
	}
	FString Json;
	FJsonSerializer::Serialize(Payload, TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Json));
	return Link->SendJson(Json);
}

void UPrimordiaRealmGPUSubsystem::Tick(float DeltaTime)
{
	// The realm root may move (editor, gameplay): keep MCP's realm space on it.
	if (UMCPComputeSubsystem* Compute = MCP.Get(); Compute && RealmRoot.IsValid())
	{
		Compute->SetRealmTransform(RealmRoot->GetActorTransform(), GetDefault<UPrimordiaBridgeSettings>()->UnitsPerMeter);
	}
	const float Hz = CVarTelemetryHz.GetValueOnGameThread();
	if (Hz <= 0.f)
	{
		return;
	}
	SinceTelemetry += DeltaTime;
	if (SinceTelemetry >= 1.0 / Hz)
	{
		SinceTelemetry = 0.0;
		SendTelemetry();
	}
}
