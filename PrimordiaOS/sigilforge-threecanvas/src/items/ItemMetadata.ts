export type ItemCategory =
  | 'crown'
  | 'bezel'
  | 'cosmic_field'
  | 'phoenix_wing'
  | 'matrix_hex'
  | 'bifrost_spectrum'
  | 'dragon_horn'
  | 'merkaba_star'
  | 'ascendant_halo';

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'sovereign';

export interface SigilItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: RarityTier;
  svgPath: string;
  viewBox: string;
  defaultScale: number;
  defaultRotation: number;
  orbitalSpeedMultiplier: number;
  harmonicHueOffset: number;
  tags: string[];
  layerIndex: number;
}

export interface ItemFilterOptions {
  category?: ItemCategory;
  rarity?: RarityTier;
  tag?: string;
  search?: string;
}
