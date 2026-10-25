#include "PrimordiaCADCAMSubsystem.h"

#include "CadGeometry.h"
#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "HAL/FileManager.h"
#include "JsonObjectConverter.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "PrimordiaBoltBridgeSubsystem.h"
#include "PrimordiaLoreEngine.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "SpellwrightOps.h"

DEFINE_LOG_CATEGORY(LogCADCAM);

IMPLEMENT_MODULE(FPrimordiaCADCAMModule, PrimordiaCADCAM)

namespace
{
	bool ArgNumber(const FSpellwrightStep& Step, const TCHAR* Key, double Default, double& Out, FString& Error)
	{
		const FString V = Step.GetArg(Key);
		if (V.IsEmpty())
		{
			Out = Default;
			return true;
		}
		if (!FCString::IsNumeric(*V))
		{
			Error = FString::Printf(TEXT("%s=%s is not a number"), Key, *V);
			return false;
		}
		Out = FCString::Atod(*V);
		return true;
	}

	/** "x:y,x:y,..." */
	bool ParseHoles(const FString& Text, TArray<FVector2D>& Out, FString& Error)
	{
		TArray<FString> Pairs;
		Text.ParseIntoArray(Pairs, TEXT(","), true);
		for (const FString& Pair : Pairs)
		{
			FString X, Y;
			if (!Pair.Split(TEXT(":"), &X, &Y) || !FCString::IsNumeric(*X) || !FCString::IsNumeric(*Y))
			{
				Error = FString::Printf(TEXT("hole '%s' should be x:y"), *Pair);
				return false;
			}
			Out.Add(FVector2D(FCString::Atod(*X), FCString::Atod(*Y)));
		}
		return true;
	}

	FString SafeFileName(const FString& Name)
	{
		FString Out;
		for (const TCHAR C : Name)
		{
			Out.AppendChar(FChar::IsAlnum(C) || C == '-' || C == '_' ? C : TCHAR('_'));
		}
		return Out.IsEmpty() ? TEXT("part") : Out;
	}
}

UPrimordiaCADCAMSubsystem* UPrimordiaCADCAMSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaCADCAMSubsystem>() : nullptr;
}

double UPrimordiaCADCAMSubsystem::EstimateSeconds(const FCadToolpath& Toolpath) const
{
	double Seconds = 0.0;
	for (int32 i = 1; i < Toolpath.Moves.Num(); ++i)
	{
		const double L = FVector::Distance(Toolpath.Moves[i - 1].Position, Toolpath.Moves[i].Position);
		const double Rate = Toolpath.Moves[i].Type == ECadMoveType::Rapid ? Simulator.Options.RapidRate : Toolpath.Moves[i].Feed;
		Seconds += L / FMath::Max(Rate, 1.0) * 60.0;
	}
	return Seconds;
}

FCadSimReport UPrimordiaCADCAMSubsystem::SimulateGCode(const FCadStock& Stock, const FCadTool& Tool, const FString& GCode) const
{
	const FCadGCodeParseResult Parsed = FCadGCodeCompiler::Parse(GCode, Generator.Options.SafeZ);
	FCadSimReport Report = Simulator.Simulate(Stock, Tool, Parsed.Moves);
	for (const FString& E : Parsed.Errors)
	{
		Report.Warnings.Insert(TEXT("G-code: ") + E, 0);
		Report.bOk = false;
	}
	return Report;
}

