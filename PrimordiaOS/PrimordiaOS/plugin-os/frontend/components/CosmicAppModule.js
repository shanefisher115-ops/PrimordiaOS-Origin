"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmicAppModule = CosmicAppModule;
const lucide_react_1 = require("lucide-react");
const CosmicCard_1 = require("./CosmicCard");
const PlasmaButton_1 = require("./PlasmaButton");
function CosmicAppModule({ app, index }) {
    return (<CosmicCard_1.CosmicCard>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ion/25 bg-ion/10 text-sm font-bold text-ion">
          {String(index + 1).padStart(2, "0")}
        </div>
        <lucide_react_1.ExternalLink className="h-5 w-5 text-white/40" aria-hidden="true"/>
      </div>
      <h3 className="text-xl font-semibold text-white">{app.title}</h3>
      <p className="mt-3 min-h-20 text-sm leading-6 text-white/64">{app.description}</p>
      <div className="mt-6">
        <PlasmaButton_1.PlasmaButton href={app.href}>Launch App</PlasmaButton_1.PlasmaButton>
      </div>
    </CosmicCard_1.CosmicCard>);
}
