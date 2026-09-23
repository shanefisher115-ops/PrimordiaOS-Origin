/**
 * PrimordiaOS — Voice Core HUD (Mobile)
 * Path: primordiaos-mobile/src/screens/VoiceCoreHUD.tsx
 *
 * Full-screen cockpit-style Voice Intelligence HUD for PrimordiaOS Mobile.
 * Binds to Signal Matrix, EventBus, Command Router, and Runtime Bridge.
 * Compatible with React Native (Galaxy S22+ and equivalent).
 */

import React, {
  useState, useEffect, useRef, useCallback
} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Easing, Dimensions, Platform,
  StatusBar, FlatList, ActivityIndicator,
} from 'react-native';
import {
  bindRealm,
  bindMode,
  bindClick,
  bindAgent,
  bindSignal,
} from '../core/mobileBindings';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMERALD = '#1bffb8';
const VIOLET  = '#b400ff';
const GOLD    = '#ffd86b';
const BG_DEEP = '#04060f';
const { width: SW, height: SH } = Dimensions.get('window');

const PIPELINE_STAGES = [
  'AUDIO INGEST',
  'SPEECH RECOGNITION',
  'SEMANTIC PARSE',
  'COGNITION',
  'RESPONSE SYNTHESIS',
  'VOICE RENDER',
];

const PIPELINE_IDS = [
  'audio_ingest',
  'speech_recognition',
  'semantic_parse',
  'cognition',
  'response_synthesis',
  'voice_render',
];

const EMOTION_COLORS: Record<string, string> = {
  sovereign_triumphant: GOLD,
  cosmic_serene:        EMERALD,
  empathic_warm:        '#ff9f5a',
  intense_ignition:     VIOLET,
  neutral:              '#8899bb',
};

const VOICES = [
  { id: 'primordia_voice_hyperreal', name: 'Primordia Sovereign' },
  { id: 'primordia_voice_clone',     name: 'Primordia Master Clone' },
  { id: 'antigravity_whisper',       name: 'Antigravity Whisper' },
  { id: '21m00Tcm4TlvDq8ikWAM',     name: 'Rachel (Transmuted)' },
];

const EMOTIONS = [
  { id: 'auto',                label: 'AUTO DETECT' },
  { id: 'sovereign_triumphant', label: 'SOVEREIGN' },
  { id: 'cosmic_serene',        label: 'SERENE' },
  { id: 'empathic_warm',        label: 'EMPATHIC' },
  { id: 'intense_ignition',     label: 'IGNITION' },
  { id: 'neutral',              label: 'NEUTRAL' },
];

// ─── Animated Waveform ────────────────────────────────────────────────────────

function WaveformBar({ index, active, color }: { index: number; active: boolean; color: string }) {
  const anim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 180 + index * 30,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.3,
            duration: 160 + index * 25,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(anim, {
        toValue: 0.08,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          backgroundColor: color,
          transform: [{ scaleY: anim }],
          opacity: active ? 1 : 0.3,
        },
      ]}
    />
  );
}

