#include "PrimordiaIntentRouter.h"

#include "SpellwrightCompiler.h"

const FPrimordiaStepHandler* FPrimordiaIntentRouter::FindHandler(const FSpellwrightStep& Step) const
{
	if (const FPrimordiaStepHandler* H = Ops.Find(Step.Op))
	{
		return H;
	}
	return Domains.Find(Step.GetDomain());
}

bool FPrimordiaIntentRouter::CanRouteStep(const FSpellwrightStep& Step) const
{
	return FindHandler(Step) != nullptr;
}

bool FPrimordiaIntentRouter::CanRouteIntent(const FSpellwrightIntent& Intent, const FSpellwrightCompiler& Compiler, FString& OutReason) const
{
	if (Intent.Verb.IsNone())
	{
		OutReason = TEXT("intent has no verb");
		return false;
	}
	if (!Compiler.HasTemplate(Intent.Verb))
	{
		TArray<FString> Verbs;
		for (const FName& V : Compiler.GetVerbs()) { Verbs.Add(V.ToString()); }
		OutReason = FString::Printf(TEXT("no spell for verb '%s' (known: %s)"), *Intent.Verb.ToString(), *FString::Join(Verbs, TEXT(", ")));
		return false;
	}
	return true;
}

FSpellwrightStepResult FPrimordiaIntentRouter::RouteStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete) const
{
	const FPrimordiaStepHandler* Handler = FindHandler(Step);
	if (!Handler)
	{
		return FSpellwrightStepResult::Failure(FString::Printf(TEXT("no engine handles %s"), *Step.Op.ToString()));
	}
	return (*Handler)(Step, MoveTemp(OnComplete));
}

TArray<FName> FPrimordiaIntentRouter::GetDomains() const
{
	TArray<FName> Out;
	Domains.GetKeys(Out);
	Out.Sort(FNameLexicalLess());
	return Out;
}
