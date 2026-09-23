import fs from "fs";
import { FigmaFrame, FigmaIngestResult } from "./figma_ingest";

export interface UIMetadata {
  themeTokens: {
    colors: Record<string, string>;
    typography: Record<string, any>;
    glassmorphism: Record<string, any>;
  };
  layoutHierarchy: any[];
  screens: Array<{
    frameId: string;
    screenName: string;
    aspectRatio: string;
    themeVariant: string;
    promotionalHeadline: string;
    promotionalSubheadline: string;
    keyComponents: string[];
  }>;
  extractedAt: string;
}

export class StitchExtractEngine {
  /**
   * Parses UI metadata, colors, typography, layout hierarchy from Figma frames + Stitch manifest
   */
  public async extract(figmaResult: FigmaIngestResult, stitchManifestPath: string): Promise<UIMetadata> {
    console.log(`[StitchExtractEngine] Extracting UI tokens and metadata...`);

    let stitchConfig: any = {};
    if (fs.existsSync(stitchManifestPath)) {
      try {
        stitchConfig = JSON.parse(fs.readFileSync(stitchManifestPath, "utf-8"));
      } catch (err) {
        console.warn(`[StitchExtractEngine] Failed to parse stitch manifest at ${stitchManifestPath}, using defaults.`);
      }
    }

    const tokens = stitchConfig.tokens || {
      colors: {
        primary: "#00FFC2",
        secondary: "#00E5FF",
        accent: "#FFD700",
        laser: "#A855F7",
        background: "#07090E",
        surface: "#0D111A"
      },
      typography: {
        display: { fontFamily: "Cinematic Mythic Sans", fontWeight: 800 },
        code: { fontFamily: "JetBrains Mono", fontWeight: 600 }
      },
      glassmorphism: {
        backdropBlur: "24px",
        backgroundAlpha: 0.65
      }
    };

    const screens = figmaResult.frames.map((frame, index) => {
      const width = frame.bounds.width || 1290;
      const height = frame.bounds.height || 2796;
      const ratio = (width / height).toFixed(2);

      // Derive contextual marketing headlines for PrimordiaOS
      let headline = "Sovereignty-Driven Operating System";
      let subheadline = "Decentralized autonomous intelligence at cosmic scale";

      if (frame.name.toLowerCase().includes("dashboard")) {
        headline = "Unified Sovereign Realm Control";
        subheadline = "Command your autonomous agent swarm and cognitive altitude";
      } else if (frame.name.toLowerCase().includes("moneyplug")) {
        headline = "Instant Syndicate Revenue Loops";
        subheadline = "Autonomous wealth pipelines with non-custodial cryptographic vaulting";
      } else if (frame.name.toLowerCase().includes("antigrav") || frame.name.toLowerCase().includes("guardian")) {
        headline = "Antigrav Anti-Collapse Engine";
        subheadline = "High-friction cognition and sovereign integrity filters";
      } else if (frame.name.toLowerCase().includes("windows") || frame.name.toLowerCase().includes("command")) {
        headline = "Desktop Command Continuum";
        subheadline = "Multi-realm orchestration across Unreal Engine & Cloud Run Substrates";
      } else if (frame.name.toLowerCase().includes("icon")) {
        headline = "Primordia Master Sigil";
        subheadline = "Symbolic crest of the Primordial substrate";
      }

      return {
        frameId: frame.id,
        screenName: frame.name,
        aspectRatio: `${width}:${height} (${ratio})`,
        themeVariant: index % 2 === 0 ? "mythic_obsidian" : "neon_substrate",
        promotionalHeadline: headline,
        promotionalSubheadline: subheadline,
        keyComponents: frame.components.map(c => c.name)
      };
    });

    const uiMetadata: UIMetadata = {
      themeTokens: tokens,
      layoutHierarchy: stitchConfig.layout_hierarchy || [],
      screens,
      extractedAt: new Date().toISOString()
    };

    return uiMetadata;
  }
}
