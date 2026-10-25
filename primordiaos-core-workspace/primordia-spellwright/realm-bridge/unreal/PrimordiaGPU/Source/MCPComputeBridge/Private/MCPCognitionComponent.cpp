#include "MCPCognitionComponent.h"

#include "GameFramework/Actor.h"
#include "MCPComputeSubsystem.h"

UMCPCognitionComponent::UMCPCognitionComponent()
{
	PrimaryComponentTick.bCanEverTick = false; // results are pushed by the subsystem
}

void UMCPCognitionComponent::BeginPlay()
{
	Super::BeginPlay();
	if (UMCPComputeSubsystem* MCP = UMCPComputeSubsystem::Get(this))
	{
		MCP->RegisterAgent(this);
	}
}

void UMCPCognitionComponent::EndPlay(const EEndPlayReason::Type Reason)
{
	if (UMCPComputeSubsystem* MCP = UMCPComputeSubsystem::Get(this))
	{
		MCP->UnregisterAgent(this);
	}
	Super::EndPlay(Reason);
}

FMCPActorState UMCPCognitionComponent::MakeInitialState(const UMCPComputeSubsystem& MCP) const
{
	FMCPActorState S;
	S.PositionMeters = GetOwner() ? MCP.WorldToRealm(GetOwner()->GetActorLocation()) : FVector::ZeroVector;
	S.MaxSpeed = MaxSpeedMetersPerSecond;
	S.Energy = InitialEnergy;
	S.Curiosity = InitialCuriosity;
	S.Devotion = InitialDevotion;
	S.Archetype = Archetype;
	return S;
}

void UMCPCognitionComponent::ApplyResult(const FMCPActorResult& Result, const UMCPComputeSubsystem& MCP)
{
	const EMCPAction Previous = Action;
	LastResult = Result;
	Action = Result.Action;
	TargetLocation = MCP.RealmToWorld(Result.PositionMeters);
	if (bDriveOwner && GetOwner())
	{
		GetOwner()->SetActorLocation(TargetLocation);
	}
	if (Action != Previous)
	{
		OnDecision.Broadcast(Action, Result);
	}
}
