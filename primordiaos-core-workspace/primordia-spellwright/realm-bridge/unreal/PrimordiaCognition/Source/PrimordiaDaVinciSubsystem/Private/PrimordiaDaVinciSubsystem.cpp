#include "PrimordiaDaVinciSubsystem.h"

#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "HAL/FileManager.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "PrimordiaBoltBridgeSubsystem.h"
#include "PrimordiaLoreEngine.h"
#include "SpellwrightOps.h"

DEFINE_LOG_CATEGORY(LogDaVinci);

IMPLEMENT_MODULE(FPrimordiaDaVinciSubsystemModule, PrimordiaDaVinciSubsystem)

namespace
{
	const TSet<FString> MovieExtensions = {TEXT("mp4"), TEXT("mov"), TEXT("mxf"), TEXT("avi"), TEXT("mkv"), TEXT("m4v")};
	const TSet<FString> AudioExtensions = {TEXT("wav"), TEXT("mp3"), TEXT("aac"), TEXT("flac"), TEXT("aiff")};
	const TSet<FString> ImageExtensions = {TEXT("png"), TEXT("exr"), TEXT("jpg"), TEXT("jpeg"), TEXT("tif"), TEXT("tiff"), TEXT("dpx"), TEXT("bmp")};

	TArray<TSharedPtr<FJsonValue>> Rgb(const FVector& V)
	{
		return {MakeShared<FJsonValueNumber>(V.X), MakeShared<FJsonValueNumber>(V.Y), MakeShared<FJsonValueNumber>(V.Z)};
	}

	struct FSequence
	{
		FString Prefix;
		FString Extension;
		int32 Digits = 0;
		TArray<int32> Frames;
	};
}

bool FDaVinciGrade::IsIdentity() const
{
	return LutPath.IsEmpty() && Slope.Equals(FVector::OneVector) && Offset.IsNearlyZero() && Power.Equals(FVector::OneVector) && FMath::IsNearlyEqual(Saturation, 1.f);
}

UPrimordiaDaVinciSubsystem* UPrimordiaDaVinciSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaDaVinciSubsystem>() : nullptr;
}

TArray<FDaVinciClip> UPrimordiaDaVinciSubsystem::AssembleFromFolder(const FString& InFolder)
{
	const FString Folder = FPaths::ConvertRelativePathToFull(InFolder);
	TArray<FString> Files;
	IFileManager::Get().FindFiles(Files, *FPaths::Combine(Folder, TEXT("*")), true, false);
	Files.Sort();

	TArray<FDaVinciClip> Clips;
	TMap<FString, FSequence> Sequences;
	TArray<FString> SequenceOrder;
	for (const FString& File : Files)
	{
		const FString Ext = FPaths::GetExtension(File).ToLower();
		const FString Base = FPaths::GetBaseFilename(File);
		if (MovieExtensions.Contains(Ext) || AudioExtensions.Contains(Ext))
		{
			FDaVinciClip& Clip = Clips.AddDefaulted_GetRef();
			Clip.MediaPath = FPaths::Combine(Folder, File);
			Clip.bAudio = AudioExtensions.Contains(Ext);
			continue;
		}
		if (!ImageExtensions.Contains(Ext))
		{
			continue;
		}
		int32 DigitStart = Base.Len();
		while (DigitStart > 0 && FChar::IsDigit(Base[DigitStart - 1]))
		{
			--DigitStart;
		}
		if (DigitStart == Base.Len())
		{
			// A single still.
			FDaVinciClip& Clip = Clips.AddDefaulted_GetRef();
			Clip.MediaPath = FPaths::Combine(Folder, File);
			continue;
		}
		const FString Prefix = Base.Left(DigitStart);
		const FString Digits = Base.Mid(DigitStart);
		const FString Key = FString::Printf(TEXT("%s|%d|%s"), *Prefix, Digits.Len(), *Ext);
		FSequence* Seq = Sequences.Find(Key);
		if (!Seq)
		{
			Seq = &Sequences.Add(Key);
			Seq->Prefix = Prefix;
			Seq->Extension = Ext;
			Seq->Digits = Digits.Len();
			SequenceOrder.Add(Key);
		}
		Seq->Frames.Add(FCString::Atoi(*Digits));
	}

	for (const FString& Key : SequenceOrder)
	{
		FSequence& Seq = Sequences[Key];
		Seq.Frames.Sort();
		FDaVinciClip Clip;
		if (Seq.Frames.Num() == 1)
		{
			FString Number = FString::FromInt(Seq.Frames[0]);
			while (Number.Len() < Seq.Digits) { Number.InsertAt(0, TEXT('0')); }
			Clip.MediaPath = FPaths::Combine(Folder, FString::Printf(TEXT("%s%s.%s"), *Seq.Prefix, *Number, *Seq.Extension));
		}
		else
		{
			Clip.MediaPath = FPaths::Combine(Folder, FString::Printf(TEXT("%s%%0%dd.%s"), *Seq.Prefix, Seq.Digits, *Seq.Extension));
			Clip.SequenceStart = Seq.Frames[0];
			Clip.SequenceEnd = Seq.Frames.Last();
			if (Seq.Frames.Last() - Seq.Frames[0] + 1 != Seq.Frames.Num())
			{
				UE_LOG(LogDaVinci, Warning, TEXT("Sequence %s has gaps (%d frames between %d and %d)"), *Clip.MediaPath, Seq.Frames.Num(), Clip.SequenceStart, Clip.SequenceEnd);
			}
		}
		Clips.Add(Clip);
	}
	// Video before audio, each in name order, so the picture track is laid down first.
	Clips.StableSort([](const FDaVinciClip& A, const FDaVinciClip& B) { return A.bAudio != B.bAudio ? !A.bAudio : A.MediaPath < B.MediaPath; });
	return Clips;
}

