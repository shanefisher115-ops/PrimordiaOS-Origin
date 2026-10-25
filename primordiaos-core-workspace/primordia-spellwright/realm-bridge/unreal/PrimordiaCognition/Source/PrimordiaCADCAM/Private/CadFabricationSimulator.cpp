#include "CadFabricationSimulator.h"

FCadSimReport FCadFabricationSimulator::Simulate(const FCadStock& Stock, const FCadTool& Tool, const TArray<FCadMove>& Moves) const
{
	FCadSimReport R;
	const double SX = FMath::Max(Stock.Size.X, 0.1);
	const double SY = FMath::Max(Stock.Size.Y, 0.1);
	const double Floor = -FMath::Max(Stock.Size.Z, 0.01);
	const double Radius = FMath::Max(Tool.Radius(), 0.01);

	double Cell = Options.CellSize > 0 ? Options.CellSize : FMath::Clamp(Tool.Diameter / 6.0, 0.1, 2.0);
	Cell = FMath::Max(Cell, FMath::Max(SX, SY) / FMath::Max(16, Options.MaxCellsPerAxis));
	const int32 NX = FMath::Max(1, FMath::CeilToInt(SX / Cell));
	const int32 NY = FMath::Max(1, FMath::CeilToInt(SY / Cell));
	R.GridX = NX;
	R.GridY = NY;
	R.CellSize = Cell;

	TArray<float> Height;
	Height.Init(0.f, NX * NY);

	// Cells covered by the tool, as offsets from the cell under the tool centre.
	TArray<FIntPoint> Disk;
	const int32 RC = FMath::CeilToInt(Radius / Cell);
	for (int32 dy = -RC; dy <= RC; ++dy)
	{
		for (int32 dx = -RC; dx <= RC; ++dx)
		{
			if (FMath::Square(dx * Cell) + FMath::Square(dy * Cell) <= FMath::Square(Radius))
			{
				Disk.Add(FIntPoint(dx, dy));
			}
		}
	}
	const double CellArea = Cell * Cell;
	const double Tol = Options.Tolerance;

	R.MinZ = Moves.Num() > 0 ? Moves[0].Position.Z : 0.0;
	for (int32 m = 1; m < Moves.Num(); ++m)
	{
		const FCadMove& Move = Moves[m];
		const FVector A = Moves[m - 1].Position;
		const FVector B = Move.Position;
		const double Len = FVector::Distance(A, B);
		R.MinZ = FMath::Min(R.MinZ, B.Z);

		if (Move.Type == ECadMoveType::Rapid)
		{
			R.RapidLength += Len;
			R.MachiningSeconds += Len / FMath::Max(Options.RapidRate, 1.0) * 60.0;
		}
		else
		{
			R.CutLength += Len;
			R.MachiningSeconds += Len / FMath::Max(Move.Feed, 1.0) * 60.0;
		}
		if (B.Z < Floor - Tol)
		{
			++R.OverCuts;
			R.Warnings.Add(FString::Printf(TEXT("move %d goes %.3f mm below the stock bottom"), m, Floor - B.Z));
		}
		if (-FMath::Min(A.Z, B.Z) > Tool.FluteLength + Tol)
		{
			++R.FluteOverruns;
		}
		if (FMath::Min(A.Z, B.Z) >= -Tol && Move.Type != ECadMoveType::Rapid)
		{
			continue; // above the stock: cuts nothing
		}
		if (FMath::Min(A.Z, B.Z) >= Tol)
		{
			continue;
		}

		const int32 Samples = FMath::Max(1, FMath::CeilToInt(Len / (Cell * 0.5)));
		bool bCollided = false;
		double Removed = 0.0;
		for (int32 s = 0; s <= Samples; ++s)
		{
			const FVector P = FMath::Lerp(A, B, static_cast<double>(s) / Samples);
			const int32 CX = FMath::FloorToInt(P.X / Cell);
			const int32 CY = FMath::FloorToInt(P.Y / Cell);
			const float Tip = static_cast<float>(FMath::Max(P.Z, Floor));
			for (const FIntPoint& D : Disk)
			{
				const int32 X = CX + D.X;
				const int32 Y = CY + D.Y;
				if (X < 0 || Y < 0 || X >= NX || Y >= NY)
				{
					continue;
				}
				float& H = Height[Y * NX + X];
				if (H > Tip + Tol)
				{
					if (Move.Type == ECadMoveType::Rapid)
					{
						bCollided = true;
					}
					Removed += (H - Tip) * CellArea;
					H = Tip;
				}
			}
		}
		R.RemovedVolume += Removed;
		if (bCollided)
		{
			++R.RapidCollisions;
			R.Warnings.Add(FString::Printf(TEXT("rapid move %d passes through material near (%.2f, %.2f, %.2f)"), m, B.X, B.Y, B.Z));
		}
		else if (Move.Type != ECadMoveType::Rapid && Removed <= Tol * CellArea && FMath::Min(A.Z, B.Z) < -Tol)
		{
			R.AirCutLength += Len;
		}
	}

	if (R.FluteOverruns > 0)
	{
		R.Warnings.Add(FString::Printf(TEXT("%d moves cut deeper than the %.1f mm flute length"), R.FluteOverruns, Tool.FluteLength));
	}
	// Keep the warning list readable.
	if (R.Warnings.Num() > 50)
	{
		const int32 Dropped = R.Warnings.Num() - 50;
		R.Warnings.SetNum(50);
		R.Warnings.Add(FString::Printf(TEXT("... and %d more"), Dropped));
	}
	R.bOk = R.RapidCollisions == 0 && R.OverCuts == 0 && R.FluteOverruns == 0;
	if (Options.bKeepHeightMap)
	{
		R.HeightMap = MoveTemp(Height);
	}
	return R;
}
