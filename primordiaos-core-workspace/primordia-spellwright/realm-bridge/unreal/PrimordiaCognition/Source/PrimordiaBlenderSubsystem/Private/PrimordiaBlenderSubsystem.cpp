#include "PrimordiaBlenderSubsystem.h"

#include "BlenderRpcClient.h"
#include "Components/StaticMeshComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "HAL/FileManager.h"
#include "HttpModule.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "PrimordiaBoltBridgeSubsystem.h"
#include "PrimordiaLoreEngine.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "SpellwrightOps.h"
#include "StaticMeshResources.h"

#if WITH_EDITORONLY_DATA
#include "MeshDescription.h"
#include "StaticMeshAttributes.h"
#endif

#if WITH_EDITOR
#include "AssetImportTask.h"
#include "AssetToolsModule.h"
#include "IAssetTools.h"
#endif

DEFINE_LOG_CATEGORY(LogPrimordiaBlender);

IMPLEMENT_MODULE(FPrimordiaBlenderSubsystemModule, PrimordiaBlenderSubsystem)

namespace
{
	TArray<TSharedPtr<FJsonValue>> VectorJson(const FVector& V)
	{
		return {MakeShared<FJsonValueNumber>(V.X), MakeShared<FJsonValueNumber>(V.Y), MakeShared<FJsonValueNumber>(V.Z)};
	}

	FString TaskName(EBlenderTask Task)
	{
		switch (Task)
		{
		case EBlenderTask::Render: return TEXT("render");
		case EBlenderTask::Animate: return TEXT("animate");
		case EBlenderTask::Import: return TEXT("import");
		case EBlenderTask::Export: return TEXT("export");
		case EBlenderTask::Mesh: return TEXT("mesh");
		case EBlenderTask::Info: return TEXT("info");
		}
		return TEXT("info");
	}

	/** Unreal (cm, left-handed, Z up) -> Blender (m, right-handed, Z up). */
	FVector ToBlender(const FVector& P)
	{
		return FVector(P.X, -P.Y, P.Z) * 0.01;
	}

	void CopyStringFields(const TSharedPtr<FJsonObject>& From, TMap<FString, FString>& To)
	{
		if (!From.IsValid())
		{
			return;
		}
		for (const TPair<FString, TSharedPtr<FJsonValue>>& Field : From->Values)
		{
			FString Text;
			if (Field.Value.IsValid() && Field.Value->TryGetString(Text))
			{
				To.Add(Field.Key, Text);
			}
		}
	}
}

void UPrimordiaBlenderSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	FModuleManager::LoadModuleChecked<FHttpModule>(TEXT("HTTP"));
	Rpc = MakeShared<FBlenderRpcClient>();
	const UPrimordiaBlenderSettings* S = GetDefault<UPrimordiaBlenderSettings>();
	Rpc->Url = S->RpcUrl;
	Rpc->TimeoutSeconds = S->RpcTimeoutSeconds;
	Rpc->PollSeconds = S->TaskPollSeconds;
}

void UPrimordiaBlenderSubsystem::Deinitialize()
{
	if (Rpc.IsValid())
	{
		Rpc->CancelAll();
		Rpc.Reset();
	}
	Super::Deinitialize();
}

UPrimordiaBlenderSubsystem* UPrimordiaBlenderSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaBlenderSubsystem>() : nullptr;
}

