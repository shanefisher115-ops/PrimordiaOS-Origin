"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = ShellPage;
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const Shell_1 = require("@/components/Shell");
exports.metadata = {
    title: "PrimordiaOS Shell — PURL Runtime",
    description: "Interactive command shell powered by the Primordia Unified Runtime Loop (PURL). Execute intents, monitor engines, and inspect runtime diagnostics.",
};
function ShellPage() {
    return (<section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Back Navigation ────────────────────────────────── */}
      <div className="mb-6">
        <link_1.default href="/primordiaos" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
          <lucide_react_1.ArrowLeft className="h-4 w-4"/>
          Back to Execution Spec
        </link_1.default>
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aether">
          Runtime Interface
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          PrimordiaOS Shell
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/55">
          Live command interface powered by the Primordia Unified Runtime Loop.
          Execute intents, route to Overmind engines, and monitor telemetry in real time.
        </p>
      </div>

      {/* ── Shell Mount ────────────────────────────────────── */}
      <Shell_1.Shell />
    </section>);
}
