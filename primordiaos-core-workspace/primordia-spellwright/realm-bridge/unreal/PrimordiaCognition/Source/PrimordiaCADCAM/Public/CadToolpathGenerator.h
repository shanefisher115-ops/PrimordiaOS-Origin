#pragma once

#include "CoreMinimal.h"
#include "CadTypes.h"

struct PRIMORDIACADCAM_API FCadToolpathOptions
{
	/** Height for travel between features. */
	double SafeZ = 5.0;
	/** Height for short hops inside a feature. */
	double RetractZ = 1.0;
	/** Contour the pocket wall at each level after rastering. */
	bool bFinishPass = true;
	/** Peck depth for drilling; 0 = one tool diameter. */
	double PeckDepth = 0.0;
	/** Radial stock left by roughing passes (taken off by the finish pass). */
	double FinishAllowance = 0.0;
};

/**
 * Turns features into tool moves.
 *
 * Pocket: zig-zag raster at each step-down level inside the outline inset by the tool radius, with
 * in-material links where the link stays inside the pocket and a retract-hop otherwise, then an
 * optional finishing contour. Profile: a contour at the tool-radius offset at each level.
 * Drill: peck cycles expanded into moves. Face: raster over the whole stock plus the tool radius.
 */
class PRIMORDIACADCAM_API FCadToolpathGenerator
{
public:
	FCadToolpathOptions Options;

	FCadToolpath Generate(const FCadPart& Part, const FCadTool& Tool) const;

	/** Z levels from the first step-down to -Depth inclusive. */
	static TArray<double> DepthLevels(double Depth, double StepDown);

private:
	void Pocket(const FCadFeature& F, const FCadTool& Tool, FCadToolpath& Path) const;
	void Profile(const FCadFeature& F, const FCadTool& Tool, FCadToolpath& Path) const;
	void Drill(const FCadFeature& F, const FCadTool& Tool, FCadToolpath& Path) const;
	void Face(const FCadFeature& F, const FCadPart& Part, const FCadTool& Tool, FCadToolpath& Path) const;
	void Raster(const FCadPolygon& Region, double Z, const FCadTool& Tool, bool bLinksMayLeave, FCadToolpath& Path) const;
	void Contour(const FCadPolygon& Loop, double Z, const FCadTool& Tool, FCadToolpath& Path) const;

	void RapidTo(FCadToolpath& Path, const FVector& P) const;
	void FeedTo(FCadToolpath& Path, const FVector& P, double Feed) const;
	void PlungeTo(FCadToolpath& Path, double Z, double Feed) const;
	/** Moves to XY at the current height through a retract hop (or directly if already up). */
	void HopTo(FCadToolpath& Path, const FVector2D& XY, double CutZ, double PlungeFeed) const;
	FVector Current(const FCadToolpath& Path) const;
};
