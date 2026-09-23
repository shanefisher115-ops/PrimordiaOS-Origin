import * as THREE from 'three';
export class HueWheel {
    baseHue = 210; // Default cool cosmic azure
    harmonyType = 'triadic';
    saturation = 85;
    lightness = 60;
    constructor(initialHue = 210, harmony = 'triadic') {
        this.baseHue = (initialHue % 360 + 360) % 360;
        this.harmonyType = harmony;
    }
    setBaseHue(hue) {
        this.baseHue = (hue % 360 + 360) % 360;
    }
    getBaseHue() {
        return this.baseHue;
    }
    setHarmonyType(type) {
        this.harmonyType = type;
    }
    getHarmonyType() {
        return this.harmonyType;
    }
    setSaturationLightness(saturation, lightness) {
        this.saturation = Math.max(0, Math.min(100, saturation));
        this.lightness = Math.max(0, Math.min(100, lightness));
    }
    rotateHue(deltaDegrees) {
        this.baseHue = (this.baseHue + deltaDegrees) % 360;
        if (this.baseHue < 0)
            this.baseHue += 360;
    }
    getPalette(count = 5) {
        const hues = this.calculateHarmonicHues(count);
        return hues.map((h, index) => {
            const adjustedL = this.harmonyType === 'monochromatic'
                ? Math.max(25, Math.min(85, 30 + index * 12))
                : this.lightness;
            return this.hslToHex(h, this.saturation, adjustedL);
        });
    }
    getThreeColors(count = 5) {
        return this.getPalette(count).map((hex) => new THREE.Color(hex));
    }
    calculateHarmonicHues(count) {
        const hues = [this.baseHue];
        switch (this.harmonyType) {
            case 'complementary':
                hues.push((this.baseHue + 180) % 360);
                break;
            case 'triadic':
                hues.push((this.baseHue + 120) % 360);
                hues.push((this.baseHue + 240) % 360);
                break;
            case 'split_complementary':
                hues.push((this.baseHue + 150) % 360);
                hues.push((this.baseHue + 210) % 360);
                break;
            case 'analogous':
                hues.push((this.baseHue + 30) % 360);
                hues.push((this.baseHue + 60) % 360);
                hues.push((this.baseHue - 30 + 360) % 360);
                break;
            case 'monochromatic':
                for (let i = 1; i < count; i++) {
                    hues.push(this.baseHue);
                }
                break;
            case 'chromatic_flux':
            default:
                const step = 360 / Math.max(count, 1);
                for (let i = 1; i < count; i++) {
                    hues.push((this.baseHue + i * step) % 360);
                }
                break;
        }
        while (hues.length < count) {
            const last = hues[hues.length - 1];
            hues.push((last + 45) % 360);
        }
        return hues.slice(0, count);
    }
    hslToHex(h, s, l) {
        h = h / 360;
        s = s / 100;
        l = l / 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0)
                    t += 1;
                if (t > 1)
                    t -= 1;
                if (t < 1 / 6)
                    return p + (q - p) * 6 * t;
                if (t < 1 / 2)
                    return q;
                if (t < 2 / 3)
                    return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = (x) => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}
