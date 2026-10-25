#include "PrimordiaExplorer.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Engine/Engine.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"

APrimordiaExplorer::APrimordiaExplorer()
{
	PrimaryActorTick.bCanEverTick = true;
	GetCapsuleComponent()->InitCapsuleSize(34.f, 88.f);

	Eyes = CreateDefaultSubobject<UCameraComponent>(TEXT("Eyes"));
	Eyes->SetupAttachment(GetCapsuleComponent());
	Eyes->SetRelativeLocation(FVector(0.f, 0.f, 64.f)); // eye height: 1.52 m above the feet
	Eyes->bUsePawnControlRotation = true;
	Eyes->SetFieldOfView(85.f);

	bUseControllerRotationYaw = true;
	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->MaxWalkSpeed = WalkSpeed;
	Move->JumpZVelocity = 620.f;
	Move->AirControl = 0.6f;
	Move->MaxFlySpeed = FlySpeed;
	Move->BrakingDecelerationFlying = 4000.f;
	Move->MaxStepHeight = 60.f;
	Move->SetWalkableFloorAngle(50.f);
}

void APrimordiaExplorer::BeginPlay()
{
	Super::BeginPlay();
	Start = GetActorTransform();
	if (GEngine)
	{
		GEngine->AddOnScreenDebugMessage(-1, 12.f, FColor(255, 220, 170),
			TEXT("WASD move  |  mouse look  |  Space jump  |  Shift sprint  |  F fly (Space up, C down)"));
	}
}

void APrimordiaExplorer::SetFlying(bool bFly)
{
	bFlying = bFly;
	GetCharacterMovement()->SetMovementMode(bFly ? MOVE_Flying : MOVE_Falling);
}

void APrimordiaExplorer::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	APlayerController* PC = Cast<APlayerController>(GetController());
	if (!PC)
	{
		return;
	}

	float Dx = 0.f, Dy = 0.f;
	PC->GetInputMouseDelta(Dx, Dy);
	AddControllerYawInput(Dx * MouseSensitivity);
	AddControllerPitchInput(-Dy * MouseSensitivity);

	const bool bSprint = PC->IsInputKeyDown(EKeys::LeftShift) || PC->IsInputKeyDown(EKeys::RightShift);
	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->MaxWalkSpeed = WalkSpeed * (bSprint ? SprintMultiplier : 1.f);
	Move->MaxFlySpeed = FlySpeed * (bSprint ? SprintMultiplier : 1.f);

	const FRotator Yaw(0.f, GetControlRotation().Yaw, 0.f);
	// Flying moves where you look; walking stays level.
	const FVector Forward = bFlying ? GetControlRotation().Vector() : FRotationMatrix(Yaw).GetUnitAxis(EAxis::X);
	const FVector Right = FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y);
	const float F = (PC->IsInputKeyDown(EKeys::W) ? 1.f : 0.f) - (PC->IsInputKeyDown(EKeys::S) ? 1.f : 0.f);
	const float R = (PC->IsInputKeyDown(EKeys::D) ? 1.f : 0.f) - (PC->IsInputKeyDown(EKeys::A) ? 1.f : 0.f);
	AddMovementInput(Forward, F);
	AddMovementInput(Right, R);

	if (PC->WasInputKeyJustPressed(EKeys::F))
	{
		SetFlying(!bFlying);
	}
	if (bFlying)
	{
		const float U = (PC->IsInputKeyDown(EKeys::SpaceBar) ? 1.f : 0.f) - (PC->IsInputKeyDown(EKeys::C) ? 1.f : 0.f);
		AddMovementInput(FVector::UpVector, U);
	}
	else if (PC->WasInputKeyJustPressed(EKeys::SpaceBar))
	{
		Jump();
	}

	if (GetActorLocation().Z < Start.GetLocation().Z - FallLimit)
	{
		// Fell off the floating realm: back to the start, at rest.
		Move->StopMovementImmediately();
		SetActorTransform(Start, false, nullptr, ETeleportType::TeleportPhysics);
		PC->SetControlRotation(Start.Rotator());
	}
}

APrimordiaExplorerGameMode::APrimordiaExplorerGameMode()
{
	DefaultPawnClass = APrimordiaExplorer::StaticClass();
}
