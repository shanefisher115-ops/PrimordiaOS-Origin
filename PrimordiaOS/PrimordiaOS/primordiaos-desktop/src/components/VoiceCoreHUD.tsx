'use client';

/**
 * PrimordiaOS — Voice Core HUD (Desktop)
 * Path: primordiaos-desktop/src/components/VoiceCoreHUD.tsx
 *
 * Full-screen cockpit-style Voice Intelligence HUD for PrimordiaOS Desktop.
 * Binds to Signal Matrix, EventBus, Command Router, and Runtime Bridge.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  bindRealm,
  bindMode,
  bindClick,
  bindAgent,
  bindSignal,
} from '@/cockpit/bindings';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceProfile {
  voice_id: string;
  name: string;
  accuracy: string;
  resolution: string;
  vocoder: string;
}

interface PipelineStage {
  id: string;
  label: string;
  active: boolean;
  complete: boolean;
}

interface AgentStatus {
  agentId: string;
  state: string;
  stats: {
    ttsCount: number;
    sttCount: number;
    cloneCount: number;
    lastEmotion: string;
    lastVoiceId: string;
    pipeline: string[];
    activePipelineStage: string | null;
  };
  voices: VoiceProfile[];
  capabilities: Record<string, string>;
  enhancements: Record<string, string>;
  personality: {
    currentEmotion: string;
    emotionalCoherenceScore: number;
    dialogueTurnCount: number;
  };
  restEndpoint: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMERALD  = '#1bffb8';
const VIOLET   = '#b400ff';
const GOLD     = '#ffd86b';
const BG_DEEP  = '#04060f';

const PIPELINE_LABELS: Record<string, string> = {
  audio_ingest:       'AUDIO INGEST',
  speech_recognition: 'SPEECH RECOGNITION',
  semantic_parse:     'SEMANTIC PARSE',
  cognition:          'COGNITION',
  response_synthesis: 'RESPONSE SYNTHESIS',
  voice_render:       'VOICE RENDER',
};

const EMOTION_COLORS: Record<string, string> = {
  sovereign_triumphant: GOLD,
  cosmic_serene:        EMERALD,
  empathic_warm:        '#ff9f5a',
  intense_ignition:     VIOLET,
  neutral:              '#8899bb',
};

// ─── Waveform Canvas Component ────────────────────────────────────────────────

function WaveformCanvas({ active, emotion }: { active: boolean; emotion: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const phaseRef  = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = EMOTION_COLORS[emotion] || EMERALD;
    const W = canvas.width;
    const H = canvas.height;
    const amp = active ? 28 : 6;

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.beginPath();
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 1.8;
      ctx!.shadowColor = color;
      ctx!.shadowBlur = active ? 12 : 4;

      for (let x = 0; x < W; x++) {
        const t = x / W;
        const y =
          H / 2 +
          Math.sin(t * 14 * Math.PI + phaseRef.current) * amp * Math.sin(t * Math.PI) +
          Math.sin(t * 30 * Math.PI + phaseRef.current * 1.7) * (amp * 0.4);
        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();
      phaseRef.current += active ? 0.08 : 0.015;
      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, emotion]);

  return (
    <canvas
      ref={canvasRef}
      width={440}
      height={64}
      style={{ width: '100%', height: 64, display: 'block' }}
    />
  );
}

// ─── Main HUD Component ───────────────────────────────────────────────────────

export default function VoiceCoreHUD() {
  const [status, setStatus]           = useState<AgentStatus | null>(null);
  const [inputText, setInputText]     = useState('');
  const [selectedVoice, setVoice]     = useState('primordia_voice_hyperreal');
  const [emotion, setEmotion]         = useState('auto');
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastResult, setLastResult]   = useState<{ audio?: string; emotion?: string; latencyMs?: number } | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Signal Matrix bindings ──────────────────────────────────────────────────

  useEffect(() => {
    bindRealm('VOICE_CORE_HUD', (realm: string) => {
      window.primordiaAPI?.voiceCore?.route({ text: `Realm ${realm} activated.` });
    });

    bindMode('VOICE_CORE_HUD', (mode: string) => {
      window.primordiaAPI?.voiceCore?.route({ text: `Mode ${mode} engaged.` });
    });

    bindSignal('VOICE_CORE::PIPELINE_STAGE', (payload: { stage: string }) => {
      setActiveStage(payload.stage);
    });

    bindSignal('VOICE_CORE::TTS_COMPLETE', (result: typeof lastResult) => {
      setLastResult(result);
      setIsSpeaking(false);
      setActiveStage(null);
    });

    bindSignal('VOICE_CORE::STT_COMPLETE', (result: { text: string }) => {
      setInputText(result.text);
      setIsListening(false);
    });

    bindAgent('VOICE_CORE_AGENT', (agentStatus: AgentStatus) => {
      setStatus(agentStatus);
    });
  }, []);

  // ── Fetch agent status on mount ─────────────────────────────────────────────

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('http://localhost:31337/voices');
        const data = await res.json();
        setStatus((prev) => ({
          ...(prev || {} as AgentStatus),
          voices: data.voices || [],
        }));
      } catch {
        // REST server may not be running in SSR context — gracefully silent
      }
    }
    fetchStatus();
  }, []);

  // ── TTS handler ─────────────────────────────────────────────────────────────

  const handleSpeak = useCallback(async () => {
    if (!inputText.trim()) return;
    setError(null);
    setIsSpeaking(true);
    setActiveStage('response_synthesis');

    try {
      const result = await (window as any).primordiaAPI?.voiceCore?.tts(
        inputText, selectedVoice, { emotion: emotion === 'auto' ? 'auto' : emotion }
      );

      if (result?.audioBase64) {
        const blob = new Blob(
          [Uint8Array.from(atob(result.audioBase64), (c) => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(blob);
          audioRef.current.play();
        }
        setLastResult(result);
      }

      bindClick('VOICE_CORE_HUD', 'SPEAK', { text: inputText, voiceId: selectedVoice, emotion });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSpeaking(false);
      setActiveStage(null);
    }
  }, [inputText, selectedVoice, emotion]);

  // ── STT handler ─────────────────────────────────────────────────────────────

  const handleListen = useCallback(async () => {
    setIsListening(true);
    bindClick('VOICE_CORE_HUD', 'LISTEN', {});
    setTimeout(() => setIsListening(false), 4000);
  }, []);

  // ── Clone handler ────────────────────────────────────────────────────────────

  const handleClone = useCallback(async () => {
    setError(null);
    try {
      const result = await (window as any).primordiaAPI?.voiceCore?.clone([], { enhance: true });
      bindClick('VOICE_CORE_HUD', 'CLONE', result);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // ── Pipeline display ─────────────────────────────────────────────────────────

  const pipelineStages: PipelineStage[] = (
    status?.stats.pipeline || [
      'audio_ingest','speech_recognition','semantic_parse',
      'cognition','response_synthesis','voice_render'
    ]
  ).map((id) => ({
    id,
    label: PIPELINE_LABELS[id] || id.toUpperCase(),
    active: activeStage === id,
    complete: false,
  }));

  const currentEmotion = status?.personality?.currentEmotion || 'cosmic_serene';
  const emotionColor   = EMOTION_COLORS[currentEmotion] || EMERALD;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.shell}>
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.coreOrb, boxShadow: `0 0 28px ${emotionColor}88` }} />
          <div>
            <div style={styles.hudTitle}>VOICE INTELLIGENCE CORE</div>
            <div style={styles.hudSub}>
              PRIMORDIA_VOICE_INTELLIGENCE_CORE &nbsp;·&nbsp; hyperreal_neural_vocoder_v4
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <StatusPill label="ENGINE" value="ONLINE"            color={EMERALD} />
          <StatusPill label="LATENCY" value="sub-200ms"        color={GOLD}   />
          <StatusPill label="FIDELITY" value="high_fidelity_64k" color={VIOLET} />
        </div>
      </div>

      {/* ── Waveform ── */}
      <div style={styles.waveformBox}>
        <WaveformCanvas active={isSpeaking || isListening} emotion={currentEmotion} />
      </div>

      {/* ── Main Grid ── */}
      <div style={styles.grid}>

        {/* Left — Input & Controls */}
        <div style={styles.leftPanel}>
          <PanelLabel>SYNTHESIS INPUT</PanelLabel>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to synthesize..."
            style={styles.textInput}
          />

          <PanelLabel>VOICE IDENTITY</PanelLabel>
          <select
            value={selectedVoice}
            onChange={(e) => setVoice(e.target.value)}
            style={styles.select}
          >
            {(status?.voices || [
              { voice_id: 'primordia_voice_hyperreal', name: 'Primordia Voice Sovereign' },
              { voice_id: 'primordia_voice_clone',     name: 'Primordia Master Clone' },
              { voice_id: 'antigravity_whisper',        name: 'Antigravity Cosmic Whisper' },
              { voice_id: '21m00Tcm4TlvDq8ikWAM',      name: 'Rachel (Transmuted)' },
            ]).map((v: any) => (
              <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
            ))}
          </select>

          <PanelLabel>EMOTION CURVE</PanelLabel>
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            style={styles.select}
          >
            <option value="auto">AUTO DETECT</option>
            <option value="sovereign_triumphant">SOVEREIGN TRIUMPHANT</option>
            <option value="cosmic_serene">COSMIC SERENE</option>
            <option value="empathic_warm">EMPATHIC WARM</option>
            <option value="intense_ignition">INTENSE IGNITION</option>
            <option value="neutral">NEUTRAL</option>
          </select>

          {/* Controls */}
          <div style={styles.controlRow}>
            <HudButton
              label={isSpeaking ? 'SYNTHESIZING...' : '▶ SPEAK'}
              color={EMERALD}
              onClick={handleSpeak}
              disabled={isSpeaking || !inputText.trim()}
              glowColor={EMERALD}
            />
            <HudButton
              label={isListening ? '● LISTENING' : '⏺ LISTEN'}
              color={VIOLET}
              onClick={handleListen}
              disabled={isListening}
              glowColor={VIOLET}
            />
            <HudButton
              label="⬡ CLONE"
              color={GOLD}
              onClick={handleClone}
              glowColor={GOLD}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          {lastResult && (
            <div style={styles.resultBox}>
              <span style={{ color: EMERALD }}>● SYNTHESIS COMPLETE</span>
              &nbsp;&nbsp;
              <span style={{ color: GOLD }}>EMOTION: {lastResult.emotion}</span>
              &nbsp;&nbsp;
              <span style={{ color: '#8899bb' }}>{lastResult.latencyMs}ms</span>
            </div>
          )}
        </div>

        {/* Right — Pipeline + Stats */}
        <div style={styles.rightPanel}>

          {/* Pipeline */}
          <PanelLabel>PROCESSING PIPELINE</PanelLabel>
          <div style={styles.pipeline}>
            {pipelineStages.map((stage, i) => (
              <React.Fragment key={stage.id}>
                <div style={{
                  ...styles.pipelineStage,
                  borderColor: stage.active ? emotionColor : '#1a2240',
                  background:  stage.active ? `${emotionColor}18` : 'transparent',
                  color:        stage.active ? emotionColor : '#445577',
                  boxShadow:    stage.active ? `0 0 10px ${emotionColor}55` : 'none',
                }}>
                  {stage.label}
                </div>
                {i < pipelineStages.length - 1 && (
                  <div style={{ ...styles.pipelineArrow, color: stage.active ? emotionColor : '#1a2240' }}>
                    ▶
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Emotion Telemetry */}
          <PanelLabel>EMOTION TELEMETRY</PanelLabel>
          <div style={styles.telemetryGrid}>
            <TelemetryCell
              label="CURRENT EMOTION"
              value={currentEmotion.replace(/_/g, ' ').toUpperCase()}
              color={emotionColor}
            />
            <TelemetryCell
              label="COHERENCE"
              value={`${((status?.personality?.emotionalCoherenceScore || 0.999) * 100).toFixed(1)}%`}
              color={EMERALD}
            />
            <TelemetryCell
              label="DIALOGUE TURNS"
              value={String(status?.personality?.dialogueTurnCount || 0)}
              color={GOLD}
            />
            <TelemetryCell
              label="TTS COUNT"
              value={String(status?.stats?.ttsCount || 0)}
              color={VIOLET}
            />
          </div>

          {/* Capability Grid */}
          <PanelLabel>CAPABILITIES</PanelLabel>
          <div style={styles.capabilityGrid}>
            {Object.entries(status?.capabilities || {
              prosodyEngine: 'dynamic_emotion_curve',
              timbreEngine:  'spectral_morphing',
              vocoder:        'hyperreal_neural_vocoder_v4',
              breathProfile:  'adaptive_micro-noise',
            }).map(([key, val]) => (
              <CapabilityChip key={key} label={key} value={val as string} />
            ))}
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div style={styles.footer}>
        <span style={{ color: '#445577' }}>REST ENDPOINT</span>
        &nbsp;
        <span style={{ color: EMERALD }}>http://localhost:31337</span>
        <span style={{ color: '#445577', margin: '0 16px' }}>|</span>
        <span style={{ color: '#445577' }}>VOCODER</span>
        &nbsp;
        <span style={{ color: VIOLET }}>hyperreal_neural_vocoder_v4</span>
        <span style={{ color: '#445577', margin: '0 16px' }}>|</span>
        <span style={{ color: '#445577' }}>EMOTION ACCURACY</span>
        &nbsp;
        <span style={{ color: GOLD }}>99.9%</span>
      </div>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ fontSize: 9, color: '#445577', letterSpacing: 2 }}>{label}</span>
      <span style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: 1 }}>{value}</span>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: 3, color: '#445577',
      marginBottom: 8, marginTop: 16, textTransform: 'uppercase'
    }}>
      {children}
    </div>
  );
}

