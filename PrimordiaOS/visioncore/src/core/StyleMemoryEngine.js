/**
 * StyleMemoryEngine - Technophysical & Cinematic Aesthetic Harmonizer
 * Agent Role: Style Memory Engine Specialist
 */
import { VisionCoreLogger } from '../logging/VisionCoreLogger.js';
export class StyleMemoryEngine {
    logger;
    styles = new Map();
    constructor() {
        this.logger = new VisionCoreLogger('StyleMemoryEngine');
        this.initializeDefaultStyles();
    }
    initializeDefaultStyles() {
        // 1. Imperial Gold
        this.registerStyle({
            id: 'style-imperial-gold',
            name: 'Imperial Gold',
            aestheticCategory: 'Technophysical',
            optics: {
                focalLengthMm: 50,
                aperture: 'f/1.4',
                anamorphicSqueeze: 1.5,
                lensType: 'Anamorphic Cine-Prime',
                filmGrainIso: 200,
                chromaticAberration: 0.15
            },
            lighting: {
                keyToFillRatio: '8:1',
                colorTemperatureKelvin: 3200,
                volumetricFogDensity: 0.35,
                lutName: 'Imperial Gold',
                contrastCurve: 'High-Contrast S-Curve'
            },
            colorPalette: ['#D4AF37', '#1A1813', '#785918', '#382D16', '#F5E2A8'],
            textureParadigms: ['Brushed Brass', 'Monolithic Obsidian', 'Fine Micro-circuit Filigree'],
            atmosphericParticles: {
                type: 'Crystalline Ember',
                intensity: 0.65
            },
            narrativeTone: 'Solemn, Sovereign, Elevated, Architectural',
            consistencyScore: 98
        });
        // 2. Cyberpunk Emerald
        this.registerStyle({
            id: 'style-cyberpunk-emerald',
            name: 'Cyberpunk Emerald',
            aestheticCategory: 'Cyber-Baroque',
            optics: {
                focalLengthMm: 35,
                aperture: 'f/1.8',
                anamorphicSqueeze: 2.0,
                lensType: 'Anamorphic Cine-Prime',
                filmGrainIso: 800,
                chromaticAberration: 0.4
            },
            lighting: {
                keyToFillRatio: '4:1',
                colorTemperatureKelvin: 5600,
                volumetricFogDensity: 0.5,
                lutName: 'Cyberpunk Emerald',
                contrastCurve: 'High-Contrast S-Curve'
            },
            colorPalette: ['#00FF9D', '#03140C', '#0A3B24', '#007A48', '#80FFD0'],
            textureParadigms: ['Wet Asphalt', 'Translucent Glass Ceramic', 'Neon Phosphor Trace'],
            atmosphericParticles: {
                type: 'Laser Haze',
                intensity: 0.8
            },
            narrativeTone: 'Hyper-Dense, Electric, Nocturnal, Industrial',
            consistencyScore: 95
        });
        // 3. Sovereign Monolith
        this.registerStyle({
            id: 'style-sovereign-monolith',
            name: 'Sovereign Monolith',
            aestheticCategory: 'Brutalist Sovereign',
            optics: {
                focalLengthMm: 24,
                aperture: 'f/4.0',
                anamorphicSqueeze: 1.0,
                lensType: 'Spherical Master Prime',
                filmGrainIso: 100,
                chromaticAberration: 0.05
            },
            lighting: {
                keyToFillRatio: '12:1',
                colorTemperatureKelvin: 4300,
                volumetricFogDensity: 0.2,
                lutName: 'Neutral Raw',
                contrastCurve: 'Linear Film Log'
            },
            colorPalette: ['#111111', '#2C2C2C', '#606060', '#9E9E9E', '#E0E0E0'],
            textureParadigms: ['Poured Concrete', 'Cold Cast Steel', 'Titanium Plate'],
            atmosphericParticles: {
                type: 'Atmospheric Dust',
                intensity: 0.3
            },
            narrativeTone: 'High-Friction, Anti-Collapse, Immovable, Grounded',
            consistencyScore: 99
        });
    }
    registerStyle(style) {
        this.styles.set(style.name.toLowerCase(), style);
        this.styles.set(style.id.toLowerCase(), style);
        this.logger.debug(`Registered style fingerprint: ${style.name} (${style.id})`);
    }
    getStyleFingerprint(identifier) {
        const query = identifier.toLowerCase().trim();
        if (this.styles.has(query)) {
            return this.styles.get(query);
        }
        // Default fallback to Imperial Gold
        this.logger.warn(`Style identifier '${identifier}' not matched; defaulting to Imperial Gold`);
        return this.styles.get('imperial gold');
    }
    listSupportedStyles() {
        const distinct = new Set(this.styles.values());
        return Array.from(distinct);
    }
    /**
     * Evaluates prompt or scene description against target style fingerprint.
     */
    enforceToneConsistency(targetStyle, sceneDescriptor) {
        const text = sceneDescriptor.toLowerCase();
        const deviations = [];
        const correctiveDirectives = [];
        let score = 100;
        // Check against conflicting mood descriptors
        if (targetStyle.name === 'Imperial Gold') {
            if (text.includes('neon') || text.includes('bubblegum') || text.includes('pastel')) {
                deviations.push('Detected non-complaint modern high-saturation neon/pastel tokens in sovereign aesthetic.');
                correctiveDirectives.push('Shift color grading to 3200K amber/tungsten; substitute neon flares with brass specular highlights.');
                score -= 25;
            }
        }
        else if (targetStyle.name === 'Sovereign Monolith') {
            if (text.includes('playful') || text.includes('cartoon') || text.includes('frivolous')) {
                deviations.push('Levity detected in monolithic brutalist architecture.');
                correctiveDirectives.push('Reinforce structural mass, low-key lighting, and cold-cast titanium surfaces.');
                score -= 30;
            }
        }
        return {
            isConsistent: score >= 70,
            score: Math.max(0, score),
            deviations,
            correctiveDirectives
        };
    }
}
