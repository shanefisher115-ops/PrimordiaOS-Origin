"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicCore = CosmicCore;
const framer_motion_1 = require("framer-motion");
const MythicGlyph_1 = require("./MythicGlyph");
function CosmicCore() {
    return (<framer_motion_1.motion.div className="relative mx-auto flex aspect-square w-full max-w-[22rem] items-center justify-center rounded-full" animate={{ filter: ["drop-shadow(0 0 20px rgba(39,216,255,.35))", "drop-shadow(0 0 45px rgba(255,56,92,.35))", "drop-shadow(0 0 20px rgba(39,216,255,.35))"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
      <framer_motion_1.motion.div className="absolute inset-4 rounded-full border border-ion/30" animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}/>
      <framer_motion_1.motion.div className="absolute inset-12 rounded-full border border-aether/30" animate={{ rotate: -360 }} transition={{ duration: 17, repeat: Infinity, ease: "linear" }}/>
      <div className="absolute inset-20 rounded-full bg-plasma/20 blur-2xl"/>
      <MythicGlyph_1.MythicGlyph className="relative h-40 w-40 drop-shadow-[0_0_24px_rgba(248,215,123,.35)]"/>
    </framer_motion_1.motion.div>);
}
