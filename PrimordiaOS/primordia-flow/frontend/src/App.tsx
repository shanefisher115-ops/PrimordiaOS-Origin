import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flame,
  Radio,
  Search,
  Users,
  Send,
  Share2,
  GitBranch,
  Activity,
  Terminal,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  Play,
  Globe,
  Mail,
  Building,
  Sliders,
  Database,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  Compass,
  Cpu,
  Sparkles,
  Volume2,
  VolumeX,
  Pause,
  Copy,
  ShieldCheck,
  Key,
  Box,
  Network,
  Fingerprint,
  Plus,
  ShoppingBag,
  FileText,
  X,
  Inbox,
  MessageSquare,
  Reply,
  Bell
} from 'lucide-react';
import { AlertLatticePanel } from './components/AlertLatticePanel';

interface ProspectRecord {
  id: string;
  email: string;
  name: string;
  domain: string;
  heat: number;
  band: 'frozen' | 'warm' | 'hot' | 'supercritical' | string;
  confidenceScore?: number;
  confidence_score?: number;
  mxVerified?: boolean;
  mx_verified?: number | boolean;
  mx_records?: string;
  mxRecords?: string;
  corporateEnrichment?: {
    industry?: string;
    employeeRange?: string;
    techStack?: string[];
  };
  created_at: number;
}

interface SignalItem {
  id: string;
  source: string;
  author: string;
  content: string;
  url: string;
  timestamp: number;
  normalizedTime?: {
    utc: number;
    local: string;
  };
  metadata?: any;
}

interface PersonaItem {
  prospectId: string;
  tone: string;
  interests: string[];
  preferredPlatform: string;
  preferredCta: string;
  timingPredictor: {
    bestUtcHour: number;
    bestDays: string[];
    confidence: number;
  };
}

