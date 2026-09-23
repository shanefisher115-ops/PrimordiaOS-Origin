/**
 * PrimordiaOS — Voice Core Agent
 * Path: primordiaos-core/agents/voice-core-agent.js
 *
 * Autonomous agent that manages voice cognition, synthesis, STT, and
 * personality continuity across PrimordiaOS realms and modes.
 */

const EventEmitter = require('events');
const voiceCoreSignal = require('../cockpit/signals/voice-core-signal');

const AGENT_ID = 'VOICE_CORE_AGENT';

const AGENT_STATES = {
  IDLE:          'IDLE',
  LISTENING:     'LISTENING',
  SYNTHESIZING:  'SYNTHESIZING',
  ROUTING:       'ROUTING',
  CLONING:       'CLONING',
  ERROR:         'ERROR',
};

class VoiceCoreAgent extends EventEmitter {
  constructor(deps = {}) {
    super();
    this.agentId    = AGENT_ID;
    this.state      = AGENT_STATES.IDLE;
    this.db         = deps.db         || null;
    this.eventBus   = deps.eventBus   || null;
    this.router     = deps.router     || null;
    this.rtBridge   = deps.rtBridge   || null;
    this.emitSignal = deps.emitSignal || (() => {});

    this.voiceCore = voiceCoreSignal.init({
      emitSignal: this.emitSignal
    });

    this.stats = {
      ttsCount:   0,
      sttCount:   0,
      cloneCount: 0,
      errorCount: 0,
      lastEmotion: 'cosmic_serene',
      lastVoiceId: 'primordia_voice_hyperreal',
      pipeline: [
        'audio_ingest',
        'speech_recognition',
        'semantic_parse',
        'cognition',
        'response_synthesis',
        'voice_render',
      ],
      activePipelineStage: null,
    };

    this._registerEventBusListeners();
  }

  _registerEventBusListeners() {
    if (!this.eventBus) return;

    this.eventBus.on('realm:switch',  (payload) => voiceCoreSignal.handleRealmSwitch(payload));
    this.eventBus.on('mode:switch',   (payload) => voiceCoreSignal.handleModeSwitch(payload));
    this.eventBus.on('ui:click',      (payload) => voiceCoreSignal.handleUIClick(payload));
    this.eventBus.on('key:press',     (payload) => voiceCoreSignal.handleKeyPress(payload));
    this.eventBus.on('agent:signal',  (payload) => {
      if (payload.target === AGENT_ID || payload.target === '*') {
        voiceCoreSignal.handleAgentSignal(payload);
      }
    });

    this.eventBus.on('VOICE_CORE::TTS_COMPLETE', (result) => {
      this.stats.ttsCount++;
      this.stats.lastEmotion = result.emotion || this.stats.lastEmotion;
      this.stats.lastVoiceId = result.voiceId || this.stats.lastVoiceId;
      this.state = AGENT_STATES.IDLE;
      this.emit('state:change', this.getStatus());
    });

    this.eventBus.on('VOICE_CORE::STT_COMPLETE', () => {
      this.stats.sttCount++;
      this.state = AGENT_STATES.IDLE;
      this.emit('state:change', this.getStatus());
    });
  }

  /**
   * Synthesize speech from text. Used by Command Router.
   */
  async speak(text, voiceId, emotion = 'auto') {
    this.state = AGENT_STATES.SYNTHESIZING;
    this.emit('state:change', this.getStatus());
    const result = await voiceCoreSignal.handleUIClick({
      action: 'SPEAK',
      text,
      voiceId: voiceId || this.stats.lastVoiceId,
      emotion
    });
    this.stats.ttsCount++;
    this.state = AGENT_STATES.IDLE;
    this.emit('state:change', this.getStatus());
    return result;
  }

  /**
   * Run full 6-stage conversational pipeline.
   */
  async route(input = {}) {
    this.state = AGENT_STATES.ROUTING;
    this.emit('state:change', this.getStatus());

    for (const stage of this.stats.pipeline) {
      this.stats.activePipelineStage = stage;
      this.emit('pipeline:stage', { stage });
      this.emitSignal('VOICE_CORE::PIPELINE_STAGE', { stage });
    }

    const result = await this.voiceCore.processConversationalPipeline({
      text:    input.text,
      audio:   input.audio,
      voiceId: input.voiceId || this.stats.lastVoiceId,
      emotion: input.emotion || 'auto',
      context: input.context
    });

    this.stats.activePipelineStage = null;
    this.state = AGENT_STATES.IDLE;
    this.emit('state:change', this.getStatus());
    return result;
  }

  /**
   * Clone or reconstruct a voice model.
   */
  async clone(samples = [], options = {}) {
    this.state = AGENT_STATES.CLONING;
    this.emit('state:change', this.getStatus());
    const result = await this.voiceCore.cloneVoice(samples, { enhance: true, ...options });
    this.stats.cloneCount++;
    this.state = AGENT_STATES.IDLE;
    this.emit('state:change', this.getStatus());
    return result;
  }

  /**
   * Returns live agent status snapshot for HUD binding.
   */
  getStatus() {
    return {
      agentId:      this.agentId,
      state:        this.state,
      stats:        { ...this.stats },
      voices:       this.voiceCore.getVoices(),
      capabilities: this.voiceCore.capabilities,
      enhancements: this.voiceCore.enhancements,
      personality:  this.voiceCore.personalityState,
      restEndpoint: 'http://localhost:31337',
      timestamp:    new Date().toISOString(),
    };
  }

  destroy() {
    this.voiceCore.stopServer();
    this.removeAllListeners();
  }
}

module.exports = {
  VoiceCoreAgent,
  AGENT_ID,
  AGENT_STATES,
};
