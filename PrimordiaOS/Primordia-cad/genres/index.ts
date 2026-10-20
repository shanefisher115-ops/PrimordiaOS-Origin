// Genre packs registry. Add a pack here and it is picked up by the realm-asset engineer and the tests.
import { gothic } from "./gothic.ts";
import { scifi } from "./scifi.ts";
import type { GenrePack } from "./pack.ts";

export { LIGHTING } from "./lighting.ts";
export type { LightingPreset } from "./lighting.ts";
export { packData, sampleStyle, validatePack } from "./pack.ts";
export type { GeneratorStyle, GenrePack, SlotLook } from "./pack.ts";

export const GENRES: Record<string, GenrePack> = { gothic, scifi };
