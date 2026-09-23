import { PropsWithChildren } from "react";

type CosmicPanelProps = PropsWithChildren<{
  className?: string;
}>;

export function CosmicPanel({ children, className = "" }: CosmicPanelProps) {
  return (
    <section className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6 shadow-cosmic backdrop-blur-xl ${className}`}>
      <div className="absolute inset-0 bg-nebula-radial opacity-70" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ion/80 to-transparent" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
