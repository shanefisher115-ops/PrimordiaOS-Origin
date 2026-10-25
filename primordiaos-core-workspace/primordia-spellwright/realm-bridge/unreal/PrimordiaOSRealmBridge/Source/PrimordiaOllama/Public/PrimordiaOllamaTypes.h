#pragma once

#include "CoreMinimal.h"
#include "PrimordiaOllamaTypes.generated.h"

UENUM(BlueprintType)
enum class EPrimordiaChatRole : uint8
{
	System,
	User,
	Assistant,
};

USTRUCT(BlueprintType)
struct PRIMORDIAOLLAMA_API FPrimordiaChatMessage
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	EPrimordiaChatRole Role = EPrimordiaChatRole::User;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama", meta = (MultiLine = true))
	FString Content;

	FPrimordiaChatMessage() = default;
	FPrimordiaChatMessage(EPrimordiaChatRole InRole, const FString& InContent) : Role(InRole), Content(InContent) {}
};

/** Sampling options. Negative / zero values mean "use the model's default". */
USTRUCT(BlueprintType)
struct PRIMORDIAOLLAMA_API FPrimordiaOllamaOptions
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	float Temperature = -1.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	float TopP = -1.f;

	/** Context window in tokens (num_ctx). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	int32 ContextLength = 0;

	/** Max tokens to generate (num_predict). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	int32 MaxTokens = 0;

	/** Fixed seed for reproducible replies; -1 = random. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	int32 Seed = -1;
};

/** One /api/chat call. Empty Model = the project default. */
USTRUCT(BlueprintType)
struct PRIMORDIAOLLAMA_API FPrimordiaOllamaChatRequest
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	FString Model;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	TArray<FPrimordiaChatMessage> Messages;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	FPrimordiaOllamaOptions Options;

	/** Structured output: "json", or a JSON Schema object as a string. Empty = free text. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama", meta = (MultiLine = true))
	FString Format;

	/** Let thinking models (e.g. gemma4, qwen3) reason before answering. Off = faster replies. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Ollama")
	bool bThink = false;
};

USTRUCT(BlueprintType)
struct PRIMORDIAOLLAMA_API FPrimordiaOllamaStats
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") FString Model;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") int32 PromptTokens = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") int32 GeneratedTokens = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") float TokensPerSecond = 0.f;
	/** Time spent loading the model into memory (first call after idle). */
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") float LoadSeconds = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") float TotalSeconds = 0.f;
	/** stop | length | ... */
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") FString DoneReason;
};

USTRUCT(BlueprintType)
struct PRIMORDIAOLLAMA_API FPrimordiaOllamaModelInfo
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") FString Name;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") int64 SizeBytes = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") FString ParameterSize;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") FString Family;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") FString Quantization;
	/** Runs on ollama.com, not this machine: prompts leave the computer. */
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Ollama") bool bIsCloud = false;
};

/** Native callbacks. All are invoked on the game thread. */
DECLARE_DELEGATE_TwoParams(FPrimordiaOllamaTokenDelegate, const FString& /*Delta*/, const FString& /*TextSoFar*/);
DECLARE_DELEGATE_FourParams(FPrimordiaOllamaCompleteDelegate, bool /*bSuccess*/, const FString& /*Text*/, const FPrimordiaOllamaStats& /*Stats*/, const FString& /*Error*/);
DECLARE_DELEGATE_ThreeParams(FPrimordiaOllamaModelsDelegate, bool /*bSuccess*/, const TArray<FPrimordiaOllamaModelInfo>& /*Models*/, const FString& /*Error*/);
