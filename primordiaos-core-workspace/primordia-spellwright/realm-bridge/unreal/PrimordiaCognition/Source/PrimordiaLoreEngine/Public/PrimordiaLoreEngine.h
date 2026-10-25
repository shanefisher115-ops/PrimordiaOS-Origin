#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"

PRIMORDIALOREENGINE_API DECLARE_LOG_CATEGORY_EXTERN(LogPrimordiaLore, Log, All);

class FPrimordiaLoreEngineModule : public IModuleInterface
{
public:
	virtual void StartupModule() override {}
	virtual void ShutdownModule() override {}
};

/** Text helpers shared by every module that scores text against lore or memory. */
struct PRIMORDIALOREENGINE_API FLoreText
{
	/** Lower-case alphanumeric tokens with stop words removed. */
	static TArray<FString> Tokenize(const FString& Text);

	/** Distinct consonants of a phrase, in order of first appearance (the PRS-1 glyph-intent reduction). */
	static FString DistinctConsonants(const FString& Text);

	/** Path of the plugin's Resources folder, or empty if the plugin is not mounted. */
	static FString ResourcesDir();

	/** Saved/Primordia/<Sub> under the project's saved directory. */
	static FString SavedDir(const FString& Sub);
};
