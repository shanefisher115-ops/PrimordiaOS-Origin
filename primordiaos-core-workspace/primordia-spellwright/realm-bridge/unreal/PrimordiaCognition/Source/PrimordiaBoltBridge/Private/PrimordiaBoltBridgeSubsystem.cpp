#include "PrimordiaBoltBridgeSubsystem.h"

#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "HttpModule.h"
#include "IWebSocket.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Misc/CoreMisc.h"
#include "Modules/ModuleManager.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "SpellwrightSerializer.h"
#include "SpellwrightTypes.h"
#include "WebSocketsModule.h"

DEFINE_LOG_CATEGORY(LogBolt);

IMPLEMENT_MODULE(FPrimordiaBoltBridgeModule, PrimordiaBoltBridge)

namespace
{
	FString ToJsonText(const TSharedRef<FJsonObject>& Obj)
	{
		FString Out;
		const TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> W = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Out);
		FJsonSerializer::Serialize(Obj, W);
		return Out;
	}

	TSharedPtr<FJsonObject> FromJsonText(const FString& Text)
	{
		TSharedPtr<FJsonObject> Obj;
		if (Text.IsEmpty() || !FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Obj))
		{
			return nullptr;
		}
		return Obj;
	}
}

EBoltJobStatus FBoltJob::ParseStatus(const FString& Text)
{
	if (Text == TEXT("queued")) { return EBoltJobStatus::Queued; }
	if (Text == TEXT("running")) { return EBoltJobStatus::Running; }
	if (Text == TEXT("succeeded")) { return EBoltJobStatus::Succeeded; }
	if (Text == TEXT("failed")) { return EBoltJobStatus::Failed; }
	if (Text == TEXT("cancelled")) { return EBoltJobStatus::Cancelled; }
	return EBoltJobStatus::Queued;
}

FString FBoltJob::StatusToString(EBoltJobStatus Status)
{
	switch (Status)
	{
	case EBoltJobStatus::Unsent: return TEXT("unsent");
	case EBoltJobStatus::Queued: return TEXT("queued");
	case EBoltJobStatus::Running: return TEXT("running");
	case EBoltJobStatus::Succeeded: return TEXT("succeeded");
	case EBoltJobStatus::Failed: return TEXT("failed");
	case EBoltJobStatus::Cancelled: return TEXT("cancelled");
	}
	return TEXT("unknown");
}

void UPrimordiaBoltBridgeSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	FModuleManager::LoadModuleChecked<FWebSocketsModule>(TEXT("WebSockets"));
	FModuleManager::LoadModuleChecked<FHttpModule>(TEXT("HTTP"));

	TickHandle = FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateUObject(this, &UPrimordiaBoltBridgeSubsystem::Tick), 0.25f);

	const UPrimordiaBoltSettings* Settings = GetDefault<UPrimordiaBoltSettings>();
	ReconnectDelay = Settings->ReconnectMinSeconds;
	if (Settings->bAutoConnect && !IsRunningCommandlet())
	{
		Connect();
	}
}

void UPrimordiaBoltBridgeSubsystem::Deinitialize()
{
	FTSTicker::GetCoreTicker().RemoveTicker(TickHandle);
	Disconnect();
	Callbacks.Reset();
	Super::Deinitialize();
}

UPrimordiaBoltBridgeSubsystem* UPrimordiaBoltBridgeSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaBoltBridgeSubsystem>() : nullptr;
}

FString UPrimordiaBoltBridgeSubsystem::Url(const FString& Path) const
{
	FString Base = GetDefault<UPrimordiaBoltSettings>()->RestUrl;
	Base.RemoveFromEnd(TEXT("/"));
	return Base + Path;
}

void UPrimordiaBoltBridgeSubsystem::ApplyHeaders(const TSharedRef<IHttpRequest, ESPMode::ThreadSafe>& Request) const
{
	const UPrimordiaBoltSettings* Settings = GetDefault<UPrimordiaBoltSettings>();
	Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
	Request->SetHeader(TEXT("Accept"), TEXT("application/json"));
	if (!Settings->ApiKey.IsEmpty())
	{
		Request->SetHeader(TEXT("X-Bolt-Key"), Settings->ApiKey);
	}
	Request->SetTimeout(Settings->RequestTimeoutSeconds);
}

