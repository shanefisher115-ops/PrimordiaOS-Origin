"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { MythicGlyph } from "./MythicGlyph";

const links = [
  { href: "/", label: "Home" },
  { href: "/primordiaos", label: "PrimordiaOS" },
  { href: "/features", label: "Features" },
  { href: "/downloads", label: "Downloads" },
  { href: "/api-demo", label: "API Demo" },
  { href: "/contact", label: "Contact" }
];

export function CosmicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-void/70 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 6, repeat: Infinity }} className="flex h-10 w-10 items-center justify-center rounded-full border border-aether/30 bg-white/5 shadow-glyph">
            <MythicGlyph className="h-7 w-7" />
          </motion.span>
          <span className="text-sm font-semibold uppercase tracking-[0.26em] text-white">Primordial Origin</span>
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full px-4 py-2 text-sm text-white/68 transition hover:bg-white/10 hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
        <button className="rounded-full border border-white/10 bg-white/5 p-3 text-white lg:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
      </nav>
    </header>
  );
}
