#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "BlenderTypes.generated.h"

UENUM(BlueprintType)
enum class EBlenderTask : uint8
{
	Render,
	Animate,
	Import,
	Export,
	/** Create a mesh object from vertex data sent by Unreal. */
	Mesh,
	Info,
};

/** One keyframe on one object. Locations in metres, Blender axes (Z up, right-handed). */
USTRUCT(BlueprintType)
struct PRIMORDIABLENDERSUBSYSTEM_API FBlenderKeyframe
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") int32 Frame = 1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") bool bLocation = false;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FVector Location = FVector::ZeroVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") bool bRotation = false;
	/** Euler XYZ in degrees. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FVector RotationDegrees = FVector::ZeroVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") bool bScale = false;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FVector Scale = FVector::OneVector;
};

/** Geometry on its way to Blender: triangles in Blender space (metres, right-handed, Z up). */
USTRUCT(BlueprintType)
struct PRIMORDIABLENDERSUBSYSTEM_API FBlenderMeshData
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Blender") FString Name;
	UPROPERTY(BlueprintReadWrite, Category = "Blender") TArray<FVector> Vertices;
	UPROPERTY(BlueprintReadWrite, Category = "Blender") TArray<FVector2D> UVs;
	/** Three indices per triangle, counter-clockwise seen from outside. */
	UPROPERTY(BlueprintReadWrite, Category = "Blender") TArray<int32> Triangles;
};

USTRUCT(BlueprintType)
struct PRIMORDIABLENDERSUBSYSTEM_API FBlenderJob
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Blender") FGuid Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") EBlenderTask Task = EBlenderTask::Render;
	/** A .blend to open first, or "current" for whatever the Blender session has open. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FString Scene = TEXT("current");
	/** Import: the file to bring in. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FString InputPath;
	/** Render: image path (still) or directory (animation). Export: the file to write. Empty = Saved/Primordia/Blender. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FString OutputPath;
	/** glb, gltf, fbx, obj, usd */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FString Format = TEXT("glb");
	/** Animate: the object to keyframe. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FString Object;
	/** Export: only these objects (empty = everything). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") TArray<FString> Objects;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") TArray<FBlenderKeyframe> Keyframes;
	/** Animate: one full Z turn over the frame range. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") bool bTurntable = false;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") int32 FrameStart = 1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") int32 FrameEnd = 1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") int32 Fps = 30;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") bool bAnimation = false;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FIntPoint Resolution = FIntPoint(1280, 720);
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") int32 Samples = 32;
	/** eevee, cycles or workbench. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FString Engine = TEXT("eevee");
	/** Save the .blend here afterwards (empty = do not save). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") FString SavePath;
	UPROPERTY(BlueprintReadWrite, Category = "Blender") FBlenderMeshData Mesh;
	/** Export: import the written file into the Unreal project (editor only). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blender") bool bImportResult = false;
};

UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "PrimordiaOS Blender"))
class PRIMORDIABLENDERSUBSYSTEM_API UPrimordiaBlenderSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	/** JSON-RPC endpoint of pipeline/workers/blender_rpc_server.py running inside Blender. */
	UPROPERTY(Config, EditAnywhere, Category = "Blender") FString RpcUrl = TEXT("http://127.0.0.1:7791/rpc");
	/** Send jobs through the Bolt pipeline (true) or straight to the Blender RPC server (false). */
	UPROPERTY(Config, EditAnywhere, Category = "Blender") bool bUseBoltPipeline = true;
	/** Where "auto" outputs go. Empty = <Project>/Saved/Primordia/Blender. */
	UPROPERTY(Config, EditAnywhere, Category = "Blender") FString OutputDirectory;
	/** Content folder for meshes imported back from Blender. */
	UPROPERTY(Config, EditAnywhere, Category = "Blender") FString ImportContentPath = TEXT("/Game/Primordia/Blender");
	UPROPERTY(Config, EditAnywhere, Category = "Blender", meta = (ClampMin = "1")) float RpcTimeoutSeconds = 30.f;
	/** Long tasks (renders) are polled at this interval. */
	UPROPERTY(Config, EditAnywhere, Category = "Blender", meta = (ClampMin = "0.25")) float TaskPollSeconds = 1.f;
};
