#include "PrimordiaOllamaConversation.h"
#include "PrimordiaOllamaSettings.h"
#include "PrimordiaOllamaSubsystem.h"

FPrimordiaOllamaChatRequest UPrimordiaOllamaConversation::BuildRequest(const FString& UserText) const
{
	FPrimordiaOllamaChatRequest Request;
	Request.Model = Model;
	Request.Options = Options;
	Request.bThink = bThink;
	const FString System = SystemPrompt.IsEmpty() ? UPrimordiaOllamaSettings::Get()->DefaultSystemPrompt : SystemPrompt;
	if (!System.IsEmpty())
	{
		Request.Messages.Emplace(EPrimordiaChatRole::System, System);
	}
	Request.Messages.Append(History);
	Request.Messages.Emplace(EPrimordiaChatRole::User, UserText);
	return Request;
}

FGuid UPrimordiaOllamaConversation::Send(const FString& UserText, FPrimordiaOllamaTokenDelegate OnToken, FPrimordiaOllamaCompleteDelegate OnComplete)
{
	UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get();
	if (!Ollama || IsBusy())
	{
		OnComplete.ExecuteIfBound(false, FString(), FPrimordiaOllamaStats(), IsBusy() ? TEXT("Conversation is already waiting for a reply") : TEXT("Ollama subsystem unavailable"));
		return FGuid();
	}

	ActiveRequest = Ollama->Chat(BuildRequest(UserText), MoveTemp(OnToken), FPrimordiaOllamaCompleteDelegate::CreateWeakLambda(this,
		[this, UserText, OnComplete](bool bSuccess, const FString& Text, const FPrimordiaOllamaStats& Stats, const FString& Error)
		{
			ActiveRequest.Invalidate();
			if (bSuccess)
			{
				History.Emplace(EPrimordiaChatRole::User, UserText);
				History.Emplace(EPrimordiaChatRole::Assistant, Text);
				Trim();
			}
			OnComplete.ExecuteIfBound(bSuccess, Text, Stats, Error);
		}));
	return ActiveRequest;
}

void UPrimordiaOllamaConversation::AddMessage(EPrimordiaChatRole Role, const FString& Content)
{
	History.Emplace(Role, Content);
	Trim();
}

void UPrimordiaOllamaConversation::ClearHistory()
{
	History.Reset();
}

void UPrimordiaOllamaConversation::Cancel()
{
	if (ActiveRequest.IsValid())
	{
		if (UPrimordiaOllamaSubsystem* Ollama = UPrimordiaOllamaSubsystem::Get())
		{
			Ollama->Cancel(ActiveRequest); // completes with "Cancelled", which clears ActiveRequest
		}
		ActiveRequest.Invalidate();
	}
}

void UPrimordiaOllamaConversation::Trim()
{
	const int32 Max = MaxMessages > 0 ? MaxMessages : UPrimordiaOllamaSettings::Get()->MaxConversationMessages;
	if (History.Num() > Max)
	{
		// Drop whole exchanges from the front so the history still starts with a user line.
		int32 Drop = History.Num() - Max;
		Drop += Drop % 2;
		History.RemoveAt(0, FMath::Min(Drop, History.Num()));
	}
}
