#include "PrimordiaLoreEngine.h"

#include "Interfaces/IPluginManager.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"

DEFINE_LOG_CATEGORY(LogPrimordiaLore);

IMPLEMENT_MODULE(FPrimordiaLoreEngineModule, PrimordiaLoreEngine)

namespace
{
	const TSet<FString>& StopWords()
	{
		static const TSet<FString> Words = {
			TEXT("a"), TEXT("an"), TEXT("and"), TEXT("are"), TEXT("as"), TEXT("at"), TEXT("be"), TEXT("by"),
			TEXT("for"), TEXT("from"), TEXT("has"), TEXT("in"), TEXT("is"), TEXT("it"), TEXT("its"), TEXT("of"),
			TEXT("on"), TEXT("or"), TEXT("that"), TEXT("the"), TEXT("this"), TEXT("to"), TEXT("was"), TEXT("were"),
			TEXT("will"), TEXT("with"), TEXT("into"), TEXT("their"), TEXT("they"), TEXT("which"), TEXT("who"),
		};
		return Words;
	}

	bool IsVowel(TCHAR C)
	{
		switch (FChar::ToLower(C))
		{
		case 'a': case 'e': case 'i': case 'o': case 'u': case 'y': return true;
		default: return false;
		}
	}
}

TArray<FString> FLoreText::Tokenize(const FString& Text)
{
	TArray<FString> Tokens;
	FString Current;
	auto Flush = [&]()
	{
		if (Current.Len() > 1 && !StopWords().Contains(Current))
		{
			Tokens.Add(Current);
		}
		Current.Reset();
	};
	for (const TCHAR C : Text)
	{
		if (FChar::IsAlnum(C))
		{
			Current.AppendChar(FChar::ToLower(C));
		}
		else
		{
			Flush();
		}
	}
	Flush();
	return Tokens;
}

FString FLoreText::DistinctConsonants(const FString& Text)
{
	FString Out;
	for (const TCHAR C : Text)
	{
		if (!FChar::IsAlpha(C) || IsVowel(C))
		{
			continue;
		}
		const TCHAR U = FChar::ToUpper(C);
		int32 Unused;
		if (!Out.FindChar(U, Unused))
		{
			Out.AppendChar(U);
		}
	}
	return Out;
}

FString FLoreText::ResourcesDir()
{
	const TSharedPtr<IPlugin> Plugin = IPluginManager::Get().FindPlugin(TEXT("PrimordiaCognition"));
	return Plugin.IsValid() ? FPaths::Combine(Plugin->GetBaseDir(), TEXT("Resources")) : FString();
}

FString FLoreText::SavedDir(const FString& Sub)
{
	return FPaths::Combine(FPaths::ProjectSavedDir(), TEXT("Primordia"), Sub);
}
