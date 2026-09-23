import fs from "fs";
import path from "path";
import { PlatformAssetSpecs, PlatformRenderJob } from "./mcp_apply";

export interface AntigravityRenderResult {
  engine: "antigravity.render";
  totalRendered: number;
  outputDirectories: Record<string, string>;
  generatedFiles: Array<{
    jobId: string;
    platform: string;
    filePath: string;
    width: number;
    height: number;
    fileSizeBytes: number;
  }>;
  cinematicProfileApplied: {
    style: string;
    overlaysApplied: string[];
    transitions: string[];
  };
  renderDurationMs: number;
  timestamp: string;
}

export class AntigravityRenderEngine {
  /**
   * Generates cinematic, platform-ready store assets using Antigravity AI rendering and mythic OS overlays
   */
  public async render(
    specs: PlatformAssetSpecs,
    profilePath: string,
    outputBaseDir: string = "./out"
  ): Promise<AntigravityRenderResult> {
    const startTime = Date.now();
    console.log(`[AntigravityRenderEngine] Initializing AI Cinematic Rendering Engine...`);

    const outputDirs = {
      ios_screenshots: path.join(outputBaseDir, "ios", "screenshots"),
      android_screenshots: path.join(outputBaseDir, "android", "screenshots"),
      windows_store_assets: path.join(outputBaseDir, "windows", "assets"),
      promo_graphics: path.join(outputBaseDir, "promo"),
      realm_icons: path.join(outputBaseDir, "icons")
    };

    // Ensure output directories exist
    Object.values(outputDirs).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const generatedFiles: Array<{
      jobId: string;
      platform: string;
      filePath: string;
      width: number;
      height: number;
      fileSizeBytes: number;
    }> = [];

    for (const job of specs.jobs) {
      const targetDir = outputDirs[job.outputCategory as keyof typeof outputDirs] || path.join(outputBaseDir, job.outputCategory);
      const filePath = path.join(targetDir, job.outputFilename);

      // Generate SVG / Cinematic Graphic for each asset
      const svgContent = this.generateCinematicSvg(job);
      fs.writeFileSync(filePath, svgContent, "utf-8");

      const stats = fs.statSync(filePath);
      generatedFiles.push({
        jobId: job.jobId,
        platform: job.platform,
        filePath,
        width: job.width,
        height: job.height,
        fileSizeBytes: stats.size
      });

      console.log(`  ✓ Rendered [${job.platform.toUpperCase()}] ${job.targetDeviceOrFormat} -> ${job.outputFilename} (${job.width}x${job.height})`);
    }

    const duration = Date.now() - startTime;

    return {
      engine: "antigravity.render",
      totalRendered: generatedFiles.length,
      outputDirectories: outputDirs,
      generatedFiles,
      cinematicProfileApplied: {
        style: "mythic_os",
        overlaysApplied: ["particle_flux", "realm_sigils", "node_runes"],
        transitions: ["forge_ignition", "sigil_bloom", "asset_rainfall"]
      },
      renderDurationMs: duration,
      timestamp: new Date().toISOString()
    };
  }