FString UPrimordiaBlenderSubsystem::ResolveOutput(const FBlenderJob& Job) const
{
	if (!Job.OutputPath.IsEmpty() && Job.OutputPath != TEXT("auto"))
	{
		return FPaths::ConvertRelativePathToFull(Job.OutputPath);
	}
	const FString Configured = GetDefault<UPrimordiaBlenderSettings>()->OutputDirectory;
	const FString Dir = FPaths::ConvertRelativePathToFull(Configured.IsEmpty() ? FLoreText::SavedDir(TEXT("Blender")) : Configured);
	const FString Name = Job.Object.IsEmpty() ? (Job.Mesh.Name.IsEmpty() ? TaskName(Job.Task) : Job.Mesh.Name) : Job.Object;
	const FString Stamp = FDateTime::Now().ToString(TEXT("%Y%m%d_%H%M%S"));
	FString Safe;
	for (const TCHAR C : Name) { Safe.AppendChar(FChar::IsAlnum(C) || C == '_' || C == '-' ? C : TCHAR('_')); }
	switch (Job.Task)
	{
	case EBlenderTask::Render:
		return Job.bAnimation ? FPaths::Combine(Dir, FString::Printf(TEXT("%s_%s"), *Safe, *Stamp)) + TEXT("/")
			: FPaths::Combine(Dir, FString::Printf(TEXT("%s_%s.png"), *Safe, *Stamp));
	case EBlenderTask::Export:
		return FPaths::Combine(Dir, FString::Printf(TEXT("%s_%s.%s"), *Safe, *Stamp, *Job.Format.ToLower()));
	default:
		return FString();
	}
}

void UPrimordiaBlenderSubsystem::JobToRpc(const FBlenderJob& Job, FString& OutMethod, TSharedRef<FJsonObject>& P)
{
	P->SetStringField(TEXT("scene"), Job.Scene.IsEmpty() ? TEXT("current") : Job.Scene);
	if (!Job.SavePath.IsEmpty()) { P->SetStringField(TEXT("save"), FPaths::ConvertRelativePathToFull(Job.SavePath)); }
	switch (Job.Task)
	{
	case EBlenderTask::Render:
	{
		OutMethod = TEXT("render");
		P->SetStringField(TEXT("output"), Job.OutputPath);
		P->SetBoolField(TEXT("animation"), Job.bAnimation);
		P->SetNumberField(TEXT("frame_start"), Job.FrameStart);
		P->SetNumberField(TEXT("frame_end"), FMath::Max(Job.FrameStart, Job.FrameEnd));
		P->SetStringField(TEXT("engine"), Job.Engine);
		P->SetArrayField(TEXT("resolution"), {MakeShared<FJsonValueNumber>(Job.Resolution.X), MakeShared<FJsonValueNumber>(Job.Resolution.Y)});
		P->SetNumberField(TEXT("samples"), Job.Samples);
		break;
	}
	case EBlenderTask::Animate:
	{
		OutMethod = TEXT("animate");
		P->SetStringField(TEXT("object"), Job.Object);
		P->SetBoolField(TEXT("turntable"), Job.bTurntable);
		P->SetNumberField(TEXT("frame_start"), Job.FrameStart);
		P->SetNumberField(TEXT("frame_end"), FMath::Max(Job.FrameStart, Job.FrameEnd));
		P->SetNumberField(TEXT("fps"), Job.Fps);
		TArray<TSharedPtr<FJsonValue>> Keys;
		for (const FBlenderKeyframe& K : Job.Keyframes)
		{
			TSharedRef<FJsonObject> KO = MakeShared<FJsonObject>();
			KO->SetNumberField(TEXT("frame"), K.Frame);
			if (K.bLocation) { KO->SetArrayField(TEXT("location"), VectorJson(K.Location)); }
			if (K.bRotation) { KO->SetArrayField(TEXT("rotation"), VectorJson(K.RotationDegrees)); }
			if (K.bScale) { KO->SetArrayField(TEXT("scale"), VectorJson(K.Scale)); }
			Keys.Add(MakeShared<FJsonValueObject>(KO));
		}
		P->SetArrayField(TEXT("keyframes"), Keys);
		break;
	}
	case EBlenderTask::Import:
		OutMethod = TEXT("import");
		P->SetStringField(TEXT("path"), FPaths::ConvertRelativePathToFull(Job.InputPath));
		P->SetStringField(TEXT("format"), Job.Format);
		break;
	case EBlenderTask::Export:
	{
		OutMethod = TEXT("export");
		P->SetStringField(TEXT("path"), Job.OutputPath);
		P->SetStringField(TEXT("format"), Job.Format);
		TArray<TSharedPtr<FJsonValue>> Names;
		for (const FString& O : Job.Objects) { Names.Add(MakeShared<FJsonValueString>(O)); }
		P->SetArrayField(TEXT("objects"), Names);
		break;
	}
	case EBlenderTask::Mesh:
	{
		OutMethod = TEXT("mesh.create");
		P->SetStringField(TEXT("name"), Job.Mesh.Name);
		TArray<TSharedPtr<FJsonValue>> Verts, UVs, Tris;
		Verts.Reserve(Job.Mesh.Vertices.Num() * 3);
		for (const FVector& V : Job.Mesh.Vertices)
		{
			Verts.Add(MakeShared<FJsonValueNumber>(V.X));
			Verts.Add(MakeShared<FJsonValueNumber>(V.Y));
			Verts.Add(MakeShared<FJsonValueNumber>(V.Z));
		}
		for (const FVector2D& UV : Job.Mesh.UVs)
		{
			UVs.Add(MakeShared<FJsonValueNumber>(UV.X));
			UVs.Add(MakeShared<FJsonValueNumber>(UV.Y));
		}
		Tris.Reserve(Job.Mesh.Triangles.Num());
		for (const int32 I : Job.Mesh.Triangles) { Tris.Add(MakeShared<FJsonValueNumber>(I)); }
		// Flat arrays: three numbers per vertex, two per UV, three indices per triangle.
		P->SetArrayField(TEXT("vertices"), Verts);
		P->SetArrayField(TEXT("uvs"), UVs);
		P->SetArrayField(TEXT("triangles"), Tris);
		break;
	}
	case EBlenderTask::Info:
		OutMethod = TEXT("scene.info");
		break;
	}
}

