import type { Metadata } from "next";
import "./globals.css";
import { NebulaBackground } from "@/components/NebulaBackground";
import { CosmicNavbar } from "@/components/CosmicNavbar";
import { CosmicFooter } from "@/components/CosmicFooter";

export const metadata: Metadata = {
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NebulaBackground />
        <CosmicNavbar />
        <main className="relative z-10">{children}</main>
        <CosmicFooter />
      </body>
    </html>
  );
}
