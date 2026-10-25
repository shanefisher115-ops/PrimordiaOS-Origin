// Gives an Unreal actor a mind on the GPU: the actor joins the MCP population (first slots),
// cognition decides for it every tick, and the decision arrives here a few frames later.
// With bDriveOwner the owner moves where MCP steered it; otherwise gameplay reads Action /
// TargetLocation and moves it itself.
#pragma once

#include "Components/ActorComponent.h"
#include "CoreMinimal.h"
#include "MCPRealmTypes.h"
#include "MCPCognitionComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FMCPDecisionEvent, EMCPAction, NewAction, const FMCPActorResult&, Result);

UCLASS(ClassGroup = (PrimordiaOS), meta = (BlueprintSpawnableComponent))
class MCPCOMPUTEBRIDGE_API UMCPCognitionComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UMCPCognitionComponent();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") EMCPArchetype Archetype = EMCPArchetype::Pilgrim;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float MaxSpeedMetersPerSecond = 2.4f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float InitialEnergy = 0.8f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float InitialCuriosity = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP", meta = (ClampMin = 0, ClampMax = 1)) float InitialDevotion = 0.3f;
	/** Move the owner to where MCP steered it each time a result arrives. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") bool bDriveOwner = true;

	UPROPERTY(BlueprintReadOnly, Category = "MCP") EMCPAction Action = EMCPAction::Idle;
	UPROPERTY(BlueprintReadOnly, Category = "MCP") FMCPActorResult LastResult;
	/** World location of the GPU-side actor (what bDriveOwner would move the owner to). */
	UPROPERTY(BlueprintReadOnly, Category = "MCP") FVector TargetLocation = FVector::ZeroVector;

	/** Fires when cognition commits to a different action. */
	UPROPERTY(BlueprintAssignable, Category = "MCP") FMCPDecisionEvent OnDecision;

	FMCPActorState MakeInitialState(const class UMCPComputeSubsystem& MCP) const;
	void ApplyResult(const FMCPActorResult& Result, const class UMCPComputeSubsystem& MCP);

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type Reason) override;
};
