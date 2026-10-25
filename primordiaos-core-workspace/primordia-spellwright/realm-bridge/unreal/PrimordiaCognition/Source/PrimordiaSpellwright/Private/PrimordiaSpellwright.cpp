#include "PrimordiaSpellwright.h"

#include "Modules/ModuleManager.h"
#include "SpellwrightOps.h"
#include "SpellwrightTypes.h"

DEFINE_LOG_CATEGORY(LogSpellwright);

IMPLEMENT_MODULE(FPrimordiaSpellwrightModule, PrimordiaSpellwright)

void FPrimordiaSpellwrightModule::StartupModule()
{
	FSpellwrightOpRegistry::Get().RegisterBuiltins();
}

FName FSpellwrightStep::GetDomain() const
{
	FString Domain, Rest;
	return Op.ToString().Split(TEXT("."), &Domain, &Rest) ? FName(*Domain) : NAME_None;
}

int32 FSpellwrightSpell::FindStep(FName InLabel) const
{
	return Steps.IndexOfByPredicate([InLabel](const FSpellwrightStep& S) { return S.Label == InLabel; });
}

FString FSpellwrightIssue::ToString() const
{
	FString Where;
	if (Line > 0)
	{
		Where = FString::Printf(TEXT("line %d: "), Line);
	}
	else if (StepIndex != INDEX_NONE)
	{
		Where = FString::Printf(TEXT("step %d: "), StepIndex + 1);
	}
	return FString::Printf(TEXT("%s%s%s"), Severity == ESpellwrightIssueSeverity::Error ? TEXT("error: ") : TEXT("warning: "), *Where, *Message);
}
