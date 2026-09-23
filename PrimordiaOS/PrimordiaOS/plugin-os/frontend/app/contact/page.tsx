import { Mail, MessageSquare, RadioTower } from "lucide-react";
import { CosmicCard } from "@/components/CosmicCard";
import { CosmicPanel } from "@/components/CosmicPanel";
import { PlasmaButton } from "@/components/PlasmaButton";

const contactChannels = [
  {
    title: "Partnerships",
    description: "Discuss PrimordiaOS modules, licensing, and creative systems.",
    icon: MessageSquare
  },
  {
    title: "Technical Support",
    description: "Report deployment, API, or integration behavior requiring attention.",
    icon: RadioTower
  },
  {
    title: "General Inbox",
    description: "Route all other official communications through the domain inbox.",
    icon: Mail
  }
];

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
      <CosmicPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ion">Contact</p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-6xl">Open a channel to Primordial Origin.</h1>
        <p className="mt-5 text-lg leading-8 text-white/64">
          Use the contact route as the public intake surface for partnerships, support, artifacts, deployments, and PrimordiaOS integration requests.
        </p>
        <div className="mt-8">
          <PlasmaButton href="mailto:hello@primordialorigin.com">Email Primordial Origin</PlasmaButton>
        </div>
      </CosmicPanel>
      <div className="grid gap-5">
        {contactChannels.map(({ title, description, icon: Icon }) => (
          <CosmicCard key={title}>
            <Icon className="mb-5 h-7 w-7 text-aether" />
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-white/64">{description}</p>
          </CosmicCard>
        ))}
      </div>
    </section>
  );
}
