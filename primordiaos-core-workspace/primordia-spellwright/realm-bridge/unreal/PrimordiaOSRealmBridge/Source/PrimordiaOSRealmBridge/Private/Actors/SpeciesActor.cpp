#include "Actors/SpeciesActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"

namespace
{
	// Unlit, colour from per-instance custom data (RGB x gain); bloom makes it glow.
	// Swarms draw hundreds of small bodies: the engine's 528-triangle sphere instead of the 960 one.
	const TCHAR* const LowSphere = TEXT("/Engine/EngineMeshes/Sphere.Sphere");
	const TCHAR* const GlowMaterial = TEXT("/PrimordiaOSRealmBridge/Materials/M_PrimordiaThreadGlow.M_PrimordiaThreadGlow");

	EPrimordiaManifestation ParseManifestation(const FString& S)
	{
		if (S == TEXT("rooted")) return EPrimordiaManifestation::Rooted;
		if (S == TEXT("swarm")) return EPrimordiaManifestation::Swarm;
		if (S == TEXT("floating")) return EPrimordiaManifestation::Floating;
		if (S == TEXT("abyssal")) return EPrimordiaManifestation::Abyssal;
		return EPrimordiaManifestation::Individual;
	}

	/** Sunflower spiral: even, organic spacing for rooted clusters and floating shoals (unit disc). */
	FVector2D Spiral(int32 I, int32 N)
	{
		const float R = FMath::Sqrt((I + 0.5f) / FMath::Max(1, N));
		const float A = I * 2.39996323f; // golden angle
		return FVector2D(R * FMath::Cos(A), R * FMath::Sin(A));
	}

	UInstancedStaticMeshComponent* MakeISM(AActor* Owner, USceneComponent* Parent, const TCHAR* Name)
	{
		UInstancedStaticMeshComponent* ISM = NewObject<UInstancedStaticMeshComponent>(Owner, Name);
		ISM->SetupAttachment(Parent);
		ISM->SetMobility(EComponentMobility::Movable);
		ISM->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		ISM->SetNumCustomDataFloats(4);
		ISM->RegisterComponent();
		Owner->AddInstanceComponent(ISM);
		return ISM;
	}
}

ASpeciesActor::ASpeciesActor()
{
	PrimaryActorTick.bCanEverTick = true;
	RetireFadeSeconds = 3.f; // a species fades from the world rather than blinking out
	Smoothing = 0.f;         // its home does not glide; its bodies do the moving
}

void ASpeciesActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	SpeciesName = Str(P, TEXT("name"));
	Archetype = Str(P, TEXT("archetype"));
	Look = Str(P, TEXT("look"));
	Manifestation = ParseManifestation(Str(P, TEXT("manifestation")));
	Population = Int(P, TEXT("population"), 0);
	SpeciesColor = PrimordiaJson::Color(P, TEXT("color"), FLinearColor::White);
	Glow = static_cast<float>(Num(P, TEXT("glow"), 2.0));
	SizeMeters = FMath::Max(0.05f, static_cast<float>(Num(P, TEXT("size"), 1.0)));
	SpeedMps = FMath::Max(0.f, static_cast<float>(Num(P, TEXT("speed"), 1.0)));
	RangeMeters = FMath::Max(1.f, static_cast<float>(Num(P, TEXT("range"), 10.0)));
	Seed = Int(P, TEXT("seed"), 0);
	SetTargetLocation(Vec(P, TEXT("position"), FVector::ZeroVector, UnitsPerMeter()), !bHasReceivedPacket);

	if (!bFormBuilt || BuiltFor != Manifestation)
	{
		BuildForm();
	}
	if (BodyMID)
	{
		BodyMID->SetVectorParameterValue(TEXT("Color"), SpeciesColor * 0.45f);
	}
	ResizeBodies(FMath::Clamp(Int(P, TEXT("bodies"), 0), 0, 400));
