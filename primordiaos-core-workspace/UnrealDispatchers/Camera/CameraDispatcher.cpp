#include \"CameraDispatcher.h\"

void UCameraDispatcher::ApplyMove(const FString& MoveName) {
  UE_LOG(LogTemp, Warning, TEXT(\"Camera Move: %s\"), *MoveName);
}