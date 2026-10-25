#include "Actors/PrimordiaVoiceActor.h"
#include "PrimordiaJson.h"
#include "Components/AudioComponent.h"
#include "Misc/Base64.h"
#include "Sound/SoundAttenuation.h"
#include "Sound/SoundGroups.h"
#include "Sound/SoundWaveProcedural.h"

APrimordiaVoiceActor::APrimordiaVoiceActor()
{
	Speaker = CreateDefaultSubobject<UAudioComponent>(TEXT("Speaker"));
	Speaker->SetupAttachment(SceneRoot);
	Speaker->bAutoActivate = false;
	Speaker->bAllowSpatialization = true;
	RetireFadeSeconds = 0.5f;
}

void APrimordiaVoiceActor::BeginPlay()
{
	Super::BeginPlay();
	ApplyAttenuation();
}

void APrimordiaVoiceActor::ApplyAttenuation()
{
	if (Attenuation)
	{
		Speaker->AttenuationSettings = Attenuation;
		Speaker->bOverrideAttenuation = false;
		return;
	}
	// A voice should carry across a scene but still be located: full volume within
	// 4 m of the speaker, fading out by 60 m.
	FSoundAttenuationSettings& A = Speaker->AttenuationOverrides;
	A.bAttenuate = true;
	A.bSpatialize = true;
	A.AttenuationShape = EAttenuationShape::Sphere;
	A.AttenuationShapeExtents = FVector(UnitsPerMeter() * 4.f, 0.f, 0.f);
	A.FalloffDistance = UnitsPerMeter() * 56.f;
	Speaker->bOverrideAttenuation = true;
}

void APrimordiaVoiceActor::EnsureWave(int32 SampleRate)
{
	if (Wave && WaveSampleRate == SampleRate)
	{
		return;
	}
	Wave = NewObject<USoundWaveProcedural>(this);
	Wave->SetSampleRate(SampleRate);
	Wave->NumChannels = 1;
	Wave->Duration = INDEFINITELY_LOOPING_DURATION; // a stream: plays silence while waiting for chunks
	Wave->SoundGroup = SOUNDGROUP_Voice;
	Wave->bLooping = false;
	WaveSampleRate = SampleRate;

	ApplyAttenuation();
	Speaker->SetSound(Wave);
	Speaker->SetVolumeMultiplier(Volume * RetireAlpha);
	Speaker->Play();
}

void APrimordiaVoiceActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	SetTargetLocation(Vec(P, TEXT("position"), FVector::ZeroVector, UnitsPerMeter()), !bHasReceivedPacket);

	const int32 Utterance = Int(P, TEXT("utterance"), 0);
	EnsureWave(Int(P, TEXT("sample_rate"), 24000));
	if (Utterance != CurrentUtterance)
	{
		if (bInterruptOnNewUtterance)
		{
			Wave->ResetAudio();
		}
		CurrentUtterance = Utterance;
		bUtteranceEnded = false;
		bFinishedBroadcast = false;
	}

	const FString Text = Str(P, TEXT("text"));
	if (!Text.IsEmpty())
	{
		CurrentSentence = Text;
		OnSentence.Broadcast(Text);
	}

	const FString Pcm = Str(P, TEXT("pcm"));
	if (!Pcm.IsEmpty() && FBase64::Decode(Pcm, Decoded) && Decoded.Num() > 0)
	{
		// s16le mono: an odd byte count would misalign every later sample.
		Wave->QueueAudio(Decoded.GetData(), Decoded.Num() & ~1);
		bAudioQueued = true;
	}
	if (Bool(P, TEXT("final")))
	{
		bUtteranceEnded = true;
	}
}

void APrimordiaVoiceActor::StopSpeaking()
{
	if (Wave)
	{
		Wave->ResetAudio();
	}
	bAudioQueued = false;
	bUtteranceEnded = true;
}

void APrimordiaVoiceActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!Wave)
	{
		return;
	}
	bAudioQueued = Wave->GetAvailableAudioByteCount() > 0;
	if (bUtteranceEnded && !bAudioQueued && !bFinishedBroadcast)
	{
		bFinishedBroadcast = true;
		CurrentSentence.Reset();
		OnFinishedSpeaking.Broadcast();
	}
}

void APrimordiaVoiceActor::UpdateRetireFade(float Alpha)
{
	if (Speaker)
	{
		Speaker->SetVolumeMultiplier(Volume * Alpha);
	}
}
