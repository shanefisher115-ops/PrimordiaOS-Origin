import React from 'react';
import { useGovernmentStatus } from '../hooks/useGovernmentStatus';
import '../styles/government-panel.css';

export default function GovernmentPanel() {
  const { status, loading, error } = useGovernmentStatus();

  return (
    <div className="gov-panel-container">
      <div className="gov-panel-grid"></div>
      
      <div className="gov-panel-content">
        <header className="gov-panel-header">
          <h1>PrimordiaOS Government Cockpit</h1>
          <div style={{ color: loading ? '#FFD700' : (error ? '#FF4444' : '#00E676'), fontWeight: 'bold' }}>
            {loading ? 'CONNECTING...' : (error ? 'CONNECTION FAILED' : 'SYS-LINK ACTIVE')}
          </div>
        </header>

        <div className="gov-map">
          {/* Top Layer: Advisory Council */}
          <div className="gov-row">
            <div className={`gov-node node-council ${status.council.anomalies > 0 ? 'active-pulse' : ''}`}>
              <h2>Advisory Council</h2>
              <div className="metric"><span>Anomalies:</span> <span className={status.council.anomalies > 0 ? 'status-warning' : 'status-ok'}>{status.council.anomalies}</span></div>
              <div className="metric"><span>Drift Likelihood:</span> <span className="status-ok">{(status.council.driftLikelihood * 100).toFixed(1)}%</span></div>
              <div className="metric" style={{marginTop: '1rem', color: '#888', fontSize: '0.8rem', flexDirection: 'column'}}>
                <span>LAST CONSENSUS:</span>
                <span style={{color: '#aaa', marginTop: '0.2rem'}}>{status.council.lastConsensus ? JSON.stringify(status.council.lastConsensus).substring(0, 40) + '...' : 'NONE'}</span>
              </div>
              <div className="flow-line vertical-line" />
            </div>
          </div>

          {/* Middle Layer: Court and Guardian */}
          <div className="gov-row">
            <div className={`gov-node ${status.court.driftAlerts > 0 ? 'active-pulse' : ''}`}>
              <h2>Court Realm</h2>
              <div className="metric"><span>Active Cases:</span> <span>{status.court.activeCases}</span></div>
              <div className="metric"><span>Drift Alerts:</span> <span className={status.court.driftAlerts > 0 ? 'status-warning' : 'status-ok'}>{status.court.driftAlerts}</span></div>
              <div className="metric" style={{marginTop: '1rem', color: '#888', fontSize: '0.8rem', flexDirection: 'column'}}>
                <span>LAST VERDICT:</span>
                <span style={{color: '#aaa', marginTop: '0.2rem'}}>{status.court.lastVerdict ? JSON.stringify(status.court.lastVerdict).substring(0, 40) + '...' : 'NONE'}</span>
              </div>
              <div className="flow-line vertical-line" />
            </div>

            <div className={`gov-node node-guardian ${status.guardian.safeModeActive ? 'violation' : ''}`}>
              <h2>Guardian Realm</h2>
              <div className="metric"><span>Safe Mode:</span> <span className={status.guardian.safeModeActive ? 'status-violation' : 'status-ok'}>{status.guardian.safeModeActive ? 'ACTIVE' : 'OFF'}</span></div>
              <div className="metric"><span>Quarantines:</span> <span>{status.guardian.quarantines}</span></div>
              <div className="metric"><span>Integrity Alerts:</span> <span className={status.guardian.integrityAlerts > 0 ? 'status-warning' : 'status-ok'}>{status.guardian.integrityAlerts}</span></div>
              <div className={`flow-line vertical-line ${status.guardian.safeModeActive ? 'violation' : ''}`} />
            </div>
          </div>

          {/* Bottom Layer: Autonomy & Constitution */}
          <div className="gov-row">
            <div className={`gov-node ${status.autonomy.constitutionalViolations > 0 ? 'violation' : ''}`}>
              <h2>Autonomy Layer</h2>
              <div className="metric"><span>Mode:</span> <span className="status-ok">{status.autonomy.currentMode}</span></div>
              <div className="metric"><span>Violations:</span> <span className={status.autonomy.constitutionalViolations > 0 ? 'status-violation' : 'status-ok'}>{status.autonomy.constitutionalViolations}</span></div>
              <div className={`flow-line vertical-line ${status.autonomy.constitutionalViolations > 0 ? 'violation' : ''}`} />
            </div>

            <div className={`gov-node ${status.constitution.activeViolations > 0 ? 'violation' : 'active-pulse'}`}>
              <h2>Constitution</h2>
              <div className="metric"><span>Active Violations:</span> <span className={status.constitution.activeViolations > 0 ? 'status-violation' : 'status-ok'}>{status.constitution.activeViolations}</span></div>
              <div className="metric"><span>Watched Files:</span> <span>{status.constitution.watchedFilesCount}</span></div>
              <div className="metric" style={{marginTop: '1rem', color: '#888', fontSize: '0.8rem', flexDirection: 'column'}}>
                <span>LAST VERIFY:</span>
                <span style={{color: '#aaa', marginTop: '0.2rem'}}>{status.constitution.lastVerificationSummary ? 'VERIFIED' : 'PENDING'}</span>
              </div>
              <div className="flow-line vertical-line" />
            </div>
          </div>

          {/* Base Layer: Kernel */}
          <div className="gov-row">
            <div className="gov-node node-kernel">
              <h2>Kernel (Executive)</h2>
              <div className="metric" style={{marginTop: '1rem', color: '#888', fontSize: '0.8rem', flexDirection: 'column'}}>
                <span>LAST ACTION:</span>
                <span style={{color: '#aaa', marginTop: '0.2rem'}}>{status.kernel.lastSafeExecution ? JSON.stringify(status.kernel.lastSafeExecution).substring(0, 40) + '...' : 'NONE'}</span>
              </div>
              <div className="metric" style={{marginTop: '0.5rem', color: '#888', fontSize: '0.8rem', flexDirection: 'column'}}>
                <span>LAST ROLLBACK:</span>
                <span style={{color: '#aaa', marginTop: '0.2rem'}}>{status.kernel.lastRollback ? JSON.stringify(status.kernel.lastRollback).substring(0, 40) + '...' : 'NONE'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
