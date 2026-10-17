#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

/**
 * Editor integration: Tools > PrimordiaOS menu (connect the editor world for
 * live viewport previews, import a PRS-1 manifest, spawn a demo realm, open
 * settings).
 */
class FPrimordiaOSRealmBridgeEditorModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

private:
	void RegisterMenus();

	void ConnectEditorWorld();
	void DisconnectEditorWorld();
	void ImportManifest();
	void SpawnDemoRealm();
	void OpenSettings();
};
