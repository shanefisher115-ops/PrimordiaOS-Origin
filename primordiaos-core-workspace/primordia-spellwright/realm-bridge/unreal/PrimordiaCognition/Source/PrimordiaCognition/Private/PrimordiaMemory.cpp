#include "PrimordiaMemory.h"

#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "JsonObjectConverter.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "PrimordiaLoreEngine.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

float FPrimordiaMemory::EffectiveSalience(const FPrimordiaMemoryRecord& R, const FDateTime& Now) const
{
	const double AgeHours = FMath::Max(0.0, (Now - R.LastSeenAt).GetTotalHours());
	const double Decay = FMath::Pow(0.5, AgeHours / FMath::Max(HalfLifeHours, 0.01));
	const double Reinforcement = 1.0 + 0.1 * FMath::Min(R.Recalls, 20) + 0.05 * FMath::Min(R.Repeats - 1, 20);
	return static_cast<float>(FMath::Clamp(R.Salience * Decay * Reinforcement, 0.0, 4.0));
}

int64 FPrimordiaMemory::Remember(FName Kind, const FString& Summary, const TArray<FName>& Tags, float Salience)
{
	const FDateTime Now = FDateTime::UtcNow();
	// Merge repeats seen recently (searching the newest records first).
	for (int32 i = Records.Num() - 1; i >= FMath::Max(0, Records.Num() - 64); --i)
	{
		FPrimordiaMemoryRecord& R = Records[i];
		if (R.Kind == Kind && R.Summary == Summary)
		{
			++R.Repeats;
			R.LastSeenAt = Now;
			R.Salience = FMath::Max(R.Salience, Salience);
			for (const FName& T : Tags) { R.Tags.AddUnique(T); }
			return R.Id;
		}
	}
	FPrimordiaMemoryRecord& R = Records.AddDefaulted_GetRef();
	R.Id = NextId++;
	R.Kind = Kind;
	R.Summary = Summary;
	R.Tags = Tags;
	R.Salience = FMath::Clamp(Salience, 0.f, 1.f);
	R.CreatedAt = R.LastSeenAt = Now;
	const int64 Id = R.Id;
	if (Records.Num() > Capacity)
	{
		Evict();
	}
	return Id;
}

void FPrimordiaMemory::Evict()
{
	const FDateTime Now = FDateTime::UtcNow();
	while (Records.Num() > Capacity)
	{
		int32 Worst = 0;
		float WorstScore = TNumericLimits<float>::Max();
		for (int32 i = 0; i < Records.Num(); ++i)
		{
			const float S = EffectiveSalience(Records[i], Now);
			if (S < WorstScore)
			{
				WorstScore = S;
				Worst = i;
			}
		}
		Records.RemoveAt(Worst);
	}
}

TArray<FPrimordiaMemoryRecord> FPrimordiaMemory::Recall(const FString& Query, const TArray<FName>& Tags, int32 Limit)
{
	const FDateTime Now = FDateTime::UtcNow();
	const TArray<FString> QueryTokens = FLoreText::Tokenize(Query);
	const TSet<FString> QuerySet(QueryTokens);

	TArray<TPair<float, int32>> Scored;
	for (int32 i = 0; i < Records.Num(); ++i)
	{
		const FPrimordiaMemoryRecord& R = Records[i];
		float Relevance = 0.f;
		if (QuerySet.Num() > 0)
		{
			const TArray<FString> Tokens = FLoreText::Tokenize(R.Summary);
			int32 Hits = 0;
			for (const FString& T : Tokens) { Hits += QuerySet.Contains(T) ? 1 : 0; }
			Relevance += static_cast<float>(Hits) / FMath::Sqrt(static_cast<float>(FMath::Max(1, Tokens.Num())));
			for (const FName& Tag : R.Tags)
			{
				Relevance += QuerySet.Contains(Tag.ToString().ToLower()) ? 0.5f : 0.f;
			}
		}
		for (const FName& Tag : Tags)
		{
			Relevance += R.Tags.Contains(Tag) ? 1.f : 0.f;
		}
		if ((QuerySet.Num() > 0 || Tags.Num() > 0) && Relevance <= 0.f)
		{
			continue;
		}
		const float Score = (QuerySet.Num() == 0 && Tags.Num() == 0 ? 1.f : Relevance) * EffectiveSalience(R, Now);
		Scored.Emplace(Score, i);
	}
	Scored.Sort([](const TPair<float, int32>& A, const TPair<float, int32>& B) { return A.Key > B.Key; });

	TArray<FPrimordiaMemoryRecord> Out;
	for (int32 k = 0; k < FMath::Min(Limit, Scored.Num()); ++k)
	{
		FPrimordiaMemoryRecord& R = Records[Scored[k].Value];
		++R.Recalls;
		Out.Add(R);
	}
	return Out;
}