FString UPrimordiaDaVinciSubsystem::ResolveTargetDir(const FString& Requested) const
{
	if (!Requested.IsEmpty() && Requested != TEXT("auto"))
	{
		return FPaths::ConvertRelativePathToFull(Requested);
	}
	const FString Configured = GetDefault<UPrimordiaDaVinciSettings>()->OutputDirectory;
	return FPaths::ConvertRelativePathToFull(Configured.IsEmpty() ? FLoreText::SavedDir(TEXT("DaVinci")) : Configured);
}

TSharedRef<FJsonObject> UPrimordiaDaVinciSubsystem::JobToJson(const FDaVinciJob& Job)
{
	TSharedRef<FJsonObject> J = MakeShared<FJsonObject>();
	J->SetStringField(TEXT("id"), Job.Id.ToString(EGuidFormats::DigitsWithHyphensLower));
	J->SetStringField(TEXT("project"), Job.ProjectName);
	J->SetStringField(TEXT("timeline"), Job.TimelineName);
	J->SetNumberField(TEXT("fps"), Job.FrameRate);

	TArray<TSharedPtr<FJsonValue>> Stages;
	if (Job.HasStage(EDaVinciStage::Assemble)) { Stages.Add(MakeShared<FJsonValueString>(TEXT("assemble"))); }
	if (Job.HasStage(EDaVinciStage::Grade)) { Stages.Add(MakeShared<FJsonValueString>(TEXT("grade"))); }
	if (Job.HasStage(EDaVinciStage::Render)) { Stages.Add(MakeShared<FJsonValueString>(TEXT("render"))); }
	J->SetArrayField(TEXT("stages"), Stages);

	TArray<TSharedPtr<FJsonValue>> Clips;
	for (const FDaVinciClip& C : Job.Clips)
	{
		TSharedRef<FJsonObject> O = MakeShared<FJsonObject>();
		O->SetStringField(TEXT("path"), C.MediaPath);
		if (C.SequenceStart >= 0) { O->SetNumberField(TEXT("sequenceStart"), C.SequenceStart); O->SetNumberField(TEXT("sequenceEnd"), C.SequenceEnd); }
		if (C.InFrame >= 0) { O->SetNumberField(TEXT("in"), C.InFrame); }
		if (C.OutFrame >= 0) { O->SetNumberField(TEXT("out"), C.OutFrame); }
		O->SetNumberField(TEXT("track"), C.Track);
		if (C.RecordFrame >= 0) { O->SetNumberField(TEXT("record"), C.RecordFrame); }
		O->SetBoolField(TEXT("audio"), C.bAudio);
		Clips.Add(MakeShared<FJsonValueObject>(O));
	}
	J->SetArrayField(TEXT("clips"), Clips);

	TSharedRef<FJsonObject> G = MakeShared<FJsonObject>();
	G->SetStringField(TEXT("lut"), Job.Grade.LutPath);
	G->SetBoolField(TEXT("cdl"), Job.Grade.bApplyCdl);
	G->SetArrayField(TEXT("slope"), Rgb(Job.Grade.Slope));
	G->SetArrayField(TEXT("offset"), Rgb(Job.Grade.Offset));
	G->SetArrayField(TEXT("power"), Rgb(Job.Grade.Power));
	G->SetNumberField(TEXT("saturation"), Job.Grade.Saturation);
	G->SetNumberField(TEXT("node"), Job.Grade.NodeIndex);
	J->SetObjectField(TEXT("grade"), G);

	TSharedRef<FJsonObject> R = MakeShared<FJsonObject>();
	R->SetStringField(TEXT("targetDir"), Job.Render.TargetDir);
	R->SetStringField(TEXT("name"), Job.Render.CustomName);
	R->SetStringField(TEXT("format"), Job.Render.Format);
	R->SetStringField(TEXT("codec"), Job.Render.Codec);
	R->SetStringField(TEXT("preset"), Job.Render.Preset);
	if (Job.Render.Width > 0 && Job.Render.Height > 0)
	{
		R->SetNumberField(TEXT("width"), Job.Render.Width);
		R->SetNumberField(TEXT("height"), Job.Render.Height);
	}
	J->SetObjectField(TEXT("render"), R);
	return J;
}