FString UPrimordiaBoltBridgeSubsystem::SubmitJob(FName Kind, const TSharedRef<FJsonObject>& Payload, const FGuid& SpellId, FBoltJobCallback OnFinished)
{
	FBoltJob Job;
	Job.Id = FString::Printf(TEXT("ue-%s"), *FGuid::NewGuid().ToString(EGuidFormats::Digits).ToLower());
	Job.Kind = Kind;
	Job.PayloadJson = ToJsonText(Payload);
	Job.SpellId = SpellId;
	Job.SubmittedAt = Job.UpdatedAt = FDateTime::UtcNow();
	Job.Status = EBoltJobStatus::Unsent;
	const FString Id = Job.Id;
	Jobs.Add(Id, MoveTemp(Job));
	if (OnFinished)
	{
		Callbacks.Add(Id, MoveTemp(OnFinished));
	}
	SendJob(Id);
	return Id;
}

FString UPrimordiaBoltBridgeSubsystem::SubmitJobJson(FName Kind, const FString& PayloadJson)
{
	TSharedPtr<FJsonObject> Payload = FromJsonText(PayloadJson);
	if (!Payload.IsValid())
	{
		Payload = MakeShared<FJsonObject>();
		if (!PayloadJson.IsEmpty())
		{
			Payload->SetStringField(TEXT("text"), PayloadJson);
		}
	}
	return SubmitJob(Kind, Payload.ToSharedRef());
}

FString UPrimordiaBoltBridgeSubsystem::SubmitSpell(const FSpellwrightSpell& Spell, FBoltJobCallback OnFinished)
{
	TSharedRef<FJsonObject> Payload = MakeShared<FJsonObject>();
	Payload->SetStringField(TEXT("schema"), FSpellwrightSerializer::Schema);
	Payload->SetObjectField(TEXT("spell"), FSpellwrightSerializer::ToJsonObject(Spell));
	return SubmitJob(TEXT("spell.cast"), Payload, Spell.Id, MoveTemp(OnFinished));
}

void UPrimordiaBoltBridgeSubsystem::SendJob(const FString& JobId)
{
	FBoltJob* Job = Jobs.Find(JobId);
	if (!Job || Job->Status != EBoltJobStatus::Unsent || InFlightRequests.Contains(JobId))
	{
		return;
	}
	++Job->SendAttempts;

	TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
	Body->SetStringField(TEXT("id"), Job->Id);
	Body->SetStringField(TEXT("kind"), Job->Kind.ToString());
	Body->SetStringField(TEXT("source"), TEXT("unreal"));
	if (Job->SpellId.IsValid())
	{
		Body->SetStringField(TEXT("spellId"), Job->SpellId.ToString(EGuidFormats::DigitsWithHyphensLower));
	}
	if (const TSharedPtr<FJsonObject> Payload = FromJsonText(Job->PayloadJson))
	{
		Body->SetObjectField(TEXT("payload"), Payload);
	}

	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Url(TEXT("/jobs")));
	Request->SetVerb(TEXT("POST"));
	ApplyHeaders(Request);
	Request->SetContentAsString(ToJsonText(Body));
	InFlightRequests.Add(JobId);

	TWeakObjectPtr<UPrimordiaBoltBridgeSubsystem> WeakThis(this);
	Request->OnProcessRequestComplete().BindLambda([WeakThis, JobId](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get();
		if (!Self)
		{
			return;
		}
		Self->InFlightRequests.Remove(JobId);
		FBoltJob* Job = Self->Jobs.Find(JobId);
		if (!Job)
		{
			return;
		}
		const int32 Code = Response.IsValid() ? Response->GetResponseCode() : 0;
		if (!bConnected || !Response.IsValid())
		{
			Self->bServerReachable = false;
			const int32 MaxAttempts = GetDefault<UPrimordiaBoltSettings>()->MaxSendAttempts;
			if (Job->SendAttempts >= MaxAttempts)
			{
				Job->Error = FString::Printf(TEXT("Bolt server unreachable after %d attempts"), Job->SendAttempts);
				Self->UpdateJob(*Job, EBoltJobStatus::Failed);
			}
			else
			{
				UE_LOG(LogBolt, Verbose, TEXT("Bolt unreachable; %s stays queued locally (attempt %d)"), *JobId, Job->SendAttempts);
			}
			return;
		}
		Self->bServerReachable = true;
		const TSharedPtr<FJsonObject> Reply = FromJsonText(Response->GetContentAsString());
		if (Code >= 200 && Code < 300 && Reply.IsValid())
		{
			const TSharedPtr<FJsonObject>* JobObj = nullptr;
			if (Reply->TryGetObjectField(TEXT("job"), JobObj))
			{
				Self->ApplyJobJson(*JobObj);
			}
			else if (Job->Status == EBoltJobStatus::Unsent)
			{
				Self->UpdateJob(*Job, EBoltJobStatus::Queued);
			}
			return;
		}
		// The server understood and refused (bad kind, payload, allow-list): retrying will not help.
		FString Error;
		if (!(Reply.IsValid() && Reply->TryGetStringField(TEXT("error"), Error)))
		{
			Error = FString::Printf(TEXT("HTTP %d: %s"), Code, *Response->GetContentAsString().Left(256));
		}
		Job->Error = Error;
		Self->UpdateJob(*Job, EBoltJobStatus::Failed);
	});
	Request->ProcessRequest();
}

