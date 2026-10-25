// Onyx Inspector: an editor tab that shows the latest Onyx frame (GPU time against budget,
// per-pipeline saturation, the hottest actors, per-sigil cost) and the Vulkan device probe.
// It reads FOnyx::LatestFrame() four times a second; nothing here touches the GPU.
#include "Framework/Application/SlateApplication.h"
#include "HAL/IConsoleManager.h"
#include "Framework/Docking/TabManager.h"
#include "Modules/ModuleManager.h"
#include "Onyx.h"
#include "Styling/CoreStyle.h"
#include "ToolMenus.h"
#include "VulkanRealmDevice.h"
#include "Widgets/Docking/SDockTab.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Text/STextBlock.h"

#define LOCTEXT_NAMESPACE "OnyxInspector"

namespace
{
const FName TabName(TEXT("OnyxInspector"));
const TCHAR* const ActionNames[] = { TEXT("idle"), TEXT("wander"), TEXT("seek"), TEXT("flee"), TEXT("rest"), TEXT("commune") };

FString Describe(const FOnyxFrame& F)
{
	FString S;
	const FVulkanRealmDeviceInfo& Device = FVulkanRealmDevice::Info();
	S += FString::Printf(TEXT("Device   %s  (%s)\n"), *Device.DeviceName, *Device.RHIName);
	if (Device.bVulkan)
	{
		S += FString::Printf(TEXT("Vulkan   %s  graphics queue %u.%u  async compute %s  DMA %s  memory budget %s\n"), *Device.ApiVersionString,
			Device.GraphicsFamily, Device.GraphicsQueueIndex, Device.bAsyncComputeFamily ? TEXT("yes") : TEXT("no"),
			Device.bTransferFamily ? TEXT("yes") : TEXT("no"), Device.bMemoryBudget ? TEXT("yes") : TEXT("no"));
		for (const FString& Family : Device.QueueFamilies)
		{
			S += TEXT("         ") + Family + TEXT("\n");
		}
	}
	S += FString::Printf(TEXT("\nRealm    %s  tick %lld  t=%.1fs  actors %d  sigils %d  spires %d\n"), *F.Realm.RealmId, F.Tick, F.Realm.RealmTime,
		F.Realm.ActorCount, F.Realm.SigilCount, F.Structures);
	S += FString::Printf(TEXT("GPU      %.3f ms of %.2f ms budget  (headroom %.0f%%)   MCP %.3f ms   render %.3f ms\n"), F.Gpu.FrameGpuMs, F.BudgetMs,
		F.Headroom * 100.0, F.RealmTickGpuMs, F.RenderGpuMs);
	S += FString::Printf(TEXT("Threads  game %.2f ms  render %.2f ms   %.0f fps\n"), F.Gpu.GameThreadMs, F.Gpu.RenderThreadMs, F.Fps);
	S += FString::Printf(TEXT("Memory   %.0f / %.0f MB  (%.0f%%)\n"), F.Gpu.DeviceLocalUsage / 1048576.0, F.Gpu.DeviceLocalBudget / 1048576.0, F.Gpu.MemoryPressure * 100.0);

	S += TEXT("\nPipelines                ms      budget   saturation  threads\n");
	TArray<FString> Ids;
	F.Pipelines.GetKeys(Ids);
	Ids.Sort();
	for (const FString& Id : Ids)
	{
		const FOnyxPipelineMetrics& M = F.Pipelines[Id];
		S += FString::Printf(TEXT("  %-22s %7.3f  %7.3f  %8.0f%%%s  %llu\n"), *Id, M.GpuMs, M.BudgetMs, M.Saturation() * 100.0, M.Saturation() > 1.0 ? TEXT(" !") : TEXT("  "), M.Invocations);
	}
	if (F.ActorCount > 0)
	{
		S += FString::Printf(TEXT("\nActors   %d  mean %.3f us  total %.1f us\n  "), F.ActorCount, F.ActorGpuUsTotal / F.ActorCount, F.ActorGpuUsTotal);
		for (int32 A = 0; A < F.Actions.Num() && A < UE_ARRAY_COUNT(ActionNames); ++A)
		{
			S += FString::Printf(TEXT("%s %d   "), ActionNames[A], F.Actions[A]);
		}
		S += TEXT("\n  hottest:\n");
		for (const TPair<uint32, FOnyxActorMetrics>& A : F.HottestActors)
		{
			S += FString::Printf(TEXT("    #%-6u %.3f us  %u nodes  %u sigils  %u memories  %s\n"), A.Key, A.Value.GpuUs, A.Value.TreeNodes, A.Value.SigilsScanned,
				A.Value.MemoriesCompared, ActionNames[FMath::Min<int32>(A.Value.Action, UE_ARRAY_COUNT(ActionNames) - 1)]);
		}
	}
	if (F.Sigils.Num() > 0)
	{
		S += TEXT("\nSigils\n");
		for (int32 I = 0; I < F.Sigils.Num(); ++I)
		{
			S += FString::Printf(TEXT("  #%-3d %8.3f us  %u voxels\n"), I, F.Sigils[I].GpuUs, F.Sigils[I].Voxels);
		}
	}
	return S;
}

class SOnyxInspector : public SCompoundWidget
{
public:
	SLATE_BEGIN_ARGS(SOnyxInspector) {}
	SLATE_END_ARGS()

