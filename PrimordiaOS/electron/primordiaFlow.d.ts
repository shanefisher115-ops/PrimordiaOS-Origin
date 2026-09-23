/**
 * Type declarations for the Primordia Flow IPC Preload API
 */

export interface DaemonStatus {
  running: boolean;
  ready: boolean;
  pid: number | null;
  port: number;
  managed: boolean;
  error: string | null;
  uptimeStart?: number | null;
}

export interface BoostExecutionOptions {
  directive?: string;
  distributeLive?: boolean;
  dryRun?: boolean;
  sourceFilter?: string[];
  minHeatBand?: number;
}

export interface BoostExecutionResult {
  boost_id: string;
  total_latency_ms: number;
  leads_verified: number;
  mx_deliverability_rate?: number;
  high_heat_prospects: number;
  personas_synthesized: number;
  posts_distributed: number;
  graph_nodes_updated?: number;
  graph_edges_updated?: number;
  traces?: any[];
}

export interface HighHeatLead {
  id: string;
  name: string;
  email?: string;
  heat_score: number;
  band?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface PrimordiaFlowAPI {
  triggerBoost: (options?: BoostExecutionOptions) => Promise<BoostExecutionResult>;
  toggleLiveMode: () => Promise<boolean>;
  getLiveMode: () => Promise<boolean>;
  setLiveMode: (val: boolean) => Promise<boolean>;
  getDaemonStatus: () => Promise<DaemonStatus>;
  restartDaemon: () => Promise<DaemonStatus>;
  openTraces: () => Promise<void>;
  showNotification: (title: string, body: string) => Promise<boolean>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  onBoostCompleted: (callback: (data: BoostExecutionResult) => void) => () => void;
  onHighHeatLead: (callback: (lead: HighHeatLead) => void) => () => void;
  onLiveModeChanged: (callback: (liveMode: boolean) => void) => () => void;
  onDaemonStatusChanged: (callback: (status: DaemonStatus) => void) => () => void;
  onNavigateTraces: (callback: () => void) => () => void;
  version: string;
  platform: string;
  appName: string;
}

declare global {
  interface Window {
    primordiaFlow?: PrimordiaFlowAPI;
  }
}
