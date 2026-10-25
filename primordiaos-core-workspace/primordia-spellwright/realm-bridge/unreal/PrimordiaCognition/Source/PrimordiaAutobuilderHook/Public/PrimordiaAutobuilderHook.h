#pragma once

#include "CoreMinimal.h"
#include "EditorSubsystem.h"
#include "Engine/DeveloperSettings.h"
#include "Modules/ModuleInterface.h"
#include "PrimordiaAutobuilderHook.generated.h"

PRIMORDIAAUTOBUILDERHOOK_API DECLARE_LOG_CATEGORY_EXTERN(LogAutobuilder, Log, All);

class FPrimordiaAutobuilderHookModule : public IModuleInterface
{
};

USTRUCT(BlueprintType)
struct PRIMORDIAAUTOBUILDERHOOK_API FPrimordiaValidationCheck
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Autobuilder") FString Name;
	UPROPERTY(BlueprintReadOnly, Category = "Autobuilder") bool bPassed = false;
	/** Failing advisory checks (servers that are simply not running) do not fail the report. */
	UPROPERTY(BlueprintReadOnly, Category = "Autobuilder") bool bAdvisory = false;
	UPROPERTY(BlueprintReadOnly, Category = "Autobuilder") FString Message;
};

USTRUCT(BlueprintType)
struct PRIMORDIAAUTOBUILDERHOOK_API FPrimordiaValidationReport
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Autobuilder") TArray<FPrimordiaValidationCheck> Checks;
	UPROPERTY(BlueprintReadOnly, Category = "Autobuilder") bool bPassed = true;
	UPROPERTY(BlueprintReadOnly, Category = "Autobuilder") FDateTime FinishedAt;

	void Add(const FString& Name, bool bOk, const FString& Message, bool bAdvisory = false);
};

UENUM(BlueprintType)
enum class EPrimordiaRebuildRoute : uint8
{
	/** Live Coding patched the running editor. */
	LiveCoding,
	/** The Autobuilder server accepted a build. */
	Autobuilder,
	/** Nothing could be started. */
	None,
};

UCLASS(Config = EditorPerProjectUserSettings, meta = (DisplayName = "PrimordiaOS Autobuilder"))
class PRIMORDIAAUTOBUILDERHOOK_API UPrimordiaAutobuilderSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	UPROPERTY(Config, EditAnywhere, Category = "Autobuilder") FString ServerUrl = TEXT("http://127.0.0.1:7790");
	UPROPERTY(Config, EditAnywhere, Category = "Autobuilder") bool bValidateOnStartup = true;
	/** Patch the running editor with Live Coding when possible, instead of an out-of-process build. */
	UPROPERTY(Config, EditAnywhere, Category = "Autobuilder") bool bPreferLiveCoding = true;
	UPROPERTY(Config, EditAnywhere, Category = "Autobuilder") FString Configuration = TEXT("Development");
	/** Sent as X-Autobuilder-Key when non-empty (the server's AUTOBUILDER_KEY). */
	UPROPERTY(Config, EditAnywhere, Category = "Autobuilder") FString ApiKey;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPrimordiaValidated, const FPrimordiaValidationReport&, Report);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnPrimordiaAutobuilderReply, bool, bOk, const FString&, Json);

/**
 * Editor side of the Autobuilder.
 *
 * RequestRebuild patches the running editor through Live Coding when it is enabled; otherwise it
 * asks the Autobuilder server (port 7790) for a build. While the editor is open the editor target's
 * DLLs are locked, so the server is asked for a "plugin" build (a standalone compile that proves the
 * code builds); restart the editor or use Live Coding to load the result.
 *
 * At startup (once the engine loop is up) it validates the Primordia stack and reports in the
 * Output Log and a notification.
 */
UCLASS()
class PRIMORDIAAUTOBUILDERHOOK_API UPrimordiaAutobuilderHook : public UEditorSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Autobuilder")
	EPrimordiaRebuildRoute RequestRebuild(const FString& Reason, bool bAllowLiveCoding = true);

	/** Asks the server to copy the plugin source from the repo into the project. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Autobuilder")
	void RequestDeploy(const FString& Reason);

	/** GET /status; the reply arrives through OnServerReply. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Autobuilder")
	void QueryStatus();

	/** Synchronous checks now, network checks as they answer; OnValidated fires when all are in. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Autobuilder")
	void RunStartupValidation();

	UFUNCTION(BlueprintPure, Category = "Primordia|Autobuilder")
	FPrimordiaValidationReport GetLastValidation() const { return LastReport; }

	UFUNCTION(BlueprintPure, Category = "Primordia|Autobuilder")
	static bool IsLiveCodingAvailable();

	UPROPERTY(BlueprintAssignable, Category = "Primordia|Autobuilder") FOnPrimordiaValidated OnValidated;
	UPROPERTY(BlueprintAssignable, Category = "Primordia|Autobuilder") FOnPrimordiaAutobuilderReply OnServerReply;

private:
	void Post(const FString& Path, const TSharedRef<class FJsonObject>& Body);
	void FinishValidation();
	void Notify(const FString& Text, bool bSuccess);

	FPrimordiaValidationReport LastReport;
	int32 PendingChecks = 0;
	FDelegateHandle LoopInitHandle;
};
