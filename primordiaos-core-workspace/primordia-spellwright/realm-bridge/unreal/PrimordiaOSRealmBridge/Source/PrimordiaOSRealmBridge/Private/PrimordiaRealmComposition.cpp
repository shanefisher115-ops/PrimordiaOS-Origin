#include "PrimordiaRealmComposition.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaTopology.h"
#include "Algo/StableSort.h"

// Composition rules per layer kind (PRS-1 §3.3, §4.3). All lengths are cm (the
// manifest parser already scaled them). Engine shapes are 100 cm across with
// their pivot at the centre, so a scale of S/100 gives a size of S cm.
//
// Determinism rule for this file: never draw from a stream twice within one
// expression (e.g. two Range() calls as arguments of one call). C++ leaves the
// order of argument evaluation unspecified, so such code could build different
// realms with different compilers. Draw into locals, one statement each.

namespace
{
	/** One tier's random stream. */
	struct FStream
	{
		FPrimordiaRandom Rng;
		explicit FStream(uint32 Seed) : Rng(Seed) {}

		float U() { return static_cast<float>(Rng.Next()); }
		float Range(float Min, float Max) { return Min + U() * (Max - Min); }
		/** Roughly normal in [-1, 1] (mean of three uniforms). */
		float Bell()
		{
			float Sum = U();
			Sum += U();
			Sum += U();
			return Sum / 1.5f - 1.f;
		}
		float Angle() { return U() * 2.f * PI; }
		/** Per-axis factors in [Min, Max], drawn X, Y, Z. */
		FVector Scale3(float Min, float Max)
		{
			const float X = Range(Min, Max);
			const float Y = Range(Min, Max);
			const float Z = Range(Min, Max);
			return FVector(X, Y, Z);
		}
		/** Pitch, yaw, roll drawn in that order. */
		FRotator Rotator(float PitchRoll, float Yaw)
		{
			const float P = Range(-PitchRoll, PitchRoll);
			const float Y = Range(-Yaw, Yaw);
			const float R = Range(-PitchRoll, PitchRoll);
			return FRotator(P, Y, R);
		}
		/** Uniform over a disc of radius R. */
		FVector2f InDisc(float R)
		{
			const float Rr = R * FMath::Sqrt(U());
			const float A = Angle();
			return FVector2f(FMath::Cos(A) * Rr, FMath::Sin(A) * Rr);
		}
	};

	uint32 TierSeed(uint32 RealmSeed, const FPrimordiaRealmLayer& Layer, const TCHAR* Suffix)
	{
		return FPrimordiaRandom::SubSeed(RealmSeed, TEXT("layer:") + Layer.Id + Suffix);
	}

	// PRS-1 §4.1: the primary tier keeps the layer's original stream; added tiers get their own.
	const TCHAR* PrimaryStream = TEXT("");
	const TCHAR* FixedStream = TEXT(":fixed");
	const TCHAR* HeroStream = TEXT(":hero");
	const TCHAR* DetailStream = TEXT(":detail");

	float Unit(float V) { return FMath::Clamp(V, 0.f, 1.f); }
	int32 Count(const FPrimordiaRealmLayer& Layer, const TCHAR* Name, float Default, int32 Min, int32 Max)
	{
		return FMath::Clamp(FMath::RoundToInt(Layer.Param(Name, Default)), Min, Max);
	}

	FVector2f Polar(float Radius, float Angle) { return FVector2f(FMath::Cos(Angle) * Radius, FMath::Sin(Angle) * Radius); }

	/** Yaw (degrees) that points local +X from P toward Target. */
	float YawToward(const FVector2f& P, const FVector2f& Target)
	{
		return FMath::RadiansToDegrees(FMath::Atan2(Target.Y - P.Y, Target.X - P.X));
	}

	/** Tilts +Z by Degrees toward the horizontal direction Angle (radians). */
	FQuat Lean(float Angle, float Degrees)
	{
		return FQuat(FVector(-FMath::Sin(Angle), FMath::Cos(Angle), 0.f), FMath::DegreesToRadians(Degrees));
	}

	FQuat RandomRotation(FStream& S)
	{
		return S.Rotator(180.f, 180.f).Quaternion();
	}

	/** Dart-throwing spacing test (Poisson-disc style) on a hash grid; radii may differ per point. */
	struct FDiscSampler
	{
		explicit FDiscSampler(float MaxRadius) : Cell(FMath::Max(1.f, 2.f * MaxRadius)) {}

		bool Fits(const FVector2f& Q, float Radius) const
		{
			const FIntPoint C = CellOf(Q);
			for (int32 Dx = -1; Dx <= 1; ++Dx)
			for (int32 Dy = -1; Dy <= 1; ++Dy)
			{
				if (const TArray<int32>* Bucket = Grid.Find(FIntPoint(C.X + Dx, C.Y + Dy)))
				{
					for (int32 i : *Bucket)
					{
						if (FVector2f::DistSquared(Q, Points[i]) < FMath::Square(Radius + Radii[i]))
						{
							return false;
						}
					}
				}
			}
			return true;
		}

		void Add(const FVector2f& Q, float Radius)
		{
			Grid.FindOrAdd(CellOf(Q)).Add(Points.Num());
			Points.Add(Q);
			Radii.Add(FMath::Min(Radius, Cell * 0.5f));
		}

