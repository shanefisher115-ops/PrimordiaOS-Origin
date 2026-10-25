// Console commands for driving cognition while playing (press ` in PIE):
//
//   Primordia.Help
//   Primordia.Goal illuminate_realm tag=Primordia.Lantern count=3 intensity=20000 at=player
//   Primordia.Cast spell beacon { world.spawn class=/Script/Engine.PointLight at=player tag=Primordia.Beacon }
//   Primordia.Status
//   Primordia.Recall lantern
//   Primordia.Lore shadow
//   Primordia.Realm realm_dreamforge

#include "CoreMinimal.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "HAL/IConsoleManager.h"
#include "PrimordiaCognitionSubsystem.h"
#include "PrimordiaLoreSubsystem.h"

namespace PrimordiaConsole
{
	void Print(const FString& Text, const FColor& Color = FColor::Silver)
	{
		UE_LOG(LogCognition, Display, TEXT("%s"), *Text);
		if (GEngine)
		{
			GEngine->AddOnScreenDebugMessage(-1, 12.f, Color, Text);
		}
	}

	/** The playing world: the one the command came from, or any game/PIE world. */
	UPrimordiaCognitionSubsystem* Find(UWorld* World)
	{
		if (World)
		{
			if (UPrimordiaCognitionSubsystem* Cog = World->GetSubsystem<UPrimordiaCognitionSubsystem>())
			{
				return Cog;
			}
		}
		if (GEngine)
		{
			for (const FWorldContext& Ctx : GEngine->GetWorldContexts())
			{
				UWorld* W = Ctx.World();
				if (W && (Ctx.WorldType == EWorldType::PIE || Ctx.WorldType == EWorldType::Game))
				{
					if (UPrimordiaCognitionSubsystem* Cog = W->GetSubsystem<UPrimordiaCognitionSubsystem>())
					{
						return Cog;
					}
				}
			}
		}
		Print(TEXT("Primordia: no cognition running. Press Play first."), FColor::Red);
		return nullptr;
	}

	const TCHAR* StateName(EPrimordiaGoalState S)
	{
		switch (S)
		{
		case EPrimordiaGoalState::Pending: return TEXT("pending");
		case EPrimordiaGoalState::Executing: return TEXT("executing");
		case EPrimordiaGoalState::Satisfied: return TEXT("satisfied");
		case EPrimordiaGoalState::Failed: return TEXT("failed");
		case EPrimordiaGoalState::Abandoned: return TEXT("abandoned");
		}
		return TEXT("?");
	}

	void Help(const TArray<FString>&, UWorld*)
	{
		Print(TEXT("Primordia.Realm <realm_id>                switch realm (realm_heart, realm_dreamforge, realm_shadowforge...)"));
		Print(TEXT("Primordia.Lore <words>                    ask the codex"));
		Print(TEXT("Primordia.Recall <words>                  search cognition's memory"));
		Print(TEXT("Primordia.Status                          goals, running spells, last cycle"));
		Print(TEXT("Primordia.Cast spell <name> { <op> ... ; <op> ... }   cast a spell (Jules still judges it)"));
		Print(TEXT("Primordia.Goal <task> key=value ...       e.g. illuminate_realm tag=Primordia.Lantern count=3 intensity=20000 at=player"));
		Print(TEXT("Tasks: illuminate_realm, fabricate_part, film_subject, stabilize_realm, chronicle_realm, rebuild_modules, or intent:<verb>"), FColor::Cyan);
	}

	void Goal(const TArray<FString>& Args, UWorld* World)
	{
		UPrimordiaCognitionSubsystem* Cog = Find(World);
		if (!Cog)
		{
			return;
		}
		if (Args.Num() == 0)
		{
			Print(TEXT("usage: Primordia.Goal <task> key=value ..."), FColor::Orange);
			return;
		}
		TMap<FString, FString> Params;
		FString LastKey;
		int32 Priority = 5;
		FString When, Desc;
		for (int32 i = 1; i < Args.Num(); ++i)
		{
			FString Key, Value;
			if (Args[i].Split(TEXT("="), &Key, &Value))
			{
				LastKey = Key;
				Params.Add(Key, Value.TrimQuotes());
			}
			else if (!LastKey.IsEmpty())
			{
				// Words without '=' continue the previous value: desc=Light the gate
				Params[LastKey] += TEXT(" ") + Args[i].TrimQuotes();
			}
		}
		if (FString* P = Params.Find(TEXT("priority"))) { Priority = FCString::Atoi(**P); Params.Remove(TEXT("priority")); }
		if (FString* W = Params.Find(TEXT("when"))) { When = *W; Params.Remove(TEXT("when")); }
		if (FString* D = Params.Find(TEXT("desc"))) { Desc = *D; Params.Remove(TEXT("desc")); }
		const FName Id = Cog->AddGoal(Args[0], Params, Priority, When, Desc);
		if (Id.IsNone())
		{
			Print(FString::Printf(TEXT("Primordia: unknown task '%s' (Primordia.Help lists them)"), *Args[0]), FColor::Red);
		}
	}

