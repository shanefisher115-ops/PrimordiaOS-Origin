#pragma once

#include "CoreMinimal.h"
#include "CadTypes.h"

struct PRIMORDIACADCAM_API FCadSimOptions
{
	/** Heightmap cell size in mm; 0 = a sixth of the tool diameter, clamped to [0.1, 2]. */
	double CellSize = 0.0;
	/** Cells per axis are capped; the cell grows if the stock is large. */
	int32 MaxCellsPerAxis = 600;
	/** mm/min for G0 time estimates. */
	double RapidRate = 5000.0;
	/** Material thinner than this above the tool is not counted as a collision or a cut. */
	double Tolerance = 0.01;
	bool bKeepHeightMap = false;
};

/**
 * Dexel (heightmap) material-removal simulation of a flat end mill.
 *
 * The stock top is a grid of heights starting at 0. Every move is sampled at half a cell; at each
 * sample the tool's disk footprint lowers the heights it covers to the tool tip. Rapids that would
 * remove material are collisions; moves below the stock bottom are over-cuts; moves deeper than the
 * flute length are flute overruns. Time is feed length / feed + rapid length / rapid rate.
 */
class PRIMORDIACADCAM_API FCadFabricationSimulator
{
public:
	FCadSimOptions Options;

	FCadSimReport Simulate(const FCadStock& Stock, const FCadTool& Tool, const TArray<FCadMove>& Moves) const;
};