FCadFabricationJob UPrimordiaCADCAMSubsystem::PlanJob(const FCadPart& Part, const FCadTool& Tool)
{
	FCadFabricationJob Job;
	Job.Id = FGuid::NewGuid();
	Job.Part = Part;
	Job.Toolpath = Generator.Generate(Part, Tool);
	if (Job.Toolpath.Errors.Num() > 0)
	{
		Job.Status = ECadJobStatus::Rejected;
		Job.Message = FString::Join(Job.Toolpath.Errors, TEXT("; "));
		Remember(Job);
		return Job;
	}

	Job.GCode = Compiler.Compile(Part, Job.Toolpath, EstimateSeconds(Job.Toolpath));
	// Simulate the program as written, not the toolpath it came from.
	Job.Simulation = SimulateGCode(Part.Stock, Tool, Job.GCode);

	const FString Dir = FLoreText::SavedDir(TEXT("CADCAM"));
	IFileManager::Get().MakeDirectory(*Dir, true);
	const FString Base = FString::Printf(TEXT("%s_%s"), *SafeFileName(Part.Name.ToString()), *FDateTime::Now().ToString(TEXT("%Y%m%d_%H%M%S")));
	Job.GCodePath = FPaths::ConvertRelativePathToFull(FPaths::Combine(Dir, Base + TEXT(".nc")));
	Job.ReportPath = FPaths::ConvertRelativePathToFull(FPaths::Combine(Dir, Base + TEXT(".json")));
	FFileHelper::SaveStringToFile(Job.GCode, *Job.GCodePath, FFileHelper::EEncodingOptions::ForceAnsi);

	FCadFabricationJob ForReport = Job;
	ForReport.GCode.Reset();
	ForReport.Toolpath.Moves.Reset(); // the program is in the .nc file
	FString ReportJson;
	FJsonObjectConverter::UStructToJsonObjectString(ForReport, ReportJson);
	FFileHelper::SaveStringToFile(ReportJson, *Job.ReportPath, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM);

	const FCadSimReport& S = Job.Simulation;
	if (S.bOk)
	{
		Job.Status = ECadJobStatus::Simulated;
		Job.Message = FString::Printf(TEXT("%s: %d moves, %.0f mm cut, %.1f cm3 removed, %.1f min"), *Part.Name.ToString(),
			Job.Toolpath.Moves.Num(), S.CutLength, S.RemovedVolume / 1000.0, S.MachiningSeconds / 60.0);
	}
	else
	{
		Job.Status = ECadJobStatus::Rejected;
		Job.Message = FString::Printf(TEXT("simulation failed: %d rapid collisions, %d over-cuts, %d flute overruns. %s"),
			S.RapidCollisions, S.OverCuts, S.FluteOverruns, S.Warnings.Num() > 0 ? *S.Warnings[0] : TEXT(""));
	}
	UE_LOG(LogCADCAM, Log, TEXT("%s (%s)"), *Job.Message, *Job.GCodePath);
	Remember(Job);
	return Job;
}

