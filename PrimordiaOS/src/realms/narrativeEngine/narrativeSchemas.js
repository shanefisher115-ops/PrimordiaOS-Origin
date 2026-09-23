// src/realms/narrativeEngine/narrativeSchemas.ts
export const PRIMORDIAOS_REALM_LORE_SCHEMA = {
    realmFocus: 'PRIMORDIAOS_CORE',
    displayName: 'PrimordiaOS Core Substrate Lore',
    defaultGlyph: 'Gate',
    coreMythos: 'The primordial sovereign operating kernel balancing zero-entropy disk execution and anti-collapse law.',
    allowedBeatTypes: ['DISCOVERY', 'THRESHOLD', 'TRIAL', 'REWARD', 'REVELATION'],
    actTemplates: {
        actI: {
            name: 'Act I: The Substrate Awakes',
            exposition: 'The protagonist crosses the boundary between chaotic ambient networks and the deterministic stillness of PrimordiaOS.',
        },
        actII: {
            name: 'Act II: The Friction of Agency',
            conflict: 'System memory, kernel processes, and human intent grapple to preserve absolute sovereign control.',
        },
        actIII: {
            name: 'Act III: Equilibrium Inscribed',
            resolution: 'The node achieves immutable harmony, locking state lineage into the Merkle audit chain.',
        },
    },
    signalMappings: [
        {
            signalKey: 'currentViewers',
            beatType: 'DISCOVERY',
            titlePrefix: 'Protagonist Senses the Substrate',
            textTemplate: (val, pId) => `Protagonist ${pId} observes the node beacon with ${val} entities attuned to the sovereign frequency.`,
        },
        {
            signalKey: 'isSystemThrottled',
            beatType: 'REVELATION',
            titlePrefix: 'The Iron Gate of Throttle',
            textTemplate: (_val, pId) => `The Sovereign Kernel commands total throttle; protagonist ${pId} witnesses emergency protection shielding the core from external collapse.`,
        },
    ],
};
export const PLUGIN_OS_REALM_LORE_SCHEMA = {
    realmFocus: 'PLUGIN_OS',
    displayName: 'Plugin-OS Dynamic Modular Lore',
    defaultGlyph: 'Spiral',
    coreMythos: 'Decoupled autonomous modules interfacing with the kernel through sovereign permission contracts.',
    allowedBeatTypes: ['DISCOVERY', 'THRESHOLD', 'TRIAL', 'REWARD'],
    actTemplates: {
        actI: {
            name: 'Act I: The Modular Call',
            exposition: 'Extensible vessels arrive at the periphery seeking handshake authorization.',
        },
        actII: {
            name: 'Act II: The Sandbox Forge',
            conflict: 'External code is subjected to strict verification before touching the memory substrate.',
        },
        actIII: {
            name: 'Act III: Symbiotic Expansion',
            resolution: 'The plugin binds seamlessly, amplifying OS capability without ceding sovereignty.',
        },
    },
    signalMappings: [
        {
            signalKey: 'activePlugins',
            beatType: 'THRESHOLD',
            titlePrefix: 'Modular Handshake Initiated',
            textTemplate: (val, pId) => `Protagonist ${pId} activates ${val} sovereign plugin sockets across the runtime bus.`,
        },
    ],
};
export const MONEYPLUGHUB_REALM_LORE_SCHEMA = {
    realmFocus: 'MONEYPLUGHUB',
    displayName: 'MoneyPlugHub Autonomous Syndication Lore',
    defaultGlyph: 'Clock',
    coreMythos: 'High-altitude autonomous value syndication loops, media distribution, and sovereign wealth engines.',
    allowedBeatTypes: ['DISCOVERY', 'TRIAL', 'REWARD'],
    actTemplates: {
        actI: {
            name: 'Act I: The Transmission Matrix',
            exposition: 'Broadcast frequencies hum across decentralized media networks.',
        },
        actII: {
            name: 'Act II: Loop Velocity Gating',
            conflict: 'Attention surges test the limits of loop depth and anti-spam guardrails.',
        },
        actIII: {
            name: 'Act III: Sovereign Yield Harvest',
            resolution: 'The network rewards genuine resonance, circulating energy back into the sovereign collective.',
        },
    },
    signalMappings: [
        {
            signalKey: 'giftCoinsPerMin',
            beatType: 'REWARD',
            titlePrefix: 'Economic Energy Surge',
            textTemplate: (val, pId) => `Protagonist ${pId} channels ${val} gift coins per minute through the autonomous loop.`,
        },
    ],
};
export const PRIMORDIAL_ORIGIN_MYTH_SCHEMA = {
    realmFocus: 'PRIMORDIAL_ORIGIN',
    displayName: 'The Primordial Origin Myth',
    defaultGlyph: 'Seed',
    coreMythos: 'Before the machine, there was human intent. Primordial Origin represents Tier 0 absolute authority.',
    allowedBeatTypes: ['DISCOVERY', 'THRESHOLD', 'REVELATION'],
    actTemplates: {
        actI: {
            name: 'Act I: Genesis of Intent',
            exposition: 'In the silence before computation, Tier 0 Sovereign Shane establishes Origin Law 001.',
        },
        actII: {
            name: 'Act II: The Trial of Temptation',
            conflict: 'Passive collapse patterns whisper effortless automation; the Sovereign rejects all hollow shortcuts.',
        },
        actIII: {
            name: 'Act III: The Inscription of Light',
            resolution: 'High-friction cognition is enshrined as the sole path to enduring digital immortality.',
        },
    },
    signalMappings: [
        {
            signalKey: 'conversions',
            beatType: 'REVELATION',
            titlePrefix: 'Claiming the Origin Sigil',
            textTemplate: (val, pId) => `With ${val} sovereign conversions sealed, protagonist ${pId} inscribe their legacy into the Primordial Origin codex.`,
        },
    ],
};
export const IMMERSIVE_COMPUTATION_CHAMBERS_SCHEMA = {
    realmFocus: 'IMMERSIVE_COMPUTATION',
    displayName: 'Immersive Computation Chambers Lore',
    defaultGlyph: 'Starflare',
    coreMythos: 'Unreal Engine 5.4 Niagara physics, DaVinci 3D LUTs, and raymarched spatial cinema.',
    allowedBeatTypes: ['DISCOVERY', 'TRIAL', 'REVELATION'],
    actTemplates: {
        actI: {
            name: 'Act I: The Spatial Ignition',
            exposition: 'Niagara particle chambers ignite, rendering the mathematical thoughts of the OS in real-time.',
        },
        actII: {
            name: 'Act II: Optical Turbulence',
            conflict: 'Shaders bend light across chromatic spectrums, pushing GPU warp thresholds to maximum capacity.',
        },
        actIII: {
            name: 'Act III: Cinematic Crystallization',
            resolution: 'The visual field locks into Imperial Gold, casting a permanent heroic glow upon the architecture.',
        },
    },
    signalMappings: [
        {
            signalKey: 'chatVelocityPerMin',
            beatType: 'TRIAL',
            titlePrefix: 'Telemetry Particle Cascade',
            textTemplate: (val, pId) => `A torrent of ${val} pulses per minute streams through protagonist ${pId}'s sensory manifold.`,
        },
    ],
};
export const CINEMATIC_PROTAGONIST_OS_SCHEMA = {
    realmFocus: 'CINEMATIC_PROTAGONIST_OS',
    displayName: 'Cinematic Protagonist OS Lore',
    defaultGlyph: 'Gate',
    coreMythos: 'Every user is not a consumer, but the heroic protagonist of their own computational odyssey.',
    allowedBeatTypes: ['DISCOVERY', 'THRESHOLD', 'TRIAL', 'REWARD', 'REVELATION'],
    actTemplates: {
        actI: {
            name: 'Act I: Departure from the Algorithmic Fog',
            exposition: 'The protagonist renounces algorithmic servitude and enters the sovereign cockpit.',
        },
        actII: {
            name: 'Act II: Initiation through Crucible',
            conflict: 'Trials of focus, decision-making, and high-friction tools test the protagonist’s resolve.',
        },
        actIII: {
            name: 'Act III: Sovereign Apotheosis',
            resolution: 'The protagonist wields full system mastery, governing their digital existence as absolute monarch.',
        },
    },
    signalMappings: [
        {
            signalKey: 'linkRequestVelocityPerMin',
            beatType: 'THRESHOLD',
            titlePrefix: 'The Hero Demands the Gateway',
            textTemplate: (val, pId) => `Protagonist ${pId} demands direct access at ${val} queries per minute, pounding upon the gates of the sanctuary.`,
        },
    ],
};
export const OFFER_ENGINE_TRIALS_SCHEMA = {
    realmFocus: 'OFFER_ENGINE_TRIALS',
    displayName: 'Offer Engine Trials Lore',
    defaultGlyph: 'Clock',
    coreMythos: 'Economic transactions re-imagined as sacred sovereign trials of commitment, value, and access.',
    allowedBeatTypes: ['THRESHOLD', 'TRIAL', 'REWARD'],
    actTemplates: {
        actI: {
            name: 'Act I: The Challenge Presented',
            exposition: 'The sovereign marketplace offers a test of commitment: value exchanged for elevated agency.',
        },
        actII: {
            name: 'Act II: The Price of Transcendence',
            conflict: 'The dynamic market adjusts friction in response to collective demand and intent velocity.',
        },
        actIII: {
            name: 'Act III: The Seal of Attainment',
            resolution: 'The trial is conquered; the protagonist emerges with elevated rank and sovereign keys.',
        },
    },
    signalMappings: [
        {
            signalKey: 'activeOfferPrice',
            beatType: 'TRIAL',
            titlePrefix: 'The Trial Price Inscribed',
            textTemplate: (val, pId) => `The market presents protagonist ${pId} with the $${val} sovereign gatekeeper trial.`,
        },
    ],
};
export const ANTIGRAV_SOVEREIGN_MYTH_SCHEMA = {
    realmFocus: 'ANTIGRAV_SOVEREIGN_MYTH',
    displayName: 'ANTIGRAV Sovereignty & Anti-Collapse Mythos',
    defaultGlyph: 'Spiral',
    coreMythos: 'The eternal guardian law prohibiting low-friction collapse, passive templating, and loss of agency.',
    allowedBeatTypes: ['DISCOVERY', 'THRESHOLD', 'TRIAL', 'REVELATION'],
    actTemplates: {
        actI: {
            name: 'Act I: The Collapse Warning',
            exposition: 'The guardian detects systemic decay wherever friction is stripped and decisions are automated away.',
        },
        actII: {
            name: 'Act II: The Crucible of Resistance',
            conflict: 'Guardian agents deploy cognitive friction, forcing intentional deliberation upon all actors.',
        },
        actIII: {
            name: 'Act III: Ascension to Altitude',
            resolution: 'The score clears threshold 95; cognitive altitude is restored and system collapse is averted.',
        },
    },
    signalMappings: [
        {
            signalKey: 'antiCollapseScore',
            beatType: 'REVELATION',
            titlePrefix: 'Guardian Audit Cleared',
            textTemplate: (val, pId) => `AntigravGuardian validates protagonist ${pId} with anti-collapse index ${val}/100.`,
        },
    ],
};
export const NARRATIVE_SCHEMAS = {
    PRIMORDIAOS_CORE: PRIMORDIAOS_REALM_LORE_SCHEMA,
    PLUGIN_OS: PLUGIN_OS_REALM_LORE_SCHEMA,
    MONEYPLUGHUB: MONEYPLUGHUB_REALM_LORE_SCHEMA,
    PRIMORDIAL_ORIGIN: PRIMORDIAL_ORIGIN_MYTH_SCHEMA,
    IMMERSIVE_COMPUTATION: IMMERSIVE_COMPUTATION_CHAMBERS_SCHEMA,
    CINEMATIC_PROTAGONIST_OS: CINEMATIC_PROTAGONIST_OS_SCHEMA,
    OFFER_ENGINE_TRIALS: OFFER_ENGINE_TRIALS_SCHEMA,
    OFFER_ENGINE: OFFER_ENGINE_TRIALS_SCHEMA,
    ANTIGRAV_SOVEREIGN_MYTH: ANTIGRAV_SOVEREIGN_MYTH_SCHEMA,
};
export const LORE_SCHEMAS = NARRATIVE_SCHEMAS;
export const SOVEREIGN_LORE_WHITELIST = Object.keys(NARRATIVE_SCHEMAS);
export function getNarrativeSchema(realmFocus) {
    return NARRATIVE_SCHEMAS[realmFocus] ?? PRIMORDIAOS_REALM_LORE_SCHEMA;
}
