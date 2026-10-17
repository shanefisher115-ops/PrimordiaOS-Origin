#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "Dom/JsonObject.h"
#include "PrimordiaPayload.generated.h"

/**
 * Blueprint view over a PRS-1 payload. Paths use dots and indices:
 * "glyph.symmetry", "threads[0].color", "nodes[3].p".
 * Vectors and lengths are converted from meters to Unreal units by default.
 */
UCLASS(BlueprintType)
class PRIMORDIAOSREALMBRIDGE_API UPrimordiaPayload : public UObject
{
	GENERATED_BODY()

public:
	static UPrimordiaPayload* Wrap(UObject* Outer, const TSharedPtr<FJsonObject>& Json);

	TSharedPtr<FJsonObject> Json;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	bool HasField(const FString& Path) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	float GetNumber(const FString& Path, float Default = 0.f) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	int32 GetInt(const FString& Path, int32 Default = 0) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	FString GetString(const FString& Path, const FString& Default) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	bool GetBool(const FString& Path, bool Default = false) const;

	/** [x,y,z] in meters -> Unreal units (unless bConvertMetersToUnreal is false). */
	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	FVector GetVector(const FString& Path, bool bConvertMetersToUnreal = true) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	FLinearColor GetColor(const FString& Path) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	int32 GetArrayLength(const FString& Path) const;

	/** Returns a payload view rooted at an object field / array element (e.g. "threads[2]"). */
	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	UPrimordiaPayload* GetChild(const FString& Path) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Payload")
	FString ToJsonString() const;
};
