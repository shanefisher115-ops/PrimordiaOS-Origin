import Link from "next/link";
import { MythicGlyph } from "./MythicGlyph";

export function CosmicFooter() {
  return (
    <footer className="relative mt-20 border-t border-white/10 bg-black/20">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ion/10 to-transparent" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-white/58 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <MythicGlyph className="h-8 w-8" />
          <span>Primordial Origin. Mythic interface systems for living software.</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/api-demo" className="hover:text-white">API Demo</Link>
          <Link href="/downloads" className="hover:text-white">Downloads</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
