import React, { useState } from 'react';
import { Bell, Smartphone, Monitor, Mail, Activity, Sparkles, Terminal, ExternalLink, CheckCircle2, XCircle, RefreshCw, Sliders, X, Zap, Flame } from 'lucide-react';
export const AlertLatticePanel = ({ alertStream, onRefresh, onJumpToProspect, latticeConfig, onUpdateConfig }) => {
    const [filter, setFilter] = useState('all');
    const [isSimulating, setIsSimulating] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [testResult, setTestResult] = useState(null);
    // Test modal form state
    const [testTitle, setTestTitle] = useState('Stripe webhook signature verification failure in Next.js 15 App Router');
    const [testSummary, setTestSummary] = useState('Production webhook endpoint timing out during HMAC-SHA256 signature verification. Developers cannot accept payments.');
    const [testScore, setTestScore] = useState(92);
    const [testType, setTestType] = useState('failure');
    const [testSource, setTestSource] = useState('reddit/r/nextjs');
    const [testUrl, setTestUrl] = useState('https://reddit.com/r/nextjs/comments/example');
    // Config local edit state
    const [localConfig, setLocalConfig] = useState(latticeConfig || {
        channelEnabled: { phone: true, desktop: true, email: true, hud: true, unreal: true, cli: true },
        minScorePerChannel: { phone: 70, desktop: 70, email: 50, hud: 0, unreal: 85, cli: 40 },
        quietHours: { enabled: false, start: '22:00', end: '07:00', overrideScore: 90 },
        phoneWebhookUrl: 'https://ntfy.sh/primordia_flow_shane',
        alertRecipientEmail: 'shane@primordialorigin.com'
    });
    const handleQuickSimulate = async (preset) => {
        setIsSimulating(true);
        setTestResult(null);
        let payload = {};
        if (preset === 'stripe_failure') {
            payload = {
                signal: {
                    title: 'Next.js 15 Stripe webhook signature verification failing',
                    summary: 'Raw body buffer is consumed by req.json() before verification. Urgent production blocker.',
                    score: 95,
                    type: 'failure',
                    source: 'reddit/r/nextjs',
                    url: 'https://reddit.com/r/nextjs/comments/stripe_failure'
                }
            };
        }
        else if (preset === 'boilerplate_opp') {
            payload = {
                signal: {
                    title: 'Looking for a lean Next.js 15 SaaS boilerplate with Stripe & SQLite WAL',
                    summary: 'Tired of bloatware templates. Ready to pay $79 for a production-tested local-first template today.',
                    score: 88,
                    type: 'opportunity',
                    source: 'Hacker News',
                    url: 'https://news.ycombinator.com/item?id=48001234'
                }
            };
        }
        else {
            payload = {
                signal: {
                    title: 'SQLite database locked during concurrent ingestion daemon write',
                    summary: 'Background worker lock contention causing 500 error spikes on high volume queue ingestion.',
                    score: 90,
                    type: 'threat',
                    source: 'reddit/r/webdev',
                    url: 'https://reddit.com/r/webdev/comments/sqlite_lock'
                }
            };
        }
        try {
            const res = await fetch('/api/alerts/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setTestResult(data.dispatchResult);
            onRefresh();
        }
        catch (err) {
            console.error('Simulate error:', err);
        }
        finally {
            setIsSimulating(false);
        }
    };
    const handleCustomDispatch = async (e) => {
        e.preventDefault();
        setIsSimulating(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/alerts/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signal: {
                        title: testTitle,
                        summary: testSummary,
                        score: Number(testScore),
                        type: testType,
                        source: testSource,
                        url: testUrl
                    }
                })
            });
            const data = await res.json();
            setTestResult(data.dispatchResult);
            onRefresh();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setIsSimulating(false);
        }
    };
    const handleSaveConfig = async () => {
        try {
            const res = await fetch('/api/alerts/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localConfig)
            });
            const data = await res.json();
            if (onUpdateConfig)
                onUpdateConfig(data.config);
            setShowConfigModal(false);
        }
        catch (err) {
            console.error(err);
        }
    };
    // Filtered alerts
    const filteredAlerts = alertStream.filter((a) => {
        if (filter === 'all')
            return true;
        if (filter === 'critical')
            return a.urgency === 'critical' || a.score >= 90;
        if (filter === 'high')
            return a.urgency === 'high' || (a.score >= 70 && a.score < 90);
        if (filter === 'opportunity')
            return a.type === 'opportunity';
        if (filter === 'failure')
            return a.type === 'failure' || a.type === 'threat';
        return true;
    });
    return (<div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <Bell className="w-5 h-5 animate-pulse"/>
            </div>
            <span>Alert Lattice Orchestrator</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-rose-950/80 text-rose-300 border border-rose-700/50">
              6-Rail Sovereign Fan-Out
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time high-intent signal distribution across Phone lock-screen, Desktop toasts, Email, In-Cockpit HUD, Unreal Engine 5.8, and CLI.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={() => setShowTestModal(true)} className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-lg shadow-rose-900/30 transition-all active:scale-95">
            <Zap className="w-3.5 h-3.5 fill-white"/>
            <span>Test Fan-Out Dispatch</span>
          </button>
          <button onClick={() => setShowConfigModal(true)} className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 transition-all">
            <Sliders className="w-3.5 h-3.5 text-cyan-400"/>
            <span>Lattice Config</span>
          </button>
          <button onClick={onRefresh} className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 transition-all">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400"/>
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── 6-Rail Sovereign Telemetry Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Rail 1: Phone */}
        <div className="p-3 rounded-xl bg-[#0d121f] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Smartphone className="w-4 h-4"/>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold">
              ARMED
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Phone Rail</div>
            <div className="text-[10px] text-slate-400 font-mono">ntfy.sh Push</div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Threshold</span>
            <span className="text-sky-300 font-bold">≥70 Score</span>
          </div>
        </div>

        {/* Rail 2: Desktop */}
        <div className="p-3 rounded-xl bg-[#0d121f] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Monitor className="w-4 h-4"/>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold">
              ARMED
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Desktop Rail</div>
            <div className="text-[10px] text-slate-400 font-mono">Web + Toast</div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Threshold</span>
            <span className="text-cyan-300 font-bold">≥70 Score</span>
          </div>
        </div>

        {/* Rail 3: Email */}
        <div className="p-3 rounded-xl bg-[#0d121f] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Mail className="w-4 h-4"/>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold">
              ARMED
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Email Rail</div>
            <div className="text-[10px] text-slate-400 font-mono">AWS SES / SMTP</div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Threshold</span>
            <span className="text-amber-300 font-bold">≥50 Score</span>
          </div>
        </div>

        {/* Rail 4: In-Cockpit HUD */}
        <div className="p-3 rounded-xl bg-[#0d121f] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4"/>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold">
              LIVE /ws
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Cockpit HUD</div>
            <div className="text-[10px] text-slate-400 font-mono">Real-Time Stream</div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Threshold</span>
            <span className="text-emerald-300 font-bold">≥0 (All)</span>
          </div>
        </div>

        {/* Rail 5: Unreal Engine 5.8 */}
        <div className="p-3 rounded-xl bg-[#0d121f] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4"/>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/40 font-bold">
              NIAGARA
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Unreal 5.8 Rail</div>
            <div className="text-[10px] text-slate-400 font-mono">AlertPulse Burst</div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Threshold</span>
            <span className="text-purple-300 font-bold">≥85 or Failure</span>
          </div>
        </div>

        {/* Rail 6: CLI Stream */}
        <div className="p-3 rounded-xl bg-[#0d121f] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Terminal className="w-4 h-4"/>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold">
              STDOUT
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">CLI Stream Rail</div>
            <div className="text-[10px] text-slate-400 font-mono">ANSI Terminal</div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Threshold</span>
            <span className="text-rose-300 font-bold">≥40 Score</span>
          </div>
        </div>
      </div>

      {/* ── Quick Trigger Simulator Bar ──────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0c101a] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Flame className="w-4 h-4 text-amber-400"/>
          <span className="text-slate-200 font-bold">Lattice Presets:</span>
          <span className="text-slate-400">Trigger simulated signal across all 6 channels simultaneously:</span>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => handleQuickSimulate('stripe_failure')} disabled={isSimulating} className="px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-all font-bold">
            🚨 Stripe Webhook Failure (95)
          </button>
          <button onClick={() => handleQuickSimulate('boilerplate_opp')} disabled={isSimulating} className="px-2.5 py-1.5 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 transition-all font-bold">
            🔥 Boilerplate Buyer (88)
          </button>
          <button onClick={() => handleQuickSimulate('sqlite_threat')} disabled={isSimulating} className="px-2.5 py-1.5 rounded bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 transition-all font-bold">
            ⚠️ SQLite Database Lock (90)
          </button>
        </div>
      </div>

      {/* ── Last Test Dispatch Output (if active) ────────────────────────────── */}
      {testResult && (<div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/20 backdrop-blur-md text-xs font-mono space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-400"/>
              <span>LATTICE FAN-OUT DISPATCH REPORT ({testResult.alertId})</span>
            </span>
            <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4"/>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {['phone', 'desktop', 'email', 'hud', 'unreal', 'cli'].map((ch) => {
                const res = testResult.results?.[ch];
                const isDelivered = testResult.channelsDelivered?.includes(ch);
                return (<div key={ch} className={`p-2 rounded border ${isDelivered ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                    <span>{ch}</span>
                    {isDelivered ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/> : <XCircle className="w-3.5 h-3.5 text-slate-600"/>}
                  </div>
                  <div className="text-[10px] mt-1 text-slate-400">
                    {res?.metadata?.latencyMs ? `${res.metadata.latencyMs}ms` : (res?.error ? 'Filtered' : 'Ready')}
                  </div>
                </div>);
            })}
          </div>
        </div>)}

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2 text-xs font-mono">
          {[
            { id: 'all', label: `All Alerts (${alertStream.length})` },
            { id: 'critical', label: 'Critical (≥90/Failure)' },
            { id: 'high', label: 'High Priority (70–89)' },
            { id: 'opportunity', label: 'Opportunities' },
            { id: 'failure', label: 'Failures & Threats' }
        ].map((t) => (<button key={t.id} onClick={() => setFilter(t.id)} className={`px-3 py-1 rounded-md transition-all ${filter === t.id
                ? 'bg-slate-800 text-cyan-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
              {t.label}
            </button>))}
        </div>
      </div>

      {/* ── Alert Feed List ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (<div className="p-8 text-center border border-slate-800/80 rounded-xl bg-[#0c101a] text-slate-400 font-mono text-xs">
            No alerts found matching filter. Dispatched signals from the autonomous scout or manual tests will populate here.
          </div>) : (filteredAlerts.map((alert, idx) => {
            const urgency = alert.urgency || 'medium';
            const urgencyBorder = urgency === 'critical'
                ? 'border-rose-500/50 bg-rose-950/15'
                : urgency === 'high'
                    ? 'border-amber-500/50 bg-amber-950/15'
                    : 'border-cyan-500/30 bg-cyan-950/10';
            const badgeBg = urgency === 'critical'
                ? 'bg-rose-500 text-white font-black'
                : urgency === 'high'
                    ? 'bg-amber-500 text-black font-bold'
                    : 'bg-cyan-500 text-black font-bold';
            return (<div key={alert.id || idx} className={`p-4 rounded-xl border ${urgencyBorder} transition-all hover:border-slate-600 space-y-2`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider ${badgeBg}`}>
                      {alert.urgency?.toUpperCase() || 'HIGH'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                      {alert.type || 'opportunity'}
                    </span>
                    <span className="text-xs font-bold text-white tracking-tight">{alert.title}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-amber-400 font-bold">🔥 {alert.score}/100</span>
                    <span className="text-slate-500">[{alert.source}]</span>
                    {alert.url && (<a href={alert.url} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors">
                        <span>Thread</span>
                        <ExternalLink className="w-3 h-3"/>
                      </a>)}
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">
                  {alert.summary}
                </p>

                {/* Channel Delivery Indicators */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <span>Delivered Rails:</span>
                    <span className="px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">📱 Phone</span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">💻 Desktop</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">📧 Email</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">🖥️ HUD</span>
                    {alert.score >= 85 && (<span className="px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">🎮 Unreal 5.8</span>)}
                    <span className="px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40">⚡ CLI</span>
                  </div>

                  <div className="text-slate-500">
                    {alert.created_at ? new Date(alert.created_at * 1000).toLocaleTimeString() : new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>);
        }))}
      </div>

      {/* ── Test Dispatch Modal ──────────────────────────────────────────────── */}
      {showTestModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Zap className="w-5 h-5 text-rose-400"/>
                <span>Test Alert Lattice Fan-Out</span>
              </h2>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleCustomDispatch} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Signal Title</label>
                <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500 font-sans text-xs"/>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Summary / Problem Snippet</label>
                <textarea rows={3} value={testSummary} onChange={(e) => setTestSummary(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500 font-sans text-xs"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Intent Score (0 - 100)</label>
                  <input type="number" min="0" max="100" value={testScore} onChange={(e) => setTestScore(Number(e.target.value))} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500 font-mono text-xs"/>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Signal Type</label>
                  <select value={testType} onChange={(e) => setTestType(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500 font-mono text-xs">
                    <option value="failure">failure (Critical Urgency)</option>
                    <option value="opportunity">opportunity (High/Outbound)</option>
                    <option value="threat">threat (Urgent System)</option>
                    <option value="request">request (Customer Demand)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Thread URL (Click Target)</label>
                <input type="text" value={testUrl} onChange={(e) => setTestUrl(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500 font-mono text-xs"/>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowTestModal(false)} className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={isSimulating} className="px-5 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-900/30 active:scale-95">
                  {isSimulating ? 'Dispatching Across 6 Rails...' : '🚀 Fan-Out Across All 6 Realms'}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* ── Lattice Config Modal ─────────────────────────────────────────────── */}
      {showConfigModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-cyan-400"/>
                <span>Alert Lattice Configuration</span>
              </h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Phone Push Endpoint (ntfy.sh or Webhook)</label>
                <input type="text" value={localConfig.phoneWebhookUrl} onChange={(e) => setLocalConfig({ ...localConfig, phoneWebhookUrl: e.target.value })} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs"/>
                <span className="text-[10px] text-slate-500">Subscribe via free ntfy mobile app on iOS/Android to receive lock-screen alerts.</span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Alert Recipient Email</label>
                <input type="email" value={localConfig.alertRecipientEmail} onChange={(e) => setLocalConfig({ ...localConfig, alertRecipientEmail: e.target.value })} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs"/>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-2">Channel Score Thresholds</label>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {Object.entries(localConfig.minScorePerChannel || {}).map(([ch, val]) => (<div key={ch} className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 uppercase block">{ch} min</span>
                      <input type="number" min="0" max="100" value={val} onChange={(e) => {
                    const updated = {
                        ...localConfig.minScorePerChannel,
                        [ch]: Number(e.target.value)
                    };
                    setLocalConfig({ ...localConfig, minScorePerChannel: updated });
                }} className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"/>
                    </div>))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowConfigModal(false)} className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveConfig} className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold transition-all">
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
};
