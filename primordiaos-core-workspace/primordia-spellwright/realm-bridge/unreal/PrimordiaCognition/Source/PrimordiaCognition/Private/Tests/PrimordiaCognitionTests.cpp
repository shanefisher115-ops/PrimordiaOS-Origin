// Automation tests: Session Frontend > Automation, filter "Primordia", or headless:
//   UnrealEditor-Cmd.exe <project> -ExecCmds="Automation RunTests Primordia;Quit" -unattended -nullrhi

#include "CoreMinimal.h"
#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

// UE 5.4 automation flags are a plain enum combined with |.
#define PRIMORDIA_TEST_FLAGS (EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

#include "CadFabricationSimulator.h"
#include "CadGCodeCompiler.h"
#include "CadGeometry.h"
#include "CadToolpathGenerator.h"
#include "JulesEngine.h"
#include "LoreCodex.h"
#include "LoreEvolver.h"
#include "PrimordiaActionExecutor.h"
#include "PrimordiaIntentRouter.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "PrimordiaLoreEngine.h"
#include "PrimordiaLoreSubsystem.h"
#include "PrimordiaMemory.h"
#include "PrimordiaPlanner.h"
#include "PrimordiaSpellwrightSubsystem.h"
#include "PrimordiaJulesSubsystem.h"
#include "SpellwrightCompiler.h"
#include "SpellwrightOps.h"
#include "SpellwrightSerializer.h"
#include "SpellwrightValidator.h"

namespace PrimordiaTests
{
	const FLoreCodex* Codex()
	{
		const UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get();
		return Lore ? &Lore->GetCodex() : nullptr;
	}

	FLoreCodex FoundingCodex()
	{
		FLoreCodex C;
		FString Error;
		C.LoadFromFile(UPrimordiaLoreSubsystem::Get()->GetFoundingPath(), Error);
		return C;
	}

