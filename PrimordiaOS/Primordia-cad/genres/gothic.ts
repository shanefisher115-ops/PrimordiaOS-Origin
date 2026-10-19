// The Gothic pack: the cathedral kit's generators with the proportions that read as Gothic.
import type { GenrePack } from "./pack.ts";

export const gothic: GenrePack = {
    id: "gothic",
    title: "Gothic",
    version: "1.0.0",
    doc: "High Gothic cathedral architecture: spires, towers, pinnacles, tracery windows, gables, flying buttresses, balustrades and cast-iron lamps.",
    assetPrefix: "Gothic",
    unrealFolder: "/Game/ThirdParty/GothicKit",
    lighting: "gothic-dusk",
    slots: {
        Stone: { color: [0.2, 0.19, 0.18], roughness: 0.82, metalness: 0 },
        Glass: { color: [1.0, 0.72, 0.38], roughness: 0.12, metalness: 0, emissive: [1.0, 0.55, 0.22], emissiveIntensity: 0.7 },
        Iron: { color: [0.035, 0.035, 0.04], roughness: 0.45, metalness: 1 },
    },
    generators: {
        spire: {
            weight: 1.2,
            ranges: { height: [18, 90], baseWidth: [4, 16], sides: [6, 12], crockets: [4, 18], crocketSize: [0.4, 1.6], bands: [1, 4], lucarnes: [0, 1], finialHeight: [1.5, 6] },
            triangleBudget: 100_000,
            maxSize: [24, 24, 95],
        },
        pinnacle: {
            weight: 1,
            ranges: { height: [3, 9], width: [0.6, 1.4], crockets: [2, 7], gablets: [0, 1], panels: [0, 1] },
            triangleBudget: 20_000,
            maxSize: [4, 4, 10],
        },
        lancet: {
            weight: 1,
            ranges: { width: [1.4, 3.4], height: [4, 12], pointedness: [0.8, 1.5], lights: [1, 4], frameWidth: [0.2, 0.45], depth: [0.3, 0.9], foils: [3, 6] },
            fixed: { glass: 1 },
            triangleBudget: 10_000,
            maxSize: [5, 2, 13],
        },
        rose: {
            weight: 0.9,
            ranges: { diameter: [5, 14], depth: [0.4, 0.9], petals: [8, 20], rimWidth: [0.3, 0.9], hub: [0.12, 0.3], foils: [4, 8] },
            fixed: { glass: 1 },
            triangleBudget: 40_000,
            maxSize: [15, 2, 15],
        },
        gable: {
            weight: 0.8,
            ranges: { width: [10, 26], pitch: [50, 65], wallHeight: [3, 8], depth: [1, 2], lancets: [0, 6], rose: [0, 1], crockets: [0, 1] },
            fixed: { glass: 1 },
            triangleBudget: 60_000,
            maxSize: [30, 4, 40],
        },
        tower: {
            weight: 0.5,
            ranges: { height: [36, 80], width: [14, 24], spireHeight: [30, 80], lancets: [1, 3], pinnacles: [0, 1], crockets: [8, 18] },
            fixed: { glass: 1 },
            triangleBudget: 150_000,
            maxSize: [32, 32, 165],
        },
        buttress: {
            weight: 0.8,
            ranges: { span: [4, 9], height: [10, 30], pierWidth: [1, 2.2], pierDepth: [1.8, 3], thickness: [0.6, 1.4], pinnacle: [0, 1], crockets: [0, 1] },
            triangleBudget: 20_000,
            maxSize: [14, 4, 40],
        },
        balustrade: {
            weight: 0.6,
            ranges: { length: [2, 6], height: [0.8, 1.3], depth: [0.25, 0.4], spacing: [0.22, 0.4], style: [0, 1], posts: [0, 1] },
            triangleBudget: 10_000,
            maxSize: [7, 1, 2],
        },
        lamp: {
            weight: 0.7,
            ranges: { height: [3.2, 5.5], arms: [0, 4], lanternSize: [0.45, 0.8] },
            fixed: { glass: 1 },
            triangleBudget: 10_000,
            maxSize: [4, 4, 6],
        },
    },
};
