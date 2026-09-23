"use client";

import { useMemo, useState } from "react";
import { Cloud, Cpu, RotateCcw } from "lucide-react";
import { postBrowserContext } from "@/lib/api";
import { CosmicActionFeed } from "@/components/CosmicActionFeed";
import { CosmicCard } from "@/components/CosmicCard";
import { CosmicLoader } from "@/components/CosmicLoader";
import { PlasmaButton } from "@/components/PlasmaButton";

export function ApiDemoClient() {
  const [signal, setSignal] = useState("Visitor is exploring the PrimordiaOS public command surface.");
  const [intent, setIntent] = useState("Recommend the next official action for the website operator.");
  const [nextAction, setNextAction] = useState<string>();
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const payloadPreview = useMemo(
    () => ({
      source: "primordialorigin.com" as const,
      page: "api-demo",
      signal,
      intent
    }),
    [signal, intent]
  );

  async function submitContext() {
    setLoading(true);
    setError(undefined);

    const timestamp = new Date().toISOString();
    setLog((current) => [`OS context prepared at ${timestamp}`, ...current].slice(0, 5));

    try {
      const data = await postBrowserContext({
        ...payloadPreview,
        timestamp
      });
      const action = typeof data.nextAction === "string" ? data.nextAction : "Cloud Run responded without a nextAction field.";
      setNextAction(action);
      setLog((current) => [`Cloud returned nextAction: ${action}`, ...current].slice(0, 5));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown API error";
      setError(message);
      setLog((current) => [`Cloud relay failed: ${message}`, ...current].slice(0, 5));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
      <CosmicCard>
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full bg-ion/15 p-2 text-ion">
            <Cpu className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">OS Context Packet</h2>
            <p className="text-sm text-white/58">Only explicit website context is sent.</p>
          </div>
        </div>
        <label className="block text-sm font-medium text-white/74" htmlFor="signal">Signal</label>
        <textarea
          id="signal"
          value={signal}
          onChange={(event) => setSignal(event.target.value)}
          rows={5}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none transition focus:border-ion/60"
        />
        <label className="mt-5 block text-sm font-medium text-white/74" htmlFor="intent">Intent</label>
        <textarea
          id="intent"
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          rows={4}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none transition focus:border-aether/60"
        />
        <pre className="mt-5 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/62">
          {JSON.stringify(payloadPreview, null, 2)}
        </pre>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <PlasmaButton onClick={submitContext} disabled={loading}>
            <Cloud className="h-4 w-4" />
            Send Context
          </PlasmaButton>
          <button type="button" onClick={() => setLog([])} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
            <RotateCcw className="h-4 w-4" />
            Clear Log
          </button>
          {loading ? <CosmicLoader /> : null}
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-plasma/30 bg-plasma/10 p-3 text-sm text-plasma">{error}</p> : null}
      </CosmicCard>
      <CosmicActionFeed nextAction={nextAction} log={log} />
    </div>
  );
}