void UPrimordiaBoltBridgeSubsystem::ApplyJobJson(const TSharedPtr<FJsonObject>& JobObject)
{
	if (!JobObject.IsValid())
	{
		return;
	}
	FString Id;
	if (!JobObject->TryGetStringField(TEXT("id"), Id))
	{
		return;
	}
	FBoltJob* Job = Jobs.Find(Id);
	if (!Job)
	{
		// A job submitted by someone else (another client, the server itself): track it too.
		FBoltJob NewJob;
		NewJob.Id = Id;
		FString Kind;
		JobObject->TryGetStringField(TEXT("kind"), Kind);
		NewJob.Kind = FName(*Kind);
		NewJob.SubmittedAt = FDateTime::UtcNow();
		Job = &Jobs.Add(Id, MoveTemp(NewJob));
	}
	if (Job->IsFinished())
	{
		return; // terminal states are final
	}

	FString StatusText;
	JobObject->TryGetStringField(TEXT("status"), StatusText);
	double Progress = Job->Progress;
	JobObject->TryGetNumberField(TEXT("progress"), Progress);
	Job->Progress = static_cast<float>(Progress);
	JobObject->TryGetStringField(TEXT("message"), Job->Message);
	JobObject->TryGetStringField(TEXT("error"), Job->Error);
	const TSharedPtr<FJsonObject>* Result = nullptr;
	if (JobObject->TryGetObjectField(TEXT("result"), Result))
	{
		Job->ResultJson = ToJsonText(Result->ToSharedRef());
	}
	UpdateJob(*Job, FBoltJob::ParseStatus(StatusText));
}

void UPrimordiaBoltBridgeSubsystem::UpdateJob(FBoltJob& Job, EBoltJobStatus Status)
{
	Job.Status = Status;
	Job.UpdatedAt = FDateTime::UtcNow();
	const FBoltJob Snapshot = Job; // callbacks may submit more jobs, which can reallocate the map
	OnJobUpdatedNative.Broadcast(Snapshot);
	OnJobUpdated.Broadcast(Snapshot);
	if (Snapshot.IsFinished())
	{
		UE_LOG(LogBolt, Log, TEXT("Job %s (%s) %s%s"), *Snapshot.Id, *Snapshot.Kind.ToString(), *FBoltJob::StatusToString(Snapshot.Status),
			Snapshot.Error.IsEmpty() ? TEXT("") : *FString::Printf(TEXT(": %s"), *Snapshot.Error));
		FBoltJobCallback Callback;
		if (Callbacks.RemoveAndCopyValue(Snapshot.Id, Callback) && Callback)
		{
			Callback(Snapshot);
		}
		FinishedOrder.Add(Snapshot.Id);
		PruneFinished();
	}
}

