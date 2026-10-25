#include "PrimordiaOllamaSubsystem.h"
#include "PrimordiaOllama.h"
#include "PrimordiaOllamaSettings.h"
#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "HAL/IConsoleManager.h"
#include "HAL/PlatformMisc.h"
#include "HAL/PlatformProcess.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Misc/Paths.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

namespace
{
	constexpr int32 MaxServerStartAttempts = 10;   // ~25 s for `ollama serve` to come up
	constexpr double ServerStartRetrySeconds = 2.5;

	FString ToJson(const TSharedRef<FJsonObject>& Obj)
	{
		FString Out;
		const TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> Writer = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Out);
		FJsonSerializer::Serialize(Obj, Writer);
		return Out;
	}

	TSharedPtr<FJsonObject> ParseObject(const FString& Text)
	{
		TSharedPtr<FJsonObject> Out;
		return FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Out) ? Out : nullptr;
	}

	const TCHAR* RoleName(EPrimordiaChatRole Role)
	{
		switch (Role)
		{
		case EPrimordiaChatRole::System: return TEXT("system");
		case EPrimordiaChatRole::Assistant: return TEXT("assistant");
		default: return TEXT("user");
		}
	}

	bool IsLocalUrl(const FString& Url)
	{
		return Url.Contains(TEXT("://127.0.0.1")) || Url.Contains(TEXT("://localhost")) || Url.Contains(TEXT("://[::1]"));
	}
}

struct UPrimordiaOllamaSubsystem::FActiveRequest
{
	FGuid Id;
	FString Model;
	FString Body;
	FPrimordiaOllamaTokenDelegate OnToken;
	FPrimordiaOllamaCompleteDelegate OnComplete;
	TSharedPtr<IHttpRequest, ESPMode::ThreadSafe> Http;

	// Written by the HTTP thread, drained by the game thread.
	FCriticalSection Lock;
	TArray<uint8> Incoming;

	// Game thread only.
	TArray<uint8> LineBytes;
	FString Text;
	FString StreamError;
	FPrimordiaOllamaStats Stats;
	int32 ConnectAttempts = 0;
	double RetryAt = -1.0;
};

// ---------------------------------------------------------------------------

UPrimordiaOllamaSubsystem* UPrimordiaOllamaSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaOllamaSubsystem>() : nullptr;
}

void UPrimordiaOllamaSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	TickHandle = FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateUObject(this, &UPrimordiaOllamaSubsystem::Tick));

	const UPrimordiaOllamaSettings* Settings = UPrimordiaOllamaSettings::Get();
	if (Settings->bWarmUpOnStartup && !IsRunningCommandlet())
	{
		WarmUp(FString());
	}
}

void UPrimordiaOllamaSubsystem::Deinitialize()
{
	CancelAll();
	FTSTicker::GetCoreTicker().RemoveTicker(TickHandle);
	Super::Deinitialize();
}

FString UPrimordiaOllamaSubsystem::ResolveModel(const FString& Model) const
{
	return Model.IsEmpty() ? UPrimordiaOllamaSettings::Get()->DefaultModel : Model;
}

bool UPrimordiaOllamaSubsystem::IsCloudModel(const FString& Model)
{
	return Model.EndsWith(TEXT(":cloud")) || Model.EndsWith(TEXT("-cloud"));
}

FString UPrimordiaOllamaSubsystem::Endpoint(const TCHAR* Path) const
{
	FString Base = UPrimordiaOllamaSettings::Get()->OllamaUrl;
	Base.RemoveFromEnd(TEXT("/"));
	return Base + Path;
}

