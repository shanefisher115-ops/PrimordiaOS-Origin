#include "PrimordiaTopology.h"
#include <cmath>

double FPrimordiaRandom::Next()
{
	// Same integer ops as JS: Math.imul == 32-bit wrapping multiply.
	State += 0x6d2b79f5u;
	uint32 T = State;
	T = (T ^ (T >> 15)) * (T | 1u);
	T ^= T + (T ^ (T >> 7)) * (T | 61u);
	return static_cast<double>(T ^ (T >> 14)) / 4294967296.0;
}

uint32 FPrimordiaRandom::HashString(const FString& Str)
{
	// FNV-1a over UTF-16 code units, like String.prototype.charCodeAt.
	uint32 H = 0x811c9dc5u;
	for (const TCHAR Ch : Str)
	{
		H ^= static_cast<uint32>(static_cast<uint16>(Ch));
		H *= 0x01000193u;
	}
	return H;
}

namespace
{
	const double GGolden = UE_DOUBLE_PI * (3.0 - std::sqrt(5.0));

	FVector FibonacciSphere(int32 I, int32 N, double Radius)
	{
		const double Y = N == 1 ? 0.0 : 1.0 - (static_cast<double>(I) / (N - 1)) * 2.0;
		const double R = std::sqrt(FMath::Max(0.0, 1.0 - Y * Y));
		const double Theta = GGolden * I;
		return FVector(std::cos(Theta) * R * Radius, std::sin(Theta) * R * Radius, Y * Radius);
	}

	struct FEdgeBuilder
	{
		FPrimordiaTopologyGraph& Graph;
		int32 N;
		TSet<uint64> Seen;

		bool Add(int32 A, int32 B, double W)
		{
			if (A == B || A < 0 || B < 0 || A >= N || B >= N)
			{
				return false;
			}
			const int32 Lo = FMath::Min(A, B), Hi = FMath::Max(A, B);
			const uint64 Key = (static_cast<uint64>(Lo) << 32) | static_cast<uint32>(Hi);
			if (Seen.Contains(Key))
			{
				return false;
			}
			Seen.Add(Key);
			Graph.Edges.Emplace(Lo, Hi, static_cast<float>(std::round(W * 10000.0) / 10000.0));
			return true;
		}
	};
}

FPrimordiaTopologyGraph PrimordiaTopology::Synthesize(const FPrimordiaTopologySpec& Spec, uint32 Seed)
{
	FPrimordiaTopologyGraph Graph;
	const int32 N = FMath::Max(1, Spec.NodeCount);
	const double R = Spec.RadiusMeters;
	const double Density = Spec.EdgeDensity;
	FPrimordiaRandom Rng(Seed);
	FEdgeBuilder Edges{ Graph, N, {} };
	Graph.Nodes.Reserve(N);

	if (Spec.Kind == TEXT("lattice"))
	{
		const int32 Side = static_cast<int32>(std::ceil(std::cbrt(static_cast<double>(N))));
		const double Step = Side > 1 ? (2.0 * R) / (Side - 1) : 0.0;
		for (int32 i = 0; i < N; ++i)
		{
			const int32 X = i % Side, Y = (i / Side) % Side, Z = i / (Side * Side);
			Graph.Nodes.Add(FVector(X * Step - R, Y * Step - R, Z * Step - R));
		}
		for (int32 i = 0; i < N; ++i)
		{
			const int32 X = i % Side, Y = (i / Side) % Side;
			if (X + 1 < Side) Edges.Add(i, i + 1, 1.0);
			if (Y + 1 < Side) Edges.Add(i, i + Side, 1.0);
			Edges.Add(i, i + Side * Side, 1.0);
		}
	}
	else if (Spec.Kind == TEXT("toroidal"))
	{
		const int32 Ring = FMath::Max(3, static_cast<int32>(std::round(std::sqrt(static_cast<double>(N)))));
		const double Minor = R / 3.0;
		const int32 Rings = static_cast<int32>(std::ceil(static_cast<double>(N) / Ring));
		for (int32 i = 0; i < N; ++i)
		{
			const double U = (static_cast<double>(i % Ring) / Ring) * UE_DOUBLE_PI * 2.0;
			const double V = (static_cast<double>(i / Ring) / Rings) * UE_DOUBLE_PI * 2.0;
			Graph.Nodes.Add(FVector((R + Minor * std::cos(U)) * std::cos(V), (R + Minor * std::cos(U)) * std::sin(V), Minor * std::sin(U)));
		}
		for (int32 i = 0; i < N; ++i)
		{
			Edges.Add(i, (i / Ring) * Ring + ((i + 1) % Ring), 1.0);
			Edges.Add(i, (i + Ring) % N, 1.0);
		}
	}
	else if (Spec.Kind == TEXT("fractal_tree"))
	{
		for (int32 i = 0; i < N; ++i)
		{
			if (i == 0)
			{
				Graph.Nodes.Add(FVector(0, 0, -R));
				continue;
			}
			const int32 Parent = (i - 1) / 3;
			const int32 Depth = static_cast<int32>(std::floor(std::log(2.0 * i + 1.0) / std::log(3.0)));
			const int32 Branch = (i - 1) % 3;
			const double Spread = R / (Depth + 1);
			const double Angle = (Branch / 3.0) * UE_DOUBLE_PI * 2.0 + Depth * 0.7 + Rng.Next() * 0.4;
			const FVector P = Graph.Nodes[Parent];
			Graph.Nodes.Add(FVector(P.X + std::cos(Angle) * Spread, P.Y + std::sin(Angle) * Spread, P.Z + (2.0 * R) / 6.0));
			Edges.Add(Parent, i, 1.0 / (Depth + 1));
		}
	}
	else if (Spec.Kind == TEXT("scale_free"))
	{
		for (int32 i = 0; i < N; ++i)
		{
			Graph.Nodes.Add(FibonacciSphere(i, N, R * (0.8 + 0.4 * Rng.Next())));
		}
		TArray<int32> Degree;
		Degree.Init(0, N);
		const int32 M = 1 + static_cast<int32>(std::round(Density * 3.0));
		for (int32 i = 1; i < N; ++i)
		{
			int64 Total = i;
			for (int32 k = 0; k < i; ++k) Total += Degree[k];
			for (int32 k = 0; k < FMath::Min(M, i); ++k)
			{
				double Pick = Rng.Next() * static_cast<double>(Total);
				int32 J = 0;
				for (; J < i - 1; ++J)
				{
					Pick -= Degree[J] + 1;
					if (Pick <= 0) break;
				}
				if (Edges.Add(i, J, 0.5 + 0.5 * Rng.Next()))
				{
					Degree[i]++;
					Degree[J]++;
				}
			}
		}
	}
	else // small_world (default)
	{
		for (int32 i = 0; i < N; ++i)
		{
			Graph.Nodes.Add(FibonacciSphere(i, N, R));
		}
		const double Rewire = Density * 0.3;
		for (int32 i = 0; i < N; ++i)
		{
			for (int32 D = 1; D <= 2; ++D)
			{
				const int32 Target = Rng.Next() < Rewire ? static_cast<int32>(std::floor(Rng.Next() * N)) : (i + D) % N;
				Edges.Add(i, Target, 0.4 + 0.6 * Rng.Next());
			}
		}
	}
	return Graph;
}
