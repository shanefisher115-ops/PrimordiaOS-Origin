#include "PrimordiaOllamaBlueprint.h"
#include "PrimordiaOllama.h"
#include "PrimordiaOllamaConversation.h"
#include "PrimordiaOllamaRealm.h"
#include "PrimordiaOllamaSettings.h"
#include "PrimordiaOllamaSubsystem.h"
#include "PrimordiaBlueprintLibrary.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaBridgeSubsystem.h"
#include "PrimordiaPayload.h"
#include "PrimordiaTypes.h"
#include "Actors/RealmRootActor.h"
#include "Engine/Engine.h"
#include "HAL/IConsoleManager.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

namespace
{
	FString ToJson(const TSharedRef<FJsonObject>& Obj)
	{
		FString Out;
		const TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> Writer = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Out);
		FJsonSerializer::Serialize(Obj, Writer);
		return Out;
	}

	/** Parses the model's JSON; tolerates prose or code fences around the object. */
	TSharedPtr<FJsonObject> ParseModelJson(const FString& Text)
	{
		TSharedPtr<FJsonObject> Out;
		if (FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Out) && Out.IsValid())
		{
			return Out;
		}
		int32 First = INDEX_NONE, Last = INDEX_NONE;
		if (Text.FindChar(TEXT('{'), First) && Text.FindLastChar(TEXT('}'), Last) && Last > First)
		{
			const FString Inner = Text.Mid(First, Last - First + 1);
			if (FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Inner), Out) && Out.IsValid())
			{
				return Out;
			}
		}
		return nullptr;
	}
}

// ---------------------------------------------------------------------------

void UPrimordiaOllamaAsyncBase::Begin(const UObject* WorldContextObject)
{
	RegisterWithGameInstance(WorldContextObject);
	AddToRoot(); // editor utility graphs have no game instance to keep us alive
}

void UPrimordiaOllamaAsyncBase::End()
{
	RemoveFromRoot();
	SetReadyToDestroy();
}

// ---------------------------------------------------------------------------

UPrimordiaOllamaAskAction* UPrimordiaOllamaAskAction::AskOllama(const UObject* WorldContextObject, const FString& Prompt, const FString& SystemPrompt, const FString& Model, float Temperature, int32 MaxTokens)
{
	UPrimordiaOllamaAskAction* Action = NewObject<UPrimordiaOllamaAskAction>();
	const FString System = SystemPrompt.IsEmpty() ? UPrimordiaOllamaSettings::Get()->DefaultSystemPrompt : SystemPrompt;
	if (!System.IsEmpty())
	{
		Action->Request.Messages.Emplace(EPrimordiaChatRole::System, System);
	}
	Action->Request.Messages.Emplace(EPrimordiaChatRole::User, Prompt);
	Action->Request.Model = Model;
	Action->Request.Options.Temperature = Temperature;
	Action->Request.Options.MaxTokens = MaxTokens;
	Action->Begin(WorldContextObject);
	return Action;
}

UPrimordiaOllamaAskAction* UPrimordiaOllamaAskAction::SendToConversation(const UObject* WorldContextObject, UPrimordiaOllamaConversation* InConversation, const FString& InMessage)
{
	UPrimordiaOllamaAskAction* Action = NewObject<UPrimordiaOllamaAskAction>();
	Action->Conversation = InConversation;
	Action->Message = InMessage;
	Action->Begin(WorldContextObject);
	return Action;
}

void UPrimordiaOllamaAskAction::Activate()
{
	FPrimordiaOllamaTokenDelegate TokenFn = FPrimordiaOllamaTokenDelegate::CreateWeakLambda(this, [this](const FString& Delta, const FString& TextSoFar)
	{
		OnToken.Broadcast(TextSoFar, Delta, FPrimordiaOllamaStats(), FString());
	});
	FPrimordiaOllamaCompleteDelegate DoneFn = FPrimordiaOllamaCompleteDelegate::CreateWeakLambda(this, [this](bool bOk, const FString& Text, const FPrimordiaOllamaStats& Stats, const FString& Error)
	{
		(bOk ? OnCompleted : OnFailed).Broadcast(Text, FString(), Stats, Error);
		End();
	});

	if (Conversation)
	{
		Conversation->Send(Message, MoveTemp(TokenFn), MoveTemp(DoneFn));
	}
	else if (UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get())
	{
		Ollama->Chat(Request, MoveTemp(TokenFn), MoveTemp(DoneFn));
	}
	else
	{
		OnFailed.Broadcast(FString(), FString(), FPrimordiaOllamaStats(), TEXT("Ollama subsystem unavailable"));
		End();
	}
}