void UPrimordiaBoltBridgeSubsystem::PruneFinished()
{
	const int32 Keep = GetDefault<UPrimordiaBoltSettings>()->FinishedJobsKept;
	while (FinishedOrder.Num() > Keep)
	{
		Jobs.Remove(FinishedOrder[0]);
		FinishedOrder.RemoveAt(0);
	}
}

bool UPrimordiaBoltBridgeSubsystem::GetJob(const FString& JobId, FBoltJob& OutJob) const
{
	if (const FBoltJob* J = Jobs.Find(JobId))
	{
		OutJob = *J;
		return true;
	}
	return false;
}

TArray<FBoltJob> UPrimordiaBoltBridgeSubsystem::GetActiveJobs() const
{
	TArray<FBoltJob> Out;
	for (const TPair<FString, FBoltJob>& J : Jobs)
	{
		if (!J.Value.IsFinished())
		{
			Out.Add(J.Value);
		}
	}
	Out.Sort([](const FBoltJob& A, const FBoltJob& B) { return A.SubmittedAt < B.SubmittedAt; });
	return Out;
}

TArray<FBoltJob> UPrimordiaBoltBridgeSubsystem::GetAllJobs() const
{
	TArray<FBoltJob> Out;
	Jobs.GenerateValueArray(Out);
	Out.Sort([](const FBoltJob& A, const FBoltJob& B) { return A.SubmittedAt < B.SubmittedAt; });
	return Out;
}

void UPrimordiaBoltBridgeSubsystem::CancelJob(const FString& JobId)
{
	FBoltJob* Job = Jobs.Find(JobId);
	if (!Job || Job->IsFinished())
	{
		return;
	}
	if (Job->Status == EBoltJobStatus::Unsent)
	{
		UpdateJob(*Job, EBoltJobStatus::Cancelled);
		return;
	}
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Url(FString::Printf(TEXT("/jobs/%s/cancel"), *JobId)));
	Request->SetVerb(TEXT("POST"));
	ApplyHeaders(Request);
	Request->SetContentAsString(TEXT("{}"));
	TWeakObjectPtr<UPrimordiaBoltBridgeSubsystem> WeakThis(this);
	Request->OnProcessRequestComplete().BindLambda([WeakThis](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		if (UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get(); Self && bConnected && Response.IsValid())
		{
			if (const TSharedPtr<FJsonObject> Reply = FromJsonText(Response->GetContentAsString()))
			{
				const TSharedPtr<FJsonObject>* JobObj = nullptr;
				if (Reply->TryGetObjectField(TEXT("job"), JobObj)) { Self->ApplyJobJson(*JobObj); }
			}
		}
	});
	Request->ProcessRequest();
}

void UPrimordiaBoltBridgeSubsystem::RefreshJob(const FString& JobId)
{
	const FString Key = TEXT("get:") + JobId;
	if (InFlightRequests.Contains(Key))
	{
		return;
	}
	InFlightRequests.Add(Key);
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Url(FString::Printf(TEXT("/jobs/%s"), *JobId)));
	Request->SetVerb(TEXT("GET"));
	ApplyHeaders(Request);
	TWeakObjectPtr<UPrimordiaBoltBridgeSubsystem> WeakThis(this);
	Request->OnProcessRequestComplete().BindLambda([WeakThis, Key, JobId](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get();
		if (!Self)
		{
			return;
		}
		Self->InFlightRequests.Remove(Key);
		Self->bServerReachable = bConnected && Response.IsValid();
		if (!Self->bServerReachable)
		{
			return;
		}
		if (Response->GetResponseCode() == 404)
		{
			// The server restarted and forgot the job; resubmit it.
			if (FBoltJob* Job = Self->Jobs.Find(JobId); Job && !Job->IsFinished())
			{
				Job->Status = EBoltJobStatus::Unsent;
			}
			return;
		}
		if (const TSharedPtr<FJsonObject> Reply = FromJsonText(Response->GetContentAsString()))
		{
			const TSharedPtr<FJsonObject>* JobObj = nullptr;
			if (Reply->TryGetObjectField(TEXT("job"), JobObj)) { Self->ApplyJobJson(*JobObj); }
		}
	});
	Request->ProcessRequest();
}

