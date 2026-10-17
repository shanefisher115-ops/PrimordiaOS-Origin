#include "PrimordiaPayload.h"
#include "PrimordiaJson.h"
#include "PrimordiaBridgeSettings.h"

UPrimordiaPayload* UPrimordiaPayload::Wrap(UObject* Outer, const TSharedPtr<FJsonObject>& InJson)
{
	UPrimordiaPayload* Payload = NewObject<UPrimordiaPayload>(Outer ? Outer : GetTransientPackage());
	Payload->Json = InJson.IsValid() ? InJson : MakeShared<FJsonObject>();
	return Payload;
}

bool UPrimordiaPayload::HasField(const FString& Path) const
{
	return PrimordiaJson::ResolvePath(Json, Path).IsValid();
}

float UPrimordiaPayload::GetNumber(const FString& Path, float Default) const
{
	double Value = Default;
	const TSharedPtr<FJsonValue> V = PrimordiaJson::ResolvePath(Json, Path);
	return (V.IsValid() && V->TryGetNumber(Value)) ? static_cast<float>(Value) : Default;
}

int32 UPrimordiaPayload::GetInt(const FString& Path, int32 Default) const
{
	return FMath::RoundToInt32(GetNumber(Path, static_cast<float>(Default)));
}

FString UPrimordiaPayload::GetString(const FString& Path, const FString& Default) const
{
	FString Value;
	const TSharedPtr<FJsonValue> V = PrimordiaJson::ResolvePath(Json, Path);
	return (V.IsValid() && V->TryGetString(Value)) ? Value : Default;
}

bool UPrimordiaPayload::GetBool(const FString& Path, bool Default) const
{
	bool Value = Default;
	const TSharedPtr<FJsonValue> V = PrimordiaJson::ResolvePath(Json, Path);
	return (V.IsValid() && V->TryGetBool(Value)) ? Value : Default;
}

FVector UPrimordiaPayload::GetVector(const FString& Path, bool bConvertMetersToUnreal) const
{
	FVector Out = FVector::ZeroVector;
	const double Scale = bConvertMetersToUnreal ? UPrimordiaBridgeSettings::Get()->UnitsPerMeter : 1.0;
	PrimordiaJson::VecFromValue(PrimordiaJson::ResolvePath(Json, Path), Out, Scale);
	return Out;
}

FLinearColor UPrimordiaPayload::GetColor(const FString& Path) const
{
	return PrimordiaJson::ColorFromValue(PrimordiaJson::ResolvePath(Json, Path), FLinearColor::White);
}

int32 UPrimordiaPayload::GetArrayLength(const FString& Path) const
{
	const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
	const TSharedPtr<FJsonValue> V = PrimordiaJson::ResolvePath(Json, Path);
	return (V.IsValid() && V->TryGetArray(A)) ? A->Num() : 0;
}

UPrimordiaPayload* UPrimordiaPayload::GetChild(const FString& Path) const
{
	const TSharedPtr<FJsonObject>* Obj = nullptr;
	const TSharedPtr<FJsonValue> V = PrimordiaJson::ResolvePath(Json, Path);
	if (V.IsValid() && V->TryGetObject(Obj))
	{
		return Wrap(GetOuter(), *Obj);
	}
	return nullptr;
}

FString UPrimordiaPayload::ToJsonString() const
{
	return PrimordiaJson::ToString(Json);
}
