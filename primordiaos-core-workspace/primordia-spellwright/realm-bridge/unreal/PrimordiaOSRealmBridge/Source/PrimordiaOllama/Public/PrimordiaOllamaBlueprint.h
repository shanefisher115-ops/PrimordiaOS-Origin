#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "Containers/Ticker.h"
#include "PrimordiaOllamaTypes.h"
#include "PrimordiaTypes.h"
#include "PrimordiaOllamaBlueprint.generated.h"

class UPrimordiaOllamaConversation;
class UPrimordiaPayload;
class ARealmRootActor;

// Async nodes need one delegate signature shared by all their exec pins.
DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FPrimordiaOllamaReplyEvent, const FString&, Text, const FString&, Delta, const FPrimordiaOllamaStats&, Stats, const FString&, Error);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FPrimordiaOllamaModelsEvent, const TArray<FPrimordiaOllamaModelInfo>&, Models, const FString&, Error);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FPrimordiaOllamaRealmEvent, ARealmRootActor*, Realm, const FString&, ManifestJson, const FString&, Status, const FString&, Error);

/** Base: keeps the node alive (rooted) until its request finishes, in game and editor-utility graphs alike. */
UCLASS(Abstract)
class PRIMORDIAOLLAMA_API UPrimordiaOllamaAsyncBase : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

protected:
	void Begin(const UObject* WorldContextObject);
	void End();
};

/**
 * "Ask Ollama" / "Send To Ollama Conversation".
 * On Token fires for every streamed fragment (Delta) with the reply so far (Text);
 * On Completed / On Failed fire once.
 */
UCLASS()
class PRIMORDIAOLLAMA_API UPrimordiaOllamaAskAction : public UPrimordiaOllamaAsyncBase
{
	GENERATED_BODY()

public:
	/** One-shot question. Empty Model / SystemPrompt = project defaults. Temperature < 0 = default. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "Ask Ollama", AdvancedDisplay = "Model,Temperature,MaxTokens"))
	static UPrimordiaOllamaAskAction* AskOllama(const UObject* WorldContextObject, const FString& Prompt, const FString& SystemPrompt, const FString& Model, float Temperature = -1.f, int32 MaxTokens = 0);

	/** Continues a conversation (keeps history). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "Send To Ollama Conversation"))
	static UPrimordiaOllamaAskAction* SendToConversation(const UObject* WorldContextObject, UPrimordiaOllamaConversation* Conversation, const FString& Message);

	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaReplyEvent OnToken;
	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaReplyEvent OnCompleted;
	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaReplyEvent OnFailed;

	virtual void Activate() override;

private:
	FPrimordiaOllamaChatRequest Request;
	UPROPERTY() TObjectPtr<UPrimordiaOllamaConversation> Conversation;
	FString Message;
};

/** "List Ollama Models": what `ollama list` shows. */
UCLASS()
class PRIMORDIAOLLAMA_API UPrimordiaOllamaModelsAction : public UPrimordiaOllamaAsyncBase
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "List Ollama Models"))
	static UPrimordiaOllamaModelsAction* ListOllamaModels(const UObject* WorldContextObject);

	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaModelsEvent OnCompleted;
	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaModelsEvent OnFailed;

	virtual void Activate() override;
};

/**
 * "Generate Realm With Ollama": describe a realm in words; the model designs a
 * PRS-1 manifest (schema-constrained), which is repaired, validated and spawned.
 * If PrimordiaOS is connected and bSendToPrimordiaOS is set, Worldforge adopts
 * the realm (load_manifest) and keeps evolving it.
 * On Progress fires while generating (Status = characters received so far).
 */
UCLASS()
class PRIMORDIAOLLAMA_API UPrimordiaOllamaRealmAction : public UPrimordiaOllamaAsyncBase
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "Generate Realm With Ollama", AdvancedDisplay = "Model,bSendToPrimordiaOS,Seed"))
	static UPrimordiaOllamaRealmAction* GenerateRealmWithOllama(const UObject* WorldContextObject, const FString& Description, const FTransform& Transform, const FString& Model, bool bSendToPrimordiaOS = true, int64 Seed = 0);

	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaRealmEvent OnProgress;
	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaRealmEvent OnCompleted;
	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaRealmEvent OnFailed;

	virtual void Activate() override;

	/** Native entry point (console command, editor tools). */
	static void Generate(const UObject* WorldContextObject, const FString& Description, const FTransform& Transform, const FString& Model, bool bSendToPrimordiaOS, uint32 Seed,
		TFunction<void(ARealmRootActor*, const FString& /*ManifestJson*/, const FString& /*Error*/)> OnDone, TFunction<void(int32 /*Chars*/)> OnProgressFn = nullptr);

