#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "PrimordiaOllamaTypes.h"
#include "PrimordiaOllamaConversation.generated.h"

/**
 * A chat with memory, e.g. one per NPC or per glyph. Holds the system prompt
 * and history; each Send appends the user line and, on success, the reply.
 * Keep a reference to it (a Blueprint variable) for as long as the chat lives.
 */
UCLASS(BlueprintType)
class PRIMORDIAOLLAMA_API UPrimordiaOllamaConversation : public UObject
{
	GENERATED_BODY()

public:
	/** Empty = project default model. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	FString Model;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama", meta = (MultiLine = true))
	FString SystemPrompt;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	FPrimordiaOllamaOptions Options;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	bool bThink = false;

	/** Oldest messages are dropped beyond this (0 = project default). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	int32 MaxMessages = 0;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama")
	TArray<FPrimordiaChatMessage> History;

	/** Native send. The user line is kept only if the reply succeeds, so a failed Send can be retried. */
	FGuid Send(const FString& UserText, FPrimordiaOllamaTokenDelegate OnToken, FPrimordiaOllamaCompleteDelegate OnComplete);

	/** Inject context the model should know without the player saying it ("The realm's entropy just spiked."). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	void AddMessage(EPrimordiaChatRole Role, const FString& Content);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	void ClearHistory();

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Ollama")
	void Cancel();

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Ollama")
	bool IsBusy() const { return ActiveRequest.IsValid(); }

	/** The request a Send would make right now (system prompt + trimmed history + UserText). */
	FPrimordiaOllamaChatRequest BuildRequest(const FString& UserText) const;

private:
	void Trim();
	FGuid ActiveRequest;
};
