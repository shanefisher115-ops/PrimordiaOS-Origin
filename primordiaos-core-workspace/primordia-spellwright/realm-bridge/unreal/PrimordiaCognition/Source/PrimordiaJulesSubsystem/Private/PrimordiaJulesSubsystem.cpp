#include "PrimordiaJulesSubsystem.h"

#include "Engine/Engine.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "PrimordiaLoreEngine.h"
#include "PrimordiaLoreSubsystem.h"
#include "PrimordiaSpellwrightSubsystem.h"

DEFINE_LOG_CATEGORY(LogJules);

IMPLEMENT_MODULE(FPrimordiaJulesSubsystemModule, PrimordiaJulesSubsystem)

void UPrimordiaJulesSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Collection.InitializeDependency<UPrimordiaLoreSubsystem>();
	Collection.InitializeDependency<UPrimordiaSpellwrightSubsystem>();
	Super::Initialize(Collection);
	// Allow-list paths in rules resolve against the plugin's Resources folder first.
	Engine.BaseDir = FLoreText::ResourcesDir();
	ReloadRules();
}

UPrimordiaJulesSubsystem* UPrimordiaJulesSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaJulesSubsystem>() : nullptr;
}

bool UPrimordiaJulesSubsystem::ReloadRules()
{
	const FString Saved = FPaths::Combine(FLoreText::SavedDir(TEXT("Jules")), TEXT("rules.json"));
	const FString Founding = FPaths::Combine(FLoreText::ResourcesDir(), TEXT("Jules"), TEXT("rules.json"));
	const FString Path = FPaths::FileExists(Saved) ? Saved : Founding;

	FString Json, Error;
	if (!FFileHelper::LoadFileToString(Json, *Path) || !Engine.LoadRulesFromJson(Json, Error))
	{
		UE_LOG(LogJules, Error, TEXT("Jules rules failed to load from %s: %s"), *Path, *Error);
		return false;
	}
	for (const FString& Issue : Engine.ValidateRules())
	{
		UE_LOG(LogJules, Warning, TEXT("Jules: %s"), *Issue);
	}
	UE_LOG(LogJules, Log, TEXT("Jules loaded %d rules from %s"), Engine.GetRules().Num(), *Path);
	return true;
}

bool UPrimordiaJulesSubsystem::SaveRules() const
{
	const FString Saved = FPaths::Combine(FLoreText::SavedDir(TEXT("Jules")), TEXT("rules.json"));
	return FFileHelper::SaveStringToFile(Engine.SaveRulesToJson(), *Saved, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM);
}

FJulesReport UPrimordiaJulesSubsystem::Evaluate(const FSpellwrightSpell& Spell)
{
	const UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get();
	FJulesReport Report = Engine.Evaluate(Spell, Lore ? &Lore->GetCodex() : nullptr, FPlatformTime::Seconds(), true);
	(Report.bApproved ? Approved : Rejected)++;
	UE_LOG(LogJules, Log, TEXT("%s"), *Report.Summary());
	OnVerdict.Broadcast(Report);
	return Report;
}

FJulesReport UPrimordiaJulesSubsystem::Preview(const FSpellwrightSpell& Spell)
{
	const UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get();
	return Engine.Evaluate(Spell, Lore ? &Lore->GetCodex() : nullptr, FPlatformTime::Seconds(), false);
}