FString UPrimordiaCADCAMSubsystem::SubmitJob(FCadFabricationJob& Job, TFunction<void(bool, const FString&)> OnDone)
{
	UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get();
	if (!Bolt || Job.Status != ECadJobStatus::Simulated)
	{
		const FString Why = !Bolt ? TEXT("Bolt bridge is not available") : TEXT("only a job that passed simulation can be sent");
		if (OnDone) { OnDone(false, Why); }
		return FString();
	}

	TSharedRef<FJsonObject> Payload = MakeShared<FJsonObject>();
	Payload->SetStringField(TEXT("name"), Job.Part.Name.ToString());
	Payload->SetStringField(TEXT("gcode"), Job.GCode);
	Payload->SetStringField(TEXT("gcodeFile"), FPaths::GetCleanFilename(Job.GCodePath));
	Payload->SetStringField(TEXT("gcodePath"), Job.GCodePath);
	TSharedRef<FJsonObject> StockObj = MakeShared<FJsonObject>();
	FJsonObjectConverter::UStructToJsonObject(FCadStock::StaticStruct(), &Job.Part.Stock, StockObj, 0, 0);
	Payload->SetObjectField(TEXT("stock"), StockObj);
	TSharedRef<FJsonObject> ToolObj = MakeShared<FJsonObject>();
	FJsonObjectConverter::UStructToJsonObject(FCadTool::StaticStruct(), &Job.Toolpath.Tool, ToolObj, 0, 0);
	Payload->SetObjectField(TEXT("tool"), ToolObj);
	TSharedRef<FJsonObject> SimObj = MakeShared<FJsonObject>();
	SimObj->SetBoolField(TEXT("ok"), Job.Simulation.bOk);
	SimObj->SetNumberField(TEXT("removedVolume"), Job.Simulation.RemovedVolume);
	SimObj->SetNumberField(TEXT("machiningSeconds"), Job.Simulation.MachiningSeconds);
	SimObj->SetNumberField(TEXT("cutLength"), Job.Simulation.CutLength);
	Payload->SetObjectField(TEXT("simulation"), SimObj);

	const FGuid JobGuid = Job.Id;
	TWeakObjectPtr<UPrimordiaCADCAMSubsystem> WeakThis(this);
	Job.BoltJobId = Bolt->SubmitJob(TEXT("cadcam.fabricate"), Payload, FGuid(), [WeakThis, JobGuid, OnDone](const FBoltJob& Done)
	{
		const bool bOk = Done.Status == EBoltJobStatus::Succeeded;
		if (UPrimordiaCADCAMSubsystem* Self = WeakThis.Get())
		{
			if (FCadFabricationJob* Mine = Self->Recent.FindByPredicate([&](const FCadFabricationJob& J) { return J.Id == JobGuid; }))
			{
				Mine->Status = bOk ? ECadJobStatus::Completed : ECadJobStatus::Failed;
				Mine->Message = bOk ? TEXT("spooled by Bolt") : Done.Error;
				Self->OnJobChanged.Broadcast(*Mine);
			}
		}
		if (OnDone) { OnDone(bOk, bOk ? Done.ResultJson : Done.Error); }
	});
	Job.Status = ECadJobStatus::Submitted;
	Remember(Job);
	return Job.BoltJobId;
}

void UPrimordiaCADCAMSubsystem::Remember(const FCadFabricationJob& Job)
{
	if (FCadFabricationJob* Existing = Recent.FindByPredicate([&](const FCadFabricationJob& J) { return J.Id == Job.Id; }))
	{
		*Existing = Job;
	}
	else
	{
		Recent.Add(Job);
		if (Recent.Num() > 32)
		{
			Recent.RemoveAt(0);
		}
	}
	OnJobChanged.Broadcast(Job);
}

FCadPart UPrimordiaCADCAMSubsystem::MakeRectanglePocketPart(FName Name, FVector StockSize, double Width, double Height, double Depth)
{
	FCadPart Part;
	Part.Name = Name;
	Part.Stock.Size = StockSize;
	FCadFeature& F = Part.Features.AddDefaulted_GetRef();
	F.Name = TEXT("pocket");
	F.Kind = ECadFeatureKind::Pocket;
	F.Shape = FCadGeometry::Rectangle(FVector2D(StockSize.X * 0.5, StockSize.Y * 0.5), Width, Height);
	F.Depth = Depth;
	return Part;
}

FCadPart UPrimordiaCADCAMSubsystem::MakePolygonProfilePart(FName Name, FVector StockSize, double Radius, int32 Sides, double Depth, bool bOutside)
{
	FCadPart Part;
	Part.Name = Name;
	Part.Stock.Size = StockSize;
	FCadFeature& F = Part.Features.AddDefaulted_GetRef();
	F.Name = TEXT("profile");
	F.Kind = ECadFeatureKind::Profile;
	F.Shape = FCadGeometry::RegularPolygon(FVector2D(StockSize.X * 0.5, StockSize.Y * 0.5), Radius, Sides, UE_DOUBLE_PI / FMath::Max(3, Sides));
	F.Depth = Depth;
	F.bOutside = bOutside;
	return Part;
}