FString UPrimordiaOllamaSubsystem::BuildChatBody(const FPrimordiaOllamaChatRequest& Request, const FString& Model)
{
	const UPrimordiaOllamaSettings* Settings = UPrimordiaOllamaSettings::Get();
	const TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
	Body->SetStringField(TEXT("model"), Model);
	Body->SetBoolField(TEXT("stream"), true);
	// Sent explicitly: thinking models otherwise spend seconds reasoning before the first token.
	Body->SetBoolField(TEXT("think"), Request.bThink);
	if (!Settings->KeepAlive.IsEmpty())
	{
		Body->SetStringField(TEXT("keep_alive"), Settings->KeepAlive);
	}

	TArray<TSharedPtr<FJsonValue>> Messages;
	for (const FPrimordiaChatMessage& M : Request.Messages)
	{
		const TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
		Msg->SetStringField(TEXT("role"), RoleName(M.Role));
		Msg->SetStringField(TEXT("content"), M.Content);
		Messages.Add(MakeShared<FJsonValueObject>(Msg));
	}
	Body->SetArrayField(TEXT("messages"), Messages);

	const FPrimordiaOllamaOptions& O = Request.Options;
	const TSharedRef<FJsonObject> Options = MakeShared<FJsonObject>();
	Options->SetNumberField(TEXT("temperature"), O.Temperature >= 0.f ? O.Temperature : Settings->DefaultTemperature);
	if (O.TopP > 0.f) Options->SetNumberField(TEXT("top_p"), O.TopP);
	if (O.ContextLength > 0) Options->SetNumberField(TEXT("num_ctx"), O.ContextLength);
	const int32 MaxTokens = O.MaxTokens > 0 ? O.MaxTokens : Settings->DefaultMaxTokens;
	if (MaxTokens > 0) Options->SetNumberField(TEXT("num_predict"), MaxTokens);
	if (O.Seed >= 0) Options->SetNumberField(TEXT("seed"), O.Seed);
	Body->SetObjectField(TEXT("options"), Options);

	// Structured outputs: "json" or a JSON Schema object (Ollama constrains decoding to it).
	const FString Format = Request.Format.TrimStartAndEnd();
	if (Format == TEXT("json"))
	{
		Body->SetStringField(TEXT("format"), TEXT("json"));
	}
	else if (!Format.IsEmpty())
	{
		if (const TSharedPtr<FJsonObject> Schema = ParseObject(Format))
		{
			Body->SetObjectField(TEXT("format"), Schema);
		}
		else
		{
			UE_LOG(LogPrimordiaOllama, Warning, TEXT("Ignoring Format: it is neither \"json\" nor a JSON Schema object."));
		}
	}
	return ToJson(Body);
}

FGuid UPrimordiaOllamaSubsystem::Chat(const FPrimordiaOllamaChatRequest& Request, FPrimordiaOllamaTokenDelegate OnToken, FPrimordiaOllamaCompleteDelegate OnComplete)
{
	const FString Model = ResolveModel(Request.Model);
	if (IsCloudModel(Model) && !UPrimordiaOllamaSettings::Get()->bAllowCloudModels)
	{
		FPrimordiaOllamaStats Stats;
		Stats.Model = Model;
		OnComplete.ExecuteIfBound(false, FString(), Stats,
			FString::Printf(TEXT("'%s' runs on ollama.com, not this machine. Enable 'Allow Cloud Models' in Project Settings > PrimordiaOS Ollama to use it."), *Model));
		return FGuid();
	}

	const TSharedRef<FActiveRequest> R = MakeShared<FActiveRequest>();
	R->Id = FGuid::NewGuid();
	R->Model = Model;
	R->Body = BuildChatBody(Request, Model);
	R->OnToken = MoveTemp(OnToken);
	R->OnComplete = MoveTemp(OnComplete);
	R->Stats.Model = Model;
	Active.Add(R->Id, R);
	Send(R);
	return R->Id;
}