FString UPrimordiaBlenderSubsystem::RunJob(const FBlenderJob& InJob, FBlenderJobCallback OnDone)
{
	FBlenderJob Job = InJob;
	if (!Job.Id.IsValid())
	{
		Job.Id = FGuid::NewGuid();
	}
	if (Job.Task == EBlenderTask::Render || Job.Task == EBlenderTask::Export)
	{
		Job.OutputPath = ResolveOutput(Job);
		IFileManager::Get().MakeDirectory(*(Job.bAnimation && Job.Task == EBlenderTask::Render ? Job.OutputPath : FPaths::GetPath(Job.OutputPath)), true);
	}

	FString Method;
	TSharedRef<FJsonObject> Params = MakeShared<FJsonObject>();
	JobToRpc(Job, Method, Params);

	TWeakObjectPtr<UPrimordiaBlenderSubsystem> WeakThis(this);
	auto Finish = [WeakThis, Job, OnDone](const FString& TrackingId, bool bOk, TSharedPtr<FJsonObject> Result, const FString& Error)
	{
		FString ResultJson;
		if (Result.IsValid())
		{
			FJsonSerializer::Serialize(Result.ToSharedRef(), TJsonWriterFactory<>::Create(&ResultJson));
		}
		if (UPrimordiaBlenderSubsystem* Self = WeakThis.Get())
		{
			UE_LOG(LogPrimordiaBlender, Log, TEXT("Blender %s %s%s"), *TaskName(Job.Task), bOk ? TEXT("done") : TEXT("failed"), bOk ? TEXT("") : *FString::Printf(TEXT(": %s"), *Error));
			Self->OnJobFinished.Broadcast(TrackingId, Job, bOk, bOk ? ResultJson : Error);
#if WITH_EDITOR
			FString Written;
			if (bOk && Job.Task == EBlenderTask::Export && Job.bImportResult && Result.IsValid() && Result->TryGetStringField(TEXT("path"), Written))
			{
				const TArray<FString> Assets = Self->ImportIntoProject(Written);
				Result->SetStringField(TEXT("imported"), FString::Join(Assets, TEXT(",")));
			}
#endif
		}
		if (OnDone) { OnDone(bOk, Result, Error); }
	};

	UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get();
	if (GetDefault<UPrimordiaBlenderSettings>()->bUseBoltPipeline && Bolt)
	{
		TSharedRef<FJsonObject> Payload = MakeShared<FJsonObject>();
		Payload->SetStringField(TEXT("method"), Method);
		Payload->SetObjectField(TEXT("params"), Params);
		const FName Kind(*FString::Printf(TEXT("blender.%s"), *TaskName(Job.Task)));
		TSharedPtr<FString> Tracking = MakeShared<FString>();
		*Tracking = Bolt->SubmitJob(Kind, Payload, FGuid(), [Finish, Tracking](const FBoltJob& Done)
		{
			Finish(*Tracking, Done.Status == EBoltJobStatus::Succeeded, UPrimordiaBoltBridgeSubsystem::ParseResult(Done), Done.Error);
		});
		return *Tracking;
	}

	if (!Rpc.IsValid())
	{
		Finish(FString(), false, nullptr, TEXT("Blender subsystem is shutting down"));
		return FString();
	}
	const FString Tracking = FString::Printf(TEXT("rpc-%s"), *Job.Id.ToString(EGuidFormats::Digits).ToLower());
	auto RpcDone = [Finish, Tracking](bool bOk, TSharedPtr<FJsonObject> Result, const FString& Error) { Finish(Tracking, bOk, Result, Error); };
	const bool bLong = Job.Task == EBlenderTask::Render || Job.Task == EBlenderTask::Animate || Job.Task == EBlenderTask::Import || Job.Task == EBlenderTask::Export;
	if (bLong)
	{
		Rpc->CallTask(Method, Params, RpcDone);
	}
	else
	{
		Rpc->Call(Method, Params, RpcDone);
	}
	return Tracking;
}