  private generateCinematicSvg(job: PlatformRenderJob): string {
    const isIcon = job.platform === "icons" || job.targetDeviceOrFormat.toLowerCase().includes("tile");
    const isLandscape = job.width > job.height;

    // Mythic Palette
    const bgGradientStart = "#07090E";
    const bgGradientEnd = "#0D111A";
    const tealAccent = "#00FFC2";
    const cyanAccent = "#00E5FF";
    const goldAccent = "#FFD700";
    const laserViolet = "#A855F7";

    if (isIcon) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${job.width} ${job.height}" width="${job.width}" height="${job.height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05070B" />
      <stop offset="50%" stop-color="#0E131F" />
      <stop offset="100%" stop-color="#1A102F" />
    </linearGradient>
    <linearGradient id="sigilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${tealAccent}" />
      <stop offset="50%" stop-color="${cyanAccent}" />
      <stop offset="100%" stop-color="${goldAccent}" />
    </linearGradient>
    <filter id="sigilGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${job.width * 0.03}" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background Base with Rounded Bezel -->
  <rect width="${job.width}" height="${job.height}" rx="${job.width * 0.22}" fill="url(#bgGrad)" />
  <rect width="${job.width - 8}" height="${job.height - 8}" x="4" y="4" rx="${job.width * 0.22}" fill="none" stroke="${tealAccent}" stroke-width="3" stroke-opacity="0.4" />

  <!-- Particle / Star Flux -->
  <circle cx="${job.width * 0.2}" cy="${job.height * 0.25}" r="${job.width * 0.015}" fill="${cyanAccent}" opacity="0.6" />
  <circle cx="${job.width * 0.8}" cy="${job.height * 0.3}" r="${job.width * 0.02}" fill="${goldAccent}" opacity="0.5" />
  <circle cx="${job.width * 0.75}" cy="${job.height * 0.8}" r="${job.width * 0.012}" fill="${laserViolet}" opacity="0.7" />
  <circle cx="${job.width * 0.25}" cy="${job.height * 0.75}" r="${job.width * 0.018}" fill="${tealAccent}" opacity="0.8" />

  <!-- Master Mythic Sigil Crest -->
  <g transform="translate(${job.width * 0.5}, ${job.height * 0.48})" filter="url(#sigilGlow)">
    <!-- Outer Hexagram Rune Wheel -->
    <polygon points="0,${-job.height * 0.3} ${job.width * 0.26},${-job.height * 0.15} ${job.width * 0.26},${job.height * 0.15} 0,${job.height * 0.3} ${-job.width * 0.26},${job.height * 0.15} ${-job.width * 0.26},${-job.height * 0.15}" fill="none" stroke="url(#sigilGrad)" stroke-width="${job.width * 0.02}" opacity="0.8" />
    <circle r="${job.width * 0.18}" fill="none" stroke="${laserViolet}" stroke-width="${job.width * 0.015}" stroke-dasharray="8 6" opacity="0.9" />

    <!-- Central Primordia Core -->
    <polygon points="0,${-job.height * 0.18} ${job.width * 0.15},${job.height * 0.09} ${-job.width * 0.15},${job.height * 0.09}" fill="url(#sigilGrad)" opacity="0.95" />
    <circle r="${job.width * 0.05}" fill="#FFFFFF" />
  </g>

  <!-- Typography Crest Label -->
  <text x="${job.width * 0.5}" y="${job.height * 0.90}" text-anchor="middle" font-family="'Cinematic Mythic Sans', 'Space Grotesk', sans-serif" font-size="${job.width * 0.065}" font-weight="900" fill="#FFFFFF" letter-spacing="0.15em">PRIMORDIA</text>
</svg>`;
    }

    // Full Device Screenshot or Promotional Poster
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${job.width} ${job.height}" width="${job.width}" height="${job.height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradientStart}" />
      <stop offset="60%" stop-color="${bgGradientEnd}" />
      <stop offset="100%" stop-color="#140D24" />
    </linearGradient>
    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${tealAccent}" />
      <stop offset="50%" stop-color="${cyanAccent}" />
      <stop offset="100%" stop-color="${laserViolet}" />
    </linearGradient>
    <filter id="ambientGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="35" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="${job.width}" height="${job.height}" fill="url(#bgGrad)" />

  <!-- Particle Flux & Rune Stream Overlay -->
  <g opacity="0.3">
    <circle cx="${job.width * 0.15}" cy="${job.height * 0.2}" r="120" fill="${tealAccent}" filter="url(#ambientGlow)" />
    <circle cx="${job.width * 0.85}" cy="${job.height * 0.7}" r="160" fill="${laserViolet}" filter="url(#ambientGlow)" />
    <circle cx="${job.width * 0.5}" cy="${job.height * 0.9}" r="100" fill="${cyanAccent}" filter="url(#ambientGlow)" />
  </g>

  <!-- Node Runes Glyph Watermark -->
  <text x="${job.width * 0.05}" y="${job.height * 0.12}" font-family="'JetBrains Mono', monospace" font-size="${Math.max(14, job.width * 0.016)}" fill="${goldAccent}" opacity="0.5" letter-spacing="0.4em">ᚨ ᚱ ᚲ ᚺ ᛟ ᚾ ᛊ ᛏ ᛖ ᛚ ᛚ ᚨ [SOVEREIGN CONTINUUM]</text>

  <!-- Realm Sigil Watermark (Top Right) -->
  <g transform="translate(${job.width * 0.92}, ${job.height * 0.08})" opacity="0.75">
    <polygon points="0,-25 22,-12 22,12 0,25 -22,12 -22,-12" fill="none" stroke="${tealAccent}" stroke-width="2.5" />
    <circle r="8" fill="${cyanAccent}" />
  </g>

  <!-- Promotional Marketing Headline -->
  <text x="${job.width * 0.5}" y="${isLandscape ? job.height * 0.16 : job.height * 0.08}" text-anchor="middle" font-family="'Cinematic Mythic Sans', 'Space Grotesk', sans-serif" font-size="${Math.max(28, job.width * (isLandscape ? 0.038 : 0.052))}" font-weight="900" fill="#FFFFFF" letter-spacing="0.06em">
    ${job.sourceScreen.headline.toUpperCase()}
  </text>
  <text x="${job.width * 0.5}" y="${isLandscape ? job.height * 0.22 : job.height * 0.115}" text-anchor="middle" font-family="'Inter', sans-serif" font-size="${Math.max(16, job.width * (isLandscape ? 0.018 : 0.026))}" font-weight="500" fill="${cyanAccent}" opacity="0.95">
    ${job.sourceScreen.subheadline}
  </text>

  <!-- Device Frame & UI Showcase Container -->
  ${
    isLandscape
      ? `
  <g transform="translate(${job.width * 0.1}, ${job.height * 0.3})">
    <!-- Desktop Bezel -->
    <rect width="${job.width * 0.8}" height="${job.height * 0.6}" rx="24" fill="#0A0E17" stroke="url(#neonGlow)" stroke-width="3" />
    <rect width="${job.width * 0.78}" height="${job.height * 0.56}" x="${job.width * 0.01}" y="${job.height * 0.02}" rx="16" fill="#030508" />
    
    <!-- UI Header Bar -->
    <rect width="${job.width * 0.78}" height="45" x="${job.width * 0.01}" y="${job.height * 0.02}" fill="#0D1321" />
    <circle cx="${job.width * 0.03}" cy="${job.height * 0.02 + 22}" r="6" fill="#FF5F56" />
    <circle cx="${job.width * 0.045}" cy="${job.height * 0.02 + 22}" r="6" fill="#FFBD2E" />
    <circle cx="${job.width * 0.06}" cy="${job.height * 0.02 + 22}" r="6" fill="#27C93F" />
    <text x="${job.width * 0.4}" y="${job.height * 0.02 + 28}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="14" fill="#64748B">PrimordiaOS Sovereign Control Deck — ${job.sourceScreen.screenName}</text>

    <!-- UI Core Graphic Panels -->
    <rect width="${job.width * 0.24}" height="${job.height * 0.45}" x="${job.width * 0.025}" y="${job.height * 0.09}" rx="12" fill="#090E18" stroke="${tealAccent}" stroke-opacity="0.3" />
    <rect width="${job.width * 0.48}" height="${job.height * 0.45}" x="${job.width * 0.285}" y="${job.height * 0.09}" rx="12" fill="#090E18" stroke="${cyanAccent}" stroke-opacity="0.3" />

    <text x="${job.width * 0.045}" y="${job.height * 0.14}" font-family="'Cinematic Mythic Sans', sans-serif" font-size="16" font-weight="700" fill="${tealAccent}">REALM TELEMETRY</text>
    <text x="${job.width * 0.045}" y="${job.height * 0.19}" font-family="'JetBrains Mono', monospace" font-size="12" fill="#94A3B8">ANTIGRAV: 98/100</text>
    <text x="${job.width * 0.045}" y="${job.height * 0.23}" font-family="'JetBrains Mono', monospace" font-size="12" fill="#94A3B8">SWARM: 24 NODES</text>
    <text x="${job.width * 0.045}" y="${job.height * 0.27}" font-family="'JetBrains Mono', monospace" font-size="12" fill="#94A3B8">STATUS: SOVEREIGN</text>

    <text x="${job.width * 0.31}" y="${job.height * 0.14}" font-family="'Cinematic Mythic Sans', sans-serif" font-size="18" font-weight="700" fill="${cyanAccent}">AUTONOMOUS REVENUE &amp; CONTINUUM STREAM</text>
    <polyline points="${job.width * 0.31},${job.height * 0.35} ${job.width * 0.42},${job.height * 0.28} ${job.width * 0.54},${job.height * 0.31} ${job.width * 0.65},${job.height * 0.22} ${job.width * 0.74},${job.height * 0.18}" fill="none" stroke="url(#neonGlow)" stroke-width="4" />
  </g>
  `
      : `
  <g transform="translate(${job.width * 0.12}, ${job.height * 0.18})">
    <!-- Mobile Titanium Frame -->
    <rect width="${job.width * 0.76}" height="${job.height * 0.76}" rx="56" fill="#0B0F19" stroke="url(#neonGlow)" stroke-width="4" />
    <rect width="${job.width * 0.72}" height="${job.height * 0.72}" x="${job.width * 0.02}" y="${job.height * 0.02}" rx="46" fill="#04060A" />

    <!-- Dynamic Island / Speaker Notch -->
    <rect width="${job.width * 0.28}" height="28" x="${job.width * 0.24}" y="${job.height * 0.035}" rx="14" fill="#000000" stroke="#1E293B" stroke-width="1" />

    <!-- Mobile UI Cards -->
    <rect width="${job.width * 0.64}" height="${job.height * 0.16}" x="${job.width * 0.06}" y="${job.height * 0.09}" rx="20" fill="#0F172A" stroke="${tealAccent}" stroke-opacity="0.4" />
    <text x="${job.width * 0.10}" y="${job.height * 0.14}" font-family="'Cinematic Mythic Sans', sans-serif" font-size="${job.width * 0.04}" font-weight="800" fill="${tealAccent}">COGNITIVE ALTITUDE</text>
    <text x="${job.width * 0.10}" y="${job.height * 0.18}" font-family="'JetBrains Mono', monospace" font-size="${job.width * 0.055}" font-weight="900" fill="#FFFFFF">98.4 %</text>
    <text x="${job.width * 0.10}" y="${job.height * 0.22}" font-family="'Inter', sans-serif" font-size="${job.width * 0.028}" fill="#94A3B8">High Friction Sovereignty Kernel</text>

    <rect width="${job.width * 0.64}" height="${job.height * 0.22}" x="${job.width * 0.06}" y="${job.height * 0.28}" rx="20" fill="#0F172A" stroke="${laserViolet}" stroke-opacity="0.4" />
    <text x="${job.width * 0.10}" y="${job.height * 0.33}" font-family="'Cinematic Mythic Sans', sans-serif" font-size="${job.width * 0.04}" font-weight="800" fill="${laserViolet}">SYNDICATE VAULT</text>
    <text x="${job.width * 0.10}" y="${job.height * 0.38}" font-family="'JetBrains Mono', monospace" font-size="${job.width * 0.06}" font-weight="900" fill="${goldAccent}">$ 14,290.00</text>
    <text x="${job.width * 0.10}" y="${job.height * 0.42}" font-family="'Inter', sans-serif" font-size="${job.width * 0.028}" fill="#38BDF8">MoneyPlugHub Autonomous Loops Active</text>

    <!-- Bottom Navigation Dock -->
    <rect width="${job.width * 0.56}" height="${job.height * 0.07}" x="${job.width * 0.10}" y="${job.height * 0.63}" rx="24" fill="#090D16" stroke="rgba(255,255,255,0.1)" />
    <circle cx="${job.width * 0.20}" cy="${job.height * 0.665}" r="${job.width * 0.025}" fill="${tealAccent}" />
    <circle cx="${job.width * 0.38}" cy="${job.height * 0.665}" r="${job.width * 0.025}" fill="${cyanAccent}" />
    <circle cx="${job.width * 0.56}" cy="${job.height * 0.665}" r="${job.width * 0.025}" fill="${laserViolet}" />
  </g>
  `
  }

  <!-- Footer Tagline -->
  <text x="${job.width * 0.5}" y="${job.height * 0.98}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="${Math.max(12, job.width * 0.012)}" fill="#64748B" letter-spacing="0.2em">
    STORE ASSET FORGE REALM // STITCH × FIGMA × MCP × ANTIGRAVITY // PRIMORDIAOS
  </text>
</svg>`;
  }
}
