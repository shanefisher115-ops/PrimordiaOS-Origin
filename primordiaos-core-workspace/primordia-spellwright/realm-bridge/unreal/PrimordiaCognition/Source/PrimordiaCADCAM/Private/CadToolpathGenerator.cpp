#include "CadToolpathGenerator.h"

#include "CadGeometry.h"

#include "Algo/Reverse.h"

namespace
{
	FCadMove MakeMove(ECadMoveType Type, const FVector& Position, double Feed)
	{
		FCadMove M;
		M.Type = Type;
		M.Position = Position;
		M.Feed = Feed;
		return M;
	}
}

void FCadToolpath::ComputeLengths()
{
	CutLength = RapidLength = 0.0;
	for (int32 i = 1; i < Moves.Num(); ++i)
	{
		const double L = FVector::Distance(Moves[i - 1].Position, Moves[i].Position);
		(Moves[i].Type == ECadMoveType::Rapid ? RapidLength : CutLength) += L;
	}
}

TArray<double> FCadToolpathGenerator::DepthLevels(double Depth, double StepDown)
{
	TArray<double> Levels;
	Depth = FMath::Abs(Depth);
	StepDown = FMath::Max(0.01, StepDown);
	const int32 Count = FMath::Max(1, FMath::CeilToInt(Depth / StepDown - 1e-9));
	// Equal passes, never deeper than StepDown, ending exactly at the floor.
	for (int32 i = 1; i <= Count; ++i)
	{
		Levels.Add(-Depth * i / Count);
	}
	return Levels;
}

FVector FCadToolpathGenerator::Current(const FCadToolpath& Path) const
{
	return Path.Moves.Num() > 0 ? Path.Moves.Last().Position : FVector(0, 0, Options.SafeZ);
}

void FCadToolpathGenerator::RapidTo(FCadToolpath& Path, const FVector& P) const
{
	if (!Current(Path).Equals(P, 1e-6) || Path.Moves.Num() == 0)
	{
		Path.Moves.Add(MakeMove(ECadMoveType::Rapid, P, 0.0));
	}
}

void FCadToolpathGenerator::FeedTo(FCadToolpath& Path, const FVector& P, double Feed) const
{
	if (!Current(Path).Equals(P, 1e-6))
	{
		Path.Moves.Add(MakeMove(ECadMoveType::Feed, P, Feed));
	}
}

void FCadToolpathGenerator::PlungeTo(FCadToolpath& Path, double Z, double Feed) const
{
	FVector P = Current(Path);
	P.Z = Z;
	if (!Current(Path).Equals(P, 1e-6))
	{
		Path.Moves.Add(MakeMove(ECadMoveType::Plunge, P, Feed));
	}
}

void FCadToolpathGenerator::HopTo(FCadToolpath& Path, const FVector2D& XY, double CutZ, double PlungeFeed) const
{
	const FVector C = Current(Path);
	// Rapids go up first, across, then down to just above the cut, then feed in.
	RapidTo(Path, FVector(C.X, C.Y, FMath::Max(C.Z, Options.RetractZ)));
	RapidTo(Path, FVector(XY.X, XY.Y, FMath::Max(C.Z, Options.RetractZ)));
	RapidTo(Path, FVector(XY.X, XY.Y, Options.RetractZ));
	PlungeTo(Path, CutZ, PlungeFeed);
}

void FCadToolpathGenerator::Contour(const FCadPolygon& Loop, double Z, const FCadTool& Tool, FCadToolpath& Path) const
{
	if (Loop.Points.Num() < 3)
	{
		return;
	}
	const FVector2D Start = Loop.Points[0];
	const FVector C = Current(Path);
	if (FVector2D(C.X, C.Y).Equals(Start, 1e-6))
	{
		// Already over the start (a closed loop ends where it began): go straight down to the next level.
		PlungeTo(Path, Z, Tool.PlungeRate);
	}
	else
	{
		HopTo(Path, Start, Z, Tool.PlungeRate);
	}
	for (int32 i = 1; i <= Loop.Points.Num(); ++i)
	{
		const FVector2D& P = Loop.Points[i % Loop.Points.Num()];
		FeedTo(Path, FVector(P.X, P.Y, Z), Tool.FeedRate);
	}
}