void UPrimordiaBlenderSubsystem::Ping(TFunction<void(bool, const FString&)> Callback)
{
	if (!Rpc.IsValid())
	{
		if (Callback) { Callback(false, TEXT("not initialized")); }
		return;
	}
	Rpc->Call(TEXT("ping"), MakeShared<FJsonObject>(), [Callback](bool bOk, TSharedPtr<FJsonObject> Result, const FString& Error)
	{
		FString Version;
		if (Result.IsValid()) { Result->TryGetStringField(TEXT("blender"), Version); }
		if (Callback) { Callback(bOk, bOk ? Version : Error); }
	});
}

bool UPrimordiaBlenderSubsystem::CollectMesh(const TArray<AActor*>& Actors, const FString& Name, FBlenderMeshData& Out, FString& OutError)
{
	Out = FBlenderMeshData();
	Out.Name = Name;
	for (AActor* Actor : Actors)
	{
		if (!Actor)
		{
			continue;
		}
		TArray<UStaticMeshComponent*> Components;
		Actor->GetComponents<UStaticMeshComponent>(Components);
		for (UStaticMeshComponent* C : Components)
		{
			UStaticMesh* Mesh = C ? C->GetStaticMesh() : nullptr;
			if (!Mesh)
			{
				continue;
			}
			const FTransform Xf = C->GetComponentTransform();
			const bool bMirrored = Xf.GetDeterminant() < 0.f;
			const int32 Base = Out.Vertices.Num();
			bool bRead = false;

#if WITH_EDITORONLY_DATA
			if (const FMeshDescription* MD = Mesh->GetMeshDescription(0))
			{
				FStaticMeshConstAttributes Attr(*MD);
				const TVertexAttributesConstRef<FVector3f> Positions = Attr.GetVertexPositions();
				const TVertexInstanceAttributesConstRef<FVector2f> UVs = Attr.GetVertexInstanceUVs();
				TMap<FVertexInstanceID, int32> Remap;
				for (const FTriangleID T : MD->Triangles().GetElementIDs())
				{
					const TArrayView<const FVertexInstanceID> Corners = MD->GetTriangleVertexInstances(T);
					int32 Idx[3];
					for (int32 k = 0; k < 3; ++k)
					{
						if (const int32* Found = Remap.Find(Corners[k]))
						{
							Idx[k] = *Found;
							continue;
						}
						const FVector P(Positions[MD->GetVertexInstanceVertex(Corners[k])]);
						Out.Vertices.Add(ToBlender(Xf.TransformPosition(P)));
						const FVector2f UV = UVs.GetNumChannels() > 0 ? UVs.Get(Corners[k], 0) : FVector2f::ZeroVector;
						Out.UVs.Add(FVector2D(UV.X, 1.0 - UV.Y));
						Idx[k] = Out.Vertices.Num() - 1;
						Remap.Add(Corners[k], Idx[k]);
					}
					// Mirroring Y flips handedness, so the winding flips too (and again for mirrored transforms).
					if (bMirrored) { Out.Triangles.Append({Idx[0], Idx[1], Idx[2]}); }
					else { Out.Triangles.Append({Idx[0], Idx[2], Idx[1]}); }
				}
				bRead = true;
			}
#endif
			if (!bRead)
			{
#if !WITH_EDITOR
				if (!Mesh->bAllowCPUAccess)
				{
					OutError = FString::Printf(TEXT("%s needs 'Allow CPU Access' to be read in a packaged game"), *Mesh->GetName());
					return false;
				}
#endif
				const FStaticMeshRenderData* RD = Mesh->GetRenderData();
				if (!RD || RD->LODResources.Num() == 0)
				{
					OutError = FString::Printf(TEXT("%s has no render data"), *Mesh->GetName());
					return false;
				}
				const FStaticMeshLODResources& LOD = RD->LODResources[0];
				const FPositionVertexBuffer& PVB = LOD.VertexBuffers.PositionVertexBuffer;
				const FStaticMeshVertexBuffer& SVB = LOD.VertexBuffers.StaticMeshVertexBuffer;
				for (uint32 v = 0; v < PVB.GetNumVertices(); ++v)
				{
					Out.Vertices.Add(ToBlender(Xf.TransformPosition(FVector(PVB.VertexPosition(v)))));
					const FVector2f UV = SVB.GetNumTexCoords() > 0 ? SVB.GetVertexUV(v, 0) : FVector2f::ZeroVector;
					Out.UVs.Add(FVector2D(UV.X, 1.0 - UV.Y));
				}
				TArray<uint32> Indices;
				LOD.IndexBuffer.GetCopy(Indices);
				for (int32 i = 0; i + 2 < Indices.Num(); i += 3)
				{
					const int32 A = Base + Indices[i], B = Base + Indices[i + 1], Cc = Base + Indices[i + 2];
					if (bMirrored) { Out.Triangles.Append({A, B, Cc}); }
					else { Out.Triangles.Append({A, Cc, B}); }
				}
			}
		}
	}
	if (Out.Triangles.Num() == 0)
	{
		OutError = TEXT("no static mesh geometry on the given actors");
		return false;
	}
	return true;
}

