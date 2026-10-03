#pragma once

#include "CoreMinimal.h"
#include "EditorSubsystem.h"
#include "PrimordiaSceneImporterSubsystem.generated.h"

UCLASS()
class PRIMORDIASCENEIMPORTER_API UPrimordiaSceneImporterSubsystem : public UEditorSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

private:
    void CheckHolodeckOutput();
    FDelegateHandle TickHandle;

    FString HolodeckOutputDir;
    FString ImportTargetDir;
    FDateTime LastScan;
};