		bool TryAdd(const FVector2f& Q, float Radius)
		{
			if (!Fits(Q, Radius))
			{
				return false;
			}
			Add(Q, Radius);
			return true;
		}

	private:
		FIntPoint CellOf(const FVector2f& Q) const { return FIntPoint(FMath::FloorToInt(Q.X / Cell), FMath::FloorToInt(Q.Y / Cell)); }

		float Cell;
		TMap<FIntPoint, TArray<int32>> Grid;
		TArray<FVector2f> Points;
		TArray<float> Radii;
	};

	/** Up to Count well-separated points in a disc (cluster centres). */
	TArray<FVector2f> SpreadPoints(FStream& S, int32 Count, float DiscRadius, float MinDistance)
	{
		TArray<FVector2f> Out;
		for (int32 i = 0; i < Count; ++i)
		{
			for (int32 Attempt = 0; Attempt < 30; ++Attempt)
			{
				const FVector2f P = S.InDisc(DiscRadius);
				bool bFar = true;
				for (const FVector2f& Q : Out)
				{
					bFar &= FVector2f::DistSquared(P, Q) >= MinDistance * MinDistance;
				}
				if (bFar)
				{
					Out.Add(P);
					break;
				}
			}
		}
		return Out;
	}

	FPrimordiaTierCandidates& NewTier(FPrimordiaLayerComposition& Out, EPrimordiaTier Tier, const TCHAR* Name, const TCHAR* Mesh)
	{
		FPrimordiaTierCandidates& T = Out.Tiers.AddDefaulted_GetRef();
		T.Tier = Tier;
		T.Name = Name;
		T.FallbackMesh = Mesh;
		return T;
	}

	/** Stable-sorts a gated tier by its Requires index and truncates it to Max. */
	void FinishGated(FPrimordiaTierCandidates& T, int32 Max)
	{
		TArray<int32> Order;
		Order.Reserve(T.Num());
		for (int32 i = 0; i < T.Num(); ++i)
		{
			Order.Add(i);
		}
		Algo::StableSort(Order, [&T](int32 A, int32 B) { return T.Requires[A] < T.Requires[B]; });
		Order.SetNum(FMath::Min(Order.Num(), Max));
		FPrimordiaTierCandidates Sorted = T;
		Sorted.Transforms.Reset();
		Sorted.Data.Reset();
		Sorted.Requires.Reset();
		for (int32 i : Order)
		{
			Sorted.AddGated(T.Transforms[i], T.Data[i], T.Requires[i]);
		}
		T = MoveTemp(Sorted);
	}