TArray<FPrimordiaMemoryRecord> FPrimordiaMemory::Recent(FName Kind, int32 Limit) const
{
	TArray<FPrimordiaMemoryRecord> Out;
	for (int32 i = Records.Num() - 1; i >= 0 && Out.Num() < Limit; --i)
	{
		if (Kind.IsNone() || Records[i].Kind == Kind)
		{
			Out.Add(Records[i]);
		}
	}
	return Out;
}

int32 FPrimordiaMemory::CountKind(FName Kind) const
{
	int32 N = 0;
	for (const FPrimordiaMemoryRecord& R : Records) { N += R.Kind == Kind ? 1 : 0; }
	return N;
}

bool FPrimordiaMemory::Save(const FString& Path) const
{
	TArray<TSharedPtr<FJsonValue>> Values;
	for (const FPrimordiaMemoryRecord& R : Records)
	{
		TSharedRef<FJsonObject> Obj = MakeShared<FJsonObject>();
		FJsonObjectConverter::UStructToJsonObject(FPrimordiaMemoryRecord::StaticStruct(), &R, Obj, 0, 0);
		Values.Add(MakeShared<FJsonValueObject>(Obj));
	}
	TSharedRef<FJsonObject> Root = MakeShared<FJsonObject>();
	Root->SetNumberField(TEXT("schema"), 1);
	Root->SetNumberField(TEXT("nextId"), static_cast<double>(NextId));
	Root->SetArrayField(TEXT("records"), Values);
	FString Text;
	FJsonSerializer::Serialize(Root, TJsonWriterFactory<>::Create(&Text));
	IFileManager::Get().MakeDirectory(*FPaths::GetPath(Path), true);
	const FString Temp = Path + TEXT(".tmp");
	return FFileHelper::SaveStringToFile(Text, *Temp, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM) && IFileManager::Get().Move(*Path, *Temp, true, true);
}

bool FPrimordiaMemory::Load(const FString& Path)
{
	FString Text;
	TSharedPtr<FJsonObject> Root;
	if (!FFileHelper::LoadFileToString(Text, *Path) || !FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Root) || !Root.IsValid())
	{
		return false;
	}
	const TArray<TSharedPtr<FJsonValue>>* Values = nullptr;
	if (!Root->TryGetArrayField(TEXT("records"), Values))
	{
		return false;
	}
	Records.Reset();
	for (const TSharedPtr<FJsonValue>& V : *Values)
	{
		const TSharedPtr<FJsonObject>* Obj = nullptr;
		FPrimordiaMemoryRecord R;
		if (V->TryGetObject(Obj) && FJsonObjectConverter::JsonObjectToUStruct(Obj->ToSharedRef(), &R, 0, 0))
		{
			Records.Add(MoveTemp(R));
		}
	}
	double Next = 1.0;
	Root->TryGetNumberField(TEXT("nextId"), Next);
	NextId = FMath::Max<int64>(static_cast<int64>(Next), 1);
	for (const FPrimordiaMemoryRecord& R : Records) { NextId = FMath::Max(NextId, R.Id + 1); }
	if (Records.Num() > Capacity)
	{
		Evict();
	}
	return true;
}
