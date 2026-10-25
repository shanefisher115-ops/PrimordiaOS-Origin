#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Subsystems/EngineSubsystem.h"
#include "CadFabricationSimulator.h"
#include "CadGCodeCompiler.h"
#include "CadToolpathGenerator.h"
#include "CadTypes.h"
#include "SpellwrightTypes.h"
#include "PrimordiaCADCAMSubsystem.generated.h"

PRIMORDIACADCAM_API DECLARE_LOG_CATEGORY_EXTERN(LogCADCAM, Log, All);

class FPrimordiaCADCAMModule : public IModuleInterface
{
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnFabricationJob, const FCadFabricationJob&, Job);

/**
 * The fabrication pipeline: part -> toolpath -> G-code -> read back -> simulate -> spool to Bolt.
 * Programs and reports are written to Saved/Primordia/CADCAM.
 */
UCLASS()
class PRIMORDIACADCAM_API UPrimordiaCADCAMSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	static UPrimordiaCADCAMSubsystem* Get();

	/** Plans, compiles and simulates a part. Never sends anything. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|CADCAM")
	FCadFabricationJob PlanJob(const FCadPart& Part, const FCadTool& Tool);

	/** Sends a simulated job to the Bolt pipeline (kind "cadcam.fabricate"). Returns the Bolt job id. */
	FString SubmitJob(FCadFabricationJob& Job, TFunction<void(bool bSucceeded, const FString& Message)> OnDone = nullptr);

	UFUNCTION(BlueprintCallable, Category = "Primordia|CADCAM", meta = (DisplayName = "Submit Fabrication Job"))
	FString SubmitJobBP(FCadFabricationJob Job) { return SubmitJob(Job); }

	/** Runs a cadcam.* spell step. A submitted fabrication is Pending until Bolt spools it. */
	FSpellwrightStepResult ExecuteStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete);

	/** Builds the part and tool a spell step describes. False with a message if an argument is bad. */
	static bool PartFromStep(const FSpellwrightStep& Step, FCadPart& OutPart, FCadTool& OutTool, FString& OutError);

	UFUNCTION(BlueprintPure, Category = "Primordia|CADCAM")
	static FCadPart MakeRectanglePocketPart(FName Name, FVector StockSize, double Width, double Height, double Depth);

	UFUNCTION(BlueprintPure, Category = "Primordia|CADCAM")
	static FCadPart MakePolygonProfilePart(FName Name, FVector StockSize, double Radius, int32 Sides, double Depth, bool bOutside = true);

	UFUNCTION(BlueprintCallable, Category = "Primordia|CADCAM")
	FCadToolpath GenerateToolpath(const FCadPart& Part, const FCadTool& Tool) const { return Generator.Generate(Part, Tool); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|CADCAM")
	FString CompileGCode(const FCadPart& Part, const FCadToolpath& Toolpath) const { return Compiler.Compile(Part, Toolpath, EstimateSeconds(Toolpath)); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|CADCAM")
	FCadSimReport SimulateGCode(const FCadStock& Stock, const FCadTool& Tool, const FString& GCode) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|CADCAM")
	TArray<FCadFabricationJob> GetRecentJobs() const { return Recent; }

	double EstimateSeconds(const FCadToolpath& Toolpath) const;

	UPROPERTY(BlueprintAssignable, Category = "Primordia|CADCAM")
	FOnFabricationJob OnJobChanged;

	FCadToolpathGenerator Generator;
	FCadGCodeCompiler Compiler;
	FCadFabricationSimulator Simulator;

private:
	void Remember(const FCadFabricationJob& Job);
	TArray<FCadFabricationJob> Recent;
};