bool UPrimordiaBlenderSubsystem::WriteObj(const FBlenderMeshData& Mesh, const FString& Path)
{
	TArray<FString> Lines;
	Lines.Reserve(Mesh.Vertices.Num() * 2 + Mesh.Triangles.Num() / 3 + 4);
	Lines.Add(TEXT("# PrimordiaOS -> Blender. Blender axes (Z up), metres."));
	Lines.Add(FString::Printf(TEXT("o %s"), *Mesh.Name));
	for (const FVector& V : Mesh.Vertices)
	{
		Lines.Add(FString::Printf(TEXT("v %.6f %.6f %.6f"), V.X, V.Y, V.Z));
	}
	const bool bUV = Mesh.UVs.Num() == Mesh.Vertices.Num();
	if (bUV)
	{
		for (const FVector2D& UV : Mesh.UVs)
		{
			Lines.Add(FString::Printf(TEXT("vt %.6f %.6f"), UV.X, UV.Y));
		}
	}
	for (int32 i = 0; i + 2 < Mesh.Triangles.Num(); i += 3)
	{
		const int32 A = Mesh.Triangles[i] + 1, B = Mesh.Triangles[i + 1] + 1, C = Mesh.Triangles[i + 2] + 1;
		Lines.Add(bUV ? FString::Printf(TEXT("f %d/%d %d/%d %d/%d"), A, A, B, B, C, C) : FString::Printf(TEXT("f %d %d %d"), A, B, C));
	}
	IFileManager::Get().MakeDirectory(*FPaths::GetPath(Path), true);
	return FFileHelper::SaveStringArrayToFile(Lines, *Path, FFileHelper::EEncodingOptions::ForceAnsi);
}

