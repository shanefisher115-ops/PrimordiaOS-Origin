#include "PrimordiaOSRealmBridge.h"
#include "PrimordiaTypes.h"
#include "WebSocketsModule.h"

DEFINE_LOG_CATEGORY(LogPrimordia);

void FPrimordiaOSRealmBridgeModule::StartupModule()
{
	// The WebSockets module is not loaded by default in every target type.
	FModuleManager::Get().LoadModuleChecked<FWebSocketsModule>(TEXT("WebSockets"));
	UE_LOG(LogPrimordia, Log, TEXT("PrimordiaOS Realm Bridge loaded (PRS-1)."));
}

void FPrimordiaOSRealmBridgeModule::ShutdownModule()
{
}

IMPLEMENT_MODULE(FPrimordiaOSRealmBridgeModule, PrimordiaOSRealmBridge)
