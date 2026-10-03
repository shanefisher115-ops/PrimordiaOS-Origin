#pragma once

#include \"CoreMinimal.h\"
#include \"JsonObject.h\"

class FPrimordiaEventRouter {
public:
    static void RouteEvent(const FString& Type, const TSharedPtr<FJsonObject>& Payload);
};