	// -----------------------------------------------------------------------
	// ground: solid terraces, monolith circles standing on them, rubble.
	// -----------------------------------------------------------------------
	void ComposeGround(const FPrimordiaRealmLayer& Layer, uint32 Seed, int32 Max, FPrimordiaLayerComposition& Out)
	{
		const float R = Layer.Radius;
		const float Rough = Unit(Layer.Param(TEXT("roughness"), 0.5f));
		const int32 Terraces = Count(Layer, TEXT("terrace_count"), 1.f, 1, 12);
		const float Step = 150.f * (0.5f + Rough);

		// Fixed: terraces are solid cylinders from the base disc up to their top, each
		// drifting inside the one below (rougher ground wanders more).
		FPrimordiaGroundSurface& Surface = Out.Surface;
		Surface.Altitude = Layer.Altitude;
		Surface.Hash = HashCombine(Layer.StructuralHash(), GetTypeHash(Layer.Id));
		Surface.Centers.Add(FVector2f::ZeroVector);
		Surface.Radii.Add(R);
		Surface.Tops.Add(0.f);

		FStream FS(TierSeed(Seed, Layer, FixedStream));
		FPrimordiaTierCandidates& Fixed = NewTier(Out, EPrimordiaTier::Fixed, TEXT("Terraces"), PrimordiaAssets::Cylinder);
		Fixed.bCastShadow = true;
		Fixed.bCollide = true;
		for (int32 t = 1; t < Terraces; ++t)
		{
			const float Rt = R * (1.f - static_cast<float>(t) / (Terraces + 1));
			const float Room = Surface.Radii.Last() - Rt;
			const float Drift = Room * (0.15f + 0.5f * Rough) * FS.U();
			const FVector2f C = Surface.Centers.Last() + Polar(Drift, FS.Angle());
			const float Top = t * Step;
			Surface.Centers.Add(C);
			Surface.Radii.Add(Rt);
			Surface.Tops.Add(Top);
			Fixed.Add(FTransform(FQuat::Identity, FVector(C.X, C.Y, Top * 0.5f), FVector(2.f * Rt / 100.f, 2.f * Rt / 100.f, Top / 100.f)),
				FVector4f(FS.U(), static_cast<float>(t) / FMath::Max(1, Terraces - 1), Rt / R, static_cast<float>(t) / Terraces));
		}

		// Hero: monolith circles (a tall centre stone, a ring of slabs facing it), then lone stones.
		FStream HS(TierSeed(Seed, Layer, PrimaryStream));
		FPrimordiaTierCandidates& Hero = NewTier(Out, EPrimordiaTier::Hero, TEXT("Monoliths"), PrimordiaAssets::Cube);
		Hero.bPrimary = true;
		Hero.bCastShadow = true;
		const int32 Cap = FMath::Min(Max, 400);
		const int32 Clusters = Count(Layer, TEXT("monolith_clusters"), 3.f + 4.f * Rough, 0, 24);
		const float Spread = FMath::Clamp(Layer.Param(TEXT("cluster_spread"), 0.07f * R), 100.f, 0.3f * R);
		FDiscSampler Sampler(300.f);
		TArray<float> HeroWidths;

		auto AddStone = [&](const FVector2f& P, float H, float Yaw, float Weight) -> bool
		{
			const float W = 40.f + 0.1f * H;
			if (Hero.Num() >= Cap || !Sampler.TryAdd(P, W * 0.6f))
			{
				return false;
			}
			const float D = W * HS.Range(0.35f, 0.6f);
			FRotator Rot = HS.Rotator(2.f + 6.f * Rough, 0.f);
			Rot.Yaw = Yaw;
			const float Z = Surface.HeightAt(P.X, P.Y) + H * 0.44f; // 6 % of the stone is buried
			const float Seed01 = HS.U();
			Hero.Add(FTransform(Rot, FVector(P.X, P.Y, Z), FVector(D / 100.f, W / 100.f, H / 100.f)),
				FVector4f(Seed01, FMath::Min(1.f, H / 2500.f), P.Size() / R, Weight));
			HeroWidths.Add(W);
			return true;
		};

		const TArray<FVector2f> Centres = SpreadPoints(HS, Clusters, FMath::Max(0.f, 0.85f * R - Spread), 2.2f * Spread);
		TArray<float> CentreHeights;
		for (const FVector2f& C : Centres)
		{
			const float H = (500.f + 1300.f * HS.U()) * (0.6f + 0.8f * Rough);
			CentreHeights.Add(H);
			AddStone(C, H, HS.Range(-180.f, 180.f), 1.f);
		}
		// Ring members are interleaved across circles, so a density prefix grows every circle evenly.
		TArray<int32> Members;
		int32 MaxMembers = 0;
		for (int32 k = 0; k < Centres.Num(); ++k)
		{
			Members.Add(4 + FMath::FloorToInt(HS.U() * 5.f));
			MaxMembers = FMath::Max(MaxMembers, Members.Last());
		}
		for (int32 j = 0; j < MaxMembers; ++j)
		{
			for (int32 k = 0; k < Centres.Num(); ++k)
			{
				if (j >= Members[k])
				{
					continue;
				}
				const float A = 2.f * PI * j / Members[k] + HS.Range(-0.15f, 0.15f) + k;
				const FVector2f P = Centres[k] + Polar(Spread * HS.Range(0.75f, 1.f), A);
				AddStone(P, CentreHeights[k] * HS.Range(0.35f, 0.7f), YawToward(P, Centres[k]), 0.6f);
			}
		}
		const int32 Singles = FMath::RoundToInt(80.f + 160.f * Rough);
		for (int32 i = 0; i < Singles && Hero.Num() < Cap; ++i)
		{
			for (int32 Attempt = 0; Attempt < 6; ++Attempt)
			{
				const FVector2f P = HS.InDisc(0.95f * R);
				const float U = HS.U();
				if (AddStone(P, (200.f + 700.f * U * U) * (0.5f + Rough), HS.Range(-180.f, 180.f), 0.f))
				{
					break;
				}
			}
		}

		// Detail: rubble along terrace feet (always) and around each stone's base (follows the stone).
		FStream DS(TierSeed(Seed, Layer, DetailStream));
		FPrimordiaTierCandidates& Detail = NewTier(Out, EPrimordiaTier::Detail, TEXT("Rubble"), PrimordiaAssets::Cube);
		Detail.CullDistance = 9000.f;
		const int32 Total = FMath::RoundToInt(Unit(Layer.Param(TEXT("rubble"), 0.5f)) * FMath::Min(Max, 1200));
		auto AddRubble = [&](const FVector2f& P, float Weight, int32 Requires)
		{
			const float U = DS.U();
			const float S = 15.f + 90.f * U * U * U;
			const FVector Scale = S * DS.Scale3(0.5f, 1.f) * FVector(1.4f, 1.f, 0.7f); // flattened stones
			const FRotator Rot = DS.Rotator(25.f, 180.f);
			const float Seed01 = DS.U();
			Detail.AddGated(FTransform(Rot, FVector(P.X, P.Y, Surface.HeightAt(P.X, P.Y) + Scale.Z * 0.3f), Scale / 100.f),
				FVector4f(Seed01, S / 105.f, P.Size() / R, Weight), Requires);
		};
		const int32 RimCount = Total * 2 / 5;
		for (int32 i = 0; i < RimCount; ++i)
		{
			// The foot of terrace t lies on terrace t-1; terrace 0 is the base disc's own edge.
			const int32 t = FMath::Min(FMath::FloorToInt(DS.U() * Terraces), Terraces - 1);
			const float Rr = t == 0 ? R * DS.Range(0.9f, 0.99f) : Surface.Radii[t] * DS.Range(1.f, 1.06f);
			AddRubble(Surface.Centers[t] + Polar(Rr, DS.Angle()), 1.f, -1);
		}
		const int32 BaseCount = Total - RimCount;
		for (int32 h = 0; h < Hero.Num() && BaseCount > 0; ++h)
		{
			const float Share = static_cast<float>(BaseCount) / Hero.Num();
			const int32 N = FMath::FloorToInt(Share) + (DS.U() < FMath::Frac(Share) ? 1 : 0);
			const FVector Loc = Hero.Transforms[h].GetLocation();
			for (int32 i = 0; i < N; ++i)
			{
				const float Dist = HeroWidths[h] * DS.Range(0.5f, 1.6f);
				AddRubble(FVector2f(Loc.X, Loc.Y) + Polar(Dist, DS.Angle()), 0.f, h);
			}
		}
		FinishGated(Detail, Max);
	}

