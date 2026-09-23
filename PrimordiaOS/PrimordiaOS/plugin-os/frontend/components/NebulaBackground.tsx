"use client";

import { motion } from "framer-motion";
import { Starfield } from "./Starfield";

export function NebulaBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-void">
      <Starfield />
      <motion.div
        className="absolute -left-40 top-[-18rem] h-[44rem] w-[44rem] rounded-full bg-ion/20 blur-3xl"
        animate={{ x: [0, 80, 20, 0], y: [0, 30, 90, 0], scale: [1, 1.14, 0.96, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-18rem] top-20 h-[48rem] w-[48rem] rounded-full bg-plasma/20 blur-3xl"
        animate={{ x: [0, -90, -20, 0], y: [0, 70, -40, 0], scale: [1, 0.94, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-24rem] left-1/4 h-[50rem] w-[50rem] rounded-full bg-aether/10 blur-3xl"
        animate={{ rotate: [0, 25, -10, 0], scale: [1, 1.18, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="cosmic-noise absolute inset-0 opacity-80" />
    </div>
  );
}
