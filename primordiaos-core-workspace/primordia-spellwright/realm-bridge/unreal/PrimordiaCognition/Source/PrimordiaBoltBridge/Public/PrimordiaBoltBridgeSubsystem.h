#pragma once

#include "CoreMinimal.h"
#include "Containers/Ticker.h"
#include "Modules/ModuleInterface.h"
#include "Subsystems/EngineSubsystem.h"
#include "BoltTypes.h"
#include "PrimordiaBoltBridgeSubsystem.generated.h"

PRIMORDIABOLTBRIDGE_API DECLARE_LOG_CATEGORY_EXTERN(LogBolt, Log, All);

class FJsonObject;
class IWebSocket;
struct FSpellwrightSpell;

class FPrimordiaBoltBridgeModule : public IModuleInterface
{
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBoltJobUpdated, const FBoltJob&, Job);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBoltEventReceived, const FBoltEvent&, Event);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBoltConnectionChanged, bool, bConnected);
DECLARE_MULTICAST_DELEGATE_OneParam(FOnBoltJobUpdatedNative, const FBoltJob&);
DECLARE_MULTICAST_DELEGATE_OneParam(FOnBoltEventNative, const FBoltEvent&);

/** Called once when a job finishes (succeeded, failed or cancelled). */
using FBoltJobCallback = TFunction<void(const FBoltJob&)>;

/**
 * Client for the Bolt pipeline: REST on 7778 (jobs), WebSocket event stream on 7780.
 *
 * REST:    POST /jobs {id, kind, payload, spellId, source} -> {job}
 *          GET  /jobs/{id} -> {job}      POST /jobs/{id}/cancel      GET /health
 * Events:  {"type": "job.updated", "job": {id, kind, status, progress, message, result, error}}, ...
 *
 * Jobs are given their id here, so they can be tracked before the server answers. If the server is
 * unreachable a job stays Unsent and is retried; while the event stream is down, running jobs are polled.
 */
UCLASS()
class PRIMORDIABOLTBRIDGE_API UPrimordiaBoltBridgeSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	static UPrimordiaBoltBridgeSubsystem* Get();

	/** Native submission. Returns the job id. */
	FString SubmitJob(FName Kind, const TSharedRef<FJsonObject>& Payload, const FGuid& SpellId = FGuid(), FBoltJobCallback OnFinished = nullptr);

	/** Sends a spell to the pipeline as a "spell.cast" job (telemetry / remote execution). */
	FString SubmitSpell(const FSpellwrightSpell& Spell, FBoltJobCallback OnFinished = nullptr);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt", meta = (DisplayName = "Submit Bolt Job"))
	FString SubmitJobJson(FName Kind, const FString& PayloadJson);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	bool GetJob(const FString& JobId, FBoltJob& OutJob) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	TArray<FBoltJob> GetActiveJobs() const;

	/** Active jobs and the most recent finished ones, oldest first. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	TArray<FBoltJob> GetAllJobs() const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	void CancelJob(const FString& JobId);

	/** Re-reads a job from the server. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	void RefreshJob(const FString& JobId);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	void Connect();

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	void Disconnect();

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	bool IsEventStreamConnected() const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Bolt")
	bool IsServerReachable() const { return bServerReachable; }

	/** GET /health; the callback receives whether the server answered and its JSON. */
	void CheckHealth(TFunction<void(bool, const FString&)> Callback);

	UPROPERTY(BlueprintAssignable, Category = "Primordia|Bolt") FOnBoltJobUpdated OnJobUpdated;
	UPROPERTY(BlueprintAssignable, Category = "Primordia|Bolt") FOnBoltEventReceived OnEvent;
	UPROPERTY(BlueprintAssignable, Category = "Primordia|Bolt") FOnBoltConnectionChanged OnConnectionChanged;

	FOnBoltJobUpdatedNative OnJobUpdatedNative;
	FOnBoltEventNative OnEventNative;

	/** Turns a job's result JSON into an object (null if empty or invalid). */
	static TSharedPtr<FJsonObject> ParseResult(const FBoltJob& Job);

private:
	void SendJob(const FString& JobId);
	void ApplyJobJson(const TSharedPtr<FJsonObject>& JobObject);
	void UpdateJob(FBoltJob& Job, EBoltJobStatus Status);
	void HandleMessage(const FString& Message);
	void ScheduleReconnect();
	bool Tick(float DeltaSeconds);
	void PruneFinished();
	FString Url(const FString& Path) const;
	void ApplyHeaders(const TSharedRef<class IHttpRequest, ESPMode::ThreadSafe>& Request) const;

	TMap<FString, FBoltJob> Jobs;
	TMap<FString, FBoltJobCallback> Callbacks;
	TArray<FString> FinishedOrder;

	TSharedPtr<IWebSocket> Socket;
	FTSTicker::FDelegateHandle TickHandle;
	bool bWantConnection = false;
	bool bServerReachable = false;
	double NextReconnectTime = 0.0;
	float ReconnectDelay = 1.f;
	double NextPollTime = 0.0;
	double NextRetryTime = 0.0;
	TSet<FString> InFlightRequests;
};
