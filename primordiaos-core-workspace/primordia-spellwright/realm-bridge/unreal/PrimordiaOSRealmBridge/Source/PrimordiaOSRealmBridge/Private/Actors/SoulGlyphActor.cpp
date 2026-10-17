#include "Actors/SoulGlyphActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"

#if WITH_EDITOR
#include "LevelEditorViewport.h"
#endif
#include "Kismet/GameplayStatics.h"
#include "Camera/PlayerCameraManager.h"

ASoulGlyphActor::ASoulGlyphActor()
{
	GlyphPivot = CreateDefaultSubobject<USceneComponent>(TEXT("GlyphPivot"));
	GlyphPivot->SetupAttachment(SceneRoot);

	GlyphPlane = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("GlyphPlane"));
	GlyphPlane->SetupAttachment(GlyphPivot);
	GlyphPlane->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	GlyphPlane->CastShadow = false;

	Fragments = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Fragments"));
	Fragments->SetupAttachment(SceneRoot);
	Fragments->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Fragments->NumCustomDataFloats = 3;
	Fragments->CastShadow = false;
}

void ASoulGlyphActor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	const UPrimordiaBridgeSettings* S = UPrimordiaBridgeSettings::Get();
	if (!GlyphPlane->GetStaticMesh())
	{
		GlyphPlane->SetStaticMesh(UPrimordiaBridgeSettings::LoadOr(S->GlyphMesh, PrimordiaAssets::Plane));
	}
	if (!Fragments->GetStaticMesh())
	{
		Fragments->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, PrimordiaAssets::Sphere));
		if (UMaterialInterface* FragmentMaterial = UPrimordiaBridgeSettings::LoadOr(S->FragmentMaterial, nullptr))
		{
			Fragments->SetMaterial(0, FragmentMaterial);
		}
	}
	GlyphPlane->SetRelativeScale3D(FVector(GlyphDiameter / 100.f));
}

void ASoulGlyphActor::EnsureMaterials()
{
	if (!GlyphMID)
	{
		GlyphMID = MakeMID(GlyphPlane, UPrimordiaBridgeSettings::LoadOr(UPrimordiaBridgeSettings::Get()->GlyphMaterial, nullptr));
	}
}

void ASoulGlyphActor::ApplyGlyphSpec(const FPrimordiaGlyphSpec& Spec)
{
	Symmetry = Spec.Symmetry;
	Complexity = Spec.Complexity;
	Hue = Spec.Hue;
	GlyphDiameter = Spec.Scale;
	GlyphKind = Spec.Kind == TEXT("soul") ? 0.f : Spec.Kind == TEXT("sigil") ? 1.f : Spec.Kind == TEXT("ward") ? 2.f : 3.f;
	GlyphPlane->SetRelativeScale3D(FVector(GlyphDiameter / 100.f));
	if (!bHasReceivedPacket)
	{
		SetTargetLocation(Spec.Position, true);
	}
}

void ASoulGlyphActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	const float Upm = UnitsPerMeter();
	Unity = Num(P, TEXT("unity"), Unity);
	if (const TSharedPtr<FJsonObject> Glyph = Obj(P, TEXT("glyph")))
	{
		Symmetry = FMath::Clamp(Int(Glyph, TEXT("symmetry"), Symmetry), 1, 64);
		Complexity = Num(Glyph, TEXT("complexity"), Complexity);
		RotationSpeed = Num(Glyph, TEXT("rotation_speed"), RotationSpeed);
		Hue = Num(Glyph, TEXT("hue"), Hue);
	}
	SetTargetLocation(Vec(P, TEXT("position"), FVector::ZeroVector, Upm));

	// Fragments: match by id so each keeps its smoothed position.
	TArray<FFragment> Next;
	if (const TArray<TSharedPtr<FJsonValue>>* Frags = Arr(P, TEXT("fragments")))
	{
		for (const TSharedPtr<FJsonValue>& V : *Frags)
		{
			const TSharedPtr<FJsonObject> F = V->AsObject();
			FFragment Frag;
			Frag.Id = Str(F, TEXT("id"));
			Frag.Angle = Num(F, TEXT("angle"));
			Frag.Radius = Num(F, TEXT("radius")) * Upm;
			Frag.Essence = Color(F, TEXT("essence"));
			const FFragment* Old = FragmentState.FindByPredicate([&](const FFragment& O) { return O.Id == Frag.Id; });
			Frag.Current = Old ? Old->Current : FVector::ZeroVector; // new fragments emerge from the glyph's heart
			Next.Add(Frag);
		}
	}
	FragmentState = MoveTemp(Next);

	if (Fragments->GetInstanceCount() != FragmentState.Num())
	{
		Fragments->ClearInstances();
		TArray<FTransform> Transforms;
		Transforms.Init(FTransform(FQuat::Identity, FVector::ZeroVector, FVector(FragmentSize / 100.f)), FragmentState.Num());
		Fragments->AddInstances(Transforms, false);
	}
}