// ---------------------------------------------------------------------------

UPrimordiaOllamaModelsAction* UPrimordiaOllamaModelsAction::ListOllamaModels(const UObject* WorldContextObject)
{
	UPrimordiaOllamaModelsAction* Action = NewObject<UPrimordiaOllamaModelsAction>();
	Action->Begin(WorldContextObject);
	return Action;
}

void UPrimordiaOllamaModelsAction::Activate()
{
	UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get();
	if (!Ollama)
	{
		OnFailed.Broadcast({}, TEXT("Ollama subsystem unavailable"));
		End();
		return;
	}
	Ollama->ListModels(FPrimordiaOllamaModelsDelegate::CreateWeakLambda(this, [this](bool bOk, const TArray<FPrimordiaOllamaModelInfo>& Models, const FString& Error)
	{
		(bOk ? OnCompleted : OnFailed).Broadcast(Models, Error);
		End();
	}));
}

// ---------------------------------------------------------------------------

UPrimordiaOllamaRealmAction* UPrimordiaOllamaRealmAction::GenerateRealmWithOllama(const UObject* WorldContextObject, const FString& InDescription, const FTransform& InTransform, const FString& InModel, bool bInSendToPrimordiaOS, int64 InSeed)
{
	UPrimordiaOllamaRealmAction* Action = NewObject<UPrimordiaOllamaRealmAction>();
	Action->WorldContext = WorldContextObject;
	Action->Description = InDescription;
	Action->Transform = InTransform;
	Action->Model = InModel;
	Action->bSendToPrimordiaOS = bInSendToPrimordiaOS;
	Action->Seed = static_cast<uint32>(InSeed);
	Action->Begin(WorldContextObject);
	return Action;
}

void UPrimordiaOllamaRealmAction::Activate()
{
	TWeakObjectPtr<UPrimordiaOllamaRealmAction> WeakThis(this);
	Generate(WorldContext.Get(), Description, Transform, Model, bSendToPrimordiaOS, Seed,
		[WeakThis](ARealmRootActor* Realm, const FString& ManifestJson, const FString& Error)
		{
			if (UPrimordiaOllamaRealmAction* This = WeakThis.Get())
			{
				if (Realm)
				{
					This->OnCompleted.Broadcast(Realm, ManifestJson, Realm->Manifest.RealmName, Error);
				}
				else
				{
					This->OnFailed.Broadcast(nullptr, ManifestJson, FString(), Error);
				}
				This->End();
			}
		},
		[WeakThis](int32 Chars)
		{
			if (UPrimordiaOllamaRealmAction* This = WeakThis.Get())
			{
				This->OnProgress.Broadcast(nullptr, FString(), FString::Printf(TEXT("%d characters"), Chars), FString());
			}
		});
}

