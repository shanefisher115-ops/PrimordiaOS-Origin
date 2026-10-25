#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "BoltTypes.generated.h"

UENUM(BlueprintType)
enum class EBoltJobStatus : uint8
{
	/** Not yet accepted by the Bolt server (server unreachable); retried automatically. */
	Unsent,
	Queued,
	Running,
	Succeeded,
	Failed,
	Cancelled,
};

USTRUCT(BlueprintType)
struct PRIMORDIABOLTBRIDGE_API FBoltJob
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString Id;
	/** Task kind, e.g. "cadcam.fabricate", "blender.render", "davinci.render", "autobuilder.build". */
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FName Kind;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString PayloadJson;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") EBoltJobStatus Status = EBoltJobStatus::Unsent;
	/** 0..1 */
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") float Progress = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString Message;
	/** The worker's result object, as JSON text. */
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString ResultJson;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString Error;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FGuid SpellId;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FDateTime SubmittedAt;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FDateTime UpdatedAt;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") int32 SendAttempts = 0;

	bool IsFinished() const { return Status == EBoltJobStatus::Succeeded || Status == EBoltJobStatus::Failed || Status == EBoltJobStatus::Cancelled; }
	static EBoltJobStatus ParseStatus(const FString& Text);
	static FString StatusToString(EBoltJobStatus Status);
};

/** Any message from the Bolt event stream. */
USTRUCT(BlueprintType)
struct PRIMORDIABOLTBRIDGE_API FBoltEvent
{
	GENERATED_BODY()

	/** job.created, job.updated, job.log, worker.online, worker.offline, spell.cast, ... */
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString Type;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString JobId;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FString Json;
	UPROPERTY(BlueprintReadOnly, Category = "Bolt") FDateTime ReceivedAt;
};

UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "PrimordiaOS Bolt Pipeline"))
class PRIMORDIABOLTBRIDGE_API UPrimordiaBoltSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	/** Bolt REST API. 7778, beside the realm bridge's node server on 7777. */
	UPROPERTY(Config, EditAnywhere, Category = "Bolt") FString RestUrl = TEXT("http://127.0.0.1:7778");
	UPROPERTY(Config, EditAnywhere, Category = "Bolt") FString EventStreamUrl = TEXT("ws://127.0.0.1:7780/events");
	UPROPERTY(Config, EditAnywhere, Category = "Bolt") bool bAutoConnect = true;
	/** Sent as X-Bolt-Key when non-empty (the server's BOLT_KEY). */
	UPROPERTY(Config, EditAnywhere, Category = "Bolt") FString ApiKey;
	UPROPERTY(Config, EditAnywhere, Category = "Bolt", meta = (ClampMin = "1")) float RequestTimeoutSeconds = 10.f;
	UPROPERTY(Config, EditAnywhere, Category = "Bolt", meta = (ClampMin = "0.5")) float ReconnectMinSeconds = 1.f;
	UPROPERTY(Config, EditAnywhere, Category = "Bolt", meta = (ClampMin = "1")) float ReconnectMaxSeconds = 30.f;
	/** While the event stream is down, running jobs are polled at this interval. */
	UPROPERTY(Config, EditAnywhere, Category = "Bolt", meta = (ClampMin = "0.5")) float PollSeconds = 2.f;
	/** Unsent jobs are dropped (failed) after this many attempts. */
	UPROPERTY(Config, EditAnywhere, Category = "Bolt", meta = (ClampMin = "1")) int32 MaxSendAttempts = 30;
	/** Finished jobs kept in memory for inspection. */
	UPROPERTY(Config, EditAnywhere, Category = "Bolt", meta = (ClampMin = "16")) int32 FinishedJobsKept = 256;
};
