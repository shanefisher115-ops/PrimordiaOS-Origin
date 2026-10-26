#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PrimordiaInstanceSet.generated.h"

class UInstancedStaticMeshComponent;

/**
 * A set of identical scene pieces drawn as one instanced mesh (one draw call per material slot): the
 * Sanctum's lamps, pylons, pinnacles and balustrade (Scripts/build_realm_sanctum.py). Editor Python can't
 * add components to a plain actor, so the component is the root here.
 */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API APrimordiaInstanceSet : public AActor
{
	GENERATED_BODY()

public:
	APrimordiaInstanceSet();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS")
	TObjectPtr<UInstancedStaticMeshComponent> Instances;
};
