#include "PrimordiaModelBridge.h"

#include "Dom/JsonObject.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

void FPrimordiaRuleModel::Propose(const FPrimordiaModelRequest& Request, FPrimordiaModelCallback Callback)
{
	FPrimordiaModelResponse Response;
	Response.bOk = true;
	for (const FPrimordiaTrigger& T : Triggers)
	{
		if (!T.bEnabled)
		{
			continue;
		}
		const double* Last = LastFired.Find(T.Id);
		if (Last && Request.Now - *Last < T.CooldownSeconds)
		{
			continue;
		}
		// One live goal per trigger.
		const FString Source = FString::Printf(TEXT("trigger:%s"), *T.Id.ToString());
		const bool bActive = Request.ActiveGoals.ContainsByPredicate([&Source](const FPrimordiaGoal& G)
		{
			return G.Source == Source && (G.State == EPrimordiaGoalState::Pending || G.State == EPrimordiaGoalState::Executing);
		});
		if (bActive || !FPrimordiaPlanner::Evaluate(T.When, Request.World.Facts, T.Goal.Params))
		{
			continue;
		}
		FPrimordiaGoal Goal = T.Goal;
		Goal.Source = Source;
		Response.Goals.Add(Goal);
		LastFired.Add(T.Id, Request.Now);
	}
	Callback(Response);
}

FString FPrimordiaOllamaModel::BuildSystemPrompt(const TArray<FString>& KnownTasks)
{
	return FString::Printf(TEXT(
		"You are the cognition of PrimordiaOS, a mind that tends realms inside Unreal Engine.\n"
		"Each turn you see the world state, recent memories and relevant lore. Decide whether anything should be done.\n"
		"You may only propose goals whose task is one of: %s.\n"
		"Reply with JSON only, exactly this shape:\n"
		"{\"thought\": \"one sentence\", \"goals\": [{\"task\": \"<task>\", \"params\": {\"key\": \"value\"}, \"priority\": 0-10, "
		"\"description\": \"why\", \"satisfiedWhen\": \"optional fact expression\"}]}\n"
		"Propose at most a few goals, and none if nothing needs doing (\"goals\": []). Never repeat a goal that is already active.\n"
		"Params are strings. Intent tasks take a \"subject\" param and the params their spell needs."),
		*FString::Join(KnownTasks, TEXT(", ")));
}

FString FPrimordiaOllamaModel::BuildUserPrompt(const FPrimordiaModelRequest& R)
{
	TArray<FString> Lines;
	Lines.Add(TEXT("WORLD"));
	Lines.Add(R.WorldSummary);
	Lines.Add(TEXT("\nMEMORIES"));
	for (const FPrimordiaMemoryRecord& M : R.Memories)
	{
		Lines.Add(FString::Printf(TEXT("- [%s] %s"), *M.Kind.ToString(), *M.Summary));
	}
	Lines.Add(TEXT("\nLORE"));
	for (const FString& L : R.Lore)
	{
		Lines.Add(TEXT("- ") + L);
	}
	Lines.Add(TEXT("\nACTIVE GOALS"));
	for (const FPrimordiaGoal& G : R.ActiveGoals)
	{
		Lines.Add(FString::Printf(TEXT("- %s (%s)"), *G.Task, *G.Description));
	}
	if (R.ActiveGoals.Num() == 0)
	{
		Lines.Add(TEXT("- none"));
	}
	return FString::Join(Lines, TEXT("\n"));
}

