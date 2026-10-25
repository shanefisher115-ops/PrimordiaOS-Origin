#pragma once

#include "CoreMinimal.h"
#include "Subsystems/EngineSubsystem.h"
#include "SpellwrightCompiler.h"
#include "SpellwrightTypes.h"
#include "SpellwrightValidator.h"
#include "PrimordiaSpellwrightSubsystem.generated.h"

/**
 * Owns the compiler (with the verb templates from Resources/Spellwright/templates.spell, plus
 * Saved/Primordia/Spellwright/*.spell overrides) and exposes Spellwright to Blueprints.
 */
UCLASS()
class PRIMORDIASPELLWRIGHT_API UPrimordiaSpellwrightSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	static UPrimordiaSpellwrightSubsystem* Get();

	const FSpellwrightCompiler& GetCompiler() const { return Compiler; }
	FSpellwrightCompiler& GetCompilerMutable() { return Compiler; }
	const FSpellwrightValidator& GetValidator() const { return Validator; }

	/** Compiles DSL source. Spells that fail validation are still returned; check OutIssues. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	TArray<FSpellwrightSpell> CompileSource(const FString& Source, TArray<FSpellwrightIssue>& OutIssues) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	bool CompileIntent(const FSpellwrightIntent& Intent, FSpellwrightSpell& OutSpell, TArray<FSpellwrightIssue>& OutIssues) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	TArray<FSpellwrightIssue> ValidateSpell(const FSpellwrightSpell& Spell) const { return Validator.Validate(Spell); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	FString SpellToJson(const FSpellwrightSpell& Spell) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	FString SpellToDsl(const FSpellwrightSpell& Spell) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	TArray<FName> GetVerbs() const { return Compiler.GetVerbs(); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	TArray<FName> GetOps() const;

	/** Reloads every template file. Returns the number of verbs. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Spellwright")
	int32 ReloadTemplates();

private:
	FSpellwrightCompiler Compiler;
	FSpellwrightValidator Validator;
};
