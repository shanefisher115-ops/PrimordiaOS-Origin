#include "PrimordiaSigilScript.h"

namespace PrimordiaSigil
{
	namespace
	{
		// The three rings of the wheel, innermost first, each read clockwise from the top.
		const TCHAR* const Rings[] = { TEXT("AEIOU"), TEXT("BCDFGHJKL"), TEXT("MNPQRSTVWXYZ") };
		const float RingRadius[] = { 0.3f, 0.62f, 0.92f };

		bool IsVowel(TCHAR C)
		{
			return C == 'A' || C == 'E' || C == 'I' || C == 'O' || C == 'U';
		}

		FString Reduce(const FString& Text)
		{
			FString Out;
			for (TCHAR C : Text)
			{
				C = FChar::ToUpper(C);
				if (C < 'A' || C > 'Z')
				{
					continue;
				}
				if (IsVowel(C) && !Out.IsEmpty())
				{
					continue;
				}
				int32 Existing;
				if (Out.FindChar(C, Existing))
				{
					continue;
				}
				Out.AppendChar(C);
				if (Out.Len() == MaxPoints)
				{
					break;
				}
			}
			return Out;
		}

		uint32 Fnv1a(const FString& S)
		{
			uint32 H = 2166136261u;
			for (TCHAR C : S)
			{
				H ^= static_cast<uint32>(C);
				H *= 16777619u;
			}
			return H;
		}
	}

	FVector2D WheelPosition(TCHAR C)
	{
		C = FChar::ToUpper(C);
		for (int32 Ring = 0; Ring < UE_ARRAY_COUNT(Rings); ++Ring)
		{
			const FString Letters(Rings[Ring]);
			int32 Index;
			if (Letters.FindChar(C, Index))
			{
				// Clockwise from 12 o'clock.
				const float Angle = UE_HALF_PI - UE_TWO_PI * static_cast<float>(Index) / Letters.Len();
				return FVector2D(FMath::Cos(Angle), FMath::Sin(Angle)) * RingRadius[Ring];
			}
		}
		return FVector2D::ZeroVector;
	}

	FInscription Inscribe(const FString& Intent, const FString& Fallback)
	{
		FInscription Out;
		Out.Reduced = Reduce(Intent);
		if (Out.Reduced.IsEmpty())
		{
			Out.Reduced = Reduce(Fallback);
		}
		for (TCHAR C : Out.Reduced)
		{
			Out.Points.Add(WheelPosition(C));
		}
		Out.Seed = static_cast<float>(Fnv1a(Out.Reduced) >> 8) / static_cast<float>(1 << 24);
		return Out;
	}
}
