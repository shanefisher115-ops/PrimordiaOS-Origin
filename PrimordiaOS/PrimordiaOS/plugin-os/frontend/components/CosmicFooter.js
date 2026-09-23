"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicFooter = CosmicFooter;
const link_1 = __importDefault(require("next/link"));
const MythicGlyph_1 = require("./MythicGlyph");
function CosmicFooter() {
    return (<footer className="relative mt-20 border-t border-white/10 bg-black/20">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ion/10 to-transparent"/>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-white/58 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <MythicGlyph_1.MythicGlyph className="h-8 w-8"/>
          <span>Primordial Origin. Mythic interface systems for living software.</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <link_1.default href="/api-demo" className="hover:text-white">API Demo</link_1.default>
          <link_1.default href="/downloads" className="hover:text-white">Downloads</link_1.default>
          <link_1.default href="/contact" className="hover:text-white">Contact</link_1.default>
        </div>
      </div>
    </footer>);
}
