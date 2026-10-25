#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "GameFramework/GameModeBase.h"
#include "PrimordiaExplorer.generated.h"

class UCameraComponent;

/**
 * First-person explorer for walking a live realm (RealmBench uses it through
 * APrimordiaExplorerGameMode). Controls are read straight from the keyboard and mouse, so it needs
 * no input assets or project input mappings:
 *   WASD move · mouse look · Space jump · Shift sprint · F fly on/off (Space up, C down in flight)
 * Falling off the floating realm puts you back where you started.
 */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API APrimordiaExplorer : public ACharacter
{
	GENERATED_BODY()

public:
	APrimordiaExplorer();

	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Explorer") float WalkSpeed = 700.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Explorer") float SprintMultiplier = 3.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Explorer") float FlySpeed = 2500.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Explorer") float MouseSensitivity = 0.6f;
	/** Below the start by this much (cm) counts as fallen off the realm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Explorer") float FallLimit = 8000.f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Explorer") TObjectPtr<UCameraComponent> Eyes;

protected:
	virtual void BeginPlay() override;

private:
	void SetFlying(bool bFly);
	FTransform Start;
	bool bFlying = false;
};

/** Spawns the explorer: set as a level's GameMode Override (RealmBench) or the project default. */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API APrimordiaExplorerGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	APrimordiaExplorerGameMode();
};