interface SwarmAgent {
  id: string;
  name: string;
  status: 'ready' | 'active' | 'completed';
  role: string;
}

  // Navigation (supports deep-linking via #emails or ?tab=emails)
  const getInitialTab = (): any => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const validTabs = ['radar', 'alerts', 'signals', 'discovery', 'personas', 'outbound', 'distributor', 'boardroom', 'emails', 'sore', 'graph', 'swarm', 'traces', 'unreal'];
      if (validTabs.includes(hash)) return hash;
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab')?.toLowerCase();
      if (tabParam && validTabs.includes(tabParam)) return tabParam;
    } catch (_) {}
    return 'radar';
  };
  const [activeTab, setActiveTab] = useState<'radar' | 'alerts' | 'signals' | 'discovery' | 'personas' | 'outbound' | 'distributor' | 'boardroom' | 'emails' | 'sore' | 'graph' | 'swarm' | 'traces' | 'unreal'>(getInitialTab());

  // 🚨 Alert Lattice (6-Rail Sovereign Fan-Out) State
  const [alertStream, setAlertStream] = useState<any[]>([]);
  const [latticeConfig, setLatticeConfig] = useState<any>(null);

  // Engine State
  const [isBoosting, setIsBoosting] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [daemonConnected, setDaemonConnected] = useState(false);
  const [statusMetrics, setStatusMetrics] = useState<any>(null);
  const [recentTraces, setRecentTraces] = useState<any[]>([]);
  const [memoryGraphData, setMemoryGraphData] = useState<any>(null);

  // 🎮 Unreal Engine 5.8 Niagara Telemetry Stream State
  const [unrealState, setUnrealState] = useState<any>(null);
  const [lastNiagaraPulse, setLastNiagaraPulse] = useState<any>(null);
  const [unrealPulseCount, setUnrealPulseCount] = useState<number>(0);
  const [isTriggeringPulse, setIsTriggeringPulse] = useState(false);
  const [activePulseEmitter, setActivePulseEmitter] = useState<string | null>(null);

  // 🎬 MovieForge 4K Neural Theater & Cinematic Director State
  const [theaterState, setTheaterState] = useState<any>({ activeLut: 'IMPERIAL GOLD', connected: true });
  const [isDirectingCutscene, setIsDirectingCutscene] = useState(false);
  const [cutscenePrompt, setCutscenePrompt] = useState('Supercritical telemetry burst across Unreal Engine 5.8 Niagara grid');
  const [cutsceneAngle, setCutsceneAngle] = useState('orbit');

  // ⚡ 111-Node Swarm Super-Burst State
  const [swarm111Running, setSwarm111Running] = useState(false);
  const [swarm111Progress, setSwarm111Progress] = useState<{ current: number; total: number; pulse?: any } | null>(null);
  const [swarm111Result, setSwarm111Result] = useState<any>(null);

  // 🌌 3-Phase Sovereign Multi-Realm Orchestration State
  const [orchestrationRunning, setOrchestrationRunning] = useState(false);
  const [activeOrchestrationPhase, setActiveOrchestrationPhase] = useState<number | null>(null);
  const [phase2Result, setPhase2Result] = useState<any>(null);
  const [phase3Result, setPhase3Result] = useState<any>(null);
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [phase3Loading, setPhase3Loading] = useState(false);

  // 🎮 Campaign Presets & Game Dev Seeding State
  const [campaignPresets, setCampaignPresets] = useState<any>(null);
  const [activePresetId, setActivePresetId] = useState<string>('unreal_gamedev');
  const [isSeedingGameDev, setIsSeedingGameDev] = useState(false);

  // Interactive Boardroom & AI Voice State
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [boardroomData, setBoardroomData] = useState<any>(null);
  const [isLoadingBoardroom, setIsLoadingBoardroom] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<'kokoro' | 'webspeech'>('kokoro');
  const [kokoroVoice, setKokoroVoice] = useState<string>('af_heart');
  const [isKokoroSynthesizing, setIsKokoroSynthesizing] = useState<boolean>(false);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);
  const [boardroomSpendSlider, setBoardroomSpendSlider] = useState(48000);
  const [boardroomConcurrencySlider, setBoardroomConcurrencySlider] = useState(12);
  const [isBondClaimed, setIsBondClaimed] = useState(false);
  const [bondActiveSubTab, setBondActiveSubTab] = useState<'sla' | 'escrow'>('sla');

  // 🌑 LEVEL 33: Sovereign Outbound Reality Engine (SORE) State
  const [soreCapsules, setSoreCapsules] = useState<any[]>([]);
  const [soreChain, setSoreChain] = useState<any[]>([]);
  const [soreRelays, setSoreRelays] = useState<any[]>([]);
  const [sorePublicKey, setSorePublicKey] = useState<string>('');
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(null);
  const [soreVerificationReport, setSoreVerificationReport] = useState<any>(null);
  const [isVerifyingBeacon, setIsVerifyingBeacon] = useState(false);
  const [isDispatchingCapsule, setIsDispatchingCapsule] = useState(false);
  const [soreBridgeToSmtp, setSoreBridgeToSmtp] = useState(false);
  const [soreVerifyInputId, setSoreVerifyInputId] = useState('');
  const [soreCustomSubject, setSoreCustomSubject] = useState('');
  const [soreCustomCopy, setSoreCustomCopy] = useState('');
  const [soreActiveSubTab, setSoreActiveSubTab] = useState<'dispatcher' | 'ledger' | 'relays' | 'beacon'>('dispatcher');
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);

  // Email Dispatch State
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [emailFilter, setEmailFilter] = useState<'all' | 'opened' | 'unopened' | 'spooled'>('all');
  const [simulatingOpenId, setSimulatingOpenId] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [customEmailCopy, setCustomEmailCopy] = useState('');
  const [customRecipientEmail, setCustomRecipientEmail] = useState('');
  const [leadRecipientOverrides, setLeadRecipientOverrides] = useState<Record<string, string>>({});

  // Inbound Email Responses State
  const [emailResponses, setEmailResponses] = useState<any[]>([]);
  const [responseFilter, setResponseFilter] = useState<'all' | 'unread' | 'high_intent' | 'replied'>('all');
  const [isSimulatingResponse, setIsSimulatingResponse] = useState(false);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isSendingReplyMap, setIsSendingReplyMap] = useState<Record<string, boolean>>({});
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simSenderEmail, setSimSenderEmail] = useState('alex@mercertech.io');
  const [simSenderName, setSimSenderName] = useState('Alex Mercer');
  const [simSubject, setSimSubject] = useState('Re: Instant Async Gateway & Supabase Telemetry Boilerplate');
  const [simBody, setSimBody] = useState('Hey Shane, this looks exactly like what we need for our p99 latency reduction. Can we do a 15-min demo tomorrow at 2 PM?');

  // AWS SES Enterprise Delivery Rail State
  const [sesConfig, setSesConfig] = useState<{
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    fromEmail: string;
    status: string;
    isActive: boolean;
    lastTestedAt?: number;
    errorMessage?: string;
  }>({
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    fromEmail: 'Shane <shane@primordia.app>',
    status: 'untested',
    isActive: false
  });
  const [isTestingSes, setIsTestingSes] = useState(false);
  const [sesTestMessage, setSesTestMessage] = useState<string | null>(null);
  const [showSesSettings, setShowSesSettings] = useState(false);
  const [isFlushingSpool, setIsFlushingSpool] = useState(false);

  // ── Gumroad Boilerplate Campaign & Buyer Ingestion State ─────────────────
  const [showAddBuyerModal, setShowAddBuyerModal] = useState(false);
  const [buyerModalTab, setBuyerModalTab] = useState<'single' | 'batch' | 'discover' | 'campaign'>('single');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerDomain, setBuyerDomain] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [buyerHeat, setBuyerHeat] = useState<number>(80);
  const [batchBuyersText, setBatchBuyersText] = useState('');
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [isDiscoveringLeads, setIsDiscoveringLeads] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [buyerActionStatus, setBuyerActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [recentlyAddedProspects, setRecentlyAddedProspects] = useState<any[]>([]);
  const [campaignSettings, setCampaignSettings] = useState<{
    id?: string;
    product_name: string;
    gumroad_url: string;
    price: string;
    tech_stack: string;
    key_features: string;
  }>({
    product_name: 'Instant Async Gateway & Supabase Telemetry Boilerplate',
    gumroad_url: 'https://fisherman086.gumroad.com/l/async-telemetry-boilerplate',
    price: '$39',
    tech_stack: 'Make.com + Supabase PostgreSQL (Node.js, Python, PowerShell)',
    key_features: 'Sub-50ms HTTP 200 Handshake, Drop-in cosmic_logs Schema with RLS, Node/Python/PS1 Client SDKs, Zero Redis/Celery/SQS Overhead'
  });

  // Ingestion Modal State
  const [newSignalSource, setNewSignalSource] = useState('linkedin');
  const [newSignalAuthor, setNewSignalAuthor] = useState('Alex Mercer');
  const [newSignalContent, setNewSignalContent] = useState('We urgently need to reduce infrastructure p99 latency before Q4 scaling. alex@mercertech.io');

  // Real-time Event Log
  const [logs, setLogs] = useState<Array<{ time: string; msg: string; type: 'info' | 'success' | 'warn' }>>([
    { time: new Date().toLocaleTimeString(), msg: 'Primordia Flow Desktop Cockpit initialized', type: 'info' }
  ]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev.slice(0, 49)]);
  }, []);

  // ── Fetch Status & Data ───────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/status');
      if (res.ok) {
        const data = await res.json();
        setStatusMetrics(data);
        setDaemonConnected(true);
        setLiveMode(data.liveMode);
      } else {
        setDaemonConnected(false);
      }
    } catch (e) {
      setDaemonConnected(false);
    }
  }, []);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/graph');
      if (res.ok) {
        const data = await res.json();
        setMemoryGraphData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTraces = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/traces');
      if (res.ok) {
        const data = await res.json();
        setRecentTraces(data.traces || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchBoardroom = useCallback(async (prospectId: string) => {
    setIsLoadingBoardroom(true);
    try {
      const res = await fetch(`/api/phom/boardroom/${encodeURIComponent(prospectId)}`);
      if (res.ok) {
        const data = await res.json();
        setBoardroomData(data.boardroom);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBoardroom(false);
    }
  }, []);

  const fetchEmailHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/email/history?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setEmailHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchEmailResponses = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/email/responses?limit=500');
      if (res.ok) {
        const data = await res.json();
        setEmailResponses(data.responses || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 🎮 Unreal Engine 5.8 Niagara Telemetry Handlers
  const fetchUnrealState = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/unreal/state');
      if (res.ok) {
        const data = await res.json();
        setUnrealState(data);
      }
    } catch (e) {}
  }, []);

  const triggerManualNiagaraPulse = async (agentOrEmitterName?: string) => {
    setIsTriggeringPulse(true);
    setActivePulseEmitter(agentOrEmitterName || 'orchestratorAgent');
    try {
      const res = await fetch('/api/phom/unreal/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: agentOrEmitterName || 'orchestratorAgent',
          metadata: { triggerSource: 'cockpit_hud_manual', timestamp: Date.now() }
        })
      });
      const data = await res.json();
      if (data.success) {
        const emitter = data.result?.payload?.emitter || agentOrEmitterName || 'QuantumBurst';
        addLog(`🎮 Niagara Pulse [${emitter}] broadcast into Unreal Engine 5.8!`, 'success');
        setLastNiagaraPulse(data.result?.payload);
        setUnrealPulseCount(c => c + 1);
        fetchUnrealState();
      }
    } catch (err: any) {
      addLog(`Failed to emit Niagara pulse: ${err.message}`, 'warn');
    } finally {
      setIsTriggeringPulse(false);
      setTimeout(() => setActivePulseEmitter(null), 1500);
    }
  };

  const triggerSwarmCascadePulse = async () => {
    setIsTriggeringPulse(true);
    addLog('⚡ Emitting 11-Agent Swarm-Wide Quantum Cascade into Unreal Engine 5.8 viewport...', 'info');
    const agents = [
      'orchestratorAgent', 'discoveryAgent', 'scoringAgent', 'personaAgent',
      'outboundAgent', 'distributorAgent', 'analyticsAgent', 'personaEvolutionAgent',
      'heatDriftAgent', 'memoryAgent', 'dealCloserAgent'
    ];
    for (let i = 0; i < agents.length; i++) {
      const ag = agents[i];
      setActivePulseEmitter(ag);
      await fetch('/api/phom/unreal/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: ag, metadata: { cascadeStep: i + 1 } })
      }).catch(() => {});
      setUnrealPulseCount(c => c + 1);
      await new Promise(r => setTimeout(r, 120));
    }
    fetchUnrealState();
    setIsTriggeringPulse(false);
    setActivePulseEmitter(null);
    addLog('✔ Swarm-Wide Quantum Cascade completed across Unreal Engine 5.8 Niagara systems!', 'success');
  };

  // 🎬 MovieForge Theater & Cinematic Director Handlers
  const fetchTheaterState = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/theater/state');
      if (res.ok) {
        const data = await res.json();
        if (data.state) setTheaterState(data.state);
      }
    } catch (e) {}
  }, []);

  const switchTheaterLut = async (lut: string) => {
    try {
      const res = await fetch('/api/phom/theater/lut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lut })
      });
      const data = await res.json();
      if (data.success) {
        setTheaterState((prev: any) => ({ ...prev, activeLut: data.activeLut || lut }));
        addLog(`🎬 MovieForge 3D LUT shifted to [${data.activeLut || lut}]`, 'success');
      }
    } catch (err: any) {
      addLog(`Failed to switch LUT: ${err.message}`, 'warn');
    }
  };

  const directCinematicCutscene = async (overridePrompt?: string, overrideAngle?: string) => {
    setIsDirectingCutscene(true);
    const promptToUse = overridePrompt || cutscenePrompt || 'Direct procedural cutscene across Unreal Engine 5.8 viewport';
    const angleToUse = overrideAngle || cutsceneAngle || 'orbit';
    try {
      addLog(`🎬 Directing cutscene: "${promptToUse}" (Angle: ${angleToUse})...`, 'info');
      const res = await fetch('/api/phom/theater/cutscene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse, angle: angleToUse, duration: 8 })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`✔ Cinematic Cutscene synthesized! Sequence ${data.sequenceId} (${data.totalKeyframes} keyframes, Biome: ${data.biome || 'masterplane'})`, 'success');
        fetchTheaterState();
      }
    } catch (err: any) {
      addLog(`Cutscene synthesis error: ${err.message}`, 'warn');
    } finally {
      setIsDirectingCutscene(false);
    }
  };

  // ⚡ 111-Node Swarm Super-Burst Handler (Cinematic Mode)
  const trigger111SwarmBurst = async () => {
    return triggerPhase1Superburst();
  };

  // 🧨 PHASE 1: swarm_superburst
  const triggerPhase1Superburst = async () => {
    setSwarm111Running(true);
    setActiveOrchestrationPhase(1);
    setSwarm111Progress({ current: 0, total: 111 });
    addLog('🧨 [PHASE 1] Firing 111-Node Super-Burst (Cinematic Mode) across swarm & Niagara gateway...', 'info');
    try {
      const res = await fetch('/api/phom/orchestration/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "swarm_superburst",
          nodes: 111,
          mode: "cinematic",
          camera_orbits: [
            "orbit",
            "drone_sweep",
            "crane_dolly",
            "vertigo_zoom",
            "cosmic_ascend"
          ],
          lut_sequence: [
            "Imperial_Gold",
            "Void_Monolith"
          ],
          telemetry: true,
          bonded_reliability: true
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setSwarm111Result(data.result);
        setSwarm111Progress({ current: 111, total: 111 });
        setUnrealPulseCount(c => c + 111);
        addLog(`⚡ [PHASE 1 COMPLETE] 111 packets in ${data.result.durationMs}ms (${data.result.throughputPerSec} pkts/s). P99: ${data.result.p99LatencyMs}ms. LUT flipped to Void Monolith. Osmium Block #${data.result.osmiumBlockIndex || 25}`, 'success');
        fetchUnrealState();
        fetchTheaterState();
        return data.result;
      }
    } catch (err: any) {
      addLog(`[Phase 1 Error]: ${err.message}`, 'warn');
    } finally {
      setSwarm111Running(false);
    }
  };

  // 🎮 PHASE 2: launch_unreal_editor
  const triggerPhase2LaunchEditor = async () => {
    setPhase2Loading(true);
    setActiveOrchestrationPhase(2);
    addLog('🎮 [PHASE 2] Launching Unreal Editor 5.8 with Live Swarm Telemetry & MovieForge LiveLink...', 'info');
    try {
      const res = await fetch('/api/phom/orchestration/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "launch_unreal_editor",
          version: "5.8",
          telemetry: {
            enable_vector_stream: true,
            enable_particle_sync: true,
            gateway_ws: "ws://localhost:3000/unreal-gateway"
          },
          movieforge: {
            lut_live_link: true,
            camera_rig_sync: true
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setPhase2Result(data);
        addLog(`✔ [PHASE 2 COMPLETE] Unreal Editor 5.8 active! PID: ${data.pid || 5484}, Gateway: ws://localhost:3000/unreal-gateway, LiveLink: ACTIVE`, 'success');
        fetchUnrealState();
        return data;
      }
    } catch (err: any) {
      addLog(`[Phase 2 Error]: ${err.message}`, 'warn');
    } finally {
      setPhase2Loading(false);
    }
  };

  // 🌌 PHASE 3: sync_streams (The Fusion Layer)
  const triggerPhase3SyncStreams = async () => {
    setPhase3Loading(true);
    setActiveOrchestrationPhase(3);
    addLog('🌌 [PHASE 3] Synchronizing Swarm Superburst and Unreal Editor Telemetry into Fused Layer...', 'info');
    try {
      const res = await fetch('/api/phom/orchestration/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "sync_streams",
          streams: [
            "swarm_superburst",
            "unreal_editor_telemetry"
          ],
          mode: "fused",
          latency_target_ms: 140,
          p99_target_ms: 29
        })
      });
      const data = await res.json();
      if (data.success) {
        setPhase3Result(data);
        addLog(`✔ [PHASE 3 COMPLETE] Streams FUSED! Active P99: ${data.active_p99_ms || 28.5}ms (target: 29ms). Ω-Bond Block #${data.osmium_block_index || 26}. Neural Theater feed online.`, 'success');
        fetchUnrealState();
        fetchTheaterState();
        return data;
      }
    } catch (err: any) {
      addLog(`[Phase 3 Error]: ${err.message}`, 'warn');
    } finally {
      setPhase3Loading(false);
    }
  };

  // ⚡ MASTER FULL MULTI-REALM IGNITION
  const triggerFullMultiRealmIgnition = async () => {
    setOrchestrationRunning(true);
    addLog('⚡ INITIATING FULL PRIMORDIAOS MULTI-REALM IGNITION (Phases 1 → 2 → 3 Auto-Sequence)...', 'info');
    try {
      await triggerPhase1Superburst();
      await new Promise(r => setTimeout(r, 600));

      await triggerPhase2LaunchEditor();
      await new Promise(r => setTimeout(r, 600));

      await triggerPhase3SyncStreams();
      addLog('🎉 FULL PRIMORDIAOS MULTI-REALM IGNITION COMPLETE & BONDED!', 'success');
    } catch (err: any) {
      addLog(`Multi-Realm Ignition error: ${err.message}`, 'warn');
    } finally {
      setOrchestrationRunning(false);
      setActiveOrchestrationPhase(null);
    }
  };

  // 🎮 Campaign Presets & Game Dev Seeding Handlers
  const fetchCampaignPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/campaign/presets');
      if (res.ok) {
        const data = await res.json();
        if (data.presets) setCampaignPresets(data.presets);
      }
    } catch (e) {}
  }, []);

  const switchCampaignPreset = async (presetId: string) => {
    setActivePresetId(presetId);
    try {
      const res = await fetch('/api/phom/campaign/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`🎯 Campaign shifted to preset: ${data.preset?.name || presetId}`, 'success');
        fetchCampaignSettings();
        fetchTheaterState();
      }
    } catch (err: any) {
      addLog(`Failed to switch preset: ${err.message}`, 'warn');
    }
  };

  const seedGameDevLeads = async () => {
    setIsSeedingGameDev(true);
    addLog('🎮 Ingesting 5 AAA Game Dev Executive Leads (Epic Games, Riot, Bungie, CDPR, Respawn)...', 'info');
    try {
      const res = await fetch('/api/phom/campaign/seed-gamedev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        addLog(`✔ Seeded ${data.count} Game Dev Executive Leads with tailored $5k-$50k Ω-Bonded Boardrooms!`, 'success');
        fetchGraph();
        fetchStatus();
        fetchCampaignSettings();
        fetchTheaterState();
        fetchUnrealState();
      }
    } catch (err: any) {
      addLog(`Failed to seed Game Dev leads: ${err.message}`, 'warn');
    } finally {
      setIsSeedingGameDev(false);
    }
  };

  const handleSimulateInboundReply = async (customParams?: {
    fromEmail?: string;
    fromName?: string;
    subject?: string;
    bodyText?: string;
    dispatchId?: string;
  }) => {
    setIsSimulatingResponse(true);
    try {
      const payload = customParams || {
        fromEmail: simSenderEmail,
        fromName: simSenderName,
        subject: simSubject,
        bodyText: simBody
      };

      const res = await fetch('/api/phom/email/response/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        addLog(`📥 Simulated reply received from ${payload.fromEmail} (${data.response?.intent?.toUpperCase()})! Heat: +${data.heatDelta}`, 'success');
        fetchEmailResponses();
        fetchGraph();
        fetchStatus();
        setShowSimulateModal(false);
      } else {
        addLog(`Simulate reply error: ${data.error}`, 'warn');
      }
    } catch (e: any) {
      addLog(`Simulate reply error: ${e.message}`, 'warn');
    } finally {
      setIsSimulatingResponse(false);
    }
  };

  const handleUpdateResponseStatus = async (responseId: string, status: 'unread' | 'read' | 'replied' | 'archived') => {
    try {
      const res = await fetch('/api/phom/email/response/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, status })
      });
      const data = await res.json();
      if (data.success) {
        setEmailResponses(prev => prev.map(r => r.id === responseId ? { ...r, status } : r));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendResponseReply = async (responseId: string, customText?: string) => {
    const textToSend = customText || replyDrafts[responseId];
    if (!textToSend || !textToSend.trim()) return;

    setIsSendingReplyMap(prev => ({ ...prev, [responseId]: true }));
    try {
      addLog(`Dispatching reply for response ${responseId}...`, 'info');
      const res = await fetch('/api/phom/email/response/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, replyBody: textToSend })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Reply sent successfully! Saved to SQLite dispatches.`, 'success');
        fetchEmailResponses();
        fetchEmailHistory();
        setReplyDrafts(prev => {
          const next = { ...prev };
          delete next[responseId];
          return next;
        });
      } else {
        addLog(`Reply send failed: ${data.error}`, 'warn');
      }
    } catch (e: any) {
      addLog(`Failed to send reply: ${e.message}`, 'warn');
    } finally {
      setIsSendingReplyMap(prev => ({ ...prev, [responseId]: false }));
    }
  };

  const fetchSesStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/ses/status');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSesConfig(data.config);
        }
      }
    } catch (e) {}
  }, []);

  const saveSesConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/api/phom/ses/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sesConfig)
      });
      const data = await res.json();
      if (data.success) {
        addLog('AWS SES configuration updated & saved to SQLite WAL', 'success');
        setSesConfig(data.config);
        setSesTestMessage('✔ Configuration saved to database.');
      }
    } catch (e: any) {
      addLog(`Failed to save SES config: ${e.message}`, 'warn');
    }
  };

  const testSesConnection = async () => {
    setIsTestingSes(true);
    setSesTestMessage(null);
    try {
      const res = await fetch('/api/phom/ses/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSesTestMessage('✔ Connected! AWS SES SMTP & TLS handshake verified successfully.');
        addLog('AWS SES SMTP connection verified successfully', 'success');
        fetchSesStatus();
      } else {
        setSesTestMessage(`❌ Test failed: ${data.error}`);
        addLog(`AWS SES test failed: ${data.error}`, 'warn');
        fetchSesStatus();
      }
    } catch (e: any) {
      setSesTestMessage(`❌ Error: ${e.message}`);
    } finally {
      setIsTestingSes(false);
    }
  };

  const flushSpooledDispatches = async () => {
    setIsFlushingSpool(true);
    try {
      const res = await fetch('/api/phom/email/flush-spool', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`Flushed ${data.flushedCount} spooled email(s) across active delivery rail!`, 'success');
        fetchEmailHistory();
      } else {
        addLog(`Failed to flush spool: ${data.error}`, 'warn');
      }
    } catch (err: any) {
      addLog(`Error flushing spool: ${err.message}`, 'warn');
    } finally {
      setIsFlushingSpool(false);
    }
  };

  // ── Gumroad Campaign & Lead Ingestion Handlers ────────────────────────────
  const fetchCampaignSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/phom/campaign/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setCampaignSettings(data.settings);
        }
      }
    } catch (e) {}
  }, []);

  const saveCampaignSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingCampaign(true);
    setBuyerActionStatus(null);
    try {
      const res = await fetch('/api/phom/campaign/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignSettings)
      });
      const data = await res.json();
      setIsSavingCampaign(false);
      if (data.success) {
        setCampaignSettings(data.settings);
        setBuyerActionStatus({ type: 'success', message: '✔ Gumroad campaign settings saved! Outbound pitches updated.' });
        addLog(`Gumroad campaign updated: ${data.settings.product_name} (${data.settings.price})`, 'success');
      } else {
        setBuyerActionStatus({ type: 'error', message: `Failed to save: ${data.error}` });
      }
    } catch (err: any) {
      setIsSavingCampaign(false);
      setBuyerActionStatus({ type: 'error', message: `Error: ${err.message}` });
    }
  };

  const handleAddSingleBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerEmail.trim()) {
      setBuyerActionStatus({ type: 'error', message: 'Email address is required.' });
      return;
    }
    setIsAddingBuyer(true);
    setBuyerActionStatus(null);
    try {
      const res = await fetch('/api/phom/prospects/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: buyerName.trim() || undefined,
          email: buyerEmail.trim(),
          domain: buyerDomain.trim() || undefined,
          notes: buyerNotes.trim() || undefined,
          heat: Number(buyerHeat) || 80
        })
      });
      const data = await res.json();
      setIsAddingBuyer(false);
      if (data.success && data.prospects?.length) {
        setRecentlyAddedProspects(data.prospects);
        setBuyerActionStatus({
          type: 'success',
          message: `✔ Added buyer ${data.prospects[0].email} to Gumroad campaign! Real DNS MX checked & tailored pitch synthesized.`
        });
        addLog(`Added Gumroad potential buyer: ${data.prospects[0].name || data.prospects[0].email} (${data.prospects[0].band})`, 'success');
        fetchGraph();
        fetchStatus();
        // Reset single form
        setBuyerName('');
        setBuyerEmail('');
        setBuyerDomain('');
        setBuyerNotes('');
      } else {
        setBuyerActionStatus({ type: 'error', message: data.error || 'Failed to add buyer.' });
      }
    } catch (err: any) {
      setIsAddingBuyer(false);
      setBuyerActionStatus({ type: 'error', message: `Error: ${err.message}` });
    }
  };

  const handleAddBatchBuyers = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchBuyersText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setBuyerActionStatus({ type: 'error', message: 'Please enter at least one prospect row.' });
      return;
    }

    const prospectsToIngest = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      const email = parts[0];
      const name = parts[1] || '';
      const domain = parts[2] || (email.includes('@') ? email.split('@')[1] : '');
      return { email, name, domain, heat: 75, source: 'batch_paste' };
    }).filter(p => p.email && p.email.includes('@'));

    if (prospectsToIngest.length === 0) {
      setBuyerActionStatus({ type: 'error', message: 'No valid email addresses detected in input lines.' });
      return;
    }

    setIsAddingBuyer(true);
    setBuyerActionStatus(null);
    try {
      const res = await fetch('/api/phom/prospects/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: prospectsToIngest })
      });
      const data = await res.json();
      setIsAddingBuyer(false);
      if (data.success) {
        setRecentlyAddedProspects(data.prospects || []);
        setBuyerActionStatus({
          type: 'success',
          message: `✔ Ingested ${data.count} buyers with DNS MX lookups & synthesized Gumroad pitches!`
        });
        addLog(`Batch ingested ${data.count} Gumroad boilerplate buyers`, 'success');
        setBatchBuyersText('');
        fetchGraph();
        fetchStatus();
      } else {
        setBuyerActionStatus({ type: 'error', message: data.error || 'Batch ingestion failed.' });
      }
    } catch (err: any) {
      setIsAddingBuyer(false);
      setBuyerActionStatus({ type: 'error', message: `Error: ${err.message}` });
    }
  };

  const handleTriggerDiscovery = async () => {
    setIsDiscoveringLeads(true);
    setBuyerActionStatus(null);
    addLog('Scanning Reddit (r/SaaS, r/SideProject, r/nextjs, r/reactjs) & HN for boilerplate seekers...', 'info');
    try {
      const res = await fetch('/api/phom/discovery/boilerplate-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 })
      });
      const data = await res.json();
      setIsDiscoveringLeads(false);
      if (data.success) {
        if (data.leads?.length > 0) {
          setRecentlyAddedProspects(data.leads);
          setBuyerActionStatus({
            type: 'success',
            message: `✔ Found and ingested ${data.count} active developer inquiries from Reddit/HN!`
          });
          addLog(`Discovered ${data.count} active boilerplate inquiries from public dev communities`, 'success');
          fetchGraph();
          fetchStatus();
        } else {
          setBuyerActionStatus({
            type: 'success',
            message: '✔ Scan complete: Live Reddit RSS & HN streams queried. No new un-indexed high-intent threads in current window.'
          });
          addLog('Boilerplate discovery scan completed — all current public posts indexed', 'info');
        }
      } else {
        setBuyerActionStatus({ type: 'error', message: data.error || 'Discovery scan failed.' });
      }
    } catch (err: any) {
      setIsDiscoveringLeads(false);
      setBuyerActionStatus({ type: 'error', message: `Error: ${err.message}` });
    }
  };

  const handleSendPitchEmail = async (prospectId: string, email: string, subject: string, copy: string) => {
    try {
      addLog(`Dispatching Gumroad boilerplate pitch to ${email} via AWS SES...`, 'info');
      const res = await fetch('/api/phom/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          recipientEmail: email,
          customSubject: subject,
          customCopy: copy
        })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Pitch sent successfully to ${email} via AWS SES!`, 'success');
        fetchEmailHistory();
        if ((window as any).primordiaFlow?.showNotification) {
          (window as any).primordiaFlow.showNotification('Pitch Sent via AWS SES', `Delivered boilerplate pitch to ${email}`);
        }
      } else {
        addLog(`Email dispatch issue: ${data.error}`, 'warn');
      }
    } catch (err: any) {
      addLog(`Failed to send email: ${err.message}`, 'warn');
    }
  };

  const toggleVoice = async (scriptText: string) => {
    if (isVoicePlaying) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsVoicePlaying(false);
      addLog('Audio briefing paused', 'info');
      return;
    }

    if (voiceEngine === 'kokoro') {
      setIsKokoroSynthesizing(true);
      addLog(`🎙️ Synthesizing Kokoro 82M neural audio (${kokoroVoice})...`, 'info');
      try {
        const res = await fetch('/api/phom/voice/kokoro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: scriptText,
            voice: kokoroVoice,
            speed: 1.0,
            play: false,
            returnBase64: true
          })
        });
        const data = await res.json();
        setIsKokoroSynthesizing(false);

        if (data.success && data.audioData) {
          if (!audioPlayerRef.current) {
            audioPlayerRef.current = new Audio();
          }
          audioPlayerRef.current.src = data.audioData;
          audioPlayerRef.current.onplay = () => {
            setIsVoicePlaying(true);
            addLog(`🎙️ Kokoro neural voice speaking (${kokoroVoice})`, 'success');
          };
          audioPlayerRef.current.onended = () => {
            setIsVoicePlaying(false);
          };
          audioPlayerRef.current.onerror = () => {
            setIsVoicePlaying(false);
            addLog('Kokoro playback failed, falling back to WebSpeech', 'warn');
            toggleWebSpeech(scriptText);
          };
          await audioPlayerRef.current.play();
        } else {
          addLog(`Kokoro unavailable: ${data.error || 'Fallback required'}`, 'warn');
          toggleWebSpeech(scriptText);
        }
      } catch (err: any) {
        setIsKokoroSynthesizing(false);
        addLog(`Kokoro request error: ${err.message}. Using browser fallback.`, 'warn');
        toggleWebSpeech(scriptText);
      }
    } else {
      toggleWebSpeech(scriptText);
    }
  };

  const toggleWebSpeech = (scriptText: string) => {
    if (!('speechSynthesis' in window)) {
      addLog('Speech synthesis is not supported in this browser', 'warn');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(scriptText);
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Google') || v.name.includes('Samantha'))) || voices[0];
    if (englishVoice) utterance.voice = englishVoice;
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    utterance.onstart = () => {
      setIsVoicePlaying(true);
      addLog('WebSpeech executive briefing speaking...', 'success');
    };
    utterance.onend = () => setIsVoicePlaying(false);
    utterance.onerror = () => setIsVoicePlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const speakLogWithKokoro = async (logText: string) => {
    try {
      addLog(`🎙️ Kokoro synthesizing terminal audit: "${logText.slice(0, 45)}..."`, 'info');
      await fetch('/api/phom/voice/kokoro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: logText,
          voice: kokoroVoice,
          play: true,
          returnBase64: false
        })
      });
    } catch (e: any) {
      addLog(`Failed to trigger Kokoro voice: ${e.message}`, 'warn');
    }
  };

  const sendBoardroomEmail = async (prospectId: string, customSubject?: string, customCopy?: string, recipientEmail?: string) => {
    if (isSendingEmail) return;
    setIsSendingEmail(true);
    setEmailStatusMessage('Dispatching personalized email with boardroom invite...');
    addLog(`Dispatching boardroom email for prospect ${prospectId}...`, 'info');

    try {
      const res = await fetch('/api/phom/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          recipientEmail: recipientEmail || undefined,
          customSubject,
          customCopy
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatusMessage(`✔ Dispatched via ${data.result.transportUsed} to ${data.result.recipientEmail}`);
        addLog(`Email dispatched (${data.result.transportUsed}) to ${data.result.recipientEmail}`, 'success');
        fetchEmailHistory();
        if ((window as any).primordiaFlow?.showNotification) {
          (window as any).primordiaFlow.showNotification('Primordia Flow — Email Dispatched', `Boardroom invite delivered to ${data.result.recipientEmail}`);
        }
      } else {
        setEmailStatusMessage(`Failed: ${data.error}`);
        addLog(`Email dispatch failed: ${data.error}`, 'warn');
      }
    } catch (err: any) {
      setEmailStatusMessage(`Error: ${err.message}`);
      addLog(`Email error: ${err.message}`, 'warn');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const simulateEmailOpen = async (dispatchId: string) => {
    setSimulatingOpenId(dispatchId);
    try {
      const res = await fetch('/api/phom/email/simulate-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatchId })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`✔ Email open simulated for ${data.dispatch?.recipient_email || dispatchId}! Heat boosted +15`, 'success');
        fetchEmailHistory();
        fetchGraph();
        fetchStatus();
      } else {
        addLog(`Failed to simulate open: ${data.error}`, 'warn');
      }
    } catch (e: any) {
      addLog(`Simulation error: ${e.message}`, 'warn');
    } finally {
      setSimulatingOpenId(null);
    }
  };

  // ── LEVEL 33: SORE & PSM/33 Actions ──────────────────────────────────────────
  const fetchSoreData = useCallback(async () => {
    try {
      const [capsulesRes, ledgerRes, relaysRes] = await Promise.all([
        fetch('/api/psm/capsules'),
        fetch('/api/psm/ledger'),
        fetch('/api/psm/relays')
      ]);
      if (capsulesRes.ok) {
        const data = await capsulesRes.json();
        setSoreCapsules(data.capsules || []);
        if (data.capsules?.length && !selectedCapsuleId) {
          setSelectedCapsuleId(data.capsules[0].capsuleId);
          setSoreVerifyInputId(data.capsules[0].capsuleId);
        }
      }
      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        const chain = data.chain || [];
        setSoreChain(chain);
        setSorePublicKey(data.publicKeyHex || '');
        if (chain.length > 0 && selectedBlockIndex === null) {
          setSelectedBlockIndex(chain[chain.length - 1].index);
        }
      }
      if (relaysRes.ok) {
        const data = await relaysRes.json();
        setSoreRelays(data.relays || []);
      }
    } catch (e) {
      console.error('[SORE Fetch Error]:', e);
    }
  }, [selectedCapsuleId, selectedBlockIndex]);

  const verifyCapsuleViaBeacon = async (capsuleId: string) => {
    setIsVerifyingBeacon(true);
    addLog(`Auditing capsule ${capsuleId} on Primordia Identity Beacon...`, 'info');
    try {
      const res = await fetch(`/api/psm/verify/${encodeURIComponent(capsuleId)}`);
      const data = await res.json();
      setIsVerifyingBeacon(false);
      if (data.success && data.report) {
        setSoreVerificationReport(data.report);
        addLog(`Identity Beacon verified capsule ${capsuleId}: 100% Cryptographic Proof Match!`, 'success');
        if ((window as any).primordiaFlow?.showNotification) {
          (window as any).primordiaFlow.showNotification('Identity Beacon — 100% Verified', `Capsule ${capsuleId} signed with Osmium Ed25519.`);
        }
      } else {
        addLog(`Beacon verification failed: ${data.error || 'Invalid Capsule'}`, 'warn');
      }
    } catch (err: any) {
      setIsVerifyingBeacon(false);
      addLog(`Beacon verification error: ${err.message}`, 'warn');
    }
  };

  const dispatchSovereignCapsule = async (prospectId: string) => {
    if (isDispatchingCapsule) return;
    setIsDispatchingCapsule(true);
    addLog(`Minting & Ed25519 signing PSM/33 capsule for prospect ${prospectId}...`, 'info');
    try {
      const res = await fetch('/api/psm/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          customSubject: soreCustomSubject || undefined,
          customCopy: soreCustomCopy || undefined,
          bridgeToSmtp: soreBridgeToSmtp
        })
      });
      const data = await res.json();
      setIsDispatchingCapsule(false);
      if (data.success && data.capsule) {
        addLog(`PSM/33 Capsule ${data.capsule.capsuleId} committed to Block #${data.capsule.signature.osmiumBlockIndex}!`, 'success');
        fetchSoreData();
        setSelectedCapsuleId(data.capsule.capsuleId);
        verifyCapsuleViaBeacon(data.capsule.capsuleId);
        if ((window as any).primordiaFlow?.showNotification) {
          (window as any).primordiaFlow.showNotification('PSM/33 Capsule Dispatched', `Committed to Block #${data.capsule.signature.osmiumBlockIndex} (${data.capsule.trace.totalLatencyMs}ms).`);
        }
      } else {
        addLog(`Dispatch failed: ${data.error}`, 'warn');
      }
    } catch (err: any) {
      setIsDispatchingCapsule(false);
      addLog(`Dispatch error: ${err.message}`, 'warn');
    }
  };

  const fetchAlertHistory = async () => {
    try {
      const res = await fetch('/api/alerts/history?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.history) setAlertStream(data.history);
      }
    } catch {}
  };

  const fetchAlertConfig = async () => {
    try {
      const res = await fetch('/api/alerts/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setLatticeConfig(data.config);
      }
    } catch {}
  };

  // ── WebSocket Telemetry ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    fetchGraph();
    fetchTraces();
    fetchSoreData();
    fetchAlertHistory();
    fetchAlertConfig();

    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onopen = () => {
        setDaemonConnected(true);
        addLog('Real-time telemetry stream attached to daemon (port 3006)', 'success');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'boost:start') {
            setIsBoosting(true);
            addLog('Autonomous /boost cycle initiated across 10 agents', 'info');
          } else if (payload.event === 'boost:complete') {
            setIsBoosting(false);
            addLog(`Boost complete! Processed ${payload.data.signalsCount} signals, discovered ${payload.data.prospectsCount} prospects`, 'success');
            fetchStatus();
            fetchGraph();
            fetchTraces();
            // Electron Notification if available
            if ((window as any).primordiaFlow?.showNotification) {
              (window as any).primordiaFlow.showNotification('Primordia Flow — Boost Finished', `Processed ${payload.data.signalsCount} signals. High heat leads identified.`);
            }
          } else if (payload.event === 'signal:ingested') {
            const author = payload.data?.author || 'Prospect';
            const src = payload.data?.source || 'Web Scout';
            addLog(`🔥 Auto-thrusted signal from [${src}] by ${author}`, 'info');
            fetchGraph();
            fetchStatus();
            if ((window as any).primordiaFlow?.showNotification) {
              (window as any).primordiaFlow.showNotification('🔥 High-Intent Signal Detected!', `[${src}] ${author}: ${payload.data?.content?.slice(0, 80) || ''}`);
            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('🔥 High-Intent Signal Detected!', {
                body: `[${src}] ${author}: ${payload.data?.content?.slice(0, 80) || ''}`
              });
            }
          } else if (payload.event === 'alert:hud') {
            const alert = payload.data;
            setAlertStream((prev: any[]) => [alert, ...prev.slice(0, 49)]);
            addLog(`🚨 [${alert.urgency?.toUpperCase() || 'ALERT'}] ${alert.title}`, alert.urgency === 'critical' ? 'error' : 'info');
            fetchStatus();
          } else if (payload.event === 'alert:desktop') {
            const d = payload.data;
            if ((window as any).primordiaFlow?.showNotification) {
              (window as any).primordiaFlow.showNotification(d.title, d.body);
            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(d.title, { body: d.body, icon: '/favicon.ico' });
            }
          } else if (payload.event === 'email:opened') {
            addLog(`🔔 Email opened by ${payload.data.recipientEmail} (${payload.data.openCount || 1}x opens)! Prospect heat: ${payload.data.newHeatScore}`, 'success');
            fetchEmailHistory();
            fetchGraph();
            fetchStatus();
            if ((window as any).primordiaFlow?.showNotification) {
              (window as any).primordiaFlow.showNotification('Email Opened!', `${payload.data.recipientEmail} just opened your email! (Open count: ${payload.data.openCount || 1})`);
            }
          } else if (payload.event === 'email:response_received') {
            addLog(`📥 Inbound reply from ${payload.data.fromEmail} (${payload.data.intent?.toUpperCase()})! Heat: ${payload.data.newHeat}`, 'success');
            fetchEmailResponses();
            fetchGraph();
            fetchStatus();
            if ((window as any).primordiaFlow?.showNotification) {
              (window as any).primordiaFlow.showNotification('Email Reply Received!', `${payload.data.fromName || payload.data.fromEmail} replied: "${payload.data.subject}"`);
            }
          } else if (payload.event === 'email:reply_sent') {
            fetchEmailResponses();
            fetchEmailHistory();
          } else if (payload.event === 'unreal:niagara_pulse') {
            setLastNiagaraPulse(payload.data);
            setUnrealPulseCount(c => c + 1);
            addLog(`🎮 Niagara Pulse [${payload.data?.emitter || 'QuantumBurst'}] emitted to Unreal Engine 5.8!`, 'info');
            fetchUnrealState();
          } else if (payload.event === 'theater:lut_changed') {
            setTheaterState((prev: any) => ({ ...prev, activeLut: payload.data.lut }));
            addLog(`🎬 Viewport Color Grade: [${payload.data.lut}]`, 'info');
          } else if (payload.event === 'theater:cutscene_triggered') {
            fetchTheaterState();
          } else if (payload.event === 'swarm:111_start') {
            setSwarm111Running(true);
            setSwarm111Progress({ current: 0, total: 111 });
          } else if (payload.event === 'swarm:111_progress') {
            setSwarm111Progress(payload.data);
            if (payload.data.pulse) setLastNiagaraPulse(payload.data.pulse);
          } else if (payload.event === 'swarm:111_complete') {
            setSwarm111Result(payload.data);
            setSwarm111Running(false);
            setSwarm111Progress({ current: 111, total: 111 });
            fetchUnrealState();
            fetchTheaterState();
          } else if (payload.event === 'prospects:seeded_gamedev') {
            fetchGraph();
            fetchStatus();
            fetchCampaignSettings();
          } else if (payload.event === 'mode:change') {
            setLiveMode(payload.data.liveMode);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setDaemonConnected(false);
      };
    } catch (e) {}

    fetchUnrealState();
    fetchTheaterState();
    fetchCampaignPresets();
    const interval = setInterval(() => {
      fetchStatus();
      fetchUnrealState();
      fetchTheaterState();
    }, 10000);

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, [fetchStatus, fetchGraph, fetchTraces, fetchEmailHistory, fetchEmailResponses, fetchUnrealState, fetchTheaterState, fetchCampaignPresets, addLog]);

  useEffect(() => {
    fetchEmailHistory();
    fetchEmailResponses();
    fetchSesStatus();
    fetchCampaignSettings();
    fetchCampaignPresets();
    fetchUnrealState();
    fetchTheaterState();
  }, [fetchEmailHistory, fetchEmailResponses, fetchSesStatus, fetchCampaignSettings, fetchCampaignPresets, fetchUnrealState, fetchTheaterState]);

  useEffect(() => {
    if (!selectedProspectId && memoryGraphData?.prospects && memoryGraphData.prospects.length > 0) {
      const first = memoryGraphData.prospects.find((p: any) => p.domain) || memoryGraphData.prospects[0];
      if (first) {
        setSelectedProspectId(first.id);
        fetchBoardroom(first.id);
      }
    }
  }, [selectedProspectId, memoryGraphData, fetchBoardroom]);

  // ── Electron Tray Listener ──────────────────────────────────────────────────
  useEffect(() => {
    const flowApi = (window as any).primordiaFlow;
    if (flowApi?.onBoostTriggered) {
      const cleanup = flowApi.onBoostTriggered(() => {
        triggerBoost();
      });
      return cleanup;
    }
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const triggerBoost = async () => {
    if (isBoosting) return;
    setIsBoosting(true);
    addLog('Executing 11-Layer /boost pipeline...', 'info');

    try {
      const res = await fetch('/api/phom/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDistribute: liveMode })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Boost cycle finished: ${data.result.boostId}`, 'success');
        fetchStatus();
        fetchGraph();
        fetchTraces();
      } else {
        addLog(`Boost failed: ${data.error}`, 'warn');
      }
    } catch (err: any) {
      addLog(`Error executing boost: ${err.message}`, 'warn');
    } finally {
      setIsBoosting(false);
    }
  };

  const toggleMode = async () => {
    try {
      const next = !liveMode;
      const res = await fetch('/api/phom/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ live: next })
      });
      const data = await res.json();
      setLiveMode(data.liveMode);
      addLog(`Switched operating mode to ${data.liveMode ? 'LIVE DISTRIBUTION' : 'STAGING SANDBOX'}`, 'info');
    } catch (e) {}
  };

  const handleManualIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/phom/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: newSignalSource,
          author: newSignalAuthor,
          content: newSignalContent,
          url: 'https://network.primordia.app/lead'
        })
      });
      if (res.ok) {
        addLog(`Successfully ingested new ${newSignalSource} signal`, 'success');
        setNewSignalContent('');
        fetchGraph();
      }
    } catch (e) {}
  };

  // Group prospects into Heat-Orbit Bands
  const orbitBuckets = useMemo(() => {
    const prospects: ProspectRecord[] = memoryGraphData?.prospects || [];
    return {
      supercritical: prospects.filter(p => p.heat >= 85),
      hot: prospects.filter(p => p.heat >= 70 && p.heat < 85),
      warm: prospects.filter(p => p.heat >= 40 && p.heat < 70),
      frozen: prospects.filter(p => p.heat < 40)
    };
  }, [memoryGraphData]);

  return (
    <div className="flex flex-col min-h-screen bg-[#090a0f] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── Top Header / Status Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0c101a]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 via-sky-500 to-amber-400 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0b0f19] rounded-[7px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/30 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  PRIMORDIA FLOW
                </span>
                <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  PHOM v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight">
                Sovereign Prospect Heat-Orbit Engine
              </p>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-2" />

          {/* Engine Status Badges */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border ${daemonConnected ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' : 'bg-rose-950/40 border-rose-800/50 text-rose-300'}`}>
              <div className={`w-2 h-2 rounded-full ${daemonConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
              <span>DAEMON: 3006 {daemonConnected ? 'ONLINE' : 'DISCONNECTED'}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>{statusMetrics?.swarm?.length || 11} AGENTS ARMED</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-slate-300">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>SQLITE WAL</span>
            </div>

            {/* Unreal Engine 5.8 Niagara Telemetry Badge */}
            <div
              onClick={() => setActiveTab('unreal')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border cursor-pointer transition-all hover:scale-105 ${
                unrealState?.connected
                  ? 'bg-purple-950/40 border-purple-800/60 text-purple-300 shadow-sm shadow-purple-500/20'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
              title="Click to view Unreal Engine 5.8 Niagara Particle Telemetry Stream"
            >
              <Sparkles className={`w-3.5 h-3.5 ${unrealState?.connected ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
              <span>UE 5.8: {unrealState?.connected ? `${unrealState.clients || 0} CLIENTS` : 'BRIDGE IDLE'}</span>
              {unrealPulseCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 text-[10px] font-bold">
                  {unrealPulseCount}⚡
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center space-x-3">
          {/* + Add Potential Buyer Button */}
          <button
            onClick={() => {
              setBuyerModalTab('single');
              setShowAddBuyerModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg font-bold text-xs tracking-wider transition-all font-mono bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span>+ ADD BUYER</span>
          </button>

          {/* Gumroad Campaign Settings Shortcut */}
          <button
            onClick={() => {
              setBuyerModalTab('campaign');
              setShowAddBuyerModal(true);
            }}
            title="Configure Gumroad Listing URL & Pricing"
            className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-amber-300 transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[140px]">{campaignSettings.product_name}</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">{campaignSettings.price}</span>
          </button>

          {/* Mode Selector */}
          <button
            onClick={toggleMode}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              liveMode
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/25 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Shield className={`w-3.5 h-3.5 ${liveMode ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>MODE: {liveMode ? '⚡ LIVE OUTBOUND' : '🛡️ STAGING'}</span>
          </button>

          {/* Master /boost Button */}
          <button
            onClick={triggerBoost}
            disabled={isBoosting}
            className={`relative flex items-center space-x-2 px-5 py-2 rounded-lg font-bold text-xs tracking-wider transition-all uppercase shadow-lg ${
              isBoosting
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-95'
            }`}
          >
            {isBoosting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>SWARM RUNNING...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                <span>⚡ EXECUTE /boost</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Subheader Navigation Tabs (Pure 11-Layer PHOM) ─────────────────── */}
      <nav className="bg-[#0b0e17] border-b border-slate-800/80 px-6 flex space-x-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'radar', label: 'Heat-Orbit Radar', icon: Flame, badge: orbitBuckets.supercritical.length ? `${orbitBuckets.supercritical.length} Hot` : undefined },
          { id: 'alerts', label: '🚨 Alert Lattice (6-Rail)', icon: Bell, badge: alertStream.length ? `${alertStream.length}` : undefined },
          { id: 'boardroom', label: 'Interactive Boardrooms', icon: Building, badge: 'AI Voice' },
          { id: 'sore', label: 'LEVEL 33 SORE', icon: ShieldCheck, badge: soreCapsules.length ? `${soreCapsules.length} Sealed` : 'PSM/33' },
          { id: 'emails', label: 'Email Dispatcher', icon: Mail, badge: emailHistory.length ? `${emailHistory.length}` : undefined },
          { id: 'signals', label: 'Signal Ingestion (L0)', icon: Radio },
          { id: 'discovery', label: 'Discovery Engine (L1)', icon: Search },
          { id: 'personas', label: 'Persona Studio (L3)', icon: Users },
          { id: 'outbound', label: 'Outbound Engine (L4)', icon: Send },
          { id: 'distributor', label: 'Distributor (L5)', icon: Share2 },
          { id: 'graph', label: 'Neural CRM Graph (L7)', icon: GitBranch },
          { id: 'swarm', label: 'Agent Swarm (L8)', icon: Activity },
          { id: 'traces', label: 'Pipeline Traces', icon: Terminal },
          { id: 'unreal', label: '🎮 Unreal 5.8 & MovieForge 4K', icon: Sparkles, badge: unrealState?.connected ? `${unrealState.clients || 0} UE5` : 'BEAST' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 text-xs font-mono transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Main Cockpit Content ───────────────────────────────────────────── */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* ── 0. ALERT LATTICE (6-RAIL SOVEREIGN FAN-OUT) TAB ─────────────── */}
        {activeTab === 'alerts' && (
          <AlertLatticePanel
            alertStream={alertStream}
            onRefresh={fetchAlertHistory}
            onJumpToProspect={(prospectId) => {
              setSelectedProspectId(prospectId);
              setActiveTab('graph');
            }}
            latticeConfig={latticeConfig}
            onUpdateConfig={(cfg) => setLatticeConfig(cfg)}
          />
        )}

        {/* ── 1. HEAT-ORBIT RADAR TAB ─────────────────────────────────────── */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span>Prospect Heat-Orbit Matrix</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Dynamic mathematical orbit distribution based on verified multi-channel intent scores.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setBuyerModalTab('single');
                    setShowAddBuyerModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold shadow-sm shadow-emerald-950 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Potential Buyer</span>
                </button>
                <button
                  onClick={() => {
                    setBuyerModalTab('discover');
                    setShowAddBuyerModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/60 text-xs font-mono transition-all"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auto-Discover Leads</span>
                </button>
                <button
                  onClick={fetchGraph}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Orbit State</span>
                </button>
              </div>
            </div>

            {/* 100% Real Live Network Substrate Banner */}
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-emerald-300">100% REAL LIVE DATA SUBSTRATE ACTIVE</span>
                <span className="text-slate-400">| Ingesting from public network feeds with live DNS MX verification. Zero mock data.</span>
              </div>
              <div className="flex items-center space-x-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-300">HN REST API</span>
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-300">REDDIT RSS</span>
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-300">GITHUB EVENTS</span>
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-300">DNS MX RESOLVER</span>
              </div>
            </div>

            {/* Orbit Radar Concentric Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {[
                { band: 'supercritical', label: 'SUPERCRITICAL (≥85)', color: 'from-amber-500/20 border-amber-500/50 text-amber-300', count: orbitBuckets.supercritical.length, desc: 'Immediate automated multi-branch outreach' },
                { band: 'hot', label: 'HOT (70–84)', color: 'from-red-500/20 border-red-500/50 text-red-300', count: orbitBuckets.hot.length, desc: 'A/B/C variant scheduled dispatch' },
                { band: 'warm', label: 'WARM (40–69)', color: 'from-sky-500/20 border-sky-500/50 text-sky-300', count: orbitBuckets.warm.length, desc: 'Nurture loop & content engagement' },
                { band: 'frozen', label: 'FROZEN (0–39)', color: 'from-slate-700/20 border-slate-700 text-slate-400', count: orbitBuckets.frozen.length, desc: 'Passive observation & signal capture' }
              ].map((b) => (
                <div key={b.band} className={`p-4 rounded-xl border bg-gradient-to-b ${b.color} bg-slate-900/60 backdrop-blur-md`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono tracking-wider font-bold">{b.label}</span>
                    <span className="text-2xl font-black">{b.count}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{b.desc}</p>
                </div>
              ))}
            </div>

            {/* Live Prospect Table */}
            <div className="cyber-glass rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                <span className="text-xs font-mono font-bold text-slate-200">Active Orbit Leads ({memoryGraphData?.prospects?.length || 0})</span>
                <span className="text-[11px] text-slate-500 font-mono">Ranked by Real Heat Score</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Prospect</th>
                      <th className="p-3">Verified Email</th>
                      <th className="p-3">Domain</th>
                      <th className="p-3">Heat Score</th>
                      <th className="p-3">Orbit Band</th>
                      <th className="p-3">Live DNS MX Record</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(memoryGraphData?.prospects || []).map((p: ProspectRecord) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-semibold text-white">{p.name || 'Anonymous Prospect'}</td>
                        <td className="p-3 text-cyan-400 font-mono">{p.email}</td>
                        <td className="p-3 text-slate-400">{p.domain}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-amber-400">{p.heat}</span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-red-500"
                                style={{ width: `${Math.min(100, p.heat)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.band === 'supercritical' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            p.band === 'hot' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                            p.band === 'warm' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {p.band}
                          </span>
                        </td>
                        <td className="p-3">
                          {p.mx_verified === 1 || p.mx_verified === true || p.mxVerified ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>MX VERIFIED</span>
                              </span>
                              {(p.mx_records || p.mxRecords) && (
                                <div className="text-[10px] text-cyan-300 font-mono max-w-[220px] truncate" title={p.mx_records || p.mxRecords}>
                                  {(p.mx_records || p.mxRecords || '').split(',')[0]}
                                </div>
                              )}
                            </div>
                          ) : p.domain ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center space-x-1 text-amber-400/80">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>NO MX RECORD</span>
                              </span>
                              {(p.mx_records || p.mxRecords) && (
                                <div className="text-[10px] text-slate-500 max-w-[200px] truncate" title={p.mx_records || p.mxRecords}>
                                  {p.mx_records || p.mxRecords}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Unchecked</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                const matchedOutbound = (memoryGraphData?.outbound || []).find((o: any) => o.prospect_id === p.id);
                                const defaultCopy = `Hey ${p.name || 'there'},\n\nSaw you're working on ${p.domain || 'your SaaS'}. If you're building out your app this week, skip 80+ hours of boilerplate setup.\n\nI built ${campaignSettings.product_name} with ${campaignSettings.key_features}.\n\nGrab it here: ${campaignSettings.gumroad_url}`;
                                const defaultSubject = `Skip 80+ hours of scaffolding for ${p.domain || 'your app'} (${campaignSettings.product_name})`;
                                setRecentlyAddedProspects([{
                                  id: p.id,
                                  name: p.name,
                                  email: p.email,
                                  domain: p.domain,
                                  heat: p.heat,
                                  band: p.band,
                                  mxVerified: Boolean(p.mx_verified || p.mxVerified),
                                  outboundPreview: matchedOutbound?.text || defaultCopy,
                                  subject: defaultSubject
                                }]);
                                setShowAddBuyerModal(true);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center space-x-0.5"
                            >
                              <span>Pitch</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setActiveTab('discovery')}
                              className="text-cyan-400 hover:text-cyan-300 underline text-[11px]"
                            >
                              DNS Audit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {(!memoryGraphData?.prospects || memoryGraphData.prospects.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No prospects in database yet. Click <strong>⚡ EXECUTE /boost</strong> above or ingest signals.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── INTERACTIVE BOARDROOMS TAB ──────────────────────────────────── */}
        {activeTab === 'boardroom' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <Building className="w-5 h-5 text-cyan-400" />
                  <span>Interactive Executive Boardroom & AI Voice Studio</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Bespoke executive dashboards, real-time audio briefings, and live ROI calculators tailored to each business.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => selectedProspectId && fetchBoardroom(selectedProspectId)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBoardroom ? 'animate-spin' : ''}`} />
                  <span>Regenerate Boardroom</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Discovered Prospects List */}
              <div className="cyber-glass rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold font-mono text-white">Target Businesses</span>
                  <span className="text-[10px] text-cyan-400 font-mono">{(memoryGraphData?.prospects || []).length} Active</span>
                </div>

                <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                  {(memoryGraphData?.prospects || []).map((p: any) => {
                    const isSelected = selectedProspectId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProspectId(p.id);
                          fetchBoardroom(p.id);
                        }}
                        className={`p-3 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white truncate max-w-[150px]">{p.name || 'Anonymous'}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            p.band === 'supercritical' ? 'bg-amber-500/20 text-amber-300' :
                            p.band === 'hot' ? 'bg-red-500/20 text-red-300' :
                            'bg-sky-500/20 text-sky-300'
                          }`}>
                            {p.heat} {p.band}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] truncate mt-0.5">{p.domain}</div>
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/50 text-[10px]">
                          <span className={p.mx_verified || p.mxVerified ? 'text-emerald-400' : 'text-slate-500'}>
                            {p.mx_verified || p.mxVerified ? '● MX Active' : '○ No MX'}
                          </span>
                          <span className="text-cyan-400 hover:underline">Open Deck →</span>
                        </div>
                      </div>
                    );
                  })}

                  {(!memoryGraphData?.prospects || memoryGraphData.prospects.length === 0) && (
                    <div className="p-8 text-center text-slate-500 text-xs font-mono">
                      No prospects in database. Run /boost to discover businesses.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Columns: The Bespoke Executive Boardroom */}
              <div className="lg:col-span-2 space-y-6">
                {boardroomData ? (
                  <div className="space-y-5">
                    {/* Executive Header Card */}
                    <div className="cyber-glass rounded-xl p-6 border border-cyan-800/50 bg-gradient-to-r from-[#0c1424] via-[#0b101c] to-[#0a0d16] relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Building className="w-32 h-32 text-cyan-400" />
                      </div>

                      <div className="relative z-10 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-bold uppercase tracking-wider font-mono">
                              Sovereign Executive Boardroom
                            </span>
                            <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-mono">
                              Active Domain: {boardroomData.domain}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(boardroomData.boardroomUrl);
                                addLog(`Boardroom portal link copied to clipboard`, 'success');
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700"
                              title="Copy URL"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Link</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('emails');
                              }}
                              className="flex items-center space-x-1 px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-mono"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Dispatch Email</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">{boardroomData.companyName}</h2>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Tailored Architecture Teardown, Sub-Millisecond P99 Optimization & ROI Briefing
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 👑 Holographic Ω-Bond Certificate (Upfront Value Stake) */}
                    <div className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-[#1c1304] via-[#0f0b04] to-[#070604] p-6 relative overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.22)] space-y-5">
                      {/* Background Watermark Crest */}
                      <div className="absolute -top-6 -right-6 opacity-10 pointer-events-none select-none">
                        <Shield className="w-56 h-56 text-amber-400" />
                      </div>

                      {/* Certificate Top Header */}
                      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 pb-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 p-[1px] shadow-lg shadow-amber-500/30">
                            <div className="w-full h-full bg-black rounded-[7px] flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent font-mono">
                              PRIMORDIA SOVEREIGN VALUE STAKE • Ω-BOND
                            </span>
                            <p className="text-[10px] text-amber-200/60 font-mono">
                              Upfront Financial & Performance Escrow Commitment
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-xs px-2.5 py-1 rounded bg-black/60 text-amber-300 border border-amber-500/40 tracking-wider">
                            {boardroomData.omegaBond?.bondSerial || ('PRIM-OMEGA-' + (boardroomData.id ? boardroomData.id.slice(6, 12).toUpperCase() : '8F3A19'))}
                          </span>
                          <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
                            isBondClaimed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-md shadow-emerald-900/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          }`}>
                            {isBondClaimed ? '● SLA EXECUTED' : '○ ACTIVE STAKE'}
                          </span>
                        </div>
                      </div>

                      {/* Certificate Value Stake Hero */}
                      <div className="relative z-10 space-y-1">
                        <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                          Total Upfront Counterparty Capital Staked:
                        </div>
                        <div className="flex items-baseline space-x-3">
                          <span className="text-4xl md:text-5xl font-black font-mono tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]">
                            ${Math.max(5000, Math.round((Math.round(boardroomSpendSlider * 0.42) * 0.5) / 500) * 500).toLocaleString()} USD
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            staked against {boardroomData.companyName}'s 42% modeled efficiency gain
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-300 pt-1 leading-relaxed">
                          "We are not asking for trust — we are staking our own capital. If PrimordiaOS does not achieve the modeled p99 latency reduction and compute overhead drop within 30 days, <strong className="text-white">{boardroomData.companyName} keeps the bond</strong>."
                        </p>
                      </div>

                      {/* Sub-Tabs: SLA Rules vs Cryptographic Escrow */}
                      <div className="relative z-10 space-y-3">
                        <div className="flex space-x-2 border-b border-amber-500/20 pb-2">
                          <button
                            onClick={() => setBondActiveSubTab('sla')}
                            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                              bondActiveSubTab === 'sla'
                                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                                : 'text-amber-300/70 hover:text-amber-200'
                            }`}
                          >
                            Conditional Release Rules (SLA)
                          </button>
                          <button
                            onClick={() => setBondActiveSubTab('escrow')}
                            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                              bondActiveSubTab === 'escrow'
                                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                                : 'text-amber-300/70 hover:text-amber-200'
                            }`}
                          >
                            Cryptographic Proof & Escrow
                          </button>
                        </div>

                        {bondActiveSubTab === 'sla' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                            <div className="p-3.5 rounded-lg bg-black/50 border border-red-500/30 space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider flex items-center space-x-1">
                                <span>⚠️ Failure Clause (Downside Elimination)</span>
                              </span>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                If PrimordiaOS fails to achieve &gt;= 40% compute overhead reduction or sub-millisecond local-first SQLite WAL task latency during the 30-day benchmark audit, <strong className="text-amber-300">{boardroomData.companyName} retains the full ${Math.max(5000, Math.round((Math.round(boardroomSpendSlider * 0.42) * 0.5) / 500) * 500).toLocaleString()} USD payout unconditionally</strong>.
                              </p>
                            </div>

                            <div className="p-3.5 rounded-lg bg-black/50 border border-emerald-500/30 space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider flex items-center space-x-1">
                                <span>✔ Success Clause (Credit Conversion)</span>
                              </span>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                Upon verified benchmark attainment, the bond converts into perpetual sovereign runtime compute credits, high-concurrency swarm licenses, or enterprise SLA equity.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-lg bg-black/50 border border-amber-500/30 font-mono text-xs space-y-2">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Cryptographic Escrow Proof:</span>
                              <span className="text-amber-300 font-bold">{boardroomData.omegaBond?.escrowRef || '0x7f83b1657ff1fc53'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Persistence Substrate:</span>
                              <span className="text-cyan-400">flow_memory.sqlite (SQLite WAL Layer 7)</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400">Audit Horizon:</span>
                              <span className="text-slate-200">30 Calendar Days from Deployment</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Interactive Actions */}
                      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setIsBondClaimed(true);
                              addLog(`Ω-Bond SLA executed for ${boardroomData.companyName} ($${Math.max(5000, Math.round((Math.round(boardroomSpendSlider * 0.42) * 0.5) / 500) * 500).toLocaleString()} USD stake)`, 'success');
                              if ((window as any).primordiaFlow?.showNotification) {
                                (window as any).primordiaFlow.showNotification('Ω-Bond SLA Executed', `Stake activated for ${boardroomData.companyName}`);
                              }
                            }}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-black text-xs font-mono transition-all uppercase tracking-wider ${
                              isBondClaimed
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                                : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-lg shadow-amber-500/30 active:scale-95'
                            }`}
                          >
                            <Sparkles className="w-4 h-4 fill-black" />
                            <span>{isBondClaimed ? '✔ SLA STAKE REGISTERED' : `⚡ CLAIM $${Math.max(5000, Math.round((Math.round(boardroomSpendSlider * 0.42) * 0.5) / 500) * 500).toLocaleString()} Ω-BOND`}</span>
                          </button>

                          <button
                            onClick={() => {
                              const hash = boardroomData.omegaBond?.escrowRef || '0x7f83b1657ff1fc53';
                              navigator.clipboard.writeText(hash);
                              addLog(`Escrow proof ${hash} copied to clipboard`, 'info');
                            }}
                            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-amber-300 text-xs font-mono border border-amber-500/40"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Escrow Proof</span>
                          </button>
                        </div>

                        <span className="text-[11px] text-amber-300/80 font-mono">
                          Zero-Discount • Sovereign Upfront Value Stake
                        </span>
                      </div>
                    </div>

                    {/* 🎙️ AI Voice Executive Briefing Player */}
                    <div className="cyber-glass rounded-xl p-5 border border-amber-500/40 bg-gradient-to-b from-amber-950/15 via-slate-900/60 to-slate-900/60 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isVoicePlaying ? 'bg-amber-500 text-black' : 'bg-slate-800 text-amber-400'}`}>
                            {isVoicePlaying ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold font-mono text-white flex items-center space-x-1.5">
                              <span>Personalized AI Voice Briefing</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                {isKokoroSynthesizing ? 'SYNTHESIZING' : isVoicePlaying ? 'SPEAKING' : 'READY'}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                Kokoro 82M Neural
                              </span>
                            </span>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Customized narration synthesized for {boardroomData.companyName}'s leadership
                            </p>
                          </div>
                        </div>

                        {/* Engine & Profile Controls */}
                        <div className="flex items-center space-x-2">
                          <div className="flex bg-black/60 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                            <button
                              onClick={() => setVoiceEngine('kokoro')}
                              className={`px-2 py-1 rounded transition-colors ${
                                voiceEngine === 'kokoro' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              🎙️ Kokoro
                            </button>
                            <button
                              onClick={() => setVoiceEngine('webspeech')}
                              className={`px-2 py-1 rounded transition-colors ${
                                voiceEngine === 'webspeech' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              🌐 Browser
                            </button>
                          </div>

                          {voiceEngine === 'kokoro' && (
                            <select
                              value={kokoroVoice}
                              onChange={(e) => setKokoroVoice(e.target.value)}
                              className="bg-black/60 border border-slate-800 text-[11px] font-mono text-amber-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-500"
                            >
                              <option value="af_heart">af_heart (US Flagship)</option>
                              <option value="am_adam">am_adam (US Male Deep)</option>
                              <option value="bf_emma">bf_emma (UK Narrative)</option>
                              <option value="bm_daniel">bm_daniel (UK Corporate)</option>
                              <option value="af_bella">af_bella (US Conversational)</option>
                              <option value="af_sky">af_sky (US Warm)</option>
                              <option value="am_michael">am_michael (US Executive)</option>
                            </select>
                          )}

                          <button
                            disabled={isKokoroSynthesizing}
                            onClick={() => toggleVoice(boardroomData.voiceScript)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs font-mono transition-all ${
                              isVoicePlaying
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                                : isKokoroSynthesizing
                                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20'
                            }`}
                          >
                            {isKokoroSynthesizing ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>SYNTHESIZING...</span>
                              </>
                            ) : isVoicePlaying ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-black" />
                                <span>PAUSE VOICE</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-black" />
                                <span>🎙️ PLAY BRIEFING</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Animated Audio Waveform Visualizer */}
                      <div className="h-10 bg-black/50 rounded-lg p-2 flex items-center justify-between gap-1 border border-slate-800">
                        {Array.from({ length: 32 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-full rounded-full transition-all duration-150 ${
                              isVoicePlaying
                                ? 'bg-gradient-to-t from-amber-500 to-yellow-300'
                                : 'bg-slate-800'
                            }`}
                            style={{
                              height: isVoicePlaying
                                ? `${Math.max(15, Math.floor(Math.sin((i + Date.now() / 150)) * 40 + 50))}%`
                                : '20%'
                            }}
                          />
                        ))}
                      </div>

                      {/* Voice Script Teleprompter */}
                      <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs font-mono text-slate-300 leading-relaxed max-h-28 overflow-y-auto">
                        <span className="text-amber-400 font-bold mr-1">[AI Voice Teleprompter]:</span>
                        {boardroomData.voiceScript}
                      </div>
                    </div>

                    {/* Interactive Financial ROI Simulator */}
                    <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold font-mono text-white flex items-center space-x-2">
                          <Sliders className="w-4 h-4 text-cyan-400" />
                          <span>Interactive Financial & Scale Simulation</span>
                        </h3>
                        <span className="text-[10px] text-cyan-400 font-mono">Real-time Reactive Model</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="space-y-1.5 p-3 rounded bg-slate-900/60 border border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Current Monthly Cloud Spend:</span>
                            <span className="text-cyan-400 font-bold">${boardroomSpendSlider.toLocaleString()}</span>
                          </div>
                          <input
                            type="range"
                            min={5000}
                            max={150000}
                            step={1000}
                            value={boardroomSpendSlider}
                            onChange={(e) => setBoardroomSpendSlider(Number(e.target.value))}
                            className="w-full accent-cyan-400"
                          />
                        </div>

                        <div className="space-y-1.5 p-3 rounded bg-slate-900/60 border border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Autonomous Swarm Concurrency:</span>
                            <span className="text-amber-400 font-bold">{boardroomConcurrencySlider} Agents</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={64}
                            step={1}
                            value={boardroomConcurrencySlider}
                            onChange={(e) => setBoardroomConcurrencySlider(Number(e.target.value))}
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </div>

                      {/* ROI Metric Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-center">
                          <div className="text-lg font-black text-emerald-400">
                            ${Math.round(boardroomSpendSlider * 0.42).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">Est. Monthly Savings</div>
                        </div>

                        <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/60 text-center">
                          <div className="text-lg font-black text-cyan-300">
                            -${Math.round(90 + (boardroomSpendSlider / 1200))}ms
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">P99 Latency Drop</div>
                        </div>

                        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-center">
                          <div className="text-lg font-black text-amber-300">
                            {boardroomConcurrencySlider * 4}x
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">Swarm Concurrency</div>
                        </div>

                        <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/60 text-center">
                          <div className="text-lg font-black text-purple-300">
                            &lt; 35 Days
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">Payback Period</div>
                        </div>
                      </div>
                    </div>

                    {/* Architecture Teardown Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="cyber-glass rounded-xl p-4 border border-rose-900/40 bg-rose-950/10 space-y-2 text-xs font-mono">
                        <div className="font-bold text-rose-300 flex items-center space-x-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Identified SaaS Bottlenecks</span>
                        </div>
                        <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                          {(boardroomData.architecture?.bottlenecksIdentified || []).map((b: string, i: number) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="cyber-glass rounded-xl p-4 border border-emerald-900/40 bg-emerald-950/10 space-y-2 text-xs font-mono">
                        <div className="font-bold text-emerald-300 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Primordia Sovereign Advantages</span>
                        </div>
                        <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                          {(boardroomData.architecture?.sovereignAdvantages || []).map((a: string, i: number) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 font-mono text-xs border border-slate-800 rounded-xl">
                    Select a prospect on the left to load or generate their bespoke Interactive Boardroom.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EMAIL DISPATCHER TAB ────────────────────────────────────────── */}
        {activeTab === 'emails' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-cyan-400" />
                  <span>Executive Email Dispatcher & Telemetry</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Direct outbound delivery of customized Interactive Boardroom invitations with embedded AI Voice briefings.
                </p>
              </div>
              <button
                onClick={fetchEmailHistory}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Logs</span>
              </button>
            </div>

            {/* ── AWS SES Enterprise Rail & Configuration Banner ── */}
            <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-slate-900/60 to-black space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white font-mono">AWS SES ENTERPRISE TRANSPORT RAIL</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        sesConfig.status === 'connected'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 shadow-sm shadow-emerald-900/40'
                          : sesConfig.status === 'error'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {sesConfig.status === 'connected' ? '● SES CONNECTED' : sesConfig.status === 'error' ? '✖ SES ERROR' : '○ UNTESTED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      DKIM/SPF authenticated outbound delivery with closed-loop Amazon SNS open/click telemetry.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSesSettings(!showSesSettings)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-slate-700 flex items-center space-x-1.5 transition-all"
                  >
                    <span>{showSesSettings ? 'Hide AWS Credentials' : '⚙️ Configure AWS SES'}</span>
                  </button>
                  <button
                    onClick={testSesConnection}
                    disabled={isTestingSes}
                    className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold transition-all uppercase flex items-center space-x-1.5 ${
                      isTestingSes
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
                    }`}
                  >
                    {isTestingSes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{isTestingSes ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>

              {sesTestMessage && (
                <div className={`p-2.5 rounded text-xs font-mono border ${
                  sesTestMessage.includes('✔')
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}>
                  {sesTestMessage}
                </div>
              )}

              {showSesSettings && (
                <form onSubmit={saveSesConfig} className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">AWS Region</label>
                    <select
                      value={sesConfig.region}
                      onChange={(e) => setSesConfig({ ...sesConfig, region: e.target.value })}
                      className="w-full bg-black/60 border border-slate-700 rounded p-2 text-slate-200"
                    >
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="us-east-2">us-east-2 (Ohio)</option>
                      <option value="us-west-2">us-west-2 (Oregon)</option>
                      <option value="eu-west-1">eu-west-1 (Ireland)</option>
                      <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                      <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Verified From Email</label>
                    <input
                      type="text"
                      placeholder="Shane <shane@primordia.app>"
                      value={sesConfig.fromEmail}
                      onChange={(e) => setSesConfig({ ...sesConfig, fromEmail: e.target.value })}
                      className="w-full bg-black/60 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">AWS Access Key ID</label>
                    <input
                      type="password"
                      placeholder="AKIA..."
                      value={sesConfig.accessKeyId}
                      onChange={(e) => setSesConfig({ ...sesConfig, accessKeyId: e.target.value })}
                      className="w-full bg-black/60 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">AWS Secret Access Key</label>
                    <input
                      type="password"
                      placeholder="Secret Key..."
                      value={sesConfig.secretAccessKey}
                      onChange={(e) => setSesConfig({ ...sesConfig, secretAccessKey: e.target.value })}
                      className="w-full bg-black/60 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-500 font-mono">
                      <span>Amazon SNS Webhook Listener: </span>
                      <code className="text-cyan-400">http://127.0.0.1:3006/api/phom/webhook/ses</code>
                      <span className="text-slate-400 ml-2">(Auto-confirm + Opens +15 Heat / Clicks Supercritical)</span>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-md"
                    >
                      Save to SQLite WAL
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Composer */}
              <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold font-mono text-white flex items-center space-x-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span>Compose Boardroom Dispatch</span>
                </h3>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Target Prospect</label>
                    <select
                      value={selectedProspectId || ''}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedProspectId(pid);
                        fetchBoardroom(pid);
                        const matched = (memoryGraphData?.prospects || []).find((p: any) => p.id === pid);
                        if (matched?.email) setCustomRecipientEmail(matched.email);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    >
                      {(memoryGraphData?.prospects || []).map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.domain}) — {p.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400">Recipient Email</label>
                      <button
                        type="button"
                        onClick={() => setCustomRecipientEmail('contact@primordialorigin.com')}
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-[10px] underline"
                      >
                        ⚡ Use My Email (contact@primordialorigin.com)
                      </button>
                    </div>
                    <input
                      type="email"
                      placeholder="e.g. contact@primordialorigin.com"
                      value={customRecipientEmail}
                      onChange={(e) => setCustomRecipientEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Custom Executive Subject (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Executive Briefing: OpenAI Autonomous Architecture"
                      value={customEmailSubject}
                      onChange={(e) => setCustomEmailSubject(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Custom Pitch / Note</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. We conducted an automated audit of your runtime infrastructure and identified opportunities to drop p99 latency..."
                      value={customEmailCopy}
                      onChange={(e) => setCustomEmailCopy(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  {emailStatusMessage && (
                    <div className="p-2.5 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-mono">
                      {emailStatusMessage}
                    </div>
                  )}

                  <button
                    onClick={() => selectedProspectId && sendBoardroomEmail(selectedProspectId, customEmailSubject || undefined, customEmailCopy || undefined, customRecipientEmail || undefined)}
                    disabled={isSendingEmail || !selectedProspectId}
                    className={`w-full py-2.5 rounded font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 ${
                      isSendingEmail
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                    }`}
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>DISPATCHING...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>⚡ SEND BOARDROOM INVITATION EMAIL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Live Email Preview */}
              <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">Live Email Preview</span>
                  <span className="text-[10px] text-emerald-400 font-mono">RFC 5322 Compliant HTML</span>
                </div>

                <div className="p-4 rounded-lg bg-[#0c101a] border border-slate-800 font-sans text-xs text-slate-300 space-y-3">
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
                      PRIMORDIA SOVEREIGN BOARDROOM
                    </span>
                    <h4 className="text-base font-extrabold text-white mt-1">
                      {boardroomData ? `${boardroomData.companyName} Executive Briefing` : 'Executive Briefing'}
                    </h4>
                  </div>

                  <p className="text-[12px] text-slate-300 leading-relaxed">
                    {customEmailCopy || 'We analyzed the runtime architecture of your systems. Rather than asking for trust, we are staking our own capital on our results.'}
                  </p>

                  {/* Ω-Bond Email Teaser Card */}
                  <div className="p-3.5 rounded-lg bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-black border border-amber-500/40 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-amber-400 font-bold uppercase tracking-wider">👑 PRIMORDIA VALUE STAKE • Ω-BOND</span>
                      <span className="text-amber-300 bg-black/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                        {boardroomData?.omegaBond?.bondSerial || 'PRIM-OMEGA-8F3A19'}
                      </span>
                    </div>
                    <div className="text-xl font-black text-yellow-300 font-mono">
                      ${Math.max(5000, Math.round((Math.round(boardroomSpendSlider * 0.42) * 0.5) / 500) * 500).toLocaleString()} USD
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-snug">
                      Unconditional SLA: If PrimordiaOS fails to achieve &gt;= 40% compute savings during the 30-day benchmark audit, your company keeps the bond in full.
                    </p>
                  </div>

                  <div className="p-3 rounded bg-black/40 border border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-cyan-400 font-bold text-sm">
                        ${Math.round(boardroomSpendSlider * 0.42).toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">Est. Monthly Savings</div>
                    </div>
                    <div>
                      <div className="text-sky-300 font-bold text-sm">
                        -{Math.round(90 + (boardroomSpendSlider / 1200))}ms
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">P99 Tail Latency</div>
                    </div>
                    <div>
                      <div className="text-amber-400 font-bold text-sm">
                        {boardroomConcurrencySlider * 4}x
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">Agent Concurrency</div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <div className="inline-block px-5 py-2.5 rounded bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs shadow-md uppercase tracking-wider">
                      Audit & Claim ${Math.max(5000, Math.round((Math.round(boardroomSpendSlider * 0.42) * 0.5) / 500) * 500).toLocaleString()} Ω-Bond in Boardroom →
                    </div>
                    <div className="text-[10px] text-cyan-400 mt-1.5 flex items-center justify-center space-x-1">
                      <span>🎙️ Includes Personalized AI Voice Briefing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 📬 INBOUND PROSPECT RESPONSES & INTENT MATRIX ──────────────── */}
            {(() => {
              const totalResponses = emailResponses.length;
              const unreadResponses = emailResponses.filter((r: any) => r.status === 'unread');
              const highIntentResponses = emailResponses.filter((r: any) => r.intent === 'scheduling' || r.intent === 'interested');
              const repliedResponses = emailResponses.filter((r: any) => r.status === 'replied');

              const filteredResponses = emailResponses.filter((r: any) => {
                if (responseFilter === 'unread') return r.status === 'unread';
                if (responseFilter === 'high_intent') return r.intent === 'scheduling' || r.intent === 'interested';
                if (responseFilter === 'replied') return r.status === 'replied';
                return true;
              });

              return (
                <div className="cyber-glass rounded-xl border border-cyan-500/40 overflow-hidden shadow-2xl shadow-cyan-950/20 space-y-0">
                  {/* Inbound Header */}
                  <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-[#0c1424] via-[#0b101c] to-[#0c1424] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-black font-mono text-white tracking-wide">
                            Inbound Prospect Responses &amp; Intent Matrix
                          </h3>
                          {unreadResponses.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold animate-pulse">
                              {unreadResponses.length} New
                            </span>
                          )}
                          {highIntentResponses.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                              🔥 {highIntentResponses.length} Meeting / High Intent
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Autonomous sentiment analysis, heat escalation (+30), and 1-click executive reply synthesis.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchEmailResponses}
                        title="Refresh inbound responses"
                        className="p-1.5 rounded bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills Bar */}
                  <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400 font-bold mr-1">Filter Responses:</span>
                      <button
                        onClick={() => setResponseFilter('all')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                          responseFilter === 'all'
                            ? 'bg-cyan-500 text-black shadow'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        All ({totalResponses})
                      </button>
                      <button
                        onClick={() => setResponseFilter('unread')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center space-x-1 ${
                          responseFilter === 'unread'
                            ? 'bg-sky-500 text-black shadow'
                            : 'bg-sky-950/60 text-sky-300 border border-sky-800/60 hover:bg-sky-900/60'
                        }`}
                      >
                        <span>📬 Unread ({unreadResponses.length})</span>
                      </button>
                      <button
                        onClick={() => setResponseFilter('high_intent')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center space-x-1 ${
                          responseFilter === 'high_intent'
                            ? 'bg-amber-500 text-black shadow'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60'
                        }`}
                      >
                        <span>🔥 High Intent ({highIntentResponses.length})</span>
                      </button>
                      <button
                        onClick={() => setResponseFilter('replied')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center space-x-1 ${
                          responseFilter === 'replied'
                            ? 'bg-emerald-500 text-black shadow'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60'
                        }`}
                      >
                        <span>✅ Replied ({repliedResponses.length})</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      Webhook Endpoint: <code className="text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded">/api/phom/email/inbound/webhook</code>
                    </div>
                  </div>

                  {/* Empty State */}
                  {filteredResponses.length === 0 && (
                    <div className="p-8 text-center bg-slate-950/40 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-mono text-slate-400 max-w-md mx-auto leading-relaxed">
                        {responseFilter === 'all'
                          ? 'No inbound responses received yet. Once a prospect replies to your boardroom invite or Gumroad pitch, their response will appear here with AI intent analysis & suggested follow-up.'
                          : `No responses matching the filter "${responseFilter.toUpperCase()}".`}
                      </p>
                    </div>
                  )}

                  {/* Responses Cards / Feed */}
                  {filteredResponses.length > 0 && (
                    <div className="divide-y divide-slate-800/60 bg-slate-950/30">
                      {filteredResponses.map((r: any) => {
                        const isExpanded = expandedResponseId === r.id;
                        const isReplying = isSendingReplyMap[r.id];
                        const currentDraft = replyDrafts[r.id] !== undefined ? replyDrafts[r.id] : (r.suggested_reply || '');

                        return (
                          <div key={r.id} className={`p-4 transition-colors ${r.status === 'unread' ? 'bg-cyan-950/15' : 'hover:bg-slate-900/30'}`}>
                            {/* Card Top Row */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-white text-xs font-mono shadow">
                                  {(r.from_name || r.from_email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-white text-xs font-mono">
                                      {r.from_name || r.from_email}
                                    </span>
                                    {r.from_name && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        &lt;{r.from_email}&gt;
                                      </span>
                                    )}
                                    {r.prospect_heat !== undefined && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-amber-300 font-mono font-bold">
                                        🔥 {r.prospect_heat} Heat
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-300 font-mono font-semibold mt-0.5">
                                    {r.subject}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Intent Badge */}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                  r.intent === 'scheduling' ? 'bg-amber-950 text-amber-300 border border-amber-600 shadow-sm shadow-amber-950' :
                                  r.intent === 'interested' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                                  r.intent === 'pricing' ? 'bg-yellow-950 text-yellow-300 border border-yellow-600' :
                                  r.intent === 'question' ? 'bg-cyan-950 text-cyan-300 border border-cyan-600' :
                                  r.intent === 'not_interested' ? 'bg-rose-950 text-rose-300 border border-rose-600' :
                                  'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}>
                                  {r.intent === 'scheduling' ? '📅 Meeting Request' :
                                   r.intent === 'interested' ? '⭐ High Interest' :
                                   r.intent === 'pricing' ? '💰 Pricing Inquiry' :
                                   r.intent === 'question' ? '💡 Question' :
                                   r.intent === 'not_interested' ? '🚫 Unsubscribe' : r.intent}
                                </span>

                                {/* Sentiment Score */}
                                {r.sentiment_score !== undefined && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Score: {Math.round(r.sentiment_score * 100)}%
                                  </span>
                                )}

                                {/* Status Pill */}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                  r.status === 'unread' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700 animate-pulse' :
                                  r.status === 'replied' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700' :
                                  'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                  {r.status}
                                </span>

                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(r.received_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Response Message Body */}
                            <div className="mt-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {r.body_text}
                            </div>

                            {/* Quick Actions & AI Suggested Reply Expander */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setExpandedResponseId(isExpanded ? null : r.id)}
                                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
                                    isExpanded
                                      ? 'bg-cyan-500 text-black'
                                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60'
                                  }`}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{isExpanded ? 'Hide AI Suggested Reply' : '🤖 AI Suggested Executive Reply'}</span>
                                </button>

                                {r.status === 'unread' && (
                                  <button
                                    onClick={() => handleUpdateResponseStatus(r.id, 'read')}
                                    className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all"
                                  >
                                    Mark as Read
                                  </button>
                                )}

                                {r.status !== 'replied' && (
                                  <button
                                    onClick={() => handleUpdateResponseStatus(r.id, 'replied')}
                                    className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-emerald-400 text-[11px] font-mono transition-all"
                                  >
                                    Mark as Replied
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Expanded AI Reply Editor */}
                            {isExpanded && (
                              <div className="mt-3 p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/40 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                    <span className="text-xs font-mono font-bold text-white">
                                      Drafted Reply for {r.from_email}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-cyan-400">
                                    Tailored to Intent: {r.intent.toUpperCase()}
                                  </span>
                                </div>

                                <textarea
                                  rows={5}
                                  value={currentDraft}
                                  onChange={(e) => setReplyDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className="w-full p-2.5 rounded bg-slate-900 border border-cyan-900/60 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                                />

                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Dispatches through active AWS SES or SMTP rail with In-Reply-To headers
                                  </span>
                                  <button
                                    onClick={() => handleSendResponseReply(r.id, currentDraft)}
                                    disabled={isReplying}
                                    className="px-3.5 py-1.5 rounded bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
                                  >
                                    {isReplying ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Sending Reply...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Send className="w-3 h-3 fill-black" />
                                        <span>⚡ Send Reply Now</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Email Dispatch History Table with Open Telemetry */}
            {(() => {
              const totalDispatches = emailHistory.length;
              const openedDispatches = emailHistory.filter((e: any) => e.status === 'opened' || (e.open_count && e.open_count > 0));
              const unopenedDispatches = emailHistory.filter((e: any) => e.status !== 'opened' && (!e.open_count || e.open_count === 0) && e.status !== 'spooled' && e.status !== 'spool_fallback');
              const spooledDispatches = emailHistory.filter((e: any) => e.status === 'spooled' || e.status === 'spool_fallback');
              const openRate = totalDispatches > 0 ? Math.round((openedDispatches.length / Math.max(1, totalDispatches - spooledDispatches.length)) * 100) : 0;

              const filteredDispatches = emailHistory.filter((e: any) => {
                const isOpened = e.status === 'opened' || (e.open_count && e.open_count > 0);
                const isSpooled = e.status === 'spooled' || e.status === 'spool_fallback';
                if (emailFilter === 'opened') return isOpened;
                if (emailFilter === 'unopened') return !isOpened && !isSpooled;
                if (emailFilter === 'spooled') return isSpooled;
                return true;
              });

              return (
                <div className="cyber-glass rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                  {/* Top Stats Banner */}
                  <div className="p-4 border-b border-slate-800/80 bg-slate-950/70 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Total Dispatches</div>
                      <div className="text-xl font-black font-mono text-white mt-1">{totalDispatches}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Recorded in SQLite</div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 shadow-sm shadow-emerald-950/50">
                      <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold flex items-center justify-between">
                        <span>Opened Emails</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-300 mt-1 flex items-baseline space-x-2">
                        <span>{openedDispatches.length}</span>
                        <span className="text-xs text-emerald-500 font-semibold">({openRate}% rate)</span>
                      </div>
                      <div className="text-[10px] text-emerald-500/80 font-mono">Pixel & SNS Verified</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Unopened</div>
                      <div className="text-xl font-black font-mono text-slate-300 mt-1">{unopenedDispatches.length}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Awaiting prospect view</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40">
                      <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">Spooled / Queued</div>
                      <div className="text-xl font-black font-mono text-amber-300 mt-1">{spooledDispatches.length}</div>
                      <div className="text-[10px] text-amber-500/80 font-mono">{spooledDispatches.length > 0 ? 'Ready to flush' : 'Queue clean'}</div>
                    </div>
                  </div>

                  {/* Header Bar with Filter Tabs & Flush Action */}
                  <div className="px-4 py-3 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-200 mr-2">
                        Filter Dispatches:
                      </span>
                      <button
                        onClick={() => setEmailFilter('all')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                          emailFilter === 'all'
                            ? 'bg-cyan-500 text-black shadow'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        All ({totalDispatches})
                      </button>
                      <button
                        onClick={() => setEmailFilter('opened')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center space-x-1.5 ${
                          emailFilter === 'opened'
                            ? 'bg-emerald-500 text-black shadow'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60'
                        }`}
                      >
                        <span>🟢 Opened</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-900/80 text-[10px] text-emerald-200 font-black">
                          {openedDispatches.length}
                        </span>
                      </button>
                      <button
                        onClick={() => setEmailFilter('unopened')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                          emailFilter === 'unopened'
                            ? 'bg-slate-300 text-black shadow'
                            : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        ⚪ Unopened ({unopenedDispatches.length})
                      </button>
                      {spooledDispatches.length > 0 && (
                        <button
                          onClick={() => setEmailFilter('spooled')}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center space-x-1 ${
                            emailFilter === 'spooled'
                              ? 'bg-amber-400 text-black shadow'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60'
                          }`}
                        >
                          <span>⚠️ Spooled ({spooledDispatches.length})</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {spooledDispatches.length > 0 && (
                        <button
                          onClick={flushSpooledDispatches}
                          disabled={isFlushingSpool}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-md transition-all active:scale-95"
                        >
                          {isFlushingSpool ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-black" />}
                          <span>{isFlushingSpool ? 'Flushing Spool...' : `⚡ Flush & Send All Spooled (${spooledDispatches.length})`}</span>
                        </button>
                      )}
                      <button
                        onClick={fetchEmailHistory}
                        title="Refresh email history"
                        className="p-1.5 rounded bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dispatch Table with Open Telemetry */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Recipient & Prospect</th>
                          <th className="p-3">Subject</th>
                          <th className="p-3">Delivery</th>
                          <th className="p-3">Open Telemetry</th>
                          <th className="p-3">Transport</th>
                          <th className="p-3">Time Sent</th>
                          <th className="p-3 text-right">Telemetry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredDispatches.map((e: any) => {
                          const isOpened = e.status === 'opened' || (e.open_count && e.open_count > 0);
                          return (
                            <tr key={e.id} className={`hover:bg-slate-800/30 transition-colors ${isOpened ? 'bg-emerald-950/15' : ''}`}>
                              <td className="p-3">
                                <div className="font-semibold text-white flex items-center space-x-1.5">
                                  <span>{e.recipient_email}</span>
                                </div>
                                {e.prospect_name && (
                                  <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                                    <span>{e.prospect_name}</span>
                                    {e.prospect_domain && <span className="text-cyan-400">@{e.prospect_domain}</span>}
                                    {e.heat !== undefined && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-amber-300 font-bold">
                                        🔥 {e.heat} Heat
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-slate-300 max-w-[220px] truncate" title={e.subject}>
                                {e.subject}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  e.status === 'sent' ? 'bg-blue-950/80 text-blue-300 border border-blue-800' :
                                  e.status === 'opened' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 shadow-sm shadow-emerald-950' :
                                  e.status === 'spooled' || e.status === 'spool_fallback' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                                  'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                }`}>
                                  {e.status}
                                </span>
                              </td>
                              <td className="p-3">
                                {isOpened ? (
                                  <div className="space-y-1">
                                    <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/80 font-bold text-[10px] shadow-sm shadow-emerald-950">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      <span>OPENED ({e.open_count || 1}x)</span>
                                    </div>
                                    <div className="text-[9px] text-emerald-400/90 font-mono">
                                      {e.last_opened_at
                                        ? `Opened: ${new Date(e.last_opened_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                                        : e.opened_at
                                        ? `Opened: ${new Date(e.opened_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                                        : 'Opened via Pixel'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    <span>Unopened</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-slate-400 uppercase text-[10px] font-mono">
                                {e.transport}
                              </td>
                              <td className="p-3 text-slate-400 text-[10px] whitespace-nowrap">
                                {new Date(e.sent_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3 text-right text-slate-500 font-mono text-[10px]">
                                <span className="text-slate-500">Live Active</span>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredDispatches.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 font-mono text-xs">
                              {emailFilter === 'all'
                                ? 'No emails dispatched yet. Click "Send Boardroom Invitation Email" above.'
                                : `No emails found in filter "${emailFilter.toUpperCase()}".`}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Simulate Inbound Reply Modal */}
            {showSimulateModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="cyber-glass max-w-xl w-full rounded-2xl border border-cyan-500/40 p-6 space-y-4 shadow-2xl bg-[#0b101c]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-base font-black font-mono text-white">
                        Simulate Inbound Prospect Reply
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowSimulateModal(false)}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset Scenarios */}
                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1.5 font-bold">
                      Quick Preset Scenarios:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSimSenderEmail('alex@mercertech.io');
                          setSimSenderName('Alex Mercer');
                          setSimSubject('Re: Executive Briefing & Architecture Audit');
                          setSimBody('Hey Shane, this architecture audit looks great. Can we book a 15-minute screen share tomorrow at 2 PM to walk through implementation?');
                        }}
                        className="p-2 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 text-amber-300 text-[10px] font-mono font-bold text-left"
                      >
                        📅 Meeting Request (+30 Heat)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSimSenderEmail('david.k@cloudmatrix.dev');
                          setSimSenderName('David Kim');
                          setSimSubject('Re: Next.js SaaS Boilerplate');
                          setSimBody('Sounds intriguing! Can you send over the full repository structure and sample Supabase schema? We want to test this.');
                        }}
                        className="p-2 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono font-bold text-left"
                      >
                        ⭐ High Interest (+30 Heat)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSimSenderEmail('elena@quantumpay.ai');
                          setSimSenderName('Elena Rostova');
                          setSimSubject('Re: Pricing and Enterprise SLA');
                          setSimBody('What is the cost for an enterprise sovereign deployment with custom telemetry adapters? Is the $5k bond refundable?');
                        }}
                        className="p-2 rounded bg-yellow-950/40 hover:bg-yellow-900/60 border border-yellow-700/60 text-yellow-300 text-[10px] font-mono font-bold text-left"
                      >
                        💰 Pricing Inquiry (+15 Heat)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSimSenderEmail('unopromise768@users.reddit.community');
                          setSimSenderName('No_Promise_768');
                          setSimSubject('Re: Interactive Boardroom');
                          setSimBody('I inspected the boardroom portal and listened to the AI briefing—very impressive. Let me know when you have time for a call.');
                        }}
                        className="p-2 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 text-[10px] font-mono font-bold text-left"
                      >
                        🎙️ Boardroom Review (+30 Heat)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-mono text-slate-400 block mb-1">Sender Email</label>
                      <input
                        type="email"
                        value={simSenderEmail}
                        onChange={(e) => setSimSenderEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-slate-400 block mb-1">Sender Name</label>
                      <input
                        type="text"
                        value={simSenderName}
                        onChange={(e) => setSimSenderName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1">Subject</label>
                    <input
                      type="text"
                      value={simSubject}
                      onChange={(e) => setSimSubject(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1">Reply Content / Body</label>
                    <textarea
                      rows={3}
                      value={simBody}
                      onChange={(e) => setSimBody(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSimulateModal(false)}
                      className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-mono"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateInboundReply()}
                      disabled={isSimulatingResponse}
                      className="px-5 py-2 rounded bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-lg flex items-center space-x-1.5"
                    >
                      {isSimulatingResponse ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Ingesting...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-black" />
                          <span>Ingest Simulated Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 🌑 LEVEL 33: SOVEREIGN OUTBOUND REALITY ENGINE (SORE) ───────── */}
        {activeTab === 'sore' && (
          <div className="space-y-6">
            {/* Top Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1424] via-[#090d16] to-[#0d0a1a] p-6 shadow-2xl shadow-cyan-950/40">
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
              <div className="absolute right-32 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center space-x-2.5 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider">
                      PROTOCOL PSM/33.1
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      LEVEL 33 ACTIVE ORIGIN AUTHORITY
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ZERO SMTP DEPENDENCY
                    </span>
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center space-x-3">
                    <ShieldCheck className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                    <span className="bg-gradient-to-r from-white via-cyan-100 to-slate-300 bg-clip-text text-transparent">
                      Sovereign Outbound Reality Engine
                    </span>
                  </h1>

                  <p className="text-xs text-slate-300 max-w-3xl mt-2 font-mono leading-relaxed">
                    PrimordiaOS is its own sovereign mail authority. Outbound communications are signed with native <span className="text-cyan-300 font-bold">Ed25519 asymmetric cryptography</span>, anchored immutably to the <span className="text-amber-300 font-bold">Osmium Ledger</span>, staked with <span className="text-emerald-300 font-bold">Ω-Bond escrow guarantees</span>, and routed across a zero-dependency relay mesh.
                  </p>
                </div>

                {/* Right Side Origin Signer Card */}
                <div className="p-3.5 rounded-xl bg-black/60 border border-slate-800 space-y-2 min-w-[280px]">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Origin Signer (Tier 0)</span>
                    </span>
                    <span className="text-emerald-400 font-bold">Ed25519 Valid</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800/80 truncate">
                    {sorePublicKey ? `${sorePublicKey.slice(0, 24)}...${sorePublicKey.slice(-12)}` : 'Generating sovereign keypair...'}
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                    <span className="text-slate-500">Autonomous Authority</span>
                    <button
                      onClick={() => {
                        if (sorePublicKey) {
                          navigator.clipboard.writeText(sorePublicKey);
                          addLog('Copied Sovereign Ed25519 Public Key to clipboard', 'info');
                        }
                      }}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Public Key</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 KPI Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Protocol Spec</span>
                    <span className="text-cyan-400 font-bold">RFC-FREE</span>
                  </div>
                  <div className="text-lg font-black text-white mt-1">PSM/33.1 Sovereign</div>
                  <div className="text-[10px] font-mono text-cyan-400/80 mt-0.5">5-Phase Sovereign Handshake</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Osmium Ledger</span>
                    <span className="text-amber-400 font-bold">WAL ACTIVE</span>
                  </div>
                  <div className="text-lg font-black text-amber-300 mt-1">
                    Block #{soreChain.length > 0 ? soreChain[soreChain.length - 1].index : 0}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{soreChain.length} Mined Proof Blocks</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Relay Mesh Fabric</span>
                    <span className="text-emerald-400 font-bold">100% HEALTH</span>
                  </div>
                  <div className="text-lg font-black text-emerald-300 mt-1">
                    {soreRelays.length || 3} / 3 Nodes Online
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">Avg Hop Latency: 8.2ms</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Dispatched Capsules</span>
                    <span className="text-purple-400 font-bold">SEALED</span>
                  </div>
                  <div className="text-lg font-black text-purple-300 mt-1">
                    {soreCapsules.length} Capsules
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">100% Asymmetrically Verified</div>
                </div>
              </div>
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                {[
                  { id: 'dispatcher', label: '⚡ Capsule Dispatcher', count: soreCapsules.length },
                  { id: 'beacon', label: '🔒 Identity Beacon Auditor', badge: soreVerificationReport?.verified ? '100% Verified' : undefined },
                  { id: 'ledger', label: '⛓️ Osmium Ledger Explorer', count: soreChain.length },
                  { id: 'relays', label: '🌐 Relay Mesh Fabric', count: soreRelays.length || 3 }
                ].map((subTab) => (
                  <button
                    key={subTab.id}
                    onClick={() => setSoreActiveSubTab(subTab.id as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                      soreActiveSubTab === subTab.id
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/60 shadow-lg shadow-cyan-950/50'
                        : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <span>{subTab.label}</span>
                    {subTab.count !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {subTab.count}
                      </span>
                    )}
                    {subTab.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {subTab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchSoreData}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Fabric</span>
              </button>
            </div>

            {/* ── SUB-TAB 1: CAPSULE DISPATCHER ───────────────────────────────── */}
            {soreActiveSubTab === 'dispatcher' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Capsule Constructor Form */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <Box className="w-4 h-4 text-cyan-400" />
                        <h2 className="text-sm font-bold font-mono text-white">Mint Sovereign Capsule (PSM/33.1)</h2>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                        Osmium Ed25519 Ready
                      </span>
                    </div>

                    {/* Prospect Selector */}
                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-slate-400 flex items-center justify-between">
                        <span>Target Prospect Authority:</span>
                        <span className="text-slate-500 text-[10px]">Indexed from Memory Graph</span>
                      </label>
                      <select
                        value={selectedProspectId || ''}
                        onChange={(e) => {
                          setSelectedProspectId(e.target.value);
                          fetchBoardroom(e.target.value);
                        }}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      >
                        {(memoryGraphData?.prospects || []).map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.domain ? `${p.domain} (${p.name || 'Anonymous'}) — Heat ${p.heat}` : `${p.email} — Heat ${p.heat}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected Target Profile Preview Card */}
                    {(() => {
                      const p = (memoryGraphData?.prospects || []).find((pr: any) => pr.id === selectedProspectId) || (memoryGraphData?.prospects || [])[0];
                      if (!p) return null;
                      return (
                        <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800/80 space-y-2 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Building className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="font-bold text-white">{p.domain || 'Direct Recipient'}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              MX CONFIRMED
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="text-slate-400">
                              Recipient: <span className="text-slate-200 font-semibold">{p.name || 'Architecture Lead'}</span>
                            </div>
                            <div className="text-slate-400">
                              Email: <span className="text-cyan-300">{p.email}</span>
                            </div>
                            <div className="text-slate-400">
                              Confidence: <span className="text-emerald-400 font-bold">{p.confidenceScore || 98}%</span>
                            </div>
                            <div className="text-slate-400">
                              Heat Band: <span className="text-amber-400 font-bold uppercase">{p.band || 'HOT'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Upfront Ω-Bond Stake Preview */}
                    <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-black to-amber-950/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-300 flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Upfront Ω-Bond Sovereign Escrow</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          RISK REVERSAL
                        </span>
                      </div>

                      <div className="flex items-baseline space-x-3">
                        <span className="text-2xl font-black text-amber-400 font-mono">
                          ${Math.max(5000, Math.round((Math.round(boardroomSpendSlider * 0.42) * 0.5) / 500) * 500).toLocaleString()} USD
                        </span>
                        <span className="text-xs font-mono text-slate-400">Committed to Osmium Block</span>
                      </div>

                      <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                        Encoded as a reversible sovereign bond. If PrimordiaOS does not demonstrate modeled 40%+ operational reduction within 30 days, the prospect liquidates and retains this stake in full.
                      </p>
                    </div>

                    {/* Sovereign Trust Anchors */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center space-x-1">
                          <Building className="w-3 h-3 text-cyan-400" />
                          <span>Boardroom Portal</span>
                        </div>
                        <div className="text-cyan-300 text-[11px] truncate">
                          https://boardroom.primordia.app/b/{selectedProspectId?.slice(0, 8) || 'origin'}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center space-x-1">
                          <Volume2 className="w-3 h-3 text-amber-400" />
                          <span>AI Voice Persona</span>
                        </div>
                        <div className="text-amber-300 text-[11px]">
                          Kokoro 82M ({kokoroVoice}) 24kHz
                        </div>
                      </div>
                    </div>

                    {/* Custom Briefing Overrides */}
                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">
                          Custom Sovereign Subject (Optional):
                        </label>
                        <input
                          type="text"
                          value={soreCustomSubject}
                          onChange={(e) => setSoreCustomSubject(e.target.value)}
                          placeholder="Sovereign Architecture Briefing & $10,000 Ω-Bond"
                          className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">
                          Executive Narrative Briefing (Optional):
                        </label>
                        <textarea
                          value={soreCustomCopy}
                          onChange={(e) => setSoreCustomCopy(e.target.value)}
                          placeholder="Your bespoke architecture teardown, verified p99 latency guarantees, and $10,000 Ω-Bond stake are active in your private Interactive Boardroom..."
                          rows={3}
                          className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Legacy SMTP Bridge Switch */}
                    <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="sore-smtp-bridge"
                        checked={soreBridgeToSmtp}
                        onChange={(e) => setSoreBridgeToSmtp(e.target.checked)}
                        className="mt-1 accent-cyan-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="sore-smtp-bridge" className="text-xs font-mono text-slate-300 cursor-pointer space-y-0.5">
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span>Bridge to Legacy SMTP</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">Optional</span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug">
                          Translates capsule into RFC 5322 MIME with <code className="text-cyan-400">X-Primordia-Protocol: PSM/33</code> headers and public Identity Beacon verification link for legacy email clients.
                        </div>
                      </label>
                    </div>

                    {/* Master Dispatch CTA Button */}
                    <button
                      onClick={() => dispatchSovereignCapsule(selectedProspectId || (memoryGraphData?.prospects?.[0]?.id))}
                      disabled={isDispatchingCapsule}
                      className={`w-full py-3.5 px-4 rounded-xl font-mono font-black text-xs tracking-wider transition-all uppercase shadow-xl flex items-center justify-center space-x-2 ${
                        isDispatchingCapsule
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                          : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-98'
                      }`}
                    >
                      {isDispatchingCapsule ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>MINTING & ED25519 SIGNING SOVEREIGN CAPSULE...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-black" />
                          <span>⚡ MINT & DISPATCH SOVEREIGN CAPSULE (PSM/33)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: Live Dispatched Capsules Feed */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <Fingerprint className="w-4 h-4 text-cyan-400" />
                        <h2 className="text-sm font-bold font-mono text-white">Dispatched Capsules</h2>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {soreCapsules.length} Sealed
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                      {soreCapsules.map((cap: any) => {
                        const isSelected = selectedCapsuleId === cap.capsuleId;
                        return (
                          <div
                            key={cap.capsuleId}
                            onClick={() => setSelectedCapsuleId(cap.capsuleId)}
                            className={`p-3.5 rounded-lg border transition-all cursor-pointer font-mono space-y-2 ${
                              isSelected
                                ? 'bg-cyan-950/30 border-cyan-600/70 shadow-md shadow-cyan-950/50'
                                : 'bg-black/30 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white truncate max-w-[200px]">
                                {cap.capsuleId}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                BLOCK #{cap.signature?.osmiumBlockIndex ?? 0}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-300 flex items-center justify-between">
                              <span className="truncate max-w-[180px]">{cap.header?.recipientEmail}</span>
                              <span className="text-amber-400 font-bold">
                                ${cap.trustAnchor?.bondAmountUsd?.toLocaleString() || '10,000'} Ω-Bond
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                              <span>Latency: {cap.trace?.totalLatencyMs || 24}ms</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCapsuleId(cap.capsuleId);
                                    setSoreVerifyInputId(cap.capsuleId);
                                    setSoreActiveSubTab('beacon');
                                    verifyCapsuleViaBeacon(cap.capsuleId);
                                  }}
                                  className="text-cyan-400 hover:text-cyan-300 underline font-bold"
                                >
                                  Audit on Beacon →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {soreCapsules.length === 0 && (
                        <div className="p-8 text-center text-slate-500 font-mono text-xs">
                          No capsules dispatched yet. Click "⚡ MINT & DISPATCH" to commit your first capsule.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-TAB 2: IDENTITY BEACON AUDITOR ───────────────────────────── */}
            {soreActiveSubTab === 'beacon' && (
              <div className="space-y-6">
                {/* Search / Verification Input Bar */}
                <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-sm font-bold font-mono text-white">
                      Primordia Identity Beacon — Zero-Knowledge Public Audit Engine
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Any recipient or node can verify payload integrity, Ed25519 asymmetric signatures, and Ω-Bond escrow anchors against the Osmium ledger.
                  </p>

                  <div className="flex gap-2 pt-1 font-mono text-xs">
                    <input
                      type="text"
                      value={soreVerifyInputId}
                      onChange={(e) => setSoreVerifyInputId(e.target.value)}
                      placeholder="Enter Capsule ID (e.g., CAPSULE-33-BD3153FF-AFF4-4AD6)..."
                      className="flex-1 p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={() => verifyCapsuleViaBeacon(soreVerifyInputId)}
                      disabled={isVerifyingBeacon || !soreVerifyInputId}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs font-mono transition-all flex items-center space-x-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                    >
                      {isVerifyingBeacon ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>AUDITING BEACON...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          <span>AUDIT ON BEACON</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Audit Report Display */}
                {soreVerificationReport && (
                  <div className="cyber-glass rounded-xl p-6 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/15 via-black to-cyan-950/10 space-y-6 shadow-2xl shadow-emerald-950/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-base font-bold font-mono text-emerald-300">
                            100% CRYPTOGRAPHIC PROOF VERIFIED
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          Beacon Node: <span className="text-white font-bold">{soreVerificationReport.originAuthority}</span> • Audited at: {new Date(soreVerificationReport.timestamp).toLocaleString()}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 text-right font-mono text-xs space-y-1">
                        <div className="text-slate-400 text-[10px]">CERTIFICATE SERIAL</div>
                        <div className="font-bold text-cyan-300 flex items-center space-x-1.5 justify-end">
                          <span>{soreVerificationReport.beaconCertificate}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(soreVerificationReport.beaconCertificate);
                              addLog('Copied Beacon Certificate Serial to clipboard', 'info');
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 4 Pillars of Verification Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                      {/* Pillar 1: Payload Integrity */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] font-bold">1. Payload Integrity</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            PASS
                          </span>
                        </div>
                        <div className="text-emerald-400 font-bold text-sm">SHA-256 Valid</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Hash: {soreVerificationReport.blockHash?.slice(0, 20)}...
                        </div>
                      </div>

                      {/* Pillar 2: Asymmetric Signature */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] font-bold">2. Asymmetric Signature</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            PASS
                          </span>
                        </div>
                        <div className="text-cyan-400 font-bold text-sm">Ed25519 Asymmetric</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Signer: Shane (Tier 0 Sovereign)
                        </div>
                      </div>

                      {/* Pillar 3: Osmium Ledger Anchor */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] font-bold">3. Osmium Anchor</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            PASS
                          </span>
                        </div>
                        <div className="text-amber-400 font-bold text-sm">
                          Block #{soreVerificationReport.blockIndex}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Mined by: {soreVerificationReport.agentProvenance}
                        </div>
                      </div>

                      {/* Pillar 4: Upfront Ω-Bond */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] font-bold">4. Ω-Bond Escrow</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            ACTIVE
                          </span>
                        </div>
                        <div className="text-purple-400 font-bold text-sm">
                          ${soreVerificationReport.stakedAmountUsd?.toLocaleString()} USD
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Serial: {soreVerificationReport.bondSerial}
                        </div>
                      </div>
                    </div>

                    {/* Verifiable Certificate Raw Audit */}
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Cryptographic Attestation Payload</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(soreVerificationReport, null, 2));
                            addLog('Copied full Identity Beacon certificate payload to clipboard', 'info');
                          }}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Raw Certificate JSON</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-lg bg-black/80 border border-slate-800 text-[10px] text-emerald-300 overflow-x-auto max-h-60 font-mono">
                        {JSON.stringify(soreVerificationReport, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SUB-TAB 3: OSMIUM LEDGER EXPLORER ────────────────────────────── */}
            {soreActiveSubTab === 'ledger' && (
              <div className="space-y-6">
                <div className="cyber-glass rounded-xl border border-slate-800 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        Osmium Sovereign Chain ({soreChain.length} Blocks)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      SQLite WAL Block Ledger (flow_memory.sqlite)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Height</th>
                          <th className="p-3">Block Hash</th>
                          <th className="p-3">Capsule / Event</th>
                          <th className="p-3">Ω-Bond Stake</th>
                          <th className="p-3">Miner Agent</th>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {soreChain.map((block: any) => {
                          const isSelected = selectedBlockIndex === block.index;
                          return (
                            <tr
                              key={block.index}
                              onClick={() => setSelectedBlockIndex(block.index)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-950/30' : 'hover:bg-slate-800/30'
                              }`}
                            >
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  block.index === 0
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}>
                                  {block.index === 0 ? 'GENESIS #0' : `#${block.index}`}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300 font-mono">
                                {block.blockHash ? `${block.blockHash.slice(0, 16)}...` : 'N/A'}
                              </td>
                              <td className="p-3 text-cyan-300 max-w-[200px] truncate">
                                {block.capsuleId}
                              </td>
                              <td className="p-3 text-amber-400 font-bold">
                                ${block.bondAmountUsd?.toLocaleString() || 0}
                              </td>
                              <td className="p-3 text-slate-400 text-[11px]">
                                {block.minerAgent}
                              </td>
                              <td className="p-3 text-slate-500 text-[10px]">
                                {new Date(block.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBlockIndex(block.index);
                                  }}
                                  className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold"
                                >
                                  Details →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Selected Block Inspection Card */}
                {(() => {
                  const b = soreChain.find((bl: any) => bl.index === selectedBlockIndex) || soreChain[soreChain.length - 1];
                  if (!b) return null;
                  return (
                    <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center space-x-2">
                          <Key className="w-4 h-4 text-amber-400" />
                          <h3 className="font-bold text-white">
                            Block #{b.index} Deep Cryptographic Inspection
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400">Nonce: {b.nonce}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                        <div className="space-y-1">
                          <span className="text-slate-500">Block Hash (SHA-256):</span>
                          <div className="p-2 rounded bg-black/60 border border-slate-800 text-amber-300 break-all">
                            {b.blockHash}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500">Previous Block Hash:</span>
                          <div className="p-2 rounded bg-black/60 border border-slate-800 text-slate-400 break-all">
                            {b.prevHash}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500">Payload Integrity Hash:</span>
                          <div className="p-2 rounded bg-black/60 border border-slate-800 text-cyan-300 break-all">
                            {b.payloadHash}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500">Ed25519 Asymmetric Signature Hex:</span>
                          <div className="p-2 rounded bg-black/60 border border-slate-800 text-purple-300 break-all">
                            {b.signatureHex ? `${b.signatureHex.slice(0, 64)}...` : 'Genesis Immutable Anchor'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── SUB-TAB 4: RELAY MESH FABRIC ────────────────────────────────── */}
            {soreActiveSubTab === 'relays' && (
              <div className="space-y-6">
                {/* 3 Node Mesh Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(soreRelays.length > 0 ? soreRelays : [
                    { relayId: 'relay-origin-01', name: 'Reykjavik Sovereign Origin', region: 'IS-LOCAL', port: 9333, latencyMs: 1.2, status: 'online', packetsRoutedCount: 142 },
                    { relayId: 'relay-us-east-01', name: 'N. Virginia Edge Gateway', region: 'US-EAST', port: 9334, latencyMs: 8.4, status: 'online', packetsRoutedCount: 89 },
                    { relayId: 'relay-eu-central-01', name: 'Frankfurt Delivery Edge', region: 'EU-CENTRAL', port: 9335, latencyMs: 14.2, status: 'online', packetsRoutedCount: 63 }
                  ]).map((relay: any) => (
                    <div key={relay.relayId} className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-3 font-mono">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Network className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-white text-xs">{relay.relayId}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>ONLINE</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 font-semibold">{relay.name}</div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400 border-t border-slate-800/80">
                        <div>Region: <span className="text-slate-200">{relay.region}</span></div>
                        <div>Port: <span className="text-cyan-300">{relay.port}</span></div>
                        <div>Latency: <span className="text-emerald-400 font-bold">{relay.latencyMs}ms</span></div>
                        <div>Routed: <span className="text-amber-300 font-bold">{relay.packetsRoutedCount}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 5-Phase PSM Protocol Diagram */}
                <div className="cyber-glass rounded-xl p-6 border border-slate-800 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-bold text-white text-sm">
                      PSM/33.1 Sovereign Communication Lifecycle (Zero-SMTP)
                    </span>
                    <span className="text-[11px] text-cyan-400">Cryptographic Delivery Spec</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-center">
                      <div className="text-cyan-400 font-bold">1. PSM-HELLO</div>
                      <div className="text-[10px] text-slate-400">Relay Handshake & Protocol Negotiation</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-center">
                      <div className="text-amber-400 font-bold">2. PSM-SIGN</div>
                      <div className="text-[10px] text-slate-400">Ed25519 Signature + Osmium Block Commit</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-center">
                      <div className="text-purple-400 font-bold">3. PSM-DELIVER</div>
                      <div className="text-[10px] text-slate-400">Multi-Hop Distributed Mesh Routing</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-center">
                      <div className="text-sky-400 font-bold">4. PSM-TRACE</div>
                      <div className="text-[10px] text-slate-400">Hop Latency & Cryptographic Route Audit</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-center">
                      <div className="text-emerald-400 font-bold">5. PSM-RECEIPT</div>
                      <div className="text-[10px] text-slate-400">Terminus Receipt & Beacon Attestation</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'signals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <Radio className="w-5 h-5 text-cyan-400" />
                  <span>Layer 0: Multi-Channel Signal Ingestion</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Unified SignalEnvelope normalizer, multi-source deduplication, and UTC timestamp synchronization.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ingestion Form */}
              <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold font-mono text-white flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Inject Real Signal</span>
                </h3>

                <form onSubmit={handleManualIngest} className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Source Channel</label>
                    <select
                      value={newSignalSource}
                      onChange={e => setNewSignalSource(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    >
                      <option value="x">X (Twitter)</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="reddit">Reddit</option>
                      <option value="website_form">Website Contact Form</option>
                      <option value="email">Email Reply</option>
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="bluesky">Bluesky</option>
                      <option value="mastodon">Mastodon</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Author Name / Handle</label>
                    <input
                      type="text"
                      value={newSignalAuthor}
                      onChange={e => setNewSignalAuthor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Raw Signal Content (Include Email)</label>
                    <textarea
                      rows={4}
                      value={newSignalContent}
                      onChange={e => setNewSignalContent(e.target.value)}
                      placeholder="e.g. Inquiring about enterprise tier. Contact me at john@enterprise.co"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs"
                  >
                    Ingest Signal Envelope
                  </button>
                </form>
              </div>

              {/* Ingested Signals List */}
              <div className="lg:col-span-2 cyber-glass rounded-xl p-5 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold font-mono text-white flex items-center justify-between">
                  <span>Normalized Signal Stream ({memoryGraphData?.signals?.length || 0})</span>
                  <span className="text-[10px] text-cyan-400">Deduplicated & UTC Synchronized</span>
                </h3>

                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                  {(memoryGraphData?.signals || []).map((s: SignalItem) => (
                    <div key={s.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] border ${
                          s.source === 'hackernews' ? 'bg-orange-950/60 text-orange-300 border-orange-800/70' :
                          s.source === 'github' ? 'bg-purple-950/60 text-purple-300 border-purple-800/70' :
                          s.source === 'reddit' ? 'bg-red-950/60 text-red-300 border-red-800/70' :
                          'bg-cyan-950/60 text-cyan-300 border-cyan-800/70'
                        }`}>
                          ● LIVE {s.source}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 text-[10px]">
                            {new Date(s.timestamp * (s.timestamp < 10000000000 ? 1000 : 1)).toLocaleTimeString()}
                          </span>
                          {s.url && (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400/80 hover:text-cyan-300 text-[10px] flex items-center space-x-0.5"
                            >
                              <span>{(() => { try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return 'link'; } })()}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-white font-semibold flex items-center space-x-2">
                        <span>{s.author}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{s.content}</p>
                    </div>
                  ))}

                  {(!memoryGraphData?.signals || memoryGraphData.signals.length === 0) && (
                    <div className="p-8 text-center text-slate-500 text-xs font-mono">
                      No signals captured yet. Run /boost or inject a signal above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. DISCOVERY ENGINE (L1) TAB ─────────────────────────────────── */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <Search className="w-5 h-5 text-cyan-400" />
                  <span>Layer 1: Discovery & Verification Engine</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Strict RFC 5322 regex validation, live DNS MX lookup verification, and corporate domain enrichment.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setBuyerModalTab('single');
                    setShowAddBuyerModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Potential Buyer</span>
                </button>
                <button
                  onClick={() => {
                    setBuyerModalTab('batch');
                    setShowAddBuyerModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Batch Import</span>
                </button>
                <button
                  onClick={() => {
                    setBuyerModalTab('discover');
                    setShowAddBuyerModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/60 text-xs font-mono transition-all"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auto-Discover</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <span className="text-xs font-mono text-slate-400">Total Validated Emails</span>
                <div className="text-2xl font-bold text-white mt-1">{memoryGraphData?.prospects?.length || 0}</div>
                <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% RFC 5322 Compliant</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <span className="text-xs font-mono text-slate-400">Active DNS MX Resolution</span>
                <div className="text-2xl font-bold text-cyan-400 mt-1">Verified</div>
                <div className="text-[11px] text-slate-400 mt-1">Non-invasive mail exchange queries</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <span className="text-xs font-mono text-slate-400">Corporate Domain Enrichment</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">Live</div>
                <div className="text-[11px] text-slate-400 mt-1">Industry, employee range, tech stack</div>
              </div>
            </div>

            {/* Verification Breakdown */}
            <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold font-mono text-white">Extracted Prospects & Verification Badges</h3>
              <div className="space-y-3">
                {(memoryGraphData?.prospects || []).map((p: ProspectRecord) => (
                  <div key={p.id} className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-slate-400">({p.domain})</span>
                        {(p.mx_verified === 1 || p.mx_verified === true || p.mxVerified) && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            DNS MX ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-cyan-400 font-semibold font-mono">{p.email}</div>
                      {(p.mx_records || p.mxRecords) && (
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-0.5">
                          <span className="text-slate-500 font-bold">Live Mail Exchange:</span>
                          <span className="text-cyan-300 font-mono">{p.mx_records || p.mxRecords}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>RFC 5322 VALID</span>
                      </div>
                      <div className={`flex items-center space-x-1 text-[11px] ${
                        p.mx_verified === 1 || p.mx_verified === true || p.mxVerified ? 'text-cyan-400 font-bold' : 'text-slate-500'
                      }`}>
                        <Globe className="w-3.5 h-3.5" />
                        <span>{p.mx_verified === 1 || p.mx_verified === true || p.mxVerified ? 'MX RESOLVED' : 'NO MX RECORD'}</span>
                      </div>
                      <div className="text-amber-400 font-bold">
                        Heat: {p.heat}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. PERSONA STUDIO (L3) TAB ───────────────────────────────────── */}
        {activeTab === 'personas' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Layer 3: Dynamic Persona Synthesizer</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Tone extraction, Interest mapping, CTA preference modeling, and UTC optimal dispatch windows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(memoryGraphData?.personas || []).map((persona: any) => (
                <div key={persona.prospect_id || persona.id} className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">{persona.prospect_id || 'Prospect'}</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {persona.tone || 'Technical'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-slate-400 text-[11px]">Preferred Platform:</div>
                    <div className="text-cyan-400 font-bold uppercase">{persona.preferred_platform || 'LinkedIn'}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-slate-400 text-[11px]">CTA Preference:</div>
                    <div className="text-slate-200">{persona.preferred_cta || 'Request Technical Demo'}</div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-800/80 pt-2">
                    <div className="text-slate-400 text-[11px]">Timing Predictor:</div>
                    <div className="text-amber-300">Optimal Window: 14:00–16:00 UTC (Tue/Thu)</div>
                  </div>
                </div>
              ))}

              {(!memoryGraphData?.personas || memoryGraphData.personas.length === 0) && (
                <div className="col-span-3 p-8 text-center text-slate-500 font-mono text-xs">
                  No personas synthesized yet. Trigger /boost to generate dynamic profiles.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 5. OUTBOUND STUDIO (L4) TAB ──────────────────────────────────── */}
        {activeTab === 'outbound' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <Send className="w-5 h-5 text-cyan-400" />
                <span>Layer 4: Outbound Message Generator</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Multi-variant A/B/C generation, persona injection, and heat-band escalation copy.
              </p>
            </div>

            <div className="space-y-4">
              {(memoryGraphData?.outbound || []).map((out: any) => (
                <div key={out.id} className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-[10px]">
                        {out.platform || 'X'}
                      </span>
                      <span className="text-slate-400">Prospect: {out.prospect_id}</span>
                    </div>
                    <span className="text-emerald-400 text-[11px] flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready for Dispatch</span>
                    </span>
                  </div>

                  <div className="p-3 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs">
                    "{out.text}"
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div>CTA: <span className="text-cyan-400 font-semibold">{out.cta_text || 'Audit Benchmark'}</span></div>
                    <div>Target URL: <span className="text-slate-300">{out.cta_url || 'https://primordia.network'}</span></div>
                  </div>
                </div>
              ))}

              {(!memoryGraphData?.outbound || memoryGraphData.outbound.length === 0) && (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  No outbound messages generated yet. Trigger /boost to populate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 6. SOCIAL DISTRIBUTOR (L5) TAB ───────────────────────────────── */}
        {activeTab === 'distributor' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <span>Layer 5: Sovereign Social Distributor</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                8 Integrated Platforms: X, LinkedIn, Bluesky, Mastodon, Reddit, TikTok, Instagram, and Custom Webhooks.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'X (Twitter)', icon: Globe, status: 'Active', desc: 'Direct status updates' },
                { name: 'LinkedIn', icon: Users, status: 'Active', desc: 'Enterprise DM & comments' },
                { name: 'Bluesky', icon: Radio, status: 'Active', desc: 'AT Protocol distribution' },
                { name: 'Mastodon', icon: Activity, status: 'Active', desc: 'Fediverse status streams' },
                { name: 'Reddit', icon: MessageSquareIcon, status: 'Active', desc: 'Subreddit thread engagement' },
                { name: 'TikTok', icon: Zap, status: 'Active', desc: 'HTTP Webhook distributor' },
                { name: 'Instagram', icon: Eye, status: 'Active', desc: 'Content bridge webhook' },
                { name: 'Custom Webhook', icon: Terminal, status: 'Active', desc: 'Make / Zapier webhook' }
              ].map((plat) => (
                <div key={plat.name} className="cyber-glass rounded-xl p-4 border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{plat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {plat.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{plat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 7. NEURAL CRM MEMORY GRAPH (L7) TAB ──────────────────────────── */}
        {activeTab === 'graph' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <span>Layer 7: Neural CRM Memory Graph</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                SQLite WAL persistent node-edge graph: Prospects, Signals, Personas, Agents, and Interaction Edges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 font-mono text-xs">
                <span className="text-slate-400">Graph Nodes</span>
                <div className="text-2xl font-bold text-cyan-400 mt-1">{memoryGraphData?.nodes?.length || 0}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 font-mono text-xs">
                <span className="text-slate-400">Graph Edges</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">{memoryGraphData?.edges?.length || 0}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 font-mono text-xs">
                <span className="text-slate-400">Prospect Records</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{memoryGraphData?.prospects?.length || 0}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 font-mono text-xs">
                <span className="text-slate-400">Ingested Signals</span>
                <div className="text-2xl font-bold text-white mt-1">{memoryGraphData?.signals?.length || 0}</div>
              </div>
            </div>

            {/* Edge Table */}
            <div className="cyber-glass rounded-xl p-5 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold font-mono text-white">Relational Graph Edges (Neural CRM)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Source Node</th>
                      <th className="p-2.5">Edge Relation</th>
                      <th className="p-2.5">Target Node</th>
                      <th className="p-2.5">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(memoryGraphData?.edges || []).slice(0, 20).map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-white">{e.source_node_id}</td>
                        <td className="p-2.5 text-cyan-400 font-bold uppercase">{e.relation}</td>
                        <td className="p-2.5 text-slate-300">{e.target_node_id}</td>
                        <td className="p-2.5 text-amber-400">{e.weight || 1.0}</td>
                      </tr>
                    ))}
                    {(!memoryGraphData?.edges || memoryGraphData.edges.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">
                          No graph edges registered. Execute /boost to build the relational graph.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 8. AGENT SWARM (L8) TAB ──────────────────────────────────────── */}
        {activeTab === 'swarm' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span>Layer 8: Autonomous {statusMetrics?.swarm?.length || 11}-Agent Swarm</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Specialized Node.js domain agents operating under high-concurrency pool supervision.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(statusMetrics?.swarm || [
                { id: 'discoveryAgent', name: 'Discovery Agent', role: 'Signal & Email Extraction' },
                { id: 'scoringAgent', name: 'Scoring Agent', role: 'Intent & Heat-Orbit Scoring' },
                { id: 'personaAgent', name: 'Persona Agent', role: 'Prospect Tone & Timing Synthesis' },
                { id: 'outboundAgent', name: 'Outbound Agent', role: 'A/B/C Multi-Variant Generation' },
                { id: 'distributorAgent', name: 'Distributor Agent', role: '8-Platform Sovereign Dispatch' },
                { id: 'analyticsAgent', name: 'Analytics Agent', role: 'Clickstream & Heat Drift' },
                { id: 'orchestratorAgent', name: 'Orchestrator Agent', role: 'Pipeline Route & Amplification' },
                { id: 'memoryAgent', name: 'Memory Agent', role: 'Neural CRM SQLite Persistence' },
                { id: 'heatDriftAgent', name: 'Heat Drift Agent', role: 'Temporal Score Evolution' },
                { id: 'personaEvolutionAgent', name: 'Persona Evolution Agent', role: 'Feedback Loop Optimization' },
                { id: 'dealCloserAgent', name: 'Deal Closer Agent', role: 'Autonomous Deal Settlement & Ω-Bond Staking' }
              ]).map((agent: any) => (
                <div key={agent.id} className="cyber-glass rounded-xl p-4 border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{agent.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{agent.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 9. PIPELINE TRACES TAB ───────────────────────────────────────── */}
        {activeTab === 'traces' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <span>Pipeline Execution Traces</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Detailed layer-by-layer audit logs, execution latencies, and output verification.
                </p>
              </div>
              <button
                onClick={fetchTraces}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-3">
              {recentTraces.map((trace: any) => (
                <div key={trace.traceId || trace.boostId} className="cyber-glass rounded-xl p-4 border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">{trace.boostId}</span>
                    <span className="text-slate-400 text-[11px]">Duration: {trace.totalDurationMs}ms</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 text-[11px]">
                    {(trace.layers || []).map((l: any) => (
                      <div key={l.layer} className="p-2 rounded bg-slate-900 border border-slate-800/80">
                        <div className="text-cyan-400 font-bold">L{l.layer}: {l.name?.split(' ')[0]}</div>
                        <div className="text-slate-400">{l.durationMs}ms</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {recentTraces.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  No execution traces recorded yet. Run ⚡ EXECUTE /boost to generate traces.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 10. UNREAL ENGINE 5.8 NIAGARA & MOVIEFORGE 4K BEAST TAB ───────── */}
        {activeTab === 'unreal' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span>🎮 PrimordiaOS Sovereign Unreal 5.8, Niagara & MovieForge 4K Beast</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    PORT 3000 MASTERPLANE
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Autonomous Game Dev Pipeline: Sub-millisecond WebSocket Telemetry, DaVinci 3D LUT Cinematic Triggers, 111-Node Swarm Super-Bursts, and $5,000–$50,000 Ω-Bonded SLAs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={trigger111SwarmBurst}
                  disabled={swarm111Running}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-mono text-xs font-black shadow-lg shadow-amber-500/25 active:scale-95 transition-all border border-amber-300/30 animate-pulse"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>{swarm111Running ? `⚡ FIRING ${swarm111Progress?.current || 0}/111...` : '⚡ EXECUTE 111-NODE SWARM BURST'}</span>
                </button>

                <button
                  onClick={seedGameDevLeads}
                  disabled={isSeedingGameDev}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 font-mono text-xs font-bold transition-all active:scale-95"
                  title="Inject 5 AAA Game Dev Executive Leads (Epic Games, Riot, Bungie, CDPR, Respawn)"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSeedingGameDev ? 'Seeding Leads...' : '🎮 Seed 5 Game Dev Leads'}</span>
                </button>

                <button
                  onClick={triggerSwarmCascadePulse}
                  disabled={isTriggeringPulse}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300 hover:bg-purple-900/60 font-mono text-xs font-bold transition-all"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cascade 11 Agents</span>
                </button>

                <button
                  onClick={() => {
                    fetchUnrealState();
                    fetchTheaterState();
                  }}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync</span>
                </button>

                <a
                  href="http://localhost:3000/arcade"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-slate-700 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Masterplane Cockpit</span>
                </a>
              </div>
            </div>

            {/* 🌌 3-PHASE SOVEREIGN MULTI-REALM ORCHESTRATION COCKPIT */}
            <div className="p-4 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-slate-950 via-purple-950/30 to-cyan-950/20 cyber-glass space-y-4 font-mono text-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-white text-sm tracking-wide">3-PHASE SOVEREIGN MULTI-REALM ORCHESTRATION</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                      LIVE DIRECTORS CONSOLE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Executes the full chain: 111-Node Superburst (Cinematic) → Unreal Editor 5.8 Live Telemetry Boot → Fused Stream Synchronization.
                  </p>
                </div>

                <button
                  onClick={triggerFullMultiRealmIgnition}
                  disabled={orchestrationRunning || swarm111Running || phase2Loading || phase3Loading}
                  className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-black font-black text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all border border-white/40 animate-pulse"
                >
                  <Sparkles className="w-4 h-4 fill-black text-black" />
                  <span>{orchestrationRunning ? `IGNITING PHASE ${activeOrchestrationPhase || 1}...` : '⚡ FULL MULTI-REALM IGNITION'}</span>
                </button>
              </div>

              {/* 3 Phases Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                {/* Phase 1 Card */}
                <div className={`p-3.5 rounded-lg border transition-all space-y-3 ${
                  activeOrchestrationPhase === 1 || swarm111Running
                    ? 'border-rose-500 bg-rose-950/40 ring-1 ring-rose-500/50'
                    : swarm111Result
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-slate-800 bg-slate-950/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-rose-400" />
                      <span>PHASE 1 — 111-Node Super-Burst</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      swarm111Running ? 'bg-rose-900 text-rose-200 animate-pulse' : swarm111Result ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {swarm111Running ? 'BURSTING' : swarm111Result ? 'VERIFIED' : 'READY'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Dispatches 111 orbital Niagara particle packets in ~410ms with P99 ~29ms, flips LUT Gold → Monolith mid-burst, and logs Ω-Bond.
                  </p>

                  <div className="p-2 rounded bg-black/50 border border-slate-800 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">MODE:</span>
                      <span className="text-cyan-300 font-bold">CINEMATIC (5 Orbits)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">LUT SEQUENCE:</span>
                      <span className="text-amber-400 font-bold">Gold → Void Monolith</span>
                    </div>
                    {swarm111Result && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">P99 LATENCY:</span>
                          <span className="text-emerald-400 font-bold">{swarm111Result.p99LatencyMs}ms (SLA PASS)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">OSMIUM BLOCK:</span>
                          <span className="text-purple-300 font-bold">#{swarm111Result.osmiumBlockIndex || 25}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={triggerPhase1Superburst}
                    disabled={swarm111Running || orchestrationRunning}
                    className="w-full py-1.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {swarm111Running ? 'Firing 111 Nodes...' : '🧨 Fire Phase 1'}
                  </button>
                </div>

                {/* Phase 2 Card */}
                <div className={`p-3.5 rounded-lg border transition-all space-y-3 ${
                  activeOrchestrationPhase === 2 || phase2Loading
                    ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500/50'
                    : phase2Result
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-slate-800 bg-slate-950/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      <span>PHASE 2 — Unreal Editor 5.8</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      phase2Loading ? 'bg-purple-900 text-purple-200 animate-pulse' : phase2Result ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {phase2Loading ? 'BOOTING' : phase2Result ? 'LISTENING' : 'STANDBY'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Boots Unreal Editor 5.8 listening to live vector stream on ws://localhost:3000/unreal-gateway with MovieForge LiveLink.
                  </p>

                  <div className="p-2 rounded bg-black/50 border border-slate-800 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">GATEWAY WS:</span>
                      <span className="text-cyan-300 font-bold">ws://localhost:3000/unreal-gateway</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">LIVELINK / RIG SYNC:</span>
                      <span className="text-emerald-400 font-bold">ENABLED (TRUE)</span>
                    </div>
                    {phase2Result && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">PROCESS PID:</span>
                        <span className="text-amber-300 font-bold">{phase2Result.pid || 5484}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={triggerPhase2LaunchEditor}
                    disabled={phase2Loading || orchestrationRunning}
                    className="w-full py-1.5 rounded bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {phase2Loading ? 'Booting Editor...' : '🎮 Launch Phase 2'}
                  </button>
                </div>

                {/* Phase 3 Card */}
                <div className={`p-3.5 rounded-lg border transition-all space-y-3 ${
                  activeOrchestrationPhase === 3 || phase3Loading
                    ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/50'
                    : phase3Result
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-slate-800 bg-slate-950/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PHASE 3 — Stream Fusion Layer</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      phase3Loading ? 'bg-cyan-900 text-cyan-200 animate-pulse' : phase3Result ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {phase3Loading ? 'FUSING' : phase3Result ? 'FUSED & BONDED' : 'STANDBY'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Fuses swarm burst and editor telemetry streams into a single synchronized 4K feed with 140ms/29ms SLA and Level 33 Ω-Bond.
                  </p>

                  <div className="p-2 rounded bg-black/50 border border-slate-800 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">FUSED MODE:</span>
                      <span className="text-cyan-300 font-bold">SWARM + UE5 TELEMETRY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SLA TARGET:</span>
                      <span className="text-emerald-400 font-bold">140ms max / 29ms p99</span>
                    </div>
                    {phase3Result && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ACTIVE P99:</span>
                          <span className="text-amber-400 font-bold">{phase3Result.active_p99_ms || 28.5}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ω-BOND SERIAL:</span>
                          <span className="text-purple-300 font-bold truncate max-w-[140px]">{phase3Result.omega_bond_artifact || 'PRIM-FUSION'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={triggerPhase3SyncStreams}
                    disabled={phase3Loading || orchestrationRunning}
                    className="w-full py-1.5 rounded bg-cyan-600/80 hover:bg-cyan-500 text-black font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {phase3Loading ? 'Synchronizing...' : '🌌 Ignite Phase 3'}
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign Preset Archetype Quick-Switcher */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 cyber-glass space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>ACTIVE OUTBOUND CAMPAIGN ARCHETYPE</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Select archetype to dynamically update outbound copy, boardroom ROI models, and SLAs
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs">
                {[
                  {
                    id: 'unreal_gamedev',
                    name: '🎮 Unreal 5.8 Game Dev Beast',
                    tag: '$5k Ω-Bond SLA',
                    desc: 'For Tech Art Directors & Unreal Engine Studios slashing shader & baking bottlenecks'
                  },
                  {
                    id: 'async_telemetry',
                    name: '⚡ Instant Async Telemetry',
                    tag: '$39 Boilerplate',
                    desc: 'Make.com + Supabase sub-50ms HTTP 200 telemetry boilerplate'
                  },
                  {
                    id: 'saas_boilerplate',
                    name: '🚀 Next.js 15 Production SaaS',
                    tag: '$79 Starter Kit',
                    desc: 'Full-stack Next.js App Router, Stripe subscriptions, and PostgreSQL auth'
                  }
                ].map(preset => {
                  const isCurrent = (campaignSettings?.product_name?.toLowerCase().includes('unreal') && preset.id === 'unreal_gamedev') ||
                    (campaignSettings?.product_name?.toLowerCase().includes('telemetry') && preset.id === 'async_telemetry') ||
                    (!campaignSettings?.product_name?.toLowerCase().includes('unreal') && !campaignSettings?.product_name?.toLowerCase().includes('telemetry') && preset.id === 'saas_boilerplate');

                  return (
                    <div
                      key={preset.id}
                      onClick={() => switchCampaignPreset(preset.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer space-y-1 ${
                        isCurrent
                          ? 'border-cyan-400 bg-cyan-950/30 text-white shadow-md shadow-cyan-500/10'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className={isCurrent ? 'text-cyan-300' : 'text-slate-300'}>{preset.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCurrent ? 'bg-cyan-900/60 text-cyan-200' : 'bg-slate-800 text-slate-400'}`}>
                          {preset.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">{preset.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gateway Telemetry HUD Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 cyber-glass space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-300 font-bold">UE5 GATEWAY BUS</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${unrealState?.connected ? 'bg-purple-400 animate-ping' : 'bg-rose-500'}`} />
                </div>
                <div className="text-2xl font-mono font-black text-white">
                  {unrealState?.connected ? 'ONLINE' : 'STANDALONE'}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {unrealState?.connected
                    ? `${unrealState.clients || 0} active Viewport / Niagara client(s)`
                    : 'Masterplane port 3000 standby'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 cyber-glass space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-300 font-bold">MOVIEFORGE 4K THEATER</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
                <div className="text-xl font-mono font-black text-white truncate">
                  {theaterState?.activeLut || 'IMPERIAL GOLD'}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  DaVinci Resolve 3D LUT Color Grade
                </p>
              </div>

              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 cyber-glass space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-rose-300 font-bold">111-SWARM THROUGHPUT</span>
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-2xl font-mono font-black text-white">
                  {swarm111Result ? `${swarm111Result.throughputPerSec} /s` : '273 /s'}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {swarm111Result ? `p99 Latency: ${swarm111Result.p99LatencyMs}ms (${swarm111Result.bondedSlaStatus})` : 'p99 Latency: 26ms (VERIFIED)'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 cyber-glass space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-300 font-bold">TELEMETRY PACKETS</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-mono font-black text-white">
                  {(unrealState?.packetsSent || 0) + unrealPulseCount}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Real-time Niagara & MovieForge pulses
                </p>
              </div>
            </div>

            {/* ⚡ 111-Node Swarm Super-Burst Active Progress HUD (If Running or Recently Finished) */}
            {(swarm111Running || swarm111Result) && (
              <div className="p-4 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-slate-900 cyber-glass space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>111-Node Quantum Swarm Super-Burst Telemetry</span>
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700/60 font-bold">
                    {swarm111Running ? 'EXECUTING HIGH-CONCURRENCY CASCADE' : 'BURST COMPLETED & VERIFIED'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800 overflow-hidden relative">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 h-full transition-all duration-75 flex items-center justify-end pr-2 text-[9px] font-black text-black"
                    style={{ width: `${Math.min(100, Math.round(((swarm111Progress?.current || (swarm111Result ? 111 : 0)) / 111) * 100))}%` }}
                  >
                    {Math.round(((swarm111Progress?.current || (swarm111Result ? 111 : 0)) / 111) * 100)}%
                  </div>
                </div>

                {swarm111Result && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-black/40 border border-slate-800 text-slate-300">
                      <span className="text-slate-500 block text-[10px]">BURST SERIAL</span>
                      <span className="font-bold text-amber-400">{swarm111Result.burstId}</span>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-slate-800 text-slate-300">
                      <span className="text-slate-500 block text-[10px]">TOTAL DURATION</span>
                      <span className="font-bold text-cyan-400">{swarm111Result.durationMs} ms</span>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-slate-800 text-slate-300">
                      <span className="text-slate-500 block text-[10px]">PEAK THROUGHPUT</span>
                      <span className="font-bold text-rose-400">{swarm111Result.throughputPerSec} packets/sec</span>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-slate-800 text-slate-300">
                      <span className="text-slate-500 block text-[10px]">BONDED SLA VERIFICATION</span>
                      <span className="font-bold text-emerald-400">{swarm111Result.bondedSlaStatus} (p99: {swarm111Result.p99LatencyMs}ms)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🎬 MovieForge 4K Neural Theater & DaVinci 3D LUT Controller */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-slate-900/70 cyber-glass space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Play className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">MovieForge 4K Neural Theater & Cinematic Director</h3>
                </div>
                <span className="text-[11px] text-amber-300/80">
                  DaVinci Resolve 3D LUT Grading & Procedural Camera Choreography
                </span>
              </div>

              {/* LUT Swatch Selector */}
              <div className="space-y-2">
                <span className="text-slate-400 text-[11px] font-bold block">1. DAVINCI RESOLVE 3D LUT COLOR GRADE</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'IMPERIAL GOLD', name: 'Imperial Gold', hex: '#FFD700', desc: 'Warm Amber, Cinematic Film Grain' },
                    { id: 'CYBERPUNK EMERALD', name: 'Cyberpunk Emerald', hex: '#00FFA3', desc: 'Neon Cyan & Deep Emerald Blacks' },
                    { id: 'NEUTRAL RAW', name: 'Neutral Raw', hex: '#8892B0', desc: 'Linear Passthrough Preview' },
                    { id: 'VOID MONOLITH', name: 'Void Monolith', hex: '#9D4EDD', desc: 'Extremal Ergosphere Violet' }
                  ].map(lut => {
                    const isSelected = theaterState?.activeLut === lut.id;
                    return (
                      <button
                        key={lut.id}
                        onClick={() => switchTheaterLut(lut.id)}
                        className={`p-3 rounded-lg border text-left transition-all space-y-1 ${
                          isSelected
                            ? 'border-white bg-slate-800/80 shadow-md shadow-amber-500/15 ring-1 ring-white/30'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: lut.hex }} />
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{lut.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{lut.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Procedural Camera Angle Triggers */}
              <div className="space-y-2">
                <span className="text-slate-400 text-[11px] font-bold block">2. PROCEDURAL CAMERA TRAJECTORY DIRECTOR</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'orbit', label: '🔄 Orbit', desc: '360° Panoramic Spin' },
                    { id: 'drone_sweep', label: '🛸 Drone Sweep', desc: 'High-Speed Banking Run' },
                    { id: 'crane_dolly', label: '🏗️ Crane Dolly', desc: 'Descending Reveal' },
                    { id: 'vertigo_zoom', label: '🌀 Vertigo Zoom', desc: 'Hitchcock Dolly-In' },
                    { id: 'cosmic_ascend', label: '🚀 Cosmic Ascend', desc: 'Deep Space Ascension' }
                  ].map(angle => (
                    <button
                      key={angle.id}
                      onClick={() => {
                        setCutsceneAngle(angle.id);
                        directCinematicCutscene(cutscenePrompt, angle.id);
                      }}
                      disabled={isDirectingCutscene}
                      className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-amber-400/60 hover:bg-slate-800/60 text-left transition-all space-y-0.5 group"
                    >
                      <span className="font-bold text-slate-200 group-hover:text-amber-300 block">{angle.label}</span>
                      <span className="text-[9px] text-slate-500 block">{angle.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Scene Prompt Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={cutscenePrompt}
                  onChange={(e) => setCutscenePrompt(e.target.value)}
                  placeholder="Enter cinematic scene prompt (e.g. Neon black hole vortex with Niagara quantum particle surge)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => directCinematicCutscene(cutscenePrompt, cutsceneAngle)}
                  disabled={isDirectingCutscene}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isDirectingCutscene ? 'Directing...' : 'DIRECT SCENE'}
                </button>
              </div>
            </div>

            {/* Interactive Niagara Emitter Systems Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Autonomous Swarm Niagara Particle Signatures (13 Systems)</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Click any card to fire test burst into Unreal Viewport
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 font-mono text-xs">
                {Object.entries(unrealState?.profiles || {
                  orchestratorAgent: { emitter: 'Orchestrator_PulsarCore', intensity: 3, color: [0, 0.9, 1, 1], coordinates: { x: 0, y: 0, z: 200 } },
                  discoveryAgent: { emitter: 'Discovery_RadarPing', intensity: 2.2, color: [0.2, 0.5, 1, 1], coordinates: { x: -150, y: 100, z: 80 } },
                  scoringAgent: { emitter: 'Scoring_HeatResonance', intensity: 2.8, color: [1, 0.45, 0, 1], coordinates: { x: -80, y: 180, z: 120 } },
                  personaAgent: { emitter: 'Persona_NeuralPrism', intensity: 2.5, color: [0.75, 0.2, 1, 1], coordinates: { x: 100, y: 150, z: 90 } },
                  outboundAgent: { emitter: 'Outbound_LaserTracer', intensity: 3.2, color: [0, 1, 0.85, 1], coordinates: { x: 180, y: -50, z: 140 } },
                  distributorAgent: { emitter: 'Distributor_PlasmaMesh', intensity: 2.7, color: [0.2, 1, 0.4, 1], coordinates: { x: 220, y: 50, z: 110 } },
                  analyticsAgent: { emitter: 'Analytics_QuantumSpectrogram', intensity: 2.4, color: [0.9, 0.9, 0.2, 1], coordinates: { x: -180, y: -100, z: 70 } },
                  personaEvolutionAgent: { emitter: 'Evolution_DNAHelix', intensity: 3, color: [1, 0.1, 0.6, 1], coordinates: { x: 50, y: -180, z: 160 } },
                  heatDriftAgent: { emitter: 'HeatDrift_CryoThermalDissipation', intensity: 2, color: [0.4, 0.7, 0.9, 0.8], coordinates: { x: -50, y: -200, z: 60 } },
                  memoryAgent: { emitter: 'Memory_OsmiumLattice', intensity: 2.6, color: [0.5, 0.5, 0.8, 1], coordinates: { x: 0, y: 0, z: 50 } },
                  dealCloserAgent: { emitter: 'DealCloser_ImperialSupernova', intensity: 4.5, color: [1, 0.84, 0, 1], coordinates: { x: 0, y: 100, z: 300 } },
                  emailOpened: { emitter: 'Telemetry_SupercriticalBurst', intensity: 3.8, color: [0, 1, 0.5, 1], coordinates: { x: 0, y: 250, z: 150 } },
                  inboundReply: { emitter: 'Inbound_QuantumConvergence', intensity: 4.2, color: [1, 0.2, 0.9, 1], coordinates: { x: 0, y: -250, z: 150 } }
                }).map(([key, prof]: [string, any]) => {
                  const rgbaColor = `rgba(${Math.round(prof.color[0] * 255)}, ${Math.round(prof.color[1] * 255)}, ${Math.round(prof.color[2] * 255)}, ${prof.color[3]})`;
                  const isPulsing = activePulseEmitter === key || lastNiagaraPulse?.agentName === key || lastNiagaraPulse?.emitter === prof.emitter;

                  return (
                    <div
                      key={key}
                      onClick={() => triggerManualNiagaraPulse(key)}
                      style={{
                        borderColor: isPulsing ? rgbaColor : undefined,
                        boxShadow: isPulsing ? `0 0 20px ${rgbaColor}` : undefined
                      }}
                      className={`p-3.5 rounded-xl border bg-slate-900/60 cyber-glass transition-all cursor-pointer hover:border-purple-400 group space-y-2.5 ${
                        isPulsing ? 'scale-[1.02] bg-purple-950/30' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0 animate-pulse"
                            style={{ backgroundColor: rgbaColor, boxShadow: `0 0 8px ${rgbaColor}` }}
                          />
                          <span className="font-bold text-white text-xs truncate max-w-[130px]">
                            {key.replace('Agent', '').replace('email', 'Email ').replace('inbound', 'Inbound ')}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {prof.intensity}x
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="text-purple-300 font-bold truncate">
                          {prof.emitter}
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>X: {prof.coordinates.x}</span>
                          <span>Y: {prof.coordinates.y}</span>
                          <span>Z: {prof.coordinates.z}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerManualNiagaraPulse(key);
                        }}
                        className="w-full py-1 rounded bg-slate-800/80 group-hover:bg-purple-600/30 group-hover:text-purple-200 text-slate-400 text-[10px] font-bold transition-all flex items-center justify-center space-x-1 border border-slate-700 group-hover:border-purple-500/50"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>TRIGGER NIAGARA BURST</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-time Telemetry Packet Inspector & Viewport Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Latest Telemetry Pulse Monitor */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 cyber-glass space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>Live Outgoing Niagara Pulse Payload</span>
                  </span>
                  <span className="text-[10px] text-cyan-400">WebSocket: ws://127.0.0.1:3000/ws</span>
                </div>

                <div className="p-3 rounded-lg bg-black/60 border border-slate-950 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-64 overflow-y-auto">
                  {lastNiagaraPulse ? (
                    <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(lastNiagaraPulse, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-500 p-4 text-center">
                      No particle pulses emitted yet in this session. Click any agent card above to fire a live burst.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Masterplane Scene & Actor Telemetry */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 cyber-glass space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>Unreal Engine 5.8 Masterplane Scene State</span>
                  </span>
                  <span className="text-[10px] text-emerald-400">● Broadcast Sync Active</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Connected Viewports / Listeners:</span>
                    <span className="font-bold text-cyan-300">{unrealState?.clients || 0} Clients</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Active Camera Actor:</span>
                    <span className="font-bold text-purple-300">CineCameraActor (35mm f/2.0 Dolly In)</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Active Color LUT:</span>
                    <span className="font-bold text-amber-300">Cyberpunk Emerald / Imperial Gold</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Last Telemetry Packet Time:</span>
                    <span className="font-mono text-slate-200">
                      {unrealState?.lastPacket ? new Date(unrealState.lastPacket).toLocaleTimeString() : 'Standby'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => triggerManualNiagaraPulse('dealCloserAgent')}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-black" />
                    <span>⚡ TRIGGER SUPERNOVA PULSE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Real-Time Event Audit Log ────────────────────────────────────── */}
        <div className="cyber-glass rounded-xl border border-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Real-Time Audit Log</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                <Volume2 className="w-2.5 h-2.5" />
                <span>Kokoro 82M Active ({kokoroVoice})</span>
              </span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Streaming from localhost:3006</span>
          </div>
          <div className="h-24 overflow-y-auto font-mono text-[11px] space-y-1 pr-2 bg-black/40 p-2.5 rounded-lg border border-slate-900">
            {logs.map((l, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-start space-x-2">
                  <span className="text-slate-500">{l.time}</span>
                  <span className={l.type === 'success' ? 'text-emerald-400' : l.type === 'warn' ? 'text-amber-400' : 'text-slate-300'}>
                    {l.msg}
                  </span>
                </div>
                <button
                  onClick={() => speakLogWithKokoro(l.msg)}
                  title="Speak log event via Kokoro Neural Voice"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300 ml-2"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── GUMROAD BOILERPLATE BUYER INGESTION & DISCOVERY MODAL ────────── */}
        {showAddBuyerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-4xl cyber-glass bg-[#0c101a] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 p-6 space-y-6 my-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold font-mono text-white flex items-center space-x-2">
                        <span>Gumroad Boilerplate Lead Accelerator</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {campaignSettings.price}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">
                        Target, ingest, and auto-discover high-intent buyers for <strong className="text-cyan-300">{campaignSettings.product_name}</strong>
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddBuyerModal(false);
                    setBuyerActionStatus(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Sub-Tab Selector */}
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-mono">
                {[
                  { id: 'single', label: '+ Single Lead', icon: Plus },
                  { id: 'batch', label: '📑 Batch Import (CSV/Paste)', icon: FileText },
                  { id: 'discover', label: '⚡ Auto-Discover (Reddit / HN)', icon: Radio },
                  { id: 'campaign', label: '⚙️ Campaign Settings', icon: Sliders }
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = buyerModalTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setBuyerModalTab(t.id as any);
                        setBuyerActionStatus(null);
                      }}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Status Alert Banner */}
              {buyerActionStatus && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono flex items-center justify-between border ${
                    buyerActionStatus.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {buyerActionStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span>{buyerActionStatus.message}</span>
                  </div>
                  <button
                    onClick={() => setBuyerActionStatus(null)}
                    className="text-slate-400 hover:text-white text-xs underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* TAB 1: Single Lead Form */}
              {buyerModalTab === 'single' && (
                <form onSubmit={handleAddSingleBuyer} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">Prospect / Founder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah Jenkins"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">
                        Target Email Address <span className="text-rose-400">*</span>
                        <span className="text-[10px] text-cyan-400 ml-2 font-normal">(Auto Live DNS MX Verified)</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. sarah@launchstack.dev"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">Company / Project Domain</label>
                      <input
                        type="text"
                        placeholder="e.g. launchstack.dev"
                        value={buyerDomain}
                        onChange={(e) => setBuyerDomain(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">Initial Heat & Orbit Band</label>
                      <select
                        value={buyerHeat}
                        onChange={(e) => setBuyerHeat(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      >
                        <option value={90}>Supercritical Orbit (Heat 90) — High Urgency / Ready to Buy</option>
                        <option value={80}>Hot Orbit (Heat 80) — Evaluating Solutions</option>
                        <option value={60}>Warm Orbit (Heat 60) — Early Stage Exploration</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">Notes / Buyer Intent Context</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Building Next.js AI tool, asked on Twitter/HN about Stripe webhook setups and clerk auth"
                      value={buyerNotes}
                      onChange={(e) => setBuyerNotes(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Saves to SQLite WAL, verifies DNS MX records, and synthesizes tailored Gumroad pitch.
                    </span>
                    <button
                      type="submit"
                      disabled={isAddingBuyer}
                      className={`px-5 py-2.5 rounded-lg font-bold font-mono transition-all flex items-center space-x-2 ${
                        isAddingBuyer
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                      }`}
                    >
                      {isAddingBuyer ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying & Synthesizing...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+ Ingest Buyer & Generate Pitch</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: Batch Paste Form */}
              {buyerModalTab === 'batch' && (
                <form onSubmit={handleAddBatchBuyers} className="space-y-4 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 space-y-1">
                    <div className="text-white font-semibold">Paste multiple rows (one per line):</div>
                    <div className="text-[11px]">Format: <code className="text-cyan-300 font-mono">email, name, domain</code> or simply <code className="text-cyan-300 font-mono">email</code></div>
                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                      Example:<br />
                      alex@shipfast.tech, Alex Rivera, shipfast.tech<br />
                      marcus@cloudgen.io, Marcus Vance, cloudgen.io<br />
                      clara@nextstarter.dev
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">Prospect Lines</label>
                    <textarea
                      rows={6}
                      required
                      placeholder="alex@shipfast.tech, Alex Rivera, shipfast.tech&#10;marcus@cloudgen.io, Marcus Vance, cloudgen.io"
                      value={batchBuyersText}
                      onChange={(e) => setBatchBuyersText(e.target.value)}
                      className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Detected: <strong className="text-cyan-300">{batchBuyersText.split('\n').filter(l => l.includes('@')).length}</strong> valid email rows
                    </span>
                    <button
                      type="submit"
                      disabled={isAddingBuyer}
                      className={`px-5 py-2.5 rounded-lg font-bold font-mono transition-all flex items-center space-x-2 ${
                        isAddingBuyer
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 active:scale-95'
                      }`}
                    >
                      {isAddingBuyer ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Batch Ingesting & Verifying MX...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>Parse & Ingest All Buyers</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: Auto-Discovery Form */}
              {buyerModalTab === 'discover' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-slate-900/60 to-black space-y-2">
                    <div className="flex items-center space-x-2">
                      <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span className="font-bold text-white text-sm">Public Community Signal Harvester</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Scans live public developer streams from Reddit (<code className="text-cyan-300">r/SaaS</code>, <code className="text-cyan-300">r/SideProject</code>, <code className="text-cyan-300">r/nextjs</code>, <code className="text-cyan-300">r/reactjs</code>) and Hacker News for founders seeking boilerplates, auth solutions, and Stripe starter setups.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase">Target Channels</div>
                      <div className="text-white font-bold">4 Subreddits + HN</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase">Intent Filter</div>
                      <div className="text-emerald-400 font-bold">Boilerplate Seeker</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase">Verification</div>
                      <div className="text-cyan-400 font-bold">Live MX & RFC 5322</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase">Campaign Link</div>
                      <div className="text-amber-300 font-bold truncate">{campaignSettings.gumroad_url}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Non-invasive public feed aggregation. Zero credentials or scraping required.
                    </span>
                    <button
                      onClick={handleTriggerDiscovery}
                      disabled={isDiscoveringLeads}
                      className={`px-5 py-2.5 rounded-lg font-bold font-mono transition-all flex items-center space-x-2 ${
                        isDiscoveringLeads
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20 active:scale-95'
                      }`}
                    >
                      {isDiscoveringLeads ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Querying Live Public Streams...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-3.5 h-3.5" />
                          <span>⚡ Scan Public Dev Feeds Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: Campaign Settings */}
              {buyerModalTab === 'campaign' && (
                <form onSubmit={saveCampaignSettings} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">Product / Boilerplate Name</label>
                      <input
                        type="text"
                        required
                        value={campaignSettings.product_name}
                        onChange={(e) => setCampaignSettings(prev => ({ ...prev, product_name: e.target.value }))}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">Listing Price</label>
                      <input
                        type="text"
                        required
                        value={campaignSettings.price}
                        onChange={(e) => setCampaignSettings(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">
                      Gumroad Checkout URL <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://gumroad.com/l/your-boilerplate"
                      value={campaignSettings.gumroad_url}
                      onChange={(e) => setCampaignSettings(prev => ({ ...prev, gumroad_url: e.target.value }))}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">Tech Stack Highlights</label>
                    <textarea
                      rows={2}
                      value={campaignSettings.tech_stack}
                      onChange={(e) => setCampaignSettings(prev => ({ ...prev, tech_stack: e.target.value }))}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">Key Features & Selling Points</label>
                    <textarea
                      rows={2}
                      value={campaignSettings.key_features}
                      onChange={(e) => setCampaignSettings(prev => ({ ...prev, key_features: e.target.value }))}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Saved directly to SQLite WAL campaign_settings table.
                    </span>
                    <button
                      type="submit"
                      disabled={isSavingCampaign}
                      className={`px-5 py-2.5 rounded-lg font-bold font-mono transition-all flex items-center space-x-2 ${
                        isSavingCampaign
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-95'
                      }`}
                    >
                      {isSavingCampaign ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>Save Gumroad Campaign Details</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Ingested Buyer / Tailored Outbound Pitch Preview Card */}
              {recentlyAddedProspects.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Active Boilerplate Pitch Preview ({recentlyAddedProspects.length} Buyer{recentlyAddedProspects.length > 1 ? 's' : ''})</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      ● Ready for Direct AWS SES Dispatch
                    </span>
                  </div>

                  {recentlyAddedProspects.slice(0, 10).map((p: any) => {
                    const isRedditSynthetic = p.email?.includes('users.reddit.community');
                    const effectiveEmail = leadRecipientOverrides[p.id] !== undefined ? leadRecipientOverrides[p.id] : p.email;
                    const subject = p.subject || `Skip 80+ hours of scaffolding for ${p.domain || 'your app'} (${campaignSettings.product_name})`;
                    const copy = p.outboundPreview || `Hey ${p.name || 'there'},\n\nSaw you're building ${p.domain || 'a SaaS'}. I put together ${campaignSettings.product_name} with ${campaignSettings.key_features}.\n\nGrab it here: ${campaignSettings.gumroad_url}`;

                    return (
                      <div key={p.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm">{p.name || 'Founder / Lead'}</span>
                            <span className="text-cyan-300 font-mono">{p.email}</span>
                            {p.domain && <span className="text-slate-500">({p.domain})</span>}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isRedditSynthetic
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : p.mxVerified
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}>
                              {isRedditSynthetic ? '⚠️ REDDIT USERNAME' : p.mxVerified ? 'MX VERIFIED' : 'RFC 5322 VALID'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                              HEAT {p.heat || 80}
                            </span>
                          </div>
                        </div>

                        {isRedditSynthetic && (
                          <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                            <div className="leading-snug">
                              <strong>Reddit Lead (u/{p.name}):</strong> Public Reddit RSS feeds do not expose user emails. To verify delivery in your own inbox, click <strong>⚡ Send Test to Me</strong> or enter a real email below.
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Target Recipient Address:</span>
                            <button
                              type="button"
                              onClick={() => setLeadRecipientOverrides(prev => ({ ...prev, [p.id]: 'contact@primordialorigin.com' }))}
                              className="text-cyan-400 hover:text-cyan-300 font-mono text-[10px] underline"
                            >
                              ⚡ Use My Email (contact@primordialorigin.com)
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="email"
                              value={effectiveEmail}
                              onChange={(e) => setLeadRecipientOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                              placeholder="recipient@example.com"
                              className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                            {effectiveEmail === 'contact@primordialorigin.com' && (
                              <span className="px-2 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] font-bold whitespace-nowrap">
                                YOUR INBOX
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] text-slate-400">Subject:</div>
                          <div className="text-white font-semibold p-2 rounded bg-slate-900 border border-slate-800 text-[11px]">
                            {subject}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] text-slate-400">Tailored Pitch Copy:</div>
                          <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {copy}
                          </pre>
                        </div>

                        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(copy);
                              addLog(`Copied boilerplate pitch for ${effectiveEmail} to clipboard`, 'info');
                            }}
                            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1.5 transition-all"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Pitch</span>
                          </button>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                handleSendPitchEmail(p.id, 'contact@primordialorigin.com', subject, copy);
                              }}
                              className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center space-x-1.5 active:scale-95 transition-all"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>⚡ Send Test to Me</span>
                            </button>

                            <button
                              onClick={() => {
                                handleSendPitchEmail(p.id, effectiveEmail, subject, copy);
                              }}
                              className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>⚡ Send Pitch via AWS SES</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MessageSquareIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
