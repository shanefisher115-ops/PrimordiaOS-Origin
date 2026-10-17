#include "PrimordiaOSRealmBridgeEditor.h"
#include "PrimordiaBlueprintLibrary.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaBridgeSubsystem.h"
#include "Actors/RealmRootActor.h"
#include "DesktopPlatformModule.h"
#include "Editor.h"
#include "Framework/Application/SlateApplication.h"
#include "Framework/Notifications/NotificationManager.h"
#include "ISettingsModule.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "ToolMenus.h"
#include "Widgets/Notifications/SNotificationList.h"

#define LOCTEXT_NAMESPACE "PrimordiaOSRealmBridgeEditor"

namespace
{
	UWorld* EditorWorld()
	{
		return GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
	}

	void Notify(const FText& Text, bool bSuccess)
	{
		FNotificationInfo Info(Text);
		Info.ExpireDuration = 4.f;
		if (TSharedPtr<SNotificationItem> Item = FSlateNotificationManager::Get().AddNotification(Info))
		{
			Item->SetCompletionState(bSuccess ? SNotificationItem::CS_Success : SNotificationItem::CS_Fail);
		}
	}

	// A tiny built-in manifest so the generator can be tried with no server and no files.
	const TCHAR* DemoManifest = TEXT(R"json({
  "prs": "1.0", "realm_id": "realm-demo", "realm_name": "Aurelion Deep", "seed": 1597463007, "revision": 0,
  "transition_seconds": 4, "bounds": { "radius": 120 },
  "layers": [
    { "id": "ground-0", "kind": "ground", "order": 0, "altitude": 0, "radius": 120, "density": 0.5,
      "palette": [[0.18, 0.16, 0.22], [0.05, 0.04, 0.08]], "params": { "roughness": 0.6, "terrace_count": 3 } },
    { "id": "sky-1", "kind": "sky", "order": 1, "altitude": 80, "radius": 180, "density": 0.6,
      "palette": [[2.0, 1.8, 1.4], [0.1, 0.1, 0.3]], "params": { "star_count": 1200 } },
    { "id": "ring-2", "kind": "ring", "order": 2, "altitude": 30, "radius": 60, "density": 0.7,
      "palette": [[0.9, 0.6, 0.2], [0.2, 0.1, 0.05]], "params": { "thickness": 3, "tilt_deg": 18 } },
    { "id": "spire_field-3", "kind": "spire_field", "order": 3, "altitude": 0, "radius": 90, "density": 0.4,
      "palette": [[0.3, 0.35, 0.5], [0.05, 0.05, 0.1]], "params": { "max_height": 30 } }
  ],
  "metaphysics": { "entropy": 0.35, "luminosity": 0.7, "coherence": 0.6, "resonance": 0.5, "inversion": 0.2,
                   "lucidity": 0.55, "time_dilation": 1.0, "essence": [1.0, 0.42, 0.28] },
  "topology": { "kind": "small_world", "node_count": 64, "edge_density": 0.5, "radius": 18, "center": [0, 0, 22] },
  "glyphs": [
    { "id": "soul", "kind": "soul", "position": [0, 0, 14], "scale": 6, "symmetry": 6, "complexity": 0.5, "hue": 0.62, "bound_to": "soul" },
    { "id": "sigil-0", "kind": "sigil", "position": [32, 0, 8], "scale": 4, "symmetry": 5, "complexity": 0.7, "hue": 0.1 },
    { "id": "sigil-1", "kind": "ward", "position": [-16, 27.7, 10], "scale": 3, "symmetry": 8, "complexity": 0.4, "hue": 0.8 }
  ]
})json");
}

void FPrimordiaOSRealmBridgeEditorModule::StartupModule()
{
	UToolMenus::RegisterStartupCallback(FSimpleMulticastDelegate::FDelegate::CreateRaw(this, &FPrimordiaOSRealmBridgeEditorModule::RegisterMenus));
}

void FPrimordiaOSRealmBridgeEditorModule::ShutdownModule()
{
	UToolMenus::UnRegisterStartupCallback(this);
	UToolMenus::UnregisterOwner(this);
}