void UPrimordiaBoltBridgeSubsystem::CheckHealth(TFunction<void(bool, const FString&)> Callback)
{
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
	Request->SetURL(Url(TEXT("/health")));
	Request->SetVerb(TEXT("GET"));
	ApplyHeaders(Request);
	Request->SetTimeout(3.f);
	TWeakObjectPtr<UPrimordiaBoltBridgeSubsystem> WeakThis(this);
	Request->OnProcessRequestComplete().BindLambda([WeakThis, Callback](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		const bool bOk = bConnected && Response.IsValid() && Response->GetResponseCode() == 200;
		if (UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get())
		{
			Self->bServerReachable = bOk;
		}
		if (Callback)
		{
			Callback(bOk, Response.IsValid() ? Response->GetContentAsString() : FString());
		}
	});
	Request->ProcessRequest();
}

void UPrimordiaBoltBridgeSubsystem::Connect()
{
	bWantConnection = true;
	if (Socket.IsValid() && (Socket->IsConnected()))
	{
		return;
	}
	if (Socket.IsValid())
	{
		// A dead socket from an earlier attempt must not fire into the new one's state.
		Socket->OnConnected().Clear();
		Socket->OnConnectionError().Clear();
		Socket->OnClosed().Clear();
		Socket->OnMessage().Clear();
		Socket.Reset();
	}
	const UPrimordiaBoltSettings* Settings = GetDefault<UPrimordiaBoltSettings>();
	TMap<FString, FString> Headers;
	if (!Settings->ApiKey.IsEmpty())
	{
		Headers.Add(TEXT("X-Bolt-Key"), Settings->ApiKey);
	}
	Socket = FWebSocketsModule::Get().CreateWebSocket(Settings->EventStreamUrl, FString(), Headers);

	TWeakObjectPtr<UPrimordiaBoltBridgeSubsystem> WeakThis(this);
	Socket->OnConnected().AddLambda([WeakThis]()
	{
		if (UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get())
		{
			UE_LOG(LogBolt, Log, TEXT("Bolt event stream connected (%s)"), *GetDefault<UPrimordiaBoltSettings>()->EventStreamUrl);
			Self->ReconnectDelay = GetDefault<UPrimordiaBoltSettings>()->ReconnectMinSeconds;
			Self->bServerReachable = true;
			Self->NextRetryTime = 0.0; // flush the unsent queue now
			Self->Socket->Send(TEXT("{\"type\":\"subscribe\",\"topics\":[\"job\",\"worker\",\"spell\",\"build\"]}"));
			Self->OnConnectionChanged.Broadcast(true);
		}
	});
	Socket->OnConnectionError().AddLambda([WeakThis](const FString& Error)
	{
		if (UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get())
		{
			UE_LOG(LogBolt, Verbose, TEXT("Bolt event stream unavailable: %s"), *Error);
			Self->ScheduleReconnect();
		}
	});
	Socket->OnClosed().AddLambda([WeakThis](int32 Code, const FString& Reason, bool)
	{
		if (UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get())
		{
			UE_LOG(LogBolt, Log, TEXT("Bolt event stream closed (%d %s)"), Code, *Reason);
			Self->OnConnectionChanged.Broadcast(false);
			Self->ScheduleReconnect();
		}
	});
	Socket->OnMessage().AddLambda([WeakThis](const FString& Message)
	{
		if (UPrimordiaBoltBridgeSubsystem* Self = WeakThis.Get())
		{
			Self->HandleMessage(Message);
		}
	});
	Socket->Connect();
}

