import Link from "next/link";
import { ArrowRight, Binary, Cloud, Cpu, Layers3, Orbit, ShieldCheck, Sparkles, Waypoints } from "lucide-react";
import { CosmicCard } from "@/components/CosmicCard";
import { CosmicCore } from "@/components/CosmicCore";
import { CosmicDivider } from "@/components/CosmicDivider";
import { CosmicPanel } from "@/components/CosmicPanel";
import { normalizeAppletRegistry, primordiaDirectiveGrammar, sampleSpannerRegistry } from "@/lib/primordia";

const realmIcons = {
  interface: Orbit,
  kernel: Cpu,
  portal: Cloud,
  world: Layers3
} as const;

const lifecycleColor: Record<string, string> = {
  discovered: "text-amber-300",
  bound: "text-sky-300",
  running: "text-emerald-300",
  suspended: "text-amber-200",
  destroyed: "text-rose-300"
};

const rankLabels: Record<number, string> = {
  0: "root",
  1: "realm",
  2: "service",
  3: "worker"
};

const runtimeNotes = [
  {
    title: "Discovery",
    description: "Codex queries SPANNER, filters by runtimeType, enabled state, and context, then resolves what exists."
  },
  {
    title: "Binding",
    description: "Applets are attached to the runtime that can execute them: Electron, Node, Unreal, or cloud."
  },
  {
    title: "Execution",
    description: "Codex issues directives such as INIT, RUN, LINK, SUSPEND, and DESTROY to move state forward."
  },
  {
    title: "Reflection",
    description: "Each applet writes logs, metrics, state, and events back into the registry memory layer."
  }
];

const normalizedRegistry = normalizeAppletRegistry(sampleSpannerRegistry);

export default function PrimordiaOSPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <CosmicPanel>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-aether">Primordia execution spec</p>
          <h1 className="mt-4 text-4xl font-semibold text-white sm:text-6xl">Everything is an applet.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
            This draft formalizes the Primordia model as shared types plus a JSON manifest. The registry becomes machine-readable, the lifecycle becomes explicit, and every runtime becomes discoverable.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76">TypeScript types</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76">JSON manifest</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/76">Registry-driven execution</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Return to the surface layer
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/primordiaos/shell"
              className="inline-flex items-center gap-2 rounded-full border border-ion/30 bg-ion/10 px-5 py-3 text-sm font-medium text-ion transition hover:border-ion/50 hover:bg-ion/20"
            >
              Launch Shell
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CosmicPanel>
        <CosmicCore />
      </div>

      <CosmicDivider />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {runtimeNotes.map(({ title, description }) => (
          <CosmicCard key={title}>
            <ShieldCheck className="mb-5 h-7 w-7 text-ion" />
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-3 leading-7 text-white/64">{description}</p>
          </CosmicCard>
        ))}
      </div>

      <CosmicDivider />

      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <CosmicCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aether">Applet registry</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{normalizedRegistry.length} applets</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/76">
              {normalizedRegistry.filter((applet) => applet.enabled).length} enabled
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {normalizedRegistry.map((applet) => {
              const Icon = realmIcons[applet.realm];

              return (
                <div key={applet.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <Icon className="h-5 w-5 text-ion" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{applet.name}</h3>
                        <p className="mt-1 max-w-2xl leading-7 text-white/64">{applet.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                        rank {applet.rank} {rankLabels[applet.rank]}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                        {applet.hierarchyRole}
                      </span>
                      <span className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium ${lifecycleColor[applet.state] ?? "text-white/70"}`}>
                        {applet.state}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                        {applet.runtimeType}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                        {applet.source}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-white/45">
                    <span className="font-mono">spanner:{applet.sourceId}</span>
                    {typeof applet.runtimeCode === "number" ? (
                      <span className="ml-3 font-mono">runtimeType:{applet.runtimeCode}</span>
                    ) : null}
                    <span className="ml-3 font-mono">hierarchy:{applet.rank}:{applet.hierarchyRole}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/64">
                    {applet.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/8 bg-black/20 px-3 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CosmicCard>

        <div className="grid gap-5">
          <CosmicCard>
            <Binary className="mb-4 h-6 w-6 text-ion" />
            <h3 className="text-xl font-semibold text-white">Canonical types</h3>
            <p className="mt-3 leading-7 text-white/64">
              <code className="font-mono text-white/85">AppletManifest</code>,{" "}
              <code className="font-mono text-white/85">RegistryEntry</code>,{" "}
              <code className="font-mono text-white/85">RuntimeType</code>, and{" "}
              <code className="font-mono text-white/85">AppletDirective</code> are the core contracts exported from{" "}
              <code className="font-mono text-white/85">lib/primordia.ts</code>.
            </p>
          </CosmicCard>

          <CosmicCard>
            <Waypoints className="mb-4 h-6 w-6 text-ion" />
            <h3 className="text-xl font-semibold text-white">Directive grammar</h3>
            <div className="mt-4 space-y-3">
              {primordiaDirectiveGrammar.map((directive) => (
                <div key={directive.name} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="font-mono text-sm text-white">{directive.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.22em] text-aether">{directive.signature}</div>
                  <p className="mt-3 leading-7 text-white/64">{directive.meaning}</p>
                </div>
              ))}
            </div>
          </CosmicCard>

          <CosmicCard>
            <Sparkles className="mb-4 h-6 w-6 text-ion" />
            <h3 className="text-xl font-semibold text-white">Manifest source</h3>
            <p className="mt-3 leading-7 text-white/64">
              The JSON manifest lives at{" "}
              <span className="font-mono text-white/85">/primordia.applet.manifest.json</span> so the registry can be consumed without the UI.
            </p>
          </CosmicCard>
        </div>
      </div>
    </section>
  );
}
