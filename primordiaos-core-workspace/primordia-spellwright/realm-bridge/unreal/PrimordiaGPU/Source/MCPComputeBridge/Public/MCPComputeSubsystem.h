// MCP for one world: the game-thread half of the GPU realm simulation.
//
// Message-passing API (Blueprint and C++):
//   SubmitRealmTick(realm)          PrimordiaOS realm state (metaphysics, ground) for coming ticks
//   SubmitActorCognition(actors)    replace the population cognition simulates
//   SubmitSigilEvaluation(sigils)   replace the glyphs the sigil evaluator sees
//   GetGPUResults(out)              newest completed tick (a few frames old), never blocks
// Every Unreal tick (Unreal tick -> PrimordiaOS realm tick) the subsystem hands one MCP tick
// to the render thread (game thread -> MCP compute submission), where FMCPGPUState records it
// into the render graph. Results come back through readbacks, feed Onyx (per-pipeline
// pressure, per-actor cost) and are broadcast to UMCPCognitionComponents and Blueprints.
#pragma once

#include "CoreMinimal.h"
#include "MCPBehaviorTree.h"
#include "MCPGPUState.h"
#include "MCPHost.h"
#include "MCPRealmTypes.h"
#include "Subsystems/WorldSubsystem.h"
#include "MCPComputeSubsystem.generated.h"

class UMCPCognitionComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FMCPResultsEvent, const FMCPResults&, Results);

UCLASS()
class MCPCOMPUTEBRIDGE_API UMCPComputeSubsystem : public UTickableWorldSubsystem
{
	GENERATED_BODY()

public:
	static UMCPComputeSubsystem* Get(const UObject* WorldContextObject);

	// USubsystem / FTickableGameObject
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;
	virtual bool DoesSupportWorldType(const EWorldType::Type WorldType) const override;
	virtual void Tick(float DeltaTime) override;
	virtual TStatId GetStatId() const override;
	virtual bool IsTickableInEditor() const override { return true; }

	// --- Message-passing API ------------------------------------------------------------
	/** The realm the coming ticks simulate. A new RealmId or Seed restarts genesis. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|MCP")
	void SubmitRealmTick(const FMCPRealmTick& Realm);

	/** Replaces the simulated population (cognition components keep the first slots). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|MCP")
	void SubmitActorCognition(const TArray<FMCPActorState>& InActors);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|MCP")
	void SubmitSigilEvaluation(const TArray<FMCPSigil>& InSigils);

	/** The newest completed tick. False until the first readback arrives. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|MCP")
	bool GetGPUResults(FMCPResults& OutResults) const;

	/** A deterministic population of Count actors (pilgrims, every fifth a warden). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|MCP")
	void SpawnCrowd(int32 Count);

	/** GPU cost knob for PrimordiaOS's tuner: the share of the population that is simulated. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|MCP")
	void SetQuality(float Scale);

	/** Where realm space (meters, PRS-1) sits in the world. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|MCP")
	void SetRealmTransform(const FTransform& InRealmToWorld, float InUnitsPerMeter = 100.f);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|MCP")
	bool HasRealm() const { return bHasRealm; }

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|MCP")
	FVector RealmToWorld(const FVector& RealmMeters) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|MCP")
	FVector WorldToRealm(const FVector& WorldLocation) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|MCP")
	int32 GetActorCount() const { return Population.Num(); }

	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|MCP")
	FMCPResultsEvent OnResults;

	/** Native mirror of OnResults. */
	TMulticastDelegate<void(const FMCPResults&)> OnResultsNative;

	const FMCPResults& LatestResults() const { return Latest; }
	TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe> GetGPUState() const { return GPU; }

	// Cognition components occupy the first population slots.
	int32 RegisterAgent(UMCPCognitionComponent* Agent);
	void UnregisterAgent(UMCPCognitionComponent* Agent);

private:
	void DispatchTick(float DeltaTime);
	void ConsumeResults();
	void ReportToOnyx(const FMCPNativeResults& Results);
	void RebuildPopulation();
	TArray<PrimordiaMCP::FActorGPU> ActivePopulation() const;
	static FMCPResults ToBlueprint(const FMCPNativeResults& R);

	PrimordiaMCP::GridConfig Grid;
	PrimordiaMCP::RealmParams Params;
	PrimordiaMCP::DefaultTrees Trees;
	TArray<PrimordiaMCP::GlyphParams> Glyphs;
	TArray<PrimordiaMCP::FSigilGPU> SigilRecords;
	TArray<FMCPActorState> SubmittedActors;
	TArray<PrimordiaMCP::FActorGPU> Population;
	TArray<TWeakObjectPtr<UMCPCognitionComponent>> Agents;
	int32 CrowdSize = 0;
	float Quality = 1.f;
	bool bPopulationDirty = false;
	bool bFreshPopulation = true; // the next upload is a new population, not a resized one
	bool bTreesUploaded = false;
	bool bHasRealm = false;
	bool bGenesis = true;
	FString RealmId;
	uint64 TickIndex = 0;
	double RealmTime = 0.0;
	FTransform RealmXform = FTransform::Identity;
	float UnitsPerMeter = 100.f;
	float BudgetShare = 0.35f;
	bool bAsyncCompute = false;
	TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe> GPU;
	FMCPNativeResults LatestNative;
	FMCPResults Latest;
};