TArray<FString> UPrimordiaBlenderSubsystem::ImportIntoProject(const FString& FilePath)
{
	TArray<FString> Paths;
#if WITH_EDITOR
	if (!FPaths::FileExists(FilePath))
	{
		UE_LOG(LogPrimordiaBlender, Warning, TEXT("Nothing to import: %s does not exist"), *FilePath);
		return Paths;
	}
	UAssetImportTask* Task = NewObject<UAssetImportTask>();
	Task->Filename = FilePath;
	Task->DestinationPath = GetDefault<UPrimordiaBlenderSettings>()->ImportContentPath;
	Task->bAutomated = true;
	Task->bReplaceExisting = true;
	Task->bSave = true;
	IAssetTools& AssetTools = FModuleManager::LoadModuleChecked<FAssetToolsModule>(TEXT("AssetTools")).Get();
	AssetTools.ImportAssetTasks({Task});
	for (const UObject* Obj : Task->GetObjects())
	{
		if (Obj)
		{
			Paths.Add(Obj->GetPathName());
		}
	}
	UE_LOG(LogPrimordiaBlender, Log, TEXT("Imported %s as %d assets"), *FilePath, Paths.Num());
#else
	UE_LOG(LogPrimordiaBlender, Warning, TEXT("Importing assets needs the editor; %s left on disk"), *FilePath);
#endif
	return Paths;
}

