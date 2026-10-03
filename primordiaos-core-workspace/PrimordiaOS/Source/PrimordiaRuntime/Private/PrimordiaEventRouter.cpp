#include \"PrimordiaEventRouter.h\"
#include \"JsonObject.h\"

void FPrimordiaEventRouter::RouteEvent(const FString& Type, const TSharedPtr<FJsonObject>& Payload) {
    UE_LOG(LogTemp, Log, TEXT(\"PrimordiaOS Event: %s\"), *Type);

    // TODO: FX, camera, lighting routing
}