FString UPrimordiaDaVinciSubsystem::SubmitJob(const FDaVinciJob& InJob, FDaVinciJobCallback OnDone)
{
	UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get();
	if (!Bolt)
	{
		if (OnDone) { OnDone(false, nullptr, TEXT("Bolt bridge is not available")); }
		return FString();
	}
	FDaVinciJob Job = InJob;
	if (!Job.Id.IsValid()) { Job.Id = FGuid::NewGuid(); }
	if (Job.HasStage(EDaVinciStage::Render))
	{
		Job.Render.TargetDir = ResolveTargetDir(Job.Render.TargetDir);
		IFileManager::Get().MakeDirectory(*Job.Render.TargetDir, true);
	}
	const TCHAR* Kind = Job.HasStage(EDaVinciStage::Render) ? TEXT("davinci.render") : Job.HasStage(EDaVinciStage::Grade) ? TEXT("davinci.grade") : TEXT("davinci.assemble");

	TWeakObjectPtr<UPrimordiaDaVinciSubsystem> WeakThis(this);
	return Bolt->SubmitJob(Kind, JobToJson(Job), FGuid(), [WeakThis, Job, OnDone](const FBoltJob& Done)
	{
		const bool bOk = Done.Status == EBoltJobStatus::Succeeded;
		UE_LOG(LogDaVinci, Log, TEXT("Resolve job %s %s %s"), *Job.TimelineName, bOk ? TEXT("succeeded") : TEXT("failed:"), bOk ? TEXT("") : *Done.Error);
		if (UPrimordiaDaVinciSubsystem* Self = WeakThis.Get())
		{
			Self->OnJobFinished.Broadcast(Job, bOk, bOk ? Done.ResultJson : Done.Error);
		}
		if (OnDone) { OnDone(bOk, UPrimordiaBoltBridgeSubsystem::ParseResult(Done), Done.Error); }
	});
}