FSpellwrightStepResult UPrimordiaBlenderSubsystem::ExecuteStep(const FSpellwrightStep& Step, UWorld* World, FSpellwrightStepCallback OnComplete)
{
	FBlenderJob Job;
	Job.Scene = Step.GetArg(TEXT("scene"), TEXT("current"));
	Job.SavePath = Step.GetArg(TEXT("save"));
	auto Int = [&Step](const TCHAR* Key, int32 Default) { const FString V = Step.GetArg(Key); return V.IsEmpty() ? Default : FCString::Atoi(*V); };
	auto Bool = [&Step](const TCHAR* Key, bool Default) { bool B = Default; FSpellwrightOpRegistry::ParseBool(Step.GetArg(Key), B); return B; };

	const FString Op = Step.Op.ToString();
	if (Op == TEXT("blender.render"))
	{
		Job.Task = EBlenderTask::Render;
		Job.OutputPath = Step.GetArg(TEXT("output"), TEXT("auto"));
		Job.Engine = Step.GetArg(TEXT("engine"), TEXT("eevee"));
		Job.bAnimation = Bool(TEXT("animation"), false);
		Job.FrameStart = Int(TEXT("frame_start"), 1);
		Job.FrameEnd = Int(TEXT("frame_end"), Job.FrameStart);
		Job.Samples = Int(TEXT("samples"), 32);
		FVector Res;
		if (FSpellwrightOpRegistry::ParseSize(Step.GetArg(TEXT("resolution"), TEXT("1280x720")), Res))
		{
			Job.Resolution = FIntPoint(FMath::RoundToInt(Res.X), FMath::RoundToInt(Res.Y));
		}
		Job.Object = Step.Target;
	}
	else if (Op == TEXT("blender.animate"))
	{
		Job.Task = EBlenderTask::Animate;
		Job.Object = Step.Target;
		Job.bTurntable = Bool(TEXT("turntable"), Step.GetArg(TEXT("keyframes")).IsEmpty());
		Job.FrameStart = 1;
		Job.FrameEnd = Int(TEXT("frames"), 120);
		Job.Fps = Int(TEXT("fps"), 30);
		const FString Keys = Step.GetArg(TEXT("keyframes"));
		if (!Keys.IsEmpty())
		{
			TArray<TSharedPtr<FJsonValue>> Array;
			if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Keys), Array))
			{
				return FSpellwrightStepResult::Failure(TEXT("keyframes must be a JSON array"));
			}
			for (const TSharedPtr<FJsonValue>& V : Array)
			{
				const TSharedPtr<FJsonObject>* O = nullptr;
				if (!V->TryGetObject(O)) { continue; }
				FBlenderKeyframe K;
				(*O)->TryGetNumberField(TEXT("frame"), K.Frame);
				const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
				auto Vec = [](const TArray<TSharedPtr<FJsonValue>>& In) { return FVector(In.Num() > 0 ? In[0]->AsNumber() : 0, In.Num() > 1 ? In[1]->AsNumber() : 0, In.Num() > 2 ? In[2]->AsNumber() : 0); };
				if ((*O)->TryGetArrayField(TEXT("location"), A)) { K.bLocation = true; K.Location = Vec(*A); }
				if ((*O)->TryGetArrayField(TEXT("rotation"), A)) { K.bRotation = true; K.RotationDegrees = Vec(*A); }
				if ((*O)->TryGetArrayField(TEXT("scale"), A)) { K.bScale = true; K.Scale = Vec(*A); }
				Job.Keyframes.Add(K);
			}
		}
	}
	else if (Op == TEXT("blender.import"))
	{
		Job.Task = EBlenderTask::Import;
		Job.InputPath = Step.GetArg(TEXT("path"));
		Job.Format = Step.GetArg(TEXT("format"), FPaths::GetExtension(Job.InputPath).ToLower());
	}
	else if (Op == TEXT("blender.export"))
	{
		Job.Task = EBlenderTask::Export;
		Job.OutputPath = Step.GetArg(TEXT("path"), TEXT("auto"));
		Job.Format = Step.GetArg(TEXT("format"), TEXT("glb"));
		Job.bImportResult = Bool(TEXT("import"), false);
		Step.GetArg(TEXT("objects")).ParseIntoArray(Job.Objects, TEXT(","), true);
	}
	else if (Op == TEXT("blender.mesh"))
	{
		Job.Task = EBlenderTask::Mesh;
		if (!World)
		{
			return FSpellwrightStepResult::Failure(TEXT("blender.mesh needs a world"));
		}
		TArray<AActor*> Actors;
		const FName Tag(*Step.Target);
		for (TActorIterator<AActor> It(World); It; ++It)
		{
			if (It->ActorHasTag(Tag) || It->GetActorNameOrLabel() == Step.Target)
			{
				Actors.Add(*It);
			}
		}
		FString Error;
		if (!CollectMesh(Actors, Step.GetArg(TEXT("name"), Step.Target), Job.Mesh, Error))
		{
			return FSpellwrightStepResult::Failure(FString::Printf(TEXT("%s (%d actors tagged '%s')"), *Error, Actors.Num(), *Step.Target));
		}
		Job.Object = Job.Mesh.Name;
	}
	else
	{
		return FSpellwrightStepResult::Failure(FString::Printf(TEXT("the Blender subsystem does not run %s"), *Op));
	}

	const FString Tracking = RunJob(Job, [OnComplete](bool bOk, TSharedPtr<FJsonObject> Result, const FString& Error)
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
		CopyStringFields(Result, Done.Outputs);
		Done.Message = Done.Outputs.Contains(TEXT("output")) ? Done.Outputs[TEXT("output")] : FString();
		OnComplete(Done);
	});
	if (Tracking.IsEmpty())
	{
		return FSpellwrightStepResult::Failure(TEXT("the Blender job could not start"));
	}
	return FSpellwrightStepResult::PendingJob(Tracking, FString::Printf(TEXT("Blender %s"), *Op));
}