#if WITH_EDITOR
	const FString Label = FString::Printf(TEXT("Primordia_Species_%s"), *SpeciesName.Replace(TEXT(" "), TEXT("_")));
	if (GetActorLabel() != Label)
	{
		SetActorLabel(Label);
	}
#endif
}

void ASpeciesActor::BuildForm()
{
	if (!BodyMesh)
	{
		BodyMesh = MakeISM(this, SceneRoot, TEXT("Bodies"));
		AccentMesh = MakeISM(this, SceneRoot, TEXT("Accents"));
	}
	BodyMesh->ClearInstances();
	AccentMesh->ClearInstances();
	Swarm.Reset();
	bFlockPlaced = false;

	UMaterialInterface* GlowMat = LoadObject<UMaterialInterface>(nullptr, GlowMaterial);
	auto Mesh = [](const TCHAR* Path) { return LoadObject<UStaticMesh>(nullptr, Path); };
	// Lit bodies where a species has flesh; glowing ones where it is light.
	bool bBodyGlows = false;
	switch (Manifestation)
	{
	case EPrimordiaManifestation::Rooted:     BodyMesh->SetStaticMesh(Mesh(PrimordiaAssets::Cylinder)); AccentMesh->SetStaticMesh(Mesh(PrimordiaAssets::Sphere)); break;
	case EPrimordiaManifestation::Individual: BodyMesh->SetStaticMesh(Mesh(PrimordiaAssets::Cube)); AccentMesh->SetStaticMesh(Mesh(PrimordiaAssets::Sphere)); break;
	case EPrimordiaManifestation::Swarm:      BodyMesh->SetStaticMesh(Mesh(LowSphere)); AccentMesh->SetStaticMesh(nullptr); bBodyGlows = true; break;
	case EPrimordiaManifestation::Floating:   BodyMesh->SetStaticMesh(Mesh(PrimordiaAssets::Cone)); AccentMesh->SetStaticMesh(Mesh(PrimordiaAssets::Sphere)); bBodyGlows = true; break;
	case EPrimordiaManifestation::Abyssal:    BodyMesh->SetStaticMesh(Mesh(PrimordiaAssets::Sphere)); AccentMesh->SetStaticMesh(Mesh(PrimordiaAssets::Sphere)); break;
	}
	if (bBodyGlows && GlowMat)
	{
		BodyMesh->SetMaterial(0, GlowMat);
		BodyMID = nullptr;
	}
	else
	{
		BodyMID = MakeMID(BodyMesh, nullptr); // the engine's lit basic-shape material, tinted
	}
	if (GlowMat)
	{
		AccentMesh->SetMaterial(0, GlowMat);
	}
	BodyMesh->SetCastShadow(!bBodyGlows);
	AccentMesh->SetCastShadow(false);
	bFormBuilt = true;
	BuiltFor = Manifestation;
}

void ASpeciesActor::ResizeBodies(int32 Count)
{
	const int32 Old = Swarm.Num();
	if (Count < Old)
	{
		Swarm.SetNum(Count); // the last-born go first, so a shrinking species keeps its elders
	}
	const FVector Home = GetActorLocation();
	const double U = UnitsPerMeter();
	for (int32 I = Old; I < Count; ++I)
	{
		FRandomStream R(Seed * 7919 + I * 104729);
		FBody B;
		B.Phase = R.FRandRange(0.f, 2.f * PI);
		B.Rate = R.FRandRange(0.7f, 1.3f);
		B.Scale = R.FRandRange(0.75f, 1.25f);
		B.Heading = R.FRandRange(0.f, 2.f * PI);
		switch (Manifestation)
		{
		case EPrimordiaManifestation::Rooted:
		case EPrimordiaManifestation::Floating:
		{
			const FVector2D S = Spiral(I, FMath::Max(Count, 12));
			B.Offset = FVector(S.X + R.FRandRange(-0.08f, 0.08f), S.Y + R.FRandRange(-0.08f, 0.08f), R.FRand());
			break;
		}
		case EPrimordiaManifestation::Swarm:
			// Orbit radius (0.15..1), orbit plane tilt and height band.
			B.Offset = FVector(R.FRandRange(0.15f, 1.f), R.FRandRange(-0.5f, 0.5f), R.FRandRange(-1.f, 1.f));
			break;
		default:
			B.Offset = FVector(R.FRandRange(0.3f, 1.f), 0.f, 0.f);
			break;
		}
		const FVector2D Start = FVector2D(B.Offset.X, B.Offset.Y) * RangeMeters * U * 0.5;
		B.Pos = Home + FVector(Start.X, Start.Y, 0.0);
		Swarm.Add(B);
	}
	Bodies = Count;
}

