#pragma once

#include "CoreMinimal.h"
#include "JulesTypes.h"
#include "SpellwrightTypes.h"

class FLoreCodex;

/**
 * Evaluates spells against rules. Runs after Spellwright (structure is already valid) and before the
 * action executor. Deterministic apart from RateLimit, which remembers what it approved.
 */
class PRIMORDIAJULESSUBSYSTEM_API FJulesEngine
{
public:
	bool LoadRulesFromJson(const FString& Json, FString& OutError);
	FString SaveRulesToJson() const;

	void AddRule(const FJulesRule& Rule);
	bool RemoveRule(FName Id);
	void SetRuleEnabled(FName Id, bool bEnabled);
	const TArray<FJulesRule>& GetRules() const { return Rules; }

	/** Checks that every rule is internally consistent (known kinds have what they need). */
	TArray<FString> ValidateRules() const;

	/**
	 * @param Now  seconds on any monotonic clock (used by RateLimit).
	 * @param bCommit  when true and the spell is approved, its steps count against rate limits.
	 */
	FJulesReport Evaluate(const FSpellwrightSpell& Spell, const FLoreCodex* Codex, double Now, bool bCommit = true);

	void ResetRateLimits() { RateHistory.Reset(); }

	/** Root for relative allow-list paths. */
	FString BaseDir;

	static bool WildcardMatch(const FString& Pattern, const FString& Text);

private:
	void EvaluateConstraint(const FJulesRule& Rule, const FJulesConstraint& C, const FSpellwrightSpell& Spell, const FLoreCodex* Codex, double Now, FJulesReport& Report) const;
	void Violate(FJulesReport& Report, const FJulesRule& Rule, int32 Step, const FString& Message) const;
	const TArray<FString>& LoadAllowlist(const FString& Path) const;

	TArray<FJulesRule> Rules;
	/** Op pattern key -> approval times. */
	TMap<FString, TArray<double>> RateHistory;

	struct FAllowlistCache
	{
		FDateTime Stamp;
		TArray<FString> Tasks;
	};
	mutable TMap<FString, FAllowlistCache> AllowlistCache;
};
