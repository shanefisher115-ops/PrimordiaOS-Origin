#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"
#include "PrimordiaTypes.generated.h"

PRIMORDIAOSREALMBRIDGE_API DECLARE_LOG_CATEGORY_EXTERN(LogPrimordia, Log, All);

/** Wire packet types (PRS-1 §2). Keep in sync with node-bridge/src/schemas.js. */
UENUM(BlueprintType)
enum class EPrimordiaPacketType : uint8
{
	Unknown,
	Hello,
	HeartBeat        UMETA(DisplayName = "heart_beat"),
	CosmicWeb        UMETA(DisplayName = "cosmic_web"),
	FateWeave        UMETA(DisplayName = "fate_weave"),
	SoulUnification  UMETA(DisplayName = "soul_unification"),
	DreamNebula      UMETA(DisplayName = "dream_nebula"),
	ShadowInversion  UMETA(DisplayName = "shadow_inversion"),
	RealmManifest    UMETA(DisplayName = "realm_manifest"),
	Ack,
	Pong,
	/** Streamed speech for a speaker entity ("voice:<speaker>"); see APrimordiaVoiceActor. */
	Voice            UMETA(DisplayName = "voice"),
};

UENUM(BlueprintType)
enum class EPrimordiaPacketOp : uint8
{
	Upsert,
	Retire,
};

UENUM(BlueprintType)
enum class EPrimordiaConnectionState : uint8
{
	Disconnected,
	Connecting,
	Connected,
	WaitingToReconnect,
};

namespace PrimordiaPacketType
{
	PRIMORDIAOSREALMBRIDGE_API EPrimordiaPacketType FromString(const FString& Name);
	PRIMORDIAOSREALMBRIDGE_API FString ToString(EPrimordiaPacketType Type);
	/** Streams that describe a visual entity (spawned by the actor factory). */
	PRIMORDIAOSREALMBRIDGE_API bool IsVisual(EPrimordiaPacketType Type);
	/** Continuous streams where only the newest packet per entity matters. */
	PRIMORDIAOSREALMBRIDGE_API bool IsCoalescible(EPrimordiaPacketType Type);
}

/** A parsed PRS-1 envelope. Native only: the payload stays a JSON DOM. */
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaPacket
{
	EPrimordiaPacketType Type = EPrimordiaPacketType::Unknown;
	FString TypeName;
	EPrimordiaPacketOp Op = EPrimordiaPacketOp::Upsert;
	FString EntityId;
	FString RealmId;
	int64 Seq = 0;
	double SimTime = 0.0;
	int64 TimestampMs = 0;
	double ReceivedAt = 0.0;
	TSharedPtr<FJsonObject> Payload;

	/** "<type>/<id>" — the actor factory's registry key. */
	FString EntityKey() const { return TypeName + TEXT("/") + EntityId; }

	static bool Parse(const FString& Text, FPrimordiaPacket& Out, FString& OutError);
};

/** Blueprint-visible summary of a packet (the payload travels as UPrimordiaPayload). */
USTRUCT(BlueprintType)
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaPacketInfo
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") EPrimordiaPacketType Type = EPrimordiaPacketType::Unknown;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") FString TypeName;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") EPrimordiaPacketOp Op = EPrimordiaPacketOp::Upsert;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") FString EntityId;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") FString RealmId;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int64 Seq = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") double SimTime = 0.0;

	static FPrimordiaPacketInfo From(const FPrimordiaPacket& Packet);
};

USTRUCT(BlueprintType)
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaBridgeStats
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int64 MessagesReceived = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int64 PacketsApplied = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int64 PacketsCoalesced = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int64 ParseErrors = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int64 LastSeq = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int32 LiveEntities = 0;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") int32 QueuedMessages = 0;
	/** Wall-clock age of the newest packet when applied (localhost: clock skew is ~0). */
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS") float LatencyMs = 0.f;
};

