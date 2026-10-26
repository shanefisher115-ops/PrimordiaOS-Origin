#include "PrimordiaInstanceSet.h"
#include "Components/InstancedStaticMeshComponent.h"

APrimordiaInstanceSet::APrimordiaInstanceSet()
{
	Instances = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Instances"));
	Instances->SetMobility(EComponentMobility::Static);
	RootComponent = Instances;
}