void ASoulGlyphActor::FaceCamera()
{
	FVector ViewLocation;
	bool bHaveView = false;
	if (APlayerCameraManager* Camera = UGameplayStatics::GetPlayerCameraManager(this, 0))
	{
		ViewLocation = Camera->GetCameraLocation();
		bHaveView = true;
	}
#if WITH_EDITOR
	else if (GetWorld() && GetWorld()->WorldType == EWorldType::Editor && GCurrentLevelEditingViewportClient)
	{
		ViewLocation = GCurrentLevelEditingViewportClient->GetViewLocation();
		bHaveView = true;
	}
#endif
	if (!bHaveView)
	{
		return;
	}
	const FVector ToView = (ViewLocation - GlyphPivot->GetComponentLocation()).GetSafeNormal();
	if (!ToView.IsNearlyZero())
	{
		// The plane's normal is +Z: point it at the viewer, keep world up as the reference.
		GlyphPivot->SetWorldRotation(FRotationMatrix::MakeFromZX(ToView, FVector::UpVector).Rotator());
	}
}

void ASoulGlyphActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	EnsureMaterials();

	Spin += RotationSpeed * DeltaSeconds * CustomTimeDilation;
	if (bFaceCamera)
	{
		FaceCamera();
	}

	if (GlyphMID)
	{
		GlyphMID->SetScalarParameterValue(TEXT("Symmetry"), static_cast<float>(Symmetry));
		GlyphMID->SetScalarParameterValue(TEXT("Complexity"), Complexity);
		GlyphMID->SetScalarParameterValue(TEXT("Hue"), Hue);
		GlyphMID->SetScalarParameterValue(TEXT("Unity"), Unity);
		GlyphMID->SetScalarParameterValue(TEXT("Spin"), Spin);
		GlyphMID->SetScalarParameterValue(TEXT("GlyphKind"), GlyphKind);
		GlyphMID->SetVectorParameterValue(TEXT("Color"), FLinearColor::MakeFromHSV8(static_cast<uint8>(Hue * 255.f), 160, 255));
	}

	const int32 Count = FragmentState.Num();
	if (Count > 0 && Fragments->GetInstanceCount() == Count)
	{
		const float Alpha = ExpAlpha(8.f, DeltaSeconds);
		TArray<FTransform> Transforms;
		Transforms.SetNum(Count);
		for (int32 i = 0; i < Count; ++i)
		{
			FFragment& F = FragmentState[i];
			const FVector Target(FMath::Cos(F.Angle) * F.Radius, FMath::Sin(F.Angle) * F.Radius, 0.f);
			F.Current = FMath::Lerp(F.Current, Target, Alpha);
			Transforms[i] = FTransform(FQuat::Identity, F.Current, FVector(FragmentSize / 100.f * RetireAlpha));
			Fragments->SetCustomDataValue(i, 0, F.Essence.R, false);
			Fragments->SetCustomDataValue(i, 1, F.Essence.G, false);
			Fragments->SetCustomDataValue(i, 2, F.Essence.B, false);
		}
		Fragments->BatchUpdateInstancesTransforms(0, Transforms, false, true, false);
	}
}

void ASoulGlyphActor::UpdateRetireFade(float Alpha)
{
	if (GlyphMID)
	{
		GlyphMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
	}
}
