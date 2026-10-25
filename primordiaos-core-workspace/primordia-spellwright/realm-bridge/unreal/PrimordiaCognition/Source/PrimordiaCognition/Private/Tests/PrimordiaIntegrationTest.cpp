// The whole loop in a real game world: goals -> planner -> Spellwright -> Jules -> executor ->
// world actions, and (when the Bolt server answers) a fabrication through the pipeline.
//
// Start the Bolt server first for the pipeline half:  node pipeline/bolt/server.mjs
// Then: UnrealEditor-Cmd.exe <project> -ExecCmds="Automation RunTests Primordia.Integration" -TestExit="Automation Test Queue Empty" -unattended -nullrhi

#include "CoreMinimal.h"
#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

#include "Components/LightComponent.h"
#include "Containers/Ticker.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "HttpManager.h"
#include "HttpModule.h"
#include "Misc/Paths.h"
#include "Misc/ScopeExit.h"
#include "PrimordiaBoltBridgeSubsystem.h"
#include "PrimordiaCognitionSubsystem.h"
#include "PrimordiaJulesSubsystem.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FPrimordiaIntegrationTest, "Primordia.Integration.Loop",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FPrimordiaIntegrationTest::RunTest(const FString&)
{
	UWorld* World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("PrimordiaIntegration"), GetTransientPackage());
	FWorldContext& Context = GEngine->CreateNewWorldContext(EWorldType::Game);
	Context.SetCurrentWorld(World);
	World->InitializeActorsForPlay(FURL());
	World->BeginPlay();
	ON_SCOPE_EXIT
	{
		GEngine->DestroyWorldContext(World);
		World->DestroyWorld(false);
	};

	UPrimordiaCognitionSubsystem* Cog = World->GetSubsystem<UPrimordiaCognitionSubsystem>();
	if (!TestNotNull(TEXT("cognition exists in a game world"), Cog))
	{
		return false;
	}
	UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get();
	UPrimordiaJulesSubsystem* Jules = UPrimordiaJulesSubsystem::Get();
	Jules->GetEngine().ResetRateLimits();

	// Drives everything the engine loop would: tickers, HTTP completions, the cognition tick.
	auto Pump = [&](float Seconds, TFunctionRef<bool()> Until)
	{
		const double Deadline = FPlatformTime::Seconds() + Seconds;
		double Last = FPlatformTime::Seconds();
		while (FPlatformTime::Seconds() < Deadline)
		{
			const double Now = FPlatformTime::Seconds();
			const float Dt = static_cast<float>(Now - Last);
			Last = Now;
			FTSTicker::GetCoreTicker().Tick(Dt);
			FHttpModule::Get().GetHttpManager().Tick(Dt);
			Cog->Tick(Dt);
			if (Until())
			{
				return true;
			}
			FPlatformProcess::Sleep(0.02f);
		}
		return false;
	};
	auto GoalState = [&](FName Id)
	{
		for (const FPrimordiaGoal& G : Cog->GetGoals())
		{
			if (G.Id == Id) { return G.State; }
		}
		return EPrimordiaGoalState::Abandoned;
	};
	auto GoalError = [&](FName Id)
	{
		for (const FPrimordiaGoal& G : Cog->GetGoals())
		{
			if (G.Id == Id) { return G.LastError; }
		}
		return FString(TEXT("no such goal"));
	};

	bool bBoltUp = false, bAnswered = false;
	if (Bolt)
	{
		Bolt->CheckHealth([&](bool bOk, const FString&) { bBoltUp = bOk; bAnswered = true; });
		Pump(5.f, [&] { return bAnswered; });
		if (bBoltUp)
		{
			Bolt->Connect();
			Pump(10.f, [&] { return Bolt->IsEventStreamConnected(); });
		}
	}
	if (!bBoltUp)
	{
		AddWarning(TEXT("Bolt is not answering; the pipeline half of this test is skipped (start pipeline/bolt/server.mjs)"));
	}

	// 1. A two-spell plan: raise two lanterns, then light them (the second waits for the first).
	Cog->SetRealm(TEXT("realm_heart"));
	const FName Lanterns = Cog->AddGoal(TEXT("illuminate_realm"),
		{{TEXT("tag"), TEXT("Primordia.Lantern")}, {TEXT("count"), TEXT("2")}, {TEXT("intensity"), TEXT("9000")}, {TEXT("at"), TEXT("0,0,300")}},
		8, TEXT("tag.Primordia.Lantern >= 2"), TEXT("Light the gate"));
	TestFalse(TEXT("goal accepted"), Lanterns.IsNone());

	// 2. A user spell from DSL with an output flowing between its steps.
	TArray<FString> Issues;
	TestEqual(TEXT("naming spell queued"), Cog->CastSpell(TEXT(
		"spell naming : chronicle {\n"
		"    realm realm_omniscience\n"
		"    lore.inscribe text=\"guard the dream\" as words\n"
		"    world.log message=\"the ward reads ${words.glyphs}\" after words\n"
		"}\n"), Issues), 1);

	// 3. A spell Jules must refuse: nothing is milled in the Shadowforge.
	const int32 RejectedBefore = Jules->Rejected;
	TestEqual(TEXT("forbidden spell queued"), Cog->CastSpell(TEXT("spell mill : forging {\n realm realm_shadowforge\n cadcam.simulate plate\n}\n"), Issues), 1);

	// 4. Through the pipeline: a plate milled for real (G-code spooled by Bolt).
	FName Plate;
	if (bBoltUp)
	{
		Plate = Cog->AddGoal(TEXT("fabricate_part"), {{TEXT("subject"), TEXT("plate")}}, 6, TEXT(""), TEXT("Mill a plate"));
	}

	const bool bDone = Pump(90.f, [&]
	{
		const bool bLit = GoalState(Lanterns) == EPrimordiaGoalState::Satisfied;
		const bool bNamed = Cog->RecallMemories(TEXT("ward reads"), 1).Num() > 0 && Cog->RecallMemories(TEXT("ward reads"), 1)[0].Summary.Contains(TEXT("the ward reads"));
		const bool bRefused = Jules->Rejected > RejectedBefore;
		const bool bMilled = Plate.IsNone() || GoalState(Plate) == EPrimordiaGoalState::Satisfied || GoalState(Plate) == EPrimordiaGoalState::Failed;
		return bLit && bNamed && bRefused && bMilled;
	});
	TestTrue(TEXT("everything finished within 90 s"), bDone);

	TestTrue(FString::Printf(TEXT("lantern goal satisfied (%s)"), *GoalError(Lanterns)), GoalState(Lanterns) == EPrimordiaGoalState::Satisfied);
	int32 Count = 0, Lit = 0;
	for (TActorIterator<AActor> It(World); It; ++It)
	{
		if (!It->ActorHasTag(TEXT("Primordia.Lantern"))) { continue; }
		++Count;
		TArray<ULightComponent*> Lights;
		It->GetComponents<ULightComponent>(Lights);
		// The lanterns_dark trigger may relight them at 8000 once they stand; both mean lit by a spell.
		Lit += (Lights.Num() > 0 && Lights[0]->Intensity >= 8000.f) ? 1 : 0;
	}
	TestEqual(TEXT("two lanterns raised"), Count, 2);
	TestEqual(TEXT("both lit by the illuminate spell"), Lit, 2);

	const TArray<FPrimordiaMemoryRecord> Named = Cog->RecallMemories(TEXT("ward reads"), 1);
	// "${words.glyphs}" was replaced by the glyph names lore.inscribe produced.
	TestTrue(TEXT("the inscription flowed into the next step"), Named.Num() == 1 && Named[0].Summary.StartsWith(TEXT("the ward reads ")) &&
		Named[0].Summary.Len() > 16 && !Named[0].Summary.Contains(TEXT("${")));
	if (Named.Num() == 1) { AddInfo(Named[0].Summary); }

	TestTrue(TEXT("Jules refused the Shadowforge mill"), Jules->Rejected > RejectedBefore);
	TestTrue(TEXT("the refusal is remembered"), Cog->RecallMemories(TEXT("mill rejected Shadowforge"), 3).ContainsByPredicate([](const FPrimordiaMemoryRecord& R) { return R.Tags.Contains(TEXT("rejected")); }));

	if (!Plate.IsNone())
	{
		TestTrue(FString::Printf(TEXT("plate goal satisfied (%s)"), *GoalError(Plate)), GoalState(Plate) == EPrimordiaGoalState::Satisfied);
		bool bSpooled = false;
		for (const FBoltJob& Job : Bolt->GetAllJobs())
		{
			if (Job.Kind != TEXT("cadcam.fabricate") || Job.Status != EBoltJobStatus::Succeeded) { continue; }
			TSharedPtr<FJsonObject> Result = UPrimordiaBoltBridgeSubsystem::ParseResult(Job);
			FString Spool;
			if (Result.IsValid() && Result->TryGetStringField(TEXT("spoolPath"), Spool) && FPaths::FileExists(Spool))
			{
				bSpooled = true;
				AddInfo(FString::Printf(TEXT("G-code spooled by Bolt: %s"), *Spool));
			}
		}
		TestTrue(TEXT("Bolt spooled the G-code"), bSpooled);
	}

	const FPrimordiaCycleReport Report = Cog->GetLastCycle();
	AddInfo(FString::Printf(TEXT("cycle %lld: %d facts, %d memories recalled, %d lore lines"), Report.Cycle, Report.Facts, Report.MemoriesRecalled, Report.LoreConsulted));
	TestTrue(TEXT("the loop consulted lore"), Report.LoreConsulted > 0);
	return true;
}

#endif