	// -----------------------------------------------------------------------
	// ocean: sea stacks breaking the surface, motes drifting low over it.
	// -----------------------------------------------------------------------
	void ComposeOcean(const FPrimordiaRealmLayer& Layer, uint32 Seed, int32 Max, FPrimordiaLayerComposition& Out)
	{
		const float R = Layer.Radius;
		const float WaveHeight = Layer.Param(TEXT("wave_height"), 50.f);
		const float Depth = 400.f;

		FStream HS(TierSeed(Seed, Layer, HeroStream));
		FPrimordiaTierCandidates& Hero = NewTier(Out, EPrimordiaTier::Hero, TEXT("SeaStacks"), PrimordiaAssets::Cylinder);
		Hero.bCastShadow = true;
		auto AddStack = [&](const FVector2f& P, float Radius, float Height)
		{
			const float Seed01 = HS.U();
			Hero.Add(FTransform(FQuat::Identity, FVector(P.X, P.Y, (Height - Depth) * 0.5f), FVector(2.f * Radius / 100.f, 2.f * Radius / 100.f, (Height + Depth) / 100.f)),
				FVector4f(Seed01, FMath::Min(1.f, Height / 1500.f), P.Size() / R, Height / (Height + Depth)));
		};
		const int32 Islets = Count(Layer, TEXT("islet_count"), 6.f, 0, 32);
		const TArray<FVector2f> Centres = SpreadPoints(HS, Islets, 0.85f * R, 0.12f * R);
		TArray<float> Radii;
		TArray<float> Heights;
		for (const FVector2f& C : Centres)
		{
			const float U = HS.U();
			Radii.Add(150.f + 450.f * U * U);
			Heights.Add(300.f + 1200.f * HS.U());
			AddStack(C, Radii.Last(), Heights.Last());
		}
		for (int32 k = 0; k < Centres.Num(); ++k)
		{
			const int32 Companions = FMath::FloorToInt(HS.U() * 3.f);
			for (int32 c = 0; c < Companions; ++c)
			{
				const float Dist = Radii[k] * HS.Range(1.4f, 2.2f);
				const FVector2f P = Centres[k] + Polar(Dist, HS.Angle());
				const float Radius = Radii[k] * HS.Range(0.3f, 0.6f);
				AddStack(P, Radius, Heights[k] * HS.Range(0.3f, 0.7f));
			}
		}

		FStream DS(TierSeed(Seed, Layer, PrimaryStream));
		FPrimordiaTierCandidates& Detail = NewTier(Out, EPrimordiaTier::Detail, TEXT("Motes"), PrimordiaAssets::Sphere);
		Detail.bPrimary = true;
		const int32 Motes = FMath::Min(Max, 300);
		for (int32 i = 0; i < Motes; ++i)
		{
			// Half the motes gather around the stacks; the rest drift anywhere, mostly low.
			FVector2f P = DS.InDisc(R);
			if (Centres.Num() && DS.U() < 0.5f)
			{
				const int32 k = FMath::Min(FMath::FloorToInt(DS.U() * Centres.Num()), Centres.Num() - 1);
				P = Centres[k] + DS.InDisc(Radii[k] * 3.f);
			}
			const float Uz = DS.U();
			const float Us = DS.U();
			const float Z = WaveHeight + 60.f + 700.f * Uz * Uz;
			const float S = 20.f + 60.f * Us * Us;
			const float Seed01 = DS.U();
			Detail.Add(FTransform(FQuat::Identity, FVector(P.X, P.Y, Z), FVector(S / 100.f)), FVector4f(Seed01, Us * Us, P.Size() / R, Uz * Uz));
		}
	}