void UPrimordiaOllamaRealmAction::Generate(const UObject* WorldContextObject, const FString& InDescription, const FTransform& InTransform, const FString& InModel, bool bInSend, uint32 InSeed,
	TFunction<void(ARealmRootActor*, const FString&, const FString&)> OnDone, TFunction<void(int32)> OnProgressFn)
{
	UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get();
	FString System, Schema, Error;
	if (!Ollama)
	{
		OnDone(nullptr, FString(), TEXT("Ollama subsystem unavailable"));
		return;
	}
	if (!PrimordiaOllamaRealm::LoadPromptResource(System, Schema, Error))
	{
		OnDone(nullptr, FString(), Error);
		return;
	}

	const UPrimordiaOllamaSettings* Settings = UPrimordiaOllamaSettings::Get();
	FPrimordiaOllamaChatRequest Request;
	Request.Model = !InModel.IsEmpty() ? InModel : Settings->RealmModel;
	Request.Messages.Emplace(EPrimordiaChatRole::System, System);
	Request.Messages.Emplace(EPrimordiaChatRole::User, InDescription);
	Request.Format = Schema;              // decoding is constrained to the PRS-1 design schema
	Request.Options.Temperature = 0.8f;
	Request.Options.MaxTokens = 1500;     // a realm design is ~400-700 tokens

	TWeakObjectPtr<const UObject> WeakContext(WorldContextObject);
	const FPrimordiaOllamaTokenDelegate TokenFn = FPrimordiaOllamaTokenDelegate::CreateLambda([OnProgressFn](const FString&, const FString& TextSoFar)
	{
		if (OnProgressFn) OnProgressFn(TextSoFar.Len());
	});

	Ollama->Chat(Request, TokenFn, FPrimordiaOllamaCompleteDelegate::CreateLambda(
		[WeakContext, InTransform, bInSend, InSeed, OnDone](bool bOk, const FString& Text, const FPrimordiaOllamaStats& Stats, const FString& ChatError)
		{
			if (!bOk)
			{
				OnDone(nullptr, Text, ChatError);
				return;
			}
			const TSharedPtr<FJsonObject> Raw = ParseModelJson(Text);
			if (!Raw.IsValid())
			{
				OnDone(nullptr, Text, FString::Printf(TEXT("%s did not return JSON"), *Stats.Model));
				return;
			}

			TArray<FString> Repairs;
			const TSharedRef<FJsonObject> Repaired = PrimordiaOllamaRealm::RepairManifest(Raw, InSeed, Repairs);
			const FString ManifestJson = ToJson(Repaired);
			if (Repairs.Num() > 0)
			{
				UE_LOG(LogPrimordiaOllama, Log, TEXT("Realm design repaired: %s"), *FString::Join(Repairs, TEXT("; ")));
			}

			FPrimordiaRealmManifest Manifest;
			FString ParseError;
			if (!FPrimordiaRealmManifest::FromJson(Repaired, UPrimordiaBridgeSettings::Get()->UnitsPerMeter, Manifest, ParseError))
			{
				OnDone(nullptr, ManifestJson, ParseError);
				return;
			}

			const UObject* Context = WeakContext.Get();
			ARealmRootActor* Realm = Context ? UPrimordiaBlueprintLibrary::SpawnRealmFromManifest(Context, Manifest, InTransform) : nullptr;
			if (!Realm)
			{
				OnDone(nullptr, ManifestJson, TEXT("No world to spawn the realm in"));
				return;
			}

			// Let PrimordiaOS adopt and evolve it. The echoed manifest has the same realm_id,
			// so Unreal diffs it in place rather than respawning.
			UPrimordiaBridgeSubsystem* Bridge = UPrimordiaBridgeSubsystem::Get(Context);
			if (bInSend && Bridge && Bridge->IsConnected())
			{
				const TSharedRef<FJsonObject> Args = MakeShared<FJsonObject>();
				Args->SetObjectField(TEXT("manifest"), Repaired);
				Bridge->SendCommand(TEXT("load_manifest"), ToJson(Args));
			}

			UE_LOG(LogPrimordiaOllama, Log, TEXT("%s designed realm '%s' (%d tokens, %.1f tok/s, %.0fs)"),
				*Stats.Model, *Manifest.RealmName, Stats.GeneratedTokens, Stats.TokensPerSecond, Stats.TotalSeconds);
			OnDone(Realm, ManifestJson, FString());
		}));
}

// ---------------------------------------------------------------------------

UPrimordiaBridgeRealmAction* UPrimordiaBridgeRealmAction::GenerateRealmViaPrimordiaOS(const UObject* WorldContextObject, const FString& InDescription, const FString& InModel, float InTimeoutSeconds)
{
	UPrimordiaBridgeRealmAction* Action = NewObject<UPrimordiaBridgeRealmAction>();
	Action->WorldContext = WorldContextObject;
	Action->Description = InDescription;
	Action->Model = InModel;
	Action->TimeoutSeconds = InTimeoutSeconds;
	Action->Begin(WorldContextObject);
	return Action;
}

void UPrimordiaBridgeRealmAction::Activate()
{
	UPrimordiaBridgeSubsystem* Bridge = UPrimordiaBridgeSubsystem::Get(WorldContext.Get());
	if (!Bridge || !Bridge->IsConnected())
	{
		Finish(false, FString(), TEXT("PrimordiaOS bridge is not connected (start it with: npm start)"));
		return;
	}
	Bridge->OnPacket.AddDynamic(this, &UPrimordiaBridgeRealmAction::HandlePacket);

	const TSharedRef<FJsonObject> Args = MakeShared<FJsonObject>();
	Args->SetStringField(TEXT("description"), Description);
	if (!Model.IsEmpty())
	{
		Args->SetStringField(TEXT("model"), Model);
	}
	if (!Bridge->SendCommand(TEXT("generate_realm"), ToJson(Args)))
	{
		Finish(false, FString(), TEXT("Could not send generate_realm to PrimordiaOS"));
		return;
	}
	if (TimeoutSeconds > 0.f)
	{
		TimeoutHandle = FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateWeakLambda(this, [this](float)
		{
			TimeoutHandle.Reset();
			Finish(false, FString(), FString::Printf(TEXT("No answer from PrimordiaOS after %.0f s"), TimeoutSeconds));
			return false;
		}), TimeoutSeconds);
	}
}

