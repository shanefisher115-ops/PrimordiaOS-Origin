"use client";

import { motion } from "framer-motion";

export function CosmicLoader() {
  return (
    <div className="flex items-center gap-3 text-sm text-white/70">
      <motion.span className="h-5 w-5 rounded-full border-2 border-ion border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      Opening cloud channel
    </div>
  );
}
