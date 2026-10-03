#include \"LightingDispatcher.h\"

void ULightingDispatcher::ApplyLight(const FString& LightName) {
  UE_LOG(LogTemp, Warning, TEXT(\"Lighting Style: %s\"), *LightName);
}