#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "PrimordiaVoiceActor.generated.h"

class UAudioComponent;
class USoundWaveProcedural;
class USoundAttenuation;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FPrimordiaSentenceEvent, const FString&, Sentence);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FPrimordiaSpeechFinishedEvent);

/**
 * voice -> spatialized speech. One actor per speaker ("voice:soul"), placed at
 * the packet's position (realm-local, e.g. the soul glyph). 16-bit PCM chunks
 * from the bridge's Kokoro TTS are queued into a USoundWaveProcedural, which an
 * attenuated UAudioComponent plays in 3D. Text arrives with each sentence for
 * subtitles.
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API APrimordiaVoiceActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	APrimordiaVoiceActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;
	/**
	 * Busy while audio is queued, and while an utterance is still arriving: between two
	 * sentences the queue can run dry for longer than the entity timeout while Kokoro
	 * synthesizes the next one. A stream that stops without its final chunk frees the
	 * actor after UtteranceStallSeconds.
	 */
	virtual bool IsBusy() const override;

	/** Stops speaking and drops queued audio. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Voice")
	void StopSpeaking();

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Voice")
	bool IsSpeaking() const { return bAudioQueued || !bUtteranceEnded; }

	/** A new sentence started (use for subtitles). */
	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Voice") FPrimordiaSentenceEvent OnSentence;
	/** The utterance's last audio has finished playing. */
	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Voice") FPrimordiaSpeechFinishedEvent OnFinishedSpeaking;

	/** A new utterance cuts off whatever is still playing (otherwise it queues behind it). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Voice")
	bool bInterruptOnNewUtterance = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Voice", meta = (ClampMin = 0))
	float Volume = 1.f;

	/** Optional attenuation asset; otherwise: full volume within 4 m, silent beyond 60 m. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Voice")
	TObjectPtr<USoundAttenuation> Attenuation;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Voice") FString CurrentSentence;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Voice") int32 CurrentUtterance = 0;
	/** False while the speaker is a narrator heard everywhere (voice packets with "spatial": false). */
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Voice") bool bSpatial = true;

protected:
	virtual void BeginPlay() override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Voice")
	TObjectPtr<UAudioComponent> Speaker;

	UPROPERTY(Transient)
	TObjectPtr<USoundWaveProcedural> Wave;

private:
	void EnsureWave(int32 SampleRate);
	void ApplyAttenuation();

	int32 WaveSampleRate = 0;
	double LastChunkTime = 0.0;
	static constexpr double UtteranceStallSeconds = 30.0;
	bool bAudioQueued = false;
	bool bUtteranceEnded = true;
	bool bFinishedBroadcast = true;
	TArray<uint8> Decoded;
};