void UPrimordiaBridgeRealmAction::HandlePacket(const FPrimordiaPacketInfo& Info, UPrimordiaPayload* Payload)
{
	if (Info.Type != EPrimordiaPacketType::Ack || !Payload || Payload->GetString(TEXT("command"), FString()) != TEXT("generate_realm"))
	{
		return;
	}
	if (!Payload->GetBool(TEXT("ok"), false))
	{
		Finish(false, FString(), Payload->GetString(TEXT("error"), TEXT("generate_realm failed")));
		return;
	}
	// The bridge sends the new manifest before this ack, so the realm is already updated here.
	if (Payload->GetString(TEXT("status"), FString()) == TEXT("done"))
	{
		Finish(true, FString::Printf(TEXT("Designed '%s' in %.1f s (%d tokens)"),
			*Payload->GetString(TEXT("realm_name"), FString()), Payload->GetNumber(TEXT("seconds")), Payload->GetInt(TEXT("tokens"))), FString());
	}
}

void UPrimordiaBridgeRealmAction::Finish(bool bSuccess, const FString& Status, const FString& Error)
{
	if (bDone)
	{
		return;
	}
	bDone = true;
	if (TimeoutHandle.IsValid())
	{
		FTSTicker::GetCoreTicker().RemoveTicker(TimeoutHandle);
	}
	UPrimordiaBridgeSubsystem* Bridge = UPrimordiaBridgeSubsystem::Get(WorldContext.Get());
	if (Bridge)
	{
		Bridge->OnPacket.RemoveDynamic(this, &UPrimordiaBridgeRealmAction::HandlePacket);
	}
	ARealmRootActor* Realm = Bridge ? Bridge->GetActiveRealm() : nullptr;
	(bSuccess ? OnCompleted : OnFailed).Broadcast(bSuccess ? Realm : nullptr, FString(), Status, Error);
	End();
}

// ---------------------------------------------------------------------------

UPrimordiaConverseAction* UPrimordiaConverseAction::ConverseWithPrimordiaOS(const UObject* WorldContextObject, const FString& Input, const FString& Model)
{
	UPrimordiaConverseAction* Action = NewObject<UPrimordiaConverseAction>();
	const TSharedRef<FJsonObject> Args = MakeShared<FJsonObject>();
	Args->SetStringField(TEXT("input"), Input);
	if (!Model.IsEmpty())
	{
		Args->SetStringField(TEXT("model"), Model);
	}
	Action->WorldContext = WorldContextObject;
	Action->Command = TEXT("converse");
	Action->ArgsJson = ToJson(Args);
	Action->Begin(WorldContextObject);
	return Action;
}

UPrimordiaConverseAction* UPrimordiaConverseAction::SpeakViaPrimordiaOS(const UObject* WorldContextObject, const FString& Text)
{
	UPrimordiaConverseAction* Action = NewObject<UPrimordiaConverseAction>();
	const TSharedRef<FJsonObject> Args = MakeShared<FJsonObject>();
	Args->SetStringField(TEXT("text"), Text);
	Action->WorldContext = WorldContextObject;
	Action->Command = TEXT("speak");
	Action->ArgsJson = ToJson(Args);
	Action->Begin(WorldContextObject);
	return Action;
}

void UPrimordiaConverseAction::Activate()
{
	UPrimordiaBridgeSubsystem* Bridge = UPrimordiaBridgeSubsystem::Get(WorldContext.Get());
	if (!Bridge || !Bridge->IsConnected())
	{
		Finish(false, FString(), FString(), FPrimordiaOllamaStats(), TEXT("PrimordiaOS bridge is not connected (start it with: npm start)"));
		return;
	}
	Bridge->OnPacket.AddDynamic(this, &UPrimordiaConverseAction::HandlePacket);
	if (!Bridge->SendCommand(Command, ArgsJson))
	{
		Finish(false, FString(), FString(), FPrimordiaOllamaStats(), FString::Printf(TEXT("Could not send %s"), *Command));
		return;
	}
	// The LLM plus synthesis can take a while on CPU-only machines.
	TimeoutHandle = FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateWeakLambda(this, [this](float)
	{
		TimeoutHandle.Reset();
		Finish(false, FString(), FString(), FPrimordiaOllamaStats(), TEXT("No answer from PrimordiaOS after 300 s"));
		return false;
	}), 300.f);
}

