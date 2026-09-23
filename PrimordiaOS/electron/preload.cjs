/**
 * ==============================================================================
 * PRIMORDIA FLOW — SECURE IPC PRELOAD SCRIPT
 * Exposes window.primordiaFlow to the MoneyPlugHub Cockpit renderer securely.
 * Context Isolation: ENABLED
 * Node Integration: DISABLED
 * ==============================================================================
 */

let electronModule = null;
try {
  electronModule = require('electron');
} catch (e) {
  electronModule = null;
}

const contextBridge = electronModule && typeof electronModule === 'object' ? electronModule.contextBridge : null;
const ipcRenderer = (electronModule && typeof electronModule === 'object' && electronModule.ipcRenderer)
  ? electronModule.ipcRenderer
  : {
      invoke: async () => ({}),
      on: () => {},
      removeListener: () => {}
    };

const primordiaFlowAPI = {
  // ── Core PHOM /boost Commands ───────────────────────────────────────────────
  /**
   * Triggers the 11-Layer PHOM Sovereign Stack /boost sequence
   * @param {Object} [options] - Options including distributeLive, directive, dryRun
   * @returns {Promise<Object>} The boost execution result
   */
  triggerBoost: (options = {}) => {
    return ipcRenderer.invoke('flow:trigger-boost', options);
  },

  /**
   * Toggles the PHOM Live Mode state (Staging Simulation vs. Live Public Distribution)
   * @returns {Promise<boolean>} The updated live mode boolean
   */
  toggleLiveMode: () => {
    return ipcRenderer.invoke('flow:toggle-live-mode');
  },

  /**
   * Retrieves current Live Mode status
   * @returns {Promise<boolean>}
   */
  getLiveMode: () => {
    return ipcRenderer.invoke('flow:get-live-mode');
  },

  /**
   * Sets Live Mode explicitly
   * @param {boolean} val
   * @returns {Promise<boolean>}
   */
  setLiveMode: (val) => {
    return ipcRenderer.invoke('flow:set-live-mode', val);
  },

  // ── Daemon Supervisor Status & Control ──────────────────────────────────────
  /**
   * Queries the status of the local Node.js backend daemon on port 3001
   * @returns {Promise<{ running: boolean, ready: boolean, pid: number | null, port: number, managed: boolean, error: string | null }>}
   */
  getDaemonStatus: () => {
    return ipcRenderer.invoke('flow:get-daemon-status');
  },

  /**
   * Requests a restart of the local daemon
   * @returns {Promise<Object>}
   */
  restartDaemon: () => {
    return ipcRenderer.invoke('flow:restart-daemon');
  },

  // ── Traces & Navigation ─────────────────────────────────────────────────────
  /**
   * Directs the UI or main process to display the persisted execution traces
   */
  openTraces: () => {
    return ipcRenderer.invoke('flow:open-traces');
  },

  // ── Desktop Toast Notifications ─────────────────────────────────────────────
  /**
   * Dispatches a native OS toast notification via the Electron main process
   * @param {string} title
   * @param {string} body
   */
  showNotification: (title, body) => {
    return ipcRenderer.invoke('flow:show-notification', { title, body });
  },

  // ── Window Management Controls ──────────────────────────────────────────────
  minimize: () => ipcRenderer.invoke('flow:window-minimize'),
  maximize: () => ipcRenderer.invoke('flow:window-maximize'),
  close: () => ipcRenderer.invoke('flow:window-close'),

  // ── Reactive Event Subscriptions ────────────────────────────────────────────
  /**
   * Subscribe to /boost completion events
   * @param {Function} callback - (payload: Object) => void
   * @returns {Function} Unsubscribe cleanup function
   */
  onBoostCompleted: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('flow:boost-completed', handler);
    return () => ipcRenderer.removeListener('flow:boost-completed', handler);
  },

  /**
   * Subscribe to high-heat leads alert events
   * @param {Function} callback - (lead: Object) => void
   * @returns {Function} Unsubscribe cleanup function
   */
  onHighHeatLead: (callback) => {
    const handler = (_event, lead) => callback(lead);
    ipcRenderer.on('flow:high-heat-lead', handler);
    return () => ipcRenderer.removeListener('flow:high-heat-lead', handler);
  },

  /**
   * Subscribe to Live Mode state changes (e.g. toggled via system tray)
   * @param {Function} callback - (liveMode: boolean) => void
   * @returns {Function} Unsubscribe cleanup function
   */
  onLiveModeChanged: (callback) => {
    const handler = (_event, liveMode) => callback(liveMode);
    ipcRenderer.on('flow:live-mode-changed', handler);
    return () => ipcRenderer.removeListener('flow:live-mode-changed', handler);
  },

  /**
   * Subscribe to daemon health / status changes
   * @param {Function} callback - (status: Object) => void
   * @returns {Function} Unsubscribe cleanup function
   */
  onDaemonStatusChanged: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('flow:daemon-status-changed', handler);
    return () => ipcRenderer.removeListener('flow:daemon-status-changed', handler);
  },

  /**
   * Subscribe to Tray navigation requests (e.g. user clicked "View Traces")
   * @param {Function} callback - () => void
   * @returns {Function} Unsubscribe cleanup function
   */
  onNavigateTraces: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('flow:navigate-traces', handler);
    return () => ipcRenderer.removeListener('flow:navigate-traces', handler);
  },

  // ── Static Metadata ─────────────────────────────────────────────────────────
  version: '1.0.0',
  platform: process.platform,
  appName: 'Primordia Flow'
};

// Expose safe API to the renderer world
try {
  contextBridge.exposeInMainWorld('primordiaFlow', primordiaFlowAPI);
} catch (e) {
  // If contextBridge is not available (e.g., nodeIntegration fallback in tests)
  window.primordiaFlow = primordiaFlowAPI;
}

if (typeof module !== 'undefined') {
  module.exports = { primordiaFlowAPI };
}
