#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"
#include "Containers/Ticker.h"

/** Completion of one RPC: success flag, the "result" object, and an error message. */
using FBlenderRpcCallback = TFunction<void(bool /*bOk*/, TSharedPtr<FJsonObject> /*Result*/, const FString& /*Error*/)>;

/**
 * JSON-RPC 2.0 over HTTP to the Blender RPC server.
 *
 * Call() is one request/response. CallTask() asks the server to run the method as a background task
 * (params.async = true -> {"task": id}) and polls "task.status" until the task is done or failed, so
 * multi-minute renders never hold an HTTP request open.
 */
class PRIMORDIABLENDERSUBSYSTEM_API FBlenderRpcClient : public TSharedFromThis<FBlenderRpcClient>
{
public:
	FString Url = TEXT("http://127.0.0.1:7791/rpc");
	float TimeoutSeconds = 30.f;
	float PollSeconds = 1.f;
	/** Give up polling a task after this long. */
	float TaskTimeoutSeconds = 3600.f;

	void Call(const FString& Method, const TSharedRef<FJsonObject>& Params, FBlenderRpcCallback Callback);
	void CallTask(const FString& Method, const TSharedRef<FJsonObject>& Params, FBlenderRpcCallback Callback, TFunction<void(float)> OnProgress = nullptr);

	/** Cancels every outstanding poll (callbacks are not called). */
	void CancelAll();

private:
	void Poll(const FString& TaskId, FBlenderRpcCallback Callback, TFunction<void(float)> OnProgress, double Deadline);

	int64 NextId = 1;
	TArray<FTSTicker::FDelegateHandle> Polls;
};