void UPrimordiaConverseAction::HandlePacket(const FPrimordiaPacketInfo& Info, UPrimordiaPayload* Payload)
{
	if (Info.Type != EPrimordiaPacketType::Ack || !Payload || Payload->GetString(TEXT("command"), FString()) != Command)
	{
		return;
	}
	FPrimordiaOllamaStats Stats;
	Stats.TotalSeconds = Payload->GetNumber(TEXT("seconds"));
	Stats.GeneratedTokens = Payload->GetInt(TEXT("tokens"));
	if (!Payload->GetBool(TEXT("ok"), false))
	{
		Finish(false, FString(), FString(), Stats, Payload->GetString(TEXT("error"), TEXT("failed")));
		return;
	}
	if (Payload->GetString(TEXT("status"), FString()) != TEXT("done"))
	{
		return; // "started"
	}
	TArray<FString> Results;
	for (int32 i = 0; i < Payload->GetArrayLength(TEXT("action_results")); ++i)
	{
		Results.Add(Payload->GetString(FString::Printf(TEXT("action_results[%d]"), i), FString()));
	}
	Finish(true, Payload->GetString(TEXT("say"), FString()), FString::Join(Results, TEXT("; ")), Stats, FString());
}

void UPrimordiaConverseAction::Finish(bool bSuccess, const FString& Text, const FString& Results, const FPrimordiaOllamaStats& Stats, const FString& Error)
{
	if (bDone)
	{
		return;
	}
	bDone = true;
	if (TimeoutHandle.IsValid())
	{
		FTSTicker::GetCoreTicker().RemoveTicker(TimeoutHandle);
	}
	if (UPrimordiaBridgeSubsystem* Bridge = UPrimordiaBridgeSubsystem::Get(WorldContext.Get()))
	{
		Bridge->OnPacket.RemoveDynamic(this, &UPrimordiaConverseAction::HandlePacket);
	}
	(bSuccess ? OnCompleted : OnFailed).Broadcast(Text, Results, Stats, Error);
	End();
}

// ---------------------------------------------------------------------------

UPrimordiaOllamaConversation* UPrimordiaOllamaLibrary::CreateOllamaConversation(const FString& SystemPrompt, const FString& Model, float Temperature)
{
	UPrimordiaOllamaConversation* Conversation = NewObject<UPrimordiaOllamaConversation>();
	Conversation->SystemPrompt = SystemPrompt;
	Conversation->Model = Model;
	Conversation->Options.Temperature = Temperature;
	return Conversation;
}

void UPrimordiaOllamaLibrary::CancelAllOllamaRequests()
{
	if (UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get())
	{
		Ollama->CancelAll();
	}
}

void UPrimordiaOllamaLibrary::WarmUpOllamaModel(const FString& Model)
{
	if (UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get())
	{
		Ollama->WarmUp(Model);
	}
}

FString UPrimordiaOllamaLibrary::GetDefaultOllamaModel()
{
	return UPrimordiaOllamaSettings::Get()->DefaultModel;
}

// Primordia.Ollama.Realm <description> — generates into the first game/PIE world, else the editor world.
namespace
{
	FAutoConsoleCommandWithWorldAndArgs GRealmCmd(TEXT("Primordia.Ollama.Realm"), TEXT("Design a realm with Ollama: Primordia.Ollama.Realm a drowned city of glass bells"),
		FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>& Args, UWorld* World)
		{
			if (Args.IsEmpty() || !World) return;
			UE_LOG(LogPrimordiaOllama, Display, TEXT("Designing realm... (this can take a few minutes on CPU)"));
			UPrimordiaOllamaRealmAction::Generate(World, FString::Join(Args, TEXT(" ")), FTransform::Identity, FString(), true, 0,
				[](ARealmRootActor* Realm, const FString& ManifestJson, const FString& Error)
				{
					// Braces required: UE_LOG expands to a block, so "if (x) UE_LOG(...); else" doesn't parse.
					if (Realm)
					{
						UE_LOG(LogPrimordiaOllama, Display, TEXT("Realm '%s' generated."), *Realm->Manifest.RealmName);
					}
					else
					{
						UE_LOG(LogPrimordiaOllama, Warning, TEXT("Realm generation failed: %s"), *Error);
					}
				});
		}));
}