bool UPrimordiaCADCAMSubsystem::PartFromStep(const FSpellwrightStep& Step, FCadPart& Part, FCadTool& Tool, FString& Error)
{
	Part = FCadPart();
	Part.Name = FName(*(Step.Target.IsEmpty() ? FString(TEXT("part")) : Step.Target));
	FVector Stock(100.0, 80.0, 20.0);
	const FString StockText = Step.GetArg(TEXT("stock"));
	if (!StockText.IsEmpty() && !FSpellwrightOpRegistry::ParseSize(StockText, Stock))
	{
		Error = FString::Printf(TEXT("stock=%s should be AxBxC"), *StockText);
		return false;
	}
	if (Stock.Z <= 0.0)
	{
		Stock.Z = 20.0;
	}
	Part.Stock.Size = Stock;
	Part.Stock.Material = Step.GetArg(TEXT("material"), Part.Stock.Material);

	double Width, Height, Radius, Sides, Depth, Diameter, Rpm, Feed, Plunge, StepDown, StepOver;
	if (!ArgNumber(Step, TEXT("width"), 60.0, Width, Error) || !ArgNumber(Step, TEXT("height"), 40.0, Height, Error) ||
		!ArgNumber(Step, TEXT("radius"), 20.0, Radius, Error) || !ArgNumber(Step, TEXT("sides"), 6.0, Sides, Error) ||
		!ArgNumber(Step, TEXT("depth"), 5.0, Depth, Error) || !ArgNumber(Step, TEXT("tool"), 6.0, Diameter, Error) ||
		!ArgNumber(Step, TEXT("rpm"), 18000.0, Rpm, Error) || !ArgNumber(Step, TEXT("feed"), 900.0, Feed, Error) ||
		!ArgNumber(Step, TEXT("plunge"), 300.0, Plunge, Error) || !ArgNumber(Step, TEXT("stepdown"), FMath::Max(0.25, Diameter * 0.25), StepDown, Error) ||
		!ArgNumber(Step, TEXT("stepover"), 0.45, StepOver, Error))
	{
		return false;
	}
	Tool.Diameter = Diameter;
	Tool.SpindleRpm = Rpm;
	Tool.FeedRate = Feed;
	Tool.PlungeRate = Plunge;
	Tool.StepDown = StepDown;
	Tool.StepOverRatio = StepOver;
	Tool.FluteLength = FMath::Max(Tool.FluteLength, Stock.Z + 1.0);

	const FVector2D Center(Stock.X * 0.5, Stock.Y * 0.5);
	const FString Shape = Step.GetArg(TEXT("shape"), TEXT("rect")).ToLower();
	FCadFeature& F = Part.Features.AddDefaulted_GetRef();
	F.Name = Part.Name;
	F.Depth = FMath::Abs(Depth);
	if (Shape == TEXT("rect"))
	{
		F.Shape = FCadGeometry::Rectangle(Center, Width, Height);
	}
	else if (Shape == TEXT("polygon"))
	{
		const int32 N = FMath::Max(3, FMath::RoundToInt(Sides));
		F.Shape = FCadGeometry::RegularPolygon(Center, Radius, N, UE_DOUBLE_PI / N);
	}
	else if (Shape == TEXT("circle"))
	{
		F.Shape = FCadGeometry::Circle(Center, Radius);
	}
	else
	{
		Error = FString::Printf(TEXT("unknown shape '%s'"), *Shape);
		return false;
	}

	const FString Feature = Step.GetArg(TEXT("feature"), TEXT("pocket")).ToLower();
	if (Feature == TEXT("pocket")) { F.Kind = ECadFeatureKind::Pocket; }
	else if (Feature == TEXT("profile"))
	{
		F.Kind = ECadFeatureKind::Profile;
		bool bOutside = true;
		const FString OutsideText = Step.GetArg(TEXT("outside"));
		if (!OutsideText.IsEmpty() && !FSpellwrightOpRegistry::ParseBool(OutsideText, bOutside))
		{
			Error = TEXT("outside should be true or false");
			return false;
		}
		F.bOutside = bOutside;
	}
	else if (Feature == TEXT("drill"))
	{
		F.Kind = ECadFeatureKind::Drill;
		const FString Holes = Step.GetArg(TEXT("holes"));
		if (!Holes.IsEmpty())
		{
			if (!ParseHoles(Holes, F.Holes, Error)) { return false; }
		}
		else
		{
			F.Holes = F.Shape.Points; // a bolt circle on the shape's corners
		}
	}
	else if (Feature == TEXT("face")) { F.Kind = ECadFeatureKind::Face; }
	else
	{
		Error = FString::Printf(TEXT("unknown feature '%s'"), *Feature);
		return false;
	}

	const FBox2D B = FCadGeometry::Bounds(F.Shape);
	if (F.Kind != ECadFeatureKind::Face && F.Kind != ECadFeatureKind::Profile &&
		(B.Min.X < -1e-6 || B.Min.Y < -1e-6 || B.Max.X > Stock.X + 1e-6 || B.Max.Y > Stock.Y + 1e-6))
	{
		Error = FString::Printf(TEXT("the %s (%.1f x %.1f) does not fit the %.1f x %.1f stock"), *Shape, B.GetSize().X, B.GetSize().Y, Stock.X, Stock.Y);
		return false;
	}
	return true;
}

