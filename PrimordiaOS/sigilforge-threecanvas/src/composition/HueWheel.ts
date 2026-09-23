import * as THREE from 'three';

export type ColorHarmonyType =
  | 'triadic'
  | 'complementary'
  | 'split_complementary'
  | 'analogous'
  | 'monochromatic'
  | 'chromatic_flux';

export interface HSLColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
}

export class HueWheel {
  private baseHue: number = 210; // Default cool cosmic azure
  private harmonyType: ColorHarmonyType = 'triadic';
  private saturation: number = 85;
  private lightness: number = 60;

  constructor(initialHue: number = 210, harmony: ColorHarmonyType = 'triadic') {
    this.baseHue = (initialHue % 360 + 360) % 360;
    this.harmonyType = harmony;
  }

  public setBaseHue(hue: number): void {
    this.baseHue = (hue % 360 + 360) % 360;
  }

  public getBaseHue(): number {
    return this.baseHue;
  }

  public setHarmonyType(type: ColorHarmonyType): void {
    this.harmonyType = type;
  }

  public getHarmonyType(): ColorHarmonyType {
    return this.harmonyType;
  }

  public setSaturationLightness(saturation: number, lightness: number): void {
    this.saturation = Math.max(0, Math.min(100, saturation));
    this.lightness = Math.max(0, Math.min(100, lightness));
  }

  public rotateHue(deltaDegrees: number): void {
    this.baseHue = (this.baseHue + deltaDegrees) % 360;
    if (this.baseHue < 0) this.baseHue += 360;
  }

  public getPalette(count: number = 5): string[] {
    const hues = this.calculateHarmonicHues(count);
    return hues.map((h, index) => {
      const adjustedL = this.harmonyType === 'monochromatic'
        ? Math.max(25, Math.min(85, 30 + index * 12))
        : this.lightness;
      return this.hslToHex(h, this.saturation, adjustedL);
    });
  }

  public getThreeColors(count: number = 5): THREE.Color[] {
    return this.getPalette(count).map((hex) => new THREE.Color(hex));
  }

  public calculateHarmonicHues(count: number): number[] {
    const hues: number[] = [this.baseHue];

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

  public hslToHex(h: number, s: number, l: number): string {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
