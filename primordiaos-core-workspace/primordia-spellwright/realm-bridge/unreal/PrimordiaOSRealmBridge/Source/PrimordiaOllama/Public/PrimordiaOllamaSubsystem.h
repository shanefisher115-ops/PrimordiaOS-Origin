#pragma once

#include "CoreMinimal.h"
#include "Subsystems/EngineSubsystem.h"
#include "Containers/Ticker.h"
#include "PrimordiaOllamaTypes.h"
#include "PrimordiaOllamaSubsystem.generated.h"

/**
 * Talks to a local Ollama server (default http://127.0.0.1:11434) from inside
 * Unreal. One instance per engine, so it works in the editor, PIE and packaged games.
 *
 * Replies stream: /api/chat is called with stream:true, the HTTP thread appends
 * raw bytes to a locked buffer, and the core ticker (game thread) splits them
 * into NDJSON lines and raises token callbacks. Every callback runs on the
 * game thread.
 */
UCLASS()
class PRIMORDIAOLLAMA_API UPrimordiaOllamaSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	static UPrimordiaOllamaSubsystem* Get();

	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	/**
	 * Starts a streamed chat. OnToken fires per generated fragment, OnComplete exactly
	 * once (also on failure or cancel). Returns the request id for Cancel().
	 */
	FGuid Chat(const FPrimordiaOllamaChatRequest& Request, FPrimordiaOllamaTokenDelegate OnToken, FPrimordiaOllamaCompleteDelegate OnComplete);

	/** GET /api/tags. */
	void ListModels(FPrimordiaOllamaModelsDelegate OnDone);

	/** Loads a model into memory without generating (avoids a slow first reply). Empty = default model. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	void WarmUp(const FString& Model);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	void Cancel(FGuid RequestId);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	void CancelAll();

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Ollama")
	int32 GetActiveRequestCount() const { return Active.Num(); }

	/** Empty -> DefaultModel from settings. */
	FString ResolveModel(const FString& Model) const;

	/** ":cloud" models run on ollama.com rather than this machine. */
	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Ollama")
	static bool IsCloudModel(const FString& Model);

	/** Builds the /api/chat body. Public for tests and tooling. */
	static FString BuildChatBody(const FPrimordiaOllamaChatRequest& Request, const FString& Model);

private:
	struct FActiveRequest;

	void Send(const TSharedRef<FActiveRequest>& Request);
	void OnHttpComplete(FGuid Id, bool bConnected, int32 StatusCode);
	void Finish(const TSharedRef<FActiveRequest>& Request, bool bSuccess, const FString& Error);
	void DrainLines(FActiveRequest& Request, bool bFlushPartial);
	void HandleLine(FActiveRequest& Request, const FString& Line);
	bool TryStartServer();
	FString Endpoint(const TCHAR* Path) const;
	bool Tick(float DeltaTime);

	TMap<FGuid, TSharedRef<FActiveRequest>> Active;
	FTSTicker::FDelegateHandle TickHandle;
	double ServerStartedAt = -1.0;
};
