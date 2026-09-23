"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicHero = CosmicHero;
const framer_motion_1 = require("framer-motion");
const CosmicOrbit_1 = require("./CosmicOrbit");
const PlasmaButton_1 = require("./PlasmaButton");
function CosmicHero() {
    return (<section className="relative mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
      <framer_motion_1.motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <p className="mb-5 inline-flex rounded-full border border-aether/20 bg-aether/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-aether">
          PrimordiaOS interface layer
        </p>
        <h1 className="text-balance text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
          Primordial Origin
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
          The official cosmic operating surface for PrimordiaOS: a mythic command site where local context, cloud intelligence, and next actions loop back into one visible system.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <PlasmaButton_1.PlasmaButton href="/api-demo">Run Feedback Loop</PlasmaButton_1.PlasmaButton>
          <PlasmaButton_1.PlasmaButton href="/features">Explore Modules</PlasmaButton_1.PlasmaButton>
        </div>
      </framer_motion_1.motion.div>
      <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }}>
        <CosmicOrbit_1.CosmicOrbit />
      </framer_motion_1.motion.div>
    </section>);
}