void FCadToolpathGenerator::Raster(const FCadPolygon& Region, double Z, const FCadTool& Tool, bool bLinksMayLeave, FCadToolpath& Path) const
{
	const FBox2D B = FCadGeometry::Bounds(Region);
	const double StepOver = FMath::Max(0.05, Tool.Diameter * FMath::Clamp(Tool.StepOverRatio, 0.05, 0.95));
	const double Height = B.Max.Y - B.Min.Y;
	// Rows evenly spaced from edge to edge, never wider apart than the step-over.
	const int32 Rows = FMath::Max(1, FMath::CeilToInt(Height / StepOver - 1e-9));
	const double Eps = FMath::Min(1e-3, Height * 1e-3);

	bool bFirst = true;
	bool bLeftToRight = true;
	for (int32 r = 0; r <= Rows; ++r)
	{
		const double Y = FMath::Clamp(B.Min.Y + Height * r / Rows, B.Min.Y + Eps, B.Max.Y - Eps);
		TArray<FVector2D> Spans = FCadGeometry::ScanlineSpans(Region, Y);
		if (Spans.Num() == 0)
		{
			continue;
		}
		if (!bLeftToRight)
		{
			Algo::Reverse(Spans);
		}
		for (const FVector2D& Span : Spans)
		{
			const FVector2D A(bLeftToRight ? Span.X : Span.Y, Y);
			const FVector2D Bp(bLeftToRight ? Span.Y : Span.X, Y);
			const FVector Cur = Current(Path);
			const FVector2D CurXY(Cur.X, Cur.Y);
			const bool bAtDepth = !bFirst && FMath::IsNearlyEqual(Cur.Z, Z, 1e-6);
			if (bAtDepth && (bLinksMayLeave || FCadGeometry::SegmentInside(Region, CurXY, A, StepOver * 0.25)))
			{
				FeedTo(Path, FVector(A.X, A.Y, Z), Tool.FeedRate);
			}
			else
			{
				HopTo(Path, A, Z, Tool.PlungeRate);
			}
			FeedTo(Path, FVector(Bp.X, Bp.Y, Z), Tool.FeedRate);
			bFirst = false;
		}
		bLeftToRight = !bLeftToRight;
	}
}

void FCadToolpathGenerator::Pocket(const FCadFeature& F, const FCadTool& Tool, FCadToolpath& Path) const
{
	const FCadPolygon Wall = FCadGeometry::Offset(F.Shape, -Tool.Radius());
	const FCadPolygon Rough = Options.FinishAllowance > 0 ? FCadGeometry::Offset(F.Shape, -(Tool.Radius() + Options.FinishAllowance)) : Wall;
	if (Wall.Points.Num() < 3 || Rough.Points.Num() < 3)
	{
		Path.Errors.Add(FString::Printf(TEXT("pocket %s is too narrow for a %.2f mm tool"), *F.Name.ToString(), Tool.Diameter));
		return;
	}
	for (const double Z : DepthLevels(F.Depth, Tool.StepDown))
	{
		Raster(Rough, Z, Tool, false, Path);
		if (Options.bFinishPass)
		{
			Contour(Wall, Z, Tool, Path);
		}
	}
	RapidTo(Path, FVector(Current(Path).X, Current(Path).Y, Options.SafeZ));
}

void FCadToolpathGenerator::Profile(const FCadFeature& F, const FCadTool& Tool, FCadToolpath& Path) const
{
	const FCadPolygon Loop = FCadGeometry::Offset(F.Shape, F.bOutside ? Tool.Radius() : -Tool.Radius());
	if (Loop.Points.Num() < 3)
	{
		Path.Errors.Add(FString::Printf(TEXT("profile %s: the %.2f mm tool does not fit inside the outline"), *F.Name.ToString(), Tool.Diameter));
		return;
	}
	for (const double Z : DepthLevels(F.Depth, Tool.StepDown))
	{
		Contour(Loop, Z, Tool, Path);
	}
	RapidTo(Path, FVector(Current(Path).X, Current(Path).Y, Options.SafeZ));
}

