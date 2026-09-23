"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiDemoClient = ApiDemoClient;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const api_1 = require("@/lib/api");
const CosmicActionFeed_1 = require("@/components/CosmicActionFeed");
const CosmicCard_1 = require("@/components/CosmicCard");
const CosmicLoader_1 = require("@/components/CosmicLoader");
const PlasmaButton_1 = require("@/components/PlasmaButton");
function ApiDemoClient() {
    const [signal, setSignal] = (0, react_1.useState)("Visitor is exploring the PrimordiaOS public command surface.");
    const [intent, setIntent] = (0, react_1.useState)("Recommend the next official action for the website operator.");
    const [nextAction, setNextAction] = (0, react_1.useState)();
    const [log, setLog] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)();
    const payloadPreview = (0, react_1.useMemo)(() => ({
        source: "primordialorigin.com",
        page: "api-demo",
        signal,
        intent
    }), [signal, intent]);
    async function submitContext() {
        setLoading(true);
        setError(undefined);
        const timestamp = new Date().toISOString();
        setLog((current) => [`OS context prepared at ${timestamp}`, ...current].slice(0, 5));
        try {
            const data = await (0, api_1.postBrowserContext)({
                ...payloadPreview,
                timestamp
            });
            const action = typeof data.nextAction === "string" ? data.nextAction : "Cloud Run responded without a nextAction field.";
            setNextAction(action);
            setLog((current) => [`Cloud returned nextAction: ${action}`, ...current].slice(0, 5));
        }
        catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : "Unknown API error";
            setError(message);
            setLog((current) => [`Cloud relay failed: ${message}`, ...current].slice(0, 5));
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
      <CosmicCard_1.CosmicCard>
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full bg-ion/15 p-2 text-ion">
            <lucide_react_1.Cpu className="h-5 w-5"/>
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">OS Context Packet</h2>
            <p className="text-sm text-white/58">Only explicit website context is sent.</p>
          </div>
        </div>
        <label className="block text-sm font-medium text-white/74" htmlFor="signal">Signal</label>
        <textarea id="signal" value={signal} onChange={(event) => setSignal(event.target.value)} rows={5} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none transition focus:border-ion/60"/>
        <label className="mt-5 block text-sm font-medium text-white/74" htmlFor="intent">Intent</label>
        <textarea id="intent" value={intent} onChange={(event) => setIntent(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none transition focus:border-aether/60"/>
        <pre className="mt-5 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/62">
          {JSON.stringify(payloadPreview, null, 2)}
        </pre>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <PlasmaButton_1.PlasmaButton onClick={submitContext} disabled={loading}>
            <lucide_react_1.Cloud className="h-4 w-4"/>
            Send Context
          </PlasmaButton_1.PlasmaButton>
          <button type="button" onClick={() => setLog([])} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
            <lucide_react_1.RotateCcw className="h-4 w-4"/>
            Clear Log
          </button>
          {loading ? <CosmicLoader_1.CosmicLoader /> : null}
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-plasma/30 bg-plasma/10 p-3 text-sm text-plasma">{error}</p> : null}
      </CosmicCard_1.CosmicCard>
      <CosmicActionFeed_1.CosmicActionFeed nextAction={nextAction} log={log}/>
    </div>);
}
