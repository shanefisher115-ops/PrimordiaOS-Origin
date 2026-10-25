#pragma once

#include "CoreMinimal.h"
#include "CadTypes.h"

/** 2D polygon geometry for the CAM kernel. */
struct PRIMORDIACADCAM_API FCadGeometry
{
	/** Positive for counter-clockwise. */
	static double SignedArea(const FCadPolygon& Poly);
	static void EnsureCounterClockwise(FCadPolygon& Poly);
	static FBox2D Bounds(const FCadPolygon& Poly);
	static double Perimeter(const FCadPolygon& Poly);
	/** Even-odd rule; points on an edge count as inside. */
	static bool Contains(const FCadPolygon& Poly, const FVector2D& P, double Tolerance = 1e-6);
	/** True when no two non-adjacent edges cross. */
	static bool IsSimple(const FCadPolygon& Poly);

	static FCadPolygon Rectangle(const FVector2D& Center, double Width, double Height);
	static FCadPolygon RegularPolygon(const FVector2D& Center, double Radius, int32 Sides, double RotationRadians = 0.0);
	/** A circle as a polygon whose chords stay within ChordTolerance of the true arc. */
	static FCadPolygon Circle(const FVector2D& Center, double Radius, double ChordTolerance = 0.01);

	/**
	 * Offsets a counter-clockwise simple polygon: positive grows it, negative shrinks it. Sharp corners
	 * are mitred up to MiterLimit x |Distance| and bevelled beyond. Returns an empty polygon when the
	 * shrunk shape vanishes or folds over itself (the tool does not fit).
	 */
	static FCadPolygon Offset(const FCadPolygon& Poly, double Distance, double MiterLimit = 2.0);

	/** Sorted x intervals where the horizontal line at Y lies inside the polygon. */
	static TArray<FVector2D> ScanlineSpans(const FCadPolygon& Poly, double Y);

	/** True if the straight segment A-B stays inside the polygon (sampled every Step mm). */
	static bool SegmentInside(const FCadPolygon& Poly, const FVector2D& A, const FVector2D& B, double Step = 0.5);
};
