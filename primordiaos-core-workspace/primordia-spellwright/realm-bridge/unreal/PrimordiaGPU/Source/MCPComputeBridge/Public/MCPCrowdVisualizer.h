// Draws the MCP population in the Unreal world: one instanced mesh of glowing wisps, tinted by
// the action each actor committed to, standing on the world's real ground.
//
// MCP simulates on its own GPU height field, which is not the RealmBridge plugin's terraced
// ground mesh; so each actor is placed by a downward trace against the world (cached until the
// actor moves a meter). The glow uses M_PrimordiaThreadGlow from the RealmBridge plugin (unlit,
// colour from per-instance custom data, bloom does the rest); without it the engine's basic
// shape material is used.
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

	/** Wisp height in meters. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float WispHeightMeters = 1.1f;
	/** How far above the ground a wisp floats, meters. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float HoverMeters = 0.55f;
	/** Emissive gain of the glow (unlit; values above 1 bloom). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") float GlowIntensity = 2.5f;
	/** Place wisps on the world's ground by tracing (off = MCP's own height field). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") bool bSnapToGround = true;
	/** Draw at most this many actors (the population may be larger). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MCP") int32 MaxDrawn = 4096;

	virtual void Tick(float DeltaSeconds) override;
	virtual bool ShouldTickIfViewportsOnly() const override { return true; }

protected:
	virtual void BeginPlay() override;

private:
	void Refresh(const FMCPResults& Results, const UMCPComputeSubsystem& MCP);
	double GroundZ(int32 Index, const FVector& World);

	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Wisps;
	bool bGlowMaterial = false;
	int64 DrawnTick = 0;
	TArray<FVector2D> TracedAt;  // xy where each actor's ground was last traced (world units)
	TArray<double> TracedZ;
};
