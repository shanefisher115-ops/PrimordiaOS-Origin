"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
const NebulaBackground_1 = require("@/components/NebulaBackground");
const CosmicNavbar_1 = require("@/components/CosmicNavbar");
const CosmicFooter_1 = require("@/components/CosmicFooter");
exports.metadata = {
    metadataBase: new URL("https://primordialorigin.com"),
    title: "Primordial Origin | PrimordiaOS",
    description: "The official production site for Primordial Origin and PrimordiaOS.",
    alternates: {
        canonical: "https://primordialorigin.com"
    },
    openGraph: {
        title: "Primordial Origin | PrimordiaOS",
        description: "The official production site for Primordial Origin and PrimordiaOS.",
        url: "https://primordialorigin.com",
        siteName: "Primordial Origin",
        type: "website"
    },
    twitter: {
        card: "summary_large_image",
        title: "Primordial Origin | PrimordiaOS",
        description: "The official production site for Primordial Origin and PrimordiaOS."
    }
};
function RootLayout({ children }) {
    return (<html lang="en">
      <body>
        <NebulaBackground_1.NebulaBackground />
        <CosmicNavbar_1.CosmicNavbar />
        <main className="relative z-10">{children}</main>
        <CosmicFooter_1.CosmicFooter />
      </body>
    </html>);
}