// ---------------------------------------------------------------------------
// PRS-1 realm manifest (docs/PRS-1.md §3). Units here are already converted:
// positions/radii in Unreal units (cm), colors linear.
// ---------------------------------------------------------------------------

USTRUCT(BlueprintType)
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaRealmLayer
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FString Id;
	/** ground | ocean | sky | ring | lattice | void | spire_field */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FName Kind;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") int32 Order = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Altitude = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Radius = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS", meta = (ClampMin = 0, ClampMax = 1)) float Density = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") TArray<FLinearColor> Palette;
	/** Numeric kind-specific parameters (star_count, tilt_deg, ...). Lengths already in cm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") TMap<FString, float> Params;

	float Param(const TCHAR* Name, float Default) const
	{
		const float* Found = Params.Find(Name);
		return Found ? *Found : Default;
	}
	/** Structural signature: changes force a rebuild; density alone only adjusts instance count. */
	uint32 StructuralHash() const;
};

USTRUCT(BlueprintType)
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaMetaphysics
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Entropy = 0.35f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Luminosity = 0.7f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Coherence = 0.6f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Resonance = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Inversion = 0.2f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Lucidity = 0.55f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float TimeDilation = 1.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FLinearColor Essence = FLinearColor(1.f, 0.42f, 0.28f);

	static FPrimordiaMetaphysics Lerp(const FPrimordiaMetaphysics& A, const FPrimordiaMetaphysics& B, float Alpha);
};

USTRUCT(BlueprintType)
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaTopologySpec
{
	GENERATED_BODY()

	/** lattice | small_world | scale_free | toroidal | fractal_tree */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FName Kind = TEXT("small_world");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") int32 NodeCount = 48;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float EdgeDensity = 0.5f;
	/** Meters, as on the wire: topology synthesis must match the Node bridge bit-for-bit. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float RadiusMeters = 18.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FVector CenterMeters = FVector(0, 0, 22);

	bool operator==(const FPrimordiaTopologySpec& O) const
	{
		return Kind == O.Kind && NodeCount == O.NodeCount && EdgeDensity == O.EdgeDensity && RadiusMeters == O.RadiusMeters && CenterMeters == O.CenterMeters;
	}
};

USTRUCT(BlueprintType)
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaGlyphSpec
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FString Id;
	/** soul | sigil | ward | gate */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FName Kind = TEXT("sigil");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FVector Position = FVector::ZeroVector;
	/** Diameter in cm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Scale = 300.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") int32 Symmetry = 6;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Complexity = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float Hue = 0.6f;
	/** Live stream entity this glyph is bound to (e.g. "soul" -> soul_unification/soul). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FString BoundTo;
	/** What the glyph is for ("GUARD THE DREAM OF LUMENNE"); inscribed into its shape. Empty = use Id. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FString Intent;
};

USTRUCT(BlueprintType)
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaRealmManifest
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FString Prs = TEXT("1.0");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FString RealmId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FString RealmName;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") int64 Seed = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") int32 Revision = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float TransitionSeconds = 4.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") float BoundsRadius = 12000.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") TArray<FPrimordiaRealmLayer> Layers;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FPrimordiaMetaphysics Metaphysics;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") FPrimordiaTopologySpec Topology;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS") TArray<FPrimordiaGlyphSpec> Glyphs;
	/** The manifest exactly as received, for re-generation after load. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS", meta = (MultiLine = true)) FString SourceJson;

	bool IsValid() const { return !RealmId.IsEmpty() && Layers.Num() > 0; }

	/** Parses and validates a PRS-1 manifest object. UnitsPerMeter converts lengths. */
	static bool FromJson(const TSharedPtr<FJsonObject>& Json, float UnitsPerMeter, FPrimordiaRealmManifest& Out, FString& OutError);
	static bool FromJsonString(const FString& Text, float UnitsPerMeter, FPrimordiaRealmManifest& Out, FString& OutError);
};