void FCadToolpathGenerator::Drill(const FCadFeature& F, const FCadTool& Tool, FCadToolpath& Path) const
{
	const double Peck = Options.PeckDepth > 0 ? Options.PeckDepth : Tool.Diameter;
	const double Depth = FMath::Abs(F.Depth);
	for (const FVector2D& H : F.Holes)
	{
		const FVector C = Current(Path);
		RapidTo(Path, FVector(C.X, C.Y, Options.SafeZ));
		RapidTo(Path, FVector(H.X, H.Y, Options.SafeZ));
		RapidTo(Path, FVector(H.X, H.Y, Options.RetractZ));
		double Reached = 0.0;
		while (Reached > -Depth + 1e-9)
		{
			const double Next = FMath::Max(Reached - Peck, -Depth);
			if (Reached < 0.0)
			{
				// Back down to just above the last peck, then cut the next one.
				RapidTo(Path, FVector(H.X, H.Y, Reached + 0.5));
			}
			PlungeTo(Path, Next, Tool.PlungeRate);
			RapidTo(Path, FVector(H.X, H.Y, Options.RetractZ)); // clear chips
			Reached = Next;
		}
		RapidTo(Path, FVector(H.X, H.Y, Options.SafeZ));
	}
}

void FCadToolpathGenerator::Face(const FCadFeature& F, const FCadPart& Part, const FCadTool& Tool, FCadToolpath& Path) const
{
	const FVector& S = Part.Stock.Size;
	const double R = Tool.Radius();
	const FCadPolygon Region = FCadGeometry::Rectangle(FVector2D(S.X * 0.5, S.Y * 0.5), S.X + 2.0 * R, S.Y + 2.0 * R);
	for (const double Z : DepthLevels(F.Depth, Tool.StepDown))
	{
		Raster(Region, Z, Tool, true, Path);
	}
	RapidTo(Path, FVector(Current(Path).X, Current(Path).Y, Options.SafeZ));
}

FCadToolpath FCadToolpathGenerator::Generate(const FCadPart& Part, const FCadTool& Tool) const
{
	FCadToolpath Path;
	Path.Tool = Tool;
	Path.SafeZ = Options.SafeZ;
	Path.Moves.Add(MakeMove(ECadMoveType::Rapid, FVector(0, 0, Options.SafeZ), 0.0));

	// Facing first, then pockets and holes, and profiles last (they free the part).
	TArray<const FCadFeature*> Ordered;
	for (const ECadFeatureKind Kind : {ECadFeatureKind::Face, ECadFeatureKind::Pocket, ECadFeatureKind::Drill, ECadFeatureKind::Profile})
	{
		for (const FCadFeature& F : Part.Features)
		{
			if (F.Kind == Kind)
			{
				Ordered.Add(&F);
			}
		}
	}
	for (const FCadFeature* F : Ordered)
	{
		if (FMath::Abs(F->Depth) > Part.Stock.Size.Z + 1e-6 && F->Kind != ECadFeatureKind::Profile)
		{
			Path.Errors.Add(FString::Printf(TEXT("%s is %.2f mm deep but the stock is %.2f mm thick"), *F->Name.ToString(), F->Depth, Part.Stock.Size.Z));
			continue;
		}
		switch (F->Kind)
		{
		case ECadFeatureKind::Pocket: Pocket(*F, Tool, Path); break;
		case ECadFeatureKind::Profile: Profile(*F, Tool, Path); break;
		case ECadFeatureKind::Drill: Drill(*F, Tool, Path); break;
		case ECadFeatureKind::Face: Face(*F, Part, Tool, Path); break;
		}
	}
	const FVector End = Current(Path);
	RapidTo(Path, FVector(End.X, End.Y, Options.SafeZ));
	RapidTo(Path, FVector(0, 0, Options.SafeZ));
	Path.ComputeLengths();
	return Path;
}