	void Construct(const FArguments&)
	{
		ChildSlot
		[
			SNew(SScrollBox)
			+ SScrollBox::Slot().Padding(8.f)
			[
				SAssignNew(Text, STextBlock)
				.Font(FCoreStyle::GetDefaultFontStyle("Mono", 9))
				.Text(LOCTEXT("Waiting", "Waiting for the first Onyx frame..."))
			]
		];
		RegisterActiveTimer(0.25f, FWidgetActiveTimerDelegate::CreateSP(this, &SOnyxInspector::Refresh));
	}

private:
	EActiveTimerReturnType Refresh(double, float)
	{
		const FOnyxFrame Frame = FOnyx::Get().LatestFrame();
		if (Frame.Tick > 0 || Frame.Gpu.FrameGpuMs > 0.0)
		{
			Text->SetText(FText::FromString(Describe(Frame)));
		}
		return EActiveTimerReturnType::Continue;
	}

	TSharedPtr<STextBlock> Text;
};
} // namespace

class FOnyxInspectorModule : public IModuleInterface
{
public:
	virtual void StartupModule() override
	{
		FGlobalTabmanager::Get()->RegisterNomadTabSpawner(TabName, FOnSpawnTab::CreateLambda([](const FSpawnTabArgs&)
		{
			return SNew(SDockTab).TabRole(ETabRole::NomadTab)[SNew(SOnyxInspector)];
		}))
		.SetDisplayName(LOCTEXT("TabTitle", "Onyx Inspector"))
		.SetTooltipText(LOCTEXT("TabTooltip", "PrimordiaOS GPU telemetry: MCP kernels, render passes, per-actor cost, memory."));

		OpenCommand = IConsoleManager::Get().RegisterConsoleCommand(TEXT("Onyx.Inspector"), TEXT("Opens the Onyx Inspector tab."),
			FConsoleCommandDelegate::CreateLambda([]() { FGlobalTabmanager::Get()->TryInvokeTab(TabName); }));

		UToolMenus::RegisterStartupCallback(FSimpleMulticastDelegate::FDelegate::CreateLambda([]()
		{
			UToolMenu* Menu = UToolMenus::Get()->ExtendMenu(TEXT("LevelEditor.MainMenu.Window"));
			FToolMenuSection& Section = Menu->FindOrAddSection(TEXT("PrimordiaOS"));
			Section.AddMenuEntry(TEXT("OnyxInspector"), LOCTEXT("MenuEntry", "Onyx Inspector"), LOCTEXT("MenuTooltip", "Open the PrimordiaOS GPU telemetry inspector."),
				FSlateIcon(), FUIAction(FExecuteAction::CreateLambda([]() { FGlobalTabmanager::Get()->TryInvokeTab(TabName); })));
		}));
	}

	virtual void ShutdownModule() override
	{
		if (OpenCommand)
		{
			IConsoleManager::Get().UnregisterConsoleObject(OpenCommand);
			OpenCommand = nullptr;
		}
		if (FSlateApplication::IsInitialized())
		{
			FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(TabName);
		}
	}

private:
	IConsoleObject* OpenCommand = nullptr;
};

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FOnyxInspectorModule, OnyxInspector)
