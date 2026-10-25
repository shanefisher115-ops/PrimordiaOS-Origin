// Turns sentences into `voice` packets: synthesizes them one at a time, in order,
// and streams 16-bit PCM in ~0.5 s chunks so Unreal can start playing early.
import { floatToPcm16 } from './tts.js';

const CHUNK_BYTES = 24000; // 0.5 s of 24 kHz mono s16le

/**
 * @param getTts   () => Promise<tts>  (lazy; the model loads on first use)
 * @param emit     (packet) => void    broadcasts a { type:'voice', id, payload } packet
 */
export function createSpeaker({ getTts, emit, log = () => {} }) {
  let nextUtterance = 1;

  return {
    /**
     * Starts an utterance. Call say(sentence) any number of times (sentences may
     * still be arriving from the LLM), then end(). Synthesis is sequential, so
     * audio always plays in order.
     */
    /**
     * spatial:false marks a narrator heard everywhere (Unreal skips attenuation).
     * onPcm(pcm, sampleRate) sees every synthesized sentence (the Sovereign keeps a WAV).
     */
    begin({ speaker = 'soul', position = [0, 0, 14], voice, spatial = true, onPcm } = {}) {
      const utterance = nextUtterance++;
      const started = performance.now();
      let chunk = 0;
      let chain = Promise.resolve();
      let firstAudioMs = null;
      let audioSeconds = 0;
      let synthSeconds = 0;
      let error = null;
      const id = `voice:${speaker}`;

      const send = (payload) => emit({ type: 'voice', id, payload: { utterance, chunk: chunk++, position, ...(spatial ? {} : { spatial: false }), ...payload } });

      return {
        utterance,
        say(sentence) {
          const text = sentence.trim();
          if (!text) return;
          chain = chain.then(async () => {
            if (error) return;
            try {
              const tts = await getTts();
              const t = performance.now();
              const { samples, sampleRate } = await tts.synthesize(text, voice);
              synthSeconds += (performance.now() - t) / 1000;
              audioSeconds += samples.length / sampleRate;
              const pcm = floatToPcm16(samples);
              firstAudioMs ??= performance.now() - started;
              onPcm?.(pcm, sampleRate);
              for (let off = 0; off < pcm.length; off += CHUNK_BYTES) {
                send({
                  text: off === 0 ? text : '',
                  sample_rate: sampleRate,
                  channels: 1,
                  format: 's16le',
                  pcm: pcm.subarray(off, off + CHUNK_BYTES).toString('base64'),
                  final: false,
                });
              }
            } catch (err) {
              error = err;
              log(`[voice] synthesis failed: ${err.message}`);
            }
          });
        },
        /** Resolves once every sentence has been synthesized and sent. */
        async end() {
          await chain;
          send({ text: '', sample_rate: 24000, channels: 1, format: 's16le', pcm: '', final: true });
          if (error) throw error;
          return {
            utterance,
            audioSeconds: Math.round(audioSeconds * 100) / 100,
            synthSeconds: Math.round(synthSeconds * 100) / 100,
            firstAudioSeconds: firstAudioMs === null ? null : Math.round(firstAudioMs / 100) / 10,
          };
        },
      };
    },
  };
}
