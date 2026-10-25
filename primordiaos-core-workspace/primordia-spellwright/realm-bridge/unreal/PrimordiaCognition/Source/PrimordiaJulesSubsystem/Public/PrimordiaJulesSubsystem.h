#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Subsystems/EngineSubsystem.h"
#include "JulesEngine.h"
#include "JulesTypes.h"
#include "PrimordiaJulesSubsystem.generated.h"

PRIMORDIAJULESSUBSYSTEM_API DECLARE_LOG_CATEGORY_EXTERN(LogJules, Log, All);

class FPrimordiaJulesSubsystemModule : public IModuleInterface
{
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnJulesVerdict, const FJulesReport&, Report);

/**
 * Owns the Jules rule set: Resources/Jules/rules.json, replaced wholesale by
 * Saved/Primordia/Jules/rules.json when that exists.
 */
UCLASS()
class PRIMORDIAJULESSUBSYSTEM_API UPrimordiaJulesSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	static UPrimordiaJulesSubsystem* Get();

	FJulesEngine& GetEngine() { return Engine; }

	/** Judges a spell (and, if approved, counts it against rate limits). */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Jules")
	FJulesReport Evaluate(const FSpellwrightSpell& Spell);

	/** Judges without recording anything (for previews and editor validation). */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Jules")
	FJulesReport Preview(const FSpellwrightSpell& Spell);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Jules")
	TArray<FJulesRule> GetRules() const { return Engine.GetRules(); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Jules")
	void SetRuleEnabled(FName RuleId, bool bEnabled) { Engine.SetRuleEnabled(RuleId, bEnabled); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Jules")
	bool ReloadRules();

	/** Writes the current rules to Saved/Primordia/Jules/rules.json. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Jules")
	bool SaveRules() const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Jules")
	TArray<FString> ValidateRules() const { return Engine.ValidateRules(); }

	UPROPERTY(BlueprintAssignable, Category = "Primordia|Jules")
	FOnJulesVerdict OnVerdict;

	UPROPERTY(BlueprintReadOnly, Category = "Primordia|Jules") int32 Approved = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Primordia|Jules") int32 Rejected = 0;

private:
	FJulesEngine Engine;
};
