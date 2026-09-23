import { Download, FileCode2, PackageCheck, Rocket } from "lucide-react";
import { CosmicCard } from "@/components/CosmicCard";
import { CosmicPanel } from "@/components/CosmicPanel";
import { PlasmaButton } from "@/components/PlasmaButton";

const downloads = [
  {
    title: "PrimordiaOS Web Shell",
    description: "Production Next.js website package for Vercel deployment.",
    icon: PackageCheck
  },
  {
    title: "Cloud Feedback Utility",
    description: "Typed API helper for posting explicit site context to Cloud Run.",
    icon: FileCode2
  },
  {
    title: "Deployment Notes",
    description: "Domain, Vercel, and Cloud Run integration instructions in the project README.",
    icon: Rocket
  }
];

export default function DownloadsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <CosmicPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-aether">Downloads</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-white sm:text-6xl">Deployment assets live in this repository.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/64">
          The production site is source-driven. Install dependencies, run a local build, and deploy the same package to Vercel.
        </p>
        <div className="mt-8">
          <PlasmaButton href="/api-demo">Verify API Loop</PlasmaButton>
        </div>
      </CosmicPanel>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {downloads.map(({ title, description, icon: Icon }) => (
          <CosmicCard key={title}>
            <Download className="mb-4 h-5 w-5 text-white/38" />
            <Icon className="mb-5 h-8 w-8 text-ion" />
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-3 leading-7 text-white/64">{description}</p>
          </CosmicCard>
        ))}
      </div>
    </section>
  );
}