void UPrimordiaOllamaSubsystem::Send(const TSharedRef<FActiveRequest>& R)
{
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Http = FHttpModule::Get().CreateRequest();
	Http->SetURL(Endpoint(TEXT("/api/chat")));
	Http->SetVerb(TEXT("POST"));
	Http->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
	Http->SetContentAsString(R->Body);
	Http->SetTimeout(UPrimordiaOllamaSettings::Get()->RequestTimeoutSeconds);
	Http->SetActivityTimeout(UPrimordiaOllamaSettings::Get()->ActivityTimeoutSeconds);

	// HTTP thread: just stash bytes. A dead request (cancelled / finished) aborts the transfer.
	TWeakPtr<FActiveRequest, ESPMode::ThreadSafe> Weak = R;
	Http->SetResponseBodyReceiveStreamDelegate(FHttpRequestStreamDelegate::CreateLambda([Weak](void* Ptr, int64 Length) -> bool
	{
		const TSharedPtr<FActiveRequest, ESPMode::ThreadSafe> Pinned = Weak.Pin();
		if (!Pinned.IsValid())
		{
			return false;
		}
		FScopeLock Lock(&Pinned->Lock);
		Pinned->Incoming.Append(static_cast<const uint8*>(Ptr), static_cast<int32>(Length));
		return true;
	}));

	const FGuid Id = R->Id;
	Http->OnProcessRequestComplete().BindWeakLambda(this, [this, Id](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		OnHttpComplete(Id, bConnected && Response.IsValid(), Response.IsValid() ? Response->GetResponseCode() : 0);
	});

	R->Http = Http;
	R->ConnectAttempts++;
	Http->ProcessRequest();
}

void UPrimordiaOllamaSubsystem::DrainLines(FActiveRequest& R, bool bFlushPartial)
{
	{
		FScopeLock Lock(&R.Lock);
		if (R.Incoming.Num() > 0)
		{
			R.LineBytes.Append(R.Incoming);
			R.Incoming.Reset();
		}
	}
	// Split on raw '\n' bytes before decoding, so a UTF-8 sequence cut across
	// network chunks is never decoded half-way.
	int32 Start = 0;
	for (int32 i = 0; i < R.LineBytes.Num(); ++i)
	{
		if (R.LineBytes[i] == '\n')
		{
			if (i > Start)
			{
				const FUTF8ToTCHAR Converted(reinterpret_cast<const ANSICHAR*>(R.LineBytes.GetData() + Start), i - Start);
				HandleLine(R, FString(Converted.Length(), Converted.Get()));
			}
			Start = i + 1;
		}
	}
	R.LineBytes.RemoveAt(0, Start);
	if (bFlushPartial && R.LineBytes.Num() > 0)
	{
		const FUTF8ToTCHAR Converted(reinterpret_cast<const ANSICHAR*>(R.LineBytes.GetData()), R.LineBytes.Num());
		HandleLine(R, FString(Converted.Length(), Converted.Get()));
		R.LineBytes.Reset();
	}
}

void UPrimordiaOllamaSubsystem::HandleLine(FActiveRequest& R, const FString& Line)
{
	const TSharedPtr<FJsonObject> Obj = ParseObject(Line.TrimStartAndEnd());
	if (!Obj.IsValid())
	{
		return;
	}
	FString Error;
	if (Obj->TryGetStringField(TEXT("error"), Error))
	{
		R.StreamError = Error;
		return;
	}

	const TSharedPtr<FJsonObject>* Message = nullptr;
	FString Delta;
	if (Obj->TryGetObjectField(TEXT("message"), Message) && (*Message)->TryGetStringField(TEXT("content"), Delta) && !Delta.IsEmpty())
	{
		R.Text += Delta;
		R.OnToken.ExecuteIfBound(Delta, R.Text);
	}

	bool bDone = false;
	if (Obj->TryGetBoolField(TEXT("done"), bDone) && bDone)
	{
		// Durations are nanoseconds.
		const auto Seconds = [&Obj](const TCHAR* Field) { double Ns = 0; Obj->TryGetNumberField(Field, Ns); return static_cast<float>(Ns / 1e9); };
		double PromptTokens = 0, EvalTokens = 0;
		Obj->TryGetNumberField(TEXT("prompt_eval_count"), PromptTokens);
		Obj->TryGetNumberField(TEXT("eval_count"), EvalTokens);
		R.Stats.PromptTokens = static_cast<int32>(PromptTokens);
		R.Stats.GeneratedTokens = static_cast<int32>(EvalTokens);
		const float EvalSeconds = Seconds(TEXT("eval_duration"));
		R.Stats.TokensPerSecond = EvalSeconds > 0.f ? static_cast<float>(EvalTokens) / EvalSeconds : 0.f;
		R.Stats.LoadSeconds = Seconds(TEXT("load_duration"));
		R.Stats.TotalSeconds = Seconds(TEXT("total_duration"));
		Obj->TryGetStringField(TEXT("done_reason"), R.Stats.DoneReason);
	}
}

