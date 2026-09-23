"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicActionFeed = CosmicActionFeed;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const CosmicCard_1 = require("./CosmicCard");
function CosmicActionFeed({ nextAction, log }) {
    return (<CosmicCard_1.CosmicCard className="min-h-[18rem]">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-full bg-ion/15 p-2 text-ion">
          <lucide_react_1.Radio className="h-5 w-5"/>
        </span>
        <div>
          <h3 className="text-lg font-semibold text-white">OS -&gt; Cloud -&gt; OS Action Feed</h3>
          <p className="text-sm text-white/58">Live response from the Primordia Cloud Run API.</p>
        </div>
      </div>
      <framer_motion_1.motion.div key={nextAction || "idle"} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-aether/20 bg-aether/10 p-4 text-aether shadow-glyph">
        {nextAction || "Awaiting signal. Submit context to receive nextAction."}
      </framer_motion_1.motion.div>
      <div className="mt-5 space-y-2">
        {log.map((entry) => (<div key={entry} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/62">
            {entry}
          </div>))}
      </div>
    </CosmicCard_1.CosmicCard>);
}
