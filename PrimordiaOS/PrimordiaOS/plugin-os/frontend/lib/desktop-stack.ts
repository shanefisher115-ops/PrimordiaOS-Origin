import { normalizeAppletRegistry, sampleSpannerRegistry, type NormalizedAppletView } from "@/lib/primordia";

export type StackDomain = "vectorize" | "gemini" | "unreal" | "visioncore" | "generator" | "pulse";

export type StackEvent = {
  id: string;
  domain: StackDomain;
  timestamp: string;
  message: string;
  payload?: unknown;
};

export type DesktopRuntimeSnapshot = {
  appVersion: string;
  platform: string;
  isDev: boolean;
  registrySize: number;
  pulseState: "idle" | "active";
};

export type DesktopCommandResult = {
  ok: boolean;
  domain: StackDomain;
  summary: string;
  data?: unknown;
};

const registry = normalizeAppletRegistry(sampleSpannerRegistry);

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function searchRegistry(query: string): NormalizedAppletView[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return registry.slice(0, 5);

  return registry.filter((item) => {
    const haystack = [item.name, item.description, item.runtimeType, item.realm, ...(item.tags ?? [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function buildRuntimeSnapshot(appVersion: string, platform: string, isDev: boolean, pulseState: "idle" | "active"): DesktopRuntimeSnapshot {
  return {
    appVersion,
    platform,
    isDev,
    registrySize: registry.length,
    pulseState
  };
}

export function handleVectorize(query: string) {
  return {
    query,
    matches: searchRegistry(query)
  };
}

export function handleGemini(prompt: string) {
  const matches = searchRegistry(prompt).slice(0, 3);
  const response = matches.length
    ? `Gemini synthesis: ${matches.map((item) => item.name).join(", ")} are the strongest registry matches for "${prompt}".`
    : `Gemini synthesis: no direct registry match for "${prompt}", so generate a new control path anchored on the requested intent.`;

  return {
    prompt,
    response,
    references: matches
  };
}

export function handleUnreal(command: string) {
  return {
    command,
    summary: `Queued Unreal orchestration for "${command}".`,
    transport: {
      mode: "ipc",
      target: "PrimordiaUnreal World"
    }
  };
}

export function handleVisionCore(source: string) {
  return {
    source,
    summary: `Captured VisionCore frame from "${source}".`,
    captureId: makeId("vision"),
    timestamp: nowIso()
  };
}

export function handleGenerator(seed: string) {
  return {
    seed,
    output: `Generated operator flow from "${seed}" using the desktop control-plane scaffold.`
  };
}

export function handlePulse(message: string) {
  return {
    id: makeId("pulse"),
    domain: "pulse" as const,
    timestamp: nowIso(),
    message
  } satisfies StackEvent;
}