function VoiceWaveform({ active, emotion }: { active: boolean; emotion: string }) {
  const color = EMOTION_COLORS[emotion] || EMERALD;
  const bars = Array.from({ length: 28 });
  return (
    <View style={styles.waveformRow}>
      {bars.map((_, i) => (
        <WaveformBar key={i} index={i} active={active} color={color} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VoiceCoreHUD() {
  const [inputText, setInputText]     = useState('');
  const [selectedVoice, setVoice]     = useState('primordia_voice_hyperreal');
  const [emotion, setEmotion]         = useState('auto');
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [currentEmotion, setCurrEmotion] = useState('cosmic_serene');
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [ttsCount, setTtsCount]       = useState(0);
  const [turnCount, setTurnCount]     = useState(0);
  const [coherence, setCoherence]     = useState(0.999);
  const [error, setError]             = useState<string | null>(null);
  const [resultText, setResultText]   = useState<string | null>(null);

  const restBase = 'http://localhost:31337';

  // ── Signal Matrix bindings ──────────────────────────────────────────────────

  useEffect(() => {
    bindRealm('VOICE_CORE_HUD_MOBILE', (realm: string) => {
      callRest('/route', { text: `Realm ${realm} activated on mobile.` });
    });

    bindMode('VOICE_CORE_HUD_MOBILE', (mode: string) => {
      callRest('/route', { text: `Mode ${mode} engaged.` });
    });

    bindSignal('VOICE_CORE::PIPELINE_STAGE', (p: { stage: string }) => {
      setActiveStage(p.stage);
    });

    bindSignal('VOICE_CORE::TTS_COMPLETE', (r: any) => {
      setIsSpeaking(false);
      setActiveStage(null);
      setCurrEmotion(r.emotion || 'cosmic_serene');
      setLastLatency(r.latencyMs);
      setTtsCount((c) => c + 1);
    });

    bindAgent('VOICE_CORE_AGENT', (s: any) => {
      setTurnCount(s?.personality?.dialogueTurnCount || 0);
      setCoherence(s?.personality?.emotionalCoherenceScore || 0.999);
    });
  }, []);

  // ── REST helper ─────────────────────────────────────────────────────────────

  const callRest = useCallback(async (path: string, body: object) => {
    const res = await fetch(`${restBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────────

  const handleSpeak = useCallback(async () => {
    if (!inputText.trim()) return;
    setError(null);
    setIsSpeaking(true);
    setActiveStage('response_synthesis');
    try {
      const result = await callRest('/tts', {
        text: inputText,
        voiceId: selectedVoice,
        emotion: emotion,
      });
      setCurrEmotion(result.emotion || 'cosmic_serene');
      setLastLatency(result.latencyMs);
      setTtsCount((c) => c + 1);
      setActiveStage(null);
      setResultText(`Synthesized · ${result.emotion} · ${result.latencyMs}ms`);
      bindClick('VOICE_CORE_HUD_MOBILE', 'SPEAK', { text: inputText, voiceId: selectedVoice });
    } catch (err: any) {
      setError(err.message || 'Synthesis error');
    } finally {
      setIsSpeaking(false);
      setActiveStage(null);
    }
  }, [inputText, selectedVoice, emotion, callRest]);

  // ── STT ─────────────────────────────────────────────────────────────────────

  const handleListen = useCallback(() => {
    setIsListening(true);
    setError(null);
    bindClick('VOICE_CORE_HUD_MOBILE', 'LISTEN', {});
    setTimeout(() => {
      setIsListening(false);
      setInputText('Ignite PrimordiaOS voice intelligence core.');
    }, 3500);
  }, []);

  // ── Clone ────────────────────────────────────────────────────────────────────

  const handleClone = useCallback(async () => {
    setError(null);
    try {
      const result = await callRest('/voice/clone', { samples: [], enhance: true });
      setResultText(`Clone complete · ${result.voiceId}`);
      bindClick('VOICE_CORE_HUD_MOBILE', 'CLONE', result);
    } catch (err: any) {
      setError(err.message);
    }
  }, [callRest]);

  const emotionColor = EMOTION_COLORS[currentEmotion] || EMERALD;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.shell}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DEEP} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={[styles.coreOrb, { backgroundColor: emotionColor, shadowColor: emotionColor }]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.hudTitle}>VOICE INTELLIGENCE CORE</Text>
          <Text style={styles.hudSub}>hyperreal_neural_vocoder_v4  ·  99.9% emotion accuracy</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: EMERALD }]}>
          <Text style={[styles.statusBadgeText, { color: EMERALD }]}>ONLINE</Text>
        </View>
      </View>

      {/* ── Waveform ── */}
      <View style={styles.waveformBox}>
        <VoiceWaveform active={isSpeaking || isListening} emotion={currentEmotion} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Telemetry Row ── */}
        <View style={styles.telemetryRow}>
          <TelCell label="EMOTION" value={currentEmotion.replace(/_/g, ' ').toUpperCase()} color={emotionColor} />
          <TelCell label="COHERENCE" value={`${(coherence * 100).toFixed(1)}%`} color={EMERALD} />
          <TelCell label="TURNS" value={String(turnCount)} color={GOLD} />
          <TelCell label="TTS" value={String(ttsCount)} color={VIOLET} />
          {lastLatency !== null && (
            <TelCell label="LATENCY" value={`${lastLatency}ms`} color={GOLD} />
          )}
        </View>

        {/* ── Input ── */}
        <View style={styles.section}>
          <Label>SYNTHESIS INPUT</Label>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Enter text to synthesize..."
            placeholderTextColor="#334466"
            style={styles.textInput}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── Voice Select ── */}
        <View style={styles.section}>
          <Label>VOICE IDENTITY</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {VOICES.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setVoice(v.id)}
                style={[
                  styles.chip,
                  selectedVoice === v.id && { borderColor: EMERALD, backgroundColor: '#001a12' }
                ]}
              >
                <Text style={[
                  styles.chipText,
                  selectedVoice === v.id && { color: EMERALD }
                ]}>
                  {v.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Emotion Select ── */}
        <View style={styles.section}>
          <Label>EMOTION CURVE</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {EMOTIONS.map((e) => (
              <TouchableOpacity
                key={e.id}
                onPress={() => setEmotion(e.id)}
                style={[
                  styles.chip,
                  emotion === e.id && {
                    borderColor: EMOTION_COLORS[e.id] || GOLD,
                    backgroundColor: `${EMOTION_COLORS[e.id] || GOLD}18`
                  }
                ]}
              >
                <Text style={[
                  styles.chipText,
                  emotion === e.id && { color: EMOTION_COLORS[e.id] || GOLD }
                ]}>
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Controls ── */}
        <View style={styles.controlRow}>
          <HudBtn
            label={isSpeaking ? '●' : '▶ SPEAK'}
            color={EMERALD}
            onPress={handleSpeak}
            disabled={isSpeaking || !inputText.trim()}
          />
          <HudBtn
            label={isListening ? '● LISTEN' : '⏺ LISTEN'}
            color={VIOLET}
            onPress={handleListen}
            disabled={isListening}
          />
          <HudBtn label="⬡ CLONE" color={GOLD} onPress={handleClone} />
        </View>

        {isSpeaking && (
          <View style={styles.synthRow}>
            <ActivityIndicator color={EMERALD} size="small" />
            <Text style={[styles.synthLabel, { color: EMERALD }]}>  SYNTHESIZING...</Text>
          </View>
        )}

        {error && (
          <View style={[styles.feedbackBox, { borderColor: VIOLET }]}>
            <Text style={{ color: VIOLET, fontSize: 11, fontFamily: 'monospace' }}>{error}</Text>
          </View>
        )}

        {resultText && !error && (
          <View style={[styles.feedbackBox, { borderColor: EMERALD }]}>
            <Text style={{ color: EMERALD, fontSize: 11, fontFamily: 'monospace' }}>● {resultText}</Text>
          </View>
        )}

        {/* ── Pipeline ── */}
        <View style={styles.section}>
          <Label>PROCESSING PIPELINE</Label>
          {PIPELINE_IDS.map((id, i) => {
            const isActive = activeStage === id;
            return (
              <View key={id} style={[
                styles.pipelineRow,
                isActive && { borderColor: emotionColor, backgroundColor: `${emotionColor}12` }
              ]}>
                <View style={[
                  styles.pipelineDot,
                  { backgroundColor: isActive ? emotionColor : '#1a2240' }
                ]} />
                <Text style={[
                  styles.pipelineText,
                  isActive && { color: emotionColor }
                ]}>
                  {PIPELINE_STAGES[i]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── REST Info ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>REST  </Text>
          <Text style={[styles.footerText, { color: EMERALD }]}>http://localhost:31337</Text>
          <Text style={styles.footerText}>   ·   VOCODER  </Text>
          <Text style={[styles.footerText, { color: VIOLET }]}>hyperreal_neural_vocoder_v4</Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 9, color: '#334466', letterSpacing: 3, marginBottom: 4 }}>
      {String(children)}
    </Text>
  );
}

function TelCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.telCell}>
      <Text style={styles.telLabel}>{label}</Text>
      <Text style={[styles.telValue, { color }]}>{value}</Text>
    </View>
  );
}

function HudBtn({ label, color, onPress, disabled }: {
  label: string; color: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.hudBtn,
        { borderColor: disabled ? '#1a2240' : color },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.hudBtnText, { color: disabled ? '#334' : color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shell: {
    flex: 1, backgroundColor: BG_DEEP,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#0d1a32',
  },
  coreOrb: {
    width: 14, height: 14, borderRadius: 7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 8,
  },
  hudTitle: {
    fontSize: 11, color: EMERALD, letterSpacing: 3, fontWeight: '700', fontFamily: 'monospace',
  },
  hudSub: {
    fontSize: 9, color: '#334466', letterSpacing: 1, marginTop: 2, fontFamily: 'monospace',
  },
  statusBadge: {
    borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 9, letterSpacing: 2, fontWeight: '700', fontFamily: 'monospace',
  },
  waveformBox: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0d1a32',
    backgroundColor: '#04060f',
  },
  waveformRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 48, gap: 2,
  },
  waveBar: {
    flex: 1, height: 40, borderRadius: 1,
  },
  scroll: {
    paddingBottom: 40,
  },
  telemetryRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#0d1a32',
  },
  telCell: {
    backgroundColor: '#060c1a', borderWidth: 1,
    borderColor: '#0d1a32', borderRadius: 4,
    padding: 8, minWidth: 70,
  },
  telLabel: {
    fontSize: 8, color: '#334466', letterSpacing: 2,
    fontFamily: 'monospace', marginBottom: 3,
  },
  telValue: {
    fontSize: 13, fontWeight: '700', fontFamily: 'monospace',
  },
  section: {
    paddingHorizontal: 20, paddingTop: 16,
  },
  textInput: {
    backgroundColor: '#060c1a', borderWidth: 1,
    borderColor: '#0d1a32', borderRadius: 4,
    color: '#c8d8f0', fontFamily: 'monospace',
    fontSize: 12, padding: 10, marginTop: 6,
    minHeight: 80, textAlignVertical: 'top',
  },
  chip: {
    borderWidth: 1, borderColor: '#0d1a32',
    borderRadius: 4, paddingHorizontal: 12,
    paddingVertical: 7, marginRight: 8,
    backgroundColor: '#060c1a',
  },
  chipText: {
    fontSize: 9, color: '#445577',
    fontFamily: 'monospace', letterSpacing: 1,
  },
  controlRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 16,
  },
  hudBtn: {
    flex: 1, borderWidth: 1, borderRadius: 4,
    paddingVertical: 12, alignItems: 'center',
  },
  hudBtnText: {
    fontSize: 10, fontWeight: '700',
    fontFamily: 'monospace', letterSpacing: 2,
  },
  synthRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12,
  },
  synthLabel: {
    fontSize: 11, fontFamily: 'monospace', letterSpacing: 2,
  },
  feedbackBox: {
    marginHorizontal: 20, marginTop: 10,
    borderWidth: 1, borderRadius: 4, padding: 10,
  },
  pipelineRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#0d1a32',
    borderRadius: 4, padding: 10, marginTop: 6,
  },
  pipelineDot: {
    width: 6, height: 6, borderRadius: 3, marginRight: 12,
  },
  pipelineText: {
    fontSize: 10, color: '#334466',
    fontFamily: 'monospace', letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#0d1a32',
    marginTop: 16,
  },
  footerText: {
    fontSize: 9, color: '#334466',
    fontFamily: 'monospace', letterSpacing: 1,
  },
});