	// -----------------------------------------------------------------------
	// sky: stars with a power-law magnitude, concentrated in a tilted band; a few beacons.
	// -----------------------------------------------------------------------
	void ComposeSky(const FPrimordiaRealmLayer& Layer, uint32 Seed, int32 Max, FPrimordiaLayerComposition& Out)
	{
		const float R = Layer.Radius;

		FStream HS(TierSeed(Seed, Layer, HeroStream));
		FPrimordiaTierCandidates& Hero = NewTier(Out, EPrimordiaTier::Hero, TEXT("Beacons"), PrimordiaAssets::Sphere);
		const int32 Beacons = 3 + FMath::FloorToInt(HS.U() * 5.f);
		for (int32 i = 0; i < Beacons; ++i)
		{
			const float Elevation = FMath::DegreesToRadians(HS.Range(12.f, 60.f));
			const float Azimuth = 2.f * PI * i / Beacons + HS.Range(-0.3f, 0.3f);
			const FVector Dir(FMath::Cos(Elevation) * FMath::Cos(Azimuth), FMath::Cos(Elevation) * FMath::Sin(Azimuth), FMath::Sin(Elevation));
			const float U = HS.U();
			const float S = 300.f + 900.f * U * U;
			const float Seed01 = HS.U();
			Hero.Add(FTransform(FQuat::Identity, Dir * (0.92f * R), FVector(S / 100.f)), FVector4f(Seed01, U * U, Dir.Z, 0.f));
		}

		FStream DS(TierSeed(Seed, Layer, PrimaryStream));
		FPrimordiaTierCandidates& Detail = NewTier(Out, EPrimordiaTier::Detail, TEXT("Stars"), PrimordiaAssets::Cube);
		Detail.bPrimary = true;
		const int32 Stars = FMath::Min(Max, FMath::RoundToInt(Layer.Param(TEXT("star_count"), 800.f)));
		const float Band = Unit(Layer.Param(TEXT("band_strength"), 0.5f));
		const float Tilt = FMath::DegreesToRadians(FMath::Clamp(Layer.Param(TEXT("band_tilt_deg"), 25.f), -90.f, 90.f));
		const float BandYaw = DS.Angle();
		// Band plane: tilt 0 is a great circle through the zenith, 90 is the horizon.
		const FVector N(FMath::Cos(Tilt) * FMath::Cos(BandYaw), FMath::Cos(Tilt) * FMath::Sin(BandYaw), FMath::Sin(Tilt));
		FVector E1 = FVector::CrossProduct(N, FVector::UpVector);
		E1 = E1.SizeSquared() < 1e-6 ? FVector::ForwardVector : E1.GetSafeNormal();
		const FVector E2 = FVector::CrossProduct(N, E1);
		const float BandWidth = 0.14f; // radians
		for (int32 i = 0; i < Stars; ++i)
		{
			FVector Dir;
			float InBand = 0.f;
			if (DS.U() < Band)
			{
				const float Phi = DS.Angle();
				const float Off = DS.Bell();
				const float Lat = Off * BandWidth;
				Dir = (FMath::Cos(Phi) * E1 + FMath::Sin(Phi) * E2) * FMath::Cos(Lat) + N * FMath::Sin(Lat);
				if (Dir.Z < 0.f)
				{
					Dir = -Dir; // the band is a great circle: its antipode is on it too
				}
				InBand = 1.f - FMath::Abs(Off);
			}
			else
			{
				const float Z = DS.U();
				const float Phi = DS.Angle();
				const float Ring = FMath::Sqrt(1.f - Z * Z);
				Dir = FVector(Ring * FMath::Cos(Phi), Ring * FMath::Sin(Phi), Z);
			}
			const float U = DS.U();
			const float Magnitude = U * U * U * U; // many faint stars, few bright ones
			const float S = 30.f + 230.f * Magnitude;
			const FQuat Rot = RandomRotation(DS);
			const float Seed01 = DS.U();
			Detail.Add(FTransform(Rot, Dir * R, FVector(S / 100.f)), FVector4f(Seed01, Magnitude, Dir.Z, InBand));
		}
	}

	// -----------------------------------------------------------------------
	// ring: tangent-aligned shards with gaps and an optional partial arc; keystones.
	// -----------------------------------------------------------------------
	void ComposeRing(const FPrimordiaRealmLayer& Layer, uint32 Seed, int32 Max, FPrimordiaLayerComposition& Out)
	{
		const float R = Layer.Radius;
		const float Thickness = FMath::Max(10.f, Layer.Param(TEXT("thickness"), 300.f));
		const float Arc = FMath::Clamp(Layer.Param(TEXT("arc"), 1.f), 0.05f, 1.f);

		FStream HS(TierSeed(Seed, Layer, HeroStream));
		FPrimordiaTierCandidates& Hero = NewTier(Out, EPrimordiaTier::Hero, TEXT("Keystones"), PrimordiaAssets::Cube);
		Hero.bCastShadow = true;
		const int32 Keystones = Count(Layer, TEXT("keystones"), 6.f, 0, 24);
		for (int32 k = 0; k < Keystones; ++k)
		{
			const float A = Arc * 2.f * PI * (k + 0.5f) / Keystones + HS.Range(-0.05f, 0.05f);
			const float Len = Thickness * HS.Range(1.2f, 2.f);
			const float Height = Thickness * HS.Range(0.7f, 1.f);
			const FVector2f P = Polar(R, A);
			const float Z = Thickness * 0.1f * HS.Bell();
			const float Seed01 = HS.U();
			Hero.Add(FTransform(FRotator(0.f, FMath::RadiansToDegrees(A) + 90.f, 0.f), FVector(P.X, P.Y, Z), FVector(Len, 0.25f * Thickness, Height) / 100.f),
				FVector4f(Seed01, Len / (2.f * Thickness), 0.5f, A / (2.f * PI)));
		}

		FStream DS(TierSeed(Seed, Layer, PrimaryStream));
		FPrimordiaTierCandidates& Detail = NewTier(Out, EPrimordiaTier::Detail, TEXT("Shards"), PrimordiaAssets::Cube);
		Detail.bPrimary = true;
		const int32 Gaps = Count(Layer, TEXT("gap_count"), 2.f, 0, 6);
		TArray<FVector2f> GapBands; // (centre, half width) in units of Thickness
		for (int32 g = 0; g < Gaps; ++g)
		{
			GapBands.Add(FVector2f(DS.Range(-0.4f, 0.4f), DS.Range(0.03f, 0.06f)));
		}
		auto InGap = [&GapBands](float Off)
		{
			for (const FVector2f& G : GapBands)
			{
				if (FMath::Abs(Off - G.X) < G.Y) return true;
			}
			return false;
		};
		const int32 Shards = FMath::Min(Max, 900);
		for (int32 i = 0; i < Shards; ++i)
		{
			// Random angles (not sequential): a density prefix thins the whole ring evenly.
			const float A = DS.U() * Arc * 2.f * PI;
			float Off = 0.5f * DS.Bell();
			for (int32 Attempt = 0; Attempt < 8 && InGap(Off); ++Attempt)
			{
				Off = 0.5f * DS.Bell();
			}
			const float U = DS.U();
			const float S = 30.f + 220.f * U * U * U;
			const FVector Scale = S * DS.Scale3(0.5f, 1.f) * FVector(2.2f, 0.8f, 0.5f); // long, thin shards
			const float Pitch = 35.f * DS.Bell();
			const float Roll = 35.f * DS.Bell();
			const FRotator Rot(Pitch, FMath::RadiansToDegrees(A) + 90.f, Roll); // along the orbit, tumbling
			const FVector2f P = Polar(R + Off * Thickness, A);
			const float Z = DS.Bell() * Thickness * 0.08f;
			const float Seed01 = DS.U();
			Detail.Add(FTransform(Rot, FVector(P.X, P.Y, Z), Scale / 100.f),
				FVector4f(Seed01, S / 250.f, Off + 0.5f, A / (2.f * PI)));
		}
	}

