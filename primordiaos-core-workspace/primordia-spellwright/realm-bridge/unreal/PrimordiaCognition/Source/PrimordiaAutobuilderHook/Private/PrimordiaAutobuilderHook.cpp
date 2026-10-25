#include "PrimordiaAutobuilderHook.h"

#include "Dom/JsonObject.h"
#include "Framework/Application/SlateApplication.h"
#include "Framework/Notifications/NotificationManager.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Interfaces/IPluginManager.h"
#include "Misc/App.h"
#include "Misc/CoreDelegates.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "PrimordiaBlenderSubsystem.h"
#include "PrimordiaBoltBridgeSubsystem.h"
#include "PrimordiaJulesSubsystem.h"
#include "PrimordiaLoreSubsystem.h"
#include "PrimordiaSpellwrightSubsystem.h"
#include "Serialization/JsonSerializer.h"
#include "SpellwrightOps.h"
#include "Widgets/Notifications/SNotificationList.h"

#if PRIMORDIA_WITH_LIVE_CODING
#include "ILiveCodingModule.h"
#endif

DEFINE_LOG_CATEGORY(LogAutobuilder);

IMPLEMENT_MODULE(FPrimordiaAutobuilderHookModule, PrimordiaAutobuilderHook)

namespace
{
	const TCHAR* RuntimeModules[] = {
		TEXT("PrimordiaLoreEngine"), TEXT("PrimordiaSpellwright"), TEXT("PrimordiaJulesSubsystem"), TEXT("PrimordiaBoltBridge"),
		TEXT("PrimordiaCADCAM"), TEXT("PrimordiaBlenderSubsystem"), TEXT("PrimordiaDaVinciSubsystem"), TEXT("PrimordiaCognition"),
	};
}

void FPrimordiaValidationReport::Add(const FString& Name, bool bOk, const FString& Message, bool bAdvisory)
{
	FPrimordiaValidationCheck& C = Checks.AddDefaulted_GetRef();
	C.Name = Name;
	C.bPassed = bOk;
	C.Message = Message;
	C.bAdvisory = bAdvisory;
	if (!bOk && !bAdvisory)
	{
		bPassed = false;
	}
}

void UPrimordiaAutobuilderHook::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	if (!GetDefault<UPrimordiaAutobuilderSettings>()->bValidateOnStartup || IsRunningCommandlet() || FApp::IsUnattended())
	{
		return;
	}
	// Validate once everything (every plugin, every engine subsystem) is up.
	LoopInitHandle = FCoreDelegates::OnFEngineLoopInitComplete.AddUObject(this, &UPrimordiaAutobuilderHook::RunStartupValidation);
}

void UPrimordiaAutobuilderHook::Deinitialize()
{
	FCoreDelegates::OnFEngineLoopInitComplete.Remove(LoopInitHandle);
	Super::Deinitialize();
}

bool UPrimordiaAutobuilderHook::IsLiveCodingAvailable()
{
#if PRIMORDIA_WITH_LIVE_CODING
	ILiveCodingModule* LiveCoding = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
	return LiveCoding && LiveCoding->IsEnabledForSession();
#else
	return false;
#endif
}

void UPrimordiaAutobuilderHook::Post(const FString& Path, const TSharedRef<FJsonObject>& Body)
{
	const UPrimordiaAutobuilderSettings* S = GetDefault<UPrimordiaAutobuilderSettings>();
	FString Text;
	FJsonSerializer::Serialize(Body, TJsonWriterFactory<>::Create(&Text));
	FString Base = S->ServerUrl;
	Base.RemoveFromEnd(TEXT("/"));
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Base + Path);
	Request->SetVerb(TEXT("POST"));
	Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
	if (!S->ApiKey.IsEmpty())
	{
		Request->SetHeader(TEXT("X-Autobuilder-Key"), S->ApiKey);
	}
	Request->SetTimeout(10.f);
	Request->SetContentAsString(Text);
	TWeakObjectPtr<UPrimordiaAutobuilderHook> WeakThis(this);
	Request->OnProcessRequestComplete().BindLambda([WeakThis, Path](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		UPrimordiaAutobuilderHook* Self = WeakThis.Get();
		if (!Self)
		{
			return;
		}
		const bool bOk = bConnected && Response.IsValid() && Response->GetResponseCode() >= 200 && Response->GetResponseCode() < 300;
		const FString Reply = Response.IsValid() ? Response->GetContentAsString() : TEXT("{\"error\":\"Autobuilder server unreachable\"}");
		UE_LOG(LogAutobuilder, Log, TEXT("POST %s -> %s %s"), *Path, bOk ? TEXT("ok") : TEXT("failed"), *Reply.Left(300));
		Self->Notify(bOk ? FString::Printf(TEXT("Autobuilder accepted %s"), *Path) : FString::Printf(TEXT("Autobuilder %s failed: %s"), *Path, *Reply.Left(160)), bOk);
		Self->OnServerReply.Broadcast(bOk, Reply);
	});
	Request->ProcessRequest();
}

