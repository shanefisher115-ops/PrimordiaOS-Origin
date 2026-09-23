import React, { useState, useEffect } from 'react';

const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3002';

const ConstitutionPanel = () => {
  const [logs, setLogs] = useState([]);
  const [violations, setViolations] = useState([]);
  const [watchEvents, setWatchEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      setConnectionStatus('Secure (Zero Drift Law active)');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type;

        if (type === 'CONSTITUTION_VIOLATION') {
          setViolations(prev => [{ ...data.payload, ts: data.ts || new Date().toISOString() }, ...prev]);
        } else if (type === 'CONSTITUTION_WATCH_EVENT') {
          setWatchEvents(prev => [{ ...data.payload, ts: data.ts || new Date().toISOString() }, ...prev]);
        } else if (type === 'CONSTITUTION_SIGN' || type === 'CONSTITUTION_VERIFY') {
          setLogs(prev => [{ ...data.payload, ts: data.ts || new Date().toISOString(), type }, ...prev]);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onerror = () => {
      setConnectionStatus('Connection Error');
    };

    ws.onclose = () => {
      setConnectionStatus('Disconnected');
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>CONSTITUTIONAL SIGNATURE SYSTEM</h2>
        <div style={styles.statusBadge(connectionStatus)}>
          {connectionStatus}
        </div>
      </div>

      <div style={styles.grid}>
        {/* Violations Section */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Active Violations (Drift Alerts)</h3>
          {violations.length === 0 ? (
            <p style={styles.textMuted}>No tampering detected.</p>
          ) : (
            <ul style={styles.list}>
              {violations.map((v, i) => (
                <li key={i} style={styles.violationItem}>
                  <strong>{v.filePath}</strong>: {v.reason} <br/>
                  <small>{new Date(v.ts).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Watch Events Section */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>File Watch Events</h3>
          {watchEvents.length === 0 ? (
            <p style={styles.textMuted}>No file modifications detected.</p>
          ) : (
            <ul style={styles.list}>
              {watchEvents.map((w, i) => (
                <li key={i} style={styles.watchItem}>
                  <strong>{w.filePath}</strong> ({w.eventType}) <br/>
                  <small>{new Date(w.ts).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Logs Section */}
        <div style={styles.cardFull}>
          <h3 style={styles.cardTitle}>Signature & Verification Log</h3>
          {logs.length === 0 ? (
            <p style={styles.textMuted}>Awaiting signature operations...</p>
          ) : (
            <ul style={styles.list}>
              {logs.map((log, i) => (
                <li key={i} style={styles.logItem}>
                  <span style={styles.logType(log.type)}>[{log.type}]</span> {log.filePath} {log.success ? 'Success' : ''}
                  <span style={styles.timestamp}>{new Date(log.ts).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#0a0a0a', // Dark mode
    color: '#e0e0e0',
    fontFamily: '"Fira Code", monospace',
    height: '100%',
    boxSizing: 'border-box',
    overflowY: 'auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #333',
    paddingBottom: '10px',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    color: '#00ff9d', // Emerald
    textTransform: 'uppercase',
    letterSpacing: '2px'
  },
  statusBadge: (status) => ({
    padding: '5px 12px',
    borderRadius: '4px',
    backgroundColor: status.includes('Secure') ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 60, 60, 0.1)',
    color: status.includes('Secure') ? '#00ff9d' : '#ff3c3c',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    border: `1px solid ${status.includes('Secure') ? '#00ff9d' : '#ff3c3c'}`
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  card: {
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '15px'
  },
  cardFull: {
    gridColumn: '1 / -1',
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '15px'
  },
  cardTitle: {
    margin: '0 0 15px 0',
    color: '#ffd700', // Auric Gold
    borderBottom: '1px solid #222',
    paddingBottom: '8px'
  },
  textMuted: {
    color: '#666',
    fontStyle: 'italic'
  },
  list: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    maxHeight: '250px',
    overflowY: 'auto'
  },
  violationItem: {
    padding: '10px',
    marginBottom: '8px',
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    borderLeft: '3px solid #ff3c3c',
    borderRadius: '0 4px 4px 0',
    fontSize: '0.9rem'
  },
  watchItem: {
    padding: '10px',
    marginBottom: '8px',
    backgroundColor: 'rgba(138, 43, 226, 0.05)',
    borderLeft: '3px solid #8a2be2', // Royal Violet
    borderRadius: '0 4px 4px 0',
    fontSize: '0.9rem'
  },
  logItem: {
    padding: '8px 0',
    borderBottom: '1px solid #222',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem'
  },
  logType: (type) => ({
    color: type === 'CONSTITUTION_SIGN' ? '#00ff9d' : '#ffd700',
    marginRight: '10px',
    fontWeight: 'bold'
  }),
  timestamp: {
    marginLeft: 'auto',
    color: '#555'
  }
};

export default ConstitutionPanel;
