#include "PrimordiaSceneImporterSubsystem.h"
#include "Misc/Paths.h"
#include "HAL/FileManager.h"
#include "Misc/FileHelper.h"
#include "Editor.h"
#include "AssetToolsModule.h"

void UPrimordiaSceneImporterSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    HolodeckOutputDir = FPaths::ConvertRelativePathToFull(
        FPaths::ProjectDir() / TEXT("../PrimordiaOS/Holodeck2/Output")
    );

    ImportTargetDir = TEXT("/Game/Primordia/Realms/");
    LastScan = FDateTime::MinValue();

    TickHandle = FTicker::GetCoreTicker().AddTicker(
        FTickerDelegate::CreateUObject(this, &UPrimordiaSceneImporterSubsystem::CheckHolodeckOutput),
        2.0f
    );

    UE_LOG(LogTemp, Log, TEXT("PrimordiaOS Scene Importer initialized."));
}

void UPrimordiaSceneImporterSubsystem::Deinitialize()
{
    FTicker::GetCoreTicker().RemoveTicker(TickHandle);
}

void UPrimordiaSceneImporterSubsystem::CheckHolodeckOutput()
{
    TArray<FString> SceneFiles;
    IFileManager::Get().FindFiles(SceneFiles, *HolodeckOutputDir, TEXT("scene"));

    for (const FString& FileName : SceneFiles)
    {
        FString FullPath = HolodeckOutputDir / FileName;
        FDateTime Timestamp = IFileManager::Get().GetTimeStamp(*FullPath);

        if (Timestamp <= LastScan)
            continue;

        LastScan = Timestamp;

        UE_LOG(LogTemp, Warning, TEXT("New Holodeck scene detected: %s"), *FileName);

        FString DestPath = FPaths::ProjectContentDir() / TEXT("Primordia/Realms/") / FileName;

        IFileManager::Get().Copy(*DestPath, *FullPath);

        UE_LOG(LogTemp, Warning, TEXT("Scene copied to: %s"), *DestPath);

        // Trigger Unreal asset import
        FAssetToolsModule& AssetToolsModule =
            FModuleManager::LoadModuleChecked<FAssetToolsModule>("AssetTools");

        TArray<FString> FilesToImport;
        FilesToImport.Add(DestPath);

        AssetToolsModule.Get().ImportAssets(FilesToImport, ImportTargetDir);

        UE_LOG(LogTemp, Warning, TEXT("Scene imported into Unreal: %s"), *ImportTargetDir);
    }
}
