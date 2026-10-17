#pragma once

#include "CoreMinimal.h"

/**
 * Turns a glyph's intent ("GUARD THE DREAM OF LUMENNE") into the path of its
 * monogram, the way sigils have long been made from a statement of desire:
 *
 *  1. Keep the letters A-Z, uppercase.
 *  2. Strike the vowels (except a leading one) and every letter already written,
 *     so only the intent's distinct consonant skeleton remains.
 *  3. Find each remaining letter on a three-ring letter wheel (vowels inside,
 *     B-L in the middle, M-Z outside; A, B and M at the top) and join them in order.
 *
 * The result is one stroke path of up to MaxPoints points in [-1, 1]^2, y up.
 * The volumetric shader marks its start with a circle and its end with a bar.
 */
namespace PrimordiaSigil
{
	constexpr int32 MaxPoints = 12;

	struct FInscription
	{
		/** Letters that survived reduction, in writing order ("GRDTHMFLN"). */
		FString Reduced;
		/** Wheel position of each reduced letter. */
		TArray<FVector2D> Points;
		/** [0, 1) hash of Reduced: the inscription's own phase for depth and motion. */
		float Seed = 0.f;
	};

	/** Fallback is used when Intent has no letters (e.g. a glyph id like "sigil-3"). */
	PRIMORDIAOSREALMBRIDGE_API FInscription Inscribe(const FString& Intent, const FString& Fallback = FString());

	/** Position of letter C ('A'..'Z') on the wheel. */
	PRIMORDIAOSREALMBRIDGE_API FVector2D WheelPosition(TCHAR C);
}
