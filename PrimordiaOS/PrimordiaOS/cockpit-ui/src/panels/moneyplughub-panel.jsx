import React, { useState, useEffect } from 'react';

// Using PrimordiaOS Technovisual palette colors
const COLORS = {
  emerald: '#50C878',
  auricGold: '#FFD700',
  royalViolet: '#7851A9',
  bgDark: '#121212',
  panelBg: '#1E1E1E',
  textLight: '#E0E0E0',
  dangerRed: '#FF4C4C'
};

const MoneyPlugHubPanel = () => {
  const [logs, setLogs] = useState([]);
  const [state, setState] = useState({
    status: 'Initializing...',
    driftLikelihood: 'low',
    driftScore: 0
  });

  const [violations, setViolations] = useState({
    loops: 0,
    transactions: 0
  });

  const [anomalyScore, setAnomalyScore] = useState(0);

  useEffect(() => {
    // In a real implementation, this would connect to the websocket
    // const ws = new WebSocket(`ws://${window.location.hostname}:3002`);
    
    // For now, simulate receiving events
    const handleEvent = (event) => {
      const ts = new Date().toLocaleTimeString();
      switch (event.type) {
        case 'MPH_STATE_UPDATE':
          setState(prev => ({ ...prev, ...event.payload }));
          break;
        case 'MPH_LOOP_VIOLATION':
          setViolations(prev => ({ ...prev, loops: prev.loops + 1 }));
          addLog(`[${ts}] Loop Violation: ${event.payload.reason}`);
          break;
        case 'MPH_TRANSACTION_VIOLATION':
          setViolations(prev => ({ ...prev, transactions: prev.transactions + 1 }));
          addLog(`[${ts}] Tx Violation: ${event.payload.reason}`);
          break;
        case 'MPH_ANOMALY':
          setAnomalyScore(event.payload.anomalyScore);
          addLog(`[${ts}] Anomaly Detected. Score: ${event.payload.anomalyScore}`);
          break;
        case 'MPH_DRIFT_ALERT':
          setState(prev => ({ 
            ...prev, 
            driftLikelihood: event.payload.driftLikelihood,
            driftScore: event.payload.driftScore 
          }));
          addLog(`[${ts}] DRIFT ALERT! Score: ${event.payload.driftScore}`);
          break;
        default:
          break;
      }
    };

    // Simulate some initial state
    handleEvent({ type: 'MPH_STATE_UPDATE', payload: { status: 'Monitoring', driftLikelihood: 'low', driftScore: 0.1 } });

    // Mock incoming events
    const interval = setInterval(() => {
      // randomly generate some mock events for demonstration
      if (Math.random() > 0.9) {
         handleEvent({ type: 'MPH_TRANSACTION_VIOLATION', payload: { reason: 'suspicious_transaction_pattern' }});
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const addLog = (msg) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const getDriftColor = (likelihood) => {
    if (likelihood === 'high') return COLORS.dangerRed;
    if (likelihood === 'medium') return COLORS.auricGold;
    return COLORS.emerald;
  };

  return (
    <div style={{
      backgroundColor: COLORS.bgDark,
      color: COLORS.textLight,
      padding: '20px',
      fontFamily: 'monospace',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${COLORS.royalViolet}`, paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: COLORS.auricGold }}>MoneyPlugHub Console</h2>
        <div style={{ color: COLORS.emerald, fontWeight: 'bold' }}>
          Status: {state.status}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: COLORS.panelBg, padding: '15px', borderRadius: '5px' }}>
          <h3 style={{ marginTop: 0, color: COLORS.royalViolet }}>Violations</h3>
          <div>Loop Violations: <span style={{ color: violations.loops > 0 ? COLORS.dangerRed : COLORS.emerald }}>{violations.loops}</span></div>
          <div>Tx Violations: <span style={{ color: violations.transactions > 0 ? COLORS.dangerRed : COLORS.emerald }}>{violations.transactions}</span></div>
        </div>
        
        <div style={{ backgroundColor: COLORS.panelBg, padding: '15px', borderRadius: '5px' }}>
          <h3 style={{ marginTop: 0, color: COLORS.royalViolet }}>Drift & Anomalies</h3>
          <div>Anomaly Score: <span style={{ color: anomalyScore > 0.5 ? COLORS.dangerRed : COLORS.emerald }}>{anomalyScore.toFixed(2)}</span></div>
          <div>Drift Likelihood: <span style={{ color: getDriftColor(state.driftLikelihood), fontWeight: 'bold' }}>{state.driftLikelihood.toUpperCase()}</span></div>
          <div>Drift Score: {state.driftScore.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ flexGrow: 1, backgroundColor: COLORS.panelBg, padding: '15px', borderRadius: '5px', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, color: COLORS.royalViolet, marginBottom: '10px' }}>Immutable Log</h3>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>No logs yet...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ borderBottom: '1px solid #333', padding: '5px 0', fontSize: '0.9em' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MoneyPlugHubPanel;