void FPrimordiaOSRealmBridgeEditorModule::RegisterMenus()
{
	FToolMenuOwnerScoped OwnerScoped(this);
	UToolMenu* Menu = UToolMenus::Get()->ExtendMenu("LevelEditor.MainMenu.Tools");
	FToolMenuSection& Section = Menu->FindOrAddSection("PrimordiaOS", LOCTEXT("Section", "PrimordiaOS"));

	Section.AddMenuEntry("PrimordiaConnect",
		LOCTEXT("Connect", "Connect Editor World"),
		LOCTEXT("ConnectTip", "Stream PrimordiaOS into the editor viewport (requires 'Run In Editor World' in Project Settings)."),
		FSlateIcon(), FUIAction(FExecuteAction::CreateRaw(this, &FPrimordiaOSRealmBridgeEditorModule::ConnectEditorWorld)));

	Section.AddMenuEntry("PrimordiaDisconnect",
		LOCTEXT("Disconnect", "Disconnect Editor World"),
		LOCTEXT("DisconnectTip", "Stop streaming PrimordiaOS into the editor world."),
		FSlateIcon(), FUIAction(FExecuteAction::CreateRaw(this, &FPrimordiaOSRealmBridgeEditorModule::DisconnectEditorWorld)));

	Section.AddMenuEntry("PrimordiaImport",
		LOCTEXT("Import", "Import PRS-1 Manifest..."),
		LOCTEXT("ImportTip", "Generate a realm in the current level from a PRS-1 manifest JSON file."),
		FSlateIcon(), FUIAction(FExecuteAction::CreateRaw(this, &FPrimordiaOSRealmBridgeEditorModule::ImportManifest)));

	Section.AddMenuEntry("PrimordiaDemo",
		LOCTEXT("Demo", "Spawn Demo Realm"),
		LOCTEXT("DemoTip", "Generate the built-in demo realm (no server needed)."),
		FSlateIcon(), FUIAction(FExecuteAction::CreateRaw(this, &FPrimordiaOSRealmBridgeEditorModule::SpawnDemoRealm)));

	Section.AddMenuEntry("PrimordiaSettings",
		LOCTEXT("Settings", "Realm Bridge Settings..."),
		LOCTEXT("SettingsTip", "Open Project Settings > Plugins > PrimordiaOS Realm Bridge."),
		FSlateIcon(), FUIAction(FExecuteAction::CreateRaw(this, &FPrimordiaOSRealmBridgeEditorModule::OpenSettings)));
}

void FPrimordiaOSRealmBridgeEditorModule::ConnectEditorWorld()
{
	UPrimordiaBridgeSubsystem* Bridge = UPrimordiaBridgeSubsystem::Get(EditorWorld());
	if (!Bridge)
	{
		Notify(LOCTEXT("NoBridge", "Enable 'Run In Editor World' in Project Settings > PrimordiaOS Realm Bridge, then reopen the level."), false);
		return;
	}
	Bridge->Connect();
	Notify(FText::Format(LOCTEXT("Connecting", "Connecting to {0}..."), FText::FromString(UPrimordiaBridgeSettings::Get()->ServerUrl)), true);
}

void FPrimordiaOSRealmBridgeEditorModule::DisconnectEditorWorld()
{
	if (UPrimordiaBridgeSubsystem* Bridge = UPrimordiaBridgeSubsystem::Get(EditorWorld()))
	{
		Bridge->Disconnect();
	}
}

void FPrimordiaOSRealmBridgeEditorModule::ImportManifest()
{
	IDesktopPlatform* Desktop = FDesktopPlatformModule::Get();
	if (!Desktop)
	{
		return;
	}
	TArray<FString> Files;
	const void* ParentWindow = FSlateApplication::Get().FindBestParentWindowHandleForDialogs(nullptr);
	if (!Desktop->OpenFileDialog(ParentWindow, TEXT("Import PRS-1 Realm Manifest"), FPaths::ProjectDir(), TEXT(""), TEXT("PRS-1 manifest (*.json)|*.json"), EFileDialogFlags::None, Files) || Files.IsEmpty())
	{
		return;
	}
	FString Error;
	ARealmRootActor* Realm = UPrimordiaBlueprintLibrary::SpawnRealmFromFile(EditorWorld(), Files[0], FTransform::Identity, Error);
	if (Realm)
	{
		GEditor->SelectNone(false, true);
		GEditor->SelectActor(Realm, true, true);
		Notify(FText::Format(LOCTEXT("Imported", "Generated realm '{0}'"), FText::FromString(Realm->Manifest.RealmName)), true);
	}
	else
	{
		Notify(FText::Format(LOCTEXT("ImportFailed", "Manifest rejected: {0}"), FText::FromString(Error)), false);
	}
}

void FPrimordiaOSRealmBridgeEditorModule::SpawnDemoRealm()
{
	FString Error;
	ARealmRootActor* Realm = UPrimordiaBlueprintLibrary::SpawnRealmFromManifestJson(EditorWorld(), DemoManifest, FTransform::Identity, Error);
	Notify(Realm ? LOCTEXT("DemoOk", "Demo realm generated") : FText::FromString(Error), Realm != nullptr);
}

void FPrimordiaOSRealmBridgeEditorModule::OpenSettings()
{
	if (ISettingsModule* Settings = FModuleManager::GetModulePtr<ISettingsModule>("Settings"))
	{
		Settings->ShowViewer("Project", "Plugins", "PrimordiaBridgeSettings");
	}
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FPrimordiaOSRealmBridgeEditorModule, PrimordiaOSRealmBridgeEditor)
