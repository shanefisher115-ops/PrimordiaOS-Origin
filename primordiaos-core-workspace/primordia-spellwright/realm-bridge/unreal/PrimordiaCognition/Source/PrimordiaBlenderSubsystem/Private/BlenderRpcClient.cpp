#include "BlenderRpcClient.h"

#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

void FBlenderRpcClient::Call(const FString& Method, const TSharedRef<FJsonObject>& Params, FBlenderRpcCallback Callback)
{
	TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
	Body->SetStringField(TEXT("jsonrpc"), TEXT("2.0"));
	Body->SetNumberField(TEXT("id"), static_cast<double>(NextId++));
	Body->SetStringField(TEXT("method"), Method);
	Body->SetObjectField(TEXT("params"), Params);
	FString Text;
	const TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> W = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Text);
	FJsonSerializer::Serialize(Body, W);

	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Url);
	Request->SetVerb(TEXT("POST"));
	Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
	Request->SetTimeout(TimeoutSeconds);
	Request->SetContentAsString(Text);
	Request->OnProcessRequestComplete().BindLambda([Callback, Method](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		if (!Callback)
		{
			return;
		}
		if (!bConnected || !Response.IsValid())
		{
			Callback(false, nullptr, FString::Printf(TEXT("Blender RPC server unreachable (%s)"), *Method));
			return;
		}
		TSharedPtr<FJsonObject> Reply;
		if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Response->GetContentAsString()), Reply) || !Reply.IsValid())
		{
			Callback(false, nullptr, FString::Printf(TEXT("Blender sent HTTP %d without JSON"), Response->GetResponseCode()));
			return;
		}
		const TSharedPtr<FJsonObject>* Error = nullptr;
		if (Reply->TryGetObjectField(TEXT("error"), Error))
		{
			FString Message;
			(*Error)->TryGetStringField(TEXT("message"), Message);
			Callback(false, nullptr, Message.IsEmpty() ? TEXT("Blender reported an error") : Message);
			return;
		}
		const TSharedPtr<FJsonObject>* Result = nullptr;
		if (!Reply->TryGetObjectField(TEXT("result"), Result))
		{
			Callback(true, MakeShared<FJsonObject>(), FString());
			return;
		}
		Callback(true, *Result, FString());
	});
	Request->ProcessRequest();
}

void FBlenderRpcClient::CallTask(const FString& Method, const TSharedRef<FJsonObject>& Params, FBlenderRpcCallback Callback, TFunction<void(float)> OnProgress)
{
	Params->SetBoolField(TEXT("async"), true);
	TWeakPtr<FBlenderRpcClient> Weak = AsShared();
	const double Deadline = FPlatformTime::Seconds() + TaskTimeoutSeconds;
	Call(Method, Params, [Weak, Callback, OnProgress, Deadline](bool bOk, TSharedPtr<FJsonObject> Result, const FString& Error)
	{
		const TSharedPtr<FBlenderRpcClient> Self = Weak.Pin();
		FString TaskId;
		if (!bOk || !Result.IsValid() || !Result->TryGetStringField(TEXT("task"), TaskId))
		{
			if (Callback) { Callback(false, nullptr, bOk ? TEXT("Blender did not start a task") : Error); }
			return;
		}
		if (Self)
		{
			Self->Poll(TaskId, Callback, OnProgress, Deadline);
		}
	});
}

void FBlenderRpcClient::Poll(const FString& TaskId, FBlenderRpcCallback Callback, TFunction<void(float)> OnProgress, double Deadline)
{
	TWeakPtr<FBlenderRpcClient> Weak = AsShared();
	Polls.Add(FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateLambda([Weak, TaskId, Callback, OnProgress, Deadline](float)
	{
		const TSharedPtr<FBlenderRpcClient> Self = Weak.Pin();
		if (!Self)
		{
			return false;
		}
		if (FPlatformTime::Seconds() > Deadline)
		{
			if (Callback) { Callback(false, nullptr, FString::Printf(TEXT("Blender task %s timed out"), *TaskId)); }
			return false;
		}
		TSharedRef<FJsonObject> Params = MakeShared<FJsonObject>();
		Params->SetStringField(TEXT("task"), TaskId);
		Self->Call(TEXT("task.status"), Params, [Weak, TaskId, Callback, OnProgress, Deadline](bool bOk, TSharedPtr<FJsonObject> Status, const FString& Error)
		{
			const TSharedPtr<FBlenderRpcClient> Again = Weak.Pin();
			if (!Again)
			{
				return;
			}
			if (!bOk || !Status.IsValid())
			{
				// A busy Blender can miss a poll; keep trying until the deadline.
				Again->Poll(TaskId, Callback, OnProgress, Deadline);
				return;
			}
			FString State;
			Status->TryGetStringField(TEXT("state"), State);
			double Progress = 0.0;
			Status->TryGetNumberField(TEXT("progress"), Progress);
			if (OnProgress) { OnProgress(static_cast<float>(Progress)); }
			if (State == TEXT("done"))
			{
				const TSharedPtr<FJsonObject>* ResultField = nullptr;
				TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
				if (Status->TryGetObjectField(TEXT("result"), ResultField) && ResultField->IsValid())
				{
					Result = *ResultField;
				}
				if (Callback) { Callback(true, Result, FString()); }
			}
			else if (State == TEXT("failed"))
			{
				FString Message;
				Status->TryGetStringField(TEXT("error"), Message);
				if (Callback) { Callback(false, nullptr, Message); }
			}
			else
			{
				Again->Poll(TaskId, Callback, OnProgress, Deadline);
			}
		});
		return false; // one-shot; the reply schedules the next poll
	}), PollSeconds));
	// Handles of polls that already fired are harmless; keep the list from growing without bound.
	if (Polls.Num() > 64)
	{
		Polls.RemoveAt(0, Polls.Num() - 64);
	}
}

void FBlenderRpcClient::CancelAll()
{
	for (const FTSTicker::FDelegateHandle& H : Polls)
	{
		FTSTicker::GetCoreTicker().RemoveTicker(H);
	}
	Polls.Reset();
}
