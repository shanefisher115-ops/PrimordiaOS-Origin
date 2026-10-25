// Blueprint-facing MCP types. Lengths are in meters in realm space (PRS-1 units); the realm
// root's transform maps them into the Unreal world.
#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "MCPRealmTypes.generated.h"

UENUM(BlueprintType)
enum class EMCPAction : uint8
{
	Idle,
	Wander,
	SeekSigil,
	Flee,
	Rest,
	Commune,
};

UENUM(BlueprintType)
enum class EMCPGlyphKind : uint8
{
	Soul,
	Sigil,
	Ward,
	Gate,
};

UENUM(BlueprintType)
enum class EMCPArchetype : uint8
{
	/** Drawn to glyphs, frightened by wards. */
	Pilgrim,
	/** Braver; patrols gates and stands its ground. */
	Warden,
};

/** One realm tick's inputs: PRS-1 metaphysics and the ground layer. */
USTRUCT(BlueprintType)
struct MCPCOMPUTEBRIDGE_API FMCPRealmTick
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") FString RealmId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") int64 Seed = 0x5eed1e55;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Entropy = 0.35f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Luminosity = 0.7f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Coherence = 0.6f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Resonance = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Inversion = 0.2f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Lucidity = 0.55f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0.05, ClampMax = 8)) float TimeDilation = 1.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") FLinearColor Essence = FLinearColor(1.f, 0.42f, 0.28f);
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float GroundRadiusMeters = 120.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 1, ClampMax = 12)) float TerraceCount = 5.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Roughness = 0.22f;
};

/** A PRS-1 glyph for the sigil evaluator. */
USTRUCT(BlueprintType)
struct MCPCOMPUTEBRIDGE_API FMCPSigil
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") FString Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") EMCPGlyphKind Kind = EMCPGlyphKind::Sigil;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") FVector PositionMeters = FVector::ZeroVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float DiameterMeters = 3.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 1, ClampMax = 64)) int32 Symmetry = 6;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Complexity = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Hue = 0.6f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") bool bBound = false;
	/** What the glyph is for; hashed into its pattern (same intent, same glyph). Empty = Id. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") FString Intent;
};

/** An actor as submitted to cognition. */
USTRUCT(BlueprintType)
struct MCPCOMPUTEBRIDGE_API FMCPActorState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") FVector PositionMeters = FVector::ZeroVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float MaxSpeed = 2.4f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Energy = 0.8f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Curiosity = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Fear = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float Devotion = 0.3f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") EMCPArchetype Archetype = EMCPArchetype::Pilgrim;
};

/** What cognition decided for one actor on one tick. */
USTRUCT(BlueprintType)
struct MCPCOMPUTEBRIDGE_API FMCPActorResult
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "MCP") int32 Index = 0;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") FVector PositionMeters = FVector::ZeroVector;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") FVector VelocityMetersPerSecond = FVector::ZeroVector;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") EMCPAction Action = EMCPAction::Idle;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float Energy = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float Curiosity = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float Fear = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float Devotion = 0.f;
	/** Cosine similarity of the best recalled memory (0 = nothing recalled). */
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float RecallSimilarity = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float RecalledFear = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float RecallAgeSeconds = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") int32 MemoriesWritten = 0;
};

USTRUCT(BlueprintType)
struct MCPCOMPUTEBRIDGE_API FMCPResults
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "MCP") int64 Tick = 0;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") float RealmTime = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") TArray<FMCPActorResult> Actors;
	/** Spires the topology pass grew this tick. */
	UPROPERTY(BlueprintReadOnly, Category = "MCP") int32 Structures = 0;
	/** Per sigil: field voxels it contributed to (its evaluation cost). */
	UPROPERTY(BlueprintReadOnly, Category = "MCP") TArray<int32> SigilVoxels;
	/** Per EMCPAction: how many actors chose it. */
	UPROPERTY(BlueprintReadOnly, Category = "MCP") TArray<int32> ActionCounts;
};

UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "PrimordiaOS MCP"))
class MCPCOMPUTEBRIDGE_API UMCPSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	/** Run MCP every game frame in worlds that have a realm. */
	UPROPERTY(Config, EditAnywhere, Category = "MCP") bool bEnabled = true;
	/** Height-field cells per side (multiple of 4). */
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 32, ClampMax = 1024)) int32 TerrainResolution = 256;
	/** Sigil-field voxels per side. */
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 8, ClampMax = 128)) int32 FieldResolution = 64;
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 1, ClampMax = 65536)) int32 MaxActors = 4096;
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 0, ClampMax = 65536)) int32 MaxStructures = 1024;
	/** Population spawned when a realm arrives and no actors were submitted. */
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 0, ClampMax = 65536)) int32 CrowdSize = 1024;
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 1, ClampMax = 600)) int32 MemoryIntervalTicks = 30;
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 0)) float RecallMinAgeSeconds = 1.f;
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 0)) float CommitSeconds = 0.75f;
	/** Run the kernels on the async compute pipe. Onyx then times MCP as a whole, not per kernel. */
	UPROPERTY(Config, EditAnywhere, Category = "MCP") bool bAsyncCompute = false;
	/** Share of the Onyx frame budget MCP may use (per-kernel saturation is measured against it). */
	UPROPERTY(Config, EditAnywhere, Category = "MCP", meta = (ClampMin = 0.01, ClampMax = 1)) float BudgetShare = 0.35f;
};
