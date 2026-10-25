// Draws the MCP population in the Unreal world: one instanced-mesh component per action,
// tinted like the standalone renderer's actors, updated whenever a readback arrives.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MCPRealmTypes.h"
#include "MCPCrowdVisualizer.generated.h"

class UInstancedStaticMeshComponent;
class UMCPComputeSubsystem;

UCLASS()
class MCPCOMPUTEBRIDGE_API AMCPCrowdVisualizer : public AActor
{
	GENERATED_BODY()

public:
	AMCPCrowdVisualizer();

	/** Actor scale in meters (an actor is drawn as a cone this tall). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float ActorHeightMeters = 1.6f;
	/** Draw at most this many actors (the population may be larger). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") int32 MaxDrawn = 4096;

	virtual void Tick(float DeltaSeconds) override;
	virtual bool ShouldTickIfViewportsOnly() const override { return true; }

protected:
	virtual void BeginPlay() override;

private:
	void Refresh(const FMCPResults& Results, const UMCPComputeSubsystem& MCP);

	UPROPERTY() TArray<TObjectPtr<UInstancedStaticMeshComponent>> ByAction;
	int64 DrawnTick = 0;
};