EPrimordiaRebuildRoute UPrimordiaAutobuilderHook::RequestRebuild(const FString& Reason, bool bAllowLiveCoding)
{
	const UPrimordiaAutobuilderSettings* S = GetDefault<UPrimordiaAutobuilderSettings>();
#if PRIMORDIA_WITH_LIVE_CODING
	if (bAllowLiveCoding && S->bPreferLiveCoding && IsLiveCodingAvailable())
	{
		ILiveCodingModule& LiveCoding = FModuleManager::GetModuleChecked<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
		if (LiveCoding.IsCompiling())
		{
			Notify(TEXT("Live Coding is already compiling"), false);
			return EPrimordiaRebuildRoute::LiveCoding;
		}
		ELiveCodingCompileResult Result = ELiveCodingCompileResult::NotStarted;
		LiveCoding.Compile(ELiveCodingCompileFlags::None, &Result);
		if (Result == ELiveCodingCompileResult::InProgress || Result == ELiveCodingCompileResult::Success || Result == ELiveCodingCompileResult::NoChanges)
		{
			UE_LOG(LogAutobuilder, Log, TEXT("Live Coding rebuild started: %s"), *Reason);
			Notify(TEXT("Live Coding rebuild started"), true);
			return EPrimordiaRebuildRoute::LiveCoding;
		}
		UE_LOG(LogAutobuilder, Warning, TEXT("Live Coding could not start (result %d); falling back to the Autobuilder"), static_cast<int32>(Result));
	}
#endif
	TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
	Body->SetStringField(TEXT("reason"), Reason.IsEmpty() ? TEXT("editor request") : Reason);
	// The running editor holds its module DLLs; only a standalone plugin build can run now.
	Body->SetStringField(TEXT("mode"), TEXT("plugin"));
	Body->SetStringField(TEXT("configuration"), S->Configuration);
	Body->SetStringField(TEXT("project"), FPaths::ConvertRelativePathToFull(FPaths::GetProjectFilePath()));
	if (const TSharedPtr<IPlugin> Plugin = IPluginManager::Get().FindPlugin(TEXT("PrimordiaCognition")))
	{
		Body->SetStringField(TEXT("plugin"), FPaths::ConvertRelativePathToFull(Plugin->GetDescriptorFileName()));
	}
	Body->SetStringField(TEXT("source"), TEXT("editor"));
	Post(TEXT("/build"), Body);
	return EPrimordiaRebuildRoute::Autobuilder;
}

void UPrimordiaAutobuilderHook::RequestDeploy(const FString& Reason)
{
	TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
	Body->SetStringField(TEXT("reason"), Reason.IsEmpty() ? TEXT("editor request") : Reason);
	Body->SetStringField(TEXT("project"), FPaths::ConvertRelativePathToFull(FPaths::GetProjectFilePath()));
	Body->SetStringField(TEXT("source"), TEXT("editor"));
	Post(TEXT("/deploy"), Body);
}

void UPrimordiaAutobuilderHook::QueryStatus()
{
	FString Base = GetDefault<UPrimordiaAutobuilderSettings>()->ServerUrl;
	Base.RemoveFromEnd(TEXT("/"));
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Base + TEXT("/status"));
	Request->SetVerb(TEXT("GET"));
	Request->SetTimeout(5.f);
	TWeakObjectPtr<UPrimordiaAutobuilderHook> WeakThis(this);
	Request->OnProcessRequestComplete().BindLambda([WeakThis](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		if (UPrimordiaAutobuilderHook* Self = WeakThis.Get())
		{
			const bool bOk = bConnected && Response.IsValid() && Response->GetResponseCode() == 200;
			Self->OnServerReply.Broadcast(bOk, Response.IsValid() ? Response->GetContentAsString() : FString());
		}
	});
	Request->ProcessRequest();
}