FSpellwrightStepResult UPrimordiaDaVinciSubsystem::ExecuteStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete)
{
	const UPrimordiaDaVinciSettings* Settings = GetDefault<UPrimordiaDaVinciSettings>();
	FDaVinciJob Job;
	Job.ProjectName = Step.GetArg(TEXT("project"), Settings->DefaultProject);
	Job.TimelineName = Step.GetArg(TEXT("timeline"), TEXT("Primordia"));
	const FString Op = Step.Op.ToString();

	if (Op == TEXT("davinci.assemble"))
	{
		Job.Stages = static_cast<int32>(EDaVinciStage::Assemble);
		const FString Fps = Step.GetArg(TEXT("fps"));
		if (!Fps.IsEmpty()) { Job.FrameRate = FCString::Atof(*Fps); }
		const FString Source = FPaths::ConvertRelativePathToFull(Step.GetArg(TEXT("source")));
		if (IFileManager::Get().DirectoryExists(*Source))
		{
			Job.Clips = AssembleFromFolder(Source);
		}
		else if (FPaths::FileExists(Source))
		{
			Job.Clips.AddDefaulted_GetRef().MediaPath = Source;
		}
		if (Job.Clips.Num() == 0)
		{
			return FSpellwrightStepResult::Failure(FString::Printf(TEXT("no media found at %s"), *Source));
		}
	}
	else if (Op == TEXT("davinci.grade"))
	{
		Job.Stages = static_cast<int32>(EDaVinciStage::Grade);
		Job.Grade.LutPath = Step.GetArg(TEXT("lut"));
		auto Vec = [&Step](const TCHAR* Key, FVector& Out) -> bool
		{
			const FString V = Step.GetArg(Key);
			return V.IsEmpty() || FSpellwrightOpRegistry::ParseVector(V, Out);
		};
		if (!Vec(TEXT("slope"), Job.Grade.Slope) || !Vec(TEXT("offset"), Job.Grade.Offset) || !Vec(TEXT("power"), Job.Grade.Power))
		{
			return FSpellwrightStepResult::Failure(TEXT("slope, offset and power are r,g,b"));
		}
		const FString Sat = Step.GetArg(TEXT("saturation"));
		if (!Sat.IsEmpty()) { Job.Grade.Saturation = FCString::Atof(*Sat); }
		const FString Node = Step.GetArg(TEXT("node"));
		if (!Node.IsEmpty()) { Job.Grade.NodeIndex = FMath::Max(1, FCString::Atoi(*Node)); }
	}
	else if (Op == TEXT("davinci.render"))
	{
		Job.Stages = static_cast<int32>(EDaVinciStage::Render);
		Job.Render.TargetDir = Step.GetArg(TEXT("target"), TEXT("auto"));
		Job.Render.CustomName = Step.GetArg(TEXT("name"), Job.TimelineName);
		Job.Render.Format = Step.GetArg(TEXT("format"), TEXT("mp4"));
		Job.Render.Codec = Step.GetArg(TEXT("codec"), TEXT("H264"));
		Job.Render.Preset = Step.GetArg(TEXT("preset"));
	}
	else
	{
		return FSpellwrightStepResult::Failure(FString::Printf(TEXT("the DaVinci subsystem does not run %s"), *Op));
	}

	const FString JobId = SubmitJob(Job, [OnComplete](bool bOk, TSharedPtr<FJsonObject> Result, const FString& Error)
	{
		if (!OnComplete)
		{
			return;
		}
		if (!bOk)
		{
			OnComplete(FSpellwrightStepResult::Failure(Error));
			return;
		}
		FSpellwrightStepResult Done = FSpellwrightStepResult::Success();
		if (Result.IsValid())
		{
			for (const TPair<FString, TSharedPtr<FJsonValue>>& Field : Result->Values)
			{
				FString Text;
				if (Field.Value.IsValid() && Field.Value->TryGetString(Text)) { Done.Outputs.Add(Field.Key, Text); }
				else if (Field.Value.IsValid() && Field.Value->Type == EJson::Number) { Done.Outputs.Add(Field.Key, FString::SanitizeFloat(Field.Value->AsNumber())); }
			}
		}
		Done.Message = Done.Outputs.FindRef(TEXT("output"));
		OnComplete(Done);
	});
	if (JobId.IsEmpty())
	{
		return FSpellwrightStepResult::Failure(TEXT("could not send the job to Bolt"));
	}
	return FSpellwrightStepResult::PendingJob(JobId, FString::Printf(TEXT("Resolve %s"), *Op));
}
