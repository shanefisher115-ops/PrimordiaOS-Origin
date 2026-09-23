import fs from "fs";
import { UIMetadata } from "./stitch_extract";

export interface PlatformRenderJob {
  jobId: string;
  platform: "ios" | "android" | "windows" | "promo" | "icons";
  targetDeviceOrFormat: string;
  width: number;
  height: number;
  aspectRatio: string;
  sourceScreen: {
    frameId: string;
    screenName: string;
    headline: string;
    subheadline: string;
  };
  outputCategory: string;
  outputFilename: string;
}

export interface PlatformAssetSpecs {
  specVersion: string;
  totalRenderJobs: number;
  jobs: PlatformRenderJob[];
  generatedAt: string;
}

export class McpApplyEngine {
  /**
   * Applies platform store specifications (App Store, Google Play, Windows Store) to UI metadata
   */
  public async applySpecs(uiMetadata: UIMetadata, mcpSpecPath: string): Promise<PlatformAssetSpecs> {
    console.log(`[McpApplyEngine] Applying MCP Store Specifications...`);

    let specData: any = {};
    if (fs.existsSync(mcpSpecPath)) {
      try {
        specData = JSON.parse(fs.readFileSync(mcpSpecPath, "utf-8"));
      } catch (err) {
        console.warn(`[McpApplyEngine] Error reading store spec at ${mcpSpecPath}, using built-in matrix.`);
      }
    }

    const jobs: PlatformRenderJob[] = [];
    const screens = uiMetadata.screens.filter(s => !s.screenName.toLowerCase().includes("icon"));
    const iconScreen = uiMetadata.screens.find(s => s.screenName.toLowerCase().includes("icon")) || uiMetadata.screens[0];

    // 1. iOS App Store Targets
    const iosTargets = [
      { name: "iPhone_6.7_ProMax", width: 1290, height: 2796 },
      { name: "iPhone_6.5_Plus", width: 1242, height: 2688 },
      { name: "iPhone_5.5_Classic", width: 1242, height: 2208 },
      { name: "iPad_12.9_Pro", width: 2048, height: 2732 }
    ];

    for (const target of iosTargets) {
      screens.forEach((screen, idx) => {
        jobs.push({
          jobId: `job_ios_${target.name}_${idx + 1}`,
          platform: "ios",
          targetDeviceOrFormat: target.name,
          width: target.width,
          height: target.height,
          aspectRatio: `${target.width}:${target.height}`,
          sourceScreen: {
            frameId: screen.frameId,
            screenName: screen.screenName,
            headline: screen.promotionalHeadline,
            subheadline: screen.promotionalSubheadline
          },
          outputCategory: "ios_screenshots",
          outputFilename: `ios_${target.name}_screen_${idx + 1}_${screen.screenName.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`
        });
      });
    }

    // 2. Android Google Play Targets
    const androidTargets = [
      { name: "Android_Phone_Standard", width: 1080, height: 2400 },
      { name: "Android_Tablet_7inch", width: 1200, height: 1920 },
      { name: "Android_Tablet_10inch", width: 1600, height: 2560 }
    ];

    for (const target of androidTargets) {
      screens.forEach((screen, idx) => {
        jobs.push({
          jobId: `job_android_${target.name}_${idx + 1}`,
          platform: "android",
          targetDeviceOrFormat: target.name,
          width: target.width,
          height: target.height,
          aspectRatio: `${target.width}:${target.height}`,
          sourceScreen: {
            frameId: screen.frameId,
            screenName: screen.screenName,
            headline: screen.promotionalHeadline,
            subheadline: screen.promotionalSubheadline
          },
          outputCategory: "android_screenshots",
          outputFilename: `android_${target.name}_screen_${idx + 1}_${screen.screenName.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`
        });
      });
    }

    // Google Play Feature Graphic
    jobs.push({
      jobId: "job_android_feature_graphic",
      platform: "android",
      targetDeviceOrFormat: "Google_Play_Feature_Graphic",
      width: 1024,
      height: 500,
      aspectRatio: "1024:500",
      sourceScreen: {
        frameId: screens[0].frameId,
        screenName: "Feature_Graphic_Hero",
        headline: "PRIMORDIAOS: SOVEREIGN CONTINUUM",
        subheadline: "Autonomous intelligence & high-friction cognitive loops"
      },
      outputCategory: "android_screenshots",
      outputFilename: "android_feature_graphic_1024x500.png"
    });

    // 3. Windows Store Targets
    jobs.push(
      {
        jobId: "job_windows_hero_4k",
        platform: "windows",
        targetDeviceOrFormat: "Desktop_Hero_4K",
        width: 3840,
        height: 2160,
        aspectRatio: "16:9",
        sourceScreen: {
          frameId: screens[screens.length - 1]?.frameId || screens[0].frameId,
          screenName: "Windows_Hero_4K",
          headline: "PRIMORDIA ORIGIN — PRODUCTION CONTINUUM",
          subheadline: "Realtime Unreal 5.8 & Multi-Realm Substrate Command Engine"
        },
        outputCategory: "windows_store_assets",
        outputFilename: "windows_hero_4k_3840x2160.png"
      },
      {
        jobId: "job_windows_1080p_screenshot",
        platform: "windows",
        targetDeviceOrFormat: "Desktop_1080p_Screenshot",
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
        sourceScreen: {
          frameId: screens[0].frameId,
          screenName: "Windows_1080p_Screenshot",
          headline: "Autonomous Operating Substrate",
          subheadline: "High-friction cognition and sovereign integrity filters"
        },
        outputCategory: "windows_store_assets",
        outputFilename: "windows_screenshot_1080p_1920x1080.png"
      },
      {
        jobId: "job_windows_tile_square",
        platform: "windows",
        targetDeviceOrFormat: "Tile_Square_Large",
        width: 600,
        height: 600,
        aspectRatio: "1:1",
        sourceScreen: {
          frameId: iconScreen.frameId,
          screenName: "Windows_Square_Tile",
          headline: "PrimordiaOS",
          subheadline: "Origin Substrate"
        },
        outputCategory: "windows_store_assets",
        outputFilename: "windows_tile_large_600x600.png"
      }
    );

    // 4. Promo & Affiliate Marketing
    jobs.push(
      {
        jobId: "job_promo_x_header",
        platform: "promo",
        targetDeviceOrFormat: "X_Twitter_Header",
        width: 1500,
        height: 500,
        aspectRatio: "3:1",
        sourceScreen: {
          frameId: screens[0].frameId,
          screenName: "X_Banner_Promo",
          headline: "PRIMORDIAOS // ORIGIN",
          subheadline: "The Mythic Multi-Realm Sovereign Operating System"
        },
        outputCategory: "promo_graphics",
        outputFilename: "promo_x_banner_1500x500.png"
      },
      {
        jobId: "job_promo_moneyplug_card",
        platform: "promo",
        targetDeviceOrFormat: "MoneyPlugHub_Referral_Card",
        width: 1200,
        height: 630,
        aspectRatio: "1.91:1",
        sourceScreen: {
          frameId: (screens[1] || screens[0]).frameId,
          screenName: "MoneyPlug_Affiliate_Card",
          headline: "MONEYPLUGHUB SYNDICATE",
          subheadline: "Autonomous loops & crypto payout vaults"
        },
        outputCategory: "promo_graphics",
        outputFilename: "promo_moneyplughub_card_1200x630.png"
      }
    );

    // 5. Realm Icons
    jobs.push(
      {
        jobId: "job_icon_appstore_master",
        platform: "icons",
        targetDeviceOrFormat: "AppStore_Master_Icon",
        width: 1024,
        height: 1024,
        aspectRatio: "1:1",
        sourceScreen: {
          frameId: iconScreen.frameId,
          screenName: "Master_App_Icon",
          headline: "PrimordiaOS Master Crest",
          subheadline: "Sigil of Sovereignty"
        },
        outputCategory: "realm_icons",
        outputFilename: "realm_icon_master_1024x1024.png"
      },
      {
        jobId: "job_icon_googleplay_hires",
        platform: "icons",
        targetDeviceOrFormat: "GooglePlay_HiRes_Icon",
        width: 512,
        height: 512,
        aspectRatio: "1:1",
        sourceScreen: {
          frameId: iconScreen.frameId,
          screenName: "GooglePlay_Icon",
          headline: "PrimordiaOS Android Icon",
          subheadline: "Sigil of Sovereignty"
        },
        outputCategory: "realm_icons",
        outputFilename: "realm_icon_playstore_512x512.png"
      }
    );

    const platformSpecs: PlatformAssetSpecs = {
      specVersion: specData.version || "1.0.0",
      totalRenderJobs: jobs.length,
      jobs,
      generatedAt: new Date().toISOString()
    };

    return platformSpecs;
  }
}
