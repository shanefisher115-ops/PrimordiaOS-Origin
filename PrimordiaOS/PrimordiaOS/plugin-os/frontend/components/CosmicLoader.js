"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicLoader = CosmicLoader;
const framer_motion_1 = require("framer-motion");
function CosmicLoader() {
    return (<div className="flex items-center gap-3 text-sm text-white/70">
      <framer_motion_1.motion.span className="h-5 w-5 rounded-full border-2 border-ion border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}/>
      Opening cloud channel
    </div>);
}
