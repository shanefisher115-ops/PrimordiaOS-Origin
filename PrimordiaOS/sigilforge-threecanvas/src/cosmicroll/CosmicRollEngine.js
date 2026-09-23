import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';
export class CosmicRollEngine {
    logger = new SigilForgeLogger('CosmicRollEngine');
    registry;
    composition;
    onSoundscapeEvent = null;
    rarityWeights = {
        common: 35,
        uncommon: 25,
        rare: 20,
        epic: 12,
        legendary: 6,
        sovereign: 2,
    };
    rarityRank = {
        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5,
        sovereign: 6,
    };
    categories = [
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
    constructor(registry, composition) {
        this.registry = registry;
        this.composition = composition;
    }
    setSoundscapeListener(callback) {
        this.onSoundscapeEvent = callback;
    }
    roll(itemCount = 5) {
        this.logger.info('Executing procedural Cosmic Roll...');
        // 1. Randomize color harmony & base hue
        const baseHue = Math.floor(Math.random() * 360);
        const harmonies = [
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
        const selectedItems = [];
        let highestRarity = 'common';
        // Clear previous composition layers
        this.composition.clearLayers();
        // 3. For each category, pick an item weighted by rarity
        for (const cat of selectedCategories) {
            const availableItems = this.registry.getItemsByCategory(cat);
            if (availableItems.length === 0)
                continue;
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
        let soundEvent;
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
            }
            catch (err) {
                this.logger.error('Failed to trigger soundscape callback', err);
            }
        }
        const seed = `PRIM-ROLL-${Date.now().toString(16).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const result = {
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
    pickWeightedItem(items) {
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
