export type RuntimeType =
  | "electron"
  | "node"
  | "unreal"
  | "cloudflare"
  | "pages"
  | "framer"
  | "cli"
  | "local";

export type RawRuntimeType = 1 | 2 | 3 | 4 | number;

export type AppletSource = "SPANNER" | "local" | "cloud";

export type AppletDirective = "INIT" | "RUN" | "LINK" | "SUSPEND" | "DESTROY" | "SYNC" | "EXPOSE" | "MANIFEST";

export type AppletRealm = "interface" | "kernel" | "portal" | "world";

export type AppletRank = 0 | 1 | 2 | 3;

export type AppletHierarchyRole = "root" | "realm" | "service" | "worker";

export type AppletLifecycleState = "discovered" | "bound" | "running" | "suspended" | "destroyed";

export type AppletIdentity = {
  name: string;
  description: string;
};

export type AppletAccessState = {
  firstAccessTime: string;
  lastAccessTime: string;
};

export type AppletManifest = AppletIdentity & {
  id: string;
  runtimeType: RuntimeType;
  source: AppletSource;
  realm: AppletRealm;
  rank: AppletRank;
  hierarchyRole: AppletHierarchyRole;
  enabled: boolean;
  state: AppletLifecycleState;
  access: AppletAccessState;
  tags: string[];
  directives: AppletDirective[];
  bindings: string[];
};

export type RegistryEntry = AppletManifest & {
  version: string;
  checksum?: string;
  firstAccessTime: string;
  lastAccessTime: string;
};

export type SpannerAppletSource = {
  sourceType: "SPANNER";
  spanner: {
    id: string;
  };
};

export type RawAppletRecord = {
  firstAccessTime: string;
  lastAccessTime: string;
  source: SpannerAppletSource | { sourceType: "local" | "cloud" };
  name: string;
  description: string;
  runtimeType: RawRuntimeType;
};

export type RawAppletRegistry = {
  applets: RawAppletRecord[];
};

export type NormalizedAppletView = RegistryEntry & {
  sourceId?: string;
  runtimeCode?: RawRuntimeType;
};

const runtimeTypeMap: Record<1 | 2 | 3 | 4, RuntimeType> = {
  1: "electron",
  2: "node",
  3: "cloudflare",
  4: "unreal"
};

const realmMap: Record<RuntimeType, AppletRealm> = {
  electron: "interface",
  node: "kernel",
  unreal: "world",
  cloudflare: "portal",
  pages: "portal",
  framer: "interface",
  cli: "kernel",
  local: "interface"
};

const directiveDefaults: Record<AppletRealm, AppletDirective[]> = {
  interface: ["INIT", "RUN", "LINK"],
  kernel: ["INIT", "RUN", "LINK", "SYNC"],
  portal: ["INIT", "RUN", "LINK", "EXPOSE"],
  world: ["INIT", "RUN", "MANIFEST"]
};

const rankDefaults: Record<AppletRealm, AppletRank> = {
  interface: 2,
  kernel: 2,
  portal: 1,
  world: 1
};

const hierarchyRoleDefaults: Record<AppletRank, AppletHierarchyRole> = {
  0: "root",
  1: "realm",
  2: "service",
  3: "worker"
};

function resolveRuntimeType(runtimeType: RawRuntimeType): RuntimeType {
  if (runtimeType === 1 || runtimeType === 2 || runtimeType === 3 || runtimeType === 4) {
    return runtimeTypeMap[runtimeType];
  }

  return "local";
}

function getSourceType(source: RawAppletRecord["source"]): AppletSource {
  return source.sourceType;
}

