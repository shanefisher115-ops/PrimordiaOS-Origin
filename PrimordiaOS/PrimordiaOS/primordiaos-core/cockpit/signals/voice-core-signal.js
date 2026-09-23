/**
 * PrimordiaOS — Voice Core Signal Matrix Integration
 * Path: primordiaos-core/cockpit/signals/voice-core-signal.js
 *
 * Integrates PRIMORDIA_VOICE_INTELLIGENCE_CORE into the Signal Matrix.
 * Exposes all six signal handlers and emitSignal for voice events.
 */

const AntigravityVoiceCore = require('../../backend/antigravity-voice-core');

let _voiceCore = null;
let _emitSignal = null;

const VOICE_SIGNAL_TYPES = {
  TTS_STARTED:       'VOICE_CORE::TTS_STARTED',
  TTS_COMPLETE:      'VOICE_CORE::TTS_COMPLETE',
  STT_STARTED:       'VOICE_CORE::STT_STARTED',
  STT_COMPLETE:      'VOICE_CORE::STT_COMPLETE',
  CLONE_COMPLETE:    'VOICE_CORE::CLONE_COMPLETE',
  EMOTION_DETECTED:  'VOICE_CORE::EMOTION_DETECTED',
  PIPELINE_STAGE:    'VOICE_CORE::PIPELINE_STAGE',
  PIPELINE_COMPLETE: 'VOICE_CORE::PIPELINE_COMPLETE',
  ERROR:             'VOICE_CORE::ERROR',
  VOICE_READY:       'VOICE_CORE::VOICE_READY',
};

/**
 * Initialize the Voice Core Signal module.
 * @param {object} deps - { voiceCore, emitSignal }
 */
function init(deps = {}) {
  _voiceCore = deps.voiceCore || new AntigravityVoiceCore();
  _emitSignal = deps.emitSignal || (() => {});
  _emitSignal(VOICE_SIGNAL_TYPES.VOICE_READY, {
    engine: _voiceCore.name,
    mode: _voiceCore.mode,
    vocoder: _voiceCore.capabilities.vocoder,
    voices: _voiceCore.getVoices(),
    timestamp: new Date().toISOString()
  });
  return _voiceCore;
}

/**
 * handleRealmSwitch — Triggered when the OS realm changes.
 * Adapts voice persona to match new realm identity.
 */
async function handleRealmSwitch(payload = {}) {
  const { realm } = payload;
  const voiceMap = {
    'DESKTOP':  'primordia_voice_hyperreal',
    'MOBILE':   'primordia_voice_clone',
    'CREATOR':  'antigravity_whisper',
    'TERMINAL': '21m00Tcm4TlvDq8ikWAM',
  };
  const voiceId = voiceMap[realm] || 'primordia_voice_hyperreal';
  const result = await _voiceCore.tts(
    `Realm switched to ${realm}. Primordia voice core synchronized.`,
    voiceId,
    { emotion: 'auto' }
  );
  emitSignal(VOICE_SIGNAL_TYPES.TTS_COMPLETE, { voiceId, realm, ...result });
  return result;
}

/**
 * handleModeSwitch — Triggered when the OS mode changes.
 * Adjusts prosody and emotion curve to match mode context.
 */
async function handleModeSwitch(payload = {}) {
  const { mode } = payload;
  const emotionMap = {
    'CREATE':    'sovereign_triumphant',
    'MONITOR':   'cosmic_serene',
    'ENGAGE':    'empathic_warm',
    'ALERT':     'intense_ignition',
  };
  const emotion = emotionMap[mode] || 'neutral';
  const result = await _voiceCore.tts(
    `Mode ${mode} activated.`,
    'primordia_voice_hyperreal',
    { emotion }
  );
  emitSignal(VOICE_SIGNAL_TYPES.EMOTION_DETECTED, { mode, emotion });
  emitSignal(VOICE_SIGNAL_TYPES.TTS_COMPLETE, result);
  return result;
}

/**
 * handleUIClick — Triggered by cockpit HUD button interactions.
 * Routes click intent to voice synthesis or STT activation.
 */
async function handleUIClick(payload = {}) {
  const { action, text, voiceId, emotion } = payload;
  if (action === 'SPEAK') {
    emitSignal(VOICE_SIGNAL_TYPES.TTS_STARTED, { text });
    const result = await _voiceCore.tts(text, voiceId || 'primordia_voice_hyperreal', { emotion: emotion || 'auto' });
    emitSignal(VOICE_SIGNAL_TYPES.TTS_COMPLETE, result);
    return result;
  }
  if (action === 'LISTEN') {
    emitSignal(VOICE_SIGNAL_TYPES.STT_STARTED, {});
    return { status: 'listening', message: 'STT stream opened.' };
  }
  if (action === 'CLONE') {
    const result = await _voiceCore.cloneVoice(payload.samples || [], { enhance: true });
    emitSignal(VOICE_SIGNAL_TYPES.CLONE_COMPLETE, result);
    return result;
  }
  return { status: 'no_action', action };
}

/**
 * handleKeyPress — Triggered by keyboard shortcuts in the cockpit.
 */
async function handleKeyPress(payload = {}) {
  const { key, text } = payload;
  if (key === 'Space' && text) {
    return handleUIClick({ action: 'SPEAK', text });
  }
  if (key === 'KeyL') {
    return handleUIClick({ action: 'LISTEN' });
  }
  return { status: 'unhandled_key', key };
}

/**
 * handleAgentSignal — Triggered when another PrimordiaOS agent sends a voice directive.
 */
async function handleAgentSignal(payload = {}) {
  const { agentId, directive, text, voiceId } = payload;
  emitSignal(VOICE_SIGNAL_TYPES.TTS_STARTED, { agentId, directive });
  const result = await _voiceCore.processConversationalPipeline({
    text: text || directive,
    voiceId: voiceId || 'primordia_voice_hyperreal',
    emotion: 'auto'
  });
  emitSignal(VOICE_SIGNAL_TYPES.PIPELINE_COMPLETE, { agentId, ...result });
  return result;
}

/**
 * emitSignal — Broadcasts a named signal with payload to the Signal Matrix.
 */
function emitSignal(type, payload = {}) {
  if (typeof _emitSignal === 'function') {
    _emitSignal(type, { ...payload, source: 'voice-core-signal', timestamp: new Date().toISOString() });
  }
}

function getVoiceCore() {
  return _voiceCore;
}

module.exports = {
  init,
  handleRealmSwitch,
  handleModeSwitch,
  handleUIClick,
  handleKeyPress,
  handleAgentSignal,
  emitSignal,
  getVoiceCore,
  VOICE_SIGNAL_TYPES,
};
