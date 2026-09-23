"use client";

import { motion } from "framer-motion";
import { MythicGlyph } from "./MythicGlyph";

export function CosmicCore() {
  return (
    <motion.div
      className="relative mx-auto flex aspect-square w-full max-w-[22rem] items-center justify-center rounded-full"
      animate={{ filter: ["drop-shadow(0 0 20px rgba(39,216,255,.35))", "drop-shadow(0 0 45px rgba(255,56,92,.35))", "drop-shadow(0 0 20px rgba(39,216,255,.35))"] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div className="absolute inset-4 rounded-full border border-ion/30" animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute inset-12 rounded-full border border-aether/30" animate={{ rotate: -360 }} transition={{ duration: 17, repeat: Infinity, ease: "linear" }} />
      <div className="absolute inset-20 rounded-full bg-plasma/20 blur-2xl" />
      <MythicGlyph className="relative h-40 w-40 drop-shadow-[0_0_24px_rgba(248,215,123,.35)]" />
    </motion.div>
  );
}
