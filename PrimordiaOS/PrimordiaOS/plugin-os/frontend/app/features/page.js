"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FeaturesPage;
const apps_1 = require("@/lib/apps");
const CosmicAppModule_1 = require("@/components/CosmicAppModule");
const CosmicDivider_1 = require("@/components/CosmicDivider");
const CosmicPanel_1 = require("@/components/CosmicPanel");
function FeaturesPage() {
    return (<section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <CosmicPanel_1.CosmicPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ion">Feature modules</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-white sm:text-6xl">Copilot artifacts arranged as a PrimordiaOS constellation.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/64">
          Each module launches a dedicated Copilot artifact in a new tab, while this site remains the official command hub for the Primordial Origin ecosystem.
        </p>
      </CosmicPanel_1.CosmicPanel>
      <CosmicDivider_1.CosmicDivider />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {apps_1.copilotApps.map((app, index) => (<CosmicAppModule_1.CosmicAppModule key={app.href} app={app} index={index}/>))}
      </div>
    </section>);
}
