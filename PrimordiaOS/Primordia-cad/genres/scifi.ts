// The sci-fi spires pack: arcology towers, energy pylons, habitat domes and comms masts for a night city.
import type { GenrePack } from "./pack.ts";

export const scifi: GenrePack = {
    id: "scifi",
    title: "Sci-fi spires",
    version: "1.0.0",
    doc: "Sci-fi spires: set-back arcology towers banded with glowing windows, energy pylons, glazed habitat domes and comms masts.",
    assetPrefix: "SciFi",
    unrealFolder: "/Game/ThirdParty/SciFiKit",
    lighting: "scifi-night",
    slots: {
        Stone: { color: [0.26, 0.28, 0.32], roughness: 0.38, metalness: 0.2 }, // ceramic hull plating
        Glass: { color: [0.04, 0.25, 0.35], roughness: 0.08, metalness: 0, emissive: [0.05, 0.6, 1.0], emissiveIntensity: 0.45 },
        Iron: { color: [0.05, 0.055, 0.065], roughness: 0.32, metalness: 1 }, // gunmetal
    },
    generators: {
        arcology: {
            weight: 1.3,
            ranges: { height: [60, 260], baseWidth: [14, 50], sides: [4, 10], tiers: [2, 6], taper: [0.3, 0.85], floorHeight: [3, 7], glassRatio: [0.25, 0.65], needle: [0.05, 0.3], ring: [0, 1] },
            fixed: { glass: 1 },
            triangleBudget: 20_000,
            maxSize: [115, 115, 262],
        },
        pylon: {
            weight: 1,
            ranges: { height: [6, 30], legs: [3, 6], spread: [0.18, 0.4], core: [0.03, 0.09], rings: [1, 6], fins: [0, 6], emitter: [0, 1] },
            fixed: { glass: 1 },
            triangleBudget: 10_000,
            maxSize: [30, 30, 31],
        },
        dome: {
            weight: 0.9,
            ranges: { diameter: [8, 40], rise: [0.35, 1], baseHeight: [0.8, 4], ribs: [4, 16], rings: [0, 4], airlocks: [0, 3] },
            fixed: { glass: 1 },
            triangleBudget: 20_000,
            maxSize: [62, 62, 30],
        },
        mast: {
            weight: 0.9,
            ranges: { height: [12, 70], baseWidth: [1.2, 5], sections: [2, 7], taper: [0.25, 0.8], dishes: [0, 4], dishSize: [1, 5], arrays: [0, 6], beacon: [0, 1] },
            fixed: { glass: 1 },
            triangleBudget: 25_000,
            maxSize: [18, 18, 71],
        },
    },
};
