#include "Actors/FateWeaveActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "NiagaraComponent.h"
#include "NiagaraSystem.h"
#include "NiagaraDataInterfaceArrayFunctionLibrary.h"

AFateWeaveActor::AFateWeaveActor()
{
	Loom = CreateDefaultSubobject<UNiagaraComponent>(TEXT("Loom"));
	Loom->SetupAttachment(SceneRoot);
	Loom->bAutoActivate = true;
	Smoothing = 0.f;
}

void AFateWeaveActor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	if (!Loom->GetAsset())
	{
		if (UNiagaraSystem* System = UPrimordiaBridgeSettings::Get()->FateRibbonSystem.LoadSynchronous())
		{
			Loom->SetAsset(System);
		}
		else
		{
			UE_LOG(LogPrimordia, Warning, TEXT("FateWeave: no FateRibbonSystem set in Project Settings > PrimordiaOS Realm Bridge; threads will not render."));
		}
	}
	Slots.SetNum(MaxThreads);
}

int32 AFateWeaveActor::GetLiveThreadCount() const
{
	int32 Count = 0;
	for (const FThreadSlot& S : Slots)
	{
		Count += (S.bUsed && S.TargetAlpha > 0.f) ? 1 : 0;
	}
	return Count;
}

void AFateWeaveActor::Resample(const TArray<FVector>& In, int32 Count, TArray<FVector>& Out)
{
	Out.SetNum(Count);
	if (In.Num() == 0)
	{
		for (FVector& P : Out) P = FVector::ZeroVector;
		return;
	}
	if (In.Num() == 1)
	{
		for (FVector& P : Out) P = In[0];
		return;
	}
	const int32 Last = In.Num() - 1;
	for (int32 k = 0; k < Count; ++k)
	{
		const float U = static_cast<float>(k) / (Count - 1) * Last;
		const int32 I = FMath::Min(FMath::FloorToInt(U), Last - 1);
		const float T = U - I;
		const FVector& P0 = In[FMath::Max(I - 1, 0)];
		const FVector& P1 = In[I];
		const FVector& P2 = In[I + 1];
		const FVector& P3 = In[FMath::Min(I + 2, Last)];
		// Uniform Catmull-Rom.
		const float T2 = T * T, T3 = T2 * T;
		Out[k] = 0.5f * ((2.f * P1) + (-P0 + P2) * T + (2.f * P0 - 5.f * P1 + 4.f * P2 - P3) * T2 + (-P0 + 3.f * P1 - 3.f * P2 + P3) * T3);
	}
}

int32 AFateWeaveActor::FindOrAllocSlot(const FString& Id)
{
	int32 Free = INDEX_NONE;
	int32 Faded = INDEX_NONE;
	for (int32 i = 0; i < Slots.Num(); ++i)
	{
		if (Slots[i].bUsed && Slots[i].Id == Id) return i;
		if (!Slots[i].bUsed && Free == INDEX_NONE) Free = i;
		if (Slots[i].bUsed && Slots[i].TargetAlpha <= 0.f && Slots[i].Alpha < 0.01f && Faded == INDEX_NONE) Faded = i;
	}
	const int32 Slot = Free != INDEX_NONE ? Free : Faded;
	if (Slot != INDEX_NONE)
	{
		Slots[Slot] = FThreadSlot();
		Slots[Slot].Id = Id;
		Slots[Slot].bUsed = true;
	}
	return Slot;
}

void AFateWeaveActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	if (Slots.Num() != MaxThreads)
	{
		Slots.SetNum(MaxThreads);
	}
	LoomSpeed = Num(P, TEXT("loom_speed"), LoomSpeed);
	WeaveDensity = Num(P, TEXT("weave_density"), WeaveDensity);

	for (FThreadSlot& S : Slots)
	{
		S.bSeenThisPacket = false;
	}

	const float Upm = UnitsPerMeter();
	TArray<FVector> Raw;
	if (const TArray<TSharedPtr<FJsonValue>>* Threads = Arr(P, TEXT("threads")))
	{
		for (const TSharedPtr<FJsonValue>& V : *Threads)
		{
			const TSharedPtr<FJsonObject> T = V->AsObject();
			const int32 SlotIndex = FindOrAllocSlot(Str(T, TEXT("id")));
			if (SlotIndex == INDEX_NONE)
			{
				continue; // more live threads than MaxThreads
			}
			FThreadSlot& S = Slots[SlotIndex];
			const bool bNew = S.Target.Num() == 0;
			S.bSeenThisPacket = true;
			S.Tension = Num(T, TEXT("tension"), 1.0);
			S.WidthUnits = Num(T, TEXT("width"), 0.1) * Upm;
			S.Color = Color(T, TEXT("color"));
			const FString Fate = Str(T, TEXT("fate"), TEXT("bound"));
			S.Fate = Fate == TEXT("severed") ? 2 : Fate == TEXT("frayed") ? 1 : 0;
			S.TargetAlpha = S.Fate == 2 ? 0.f : 1.f;

			Raw.Reset();
			if (const TArray<TSharedPtr<FJsonValue>>* Points = Arr(T, TEXT("points")))
			{
				for (const TSharedPtr<FJsonValue>& PV : *Points)
				{
					FVector Point;
					if (VecFromValue(PV, Point, Upm))
					{
						Raw.Add(Point);
					}
				}
			}
			Resample(Raw, PointsPerThread, S.Target);
			if (bNew)
			{
				S.Current = S.Target;
			}
		}
	}

	// Threads the server stopped mentioning fade out like severed ones.
	for (FThreadSlot& S : Slots)
	{
		if (S.bUsed && !S.bSeenThisPacket)
		{
			S.TargetAlpha = 0.f;
		}
	}
}

void AFateWeaveActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const float PointAlpha = ExpAlpha(PointSmoothing, DeltaSeconds);
	const float FadeStep = DeltaSeconds / FMath::Max(SeverFadeSeconds, KINDA_SMALL_NUMBER);
	for (FThreadSlot& S : Slots)
	{
		if (!S.bUsed)
		{
			continue;
		}
		S.Alpha = S.TargetAlpha > S.Alpha ? FMath::Min(S.TargetAlpha, S.Alpha + FadeStep * 2.f) : FMath::Max(S.TargetAlpha, S.Alpha - FadeStep);
		for (int32 k = 0; k < S.Current.Num() && k < S.Target.Num(); ++k)
		{
			S.Current[k] = FMath::Lerp(S.Current[k], S.Target[k], PointAlpha);
		}
		if (S.TargetAlpha <= 0.f && S.Alpha <= 0.f)
		{
			S = FThreadSlot(); // slot free again
		}
	}
	PushToNiagara();
}

void AFateWeaveActor::PushToNiagara()
{
	if (!Loom || !Loom->GetAsset())
	{
		return;
	}
	const int32 SlotCount = Slots.Num();
	TArray<FVector> Points;
	TArray<FLinearColor> Colors;
	TArray<FVector4> Params;
	Points.SetNumZeroed(SlotCount * PointsPerThread);
	Colors.SetNumZeroed(SlotCount);
	Params.SetNumZeroed(SlotCount);

	for (int32 i = 0; i < SlotCount; ++i)
	{
		const FThreadSlot& S = Slots[i];
		if (!S.bUsed || S.Current.Num() != PointsPerThread)
		{
			continue;
		}
		for (int32 k = 0; k < PointsPerThread; ++k)
		{
			Points[i * PointsPerThread + k] = S.Current[k];
		}
		Colors[i] = S.Color;
		Params[i] = FVector4(S.Tension, S.WidthUnits, S.Alpha * RetireMultiplier, static_cast<float>(S.Fate));
	}

	UNiagaraDataInterfaceArrayFunctionLibrary::SetNiagaraArrayPosition(Loom, TEXT("ThreadPoints"), Points);
	UNiagaraDataInterfaceArrayFunctionLibrary::SetNiagaraArrayColor(Loom, TEXT("ThreadColors"), Colors);
	UNiagaraDataInterfaceArrayFunctionLibrary::SetNiagaraArrayVector4(Loom, TEXT("ThreadParams"), Params);
	Loom->SetVariableInt(TEXT("ThreadSlots"), SlotCount);
	Loom->SetVariableInt(TEXT("PointsPerThread"), PointsPerThread);
	Loom->SetVariableFloat(TEXT("LoomSpeed"), LoomSpeed);
	Loom->SetVariableFloat(TEXT("WeaveDensity"), WeaveDensity);
}

void AFateWeaveActor::UpdateRetireFade(float Alpha)
{
	RetireMultiplier = Alpha;
}