void UPrimordiaOllamaSubsystem::OnHttpComplete(FGuid Id, bool bConnected, int32 StatusCode)
{
	const TSharedRef<FActiveRequest>* Found = Active.Find(Id);
	if (!Found)
	{
		return; // cancelled
	}
	const TSharedRef<FActiveRequest> R = *Found;
	DrainLines(*R, true);

	if (!bConnected)
	{
		// Server not running: start it once, then keep retrying while it boots.
		if (R->Text.IsEmpty() && R->ConnectAttempts < MaxServerStartAttempts && TryStartServer())
		{
			R->RetryAt = FPlatformTime::Seconds() + ServerStartRetrySeconds;
			R->Http.Reset();
			return;
		}
		Finish(R, false, FString::Printf(TEXT("Cannot reach Ollama at %s. Is it running? (start it with `ollama serve`)"), *UPrimordiaOllamaSettings::Get()->OllamaUrl));
		return;
	}
	if (StatusCode != 200 || !R->StreamError.IsEmpty())
	{
		const FString Detail = R->StreamError.IsEmpty() ? FString::Printf(TEXT("HTTP %d"), StatusCode) : R->StreamError;
		const FString Hint = Detail.Contains(TEXT("not found")) ? FString::Printf(TEXT(" (run `ollama pull %s`)"), *R->Model) : FString();
		Finish(R, false, FString::Printf(TEXT("Ollama error: %s%s"), *Detail, *Hint));
		return;
	}
	Finish(R, true, FString());
}

void UPrimordiaOllamaSubsystem::Finish(const TSharedRef<FActiveRequest>& R, bool bSuccess, const FString& Error)
{
	Active.Remove(R->Id);
	R->Http.Reset();
	if (!bSuccess)
	{
		UE_LOG(LogPrimordiaOllama, Warning, TEXT("%s"), *Error);
	}
	else
	{
		UE_LOG(LogPrimordiaOllama, Verbose, TEXT("%s: %d tokens, %.1f tok/s"), *R->Model, R->Stats.GeneratedTokens, R->Stats.TokensPerSecond);
	}
	R->OnComplete.ExecuteIfBound(bSuccess, R->Text, R->Stats, Error);
}

void UPrimordiaOllamaSubsystem::Cancel(FGuid RequestId)
{
	const TSharedRef<FActiveRequest>* Found = Active.Find(RequestId);
	if (!Found)
	{
		return;
	}
	const TSharedRef<FActiveRequest> R = *Found;
	Active.Remove(RequestId);
	if (R->Http.IsValid())
	{
		R->Http->OnProcessRequestComplete().Unbind();
		R->Http->CancelRequest();
		R->Http.Reset();
	}
	R->OnComplete.ExecuteIfBound(false, R->Text, R->Stats, TEXT("Cancelled"));
}

void UPrimordiaOllamaSubsystem::CancelAll()
{
	TArray<FGuid> Ids;
	Active.GetKeys(Ids);
	for (const FGuid& Id : Ids)
	{
		Cancel(Id);
	}
}

bool UPrimordiaOllamaSubsystem::Tick(float DeltaTime)
{
	const double Now = FPlatformTime::Seconds();
	TArray<TSharedRef<FActiveRequest>> Snapshot;
	Active.GenerateValueArray(Snapshot);
	for (const TSharedRef<FActiveRequest>& R : Snapshot)
	{
		if (R->RetryAt > 0.0)
		{
			if (Now >= R->RetryAt)
			{
				R->RetryAt = -1.0;
				Send(R);
			}
			continue;
		}
		DrainLines(*R, false); // deliver tokens as they arrive
	}
	return true;
}