void UPrimordiaAutobuilderHook::RunStartupValidation()
{
	LastReport = FPrimordiaValidationReport();
	FPrimordiaValidationReport& R = LastReport;

	// Modules
	TArray<FString> Missing;
	for (const TCHAR* Name : RuntimeModules)
	{
		if (!FModuleManager::Get().IsModuleLoaded(Name)) { Missing.Add(Name); }
	}
	R.Add(TEXT("Modules"), Missing.Num() == 0, Missing.Num() == 0 ? FString::Printf(TEXT("all %d runtime modules loaded"), static_cast<int32>(UE_ARRAY_COUNT(RuntimeModules)))
		: FString::Printf(TEXT("not loaded: %s"), *FString::Join(Missing, TEXT(", "))));

	// Lore
	if (const UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get())
	{
		const FLoreCodex& C = Lore->GetCodex();
		const TArray<FString> Issues = C.Validate();
		R.Add(TEXT("Lore codex"), C.GetRealms().Num() > 0 && Issues.Num() == 0,
			FString::Printf(TEXT("era %d: %d entries, %d realms, %d factions, %d glyphs%s"), C.GetEra(), C.GetEntries().Num(), C.GetRealms().Num(), C.GetFactions().Num(), C.GetGlyphs().Num(),
				Issues.Num() > 0 ? *FString::Printf(TEXT("; %d issues, first: %s"), Issues.Num(), *Issues[0]) : TEXT("")));
	}
	else
	{
		R.Add(TEXT("Lore codex"), false, TEXT("Lore subsystem missing"));
	}

	// Spellwright: every template must compile against the op registry
	if (const UPrimordiaSpellwrightSubsystem* SW = UPrimordiaSpellwrightSubsystem::Get())
	{
		const TArray<FName> Verbs = SW->GetVerbs();
		TArray<FString> Broken;
		for (const FName& Verb : Verbs)
		{
			FSpellwrightIntent Probe;
			Probe.Verb = Verb;
			Probe.Subject = TEXT("validation");
			for (const FString& P : {TEXT("tag"), TEXT("class"), TEXT("source"), TEXT("reason"), TEXT("object")})
			{
				Probe.Params.Add(P, P == FString(TEXT("class")) ? TEXT("/Script/Engine.PointLight") : TEXT("validation"));
			}
			FSpellwrightSpell Spell;
			TArray<FSpellwrightIssue> Issues;
			if (!SW->CompileIntent(Probe, Spell, Issues))
			{
				Broken.Add(FString::Printf(TEXT("%s (%s)"), *Verb.ToString(), Issues.Num() > 0 ? *Issues[0].ToString() : TEXT("?")));
			}
		}
		R.Add(TEXT("Spellwright"), Verbs.Num() > 0 && Broken.Num() == 0,
			Broken.Num() == 0 ? FString::Printf(TEXT("%d templates compile, %d ops registered"), Verbs.Num(), FSpellwrightOpRegistry::Get().Num())
				: FString::Printf(TEXT("templates that do not compile: %s"), *FString::Join(Broken, TEXT("; "))));
	}
	else
	{
		R.Add(TEXT("Spellwright"), false, TEXT("Spellwright subsystem missing"));
	}

	// Jules
	if (const UPrimordiaJulesSubsystem* Jules = UPrimordiaJulesSubsystem::Get())
	{
		const TArray<FString> Issues = Jules->ValidateRules();
		R.Add(TEXT("Jules"), Jules->GetRules().Num() > 0 && Issues.Num() == 0,
			Issues.Num() == 0 ? FString::Printf(TEXT("%d rules"), Jules->GetRules().Num()) : FString::Join(Issues, TEXT("; ")));
	}
	else
	{
		R.Add(TEXT("Jules"), false, TEXT("Jules subsystem missing"));
	}

	// Network services answer asynchronously; they are advisory (a server that is not running is not a broken install).
	PendingChecks = 3;
	TWeakObjectPtr<UPrimordiaAutobuilderHook> WeakThis(this);
	auto Done = [WeakThis](const FString& Name, bool bOk, const FString& Message)
	{
		if (UPrimordiaAutobuilderHook* Self = WeakThis.Get())
		{
			Self->LastReport.Add(Name, bOk, Message, true);
			if (--Self->PendingChecks == 0) { Self->FinishValidation(); }
		}
	};

	if (UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get())
	{
		const FString Url = GetDefault<UPrimordiaBoltSettings>()->RestUrl;
		Bolt->CheckHealth([Done, Url](bool bOk, const FString& Body)
		{
			Done(TEXT("Bolt pipeline"), bOk, bOk ? FString::Printf(TEXT("%s healthy"), *Url) : FString::Printf(TEXT("%s not answering (start pipeline/bolt)"), *Url));
		});
	}
	else
	{
		Done(TEXT("Bolt pipeline"), false, TEXT("Bolt bridge missing"));
	}

	{
		FString Base = GetDefault<UPrimordiaAutobuilderSettings>()->ServerUrl;
		Base.RemoveFromEnd(TEXT("/"));
		const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
		Request->SetURL(Base + TEXT("/status"));
		Request->SetVerb(TEXT("GET"));
		Request->SetTimeout(3.f);
		Request->OnProcessRequestComplete().BindLambda([Done, Base](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
		{
			const bool bOk = bConnected && Response.IsValid() && Response->GetResponseCode() == 200;
			Done(TEXT("Autobuilder"), bOk, bOk ? FString::Printf(TEXT("%s up"), *Base) : FString::Printf(TEXT("%s not answering (start pipeline/autobuilder)"), *Base));
		});
		Request->ProcessRequest();
	}

	if (UPrimordiaBlenderSubsystem* Blender = UPrimordiaBlenderSubsystem::Get())
	{
		Blender->Ping([Done](bool bOk, const FString& Info)
		{
			Done(TEXT("Blender RPC"), bOk, bOk ? FString::Printf(TEXT("Blender %s"), *Info) : TEXT("not running (the Bolt server starts it on demand when BLENDER_EXE is set)"));
		});
	}
	else
	{
		Done(TEXT("Blender RPC"), false, TEXT("Blender subsystem missing"));
	}
}

void UPrimordiaAutobuilderHook::FinishValidation()
{
	LastReport.FinishedAt = FDateTime::UtcNow();
	int32 Failed = 0, Advisory = 0;
	for (const FPrimordiaValidationCheck& C : LastReport.Checks)
	{
		const ELogVerbosity::Type Level = C.bPassed ? ELogVerbosity::Log : (C.bAdvisory ? ELogVerbosity::Display : ELogVerbosity::Warning);
		if (Level == ELogVerbosity::Warning)
		{
			UE_LOG(LogAutobuilder, Warning, TEXT("[FAIL] %s: %s"), *C.Name, *C.Message);
		}
		else
		{
			UE_LOG(LogAutobuilder, Log, TEXT("[%s] %s: %s"), C.bPassed ? TEXT("ok") : TEXT("off"), *C.Name, *C.Message);
		}
		Failed += (!C.bPassed && !C.bAdvisory) ? 1 : 0;
		Advisory += (!C.bPassed && C.bAdvisory) ? 1 : 0;
	}
	Notify(LastReport.bPassed ? FString::Printf(TEXT("PrimordiaOS validated (%d checks, %d services offline)"), LastReport.Checks.Num(), Advisory)
		: FString::Printf(TEXT("PrimordiaOS validation: %d problems (see Output Log, LogAutobuilder)"), Failed), LastReport.bPassed);
	OnValidated.Broadcast(LastReport);
}

void UPrimordiaAutobuilderHook::Notify(const FString& Text, bool bSuccess)
{
	if (!FSlateApplication::IsInitialized())
	{
		return;
	}
	FNotificationInfo Info(FText::FromString(Text));
	Info.ExpireDuration = 6.f;
	Info.bUseSuccessFailIcons = true;
	TSharedPtr<SNotificationItem> Item = FSlateNotificationManager::Get().AddNotification(Info);
	if (Item.IsValid())
	{
		Item->SetCompletionState(bSuccess ? SNotificationItem::CS_Success : SNotificationItem::CS_Fail);
	}
}
