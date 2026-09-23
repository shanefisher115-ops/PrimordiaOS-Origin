"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicOrbit = CosmicOrbit;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const CosmicCore_1 = require("./CosmicCore");
function CosmicOrbit() {
    const nodes = [
        { label: "OS", icon: lucide_react_1.Cpu, className: "left-2 top-1/2 -translate-y-1/2" },
        { label: "Cloud", icon: lucide_react_1.Cloud, className: "right-0 top-16" },
        { label: "Action", icon: lucide_react_1.Sparkles, className: "bottom-8 left-1/2 -translate-x-1/2" }
    ];
    return (<div className="relative min-h-[24rem]">
      <CosmicCore_1.CosmicCore />
      <framer_motion_1.motion.div className="absolute inset-10 rounded-full border border-dashed border-white/15" animate={{ rotate: 360 }} transition={{ duration: 38, repeat: Infinity, ease: "linear" }}/>
      {nodes.map(({ label, icon: Icon, className }) => (<div key={label} className={`absolute ${className}`}>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-white shadow-cosmic backdrop-blur-xl">
            <Icon className="h-4 w-4 text-aether"/>
            {label}
          </div>
        </div>))}
    </div>);
}