FSpellwrightStepResult UPrimordiaCADCAMSubsystem::ExecuteStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete)
{
	FCadPart Part;
	FCadTool Tool;
	FString Error;
	if (!PartFromStep(Step, Part, Tool, Error))
	{
		return FSpellwrightStepResult::Failure(Error);
	}
	// The program dialect follows the machine's controller.
	const FCadGCodeOptions Saved = Compiler.Options;
	Compiler.Options.Dialect = Step.GetArg(TEXT("dialect")).Equals(TEXT("grbl"), ESearchCase::IgnoreCase) ? ECadGCodeDialect::Grbl : ECadGCodeDialect::LinuxCNC;
	FCadFabricationJob Job = PlanJob(Part, Tool);
	Compiler.Options = Saved;
	if (Job.Status != ECadJobStatus::Simulated)
	{
		return FSpellwrightStepResult::Failure(Job.Message);
	}

	FSpellwrightStepResult Result = FSpellwrightStepResult::Success(Job.Message);
	Result.Outputs.Add(TEXT("gcode_path"), Job.GCodePath);
	Result.Outputs.Add(TEXT("report_path"), Job.ReportPath);
	Result.Outputs.Add(TEXT("machining_seconds"), FString::SanitizeFloat(Job.Simulation.MachiningSeconds));
	Result.Outputs.Add(TEXT("removed_mm3"), FString::SanitizeFloat(Job.Simulation.RemovedVolume));
	Result.Outputs.Add(TEXT("cut_length"), FString::SanitizeFloat(Job.Simulation.CutLength));

	bool bSubmit = Step.Op == TEXT("cadcam.fabricate");
	if (bSubmit && !Step.GetArg(TEXT("submit")).IsEmpty())
	{
		FSpellwrightOpRegistry::ParseBool(Step.GetArg(TEXT("submit")), bSubmit);
	}
	if (bSubmit)
	{
		const TMap<FString, FString> Planned = Result.Outputs;
		const FString JobId = SubmitJob(Job, [Planned, OnComplete](bool bOk, const FString& Message)
		{
			if (!OnComplete)
			{
				return;
			}
			if (!bOk)
			{
				OnComplete(FSpellwrightStepResult::Failure(Message));
				return;
			}
			FSpellwrightStepResult Done = FSpellwrightStepResult::Success(TEXT("spooled"));
			Done.Outputs = Planned;
			// The Bolt worker reports where it spooled the program.
			TSharedPtr<FJsonObject> Reply;
			if (FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Message), Reply) && Reply.IsValid())
			{
				for (const TPair<FString, TSharedPtr<FJsonValue>>& Field : Reply->Values)
				{
					FString Text;
					if (Field.Value.IsValid() && Field.Value->TryGetString(Text))
					{
						Done.Outputs.Add(Field.Key, Text);
					}
				}
			}
			OnComplete(Done);
		});
		if (JobId.IsEmpty())
		{
			return FSpellwrightStepResult::Failure(TEXT("could not send the job to Bolt"));
		}
		Result.Outcome = ESpellwrightStepOutcome::Pending;
		Result.JobId = JobId;
	}
	return Result;
}