	// -----------------------------------------------------------------------
	// lattice: crystal nodes on a cubic grid, struts between visible neighbours.
	// -----------------------------------------------------------------------
	void ComposeLattice(const FPrimordiaRealmLayer& Layer, uint32 Seed, int32 Max, FPrimordiaLayerComposition& Out)
	{
		const float R = Layer.Radius;
		const float Cell = FMath::Max(50.f, Layer.Param(TEXT("cell_size"), 800.f));
		const int32 N = FMath::Clamp(FMath::FloorToInt(R / Cell), 1, 20);

		FStream HS(TierSeed(Seed, Layer, PrimaryStream));
		TArray<FIntVector> Coords;
		for (int32 X = -N; X <= N; ++X)
		for (int32 Y = -N; Y <= N; ++Y)
		for (int32 Z = -N; Z <= N; ++Z)
		{
			if (FVector(X * Cell, Y * Cell, Z * Cell).Size() <= R)
			{
				Coords.Add(FIntVector(X, Y, Z));
			}
		}
		// Deterministic shuffle so a density prefix samples the whole lattice evenly.
		for (int32 i = Coords.Num() - 1; i > 0; --i)
		{
			Coords.Swap(i, FMath::Min(i, static_cast<int32>(HS.U() * (i + 1))));
		}
		if (Coords.Num() > Max)
		{
			Coords.SetNum(Max);
		}

		FPrimordiaTierCandidates& Hero = NewTier(Out, EPrimordiaTier::Hero, TEXT("Nodes"), PrimordiaAssets::Cube);
		Hero.bPrimary = true;
		TMap<FIntVector, int32> IndexOf;
		const FQuat OnCorner = FRotator(35.264f, 45.f, 0.f).Quaternion(); // a cube standing on its corner reads as a crystal
		for (int32 i = 0; i < Coords.Num(); ++i)
		{
			const FVector P = FVector(Coords[i]) * Cell;
			const float Radial = P.Size() / R;
			const float S = Cell * 0.08f * (1.f + 0.6f * (1.f - Radial));
			Hero.Add(FTransform(OnCorner, P, FVector(S / 100.f)), FVector4f(HS.U(), 1.f - Radial, Radial, 0.5f + 0.5f * P.Z / R));
			IndexOf.Add(Coords[i], i);
		}

		FStream DS(TierSeed(Seed, Layer, DetailStream));
		FPrimordiaTierCandidates& Detail = NewTier(Out, EPrimordiaTier::Detail, TEXT("Struts"), PrimordiaAssets::Cylinder);
		const float Chance = Unit(Layer.Param(TEXT("struts"), 0.6f));
		const float Thick = Cell * 0.018f;
		const FIntVector Axes[3] = { FIntVector(1, 0, 0), FIntVector(0, 1, 0), FIntVector(0, 0, 1) };
		// The engine cylinder runs along Z: pitch 90 lays it along X, roll 90 along Y.
		const FQuat AxisRot[3] = { FRotator(90.f, 0.f, 0.f).Quaternion(), FRotator(0.f, 0.f, 90.f).Quaternion(), FQuat::Identity };
		for (int32 a = 0; a < Coords.Num(); ++a)
		{
			for (int32 Axis = 0; Axis < 3; ++Axis)
			{
				const int32* B = IndexOf.Find(Coords[a] + Axes[Axis]);
				if (!B || DS.U() >= Chance)
				{
					continue;
				}
				const FVector Mid = (FVector(Coords[a]) + 0.5f * FVector(Axes[Axis])) * Cell;
				// A strut shows only once both of its nodes do.
				Detail.AddGated(FTransform(AxisRot[Axis], Mid, FVector(Thick / 100.f, Thick / 100.f, Cell / 100.f)),
					FVector4f(DS.U(), 0.f, Mid.Size() / R, Axis * 0.5f), FMath::Max(a, *B));
			}
		}
		FinishGated(Detail, Max);
	}

