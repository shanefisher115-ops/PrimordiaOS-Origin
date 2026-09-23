import { SigilItemRegistry } from '../items/SigilItemRegistry.js';
import { SigilCompositionEngine } from '../composition/SigilCompositionEngine.js';
import { ItemCategory, RarityTier, SigilItem } from '../items/ItemMetadata.js';
import { ColorHarmonyType } from '../composition/HueWheel.js';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';

export interface CosmicRollResult {
  seed: string;
  timestamp: string;
  selectedItems: SigilItem[];
  baseHue: number;
  harmony: ColorHarmonyType;
  highestRarity: RarityTier;
  soundscapeEvent: {
    type: 'resonant_bell' | 'quantum_surge' | 'celestial_chime' | 'sovereign_thunder';
    pitchMultiplier: number;
    volume: number;
  };
}

export type SoundscapeCallback = (event: CosmicRollResult['soundscapeEvent']) => void;

export class CosmicRollEngine {
  private logger = new SigilForgeLogger('CosmicRollEngine');
  private registry: SigilItemRegistry;
  private composition: SigilCompositionEngine;
  private onSoundscapeEvent: SoundscapeCallback | null = null;

  private readonly rarityWeights: Record<RarityTier, number> = {
    common: 35,
    uncommon: 25,
    rare: 20,
    epic: 12,
    legendary: 6,
    sovereign: 2,
  };

  private readonly rarityRank: Record<RarityTier, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    sovereign: 6,
  };

  private readonly categories: ItemCategory[] = [
    'crown',
    'bezel',
    'cosmic_field',
    'phoenix_wing',
    'matrix_hex',
    'bifrost_spectrum',
    'dragon_horn',
    'merkaba_star',
    'ascendant_halo',
  ];

  constructor(registry: SigilItemRegistry, composition: SigilCompositionEngine) {
    this.registry = registry;
    this.composition = composition;
  }

  public setSoundscapeListener(callback: SoundscapeCallback): void {
    this.onSoundscapeEvent = callback;
  }

  public roll(itemCount: number = 5): CosmicRollResult {
    this.logger.info('Executing procedural Cosmic Roll...');

    // 1. Randomize color harmony & base hue
    const baseHue = Math.floor(Math.random() * 360);
    const harmonies: ColorHarmonyType[] = [
      'triadic',
      'complementary',
      'split_complementary',
      'analogous',
      'chromatic_flux',
    ];
    const harmony = harmonies[Math.floor(Math.random() * harmonies.length)];

    const hueWheel = this.composition.getHueWheel();
    hueWheel.setBaseHue(baseHue);
    hueWheel.setHarmonyType(harmony);

    // 2. Select random categories (shuffled)
    const shuffledCategories = [...this.categories].sort(() => Math.random() - 0.5);
    const targetCount = Math.max(3, Math.min(shuffledCategories.length, itemCount));
    const selectedCategories = shuffledCategories.slice(0, targetCount);

    const selectedItems: SigilItem[] = [];
    let highestRarity: RarityTier = 'common';

    // Clear previous composition layers
    this.composition.clearLayers();

    // 3. For each category, pick an item weighted by rarity
    for (const cat of selectedCategories) {
      const availableItems = this.registry.getItemsByCategory(cat);
      if (availableItems.length === 0) continue;

      const item = this.pickWeightedItem(availableItems);
      selectedItems.push(item);

      if (this.rarityRank[item.rarity] > this.rarityRank[highestRarity]) {
        highestRarity = item.rarity;
      }

      // Randomize orbital velocity slightly around base
      const orbitController = this.composition.getOrbitalVelocity();
      const speedDirection = Math.random() > 0.5 ? 1 : -1;
      const randomizedSpeed = speedDirection * (0.05 + Math.random() * 0.25);
      orbitController.setLayerVelocity(item.layerIndex, randomizedSpeed);

      this.composition.addLayer(item);
    }

    // 4. Determine Soundscape Event
    let soundEvent: CosmicRollResult['soundscapeEvent'];
    switch (highestRarity) {
      case 'sovereign':
        soundEvent = { type: 'sovereign_thunder', pitchMultiplier: 0.8, volume: 1.0 };
        break;
      case 'legendary':
        soundEvent = { type: 'quantum_surge', pitchMultiplier: 1.1, volume: 0.9 };
        break;
      case 'epic':
        soundEvent = { type: 'celestial_chime', pitchMultiplier: 1.3, volume: 0.8 };
        break;
      default:
        soundEvent = { type: 'resonant_bell', pitchMultiplier: 1.0, volume: 0.7 };
        break;
    }

    if (this.onSoundscapeEvent) {
      try {
        this.onSoundscapeEvent(soundEvent);
      } catch (err) {
        this.logger.error('Failed to trigger soundscape callback', err);
      }
    }

    const seed = `PRIM-ROLL-${Date.now().toString(16).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const result: CosmicRollResult = {
      seed,
      timestamp: new Date().toISOString(),
      selectedItems,
      baseHue,
      harmony,
      highestRarity,
      soundscapeEvent: soundEvent,
    };

    this.logger.sovereign(`Cosmic Roll Complete! Highest Tier: ${highestRarity} | Seed: ${seed}`);
    return result;
  }

  private pickWeightedItem(items: SigilItem[]): SigilItem {
    let totalWeight = 0;
    for (const item of items) {
      totalWeight += this.rarityWeights[item.rarity] || 10;
    }

    let randomVal = Math.random() * totalWeight;
    for (const item of items) {
      const weight = this.rarityWeights[item.rarity] || 10;
      if (randomVal <= weight) {
        return item;
      }
      randomVal -= weight;
    }

    return items[0];
  }
}
