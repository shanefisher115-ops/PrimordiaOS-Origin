"use client";

import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { CosmicCard } from "./CosmicCard";

type CosmicActionFeedProps = {
  nextAction?: string;
  log: string[];
};

export function CosmicActionFeed({ nextAction, log }: CosmicActionFeedProps) {
  return (
    <CosmicCard className="min-h-[18rem]">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-full bg-ion/15 p-2 text-ion">
          <Radio className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-white">OS -&gt; Cloud -&gt; OS Action Feed</h3>
          <p className="text-sm text-white/58">Live response from the Primordia Cloud Run API.</p>
        </div>
      </div>
      <motion.div
        key={nextAction || "idle"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-aether/20 bg-aether/10 p-4 text-aether shadow-glyph"
      >
        {nextAction || "Awaiting signal. Submit context to receive nextAction."}
      </motion.div>
      <div className="mt-5 space-y-2">
        {log.map((entry) => (
          <div key={entry} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/62">
            {entry}
          </div>
        ))}
      </div>
    </CosmicCard>
  );
}