FPrimordiaModelResponse FPrimordiaOllamaModel::ParseReply(const FString& Content, const TArray<FString>& KnownTasks, int32 InMaxGoals)
{
	FPrimordiaModelResponse Out;
	// Small models sometimes wrap JSON in prose; take the outermost object.
	const int32 Start = Content.Find(TEXT("{"));
	const int32 End = Content.Find(TEXT("}"), ESearchCase::CaseSensitive, ESearchDir::FromEnd);
	if (Start == INDEX_NONE || End == INDEX_NONE || End < Start)
	{
		Out.Error = TEXT("the model's reply holds no JSON object");
		return Out;
	}
	TSharedPtr<FJsonObject> Root;
	if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Content.Mid(Start, End - Start + 1)), Root) || !Root.IsValid())
	{
		Out.Error = TEXT("the model's reply is not valid JSON");
		return Out;
	}
	Root->TryGetStringField(TEXT("thought"), Out.Thought);
	const TArray<TSharedPtr<FJsonValue>>* Goals = nullptr;
	Out.bOk = true;
	if (!Root->TryGetArrayField(TEXT("goals"), Goals))
	{
		return Out;
	}
	for (const TSharedPtr<FJsonValue>& V : *Goals)
	{
		const TSharedPtr<FJsonObject>* G = nullptr;
		FString Task;
		if (!V->TryGetObject(G) || !(*G)->TryGetStringField(TEXT("task"), Task))
		{
			continue;
		}
		Task.TrimStartAndEndInline();
		if (!KnownTasks.Contains(Task))
		{
			Out.Error += FString::Printf(TEXT("dropped unknown task '%s'. "), *Task);
			continue;
		}
		FPrimordiaGoal Goal;
		Goal.Task = Task;
		(*G)->TryGetStringField(TEXT("description"), Goal.Description);
		(*G)->TryGetStringField(TEXT("satisfiedWhen"), Goal.SatisfiedWhen);
		double Priority = 0.0;
		(*G)->TryGetNumberField(TEXT("priority"), Priority);
		Goal.Priority = FMath::Clamp(FMath::RoundToInt(Priority), 0, 10);
		const TSharedPtr<FJsonObject>* Params = nullptr;
		if ((*G)->TryGetObjectField(TEXT("params"), Params))
		{
			for (const TPair<FString, TSharedPtr<FJsonValue>>& P : (*Params)->Values)
			{
				FString S;
				if (P.Value.IsValid() && P.Value->TryGetString(S)) { Goal.Params.Add(P.Key, S); }
				else if (P.Value.IsValid() && P.Value->Type == EJson::Number) { Goal.Params.Add(P.Key, FString::SanitizeFloat(P.Value->AsNumber())); }
				else if (P.Value.IsValid() && P.Value->Type == EJson::Boolean) { Goal.Params.Add(P.Key, P.Value->AsBool() ? TEXT("true") : TEXT("false")); }
			}
		}
		Goal.MaxAttempts = 1; // a model's idea gets one chance; it can propose again
		Out.Goals.Add(Goal);
		if (Out.Goals.Num() >= InMaxGoals)
		{
			break;
		}
	}
	return Out;
}

void FPrimordiaOllamaModel::Propose(const FPrimordiaModelRequest& Request, FPrimordiaModelCallback Callback)
{
	if (bBusy)
	{
		FPrimordiaModelResponse Busy;
		Busy.Error = TEXT("busy");
		Callback(Busy);
		return;
	}
	bBusy = true;

	TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
	Body->SetStringField(TEXT("model"), Model);
	Body->SetBoolField(TEXT("stream"), false);
	Body->SetStringField(TEXT("format"), TEXT("json"));
	TSharedRef<FJsonObject> Options = MakeShared<FJsonObject>();
	Options->SetNumberField(TEXT("temperature"), 0.3);
	Body->SetObjectField(TEXT("options"), Options);
	TArray<TSharedPtr<FJsonValue>> Messages;
	auto Msg = [&Messages](const TCHAR* Role, const FString& Content)
	{
		TSharedRef<FJsonObject> M = MakeShared<FJsonObject>();
		M->SetStringField(TEXT("role"), Role);
		M->SetStringField(TEXT("content"), Content);
		Messages.Add(MakeShared<FJsonValueObject>(M));
	};
	Msg(TEXT("system"), BuildSystemPrompt(Request.KnownTasks));
	Msg(TEXT("user"), BuildUserPrompt(Request));
	Body->SetArrayField(TEXT("messages"), Messages);

	FString Text;
	FJsonSerializer::Serialize(Body, TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Text));

	FString Base = Url;
	Base.RemoveFromEnd(TEXT("/"));
	const TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Http = FHttpModule::Get().CreateRequest();
	Http->SetURL(Base + TEXT("/api/chat"));
	Http->SetVerb(TEXT("POST"));
	Http->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
	Http->SetTimeout(TimeoutSeconds);
	Http->SetContentAsString(Text);

	TWeakPtr<FPrimordiaOllamaModel> Weak = AsShared();
	const TArray<FString> Known = Request.KnownTasks;
	const int32 Max = MaxGoals;
	Http->OnProcessRequestComplete().BindLambda([Weak, Callback, Known, Max](FHttpRequestPtr, FHttpResponsePtr Response, bool bConnected)
	{
		if (const TSharedPtr<FPrimordiaOllamaModel> Self = Weak.Pin())
		{
			Self->bBusy = false;
		}
		FPrimordiaModelResponse Out;
		if (!bConnected || !Response.IsValid())
		{
			Out.Error = TEXT("Ollama is not reachable");
			Callback(Out);
			return;
		}
		if (Response->GetResponseCode() != 200)
		{
			Out.Error = FString::Printf(TEXT("Ollama HTTP %d: %s"), Response->GetResponseCode(), *Response->GetContentAsString().Left(200));
			Callback(Out);
			return;
		}
		TSharedPtr<FJsonObject> Reply;
		const TSharedPtr<FJsonObject>* Message = nullptr;
		FString Content;
		if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Response->GetContentAsString()), Reply) || !Reply.IsValid() ||
			!Reply->TryGetObjectField(TEXT("message"), Message) || !(*Message)->TryGetStringField(TEXT("content"), Content))
		{
			Out.Error = TEXT("Ollama's reply has no message content");
			Callback(Out);
			return;
		}
		Callback(ParseReply(Content, Known, Max));
	});
	Http->ProcessRequest();
}
