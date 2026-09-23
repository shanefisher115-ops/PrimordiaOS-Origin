// PrimordiaOS Genesis Script (Safe Empty Files Version)
// Run with: node primordia-genesis.js

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log("[PrimordiaGenesis] Created folder:", dirPath);
  }
}

function createFile(filePath) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, "", "utf8");
  console.log("[PrimordiaGenesis] Created file:", filePath);
}

console.log("[PrimordiaGenesis] Starting in:", root);

// -------------------------
// Folder structure
// -------------------------

const folders = [
  "src",
  "src/skills",
  "src/channels",
  "src/utils",
  "src/telemetry",
  "dashboard",
  "dashboard/framer",
  "dashboard/framer/components",
  "dashboard/framer/styles",
  "tests"
];

folders.forEach(folder => ensureDir(path.join(root, folder)));

// -------------------------
// Files (empty)
// -------------------------

const files = [
  "README.md",
  "primordial.config.json",
  "package.json",
  "src/index.ts",
  "src/PrimordiaRouter.ts",
  "src/PrimordiaSkillOrchestrator.ts",
  "src/PrimordiaLogStream.ts",
  "src/PrimordiaChannelCore.ts",
  "src/skills/PrimordiaPostSkill.ts",
  "src/skills/PrimordiaCaptionSkill.ts",
  "src/skills/PrimordiaTagSkill.ts",
  "src/skills/PrimordiaScheduleSkill.ts",
  "src/channels/TikTokChannel.ts",
  "src/channels/InstagramChannel.ts",
  "src/channels/YouTubeChannel.ts",
  "src/utils/PrimordiaValidator.ts",
  "src/utils/PrimordiaNormalizer.ts",
  "src/utils/PrimordiaResponse.ts",
  "dashboard/framer/PrimordiaDashboard.framer",
  "dashboard/framer/components/SkillRegistryPanel.tsx",
  "dashboard/framer/components/RouterActivityPanel.tsx",
  "dashboard/framer/components/TelemetryPanel.tsx",
  "dashboard/framer/components/SchedulingPanel.tsx",
  "dashboard/framer/components/ChannelStatusPanel.tsx",
  "dashboard/framer/styles/cosmic.css",
  "dashboard/framer/styles/nebula-theme.css",
  "tests/router.test.ts",
  "tests/skills.test.ts",
  "tests/channels.test.ts",
  "tests/telemetry.test.ts"
];

files.forEach(file => createFile(path.join(root, file)));

console.log("[PrimordiaGenesis] Completed. All folders and empty files generated.");
