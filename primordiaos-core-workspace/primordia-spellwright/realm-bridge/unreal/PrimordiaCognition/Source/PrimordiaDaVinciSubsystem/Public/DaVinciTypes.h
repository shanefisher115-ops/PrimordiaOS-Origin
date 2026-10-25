#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "DaVinciTypes.generated.h"

/** One piece of media on the timeline. Image sequences use a printf pattern: frame_%04d.png. */
USTRUCT(BlueprintType)
struct PRIMORDIADAVINCISUBSYSTEM_API FDaVinciClip
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString MediaPath;
	/** Image sequences: first and last frame numbers on disk. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 SequenceStart = -1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 SequenceEnd = -1;
	/** Source in/out frames (-1 = whole clip). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 InFrame = -1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 OutFrame = -1;
	/** 1-based video track. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 Track = 1;
	/** Timeline frame to place it at (-1 = append). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 RecordFrame = -1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") bool bAudio = false;
};

/** ASC CDL plus an optional LUT, applied to one node of every clip. */
USTRUCT(BlueprintType)
struct PRIMORDIADAVINCISUBSYSTEM_API FDaVinciGrade
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString LutPath;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") bool bApplyCdl = true;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FVector Slope = FVector::OneVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FVector Offset = FVector::ZeroVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FVector Power = FVector::OneVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") float Saturation = 1.f;
	/** 1-based node index (Resolve 16.2+). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 NodeIndex = 1;

	bool IsIdentity() const;
};

USTRUCT(BlueprintType)
struct PRIMORDIADAVINCISUBSYSTEM_API FDaVinciRender
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString TargetDir;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString CustomName = TEXT("primordia");
	/** Resolve format and codec names, e.g. mp4 + H264, mov + ProRes422HQ. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString Format = TEXT("mp4");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString Codec = TEXT("H264");
	/** A render preset to load first (optional). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString Preset;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 Width = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") int32 Height = 0;
};

UENUM(BlueprintType, meta = (Bitflags, UseEnumValuesAsMaskValuesInEditor = "true"))
enum class EDaVinciStage : uint8
{
	None = 0 UMETA(Hidden),
	Assemble = 1 << 0,
	Grade = 1 << 1,
	Render = 1 << 2,
};
ENUM_CLASS_FLAGS(EDaVinciStage);

USTRUCT(BlueprintType)
struct PRIMORDIADAVINCISUBSYSTEM_API FDaVinciJob
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "DaVinci") FGuid Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci", meta = (Bitmask, BitmaskEnum = "/Script/PrimordiaDaVinciSubsystem.EDaVinciStage"))
	int32 Stages = static_cast<int32>(EDaVinciStage::Assemble | EDaVinciStage::Grade | EDaVinciStage::Render);
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString ProjectName = TEXT("Primordia");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FString TimelineName = TEXT("Primordia");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") float FrameRate = 30.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") TArray<FDaVinciClip> Clips;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FDaVinciGrade Grade;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DaVinci") FDaVinciRender Render;

	bool HasStage(EDaVinciStage Stage) const { return (Stages & static_cast<int32>(Stage)) != 0; }
};

UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "PrimordiaOS DaVinci Resolve"))
class PRIMORDIADAVINCISUBSYSTEM_API UPrimordiaDaVinciSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	/** Where "auto" render targets go. Empty = <Project>/Saved/Primordia/DaVinci. */
	UPROPERTY(Config, EditAnywhere, Category = "DaVinci") FString OutputDirectory;
	UPROPERTY(Config, EditAnywhere, Category = "DaVinci") FString DefaultProject = TEXT("Primordia");
};
