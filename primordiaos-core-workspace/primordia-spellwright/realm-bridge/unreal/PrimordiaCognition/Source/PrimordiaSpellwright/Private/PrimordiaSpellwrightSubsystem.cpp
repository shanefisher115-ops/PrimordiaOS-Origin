#include "PrimordiaSpellwrightSubsystem.h"

#include "Engine/Engine.h"
#include "HAL/FileManager.h"
#include "Misc/Paths.h"
#include "PrimordiaLoreEngine.h"
#include "PrimordiaLoreSubsystem.h"
#include "PrimordiaSpellwright.h"
#include "SpellwrightOps.h"
#include "SpellwrightSerializer.h"

void UPrimordiaSpellwrightSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Collection.InitializeDependency<UPrimordiaLoreSubsystem>();
	Super::Initialize(Collection);
	ReloadTemplates();
}

UPrimordiaSpellwrightSubsystem* UPrimordiaSpellwrightSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaSpellwrightSubsystem>() : nullptr;
}

int32 UPrimordiaSpellwrightSubsystem::ReloadTemplates()
{
	Compiler = FSpellwrightCompiler();
	TArray<FString> Files;
	Files.Add(FPaths::Combine(FLoreText::ResourcesDir(), TEXT("Spellwright"), TEXT("templates.spell")));

	// Project overrides load last, so they replace founding templates of the same verb.
	const FString OverrideDir = FLoreText::SavedDir(TEXT("Spellwright"));
	TArray<FString> Overrides;
	IFileManager::Get().FindFiles(Overrides, *FPaths::Combine(OverrideDir, TEXT("*.spell")), true, false);
	Overrides.Sort();
	for (const FString& F : Overrides)
	{
		Files.Add(FPaths::Combine(OverrideDir, F));
	}

	for (const FString& File : Files)
	{
		TArray<FSpellwrightIssue> Issues;
		Compiler.LoadTemplatesFromFile(File, Issues);
		for (const FSpellwrightIssue& Issue : Issues)
		{
			UE_LOG(LogSpellwright, Warning, TEXT("%s: %s"), *File, *Issue.ToString());
		}
	}
	return Compiler.GetVerbs().Num();
}

TArray<FSpellwrightSpell> UPrimordiaSpellwrightSubsystem::CompileSource(const FString& Source, TArray<FSpellwrightIssue>& OutIssues) const
{
	const UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get();
	FSpellwrightCompiler::FParseResult Result = Compiler.CompileSource(Source, Lore ? &Lore->GetCodex() : nullptr, TEXT("user"));
	OutIssues = Result.Issues;
	for (const FSpellwrightSpell& Spell : Result.Spells)
	{
		OutIssues.Append(Validator.Validate(Spell));
	}
	return Result.Spells;
}

bool UPrimordiaSpellwrightSubsystem::CompileIntent(const FSpellwrightIntent& Intent, FSpellwrightSpell& OutSpell, TArray<FSpellwrightIssue>& OutIssues) const
{
	const UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get();
	if (!Compiler.CompileIntent(Intent, Lore ? &Lore->GetCodex() : nullptr, OutSpell, OutIssues))
	{
		return false;
	}
	OutIssues.Append(Validator.Validate(OutSpell));
	return !FSpellwrightValidator::HasErrors(OutIssues);
}

FString UPrimordiaSpellwrightSubsystem::SpellToJson(const FSpellwrightSpell& Spell) const
{
	return FSpellwrightSerializer::ToJson(Spell, true);
}

FString UPrimordiaSpellwrightSubsystem::SpellToDsl(const FSpellwrightSpell& Spell) const
{
	return FSpellwrightSerializer::ToDsl(Spell);
}

TArray<FName> UPrimordiaSpellwrightSubsystem::GetOps() const
{
	return FSpellwrightOpRegistry::Get().GetOps();
}