bool UPrimordiaOllamaSubsystem::TryStartServer()
{
	const UPrimordiaOllamaSettings* Settings = UPrimordiaOllamaSettings::Get();
	if (!Settings->bAutoStartOllama || !IsLocalUrl(Settings->OllamaUrl))
	{
		return false;
	}
	if (ServerStartedAt >= 0.0)
	{
		return FPlatformTime::Seconds() - ServerStartedAt < MaxServerStartAttempts * ServerStartRetrySeconds;
	}

	FString Exe = Settings->OllamaExecutable.FilePath;
	if (Exe.IsEmpty())
	{
		const FString LocalAppData = FPlatformMisc::GetEnvironmentVariable(TEXT("LOCALAPPDATA"));
		const FString Default = FPaths::Combine(LocalAppData, TEXT("Programs/Ollama/ollama.exe"));
		Exe = (!LocalAppData.IsEmpty() && FPaths::FileExists(Default)) ? Default : TEXT("ollama"); // else rely on PATH
	}

	FProcHandle Proc = FPlatformProcess::CreateProc(*Exe, TEXT("serve"), true, true, true, nullptr, 0, nullptr, nullptr);
	if (!Proc.IsValid())
	{
		UE_LOG(LogPrimordiaOllama, Warning, TEXT("Could not launch '%s serve'. Install Ollama or set the executable in Project Settings > PrimordiaOS Ollama."), *Exe);
		ServerStartedAt = 0.0; // don't keep trying
		return false;
	}
	FPlatformProcess::CloseProc(Proc); // the server outlives the editor, like the Ollama tray app
	ServerStartedAt = FPlatformTime::Seconds();
	UE_LOG(LogPrimordiaOllama, Log, TEXT("Started '%s serve'; waiting for it to come up."), *Exe);
	return true;
}

void UPrimordiaOllamaSubsystem::ListModels(FPrimordiaOllamaModelsDelegate OnDone)
{
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Http = FHttpModule::Get().CreateRequest();
	Http->SetURL(Endpoint(TEXT("/api/tags")));
	Http->SetVerb(TEXT("GET"));
	Http->SetTimeout(10.f);
	Http->OnProcessRequestComplete().BindLambda([OnDone](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		TArray<FPrimordiaOllamaModelInfo> Models;
		if (!bConnected || !Response.IsValid() || Response->GetResponseCode() != 200)
		{
			OnDone.ExecuteIfBound(false, Models, FString::Printf(TEXT("Cannot reach Ollama at %s"), *UPrimordiaOllamaSettings::Get()->OllamaUrl));
			return;
		}
		const TSharedPtr<FJsonObject> Root = ParseObject(Response->GetContentAsString());
		const TArray<TSharedPtr<FJsonValue>>* List = nullptr;
		if (Root.IsValid() && Root->TryGetArrayField(TEXT("models"), List))
		{
			for (const TSharedPtr<FJsonValue>& V : *List)
			{
				const TSharedPtr<FJsonObject> M = V->AsObject();
				if (!M.IsValid()) continue;
				FPrimordiaOllamaModelInfo& Info = Models.AddDefaulted_GetRef();
				M->TryGetStringField(TEXT("name"), Info.Name);
				double Size = 0;
				M->TryGetNumberField(TEXT("size"), Size);
				Info.SizeBytes = static_cast<int64>(Size);
				const TSharedPtr<FJsonObject>* Details = nullptr;
				if (M->TryGetObjectField(TEXT("details"), Details))
				{
					(*Details)->TryGetStringField(TEXT("parameter_size"), Info.ParameterSize);
					(*Details)->TryGetStringField(TEXT("family"), Info.Family);
					(*Details)->TryGetStringField(TEXT("quantization_level"), Info.Quantization);
				}
				Info.bIsCloud = IsCloudModel(Info.Name) || M->HasField(TEXT("remote_host"));
			}
		}
		OnDone.ExecuteIfBound(true, Models, FString());
	});
	Http->ProcessRequest();
}

