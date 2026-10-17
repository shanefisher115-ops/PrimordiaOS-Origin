#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"

/** Tolerant readers for PRS-1 payloads: missing or mistyped fields fall back to defaults. */
namespace PrimordiaJson
{
	PRIMORDIAOSREALMBRIDGE_API double Num(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, double Default = 0.0);
	PRIMORDIAOSREALMBRIDGE_API int32 Int(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, int32 Default = 0);
	PRIMORDIAOSREALMBRIDGE_API FString Str(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, const FString& Default = FString());
	PRIMORDIAOSREALMBRIDGE_API bool Bool(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, bool Default = false);

	/** [x, y, z] -> FVector, multiplied by Scale (use UnitsPerMeter for positions). */
	PRIMORDIAOSREALMBRIDGE_API bool VecFromValue(const TSharedPtr<FJsonValue>& V, FVector& Out, double Scale = 1.0);
	PRIMORDIAOSREALMBRIDGE_API FVector Vec(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, const FVector& Default = FVector::ZeroVector, double Scale = 1.0);

	/** [r, g, b] or [r, g, b, a] (linear) -> FLinearColor. */
	PRIMORDIAOSREALMBRIDGE_API FLinearColor ColorFromValue(const TSharedPtr<FJsonValue>& V, const FLinearColor& Default = FLinearColor::White);
	PRIMORDIAOSREALMBRIDGE_API FLinearColor Color(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, const FLinearColor& Default = FLinearColor::White);

	PRIMORDIAOSREALMBRIDGE_API const TArray<TSharedPtr<FJsonValue>>* Arr(const TSharedPtr<FJsonObject>& O, const TCHAR* Field);
	PRIMORDIAOSREALMBRIDGE_API TSharedPtr<FJsonObject> Obj(const TSharedPtr<FJsonObject>& O, const TCHAR* Field);

	/** Resolves "glyph.symmetry" or "threads[2].color" against an object. */
	PRIMORDIAOSREALMBRIDGE_API TSharedPtr<FJsonValue> ResolvePath(const TSharedPtr<FJsonObject>& Root, const FString& Path);

	PRIMORDIAOSREALMBRIDGE_API FString ToString(const TSharedPtr<FJsonObject>& O);
	PRIMORDIAOSREALMBRIDGE_API TSharedPtr<FJsonObject> Parse(const FString& Text);
}
