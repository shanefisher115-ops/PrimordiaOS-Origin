#include "CadGeometry.h"

#include "Algo/Reverse.h"

namespace
{
	double Cross(const FVector2D& A, const FVector2D& B) { return A.X * B.Y - A.Y * B.X; }

	bool SegmentsCross(const FVector2D& A, const FVector2D& B, const FVector2D& C, const FVector2D& D)
	{
		const double D1 = Cross(B - A, C - A);
		const double D2 = Cross(B - A, D - A);
		const double D3 = Cross(D - C, A - C);
		const double D4 = Cross(D - C, B - C);
		return ((D1 > 0 && D2 < 0) || (D1 < 0 && D2 > 0)) && ((D3 > 0 && D4 < 0) || (D3 < 0 && D4 > 0));
	}

	double DistanceToSegment(const FVector2D& P, const FVector2D& A, const FVector2D& B)
	{
		const FVector2D AB = B - A;
		const double Len2 = AB.SizeSquared();
		const double T = Len2 > 0 ? FMath::Clamp(FVector2D::DotProduct(P - A, AB) / Len2, 0.0, 1.0) : 0.0;
		return FVector2D::Distance(P, A + AB * T);
	}

	void RemoveDegenerate(TArray<FVector2D>& Pts, double Eps)
	{
		for (int32 i = Pts.Num() - 1; i >= 0 && Pts.Num() > 2; --i)
		{
			const int32 Prev = (i + Pts.Num() - 1) % Pts.Num();
			if (FVector2D::Distance(Pts[i], Pts[Prev]) < Eps)
			{
				Pts.RemoveAt(i);
			}
		}
	}
}

double FCadGeometry::SignedArea(const FCadPolygon& Poly)
{
	double A = 0.0;
	const int32 N = Poly.Points.Num();
	for (int32 i = 0; i < N; ++i)
	{
		A += Cross(Poly.Points[i], Poly.Points[(i + 1) % N]);
	}
	return A * 0.5;
}

void FCadGeometry::EnsureCounterClockwise(FCadPolygon& Poly)
{
	if (SignedArea(Poly) < 0.0)
	{
		Algo::Reverse(Poly.Points);
	}
}

FBox2D FCadGeometry::Bounds(const FCadPolygon& Poly)
{
	FBox2D Box(ForceInit);
	for (const FVector2D& P : Poly.Points)
	{
		Box += P;
	}
	return Box;
}

double FCadGeometry::Perimeter(const FCadPolygon& Poly)
{
	double L = 0.0;
	const int32 N = Poly.Points.Num();
	for (int32 i = 0; i < N; ++i)
	{
		L += FVector2D::Distance(Poly.Points[i], Poly.Points[(i + 1) % N]);
	}
	return L;
}

bool FCadGeometry::Contains(const FCadPolygon& Poly, const FVector2D& P, double Tolerance)
{
	const int32 N = Poly.Points.Num();
	if (N < 3)
	{
		return false;
	}
	bool bInside = false;
	for (int32 i = 0, j = N - 1; i < N; j = i++)
	{
		const FVector2D& A = Poly.Points[i];
		const FVector2D& B = Poly.Points[j];
		if (DistanceToSegment(P, A, B) <= Tolerance)
		{
			return true;
		}
		if ((A.Y > P.Y) != (B.Y > P.Y) && P.X < (B.X - A.X) * (P.Y - A.Y) / (B.Y - A.Y) + A.X)
		{
			bInside = !bInside;
		}
	}
	return bInside;
}

bool FCadGeometry::IsSimple(const FCadPolygon& Poly)
{
	const int32 N = Poly.Points.Num();
	if (N < 3)
	{
		return false;
	}
	for (int32 i = 0; i < N; ++i)
	{
		const FVector2D& A = Poly.Points[i];
		const FVector2D& B = Poly.Points[(i + 1) % N];
		for (int32 j = i + 2; j < N; ++j)
		{
			if (i == 0 && j == N - 1)
			{
				continue; // adjacent through the wrap
			}
			if (SegmentsCross(A, B, Poly.Points[j], Poly.Points[(j + 1) % N]))
			{
				return false;
			}
		}
	}
	return true;
}

FCadPolygon FCadGeometry::Rectangle(const FVector2D& Center, double Width, double Height)
{
	FCadPolygon P;
	const double HW = Width * 0.5, HH = Height * 0.5;
	P.Points = {Center + FVector2D(-HW, -HH), Center + FVector2D(HW, -HH), Center + FVector2D(HW, HH), Center + FVector2D(-HW, HH)};
	return P;
}

FCadPolygon FCadGeometry::RegularPolygon(const FVector2D& Center, double Radius, int32 Sides, double RotationRadians)
{
	FCadPolygon P;
	Sides = FMath::Max(3, Sides);
	for (int32 i = 0; i < Sides; ++i)
	{
		const double A = RotationRadians + UE_DOUBLE_TWO_PI * i / Sides;
		P.Points.Add(Center + FVector2D(FMath::Cos(A), FMath::Sin(A)) * Radius);
	}
	return P;
}

