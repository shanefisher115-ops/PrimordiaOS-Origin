#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "PrimordiaTypes.h"
#include "PrimordiaVisualizer.generated.h"

class UPrimordiaPayload;

UINTERFACE(BlueprintType, Blueprintable, MinimalAPI)
class UPrimordiaVisualizer : public UInterface
{
	GENERATED_BODY()
};

/**
 * Lets any Blueprint actor become a PrimordiaOS visualizer without deriving
 * from APrimordiaVisualActor: add this interface, implement the two events,
 * and register the class under Project Settings > PrimordiaOS Realm Bridge >
 * Actor Class Overrides. (Native visualizers derive from APrimordiaVisualActor,
 * which the factory drives through a faster JSON-DOM path.)
 */
class PRIMORDIAOSREALMBRIDGE_API IPrimordiaVisualizer
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintImplementableEvent, BlueprintCallable, Category = "PrimordiaOS")
	void ReceivePrimordiaPacket(const FPrimordiaPacketInfo& Info, UPrimordiaPayload* Payload);

	/** Called on op:"retire" or entity timeout. The actor must destroy itself (immediately or after a fade). */
	UFUNCTION(BlueprintImplementableEvent, BlueprintCallable, Category = "PrimordiaOS")
	void RetirePrimordiaEntity();
};
