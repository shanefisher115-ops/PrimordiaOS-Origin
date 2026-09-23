import { CosmicDivider } from "@/components/CosmicDivider";
import { CosmicPanel } from "@/components/CosmicPanel";
import { ApiDemoClient } from "./ApiDemoClient";

export default function ApiDemoPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <CosmicPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-aether">Cloud Run integration</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-white sm:text-6xl">OS -&gt; Cloud -&gt; OS feedback loop.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/64">
          Submit a deliberately scoped context packet to the Primordia Cloud Run API and display the returned nextAction in the site interface.
        </p>
      </CosmicPanel>
      <CosmicDivider />
      <ApiDemoClient />
    </section>
  );
}
