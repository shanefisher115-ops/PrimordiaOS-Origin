// FOnyxRuntimeModule and the Onyx console commands.
#include "Engine/Engine.h"
#include "HAL/IConsoleManager.h"
#include "Modules/ModuleManager.h"
#include "Onyx.h"
#include "OnyxSubsystem.h"
#include "Serialization/JsonSerializer.h"

DEFINE_LOG_CATEGORY_STATIC(LogOnyx, Log, All);

class FOnyxRuntimeModule : public IModuleInterface
{
public:
	virtual void StartupModule() override
	{
		Commands.Add(IConsoleManager::Get().RegisterConsoleCommand(TEXT("Onyx.Show"), TEXT("Onyx.Show 1|0: on-screen GPU telemetry inspector."),
			FConsoleCommandWithArgsDelegate::CreateLambda([](const TArray<FString>& Args)
			{
				if (UOnyxSubsystem* Onyx = GEngine ? GEngine->GetEngineSubsystem<UOnyxSubsystem>() : nullptr)
				{
					Onyx->SetOverlayVisible(Args.Num() == 0 ? !Onyx->IsOverlayVisible() : FCString::Atoi(*Args[0]) != 0);
				}
			})));
		Commands.Add(IConsoleManager::Get().RegisterConsoleCommand(TEXT("Onyx.Dump"), TEXT("Logs the latest Onyx frame as PRS-1 gpu_telemetry JSON."),
			FConsoleCommandDelegate::CreateLambda([]()
			{
				FString Json;
				const TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Json);
				FJsonSerializer::Serialize(FOnyx::ToJson(FOnyx::Get().LatestFrame()), Writer);
				UE_LOG(LogOnyx, Display, TEXT("%s"), *Json);
			})));
		Commands.Add(IConsoleManager::Get().RegisterConsoleCommand(TEXT("Onyx.Budget"), TEXT("Onyx.Budget <ms>: GPU frame budget Onyx measures headroom against."),
			FConsoleCommandWithArgsDelegate::CreateLambda([](const TArray<FString>& Args)
			{
				if (Args.Num() > 0)
				{
					FOnyx::Get().SetBudgetMs(FCString::Atod(*Args[0]));
				}
				UE_LOG(LogOnyx, Display, TEXT("Onyx budget %.2f ms"), FOnyx::Get().GetBudgetMs());
			})));
	}

	virtual void ShutdownModule() override
	{
		for (IConsoleObject* C : Commands)
		{
			IConsoleManager::Get().UnregisterConsoleObject(C);
		}
		Commands.Reset();
	}

private:
	TArray<IConsoleObject*> Commands;
};

IMPLEMENT_MODULE(FOnyxRuntimeModule, OnyxRuntime)