void UPrimordiaBoltBridgeSubsystem::Disconnect()
{
	bWantConnection = false;
	if (Socket.IsValid())
	{
		Socket->OnConnected().Clear();
		Socket->OnConnectionError().Clear();
		Socket->OnClosed().Clear();
		Socket->OnMessage().Clear();
		if (Socket->IsConnected())
		{
			Socket->Close();
		}
		Socket.Reset();
	}
}

bool UPrimordiaBoltBridgeSubsystem::IsEventStreamConnected() const
{
	return Socket.IsValid() && Socket->IsConnected();
}

void UPrimordiaBoltBridgeSubsystem::ScheduleReconnect()
{
	if (!bWantConnection)
	{
		return;
	}
	const UPrimordiaBoltSettings* Settings = GetDefault<UPrimordiaBoltSettings>();
	NextReconnectTime = FPlatformTime::Seconds() + ReconnectDelay;
	ReconnectDelay = FMath::Min(ReconnectDelay * 2.f, Settings->ReconnectMaxSeconds);
}

void UPrimordiaBoltBridgeSubsystem::HandleMessage(const FString& Message)
{
	const TSharedPtr<FJsonObject> Obj = FromJsonText(Message);
	if (!Obj.IsValid())
	{
		UE_LOG(LogBolt, Warning, TEXT("Bolt sent a message that is not JSON: %s"), *Message.Left(200));
		return;
	}
	FBoltEvent Event;
	Obj->TryGetStringField(TEXT("type"), Event.Type);
	Event.Json = Message;
	Event.ReceivedAt = FDateTime::UtcNow();

	const TSharedPtr<FJsonObject>* JobObj = nullptr;
	if (Obj->TryGetObjectField(TEXT("job"), JobObj))
	{
		(*JobObj)->TryGetStringField(TEXT("id"), Event.JobId);
		if (Event.Type.StartsWith(TEXT("job.")))
		{
			ApplyJobJson(*JobObj);
		}
	}
	else
	{
		Obj->TryGetStringField(TEXT("jobId"), Event.JobId);
	}
	OnEventNative.Broadcast(Event);
	OnEvent.Broadcast(Event);
}

bool UPrimordiaBoltBridgeSubsystem::Tick(float DeltaSeconds)
{
	const double Now = FPlatformTime::Seconds();
	const UPrimordiaBoltSettings* Settings = GetDefault<UPrimordiaBoltSettings>();

	if (bWantConnection && NextReconnectTime > 0.0 && Now >= NextReconnectTime && !IsEventStreamConnected())
	{
		NextReconnectTime = 0.0;
		Connect();
	}

	// Retry unsent jobs: right away once the server is known to be up, otherwise every few seconds.
	if (Now >= NextRetryTime)
	{
		NextRetryTime = Now + (bServerReachable ? 0.5 : FMath::Max(2.0, static_cast<double>(ReconnectDelay)));
		TArray<FString> Unsent;
		for (const TPair<FString, FBoltJob>& J : Jobs)
		{
			if (J.Value.Status == EBoltJobStatus::Unsent)
			{
				Unsent.Add(J.Key);
			}
		}
		for (const FString& Id : Unsent)
		{
			SendJob(Id);
		}
	}

	// Without the event stream nothing tells us a job finished: poll.
	if (!IsEventStreamConnected() && Now >= NextPollTime)
	{
		NextPollTime = Now + Settings->PollSeconds;
		for (const TPair<FString, FBoltJob>& J : Jobs)
		{
			if (J.Value.Status == EBoltJobStatus::Queued || J.Value.Status == EBoltJobStatus::Running)
			{
				RefreshJob(J.Key);
			}
		}
	}
	return true;
}

TSharedPtr<FJsonObject> UPrimordiaBoltBridgeSubsystem::ParseResult(const FBoltJob& Job)
{
	return FromJsonText(Job.ResultJson);
}