function HudButton({
  label, color, glowColor, onClick, disabled
}: {
  label: string; color: string; glowColor: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '10px 0',
        background: 'transparent',
        border: `1px solid ${disabled ? '#1a2240' : color}`,
        borderRadius: 4,
        color: disabled ? '#334' : color,
        fontSize: 11,
        fontFamily: 'inherit',
        fontWeight: 700,
        letterSpacing: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : `0 0 10px ${glowColor}44`,
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
}

function TelemetryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#060c1a', border: `1px solid #0d1a32`,
      borderRadius: 4, padding: '10px 14px'
    }}>
      <div style={{ fontSize: 9, color: '#445577', letterSpacing: 2, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, color, fontWeight: 700, letterSpacing: 1 }}>{value}</div>
    </div>
  );
}

function CapabilityChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#060c1a', border: '1px solid #0d1a32',
      borderRadius: 4, padding: '7px 10px'
    }}>
      <div style={{ fontSize: 8, color: '#334466', letterSpacing: 1, marginBottom: 3 }}>
        {label.replace(/([A-Z])/g, ' $1').toUpperCase().trim()}
      </div>
      <div style={{ fontSize: 10, color: '#6688aa', letterSpacing: 0.5 }}>{value}</div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  shell: {
    width: '100%', minHeight: '100vh',
    background: BG_DEEP,
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    color: '#c8d8f0',
    display: 'flex', flexDirection: 'column',
    userSelect: 'none',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 32px',
    borderBottom: '1px solid #0d1a32',
    background: 'linear-gradient(90deg, #04060f 0%, #07091a 100%)',
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 16
  },
  coreOrb: {
    width: 18, height: 18, borderRadius: '50%',
    background: EMERALD,
    flexShrink: 0,
    animation: 'pulse 2s infinite',
  },
  hudTitle: {
    fontSize: 13, fontWeight: 700, letterSpacing: 4, color: EMERALD,
  },
  hudSub: {
    fontSize: 9, color: '#334466', letterSpacing: 2, marginTop: 2,
  },
  headerRight: {
    display: 'flex', gap: 28, alignItems: 'center'
  },
  waveformBox: {
    padding: '14px 32px',
    background: '#04060f',
    borderBottom: '1px solid #0d1a32',
  },
  grid: {
    flex: 1, display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
  },
  leftPanel: {
    padding: '20px 32px',
    borderRight: '1px solid #0d1a32',
    display: 'flex', flexDirection: 'column',
  },
  rightPanel: {
    padding: '20px 32px',
    display: 'flex', flexDirection: 'column',
  },
  textInput: {
    width: '100%', minHeight: 90,
    background: '#060c1a', border: '1px solid #0d1a32',
    borderRadius: 4, color: '#c8d8f0',
    fontFamily: 'inherit', fontSize: 12,
    padding: '10px 12px', resize: 'vertical',
    outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', background: '#060c1a',
    border: '1px solid #0d1a32', borderRadius: 4,
    color: '#c8d8f0', fontFamily: 'inherit',
    fontSize: 11, padding: '8px 12px',
    outline: 'none',
  },
  controlRow: {
    display: 'flex', gap: 10, marginTop: 16,
  },
  errorBox: {
    marginTop: 12, padding: '8px 12px',
    background: '#1a0510', border: '1px solid #b400ff44',
    borderRadius: 4, fontSize: 11, color: VIOLET,
  },
  resultBox: {
    marginTop: 10, padding: '8px 12px',
    background: '#040e10', border: '1px solid #1bffb844',
    borderRadius: 4, fontSize: 11,
  },
  pipeline: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  pipelineStage: {
    padding: '8px 14px', borderRadius: 4,
    fontSize: 10, letterSpacing: 2, fontWeight: 700,
    border: '1px solid #1a2240',
    transition: 'all 0.25s',
  },
  pipelineArrow: {
    fontSize: 8, textAlign: 'center', marginLeft: 16,
    transition: 'color 0.25s',
  },
  telemetryGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  capabilityGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 8, marginBottom: 16,
  },
  footer: {
    padding: '12px 32px',
    borderTop: '1px solid #0d1a32',
    fontSize: 9, letterSpacing: 2,
    background: '#04060f',
    display: 'flex', alignItems: 'center',
  },
};
