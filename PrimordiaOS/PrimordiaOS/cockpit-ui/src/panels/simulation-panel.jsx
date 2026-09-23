import React, { useEffect, useState } from 'react';

export default function SimulationPanel() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState({
    physicsStable: true,
    agentsStable: true,
    driftLikelihood: 'LOW'
  });

  useEffect(() => {
    const ws = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:3002');
    
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type?.startsWith('SIMULATION_')) {
          if (data.type === 'SIMULATION_STATE_UPDATE') {
            setStatus(data.payload);
          } else {
            setEvents(prev => [data, ...prev].slice(0, 50));
          }
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    return () => ws.close();
  }, []);

  const getDriftColor = (likelihood) => {
    switch(likelihood) {
      case 'CRITICAL': return 'text-red-500 font-bold';
      case 'HIGH': return 'text-orange-500';
      case 'MEDIUM': return 'text-yellow-400';
      default: return 'text-emerald-400';
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white h-full border border-gray-700 shadow-2xl rounded-lg font-mono">
      <h2 className="text-3xl text-emerald-400 mb-6 font-bold border-b border-emerald-900 pb-2">
        SIMULATION REALM MISSION CONTROL
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`p-4 border rounded ${status.physicsStable ? 'border-emerald-500 bg-emerald-900/20' : 'border-red-500 bg-red-900/20'}`}>
          <h3 className="text-lg font-semibold mb-1">Physics Integrity</h3>
          <p className={status.physicsStable ? 'text-emerald-400' : 'text-red-400'}>
            {status.physicsStable ? 'STABLE' : 'VIOLATION DETECTED'}
          </p>
        </div>
        <div className={`p-4 border rounded ${status.agentsStable ? 'border-emerald-500 bg-emerald-900/20' : 'border-orange-500 bg-orange-900/20'}`}>
          <h3 className="text-lg font-semibold mb-1">Agent Behavior</h3>
          <p className={status.agentsStable ? 'text-emerald-400' : 'text-orange-400'}>
            {status.agentsStable ? 'NOMINAL' : 'ANOMALY DETECTED'}
          </p>
        </div>
        <div className="p-4 border border-violet-500 bg-violet-900/20 rounded">
          <h3 className="text-lg font-semibold mb-1 text-violet-300">Drift Likelihood</h3>
          <p className={getDriftColor(status.driftLikelihood)}>
            {status.driftLikelihood}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xl text-yellow-500 mb-3 border-b border-yellow-900 pb-1">Real-Time Immutable Log</h3>
        <div className="bg-black p-4 rounded h-64 overflow-y-auto font-mono text-sm border border-gray-800">
          {events.length === 0 && <p className="text-gray-500 italic">No violations or anomalies recorded.</p>}
          {events.map((e, idx) => (
            <div key={idx} className="mb-2 pb-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-400">[{new Date(e.ts).toLocaleTimeString()}]</span>{' '}
              <span className="text-blue-400 font-bold">{e.type}</span>:{' '}
              <span className="text-gray-300">{JSON.stringify(e.payload)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
