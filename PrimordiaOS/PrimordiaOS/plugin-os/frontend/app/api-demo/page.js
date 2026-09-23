"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ApiDemoPage;
const CosmicDivider_1 = require("@/components/CosmicDivider");
const CosmicPanel_1 = require("@/components/CosmicPanel");
const ApiDemoClient_1 = require("./ApiDemoClient");
function ApiDemoPage() {
    return (<section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <CosmicPanel_1.CosmicPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-aether">Cloud Run integration</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-white sm:text-6xl">OS -&gt; Cloud -&gt; OS feedback loop.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/64">
          Submit a deliberately scoped context packet to the Primordia Cloud Run API and display the returned nextAction in the site interface.
        </p>
      </CosmicPanel_1.CosmicPanel>
      <CosmicDivider_1.CosmicDivider />
      <ApiDemoClient_1.ApiDemoClient />
    </section>);
}