FCadPolygon FCadGeometry::Circle(const FVector2D& Center, double Radius, double ChordTolerance)
{
	// Sagitta s = r(1 - cos(theta/2)) <= tol  =>  theta = 2 acos(1 - tol/r)
	const double Tol = FMath::Clamp(ChordTolerance, 1e-4, Radius * 0.5);
	const double Theta = 2.0 * FMath::Acos(1.0 - Tol / FMath::Max(Radius, 1e-3));
	const int32 Sides = FMath::Clamp(FMath::CeilToInt(UE_DOUBLE_TWO_PI / FMath::Max(Theta, 1e-3)), 12, 720);
	return RegularPolygon(Center, Radius, Sides);
}

FCadPolygon FCadGeometry::Offset(const FCadPolygon& InPoly, double Distance, double MiterLimit)
{
	FCadPolygon Poly = InPoly;
	EnsureCounterClockwise(Poly);
	RemoveDegenerate(Poly.Points, 1e-6);
	const int32 N = Poly.Points.Num();
	if (N < 3)
	{
		return FCadPolygon();
	}
	if (FMath::IsNearlyZero(Distance))
	{
		return Poly;
	}

	// Outward normal of edge i (from point i to i+1) on a CCW polygon is (dy, -dx).
	TArray<FVector2D> Normals;
	Normals.SetNum(N);
	for (int32 i = 0; i < N; ++i)
	{
		const FVector2D E = (Poly.Points[(i + 1) % N] - Poly.Points[i]).GetSafeNormal();
		Normals[i] = FVector2D(E.Y, -E.X);
	}

	FCadPolygon Out;
	const double Limit = MiterLimit * FMath::Abs(Distance);
	for (int32 i = 0; i < N; ++i)
	{
		const FVector2D& P = Poly.Points[i];
		const FVector2D& NPrev = Normals[(i + N - 1) % N];
		const FVector2D& NNext = Normals[i];
		const double CosA = FMath::Clamp(FVector2D::DotProduct(NPrev, NNext), -1.0, 1.0);
		const FVector2D Bisector = (NPrev + NNext).GetSafeNormal();
		const double HalfCos = FMath::Sqrt(FMath::Max((1.0 + CosA) * 0.5, 1e-9));
		const double MiterLen = FMath::Abs(Distance) / HalfCos;
		// A corner is convex in the offset direction when the turn agrees with the offset's sign.
		const double Turn = Cross(NPrev, NNext);
		const bool bOpening = (Distance > 0) == (Turn > 0);
		if (Bisector.IsNearlyZero() || (bOpening && MiterLen > Limit))
		{
			Out.Points.Add(P + NPrev * Distance);
			Out.Points.Add(P + NNext * Distance);
		}
		else
		{
			Out.Points.Add(P + Bisector * (Distance / HalfCos));
		}
	}
	RemoveDegenerate(Out.Points, 1e-6);

	// A shrink that is larger than the shape flips its orientation or makes it fold over.
	const double Area = SignedArea(Out);
	if (Out.Points.Num() < 3 || Area <= 1e-6 || !IsSimple(Out))
	{
		return FCadPolygon();
	}
	// Every vertex of a true offset is at least |Distance| from every edge of the original. An
	// over-shrunk shape can flip through itself and keep a positive area (a square rotates by 180
	// degrees), but its vertices then sit closer than |Distance| to the far edges.
	const double Need = FMath::Abs(Distance) * (1.0 - 1e-6) - 1e-9;
	for (const FVector2D& V : Out.Points)
	{
		if (Distance < 0 && !Contains(Poly, V, 1e-6))
		{
			return FCadPolygon();
		}
		for (int32 i = 0; i < N; ++i)
		{
			if (DistanceToSegment(V, Poly.Points[i], Poly.Points[(i + 1) % N]) < Need)
			{
				return FCadPolygon();
			}
		}
	}
	return Out;
}

TArray<FVector2D> FCadGeometry::ScanlineSpans(const FCadPolygon& Poly, double Y)
{
	TArray<double> Xs;
	const int32 N = Poly.Points.Num();
	for (int32 i = 0; i < N; ++i)
	{
		const FVector2D& A = Poly.Points[i];
		const FVector2D& B = Poly.Points[(i + 1) % N];
		// Half-open rule so a vertex exactly on the line is counted once.
		if ((A.Y <= Y && B.Y > Y) || (B.Y <= Y && A.Y > Y))
		{
			Xs.Add(A.X + (Y - A.Y) * (B.X - A.X) / (B.Y - A.Y));
		}
	}
	Xs.Sort();
	TArray<FVector2D> Spans;
	for (int32 i = 0; i + 1 < Xs.Num(); i += 2)
	{
		if (Xs[i + 1] - Xs[i] > 1e-6)
		{
			Spans.Add(FVector2D(Xs[i], Xs[i + 1]));
		}
	}
	return Spans;
}

bool FCadGeometry::SegmentInside(const FCadPolygon& Poly, const FVector2D& A, const FVector2D& B, double Step)
{
	const double L = FVector2D::Distance(A, B);
	const int32 Samples = FMath::Max(1, FMath::CeilToInt(L / FMath::Max(Step, 0.01)));
	for (int32 i = 0; i <= Samples; ++i)
	{
		if (!Contains(Poly, FMath::Lerp(A, B, static_cast<double>(i) / Samples), 1e-4))
		{
			return false;
		}
	}
	return true;
}