	// -----------------------------------------------------------------------
	// spire_field: clusters tallest at their centre, leaning outward, with shard skirts.
	// -----------------------------------------------------------------------
	void ComposeSpires(const FPrimordiaRealmLayer& Layer, uint32 Seed, int32 Max, const FPrimordiaGroundSurface* Ground, FPrimordiaLayerComposition& Out)
	{
		const float R = Layer.Radius;
		const float MaxHeight = Layer.Param(TEXT("max_height"), 2500.f);
		const float Falloff = FMath::Clamp(Layer.Param(TEXT("falloff"), 1.5f), 0.25f, 4.f);
		const int32 Clusters = Count(Layer, TEXT("spire_clusters"), 4.f, 1, 16);
		// Height of the ground under (x, y), in this layer's frame.
		auto Floor = [&](const FVector2f& P)
		{
			return Ground ? Ground->Altitude - Layer.Altitude + Ground->HeightAt(P.X, P.Y) : 0.f;
		};

		FStream HS(TierSeed(Seed, Layer, PrimaryStream));
		FPrimordiaTierCandidates& Hero = NewTier(Out, EPrimordiaTier::Hero, TEXT("Spires"), PrimordiaAssets::Cone);
		Hero.bPrimary = true;
		Hero.bCastShadow = true;
		const int32 Cap = FMath::Min(Max, 300);
		const float S = R * FMath::Clamp(0.9f / FMath::Sqrt(static_cast<float>(Clusters)), 0.15f, 0.6f);
		const TArray<FVector2f> Centres = SpreadPoints(HS, Clusters, FMath::Max(0.f, 0.85f * R - 0.5f * S), 1.2f * S);
		FDiscSampler Sampler(0.5f * (0.08f * MaxHeight + 50.f));
		TArray<float> Heights;

		auto AddSpire = [&](const FVector2f& P, float H, float LeanAngle, float LeanDeg, float Weight) -> bool
		{
			const float W = 0.08f * H + 50.f;
			if (Hero.Num() >= Cap || !Sampler.TryAdd(P, 0.5f * W))
			{
				return false;
			}
			const float Seed01 = HS.U();
			Hero.Add(FTransform(Lean(LeanAngle, LeanDeg), FVector(P.X, P.Y, Floor(P) + 0.47f * H), FVector(W / 100.f, W / 100.f, H / 100.f)),
				FVector4f(Seed01, H / FMath::Max(1.f, MaxHeight), P.Size() / R, Weight));
			Heights.Add(H);
			return true;
		};

		// Per cluster: samples sorted by distance from the centre, so rank 0 is the crown spire.
		// Ranks are interleaved across clusters, so a density prefix keeps every cluster's tallest.
		const int32 PerCluster = Centres.Num() ? FMath::RoundToInt(0.8f * Cap / Centres.Num()) : 0;
		TArray<TArray<FVector2f>> Offsets;
		for (int32 c = 0; c < Centres.Num(); ++c)
		{
			TArray<FVector2f>& O = Offsets.AddDefaulted_GetRef();
			O.Add(FVector2f::ZeroVector);
			for (int32 j = 1; j < PerCluster; ++j)
			{
				O.Add(HS.InDisc(S));
			}
			O.Sort([](const FVector2f& A, const FVector2f& B) { return A.SizeSquared() < B.SizeSquared(); });
		}
		for (int32 j = 0; j < PerCluster; ++j)
		{
			for (int32 c = 0; c < Centres.Num(); ++c)
			{
				const FVector2f Off = Offsets[c][j];
				const float D = FMath::Min(1.f, Off.Size() / S);
				const float Weight = FMath::Pow(1.f - D, Falloff);
				const float H = MaxHeight * (0.12f + 0.88f * Weight) * HS.Range(0.85f, 1.f);
				AddSpire(Centres[c] + Off, H, FMath::Atan2(Off.Y, Off.X), D * HS.Range(4.f, 10.f), Weight);
			}
		}
		// Low outliers between the clusters.
		for (int32 Attempt = 0; Hero.Num() < Cap && Attempt < 3 * Cap; ++Attempt)
		{
			const FVector2f P = HS.InDisc(0.95f * R);
			const float H = MaxHeight * HS.Range(0.08f, 0.25f);
			const float LeanAngle = HS.Angle();
			AddSpire(P, H, LeanAngle, HS.Range(0.f, 6.f), 0.f);
		}

		FStream DS(TierSeed(Seed, Layer, DetailStream));
		FPrimordiaTierCandidates& Detail = NewTier(Out, EPrimordiaTier::Detail, TEXT("Skirts"), PrimordiaAssets::Cone);
		Detail.CullDistance = 12000.f;
		for (int32 h = 0; h < Hero.Num(); ++h)
		{
			const FVector Base = Hero.Transforms[h].GetLocation();
			const float W = 0.08f * Heights[h] + 50.f;
			const int32 Pieces = 2 + FMath::FloorToInt(DS.U() * 4.f);
			for (int32 i = 0; i < Pieces; ++i)
			{
				const float A = DS.Angle();
				const FVector2f P = FVector2f(Base.X, Base.Y) + Polar(W * DS.Range(0.55f, 1.4f), A);
				const float Hs = FMath::Max(60.f, Heights[h] * DS.Range(0.04f, 0.12f));
				const float Ws = 0.25f * Hs + 20.f;
				const FQuat Rot = Lean(A, DS.Range(15.f, 40.f)); // splayed outward
				const float Seed01 = DS.U();
				Detail.AddGated(FTransform(Rot, FVector(P.X, P.Y, Floor(P) + 0.4f * Hs), FVector(Ws / 100.f, Ws / 100.f, Hs / 100.f)),
					FVector4f(Seed01, Hs / FMath::Max(60.f, 0.12f * MaxHeight), P.Size() / R, Hero.Data[h].W), h);
			}
		}
		FinishGated(Detail, FMath::Min(Max, 900));
	}

