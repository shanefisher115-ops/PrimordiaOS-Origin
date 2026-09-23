import { ExternalLink } from "lucide-react";
import { CopilotApp } from "@/lib/apps";
import { CosmicCard } from "./CosmicCard";
import { PlasmaButton } from "./PlasmaButton";

type CosmicAppModuleProps = {
  app: CopilotApp;
  index: number;
};

export function CosmicAppModule({ app, index }: CosmicAppModuleProps) {
  return (
    <CosmicCard>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ion/25 bg-ion/10 text-sm font-bold text-ion">
          {String(index + 1).padStart(2, "0")}
        </div>
        <ExternalLink className="h-5 w-5 text-white/40" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold text-white">{app.title}</h3>
      <p className="mt-3 min-h-20 text-sm leading-6 text-white/64">{app.description}</p>
      <div className="mt-6">
        <PlasmaButton href={app.href}>Launch App</PlasmaButton>
      </div>
    </CosmicCard>
  );
}
