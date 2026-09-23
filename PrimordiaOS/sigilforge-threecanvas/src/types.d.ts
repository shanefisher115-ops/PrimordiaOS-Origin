// Global environment declarations
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
