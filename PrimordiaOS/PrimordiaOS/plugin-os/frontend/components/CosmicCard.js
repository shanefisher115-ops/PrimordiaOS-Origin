"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicCard = CosmicCard;
const framer_motion_1 = require("framer-motion");
function CosmicCard({ children, className = "" }) {
    return (<framer_motion_1.motion.article whileHover={{ y: -4, scale: 1.01 }} transition={{ type: "spring", stiffness: 240, damping: 22 }} className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-cosmic backdrop-blur-xl ${className}`}>
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-y-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent"/>
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aether/70 to-transparent"/>
      <div className="relative z-10">{children}</div>
    </framer_motion_1.motion.article>);
}