	void Cast(const TArray<FString>& Args, UWorld* World)
	{
		UPrimordiaCognitionSubsystem* Cog = Find(World);
		if (!Cog)
		{
			return;
		}
		const FString Source = FString::Join(Args, TEXT(" "));
		TArray<FString> Issues;
		const int32 Queued = Cog->CastSpell(Source, Issues);
		for (const FString& Issue : Issues)
		{
			Print(Issue, Issue.StartsWith(TEXT("error")) ? FColor::Red : FColor::Orange);
		}
		if (Queued > 0)
		{
			Print(FString::Printf(TEXT("Primordia: %d spell(s) queued for Jules"), Queued), FColor::Cyan);
		}
	}

	void Status(const TArray<FString>&, UWorld* World)
	{
		UPrimordiaCognitionSubsystem* Cog = Find(World);
		if (!Cog)
		{
			return;
		}
		const FPrimordiaCycleReport R = Cog->GetLastCycle();
		Print(FString::Printf(TEXT("Realm %s | cycle %lld | %d facts | %d memories recalled | %d lore lines | %.2f ms"),
			*Cog->GetRealm().ToString(), R.Cycle, R.Facts, R.MemoriesRecalled, R.LoreConsulted, R.ElapsedMs), FColor::Cyan);
		for (const FPrimordiaGoal& G : Cog->GetGoals())
		{
			Print(FString::Printf(TEXT("  goal %s %s [%s] attempts %d %s"), *G.Id.ToString(), *G.Task, StateName(G.State), G.Attempts,
				G.LastError.IsEmpty() ? TEXT("") : *FString::Printf(TEXT("- %s"), *G.LastError.Left(120))));
		}
		for (const FPrimordiaRunStatus& Run : Cog->GetSpellRuns())
		{
			TArray<FString> Steps;
			for (int32 i = 0; i < Run.StepOps.Num(); ++i)
			{
				Steps.Add(FString::Printf(TEXT("%s=%s"), *Run.StepOps[i].ToString(), *StaticEnum<EPrimordiaStepState>()->GetNameStringByValue(static_cast<int64>(Run.StepStates[i]))));
			}
			Print(FString::Printf(TEXT("  spell %s %s: %s"), *Run.SpellName.ToString(), Run.bFinished ? (Run.bSucceeded ? TEXT("done") : TEXT("FAILED")) : TEXT("running"),
				*FString::Join(Steps, TEXT(", "))));
		}
	}

	void Recall(const TArray<FString>& Args, UWorld* World)
	{
		if (UPrimordiaCognitionSubsystem* Cog = Find(World))
		{
			for (const FPrimordiaMemoryRecord& M : Cog->RecallMemories(FString::Join(Args, TEXT(" ")), 8))
			{
				Print(FString::Printf(TEXT("  [%s x%d] %s"), *M.Kind.ToString(), M.Repeats, *M.Summary));
			}
		}
	}

	void Lore(const TArray<FString>& Args, UWorld*)
	{
		if (const UPrimordiaLoreSubsystem* L = UPrimordiaLoreSubsystem::Get())
		{
			for (const FLoreQueryHit& Hit : L->Ask(FString::Join(Args, TEXT(" ")), 5))
			{
				Print(FString::Printf(TEXT("  %s: %s"), *Hit.Title, *Hit.Text.Left(200)), FColor(200, 170, 255));
			}
		}
	}

	void Realm(const TArray<FString>& Args, UWorld* World)
	{
		UPrimordiaCognitionSubsystem* Cog = Find(World);
		const UPrimordiaLoreSubsystem* L = UPrimordiaLoreSubsystem::Get();
		if (!Cog || !L)
		{
			return;
		}
		FLoreRealm R;
		if (Args.Num() == 0 || !L->GetRealm(FName(*Args[0]), R))
		{
			TArray<FString> Ids;
			for (const FName& Id : L->GetRealmIds()) { Ids.Add(Id.ToString()); }
			Print(FString::Printf(TEXT("Realms: %s"), *FString::Join(Ids, TEXT(", "))), FColor::Orange);
			return;
		}
		Cog->SetRealm(R.Id);
		Print(FString::Printf(TEXT("Now in %s: %s (stability %.2f)"), *R.Name, *R.Description, R.Stability), FColor(200, 170, 255));
	}

	static FAutoConsoleCommandWithWorldAndArgs CmdHelp(TEXT("Primordia.Help"), TEXT("List the Primordia console commands"), FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Help));
	static FAutoConsoleCommandWithWorldAndArgs CmdGoal(TEXT("Primordia.Goal"), TEXT("Primordia.Goal <task> key=value ... (priority=, when=, desc=)"), FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Goal));
	static FAutoConsoleCommandWithWorldAndArgs CmdCast(TEXT("Primordia.Cast"), TEXT("Primordia.Cast spell <name> { <op> args ; <op> args }"), FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Cast));
	static FAutoConsoleCommandWithWorldAndArgs CmdStatus(TEXT("Primordia.Status"), TEXT("Show goals, spells and the last cognition cycle"), FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Status));
	static FAutoConsoleCommandWithWorldAndArgs CmdRecall(TEXT("Primordia.Recall"), TEXT("Primordia.Recall <words>: search memory"), FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Recall));
	static FAutoConsoleCommandWithWorldAndArgs CmdLore(TEXT("Primordia.Lore"), TEXT("Primordia.Lore <words>: ask the codex"), FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Lore));
	static FAutoConsoleCommandWithWorldAndArgs CmdRealm(TEXT("Primordia.Realm"), TEXT("Primordia.Realm <realm_id>: switch realm"), FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Realm));
}
