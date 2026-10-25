#pragma once

#include "CoreMinimal.h"
#include "CadTypes.generated.h"

/**
 * Units are millimetres. The stock's lower-left top corner is the work origin: X and Y run over the
 * stock, Z = 0 is the top face and cutting goes into negative Z.
 */

/** A closed simple polygon (no repeated last point). Counter-clockwise for outlines. */
USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadPolygon
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") TArray<FVector2D> Points;
};

UENUM(BlueprintType)
enum class ECadFeatureKind : uint8
{
	/** Clear all material inside the shape to Depth. */
	Pocket,
	/** Cut along the shape's outline (outside to free a part, inside to cut a hole). */
	Profile,
	/** Peck-drill each hole point to Depth. */
	Drill,
	/** Skim the whole stock top down to Depth. */
	Face,
};

USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadFeature
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") FName Name;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") ECadFeatureKind Kind = ECadFeatureKind::Pocket;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") FCadPolygon Shape;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") TArray<FVector2D> Holes;
	/** Positive depth below the top face. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double Depth = 5.0;
	/** Profile only: cut outside the outline (true) or inside it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") bool bOutside = true;
};

USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadStock
{
	GENERATED_BODY()

	/** X, Y, Z (thickness). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") FVector Size = FVector(100.0, 80.0, 20.0);
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") FString Material = TEXT("aluminium 6061");
};

/** A flat end mill and the way it is run. */
USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadTool
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") int32 Number = 1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double Diameter = 6.0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double FluteLength = 20.0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double SpindleRpm = 18000.0;
	/** mm/min */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double FeedRate = 900.0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double PlungeRate = 300.0;
	/** Depth per pass. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double StepDown = 1.5;
	/** Fraction of the diameter between raster rows. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") double StepOverRatio = 0.45;

	double Radius() const { return Diameter * 0.5; }
};

USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadPart
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") FName Name = TEXT("part");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") FCadStock Stock;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CADCAM") TArray<FCadFeature> Features;
};

UENUM(BlueprintType)
enum class ECadMoveType : uint8
{
	Rapid,
	Feed,
	Plunge,
};

USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadMove
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") ECadMoveType Type = ECadMoveType::Rapid;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FVector Position = FVector::ZeroVector;
	/** mm/min; 0 for rapids. */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double Feed = 0.0;
};

USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadToolpath
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FCadTool Tool;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") TArray<FCadMove> Moves;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double SafeZ = 5.0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double CutLength = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double RapidLength = 0.0;
	/** Features that could not be machined (e.g. pocket narrower than the tool). */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") TArray<FString> Errors;

	void ComputeLengths();
};

USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadSimReport
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") bool bOk = false;
	/** mm^3 */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double RemovedVolume = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double MachiningSeconds = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double CutLength = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double RapidLength = 0.0;
	/** Feed moves below the top face that removed nothing (cutting air). */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double AirCutLength = 0.0;
	/** Rapid moves that passed through material. */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") int32 RapidCollisions = 0;
	/** Moves that went below the bottom of the stock. */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") int32 OverCuts = 0;
	/** Moves deeper than the tool's flute length. */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") int32 FluteOverruns = 0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double MinZ = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") int32 GridX = 0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") int32 GridY = 0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") double CellSize = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") TArray<FString> Warnings;
	/** Final top-surface height per cell (row-major, GridX * GridY), when kept. */
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") TArray<float> HeightMap;
};

UENUM(BlueprintType)
enum class ECadJobStatus : uint8
{
	Planned,
	Simulated,
	Rejected,
	Submitted,
	Completed,
	Failed,
};

/** Everything about one fabrication: the part, how it is cut, the program, and its rehearsal. */
USTRUCT(BlueprintType)
struct PRIMORDIACADCAM_API FCadFabricationJob
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FGuid Id;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FCadPart Part;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FCadToolpath Toolpath;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FString GCode;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FCadSimReport Simulation;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FString GCodePath;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FString ReportPath;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FString BoltJobId;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") ECadJobStatus Status = ECadJobStatus::Planned;
	UPROPERTY(BlueprintReadOnly, Category = "CADCAM") FString Message;
};