	// -----------------------------------------------------------------------
	// void: a core at the centre of the hollow, an accretion disc of debris around it.
	// -----------------------------------------------------------------------
	void ComposeVoid(const FPrimordiaRealmLayer& Layer, uint32 Seed, int32 Max, FPrimordiaLayerComposition& Out)
	{
		const float Rv = Layer.Radius * Layer.Param(TEXT("aperture"), 0.5f);
		if (Rv <= 0.f)
		{
			return;
		}

		FStream FS(TierSeed(Seed, Layer, FixedStream));
		FPrimordiaTierCandidates& Fixed = NewTier(Out, EPrimordiaTier::Fixed, TEXT("Core"), PrimordiaAssets::Sphere);
		Fixed.Add(FTransform(FQuat::Identity, FVector::ZeroVector, FVector(0.16f * Rv / 100.f)), FVector4f(FS.U(), 1.f, 0.f, 0.f));

		FStream DS(TierSeed(Seed, Layer, DetailStream));
		FPrimordiaTierCandidates& Detail = NewTier(Out, EPrimordiaTier::Detail, TEXT("Debris"), PrimordiaAssets::Cube);
		const int32 Debris = FMath::RoundToInt(Unit(Layer.Param(TEXT("debris"), 0.5f)) * FMath::Min(Max, 800));
		const float DiscPitch = DS.Range(10.f, 35.f);
		const FQuat Disc = FRotator(DiscPitch, DS.Range(-180.f, 180.f), 0.f).Quaternion();
		for (int32 i = 0; i < Debris; ++i)
		{
			const float Ur = DS.U();
			const float Rr = Rv * (0.22f + 0.63f * Ur * Ur); // denser toward the core
			const float A = DS.Angle();
			const float H = DS.Bell() * 0.03f * Rv * (Rr / Rv + 0.2f);
			const FVector P = Disc.RotateVector(FVector(FMath::Cos(A) * Rr, FMath::Sin(A) * Rr, H));
			const float U = DS.U();
			const float S = 10.f + 110.f * U * U * U;
			const FVector Scale = S * DS.Scale3(0.6f, 1.4f);
			const FQuat Rot = RandomRotation(DS);
			const float Seed01 = DS.U();
			Detail.Add(FTransform(Rot, P, Scale / 100.f), FVector4f(Seed01, S / 120.f, Rr / Rv, A / (2.f * PI)));
		}
	}
}

// ---------------------------------------------------------------------------

int32 FPrimordiaGroundSurface::TerraceAt(float X, float Y) const
{
	for (int32 t = Radii.Num() - 1; t >= 0; --t)
	{
		if (FVector2f::DistSquared(FVector2f(X, Y), Centers[t]) <= Radii[t] * Radii[t])
		{
			return t;
		}
	}
	return INDEX_NONE;
}

float FPrimordiaGroundSurface::HeightAt(float X, float Y) const
{
	const int32 t = TerraceAt(X, Y);
	return t == INDEX_NONE ? 0.f : Tops[t];
}

bool PrimordiaComposition::StandsOnGround(const FPrimordiaRealmLayer& Layer, const FPrimordiaGroundSurface& Ground)
{
	return Layer.Kind == TEXT("spire_field") && Ground.IsValid() && FMath::Abs(Layer.Altitude - Ground.Altitude) <= 200.f;
}

FPrimordiaLayerComposition PrimordiaComposition::Compose(const FPrimordiaRealmLayer& Layer, uint32 RealmSeed, int32 MaxPerTier, const FPrimordiaGroundSurface* Ground)
{
	FPrimordiaLayerComposition Out;
	// Composers hold references to tiers while adding the next one: no reallocation allowed.
	Out.Tiers.Reserve(3);
	const int32 Max = FMath::Max(0, MaxPerTier);
	const FName Kind = Layer.Kind;
	if (Kind == TEXT("ground")) ComposeGround(Layer, RealmSeed, Max, Out);
	else if (Kind == TEXT("ocean")) ComposeOcean(Layer, RealmSeed, Max, Out);
	else if (Kind == TEXT("sky")) ComposeSky(Layer, RealmSeed, Max, Out);
	else if (Kind == TEXT("ring")) ComposeRing(Layer, RealmSeed, Max, Out);
	else if (Kind == TEXT("lattice")) ComposeLattice(Layer, RealmSeed, Max, Out);
	else if (Kind == TEXT("spire_field")) ComposeSpires(Layer, RealmSeed, Max, Ground && StandsOnGround(Layer, *Ground) ? Ground : nullptr, Out);
	else if (Kind == TEXT("void")) ComposeVoid(Layer, RealmSeed, Max, Out);
	Out.Tiers.RemoveAll([](const FPrimordiaTierCandidates& T) { return T.Num() == 0; });
	return Out;
}
