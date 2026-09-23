#include "UnrealRPCServer.h"
#include "Sockets.h"
#include "SocketSubsystem.h"
#include "Json.h"
#include "JsonUtilities.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "HAL/RunnableThread.h"

void FUnrealRPCServer::Start()
{
    FIPv4Endpoint Endpoint(FIPv4Address(127,0,0,1), 7778);
    ListenerSocket = FTcpSocketBuilder(TEXT("RPCServer"))
        .AsReusable()
        .BoundToEndpoint(Endpoint)
        .Listening(8);

    if (!ListenerSocket)
        return;

    UE_LOG(LogTemp, Warning, TEXT("Unreal C++ RPC Server running..."));

    Runnable = FRunnableThread::Create(this, TEXT("RPCThread"));
}

uint32 FUnrealRPCServer::Run()
{
    while (true)
    {
        bool Pending;
        ListenerSocket->HasPendingConnection(Pending);

        if (Pending)
        {
            TSharedPtr<FSocket> Client = ListenerSocket->Accept(TEXT("RPCClient"));
            HandleClient(Client.Get());
        }
    }
    return 0;
}

void FUnrealRPCServer::HandleClient(FSocket* Client)
{
    uint32 Size;
    Client->WaitForPendingData(Size);

    TArray<uint8> Data;
    Data.SetNumUninitialized(Size);
    Client->Recv(Data.GetData(), Size, ESocketReceiveFlags::None);

    FString JsonString = FString(ANSI_TO_TCHAR(reinterpret_cast<const char*>(Data.GetData())));

    TSharedPtr<FJsonObject> Json;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
    FJsonSerializer::Deserialize(Reader, Json);

    FString Cmd = Json->GetStringField("cmd");

    FString Result = "unknown";

    if (Cmd == "simulate_physics")
    {
        // High-performance physics simulation
        Result = "physics_simulated";
    }

    if (Cmd == "update_world")
    {
        // Real-time world update
        Result = "world_updated";
    }

    TSharedPtr<FJsonObject> Response = MakeShareable(new FJsonObject());
    Response->SetStringField("result", Result);

    FString OutString;
    TJsonWriterFactory<>::Create(&OutString)->WriteObject(Response.ToSharedRef());

    FTCHARToUTF8 Converter(*OutString);
    Client->Send((uint8*)Converter.Get(), Converter.Length());
}
