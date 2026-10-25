// Kokoro-82M text-to-speech (Apache-2.0), running locally on the ONNX runtime.
// kokoro-js is an optional dependency: loaded lazily, so the bridge runs without it.
import { fileURLToPath } from 'node:url';

export const DEFAULT_VOICE = 'af_heart';
export const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const CACHE_DIR = fileURLToPath(new URL('../../.cache/models/', import.meta.url));

/** Float32 [-1, 1] -> little-endian 16-bit PCM bytes. */
export function floatToPcm16(samples) {
  const out = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), i * 2);
  }
  return out;
}

/**
 * Speech is synthesized one sentence at a time, so playback can start after the
 * first sentence instead of after the whole reply.
 * Splits after . ! ? (or ; : when a fragment gets long), keeping abbreviations like "e.g." together.
 */
export function splitSentences(text) {
  const out = [];
  let current = '';
  for (const part of text.split(/(?<=[.!?…])\s+|(?<=[;:])\s+(?=\S{0,}\s)/)) {
    current = current ? `${current} ${part}` : part;
    if (current.length >= 12 || /[.!?…]$/.test(current)) {
      out.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

/**
 * Incrementally finds complete sentences in text that is still arriving (LLM tokens).
 * push(fullTextSoFar) returns the newly completed sentences; flush() returns the rest.
 */
export function createSentenceStream() {
  let emitted = 0; // characters of the text already handed out
  let last = '';
  return {
    push(text) {
      last = text;
      const pending = text.slice(emitted);
      // A sentence is complete once its terminator is followed by whitespace.
      const re = /[.!?…]+["')\]]?\s+/g;
      let end = -1;
      let m;
      while ((m = re.exec(pending))) end = m.index + m[0].length;
      if (end < 0) return [];
      emitted += end;
      return splitSentences(pending.slice(0, end));
    },
    flush() {
      const rest = last.slice(emitted).trim();
      emitted = last.length;
      return rest ? [rest] : [];
    },
  };
}

let modulePromise = null;
async function loadKokoro() {
  modulePromise ??= (async () => {
    try {
      const transformers = await import('@huggingface/transformers');
      transformers.env.cacheDir = CACHE_DIR;
      const kokoro = await import('kokoro-js');
      return kokoro;
    } catch (err) {
      modulePromise = null;
      throw new Error(`Kokoro TTS is not installed (npm install kokoro-js): ${err.message}`);
    }
  })();
  return modulePromise;
}

/**
 * @returns {Promise<{ voice: string, sampleRate: number,
 *   synthesize(text: string, voice?: string): Promise<{ samples: Float32Array, sampleRate: number }>,
 *   listVoices(): string[] }>}
 */
// fp32 is the default: measured on a 4-core Ryzen 3 4300U it ran at 0.87x real time,
// while q8 ran at 3.35x (int8 kernels are slow on that CPU). q8 uses ~270 MB less RAM.
export async function createTTS({ dtype = 'fp32', voice = DEFAULT_VOICE } = {}) {
  const { KokoroTTS } = await loadKokoro();
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype, device: 'cpu' });
  // ONNX inference must not overlap on one session: serialize synthesis calls.
  let queue = Promise.resolve();
  return {
    voice,
    sampleRate: 24000,
    listVoices: () => Object.keys(tts.voices ?? {}),
    synthesize(text, v = voice) {
      const job = queue.then(async () => {
        const audio = await tts.generate(text, { voice: v });
        return { samples: audio.audio, sampleRate: audio.sampling_rate };
      });
      queue = job.catch(() => {});
      return job;
    },
  };
}