void UPrimordiaOllamaSubsystem::WarmUp(const FString& InModel)
{
	const FString Model = ResolveModel(InModel);
	if (IsCloudModel(Model))
	{
		return;
	}
	const TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
	Body->SetStringField(TEXT("model"), Model);
	Body->SetStringField(TEXT("keep_alive"), UPrimordiaOllamaSettings::Get()->KeepAlive);
	Body->SetBoolField(TEXT("stream"), false);

	// /api/generate with no prompt just loads the model.
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Http = FHttpModule::Get().CreateRequest();
	Http->SetURL(Endpoint(TEXT("/api/generate")));
	Http->SetVerb(TEXT("POST"));
	Http->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
	Http->SetContentAsString(ToJson(Body));
	Http->SetTimeout(UPrimordiaOllamaSettings::Get()->RequestTimeoutSeconds);
	Http->OnProcessRequestComplete().BindLambda([Model](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		const bool bOk = bConnected && Response.IsValid() && Response->GetResponseCode() == 200;
		UE_LOG(LogPrimordiaOllama, Log, TEXT("Warm-up of %s %s"), *Model, bOk ? TEXT("done") : TEXT("failed"));
	});
	Http->ProcessRequest();
}

// ---------------------------------------------------------------------------
// Console: Primordia.Ollama.Ask <text>, Primordia.Ollama.Models,
//          Primordia.Ollama.WarmUp [model], Primordia.Ollama.Cancel
// ---------------------------------------------------------------------------

namespace
{
	FAutoConsoleCommand GAskCmd(TEXT("Primordia.Ollama.Ask"), TEXT("Ask the default Ollama model: Primordia.Ollama.Ask what is the heart?"),
		FConsoleCommandWithArgsDelegate::CreateLambda([](const TArray<FString>& Args)
		{
			UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get();
			if (!Ollama || Args.IsEmpty()) return;
			FPrimordiaOllamaChatRequest Request;
			Request.Messages.Emplace(EPrimordiaChatRole::System, UPrimordiaOllamaSettings::Get()->DefaultSystemPrompt);
			Request.Messages.Emplace(EPrimordiaChatRole::User, FString::Join(Args, TEXT(" ")));
			Ollama->Chat(Request, FPrimordiaOllamaTokenDelegate(), FPrimordiaOllamaCompleteDelegate::CreateLambda(
				[](bool bOk, const FString& Text, const FPrimordiaOllamaStats& Stats, const FString& Error)
				{
					if (bOk)
						UE_LOG(LogPrimordiaOllama, Display, TEXT("[%s, %d tok, %.1f tok/s] %s"), *Stats.Model, Stats.GeneratedTokens, Stats.TokensPerSecond, *Text);
				}));
		}));

	FAutoConsoleCommand GModelsCmd(TEXT("Primordia.Ollama.Models"), TEXT("List models installed in Ollama"),
		FConsoleCommandDelegate::CreateLambda([]()
		{
			if (UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get())
			{
				Ollama->ListModels(FPrimordiaOllamaModelsDelegate::CreateLambda([](bool bOk, const TArray<FPrimordiaOllamaModelInfo>& Models, const FString& Error)
				{
					if (!bOk) { UE_LOG(LogPrimordiaOllama, Warning, TEXT("%s"), *Error); return; }
					for (const FPrimordiaOllamaModelInfo& M : Models)
					{
						UE_LOG(LogPrimordiaOllama, Display, TEXT("%-32s %6s %5.1f GB%s"), *M.Name, *M.ParameterSize, M.SizeBytes / 1e9, M.bIsCloud ? TEXT("  (cloud)") : TEXT(""));
					}
				}));
			}
		}));

	FAutoConsoleCommand GWarmCmd(TEXT("Primordia.Ollama.WarmUp"), TEXT("Load a model into memory: Primordia.Ollama.WarmUp [model]"),
		FConsoleCommandWithArgsDelegate::CreateLambda([](const TArray<FString>& Args)
		{
			if (UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get()) Ollama->WarmUp(Args.IsEmpty() ? FString() : Args[0]);
		}));

	FAutoConsoleCommand GCancelCmd(TEXT("Primordia.Ollama.Cancel"), TEXT("Cancel every in-flight Ollama request"),
		FConsoleCommandDelegate::CreateLambda([]()
		{
			if (UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get()) Ollama->CancelAll();
		}));
}
