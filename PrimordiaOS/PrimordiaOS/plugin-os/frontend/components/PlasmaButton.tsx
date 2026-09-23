"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

type PlasmaButtonProps = {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function PlasmaButton({ href, children, onClick, type = "button", disabled }: PlasmaButtonProps) {
  const classes = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-plasma-sweep bg-[length:220%_220%] px-6 text-sm font-semibold text-white shadow-[0_0_36px_rgba(255,56,92,.28)] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60";
  const content = (
    <>
      {children}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </>
  );

  if (href) {
    return (
      <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-flex">
        <Link href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className={classes}>
          {content}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.button whileHover={{ scale: disabled ? 1 : 1.04 }} whileTap={{ scale: disabled ? 1 : 0.98 }} type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </motion.button>
  );
}
