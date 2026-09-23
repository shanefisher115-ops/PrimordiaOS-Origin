"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ContactPage;
const lucide_react_1 = require("lucide-react");
const CosmicCard_1 = require("@/components/CosmicCard");
const CosmicPanel_1 = require("@/components/CosmicPanel");
const PlasmaButton_1 = require("@/components/PlasmaButton");
const contactChannels = [
    {
        title: "Partnerships",
        description: "Discuss PrimordiaOS modules, licensing, and creative systems.",
        icon: lucide_react_1.MessageSquare
    },
    {
        title: "Technical Support",
        description: "Report deployment, API, or integration behavior requiring attention.",
        icon: lucide_react_1.RadioTower
    },
    {
        title: "General Inbox",
        description: "Route all other official communications through the domain inbox.",
        icon: lucide_react_1.Mail
    }
];
function ContactPage() {
    return (<section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
      <CosmicPanel_1.CosmicPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ion">Contact</p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-6xl">Open a channel to Primordial Origin.</h1>
        <p className="mt-5 text-lg leading-8 text-white/64">
          Use the contact route as the public intake surface for partnerships, support, artifacts, deployments, and PrimordiaOS integration requests.
        </p>
        <div className="mt-8">
          <PlasmaButton_1.PlasmaButton href="mailto:hello@primordialorigin.com">Email Primordial Origin</PlasmaButton_1.PlasmaButton>
        </div>
      </CosmicPanel_1.CosmicPanel>
      <div className="grid gap-5">
        {contactChannels.map(({ title, description, icon: Icon }) => (<CosmicCard_1.CosmicCard key={title}>
            <Icon className="mb-5 h-7 w-7 text-aether"/>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-white/64">{description}</p>
          </CosmicCard_1.CosmicCard>))}
      </div>
    </section>);
}