private:
	TWeakObjectPtr<const UObject> WorldContext;
	FString Description;
	FTransform Transform;
	FString Model;
	bool bSendToPrimordiaOS = true;
	uint32 Seed = 0;
};

/**
 * "Generate Realm Via PrimordiaOS": the recommended path. The LLM runs outside
 * Unreal, in the Node bridge, and writes only a compact intent (~60 tokens) that
 * Worldforge expands into the full realm, about 10x faster than
 * "Generate Realm With Ollama". The realm arrives through the normal manifest
 * stream; this node just reports when it's done. Requires a connected bridge.
 * Status reads e.g. "Designed 'Glass Bell Sea' in 7.4 s (61 tokens)".
 */
UCLASS()
class PRIMORDIAOLLAMA_API UPrimordiaBridgeRealmAction : public UPrimordiaOllamaAsyncBase
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "Generate Realm Via PrimordiaOS", AdvancedDisplay = "Model,TimeoutSeconds"))
	static UPrimordiaBridgeRealmAction* GenerateRealmViaPrimordiaOS(const UObject* WorldContextObject, const FString& Description, const FString& Model, float TimeoutSeconds = 600.f);

	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaRealmEvent OnCompleted;
	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaRealmEvent OnFailed;

	virtual void Activate() override;

private:
	UFUNCTION()
	void HandlePacket(const FPrimordiaPacketInfo& Info, UPrimordiaPayload* Payload);

	void Finish(bool bSuccess, const FString& Status, const FString& Error);

	TWeakObjectPtr<const UObject> WorldContext;
	FString Description;
	FString Model;
	float TimeoutSeconds = 600.f;
	bool bDone = false;
	FTSTicker::FDelegateHandle TimeoutHandle;
};

/**
 * "Converse With PrimordiaOS" / "Speak Via PrimordiaOS". The bridge's LLM decides
 * what to say and do; Kokoro speaks it through the realm's voice actor (spatialized
 * at the soul glyph), and any actions (perturb, evolve, new realm) are applied.
 * Audio starts before this node completes. Completion means the bridge has sent
 * all audio and run the actions.
 *  Text  = what was said    Delta = action results ("entropy = 0.9; coherence = 0.1")
 *  Stats = TotalSeconds (request to done), GeneratedTokens
 */
UCLASS()
class PRIMORDIAOLLAMA_API UPrimordiaConverseAction : public UPrimordiaOllamaAsyncBase
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Voice", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "Converse With PrimordiaOS", AdvancedDisplay = "Model"))
	static UPrimordiaConverseAction* ConverseWithPrimordiaOS(const UObject* WorldContextObject, const FString& Input, const FString& Model);

	/** Speaks the text verbatim (no LLM). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Voice", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "Speak Via PrimordiaOS"))
	static UPrimordiaConverseAction* SpeakViaPrimordiaOS(const UObject* WorldContextObject, const FString& Text);

	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaReplyEvent OnCompleted;
	UPROPERTY(BlueprintAssignable) FPrimordiaOllamaReplyEvent OnFailed;

	virtual void Activate() override;

private:
	UFUNCTION()
	void HandlePacket(const FPrimordiaPacketInfo& Info, UPrimordiaPayload* Payload);

	void Finish(bool bSuccess, const FString& Text, const FString& Results, const FPrimordiaOllamaStats& Stats, const FString& Error);

	TWeakObjectPtr<const UObject> WorldContext;
	FString Command;     // converse | speak
	FString ArgsJson;
	bool bDone = false;
	FTSTicker::FDelegateHandle TimeoutHandle;
};

UCLASS()
class PRIMORDIAOLLAMA_API UPrimordiaOllamaLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** A new chat with memory. Store it in a variable. Empty values = project defaults. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama", meta = (AdvancedDisplay = "Model,Temperature"))
	static UPrimordiaOllamaConversation* CreateOllamaConversation(const FString& SystemPrompt, const FString& Model, float Temperature = -1.f);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	static void CancelAllOllamaRequests();

	/** Loads a model into memory ahead of time so the first reply is fast. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	static void WarmUpOllamaModel(const FString& Model);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Ollama")
	static FString GetDefaultOllamaModel();
};
