"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleSpannerRegistry = exports.primordiaAppletManifest = exports.primordiaDirectiveGrammar = void 0;
exports.normalizeAppletRecord = normalizeAppletRecord;
exports.normalizeAppletRegistry = normalizeAppletRegistry;
const runtimeTypeMap = {
    1: "electron",
    2: "node",
    3: "cloudflare",
    4: "unreal"
};
const realmMap = {
    electron: "interface",
    node: "kernel",
    unreal: "world",
    cloudflare: "portal",
    pages: "portal",
    framer: "interface",
    cli: "kernel",
    local: "interface"
};
const directiveDefaults = {
    interface: ["INIT", "RUN", "LINK"],
    kernel: ["INIT", "RUN", "LINK", "SYNC"],
    portal: ["INIT", "RUN", "LINK", "EXPOSE"],
    world: ["INIT", "RUN", "MANIFEST"]
};
const rankDefaults = {
    interface: 2,
    kernel: 2,
    portal: 1,
    world: 1
};
const hierarchyRoleDefaults = {
    0: "root",
    1: "realm",
    2: "service",
    3: "worker"
};
function resolveRuntimeType(runtimeType) {
    if (runtimeType === 1 || runtimeType === 2 || runtimeType === 3 || runtimeType === 4) {
        return runtimeTypeMap[runtimeType];
    }
    return "local";
}
function getSourceType(source) {
    return source.sourceType;
}
function normalizeAppletRecord(record) {
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
function normalizeAppletRegistry(registry) {
    return registry.applets.map(normalizeAppletRecord);
}
exports.primordiaDirectiveGrammar = [
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
exports.primordiaAppletManifest = [
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
exports.sampleSpannerRegistry = {
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