	FSpellwrightSpell Compile(const FString& Verb, const TMap<FString, FString>& Params, FName Realm, const FString& Provenance = TEXT("planner"))
	{
		FSpellwrightIntent I;
		I.Verb = FName(*Verb);
		I.Subject = Params.FindRef(TEXT("subject"));
		I.Params = Params;
		I.Realm = Realm;
		I.Provenance = Provenance;
		FSpellwrightSpell S;
		TArray<FSpellwrightIssue> Issues;
		UPrimordiaSpellwrightSubsystem::Get()->CompileIntent(I, S, Issues);
		return S;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FPrimordiaLoreTest, "Primordia.Lore", PRIMORDIA_TEST_FLAGS)
bool FPrimordiaLoreTest::RunTest(const FString&)
{
	FLoreCodex C = PrimordiaTests::FoundingCodex();
	TestTrue(TEXT("founding codex has realms"), C.GetRealms().Num() >= 9);
	TestEqual(TEXT("founding codex is consistent"), C.Validate().Num(), 0);

	FLoreQuery Q;
	Q.Text = TEXT("light is refused and taken by the inverse");
	Q.Limit = 3;
	const TArray<FLoreQueryHit> Hits = C.Query(Q);
	TestTrue(TEXT("query finds something"), Hits.Num() > 0);
	if (Hits.Num() > 0)
	{
		TestTrue(TEXT("shadowforge lore ranks first"), Hits[0].Text.Contains(TEXT("Shadowforge")) || Hits[0].Title.Contains(TEXT("Shadowforge")));
	}

	Q = FLoreQuery();
	Q.Realm = TEXT("realm_soul");
	Q.Kinds = {ELoreRecordKind::Faction};
	const TArray<FLoreQueryHit> Factions = C.Query(Q);
	TestTrue(TEXT("realm filter keeps the Hollow Choir"), Factions.ContainsByPredicate([](const FLoreQueryHit& H) { return H.Id == TEXT("faction_hollow_choir"); }));

	const TArray<FName> Glyphs = C.Inscribe(TEXT("forge"));
	TestTrue(TEXT("forge writes f, r, g"), Glyphs == TArray<FName>{TEXT("glyph_f"), TEXT("glyph_r"), TEXT("glyph_g")});
	TestTrue(TEXT("the forge sigil wakes"), C.FindSigilsIn(Glyphs).Contains(TEXT("sigil_forge")));
	TestTrue(TEXT("digraphs win"), C.Inscribe(TEXT("the shadow")).Num() > 0 && C.Inscribe(TEXT("the shadow"))[0] == FName(TEXT("glyph_th")));

	// Evolution is deterministic per seed.
	FLoreCodex A = PrimordiaTests::FoundingCodex(), B = PrimordiaTests::FoundingCodex();
	FLoreEvolver Evolver;
	Evolver.Evolve(A, 12, 42);
	Evolver.Evolve(B, 12, 42);
	TestEqual(TEXT("era advanced"), A.GetEra(), 12);
	bool bSame = true;
	float InfluenceSum = 0.f;
	for (const TPair<FName, FLoreRealm>& R : A.GetRealms())
	{
		bSame &= FMath::IsNearlyEqual(R.Value.Stability, B.FindRealm(R.Key)->Stability);
	}
	for (const TPair<FName, FLoreFaction>& F : A.GetFactions()) { InfluenceSum += F.Value.Influence; }
	TestTrue(TEXT("same seed, same history"), bSame);
	TestTrue(TEXT("influence stays normalised"), FMath::IsNearlyEqual(InfluenceSum, 1.f, 1e-3f));
	TestTrue(TEXT("evolution recorded events"), A.GetEvents().Num() > C.GetEvents().Num());

	// JSON round trip.
	FLoreCodex Round;
	FString Error;
	TestTrue(TEXT("codex reloads from its own JSON"), Round.LoadFromJsonString(A.SaveToJsonString(), Error));
	TestEqual(TEXT("events survive the round trip"), Round.GetEvents().Num(), A.GetEvents().Num());
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FPrimordiaSpellwrightTest, "Primordia.Spellwright", PRIMORDIA_TEST_FLAGS)
bool FPrimordiaSpellwrightTest::RunTest(const FString&)
{
	const FString Source = TEXT(
		"# a spell\n"
		"spell forge_spire : forging {\n"
		"    realm realm_worldforge\n"
		"    subject \"the eastern spire\"\n"
		"    cadcam.simulate spire shape=polygon sides=8 radius=30 depth=4 stock=100x100x20 tool=6 as cut\n"
		"    world.log message=\"wrote ${cut.gcode_path}\" after cut; lore.record title=\"Spire \\\"one\\\"\" after cut\n"
		"}\n");
	const FSpellwrightCompiler::FParseResult Parsed = FSpellwrightCompiler::Parse(Source);
	TestFalse(TEXT("parses"), Parsed.HasErrors());
	if (!TestEqual(TEXT("one spell"), Parsed.Spells.Num(), 1)) { return false; }
	FSpellwrightSpell Spell = Parsed.Spells[0];
	FSpellwrightCompiler::Finalize(Spell, PrimordiaTests::Codex());
	TestEqual(TEXT("three steps (';' splits)"), Spell.Steps.Num(), 3);
	TestTrue(TEXT("school from header"), Spell.School == FName(TEXT("forging")));
	TestEqual(TEXT("target"), Spell.Steps[0].Target, FString(TEXT("spire")));
	TestTrue(TEXT("label"), Spell.Steps[0].Label == FName(TEXT("cut")));
	TestTrue(TEXT("default label"), Spell.Steps[2].Label == FName(TEXT("s3")));
	TestEqual(TEXT("escaped quotes"), Spell.Steps[2].GetArg(TEXT("title")), FString(TEXT("Spire \"one\"")));
	TestTrue(TEXT("glyphs inscribed from subject"), Spell.Glyphs.Num() > 0);

	FSpellwrightValidator V;
	TestFalse(TEXT("valid"), FSpellwrightValidator::HasErrors(V.Validate(Spell)));

	// Round trip through DSL and JSON.
	const FSpellwrightCompiler::FParseResult Again = FSpellwrightCompiler::Parse(FSpellwrightSerializer::ToDsl(Spell));
	TestTrue(TEXT("DSL round trip parses"), !Again.HasErrors() && Again.Spells.Num() == 1);
	if (Again.Spells.Num() == 1)
	{
		for (int32 i = 0; i < Spell.Steps.Num(); ++i)
		{
			TestTrue(TEXT("op survives"), Again.Spells[0].Steps[i].Op == Spell.Steps[i].Op);
			TestTrue(TEXT("args survive"), Again.Spells[0].Steps[i].Args.OrderIndependentCompareEqual(Spell.Steps[i].Args));
			TestTrue(TEXT("after survives"), Again.Spells[0].Steps[i].After == Spell.Steps[i].After);
		}
	}
	FSpellwrightSpell FromJson;
	FString Error;
	TestTrue(TEXT("JSON envelope round trip"), FSpellwrightSerializer::FromEnvelope(FSpellwrightSerializer::ToEnvelope(Spell), FromJson, Error));
	TestTrue(TEXT("id survives JSON"), FromJson.Id == Spell.Id);

	// The validator catches what it should.
	FSpellwrightSpell Bad = Spell;
	Bad.Steps[1].After.Reset(); // ${cut.gcode_path} without waiting for cut
	TestTrue(TEXT("reference without dependency"), FSpellwrightValidator::HasErrors(V.Validate(Bad)));
	Bad = Spell;
	Bad.Steps[0].After = {TEXT("s3")}; // cut -> s3 -> cut
	TestTrue(TEXT("cycle"), FSpellwrightValidator::HasErrors(V.Validate(Bad)));
	Bad = Spell;
	Bad.Steps[0].Op = TEXT("cadcam.levitate");
	TestTrue(TEXT("unknown op"), FSpellwrightValidator::HasErrors(V.Validate(Bad)));
	Bad = Spell;
	Bad.Steps[0].Args.Add(TEXT("stock"), TEXT("tall"));
	TestTrue(TEXT("bad size"), FSpellwrightValidator::HasErrors(V.Validate(Bad)));

	TestTrue(TEXT("a broken source reports a line"), FSpellwrightCompiler::Parse(TEXT("spell x {\n  world.log message=\n}")).Issues.ContainsByPredicate([](const FSpellwrightIssue& I) { return I.Line == 2; }));

	// Every shipped template compiles into a valid spell.
	const UPrimordiaSpellwrightSubsystem* SW = UPrimordiaSpellwrightSubsystem::Get();
	TestTrue(TEXT("templates loaded"), SW->GetVerbs().Num() >= 14);
	for (const FName& Verb : SW->GetVerbs())
	{
		TMap<FString, FString> P = {{TEXT("subject"), TEXT("test subject")}, {TEXT("tag"), TEXT("Primordia.Test")}, {TEXT("class"), TEXT("/Script/Engine.PointLight")},
			{TEXT("source"), TEXT("C:/media")}, {TEXT("reason"), TEXT("test")}, {TEXT("object"), TEXT("Cube")}};
		FSpellwrightIntent I;
		I.Verb = Verb;
		I.Subject = TEXT("test subject");
		I.Params = P;
		FSpellwrightSpell S;
		TArray<FSpellwrightIssue> Issues;
		const bool bOk = SW->CompileIntent(I, S, Issues);
		TestTrue(FString::Printf(TEXT("template %s compiles (%s)"), *Verb.ToString(), Issues.Num() ? *Issues[0].ToString() : TEXT("")), bOk);
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FPrimordiaJulesTest, "Primordia.Jules", PRIMORDIA_TEST_FLAGS)
bool FPrimordiaJulesTest::RunTest(const FString&)
{
	UPrimordiaJulesSubsystem* Jules = UPrimordiaJulesSubsystem::Get();
	FJulesEngine& E = Jules->GetEngine();
	E.ResetRateLimits();
	const FLoreCodex* C = PrimordiaTests::Codex();
	TestEqual(TEXT("rules are consistent"), E.ValidateRules().Num(), 0);

	const TMap<FString, FString> Part = {{TEXT("subject"), TEXT("plate")}};
	FSpellwrightSpell Fab = PrimordiaTests::Compile(TEXT("fabricate"), Part, TEXT("realm_worldforge"));
	FJulesReport R = E.Evaluate(Fab, C, 0.0, false);
	TestTrue(FString::Printf(TEXT("fabricate in the Worldforge is approved: %s"), *R.Summary()), R.bApproved);

	FSpellwrightSpell Shadow = PrimordiaTests::Compile(TEXT("fabricate"), Part, TEXT("realm_shadowforge"));
	R = E.Evaluate(Shadow, C, 0.0, false);
	TestFalse(TEXT("nothing is fabricated in the Shadowforge"), R.bApproved);

	FSpellwrightSpell Render = PrimordiaTests::Compile(TEXT("render"), {{TEXT("subject"), TEXT("spire")}}, TEXT("realm_shadowforge"));
	TestFalse(TEXT("the Shadowforge refuses illumination"), E.Evaluate(Render, C, 0.0, false).bApproved);

	FSpellwrightSpell Unmake = PrimordiaTests::Compile(TEXT("unmake"), {{TEXT("tag"), TEXT("Primordia.Test")}}, TEXT("realm_shadowforge"), TEXT("planner"));
	TestFalse(TEXT("the planner may not unmake"), E.Evaluate(Unmake, C, 0.0, false).bApproved);
	Unmake.Provenance = TEXT("user");
	R = E.Evaluate(Unmake, C, 0.0, false);
	TestTrue(FString::Printf(TEXT("a user may unmake in the Shadowforge: %s"), *R.Summary()), R.bApproved);
	Unmake.Realm = TEXT("realm_heart");
	TestFalse(TEXT("but not where the Wardens rule"), E.Evaluate(Unmake, C, 0.0, false).bApproved);

	FSpellwrightSpell Huge = Fab;
	Huge.Steps[0].Args.Add(TEXT("stock"), TEXT("900x100x20"));
	TestFalse(TEXT("machine envelope enforced"), E.Evaluate(Huge, C, 0.0, false).bApproved);

	FSpellwrightSpell Dream = PrimordiaTests::Compile(TEXT("render"), {{TEXT("subject"), TEXT("spire")}}, TEXT("realm_dreamforge"));
	int32 Approved = 0;
	for (int32 i = 0; i < 8; ++i)
	{
		Approved += E.Evaluate(Dream, C, 1000.0 + i, true).bApproved ? 1 : 0;
	}
	TestEqual(TEXT("six renders a minute"), Approved, 6);
	TestTrue(TEXT("the window slides"), E.Evaluate(Dream, C, 1000.0 + 61.0 + 6.0, true).bApproved);
	E.ResetRateLimits();
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FPrimordiaPlannerTest, "Primordia.Planner", PRIMORDIA_TEST_FLAGS)
bool FPrimordiaPlannerTest::RunTest(const FString&)
{
	FPrimordiaPlanner P;
	FString Json, Error;
	FFileHelper::LoadFileToString(Json, *FPaths::Combine(FLoreText::ResourcesDir(), TEXT("Planner"), TEXT("methods.json")));
	TestTrue(TEXT("methods load"), P.LoadMethodsFromJson(Json, Error));
	FFileHelper::LoadFileToString(Json, *FPaths::Combine(FLoreText::ResourcesDir(), TEXT("Planner"), TEXT("triggers.json")));
	TArray<FPrimordiaTrigger> Triggers;
	TestTrue(TEXT("triggers load"), P.LoadTriggersFromJson(Json, Triggers, Error) && Triggers.Num() > 0);

	FPrimordiaGoal G;
	G.Task = TEXT("illuminate_realm");
	G.Params = {{TEXT("tag"), TEXT("Primordia.Lantern")}, {TEXT("count"), TEXT("3")}, {TEXT("intensity"), TEXT("5000")}};
	TMap<FString, FString> Facts = {{TEXT("realm"), TEXT("realm_heart")}};
	FPrimordiaPlan Plan = P.Plan(G, Facts);
	TestTrue(TEXT("plans with no lanterns"), Plan.bSuccess);
	TestEqual(TEXT("manifest then illuminate"), Plan.Intents.Num(), 2);
	if (Plan.Intents.Num() == 2)
	{
		TestTrue(TEXT("first manifests"), Plan.Intents[0].Verb == FName(TEXT("manifest")));
		TestFalse(TEXT("an unset ${at} is dropped, not passed on"), Plan.Intents[0].Params.Contains(TEXT("at")));
	}
	Facts.Add(TEXT("tag.Primordia.Lantern"), TEXT("3"));
	Plan = P.Plan(G, Facts);
	TestEqual(TEXT("lanterns exist: only illuminate"), Plan.Intents.Num(), 1);
	Facts[TEXT("realm")] = TEXT("realm_shadowforge");
	Facts.Remove(TEXT("tag.Primordia.Lantern"));
	TestFalse(TEXT("no method applies in the Shadowforge"), P.Plan(G, Facts).bSuccess);

	FPrimordiaGoal Fab;
	Fab.Task = TEXT("fabricate_part");
	Fab.Params = {{TEXT("subject"), TEXT("plate")}};
	Plan = P.Plan(Fab, {{TEXT("bolt.connected"), TEXT("false")}});
	TestTrue(TEXT("offline: rehearse"), Plan.bSuccess && Plan.Intents.Num() == 1 && Plan.Intents[0].Verb == TEXT("simulate"));
	Plan = P.Plan(Fab, {{TEXT("bolt.connected"), TEXT("true")}});
	TestTrue(TEXT("online: fabricate"), Plan.bSuccess && Plan.Intents.Num() == 1 && Plan.Intents[0].Verb == TEXT("fabricate"));

	FPrimordiaGoal Ward;
	Ward.Task = TEXT("stabilize_realm");
	Plan = P.Plan(Ward, {{TEXT("realm"), TEXT("realm_shadowforge")}, {TEXT("realm.name"), TEXT("The Shadowforge")}, {TEXT("realm.stability"), TEXT("0.3")}});
	TestTrue(TEXT("unstable: ward"), Plan.bSuccess && Plan.Intents.Num() == 1);
	if (Plan.Intents.Num() == 1)
	{
		TestTrue(TEXT("facts substitute"), Plan.Intents[0].Subject.Contains(TEXT("The Shadowforge")));
	}
	Plan = P.Plan(Ward, {{TEXT("realm.stability"), TEXT("0.9")}});
	TestTrue(TEXT("stable: nothing to do"), Plan.bSuccess && Plan.Intents.Num() == 0);

	TestTrue(TEXT("expressions"), FPrimordiaPlanner::Evaluate(TEXT("a > 2 && b == x || c"), {{TEXT("a"), TEXT("3")}, {TEXT("b"), TEXT("X")}}, {}));
	TestFalse(TEXT("missing count compares as zero"), FPrimordiaPlanner::Evaluate(TEXT("tag.Y > 0"), {}, {}));
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FPrimordiaCadcamTest, "Primordia.CADCAM", PRIMORDIA_TEST_FLAGS)
bool FPrimordiaCadcamTest::RunTest(const FString&)
{
	FCadPart Part;
	Part.Name = TEXT("plate");
	Part.Stock.Size = FVector(100, 80, 20);
	FCadFeature& Pocket = Part.Features.AddDefaulted_GetRef();
	Pocket.Kind = ECadFeatureKind::Pocket;
	Pocket.Shape = FCadGeometry::Rectangle(FVector2D(50, 40), 60, 40);
	Pocket.Depth = 6;
	FCadTool Tool;
	Tool.Diameter = 6;
	Tool.StepDown = 2;

	FCadToolpathGenerator Gen;
	const FCadToolpath Path = Gen.Generate(Part, Tool);
	TestEqual(TEXT("no toolpath errors"), Path.Errors.Num(), 0);

	FCadGCodeCompiler Compiler;
	const FString GCode = Compiler.Compile(Part, Path);
	TestTrue(TEXT("program ends"), GCode.Contains(TEXT("M30")));
	const FCadGCodeParseResult Parsed = FCadGCodeCompiler::Parse(GCode, Gen.Options.SafeZ);
	TestEqual(TEXT("reads back cleanly"), Parsed.Errors.Num(), 0);

	FCadFabricationSimulator Sim;
	Sim.Options.CellSize = 0.25;
	const FCadSimReport R = Sim.Simulate(Part.Stock, Tool, Parsed.Moves);
	TestTrue(FString::Printf(TEXT("simulation clean (%d collisions, %d overcuts)"), R.RapidCollisions, R.OverCuts), R.bOk);
	// A flat end mill leaves a radius in each corner: (4 - pi) r^2 per corner, missing from the box.
	const double Expected = 60.0 * 40.0 * 6.0 - 4.0 * (4.0 - UE_DOUBLE_PI) / 4.0 * 9.0 * 6.0;
	TestTrue(FString::Printf(TEXT("removed %.0f mm3, expected %.0f"), R.RemovedVolume, Expected), FMath::Abs(R.RemovedVolume - Expected) / Expected < 0.03);

	// A profile around an octagon, outside.
	FCadPart Ring;
	Ring.Stock.Size = FVector(100, 100, 10);
	FCadFeature& Prof = Ring.Features.AddDefaulted_GetRef();
	Prof.Kind = ECadFeatureKind::Profile;
	Prof.Shape = FCadGeometry::RegularPolygon(FVector2D(50, 50), 30, 8);
	Prof.Depth = 10;
	const FCadToolpath RingPath = Gen.Generate(Ring, Tool);
	const FCadSimReport RingSim = Sim.Simulate(Ring.Stock, Tool, FCadGCodeCompiler::Parse(Compiler.Compile(Ring, RingPath)).Moves);
	TestTrue(TEXT("profile cut clean"), RingSim.bOk && RingSim.RemovedVolume > 0);

	// Too-narrow pocket is refused, not attempted.
	FCadPart Narrow = Part;
	Narrow.Features[0].Shape = FCadGeometry::Rectangle(FVector2D(50, 40), 4, 40);
	TestTrue(TEXT("tool does not fit"), Gen.Generate(Narrow, Tool).Errors.Num() > 0);

	// A rapid straight through the stock is a collision.
	TArray<FCadMove> Crash;
	FCadMove M;
	M.Position = FVector(-10, 40, 5);
	Crash.Add(M);
	M.Position = FVector(-10, 40, -3);
	Crash.Add(M);
	M.Position = FVector(110, 40, -3);
	Crash.Add(M);
	TestTrue(TEXT("rapid collision detected"), Sim.Simulate(Part.Stock, Tool, Crash).RapidCollisions > 0);

	// Offsets: a 10 mm square shrunk by 2 is 6 mm.
	const FCadPolygon Shrunk = FCadGeometry::Offset(FCadGeometry::Rectangle(FVector2D::ZeroVector, 10, 10), -2);
	TestTrue(TEXT("inset area"), FMath::IsNearlyEqual(FCadGeometry::SignedArea(Shrunk), 36.0, 1e-6));
	TestEqual(TEXT("inset too far vanishes"), FCadGeometry::Offset(FCadGeometry::Rectangle(FVector2D::ZeroVector, 10, 10), -6).Points.Num(), 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FPrimordiaExecutorTest, "Primordia.Executor", PRIMORDIA_TEST_FLAGS)
bool FPrimordiaExecutorTest::RunTest(const FString&)
{
	FPrimordiaIntentRouter Router;
	TArray<FSpellwrightStepCallback> Pending;
	Router.RegisterOp(TEXT("test.make"), [](const FSpellwrightStep& S, FSpellwrightStepCallback)
	{
		FSpellwrightStepResult R = FSpellwrightStepResult::Success();
		R.Outputs.Add(TEXT("value"), S.GetArg(TEXT("v")));
		return R;
	});
	Router.RegisterOp(TEXT("test.async"), [&Pending](const FSpellwrightStep&, FSpellwrightStepCallback Done)
	{
		Pending.Add(MoveTemp(Done));
		return FSpellwrightStepResult::PendingJob(TEXT("job-1"));
	});
	TArray<FString> Seen;
	Router.RegisterOp(TEXT("test.echo"), [&Seen](const FSpellwrightStep& S, FSpellwrightStepCallback)
	{
		Seen.Add(S.GetArg(TEXT("text")));
		return FSpellwrightStepResult::Success();
	});
	Router.RegisterOp(TEXT("test.fail"), [](const FSpellwrightStep&, FSpellwrightStepCallback) { return FSpellwrightStepResult::Failure(TEXT("no")); });

	auto Step = [](const TCHAR* Op, const TCHAR* Label, TArray<FName> After, TMap<FString, FString> Args)
	{
		FSpellwrightStep S;
		S.Op = Op;
		S.Label = Label;
		S.After = MoveTemp(After);
		S.Args = MoveTemp(Args);
		return S;
	};
	FSpellwrightSpell Spell;
	Spell.Id = FGuid::NewGuid();
	Spell.Name = TEXT("t");
	Spell.Steps = {
		Step(TEXT("test.make"), TEXT("a"), {}, {{TEXT("v"), TEXT("42")}}),
		Step(TEXT("test.async"), TEXT("b"), {TEXT("a")}, {}),
		Step(TEXT("test.echo"), TEXT("c"), {TEXT("b")}, {{TEXT("text"), TEXT("a=${a.value} b=${b.out}")}}),
	};

	TSharedRef<FPrimordiaActionExecutor> Exec = MakeShared<FPrimordiaActionExecutor>();
	bool bFinished = false, bOk = false;
	Exec->OnRunFinished = [&](const FPrimordiaSpellRun& Run) { bFinished = true; bOk = Run.bSucceeded; };
	Exec->Begin(Spell, 0.0);
	Exec->Advance(Router, 0.0);
	Exec->Advance(Router, 0.1);
	TestEqual(TEXT("async step is waiting"), Pending.Num(), 1);
	TestFalse(TEXT("not finished yet"), bFinished);
	FSpellwrightStepResult Done = FSpellwrightStepResult::Success();
	Done.Outputs.Add(TEXT("out"), TEXT("ok"));
	Pending[0](Done);
	Exec->Advance(Router, 0.2);
	TestTrue(TEXT("finished"), bFinished && bOk);
	TestEqual(TEXT("outputs flowed"), Seen.Num() == 1 ? Seen[0] : FString(), FString(TEXT("a=42 b=ok")));

	// A failure skips its dependents but not independent steps.
	FSpellwrightSpell Two;
	Two.Id = FGuid::NewGuid();
	Two.Steps = {
		Step(TEXT("test.fail"), TEXT("x"), {}, {}),
		Step(TEXT("test.echo"), TEXT("y"), {TEXT("x")}, {{TEXT("text"), TEXT("never")}}),
		Step(TEXT("test.echo"), TEXT("z"), {}, {{TEXT("text"), TEXT("independent")}}),
	};
	bFinished = false;
	Exec->Begin(Two, 1.0);
	Exec->Advance(Router, 1.0);
	const FPrimordiaSpellRun* Run = Exec->FindRun(Two.Id);
	TestTrue(TEXT("run finished as failed"), bFinished && !bOk);
	TestTrue(TEXT("dependent skipped"), Run && Run->States[1] == EPrimordiaStepState::Skipped);
	TestTrue(TEXT("independent ran"), Seen.Contains(TEXT("independent")) && !Seen.Contains(TEXT("never")));

	// Timeouts.
	FSpellwrightSpell Slow;
	Slow.Id = FGuid::NewGuid();
	Slow.Steps = {Step(TEXT("test.async"), TEXT("s"), {}, {})};
	Exec->StepTimeoutSeconds = 5.0;
	bFinished = false;
	Exec->Begin(Slow, 10.0);
	Exec->Advance(Router, 10.0);
	Exec->Advance(Router, 16.0);
	TestTrue(TEXT("stuck step times out"), bFinished && !bOk);

	// Memory merges repeats and recalls by relevance.
	FPrimordiaMemory Mem;
	Mem.Remember(TEXT("observation"), TEXT("The lantern by the gate flickered"), {TEXT("lantern")}, 0.5f);
	Mem.Remember(TEXT("observation"), TEXT("The lantern by the gate flickered"), {TEXT("lantern")}, 0.5f);
	Mem.Remember(TEXT("observation"), TEXT("A spire rose in the east"), {TEXT("spire")}, 0.5f);
	TestEqual(TEXT("repeats merge"), Mem.Num(), 2);
	const TArray<FPrimordiaMemoryRecord> Recalled = Mem.Recall(TEXT("lantern gate"), {}, 1);
	TestTrue(TEXT("recall by words"), Recalled.Num() == 1 && Recalled[0].Summary.Contains(TEXT("lantern")) && Recalled[0].Repeats == 2);
	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
