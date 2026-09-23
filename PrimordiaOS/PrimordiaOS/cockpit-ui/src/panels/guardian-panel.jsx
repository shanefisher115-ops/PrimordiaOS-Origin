import React, { useEffect, useState } from 'react';

// Use PrimordiaOS Technovisual palette:
// dark mode
// emerald (#00E676)
// auric gold (#FFD700)
// royal violet (#6A0DAD)
// black void background
// grid silver accents

const WS_URL = "ws://localhost:3002"; // standard PrimordiaOS bus ws port

const GuardianPanel = () => {
  const [logs, setLogs] = useState([]);
  const [quarantines, setQuarantines] = useState([]);
  const [safeMode, setSafeMode] = useState(false);
  const [integrityAlerts, setIntegrityAlerts] = useState([]);
  const [overrides, setOverrides] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type;

        if (type === 'GUARDIAN_QUARANTINE') {
          setQuarantines(prev => [...prev, data.payload]);
        } else if (type === 'GUARDIAN_SAFE_MODE') {
          setSafeMode(true);
        } else if (type === 'GUARDIAN_INTEGRITY_ALERT') {
          setIntegrityAlerts(prev => [...prev, data.payload]);
        } else if (type === 'GUARDIAN_OVERRIDE') {
          setOverrides(prev => [...prev, data.payload]);
        }

        // Keep a generic log of all Guardian events for display
        if (type && type.startsWith('GUARDIAN_')) {
          setLogs(prev => [...prev, { ...data, ts: new Date().toISOString() }]);
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>GUARDIAN REALM STATUS</h1>
      
      <div style={styles.grid}>
        
        {/* SAFE MODE INDICATOR */}
        <div style={{...styles.card, border: safeMode ? '2px solid #FFD700' : '1px solid #333'}}>
          <h2 style={styles.cardTitle}>SAFE MODE</h2>
          <div style={{ color: safeMode ? '#FFD700' : '#00E676', fontWeight: 'bold', fontSize: '1.2em' }}>
            {safeMode ? 'ACTIVATED' : 'OFF'}
          </div>
        </div>

        {/* QUARANTINES */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>ACTIVE QUARANTINES</h2>
          {quarantines.length === 0 ? <p style={styles.textOK}>None</p> : (
            <ul style={styles.list}>
              {quarantines.map((q, idx) => (
                <li key={idx} style={styles.listItem}>
                  <strong>{q.target}</strong>: {q.reason}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* INTEGRITY ALERTS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>INTEGRITY ALERTS</h2>
          {integrityAlerts.length === 0 ? <p style={styles.textOK}>Clear</p> : (
            <ul style={styles.list}>
              {integrityAlerts.map((alert, idx) => (
                <li key={idx} style={styles.listItemAlert}>
                  {alert.target}: {alert.reason}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* OVERRIDES */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>RECENT OVERRIDES</h2>
          {overrides.length === 0 ? <p style={styles.textOK}>None</p> : (
            <ul style={styles.list}>
              {overrides.map((ov, idx) => (
                <li key={idx} style={styles.listItem}>
                  {ov.reason}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      <div style={styles.logSection}>
        <h2 style={styles.cardTitle}>REAL-TIME EVENT LOG</h2>
        <div style={styles.logBox}>
          {logs.map((log, idx) => (
            <div key={idx} style={styles.logEntry}>
              <span style={{color: '#6A0DAD'}}>[{log.ts}]</span> 
              <span style={{color: '#FFD700', marginLeft: '10px'}}>{log.type}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#050505',
    color: '#E0E0E0',
    fontFamily: 'monospace',
    padding: '20px',
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
    backgroundSize: '20px 20px'
  },
  title: {
    color: '#00E676',
    borderBottom: '1px solid #00E676',
    paddingBottom: '10px',
    textShadow: '0 0 10px #00E676'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '20px'
  },
  card: {
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    border: '1px solid #333',
    borderRadius: '4px',
    padding: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
  },
  cardTitle: {
    color: '#6A0DAD',
    marginTop: 0,
    fontSize: '1.1em',
    textShadow: '0 0 5px #6A0DAD'
  },
  textOK: {
    color: '#00E676'
  },
  list: {
    listStyleType: 'none',
    padding: 0,
    margin: 0
  },
  listItem: {
    borderBottom: '1px solid #222',
    padding: '5px 0',
    fontSize: '0.9em'
  },
  listItemAlert: {
    color: '#FFD700',
    borderBottom: '1px solid #222',
    padding: '5px 0',
    fontSize: '0.9em'
  },
  logSection: {
    marginTop: '30px',
    backgroundColor: 'rgba(0,0,0,0.9)',
    border: '1px solid #333',
    padding: '15px'
  },
  logBox: {
    height: '200px',
    overflowY: 'auto',
    fontFamily: 'Consolas, monospace',
    fontSize: '0.85em'
  },
  logEntry: {
    marginBottom: '4px'
  }
};

export default GuardianPanel;
