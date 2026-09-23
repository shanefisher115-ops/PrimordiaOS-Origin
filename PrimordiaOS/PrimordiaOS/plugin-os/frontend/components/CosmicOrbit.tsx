"use client";

import { motion } from "framer-motion";
import { Cloud, Cpu, Sparkles } from "lucide-react";
import { CosmicCore } from "./CosmicCore";

export function CosmicOrbit() {
  const nodes = [
    { label: "OS", icon: Cpu, className: "left-2 top-1/2 -translate-y-1/2" },
    { label: "Cloud", icon: Cloud, className: "right-0 top-16" },
    { label: "Action", icon: Sparkles, className: "bottom-8 left-1/2 -translate-x-1/2" }
  ];

  return (
    <div className="relative min-h-[24rem]">
      <CosmicCore />
      <motion.div className="absolute inset-10 rounded-full border border-dashed border-white/15" animate={{ rotate: 360 }} transition={{ duration: 38, repeat: Infinity, ease: "linear" }} />
      {nodes.map(({ label, icon: Icon, className }) => (
        <div key={label} className={`absolute ${className}`}>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-white shadow-cosmic backdrop-blur-xl">
            <Icon className="h-4 w-4 text-aether" />
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
