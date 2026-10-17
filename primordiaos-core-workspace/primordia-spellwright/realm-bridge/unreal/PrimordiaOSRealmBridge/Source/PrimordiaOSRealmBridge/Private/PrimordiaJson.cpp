#include "PrimordiaJson.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "Policies/CondensedJsonPrintPolicy.h"

namespace PrimordiaJson
{
	double Num(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, double Default)
	{
		double Value = Default;
		return (O.IsValid() && O->TryGetNumberField(Field, Value) && FMath::IsFinite(Value)) ? Value : Default;
	}

	int32 Int(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, int32 Default)
	{
		return FMath::RoundToInt32(Num(O, Field, Default));
	}

	FString Str(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, const FString& Default)
	{
		FString Value;
		return (O.IsValid() && O->TryGetStringField(Field, Value)) ? Value : Default;
	}

	bool Bool(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, bool Default)
	{
		bool Value = Default;
		return (O.IsValid() && O->TryGetBoolField(Field, Value)) ? Value : Default;
	}

	bool VecFromValue(const TSharedPtr<FJsonValue>& V, FVector& Out, double Scale)
	{
		const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
		if (!V.IsValid() || !V->TryGetArray(A) || A->Num() < 3)
		{
			return false;
		}
		double X = 0, Y = 0, Z = 0;
		if (!(*A)[0]->TryGetNumber(X) || !(*A)[1]->TryGetNumber(Y) || !(*A)[2]->TryGetNumber(Z))
		{
			return false;
		}
		Out = FVector(X, Y, Z) * Scale;
		return true;
	}

	FVector Vec(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, const FVector& Default, double Scale)
	{
		FVector Out;
		return (O.IsValid() && VecFromValue(O->TryGetField(Field), Out, Scale)) ? Out : Default;
	}

	FLinearColor ColorFromValue(const TSharedPtr<FJsonValue>& V, const FLinearColor& Default)
	{
		const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
		if (!V.IsValid() || !V->TryGetArray(A) || A->Num() < 3)
		{
			return Default;
		}
		double C[4] = { 0, 0, 0, 1 };
		for (int32 i = 0; i < FMath::Min(4, A->Num()); ++i)
		{
			(*A)[i]->TryGetNumber(C[i]);
		}
		return FLinearColor(C[0], C[1], C[2], C[3]);
	}

	FLinearColor Color(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, const FLinearColor& Default)
	{
		return O.IsValid() ? ColorFromValue(O->TryGetField(Field), Default) : Default;
	}

	const TArray<TSharedPtr<FJsonValue>>* Arr(const TSharedPtr<FJsonObject>& O, const TCHAR* Field)
	{
		const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
		return (O.IsValid() && O->TryGetArrayField(Field, A)) ? A : nullptr;
	}

	TSharedPtr<FJsonObject> Obj(const TSharedPtr<FJsonObject>& O, const TCHAR* Field)
	{
		const TSharedPtr<FJsonObject>* Found = nullptr;
		return (O.IsValid() && O->TryGetObjectField(Field, Found)) ? *Found : nullptr;
	}

	TSharedPtr<FJsonValue> ResolvePath(const TSharedPtr<FJsonObject>& Root, const FString& Path)
	{
		if (!Root.IsValid())
		{
			return nullptr;
		}
		TSharedPtr<FJsonValue> Current = MakeShared<FJsonValueObject>(Root);
		TArray<FString> Segments;
		Path.ParseIntoArray(Segments, TEXT("."), true);
		for (const FString& RawSegment : Segments)
		{
			// "threads[2]" -> field "threads", then index 2 (indices may chain: "m[1][0]").
			FString Segment = RawSegment;
			TArray<int32> Indices;
			int32 Bracket;
			while (Segment.FindLastChar(TEXT('['), Bracket) && Segment.EndsWith(TEXT("]")))
			{
				Indices.Insert(FCString::Atoi(*Segment.Mid(Bracket + 1, Segment.Len() - Bracket - 2)), 0);
				Segment.LeftInline(Bracket);
			}
			if (!Segment.IsEmpty())
			{
				const TSharedPtr<FJsonObject>* Obj = nullptr;
				if (!Current->TryGetObject(Obj))
				{
					return nullptr;
				}
				Current = (*Obj)->TryGetField(Segment);
				if (!Current.IsValid())
				{
					return nullptr;
				}
			}
			for (int32 Index : Indices)
			{
				const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
				if (!Current->TryGetArray(A) || !A->IsValidIndex(Index))
				{
					return nullptr;
				}
				Current = (*A)[Index];
			}
		}
		return Current;
	}

	FString ToString(const TSharedPtr<FJsonObject>& O)
	{
		FString Out;
		if (O.IsValid())
		{
			const TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> Writer = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Out);
			FJsonSerializer::Serialize(O.ToSharedRef(), Writer);
		}
		return Out;
	}

	TSharedPtr<FJsonObject> Parse(const FString& Text)
	{
		TSharedPtr<FJsonObject> Out;
		const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Text);
		return FJsonSerializer::Deserialize(Reader, Out) ? Out : nullptr;
	}
}
