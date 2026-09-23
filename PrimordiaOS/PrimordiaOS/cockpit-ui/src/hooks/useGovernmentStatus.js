import { useState, useEffect } from 'react';

const KERNEL_EVENT_TYPES = Object.freeze({
  ACTION: 'KERNEL_ACTION',
  STATE_CHANGE: 'KERNEL_STATE_CHANGE',
  SAFE_MODE: 'KERNEL_SAFE_MODE',
  ROLLBACK: 'KERNEL_ROLLBACK',
});

const GUARDIAN_EVENT_TYPES = Object.freeze({
  ALERT: 'GUARDIAN_ALERT',
  OVERRIDE: 'GUARDIAN_OVERRIDE',
  QUARANTINE: 'GUARDIAN_QUARANTINE',
  SAFE_MODE: 'GUARDIAN_SAFE_MODE',
  INTEGRITY_ALERT: 'GUARDIAN_INTEGRITY_ALERT',
  VALIDATION_RESULT: 'GUARDIAN_VALIDATION_RESULT',
});

const ADVISOR_EVENT_TYPES = Object.freeze({
  REPORT: 'ADVISOR_REPORT',
  AI_SUGGESTION: 'ADVISOR_AI_SUGGESTION',
});

const COURT_EVENT_TYPES = Object.freeze({
  CASE: 'COURT_CASE',
  HEARING: 'COURT_HEARING',
  VERDICT: 'COURT_VERDICT',
  ENFORCEMENT: 'COURT_ENFORCEMENT',
  DRIFT_ALERT: 'COURT_DRIFT_ALERT',
});

const AUTONOMY_EVENT_TYPES = Object.freeze({
  STATE_CHANGE: 'AUTONOMY_STATE_CHANGE',
  ESCALATION_REQUEST: 'AUTONOMY_ESCALATION_REQUEST',
  ESCALATION_APPROVED: 'AUTONOMY_ESCALATION_APPROVED',
  ESCALATION_REJECTED: 'AUTONOMY_ESCALATION_REJECTED',
  DEESCALATION: 'AUTONOMY_DEESCALATION',
});

const CONSTITUTION_EVENT_TYPES = Object.freeze({
  SIGN: 'CONSTITUTION_SIGN',
  VERIFY: 'CONSTITUTION_VERIFY',
  VIOLATION: 'CONSTITUTION_VIOLATION',
  WATCH_EVENT: 'CONSTITUTION_WATCH_EVENT',
});


export function useGovernmentStatus() {
  const [status, setStatus] = useState({
    court: { lastVerdict: null, activeCases: 0, driftAlerts: 0 },
    guardian: { safeModeActive: false, quarantines: 0, integrityAlerts: 0 },
    council: { lastConsensus: null, anomalies: 0, driftLikelihood: 0 },
    autonomy: { currentMode: 'STABLE', lastEscalation: null, lastDeescalation: null, constitutionalViolations: 0 },
    constitution: { lastVerificationSummary: null, activeViolations: 0, watchedFilesCount: 0 },
    kernel: { lastSafeExecution: null, lastRollback: null },
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ws;
    
    function connect() {
      try {
        ws = new WebSocket('ws://localhost:3002');
      } catch (e) {
        setError(e.message);
        setLoading(false);
        return;
      }
      
      ws.onopen = () => {
        setLoading(false);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setStatus(prev => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep copy to mutate safely
            
            // COURT
            if (data.type === COURT_EVENT_TYPES.VERDICT) next.court.lastVerdict = data.payload;
            if (data.type === COURT_EVENT_TYPES.CASE) next.court.activeCases += 1;
            if (data.type === COURT_EVENT_TYPES.DRIFT_ALERT) next.court.driftAlerts += 1;
            
            // GUARDIAN
            if (data.type === GUARDIAN_EVENT_TYPES.SAFE_MODE) next.guardian.safeModeActive = data.payload?.active ?? true;
            if (data.type === GUARDIAN_EVENT_TYPES.QUARANTINE) next.guardian.quarantines += 1;
            if (data.type === GUARDIAN_EVENT_TYPES.INTEGRITY_ALERT) next.guardian.integrityAlerts += 1;
            
            // COUNCIL (Advisors)
            if (data.type === ADVISOR_EVENT_TYPES.REPORT) next.council.lastConsensus = data.payload;
            
            // AUTONOMY
            if (data.type === AUTONOMY_EVENT_TYPES.STATE_CHANGE) next.autonomy.currentMode = data.payload?.mode || 'STABLE';
            if (data.type === AUTONOMY_EVENT_TYPES.ESCALATION_APPROVED) next.autonomy.lastEscalation = data.payload;
            if (data.type === AUTONOMY_EVENT_TYPES.DEESCALATION) next.autonomy.lastDeescalation = data.payload;
            
            // CONSTITUTION
            if (data.type === CONSTITUTION_EVENT_TYPES.VERIFY) next.constitution.lastVerificationSummary = data.payload;
            if (data.type === CONSTITUTION_EVENT_TYPES.VIOLATION) {
               next.constitution.activeViolations += 1;
               next.autonomy.constitutionalViolations += 1;
            }
            if (data.type === CONSTITUTION_EVENT_TYPES.WATCH_EVENT) next.constitution.watchedFilesCount += 1;
            
            // KERNEL
            if (data.type === KERNEL_EVENT_TYPES.ACTION) next.kernel.lastSafeExecution = data.payload;
            if (data.type === KERNEL_EVENT_TYPES.ROLLBACK) next.kernel.lastRollback = data.payload;

            return next;
          });
        } catch(e) {}
      };
      
      ws.onclose = () => {
        setLoading(true);
        setTimeout(connect, 3000);
      };
      
      ws.onerror = (e) => {
        setError('WebSocket Error');
      };
    }
    
    connect();
    
    return () => {
      if (ws) ws.close();
    };
  }, []);

  return { status, loading, error };
}