double ASpeciesActor::Ground(FBody& B, const FVector& At)
{
	const FVector2D XY(At.X, At.Y);
	if (B.bTraced && FVector2D::DistSquared(XY, B.TracedAt) < 100.0 * 100.0)
	{
		return B.GroundZ; // moved less than a meter since the last trace
	}
	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(PrimordiaSpeciesGround), false, this);
	const FVector From(At.X, At.Y, At.Z + 50000.0);
	const FVector To(At.X, At.Y, At.Z - 50000.0);
	B.GroundZ = GetWorld()->LineTraceSingleByChannel(Hit, From, To, ECC_Visibility, Params) ? Hit.ImpactPoint.Z : GetActorLocation().Z;
	B.TracedAt = XY;
	B.bTraced = true;
	return B.GroundZ;
}

void ASpeciesActor::Simulate(float Dt)
{
	const double U = UnitsPerMeter();
	const FVector Home = GetActorLocation();
	const double Range = RangeMeters * U;
	const float T = Time;

	if (Manifestation == EPrimordiaManifestation::Swarm)
	{
		// The flock's centre wanders a Lissajous path around home; the flock follows it.
		const float S = (Seed % 1000) * 0.01f;
		const FVector Target = Home + FVector(Range * 0.65 * FMath::Sin(T * 0.07f + S), Range * 0.65 * FMath::Sin(T * 0.05f + 2.f * S), 0.0);
		FlockCentre = bFlockPlaced ? FMath::Lerp(FlockCentre, Target, 1.0 - FMath::Exp(-0.5 * Dt)) : Target;
		bFlockPlaced = true;
		FBody Probe;
		Probe.bTraced = FVector2D::DistSquared(FVector2D(FlockCentre), FlockTracedAt) < 100.0 * 100.0;
		Probe.TracedAt = FlockTracedAt;
		Probe.GroundZ = FlockGroundZ;
		FlockGroundZ = Ground(Probe, FlockCentre);
		FlockTracedAt = Probe.TracedAt;
	}

	for (FBody& B : Swarm)
	{
		switch (Manifestation)
		{
		case EPrimordiaManifestation::Rooted:
		{
			FVector P = Home + FVector(B.Offset.X * Range, B.Offset.Y * Range, 0.0);
			P.Z = Ground(B, P);
			B.Pos = P;
			break;
		}
		case EPrimordiaManifestation::Individual:
		{
			// Wander: a slow random turn, pulled back toward home beyond the range.
			FRandomStream R(Seed + static_cast<int32>(T * 4.f) * 131 + static_cast<int32>(B.Phase * 1000.f));
			B.Heading += (R.FRand() - 0.5f) * 1.6f * Dt;
			const FVector ToHome = Home - B.Pos;
			const double Dist = FVector2D(ToHome).Size();
			if (Dist > Range)
			{
				const float Want = FMath::Atan2(ToHome.Y, ToHome.X);
				B.Heading += FMath::FindDeltaAngleRadians(B.Heading, Want) * FMath::Min(1.f, 1.5f * Dt);
			}
			const double Step = SpeedMps * B.Rate * U * Dt * (0.6 + 0.4 * FMath::Sin(T * 0.5f + B.Phase)); // pauses and bursts
			B.Pos += FVector(FMath::Cos(B.Heading), FMath::Sin(B.Heading), 0.0) * Step;
			B.Pos.Z = Ground(B, B.Pos);
			break;
		}
		case EPrimordiaManifestation::Swarm:
		{
			const float Angle = B.Phase + T * (SpeedMps / FMath::Max(1.f, RangeMeters * 0.3f)) * B.Rate;
			const double Orbit = B.Offset.X * Range * 0.35;
			const FVector Target = FVector(FlockCentre.X, FlockCentre.Y, FlockGroundZ)
				+ FVector(Orbit * FMath::Cos(Angle), Orbit * FMath::Sin(Angle), Orbit * B.Offset.Y * FMath::Sin(Angle))
				+ FVector(0.0, 0.0, (4.0 + 1.5 * B.Offset.Z + 1.2 * FMath::Sin(T * 1.3f + B.Phase)) * U); // waves through the flock
			B.Pos = FMath::Lerp(B.Pos, Target, 1.0 - FMath::Exp(-3.0 * Dt));
			break;
		}
		case EPrimordiaManifestation::Floating:
		{
			const float Drift = T * 0.03f * B.Rate;
			const FVector2D O(B.Offset.X * FMath::Cos(Drift) - B.Offset.Y * FMath::Sin(Drift), B.Offset.X * FMath::Sin(Drift) + B.Offset.Y * FMath::Cos(Drift));
			FVector P = Home + FVector(O.X * Range, O.Y * Range, 0.0);
			const double Floor = Ground(B, P);
			P.Z = Floor + (6.0 + 8.0 * B.Offset.Z + 0.8 * FMath::Sin(T * 0.6f + B.Phase)) * U;
			B.Pos = P;
			break;
		}
		case EPrimordiaManifestation::Abyssal:
		{
			const double Radius = B.Offset.X * Range;
			const float Angle = B.Phase + T * (SpeedMps * U / FMath::Max(1.0, Radius)) * B.Rate;
			B.Pos = Home + FVector(Radius * FMath::Cos(Angle), Radius * FMath::Sin(Angle), 3.0 * U * FMath::Sin(T * 0.2f + B.Phase));
			B.Heading = Angle + PI * 0.5f; // swims along its circle
			break;
		}
		}
	}
}