export function normalizeAppletRecord(record: RawAppletRecord): NormalizedAppletView {
  const runtime = resolveRuntimeType(record.runtimeType);
  const realm = realmMap[runtime];
  const source = getSourceType(record.source);
  const sourceId = "spanner" in record.source ? record.source.spanner.id : undefined;

  return {
    id: sourceId ?? `${source}-${record.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: record.name,
    description: record.description,
    runtimeType: runtime,
    source,
    realm,
    rank: rankDefaults[realm],
    hierarchyRole: hierarchyRoleDefaults[rankDefaults[realm]],
    enabled: true,
    state: "discovered",
    access: {
      firstAccessTime: record.firstAccessTime,
      lastAccessTime: record.lastAccessTime
    },
    firstAccessTime: record.firstAccessTime,
    lastAccessTime: record.lastAccessTime,
    tags: [source.toLowerCase(), runtime, realm],
    directives: directiveDefaults[realm],
    bindings: [record.name],
    version: "1.0.0",
    sourceId,
    runtimeCode: record.runtimeType
  };
}

export function normalizeAppletRegistry(registry: RawAppletRegistry): NormalizedAppletView[] {
  return registry.applets.map(normalizeAppletRecord);
}

export type DirectiveGrammar = {
  name: string;
  signature: string;
  meaning: string;
};

export const primordiaDirectiveGrammar: DirectiveGrammar[] = [
  {
    name: "BIND(interface, kernel)",
    signature: "BIND(source, target)",
    meaning: "Connects an interface applet to the kernel that executes its logic."
  },
  {
    name: "EXPOSE(kernel, portal)",
    signature: "EXPOSE(source, target)",
    meaning: "Publishes kernel behavior through the portal boundary for external access."
  },
  {
    name: "MANIFEST(kernel, world)",
    signature: "MANIFEST(source, target)",
    meaning: "Converts kernel state into world entities, scenes, or simulation objects."
  },
  {
    name: "PORTAL(interface, portal)",
    signature: "PORTAL(source, target)",
    meaning: "Declares an interface as an entry point into the public surface."
  },
  {
    name: "SYNC(registry)",
    signature: "SYNC(target)",
    meaning: "Refreshes the registry, resolves applets, and updates state."
  }
];

export const primordiaAppletManifest: RegistryEntry[] = [
  {
    id: "codex-authority",
    name: "Codex Authority",
    description: "Defines execution law, runtime interpretation, and the registry contract.",
    runtimeType: "node",
    source: "SPANNER",
    realm: "kernel",
    rank: 0,
    hierarchyRole: "root",
    enabled: true,
    state: "running",
    access: {
      firstAccessTime: "2026-07-27T00:00:00.000Z",
      lastAccessTime: "2026-07-28T00:00:00.000Z"
    },
    firstAccessTime: "2026-07-27T00:00:00.000Z",
    lastAccessTime: "2026-07-28T00:00:00.000Z",
    tags: ["law", "registry", "governance"],
    directives: ["INIT", "RUN", "LINK", "SYNC"],
    bindings: ["Applet Registry", "Node Kernel"],
    version: "1.0.0"
  },
  {
    id: "electron-shell",
    name: "Electron Shell",
    description: "Hosts the desktop interface and binds visual applets to local execution.",
    runtimeType: "electron",
    source: "local",
    realm: "interface",
    rank: 2,
    hierarchyRole: "service",
    enabled: true,
    state: "bound",
    access: {
      firstAccessTime: "2026-07-27T00:00:00.000Z",
      lastAccessTime: "2026-07-28T00:00:00.000Z"
    },
    firstAccessTime: "2026-07-27T00:00:00.000Z",
    lastAccessTime: "2026-07-28T00:00:00.000Z",
    tags: ["desktop", "ui", "interface"],
    directives: ["INIT", "RUN", "LINK", "SUSPEND"],
    bindings: ["Node Kernel", "PrimordiaOS UI"],
    version: "1.0.0"
  },
  {
    id: "portal-boundary",
    name: "Portal Boundary",
    description: "Routes public access through Cloudflare, Pages, and Framer surfaces.",
    runtimeType: "cloudflare",
    source: "cloud",
    realm: "portal",
    rank: 1,
    hierarchyRole: "realm",
    enabled: true,
    state: "running",
    access: {
      firstAccessTime: "2026-07-27T00:00:00.000Z",
      lastAccessTime: "2026-07-28T00:00:00.000Z"
    },
    firstAccessTime: "2026-07-27T00:00:00.000Z",
    lastAccessTime: "2026-07-28T00:00:00.000Z",
    tags: ["cloud", "routing", "security"],
    directives: ["INIT", "RUN", "LINK", "EXPOSE"],
    bindings: ["Cloudflare", "Pages", "Framer"],
    version: "1.0.0"
  },
  {
    id: "primordiaunreal-world",
    name: "PrimordiaUnreal World",
    description: "Receives world manifests and renders spatial simulation layers.",
    runtimeType: "unreal",
    source: "local",
    realm: "world",
    rank: 3,
    hierarchyRole: "worker",
    enabled: false,
    state: "discovered",
    access: {
      firstAccessTime: "2026-07-27T00:00:00.000Z",
      lastAccessTime: "2026-07-27T00:00:00.000Z"
    },
    firstAccessTime: "2026-07-27T00:00:00.000Z",
    lastAccessTime: "2026-07-27T00:00:00.000Z",
    tags: ["simulation", "scene", "world"],
    directives: ["INIT", "RUN", "MANIFEST"],
    bindings: ["PrimordiaOS_Engine", "BP_PrimordiaBridge"],
    version: "0.1.0"
  }
];

export const sampleSpannerRegistry: RawAppletRegistry = {
  applets: [
    {
      lastAccessTime: "2026-07-11T07:45:03.848260Z",
      firstAccessTime: "2026-07-09T01:47:39.245737Z",
      source: {
        sourceType: "SPANNER",
        spanner: {
          id: "06475e36-1911-4f36-bc3d-59ca9da0cc96"
        }
      },
      name: "Project Blueprint & Sandbox",
      description: "An interactive workspace builder, developer companion, prompt refiner, and interactive component playground.",
      runtimeType: 1
    },
    {
      lastAccessTime: "2026-07-10T12:00:01.753328Z",
      firstAccessTime: "2026-07-09T08:31:22.487325Z",
      source: {
        sourceType: "SPANNER",
        spanner: {
          id: "149f3673-ae9b-4727-8f23-8958c5f27fbd"
        }
      },
      name: "Electron Cloud Integration Portal",
      description: "A developer portal and secure API proxy designed to connect, configure, and integrate your cloud-hosted Gemini and Node.js backend directly into an Electron desktop application.",
      runtimeType: 1
    }
  ]
};
