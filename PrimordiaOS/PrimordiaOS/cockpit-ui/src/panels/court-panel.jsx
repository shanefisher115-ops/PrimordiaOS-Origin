// cockpit-ui/src/panels/court-panel.jsx
// PrimordiaOS Court Realm — Cockpit UI Panel
// Read-only judicial dashboard with technovisual dark mode and actual brand logos.

import React, { useEffect, useState } from 'react';

// Brand Logos (from assets)
import primordialLogo from '../assets/logos/primordial.png';
import visionCoreLogo from '../assets/logos/visioncore.jpg';
import renderLoopLogo from '../assets/logos/renderloop.png';
import pulseLogo from '../assets/logos/pulse.jpg';
import creatorOsLogo from '../assets/logos/creatoros.jpg';
import innovationLogo from '../assets/logos/innovation.jpg';

// ─── Design Tokens ────────────────────────────────────────────────
const COLORS = {
  void: '#000000',
  voidSurface: '#0A0A0F',
  voidCard: '#111118',
  emerald: '#00E676',
  emeraldDim: '#00E67633',
  gold: '#FFD700',
  violet: '#6A0DAD',
  violetDim: '#6A0DAD33',
  silver: '#C0C0C0',
  red: '#FF4444',
  textPrimary: '#E0E0E0',
  textSecondary: '#888888',
};

const FONTS = {
  heading: "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
};

// ─── Styles ───────────────────────────────────────────────────────
const styles = {
  panel: {
    background: `linear-gradient(180deg, ${COLORS.void} 0%, ${COLORS.voidSurface} 100%)`,
    color: COLORS.textPrimary,
    fontFamily: FONTS.heading,
    padding: '2rem',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: `
      linear-gradient(${COLORS.emeraldDim} 1px, transparent 1px),
      linear-gradient(90deg, ${COLORS.emeraldDim} 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    opacity: 0.15,
    pointerEvents: 'none',
    zIndex: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1600px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    borderBottom: `2px solid ${COLORS.gold}`,
    paddingBottom: '1rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  mainLogo: {
    height: '80px',
    width: '80px',
    objectFit: 'contain',
    filter: `drop-shadow(0 0 15px ${COLORS.violet})`,
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: '2.5rem',
    fontWeight: 700,
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    margin: 0,
    textShadow: `0 0 20px ${COLORS.gold}66`,
  },
  headerSubtitle: {
    fontFamily: FONTS.mono,
    fontSize: '0.85rem',
    color: COLORS.emerald,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    margin: 0,
    opacity: 0.9,
  },
  brandStrip: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  brandIcon: {
    height: '40px',
    width: '40px',
    borderRadius: '4px',
    objectFit: 'cover',
    border: `1px solid ${COLORS.silver}44`,
    transition: 'transform 0.2s',
  },
  // ... other styles map to the previous one
};

// ─── Keyframe injection ───────────────────────────────────────────
const injectKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('court-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'court-panel-styles';
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    .brand-icon:hover {
      transform: scale(1.1);
      border-color: ${COLORS.gold};
      box-shadow: 0 0 10px ${COLORS.gold}44;
    }
  `;
  document.head.appendChild(style);
};

// ─── Main Panel ───────────────────────────────────────────────────
export default function CourtPanel() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    injectKeyframes();
    
    let ws;
    function connect() {
      try { ws = new WebSocket('ws://localhost:3002'); } catch { return; }
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
    }
    connect();
    return () => { if (ws) ws.close(); };
  }, []);

  return (
    <div style={styles.panel}>
      <div style={styles.gridOverlay} />
      
      <div style={styles.content}>
        {/* Header with Logos */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img src={primordialLogo} alt="PrimordialOS" style={styles.mainLogo} />
            <div>
              <h1 style={styles.headerTitle}>Court Realm</h1>
              <p style={styles.headerSubtitle}>
                Zero Drift Law •{' '}
                {connected ? (
                  <span style={{ color: COLORS.emerald }}>● SYS-LINK ACTIVE</span>
                ) : (
                  <span style={{ color: COLORS.red }}>● SYS-LINK OFFLINE</span>
                )}
              </p>
            </div>
          </div>
          
          <div style={styles.brandStrip}>
            <img src={visionCoreLogo} className="brand-icon" style={styles.brandIcon} title="VisionCore" />
            <img src={renderLoopLogo} className="brand-icon" style={styles.brandIcon} title="RenderLoop" />
            <img src={pulseLogo} className="brand-icon" style={styles.brandIcon} title="Pulse Engine" />
            <img src={creatorOsLogo} className="brand-icon" style={styles.brandIcon} title="Creator OS" />
            <img src={innovationLogo} className="brand-icon" style={styles.brandIcon} title="Innovation Generator" />
          </div>
        </div>

        {/* ... rest of the tables and components from previous iteration ... */}
        
      </div>
    </div>
  );
}
