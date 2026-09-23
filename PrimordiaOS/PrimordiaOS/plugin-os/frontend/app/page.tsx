const referralLinks = [
  {
    label: "Partner link",
    href: "#",
    name: "Primordial Origin",
    status: "Approved"
  },
  {
    label: "Affiliate link",
    href: "#",
    name: "Signal Forge",
    status: "Approved"
  },
  {
    label: "Sponsor link",
    href: "#",
    name: "Aether Relay",
    status: "Pending"
  }
];

const figmaFeed = [
  "Set FIGMA_TOKEN and FIGMA_FILE_KEY in Vercel to enable live Figma data.",
  "Once connected, the dashboard will surface frame names, owners, and update time.",
  "Fresh design changes can be promoted into the approval workflow automatically."
];

export default function HomePage() {
  return (
    <section className="mx-auto min-h-screen max-w-[1180px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      <div className="rounded-[2rem] border border-white/8 bg-[#0d1016]/95 px-5 py-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_36px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#25f0d0]">Production</p>
              <h1 className="mt-2 text-[3.4rem] font-light leading-[0.9] tracking-[-0.06em] text-white sm:text-[4.4rem]">
                Plugin OS
              </h1>
              <p className="mt-3 max-w-2xl text-[1.05rem] leading-7 text-white/76 sm:text-[1.12rem]">
                Live referral hub for approved partner links, Figma-backed data, and production readiness.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
                Vercel Live
              </span>
              <span className="rounded-full border border-amber-600/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300">
                Secrets Required
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.98fr]">
            <div className="rounded-[1.35rem] border border-white/10 bg-[#151923] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#25f0d0]">Revenue</p>
                  <h2 className="mt-3 text-2xl font-medium text-white">Referral Links</h2>
                </div>
                <span className="rounded-full border border-amber-700/60 bg-amber-600/10 px-4 py-2 text-sm font-medium text-amber-300">
                  Setup
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-[#2f3b4c] bg-[#1a1f2a] px-5 py-5 text-[1.05rem] leading-7 text-[#aab8cc]">
                <p>No approved referral links are configured yet.</p>
                <p className="text-white/80">Add REFERRAL_LINKS_JSON in Vercel to activate earning links.</p>
              </div>

              <div className="mt-5 space-y-3">
                {referralLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white/78 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div>
                      <div className="font-medium text-white">{link.name}</div>
                      <div className="text-white/48">{link.label}</div>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#f0a74a]">
                      {link.status}
                    </span>
                  </a>
                ))}
              </div>

              <p className="mt-4 text-sm text-[#90a1b6]">Some links may be sponsored or referral links.</p>
            </div>

            <div className="grid gap-5">
              <div className="rounded-[1.35rem] border border-white/10 bg-[#151923] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#25f0d0]">PrimordiaOS</p>
                <h2 className="mt-3 text-2xl font-medium text-white">Execution layer spec</h2>
                <p className="mt-4 leading-7 text-white/76">
                  A formal map of the Codex, registry, shell, kernel, cloud edge, public portal, and Unreal world layer.
                </p>
                <a
                  href="/primordiaos"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/15 hover:bg-white/[0.08]"
                >
                  Open the spec
                  <span aria-hidden="true">→</span>
                </a>
              </div>

              <div className="rounded-[1.35rem] border border-white/10 bg-[#151923] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#25f0d0]">Live Data</p>
                    <h2 className="mt-3 text-2xl font-medium text-white">Figma Feed</h2>
                  </div>
                  <span className="rounded-full border border-amber-700/60 bg-amber-600/10 px-4 py-2 text-sm font-medium text-amber-300">
                    Setup
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-[#2f3b4c] bg-[#1a1f2a] px-5 py-5 text-[1.05rem] leading-7 text-[#aab8cc]">
                  <p>Set FIGMA_TOKEN and FIGMA_FILE_KEY in Vercel to enable live Figma data.</p>
                </div>

                <div className="mt-5 space-y-3">
                  {figmaFeed.map((line) => (
                    <div key={line} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white/74">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-white/10 bg-[#151923] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#25f0d0]">Money Flow</p>
                    <h2 className="mt-3 text-2xl font-medium text-white">Readiness</h2>
                  </div>
                  <span className="rounded-full border border-amber-700/60 bg-amber-600/10 px-4 py-2 text-sm font-medium text-amber-300">
                    Guarded
                  </span>
                </div>

                <div className="mt-6 space-y-5 text-[1.05rem] leading-7 text-white/86">
                  <p>
                    <span className="font-semibold text-white">Referral revenue:</span> active after real approved URLs are added.
                  </p>
                  <p>
                    <span className="font-semibold text-white">Live Figma data:</span> active after fresh Figma env vars are added.
                  </p>
                  <p>
                    <span className="font-semibold text-white">Payments:</span> blocked until a production provider is connected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