void ASpeciesActor::Draw()
{
	if (!BodyMesh)
	{
		return;
	}
	const double U = UnitsPerMeter();
	// Engine shapes are 100 cm; the low-poly swarm sphere is 200 cm, so size from the mesh's bounds.
	const UStaticMesh* BodyAsset = BodyMesh->GetStaticMesh();
	const double BodyMeshSize = BodyAsset ? FMath::Max(1.0, BodyAsset->GetBoundingBox().GetSize().GetMax()) : 100.0;
	const double Size = SizeMeters * U / 100.0 * (Manifestation == EPrimordiaManifestation::Swarm ? 100.0 / BodyMeshSize : 1.0);
	const float T = Time;
	TArray<FTransform> BodyT, AccentT;
	BodyT.Reserve(Swarm.Num());
	AccentT.Reserve(Swarm.Num());
	const float Fade = FMath::Max(0.001f, FadeAlpha);

	for (const FBody& B : Swarm)
	{
		const double S = Size * B.Scale * Fade;
		switch (Manifestation)
		{
		case EPrimordiaManifestation::Rooted:
		{
			// A stalk and a breathing bulb on top.
			const double Breath = 1.0 + 0.08 * FMath::Sin(T * 0.8f + B.Phase);
			const double H = S * 100.0 * Breath;
			BodyT.Emplace(FQuat::Identity, B.Pos + FVector(0, 0, H * 0.5), FVector(S * 0.12, S * 0.12, S * Breath));
			AccentT.Emplace(FQuat::Identity, B.Pos + FVector(0, 0, H), FVector(S * 0.45 * Breath));
			break;
		}
		case EPrimordiaManifestation::Individual:
		{
			// A long low body facing its heading, a glowing eye at the front.
			const FQuat Q(FVector::UpVector, B.Heading);
			const double Bob = 0.04 * S * 100.0 * FMath::Abs(FMath::Sin(T * 6.f * B.Rate + B.Phase));
			BodyT.Emplace(Q, B.Pos + FVector(0, 0, S * 30.0 + Bob), FVector(S, S * 0.4, S * 0.5));
			AccentT.Emplace(Q, B.Pos + Q.RotateVector(FVector(S * 50.0, 0, 0)) + FVector(0, 0, S * 45.0 + Bob), FVector(S * 0.18));
			break;
		}
		case EPrimordiaManifestation::Swarm:
			BodyT.Emplace(FQuat::Identity, B.Pos, FVector(S * (0.8 + 0.3 * FMath::Sin(T * 5.f + B.Phase))));
			break;
		case EPrimordiaManifestation::Floating:
		{
			// A slowly turning shard, point down, with a light at its heart.
			const FQuat Q = FQuat(FVector::UpVector, T * 0.4f * B.Rate + B.Phase) * FQuat(FVector::RightVector, PI);
			BodyT.Emplace(Q, B.Pos, FVector(S * 0.5, S * 0.5, S));
			AccentT.Emplace(FQuat::Identity, B.Pos + FVector(0, 0, S * 15.0), FVector(S * 0.22 * (1.0 + 0.2 * FMath::Sin(T * 2.f + B.Phase))));
			break;
		}
		case EPrimordiaManifestation::Abyssal:
		{
			// A wide, flat ray-like body with slow wingbeats and two glowing lights.
			const FQuat Q = FQuat(FVector::UpVector, B.Heading) * FQuat(FVector::ForwardVector, 0.15f * FMath::Sin(T * 0.7f + B.Phase));
			const double Beat = 1.0 + 0.1 * FMath::Sin(T * 0.7f + B.Phase);
			BodyT.Emplace(Q, B.Pos, FVector(S, S * 1.7 * Beat, S * 0.22));
			AccentT.Emplace(Q, B.Pos + Q.RotateVector(FVector(S * 40.0, S * 25.0, S * 8.0)), FVector(S * 0.08));
			AccentT.Emplace(Q, B.Pos + Q.RotateVector(FVector(S * 40.0, -S * 25.0, S * 8.0)), FVector(S * 0.08));
			break;
		}
		}
	}

	auto Upload = [this](UInstancedStaticMeshComponent* ISM, const TArray<FTransform>& Ts, float Gain)
	{
		if (!ISM || !ISM->GetStaticMesh())
		{
			return;
		}
		if (ISM->GetInstanceCount() != Ts.Num())
		{
			ISM->ClearInstances();
			if (Ts.Num())
			{
				ISM->AddInstances(Ts, false, true);
			}
			const float Data[4] = { SpeciesColor.R * Gain, SpeciesColor.G * Gain, SpeciesColor.B * Gain, 0.f };
			for (int32 I = 0; I < Ts.Num(); ++I)
			{
				ISM->SetCustomData(I, TArrayView<const float>(Data, 4), false);
			}
			ISM->MarkRenderStateDirty();
		}
		else if (Ts.Num())
		{
			ISM->BatchUpdateInstancesTransforms(0, Ts, true, true, true);
		}
	};
	Upload(BodyMesh, BodyT, Glow * 0.8f);
	Upload(AccentMesh, AccentT, Glow * 1.6f);
}

void ASpeciesActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!bHasReceivedPacket || !GetWorld())
	{
		return;
	}
	const float Dt = FMath::Min(DeltaSeconds, 0.1f);
	Time += Dt;
	Simulate(Dt);
	Draw();
}
