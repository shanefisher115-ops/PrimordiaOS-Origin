#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "PrimordiaOllamaSettings.generated.h"

/**
 * Project Settings > Plugins > PrimordiaOS Ollama.
 * Stored in Config/DefaultGame.ini under [/Script/PrimordiaOllama.PrimordiaOllamaSettings].
 */
UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "PrimordiaOS Ollama"))
class PRIMORDIAOLLAMA_API UPrimordiaOllamaSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	static const UPrimordiaOllamaSettings* Get() { return GetDefault<UPrimordiaOllamaSettings>(); }
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	/** The Ollama server. 127.0.0.1 rather than "localhost" avoids an IPv6 (::1) miss on Windows. */
	UPROPERTY(Config, EditAnywhere, Category = "Server")
	FString OllamaUrl = TEXT("http://127.0.0.1:11434");

	/** Model used when a request names none. Must be pulled locally (`ollama pull <name>`). */
	UPROPERTY(Config, EditAnywhere, Category = "Server")
	FString DefaultModel = TEXT("llama3.2:3b");

	/**
	 * Models tagged ":cloud" run on ollama.com, so prompts (and game state in them) leave this machine.
	 * They are refused unless this is enabled.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Server")
	bool bAllowCloudModels = false;

	/** If the server is down when a request is made, launch `ollama serve` once and retry. */
	UPROPERTY(Config, EditAnywhere, Category = "Server")
	bool bAutoStartOllama = true;

	/** ollama.exe. Empty = %LOCALAPPDATA%\Programs\Ollama\ollama.exe, then PATH. */
	UPROPERTY(Config, EditAnywhere, Category = "Server", meta = (FilePathFilter = "exe"))
	FFilePath OllamaExecutable;

	/** How long Ollama keeps the model in memory after a request ("10m", "1h", "-1" = forever). */
	UPROPERTY(Config, EditAnywhere, Category = "Server")
	FString KeepAlive = TEXT("15m");

	/** Load DefaultModel into memory when the engine starts, so the first in-game reply isn't slow. */
	UPROPERTY(Config, EditAnywhere, Category = "Server")
	bool bWarmUpOnStartup = false;

	/** Whole-request ceiling. CPU-only machines can need minutes for a long reply. */
	UPROPERTY(Config, EditAnywhere, Category = "Server", meta = (ClampMin = 5, Units = "s"))
	float RequestTimeoutSeconds = 900.f;

	/** Fail if no bytes arrive for this long. Covers model load (60-90 s for a cold 7B model on CPU) plus prompt processing. */
	UPROPERTY(Config, EditAnywhere, Category = "Server", meta = (ClampMin = 5, Units = "s"))
	float ActivityTimeoutSeconds = 300.f;

	UPROPERTY(Config, EditAnywhere, Category = "Defaults")
	float DefaultTemperature = 0.7f;

	/** Cap on reply length when a request sets none (num_predict). Keeps in-game lines short and fast. 0 = unlimited. */
	UPROPERTY(Config, EditAnywhere, Category = "Defaults", meta = (ClampMin = 0))
	int32 DefaultMaxTokens = 256;

	UPROPERTY(Config, EditAnywhere, Category = "Defaults", meta = (MultiLine = true))
	FString DefaultSystemPrompt = TEXT("You are the voice of PrimordiaOS, speaking from inside a living realm. Answer briefly and in character.");

	/** Conversations keep at most this many messages (the system prompt is always kept). */
	UPROPERTY(Config, EditAnywhere, Category = "Defaults", meta = (ClampMin = 2))
	int32 MaxConversationMessages = 40;

	/**
	 * Model for "Generate Realm With Ollama" (empty = DefaultModel). qwen2.5:7b follows the
	 * description more faithfully than llama3.2:3b, but on a CPU-only machine it is ~3x slower
	 * (measured: ~1.7 vs ~5.5 tokens/s on a Ryzen 3 4300U; a realm is ~600 tokens).
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Realm Generation")
	FString RealmModel;
};
