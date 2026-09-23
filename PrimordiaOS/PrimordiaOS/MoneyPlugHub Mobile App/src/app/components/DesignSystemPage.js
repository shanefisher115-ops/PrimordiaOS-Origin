import { useState } from "react";
import { X, ChevronRight, ChevronDown, Copy, Check } from "lucide-react";
import { NeonProgressBar } from "./NeonProgressBar";
// ── Tokens ───────────────────────────────────────────────────────────────────
const FOUNDATIONS_COLORS = [
    { name: "black-900", token: "bg-primary", hex: "#050608", label: "Primary BG" },
    { name: "black-800", token: "bg-card", hex: "#0B0F14", label: "Card BG" },
    { name: "green-neon", token: "accent-primary", hex: "#39FF14", label: "Neon Accent" },
    { name: "green-soft", token: "accent-secondary", hex: "#2ECC71", label: "Soft Accent" },
    { name: "white", token: "text-primary", hex: "#FFFFFF", label: "Text Primary" },
    { name: "gray-400", token: "text-secondary", hex: "#A0A8B8", label: "Text Secondary" },
    { name: "gray-700", token: "border-subtle", hex: "#1A1F2A", label: "Border" },
    { name: "green-success", token: "success", hex: "#22C55E", label: "Success" },
];
const PRIMITIVE_TOKENS = [
    { group: "Color", name: "primitive.color.black-900", value: "#050608" },
    { group: "Color", name: "primitive.color.black-800", value: "#0B0F14" },
    { group: "Color", name: "primitive.color.green-neon", value: "#39FF14" },
    { group: "Color", name: "primitive.color.green-soft", value: "#2ECC71" },
    { group: "Color", name: "primitive.color.white", value: "#FFFFFF" },
    { group: "Color", name: "primitive.color.gray-400", value: "#A0A8B8" },
    { group: "Color", name: "primitive.color.gray-700", value: "#1A1F2A" },
    { group: "Color", name: "primitive.color.green-success", value: "#22C55E" },
    { group: "Radius", name: "primitive.radius.xs", value: "4px" },
    { group: "Radius", name: "primitive.radius.sm", value: "8px" },
    { group: "Radius", name: "primitive.radius.md", value: "12px" },
    { group: "Radius", name: "primitive.radius.lg", value: "16px" },
    { group: "Radius", name: "primitive.radius.xl", value: "24px" },
    { group: "Radius", name: "primitive.radius.full", value: "999px" },
    { group: "Spacing", name: "primitive.spacing.xxs", value: "4px" },
    { group: "Spacing", name: "primitive.spacing.xs", value: "8px" },
    { group: "Spacing", name: "primitive.spacing.sm", value: "12px" },
    { group: "Spacing", name: "primitive.spacing.md", value: "16px" },
    { group: "Spacing", name: "primitive.spacing.lg", value: "24px" },
    { group: "Spacing", name: "primitive.spacing.xl", value: "32px" },
    { group: "Font Size", name: "primitive.font-size.xs", value: "12px" },
    { group: "Font Size", name: "primitive.font-size.sm", value: "14px" },
    { group: "Font Size", name: "primitive.font-size.md", value: "16px" },
    { group: "Font Size", name: "primitive.font-size.lg", value: "18px" },
    { group: "Font Size", name: "primitive.font-size.xl", value: "24px" },
    { group: "Font Size", name: "primitive.font-size.xxl", value: "28px" },
];
const SEMANTIC_TOKENS = [
    { name: "semantic.color.background-primary", value: "#050608", alias: "primitive.color.black-900" },
    { name: "semantic.color.background-card", value: "#0B0F14", alias: "primitive.color.black-800" },
    { name: "semantic.color.text-primary", value: "#FFFFFF", alias: "primitive.color.white" },
    { name: "semantic.color.text-secondary", value: "#A0A8B8", alias: "primitive.color.gray-400" },
    { name: "semantic.color.border-subtle", value: "#1A1F2A", alias: "primitive.color.gray-700" },
    { name: "semantic.color.accent-primary", value: "#39FF14", alias: "primitive.color.green-neon" },
    { name: "semantic.color.accent-secondary", value: "#2ECC71", alias: "primitive.color.green-soft" },
    { name: "semantic.color.success", value: "#22C55E", alias: "primitive.color.green-success" },
    { name: "semantic.radius.card", value: "16px", alias: "primitive.radius.lg" },
    { name: "semantic.radius.button", value: "999px", alias: "primitive.radius.full" },
    { name: "semantic.radius.input", value: "12px", alias: "primitive.radius.md" },
    { name: "semantic.spacing.layout-padding", value: "16px", alias: "primitive.spacing.md" },
    { name: "semantic.spacing.section-gap", value: "24px", alias: "primitive.spacing.lg" },
    { name: "semantic.spacing.stack-gap", value: "12px", alias: "primitive.spacing.sm" },
];
const COMPONENT_TOKENS = [
    { component: "button-primary", prop: "background", value: "semantic.color.accent-primary" },
    { component: "button-primary", prop: "text-color", value: "semantic.color.text-primary" },
    { component: "button-primary", prop: "radius", value: "semantic.radius.button" },
    { component: "button-primary", prop: "shadow", value: "semantic.shadow.glow" },
    { component: "button-secondary", prop: "border-color", value: "semantic.color.accent-primary" },
    { component: "button-secondary", prop: "text-color", value: "semantic.color.accent-primary" },
    { component: "button-secondary", prop: "radius", value: "semantic.radius.button" },
    { component: "card-primary", prop: "background", value: "semantic.color.background-card" },
    { component: "card-primary", prop: "radius", value: "semantic.radius.card" },
    { component: "card-primary", prop: "shadow", value: "semantic.shadow.card" },
    { component: "card-primary", prop: "border-color", value: "semantic.color.border-subtle" },
    { component: "progress-bar", prop: "track-color", value: "semantic.color.border-subtle" },
    { component: "progress-bar", prop: "fill-color", value: "semantic.color.accent-primary" },
    { component: "badge", prop: "background", value: "semantic.color.background-card" },
    { component: "badge", prop: "icon-color", value: "semantic.color.accent-primary" },
];
const NAV = [
    { group: "Foundations", items: [
            { id: "foundations/colors", label: "Colors" },
            { id: "foundations/typography", label: "Typography" },
            { id: "foundations/spacing", label: "Spacing" },
            { id: "foundations/radius", label: "Radius" },
            { id: "foundations/shadows", label: "Shadows" },
            { id: "foundations/motion", label: "Motion" },
        ] },
    { group: "Tokens", items: [
            { id: "tokens/primitive", label: "Primitive" },
            { id: "tokens/semantic", label: "Semantic" },
            { id: "tokens/component", label: "Component" },
        ] },
    { group: "Components", items: [
            { id: "components/buttons", label: "Buttons" },
            { id: "components/cards", label: "Cards" },
            { id: "components/inputs", label: "Inputs" },
            { id: "components/tabs", label: "Tabs" },
            { id: "components/navigation", label: "Navigation" },
            { id: "components/progress", label: "Progress Bars" },
            { id: "components/badges", label: "Badges" },
            { id: "components/tables", label: "Tables" },
            { id: "components/modals", label: "Modals" },
        ] },
    { group: "Patterns", items: [
            { id: "patterns/dashboard", label: "Dashboard Layout" },
            { id: "patterns/referral", label: "Referral Engine" },
            { id: "patterns/xp", label: "XP System" },
            { id: "patterns/quests", label: "Quests" },
            { id: "patterns/leaderboard", label: "Leaderboards" },
            { id: "patterns/ai", label: "AI Command Center" },
        ] },
    { group: "Code", items: [
            { id: "code/tailwind", label: "Tailwind" },
            { id: "code/react", label: "React" },
            { id: "code/ios", label: "iOS" },
            { id: "code/android", label: "Android" },
            { id: "code/tokens", label: "Web Tokens" },
        ] },
];
// ── Small shared components ──────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
    return (<div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--dt-border-subtle)" }}>
      <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xxl)", fontWeight: 700, color: "var(--dt-text-primary)", letterSpacing: "-0.03em" }}>
        {title}
      </h1>
      {sub && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-secondary)", marginTop: 6 }}>{sub}</p>}
    </div>);
}
function Label({ children }) {
    return (<div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 600, color: "var(--dt-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
      {children}
    </div>);
}
function CodeBlock({ code, lang = "css" }) {
    const [copied, setCopied] = useState(false);
    return (<div className="rounded-card relative" style={{ background: "#020304", border: "1px solid var(--dt-border-subtle)" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid var(--dt-border-subtle)" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>{lang}</span>
        <button onClick={() => { navigator.clipboard.writeText(code).catch(() => { }); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1 px-2 py-1 rounded-input transition-all" style={{ background: "var(--dt-border-subtle)" }}>
          {copied ? <Check size={11} color="var(--dt-accent-primary)"/> : <Copy size={11} color="var(--dt-text-secondary)"/>}
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: copied ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)" }}>
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)", lineHeight: 1.7, margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>);
}
function TokenRow({ name, value, alias, swatch }) {
    return (<tr style={{ borderBottom: "1px solid var(--dt-border-subtle)" }}>
      <td className="py-3 pr-4">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)" }}>{name}</span>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          {swatch && <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: value, border: "1px solid rgba(255,255,255,0.1)" }}/>}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-primary)" }}>{value}</span>
        </div>
      </td>
      {alias && (<td className="py-3">
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>→ {alias}</span>
        </td>)}
    </tr>);
}
// ── Section renderers ────────────────────────────────────────────────────────
function FoundationsColors() {
    return (<>
      <SectionHeader title="Colors" sub="The complete color palette powering MoneyPlugHub OS. Derived from a deep black canvas with a single neon green accent."/>
      <Label>Color Ramp</Label>
      <div className="grid grid-cols-2 gap-3 mb-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {FOUNDATIONS_COLORS.map((c) => (<div key={c.name} className="rounded-card overflow-hidden" style={{ border: "1px solid var(--dt-border-subtle)" }}>
            <div className="h-20" style={{ background: c.hex }}/>
            <div className="p-3" style={{ background: "var(--dt-bg-card)" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--dt-text-primary)" }}>{c.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>{c.hex}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)", marginTop: 2 }}>bg-{c.token}</div>
            </div>
          </div>))}
      </div>
      <Label>Neon Glow Effects</Label>
      <div className="flex gap-4 flex-wrap">
        {[
            { label: "Glow", shadow: "0px 0px 24px rgba(57,255,20,0.35)" },
            { label: "Card Shadow", shadow: "0px 12px 32px rgba(0,255,120,0.18)" },
            { label: "Soft Glow", shadow: "0 0 12px rgba(57,255,20,0.5)" },
        ].map(({ label, shadow }) => (<div key={label} className="rounded-card p-6 flex items-center justify-center" style={{ background: "var(--dt-bg-card)", border: "1px solid rgba(57,255,20,0.3)", boxShadow: shadow, minWidth: 140 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)" }}>{label}</span>
          </div>))}
      </div>
    </>);
}
function FoundationsTypography() {
    const scale = [
        { name: "display", size: "28px", weight: 700, sample: "MoneyPlugHub OS" },
        { name: "title", size: "24px", weight: 700, sample: "Leaderboard Rank #1" },
        { name: "section", size: "18px", weight: 600, sample: "Quest Progress" },
        { name: "body", size: "14px", weight: 400, sample: "Refer friends and earn XP for every active signup." },
        { name: "caption", size: "12px", weight: 400, sample: "Today · 9:14 AM · +100 XP" },
    ];
    return (<>
      <SectionHeader title="Typography" sub="JetBrains Mono for display, data, and labels. Inter for body copy and descriptions."/>
      <div className="flex flex-col gap-6 mb-10">
        {scale.map(({ name, size, weight, sample }) => (<div key={name} className="flex items-start gap-6 py-5" style={{ borderBottom: "1px solid var(--dt-border-subtle)" }}>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)", fontWeight: 600 }}>text-{name}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 4 }}>{size} / {weight}</div>
            </div>
            <div style={{ fontFamily: name === "body" || name === "caption" ? "'Inter', sans-serif" : "'JetBrains Mono', monospace", fontSize: size, fontWeight: weight, color: "var(--dt-text-primary)", lineHeight: 1.3 }}>
              {sample}
            </div>
          </div>))}
      </div>
      <Label>Font Families</Label>
      <div className="grid grid-cols-2 gap-4">
        {[
            { family: "'JetBrains Mono', monospace", role: "Display / Data / Labels", sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ\n0123456789 /optimize referrals" },
            { family: "'Inter', sans-serif", role: "Body / Descriptions / UI", sample: "Refer friends and earn XP rewards for every active signup to MoneyPlugHub OS." },
        ].map(({ family, role, sample }) => (<div key={role} className="rounded-card p-5" style={{ background: "var(--dt-bg-card)", border: "1px solid var(--dt-border-subtle)" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginBottom: 12 }}>{role}</div>
            <div style={{ fontFamily: family, fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-primary)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{sample}</div>
          </div>))}
      </div>
    </>);
}
function FoundationsSpacing() {
    const steps = [
        { name: "xxs", value: "4px", px: 4 },
        { name: "xs", value: "8px", px: 8 },
        { name: "sm", value: "12px", px: 12 },
        { name: "md", value: "16px", px: 16 },
        { name: "lg", value: "24px", px: 24 },
        { name: "xl", value: "32px", px: 32 },
    ];
    return (<>
      <SectionHeader title="Spacing" sub="An 8px-base spacing scale. Semantic aliases (layout, section, stack) map to the most common layout needs."/>
      <div className="flex flex-col gap-4 mb-10">
        {steps.map(({ name, value, px }) => (<div key={name} className="flex items-center gap-6">
            <div style={{ minWidth: 120, fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)" }}>
              spacing-{name}
            </div>
            <div className="flex items-center gap-4">
              <div style={{ width: px, height: 24, background: "rgba(57,255,20,0.3)", borderRadius: 3, border: "1px solid rgba(57,255,20,0.5)", flexShrink: 0 }}/>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>{value}</span>
            </div>
          </div>))}
      </div>
      <Label>Semantic Aliases</Label>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
            { alias: "layout", maps: "spacing-md", use: "Screen padding, card padding" },
            { alias: "section", maps: "spacing-lg", use: "Between major sections" },
            { alias: "stack", maps: "spacing-sm", use: "Between stacked items" },
        ].map(({ alias, maps, use }) => (<div key={alias} className="rounded-card p-4" style={{ background: "var(--dt-bg-card)", border: "1px solid var(--dt-border-subtle)" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: "var(--dt-accent-primary)" }}>p-{alias}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 4 }}>→ {maps}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>{use}</div>
          </div>))}
      </div>
    </>);
}
function FoundationsRadius() {
    const steps = [
        { name: "xs", value: "4px", px: 4 },
        { name: "sm", value: "8px", px: 8 },
        { name: "md", value: "12px", px: 12 },
        { name: "lg", value: "16px", px: 16 },
        { name: "xl", value: "24px", px: 24 },
        { name: "full", value: "999px", px: 999 },
    ];
    return (<>
      <SectionHeader title="Radius" sub="Border radius scale with semantic aliases for cards, buttons, and inputs."/>
      <div className="flex flex-wrap gap-6 mb-10">
        {steps.map(({ name, value, px }) => (<div key={name} className="flex flex-col items-center gap-3">
            <div style={{ width: 72, height: 72, background: "var(--dt-bg-card)", border: "2px solid var(--dt-accent-primary)", borderRadius: Math.min(px, 36) }}/>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)", textAlign: "center" }}>radius-{name}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>{value}</div>
          </div>))}
      </div>
      <Label>Semantic Aliases</Label>
      <div className="flex gap-4 flex-wrap">
        {[
            { alias: "card", maps: "radius-lg", usage: "rounded-card" },
            { alias: "button", maps: "radius-full", usage: "rounded-button" },
            { alias: "input", maps: "radius-md", usage: "rounded-input" },
        ].map(({ alias, maps, usage }) => (<div key={alias} className="rounded-card p-4" style={{ background: "var(--dt-bg-card)", border: "1px solid var(--dt-border-subtle)", minWidth: 160 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: "var(--dt-accent-primary)" }}>{usage}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 4 }}>→ {maps}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>semantic.radius.{alias}</div>
          </div>))}
      </div>
    </>);
}
function FoundationsShadows() {
    return (<>
      <SectionHeader title="Shadows" sub="Two shadow styles derived from the neon accent palette — glow for interactive elements, card for surface elevation."/>
      <div className="grid grid-cols-2 gap-6">
        {[
            { name: "shadow-glow", value: "0px 0px 24px rgba(57,255,20,0.35)", token: "semantic.shadow.glow", use: "Buttons, focused inputs, active states" },
            { name: "shadow-card", value: "0px 12px 32px rgba(0,255,120,0.18)", token: "semantic.shadow.card", use: "Elevated cards, summary panels" },
        ].map(({ name, value, token, use }) => (<div key={name}>
            <div className="h-32 rounded-card flex items-center justify-center mb-4" style={{ background: "var(--dt-bg-card)", boxShadow: value, border: "1px solid rgba(57,255,20,0.2)" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-accent-primary)" }}>{name}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginBottom: 4 }}>{token}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginBottom: 8 }}>{use}</div>
            <CodeBlock code={value} lang="value"/>
          </div>))}
      </div>
    </>);
}
function FoundationsMotion() {
    const [running, setRunning] = useState(false);
    return (<>
      <SectionHeader title="Motion" sub="Duration and easing tokens for consistent animation across the system."/>
      <div className="grid grid-cols-2 gap-6 mb-10">
        {[
            { name: "duration-fast", value: "150ms", use: "Hover states, micro-interactions" },
            { name: "duration-base", value: "250ms", use: "Transitions, reveals" },
            { name: "duration-slow", value: "500ms", use: "Page transitions, progress fills" },
            { name: "ease-out", value: "cubic-bezier(0, 0, 0.2, 1)", use: "Entering elements" },
            { name: "ease-in-out", value: "cubic-bezier(0.4, 0, 0.2, 1)", use: "Persistent elements" },
            { name: "ease-spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)", use: "Playful interactions" },
        ].map(({ name, value, use }) => (<div key={name} className="rounded-card p-4" style={{ background: "var(--dt-bg-card)", border: "1px solid var(--dt-border-subtle)" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--dt-accent-primary)" }}>{name}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-primary)", marginTop: 6 }}>{value}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 4 }}>{use}</div>
          </div>))}
      </div>
      <Label>Live Demo</Label>
      <div className="flex items-center gap-6">
        <button className="dt-btn-primary" onClick={() => { setRunning(true); setTimeout(() => setRunning(false), 700); }}>
          Trigger Animation
        </button>
        <div className="w-12 h-12 rounded-card" style={{
            background: "var(--dt-accent-primary)",
            transform: running ? "scale(1.4) rotate(15deg)" : "scale(1) rotate(0deg)",
            transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: running ? "var(--dt-shadow-glow)" : "none",
        }}/>
      </div>
    </>);
}
function TokensPrimitive() {
    const groups = [...new Set(PRIMITIVE_TOKENS.map((t) => t.group))];
    return (<>
      <SectionHeader title="Primitive Tokens" sub="Raw, context-free values. Never referenced directly in components — always aliased through semantic tokens."/>
      {groups.map((g) => (<div key={g} className="mb-8">
          <Label>{g}</Label>
          <table className="w-full" style={{ borderCollapse: "collapse", border: "1px solid var(--dt-border-subtle)", borderRadius: 16, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#0f1419" }}>
                {["Token", "Value"].map((h) => (<th key={h} className="text-left px-4 py-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", letterSpacing: "0.06em" }}>{h}</th>))}
              </tr>
            </thead>
            <tbody style={{ background: "var(--dt-bg-card)" }}>
              {PRIMITIVE_TOKENS.filter((t) => t.group === g).map((t) => (<TokenRow key={t.name} name={t.name} value={t.value} swatch={g === "Color"}/>))}
            </tbody>
          </table>
        </div>))}
    </>);
}
function TokensSemantic() {
    return (<>
      <SectionHeader title="Semantic Tokens" sub="Purpose-driven aliases that map design decisions to primitive values. Use these — not primitives — in components."/>
      <table className="w-full" style={{ borderCollapse: "collapse", border: "1px solid var(--dt-border-subtle)", borderRadius: 16, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#0f1419" }}>
            {["Semantic Token", "Resolved Value", "Primitive Alias"].map((h) => (<th key={h} className="text-left px-4 py-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", letterSpacing: "0.06em" }}>{h}</th>))}
          </tr>
        </thead>
        <tbody style={{ background: "var(--dt-bg-card)" }}>
          {SEMANTIC_TOKENS.map((t) => (<TokenRow key={t.name} name={t.name} value={t.value} alias={t.alias} swatch={t.value.startsWith("#")}/>))}
        </tbody>
      </table>
    </>);
}
function TokensComponent() {
    const components = [...new Set(COMPONENT_TOKENS.map((t) => t.component))];
    return (<>
      <SectionHeader title="Component Tokens" sub="Component-scoped tokens that consume semantic aliases. Changing a semantic token propagates to all components that reference it."/>
      {components.map((comp) => (<div key={comp} className="mb-8">
          <Label>{comp}</Label>
          <table className="w-full" style={{ borderCollapse: "collapse", border: "1px solid var(--dt-border-subtle)", borderRadius: 16, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#0f1419" }}>
                {["Property", "References"].map((h) => (<th key={h} className="text-left px-4 py-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", letterSpacing: "0.06em" }}>{h}</th>))}
              </tr>
            </thead>
            <tbody style={{ background: "var(--dt-bg-card)" }}>
              {COMPONENT_TOKENS.filter((t) => t.component === comp).map((t) => (<TokenRow key={t.prop} name={`component.${comp}.${t.prop}`} value={`{${t.value}}`}/>))}
            </tbody>
          </table>
        </div>))}
    </>);
}
function ComponentsButtons() {
    const [loading, setLoading] = useState(false);
    return (<>
      <SectionHeader title="Buttons" sub="Two button variants driven entirely by component tokens. Radius is always rounded-button (999px)."/>
      <div className="flex flex-col gap-10">
        {[
            { label: "Button / Primary", desc: "bg: accent-primary · text: text-primary · shadow: glow" },
            { label: "Button / Secondary", desc: "border: accent-primary · text: accent-primary · bg: transparent" },
        ].map(({ label, desc }, vi) => (<div key={label}>
            <Label>{label}</Label>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginBottom: 20 }}>{desc}</p>
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <button className={vi === 0 ? "dt-btn-primary" : "dt-btn-secondary"}>Default</button>
              <button className={vi === 0 ? "dt-btn-primary" : "dt-btn-secondary"} style={{ opacity: 0.5 }}>Disabled</button>
              <button className={vi === 0 ? "dt-btn-primary" : "dt-btn-secondary"} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
                {loading ? "Loading..." : "With Action"}
              </button>
            </div>
            <CodeBlock lang="tsx" code={vi === 0
                ? `<button className="dt-btn-primary">\n  Copy Link\n</button>`
                : `<button className="dt-btn-secondary">\n  Send Reminder\n</button>`}/>
          </div>))}
      </div>
    </>);
}
function ComponentsCards() {
    return (<>
      <SectionHeader title="Cards" sub="card-primary token set: bg-card background, 16px radius, card shadow, border-subtle border."/>
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {[
            { title: "Default Card", sub: "bg-bg-card + border-subtle", glow: false },
            { title: "Accent Card", sub: "rgba(57,255,20,0.25) border + shadow-card", glow: true },
        ].map(({ title, sub, glow }) => (<div key={title} className="rounded-card p-layout" style={{ background: "var(--dt-bg-card)", border: glow ? "1px solid rgba(57,255,20,0.25)" : "1px solid var(--dt-border-subtle)", boxShadow: glow ? "var(--dt-shadow-card)" : "none" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: "var(--dt-text-primary)" }}>{title}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 6 }}>{sub}</div>
            <div className="mt-4 h-2 rounded-full" style={{ background: "var(--dt-border-subtle)" }}>
              <div className="h-full rounded-full" style={{ width: "65%", background: "var(--dt-accent-primary)", boxShadow: "0 0 8px rgba(57,255,20,0.6)" }}/>
            </div>
          </div>))}
      </div>
      <div className="mt-6">
        <CodeBlock lang="tsx" code={`<div className="rounded-card p-layout bg-bg-card shadow-card"\n  style={{ border: "1px solid var(--dt-border-subtle)" }}>\n  {/* card content */}\n</div>`}/>
      </div>
    </>);
}
function ComponentsInputs() {
    const [val, setVal] = useState("");
    return (<>
      <SectionHeader title="Inputs" sub="Border-radius: radius-input (12px). Focus state uses accent-primary border."/>
      <div className="flex flex-col gap-6 max-w-lg">
        {[
            { label: "Default", placeholder: "/type a command..." },
            { label: "With prefix", placeholder: "moneyhub.io/ref/plugmaster" },
        ].map(({ label, placeholder }) => (<div key={label}>
            <Label>{label}</Label>
            <div className="flex items-center gap-3 px-layout py-stack" style={{ background: "#0f1419", border: "1px solid var(--dt-border-subtle)", borderRadius: "var(--dt-radius-input)" }}>
              {label === "With prefix" && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-secondary)" }}>🔗</span>}
              {label !== "With prefix" && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-accent-primary)" }}>&gt;</span>}
              <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent outline-none" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-primary)", caretColor: "var(--dt-accent-primary)" }}/>
            </div>
          </div>))}
      </div>
      <div className="mt-6 max-w-lg">
        <CodeBlock lang="tsx" code={`<div className="flex items-center gap-stack px-layout py-stack"\n  style={{ background: "#0f1419",\n    border: "1px solid var(--dt-border-subtle)",\n    borderRadius: "var(--dt-radius-input)" }}>\n  <input className="flex-1 bg-transparent outline-none"\n    style={{ fontFamily: "'JetBrains Mono', monospace",\n      color: "var(--dt-text-primary)" }} />\n</div>`}/>
      </div>
    </>);
}
function ComponentsTabs() {
    const [t2, setT2] = useState(0);
    const [t3, setT3] = useState(0);
    return (<>
      <SectionHeader title="Tabs" sub="Pill-style tab switcher on a dark tray background. Active state uses accent-primary text and border."/>
      {[
            { label: "Tabs / 2", items: ["Global", "Friends"], active: t2, setActive: setT2 },
            { label: "Tabs / 3", items: ["Daily", "Weekly", "Monthly"], active: t3, setActive: setT3 },
        ].map(({ label, items, active, setActive }) => (<div key={label} className="mb-10">
          <Label>{label}</Label>
          <div className="flex p-1 rounded-input mb-6" style={{ background: "#0f1419", maxWidth: 400 }}>
            {items.map((item, i) => (<button key={item} onClick={() => setActive(i)} className="flex-1 py-2.5 rounded-input transition-all" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "var(--dt-fs-xs)",
                    fontWeight: active === i ? 700 : 400,
                    background: active === i ? "var(--dt-bg-card)" : "transparent",
                    color: active === i ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)",
                    border: active === i ? "1px solid rgba(57,255,20,0.25)" : "1px solid transparent",
                }}>
                {item}
              </button>))}
          </div>
        </div>))}
    </>);
}
function ComponentsNavigation() {
    return (<>
      <SectionHeader title="Navigation" sub="TopBar and 4-tab BottomNav. Active tab uses accent-primary with glow. Inactive uses text-secondary."/>
      <Label>Top Bar</Label>
      <div className="rounded-card overflow-hidden mb-8" style={{ border: "1px solid var(--dt-border-subtle)", maxWidth: 400 }}>
        <div className="flex items-center justify-between px-layout py-3" style={{ background: "var(--dt-bg-primary)" }}>
          <div className="flex items-center gap-stack">
            <div className="w-8 h-8 rounded-input flex items-center justify-center bg-accent-primary">⚡</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-md)", fontWeight: 700, color: "var(--dt-text-primary)" }}>MoneyPlugHub</div>
          </div>
          <div className="w-5 h-5 rounded-full bg-accent-primary"/>
        </div>
      </div>
      <Label>Bottom Nav / 4-Tabs</Label>
      <div className="rounded-card overflow-hidden" style={{ border: "1px solid var(--dt-border-subtle)", maxWidth: 400 }}>
        <div className="flex items-center justify-around px-layout py-3" style={{ background: "var(--dt-bg-card)", borderTop: "1px solid var(--dt-border-subtle)" }}>
          {["🏠 Home", "🎯 Quests", "🏆 Ranks", "👤 Profile"].map((tab, i) => (<div key={tab} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-input flex items-center justify-center text-sm" style={{ background: i === 0 ? "rgba(57,255,20,0.12)" : "transparent" }}>
                {tab.split(" ")[0]}
              </div>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: i === 0 ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)" }}>
                {tab.split(" ")[1]}
              </span>
            </div>))}
        </div>
      </div>
    </>);
}
function ComponentsProgress() {
    return (<>
      <SectionHeader title="Progress Bars" sub="Neon fill with gradient glow. Track uses border-subtle. Radius: radius-full."/>
      <div className="flex flex-col gap-8 max-w-lg">
        {[
            { label: "XP Progress", value: 86, color: "var(--dt-accent-primary)", sub: "4,280 / 5,000 XP" },
            { label: "Quest Progress", value: 60, color: "var(--dt-accent-secondary)", sub: "3 / 5" },
            { label: "Referral Tier", value: 47, max: 50, color: "#f59e0b", sub: "47/50 refs" },
            { label: "Earnings Goal", value: 74, color: "#a855f7", sub: "$74 of $100" },
        ].map(({ label, value, max, color, sub }) => (<div key={label}>
            <Label>{label}</Label>
            <NeonProgressBar value={value} max={max ?? 100} label={sub} color={color} sublabel={`${value}%`}/>
          </div>))}
      </div>
    </>);
}
function ComponentsBadges() {
    const badges = [
        { emoji: "🔗", name: "Referral Rookie", rarity: "Common", color: "var(--dt-accent-primary)", raw: "#39FF14", unlocked: true },
        { emoji: "💸", name: "Cashflow Captain", rarity: "Rare", color: "#00d4ff", raw: "#00d4ff", unlocked: true },
        { emoji: "⚡", name: "Plug Master", rarity: "Epic", color: "#a855f7", raw: "#a855f7", unlocked: true },
        { emoji: "🔥", name: "Streak God", rarity: "Legendary", color: "#ff3b5c", raw: "#ff3b5c", unlocked: false },
    ];
    return (<>
      <SectionHeader title="Badges" sub="Icon badge component. Locked state uses grayscale + lock overlay. Rarity pill uses rarity color with 15% opacity bg."/>
      <div className="flex gap-4 flex-wrap mb-8">
        {badges.map(({ emoji, name, rarity, color, raw, unlocked }) => (<div key={name} className="flex flex-col items-center gap-2 p-layout rounded-card" style={{ background: "var(--dt-bg-card)", border: `1px solid ${unlocked ? `${raw}35` : "var(--dt-border-subtle)"}`, minWidth: 120, boxShadow: unlocked ? `0 0 24px ${raw}12` : "none" }}>
            <div className="w-16 h-16 rounded-card flex items-center justify-center" style={{ background: unlocked ? `${raw}18` : "#111519", border: `1px solid ${unlocked ? `${raw}40` : "var(--dt-border-subtle)"}` }}>
              <span style={{ fontSize: 30, filter: unlocked ? "none" : "grayscale(1) opacity(0.25)" }}>{emoji}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: unlocked ? "var(--dt-text-primary)" : "var(--dt-text-secondary)", textAlign: "center" }}>{name}</div>
            <div className="px-2.5 py-0.5 rounded-button" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{rarity}</span>
            </div>
          </div>))}
      </div>
    </>);
}
function ComponentsTables() {
    return (<>
      <SectionHeader title="Tables" sub="Data table used in the Referral Engine. Header on dark tray, rows on card background, status pills."/>
      <div className="rounded-card overflow-hidden max-w-xl" style={{ border: "1px solid var(--dt-border-subtle)" }}>
        <div className="grid px-layout py-stack" style={{ gridTemplateColumns: "1fr 1fr 1fr 60px", background: "#0f1419", borderBottom: "1px solid var(--dt-border-subtle)" }}>
          {["Name", "Platform", "Status", "Reward"].map((h) => (<div key={h} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--dt-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>))}
        </div>
        {[
            { name: "Emily", platform: "Acorns", status: "Approved", statusColor: "var(--dt-accent-primary)", statusBg: "rgba(57,255,20,0.1)", reward: "$10" },
            { name: "Jake", platform: "Rakuten", status: "Pending", statusColor: "#f59e0b", statusBg: "rgba(245,158,11,0.1)", reward: "$25" },
            { name: "Maria", platform: "Honey", status: "Rejected", statusColor: "#ff3b5c", statusBg: "rgba(255,59,92,0.1)", reward: "—" },
        ].map(({ name, platform, status, statusColor, statusBg, reward }, i) => (<div key={name} className="grid items-center px-layout py-layout" style={{ gridTemplateColumns: "1fr 1fr 1fr 60px", background: "var(--dt-bg-card)", borderBottom: i < 2 ? "1px solid var(--dt-border-subtle)" : "none" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", fontWeight: 500, color: "var(--dt-text-primary)" }}>{name}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-secondary)" }}>{platform}</div>
            <div><span className="px-2.5 py-0.5 rounded-button" style={{ background: statusBg, border: `1px solid ${statusColor}40`, fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: statusColor }}>{status}</span></div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: "var(--dt-accent-primary)" }}>{reward}</div>
          </div>))}
      </div>
    </>);
}
function ComponentsModals() {
    const [open, setOpen] = useState(false);
    return (<>
      <SectionHeader title="Modals" sub="Full-screen overlay with card-radius panel, backdrop blur, and accent-primary confirm button."/>
      <button className="dt-btn-primary" onClick={() => setOpen(true)}>Open Modal Demo</button>
      {open && (<div className="fixed inset-0 flex items-center justify-center z-50 p-layout" style={{ background: "rgba(5,6,8,0.85)", backdropFilter: "blur(8px)" }}>
          <div className="rounded-card p-layout w-full shadow-card" style={{ background: "var(--dt-bg-card)", border: "1px solid rgba(57,255,20,0.2)", maxWidth: 360 }}>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-lg)", fontWeight: 700, color: "var(--dt-text-primary)" }}>Confirm Action</div>
              <button onClick={() => setOpen(false)}><X size={18} color="var(--dt-text-secondary)"/></button>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
              This will submit your referral link to 3 platforms and trigger automation rules.
            </p>
            <div className="flex gap-3">
              <button className="dt-btn-secondary flex-1" onClick={() => setOpen(false)}>Cancel</button>
              <button className="dt-btn-primary flex-1" onClick={() => setOpen(false)}>Confirm</button>
            </div>
          </div>
        </div>)}
    </>);
}
function PatternPreview({ title, sub, children }) {
    return (<>
      <SectionHeader title={title} sub={sub}/>
      <div className="rounded-card overflow-hidden" style={{ border: "1px solid var(--dt-border-subtle)", background: "var(--dt-bg-primary)", maxWidth: 420 }}>
        {children}
      </div>
    </>);
}
function CodeSection({ title, lang, code, desc }) {
    return (<>
      <SectionHeader title={title} sub={desc}/>
      <CodeBlock code={code} lang={lang}/>
    </>);
}
// ── Section router ────────────────────────────────────────────────────────────
function renderSection(section) {
    switch (section) {
        case "foundations/colors": return <FoundationsColors />;
        case "foundations/typography": return <FoundationsTypography />;
        case "foundations/spacing": return <FoundationsSpacing />;
        case "foundations/radius": return <FoundationsRadius />;
        case "foundations/shadows": return <FoundationsShadows />;
        case "foundations/motion": return <FoundationsMotion />;
        case "tokens/primitive": return <TokensPrimitive />;
        case "tokens/semantic": return <TokensSemantic />;
        case "tokens/component": return <TokensComponent />;
        case "components/buttons": return <ComponentsButtons />;
        case "components/cards": return <ComponentsCards />;
        case "components/inputs": return <ComponentsInputs />;
        case "components/tabs": return <ComponentsTabs />;
        case "components/navigation": return <ComponentsNavigation />;
        case "components/progress": return <ComponentsProgress />;
        case "components/badges": return <ComponentsBadges />;
        case "components/tables": return <ComponentsTables />;
        case "components/modals": return <ComponentsModals />;
        case "patterns/dashboard": return <PatternPreview title="Dashboard Layout" sub="Card grid + earnings chart + XP strip + quick actions.">
      <div className="p-layout flex flex-col gap-stack">
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>Good evening,</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xxl)", fontWeight: 700, color: "var(--dt-text-primary)" }}>@plugmaster</div>
        <div className="grid grid-cols-2 gap-stack">
          {[["$1,842", "Total Earned"], ["47", "Active Refs"], ["14d", "Streak"], ["#23", "Rank"]].map(([v, l]) => (<div key={l} className="p-3 rounded-card" style={{ background: "var(--dt-bg-card)", border: "1px solid var(--dt-border-subtle)" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-lg)", fontWeight: 700, color: "var(--dt-text-primary)" }}>{v}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>{l}</div>
            </div>))}
        </div>
        <NeonProgressBar value={86} label="XP Level 7 → 8" sublabel="86%"/>
      </div>
    </PatternPreview>;
        case "patterns/referral": return <PatternPreview title="Referral Engine" sub="Code card + table + action row + floating CTA.">
      <div className="p-layout flex flex-col gap-stack">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>Your referral link</div>
        <div className="px-layout py-stack rounded-input" style={{ background: "#0f1419", border: "1px solid var(--dt-border-subtle)" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-primary)" }}>moneyhub.io/ref/plugmaster</span>
        </div>
        <button className="dt-btn-primary w-full">Copy Link</button>
      </div>
    </PatternPreview>;
        case "patterns/xp": return <PatternPreview title="XP System" sub="Summary card with large metric + progress bar + today's XP list.">
      <div className="p-layout flex flex-col gap-stack">
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>XP Summary</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 700, color: "var(--dt-accent-primary)", textShadow: "0 0 24px rgba(57,255,20,0.5)" }}>4,280</div>
        <NeonProgressBar value={4280} max={5000} label="Level 7 → Level 8" sublabel="86%"/>
      </div>
    </PatternPreview>;
        case "patterns/quests": return <PatternPreview title="Quests" sub="3-tab switcher + quest cards with progress + time remaining.">
      <div className="p-layout flex flex-col gap-stack">
        <div className="flex p-1 rounded-input gap-1" style={{ background: "#0f1419" }}>
          {["Daily", "Weekly", "Monthly"].map((t, i) => (<div key={t} className="flex-1 py-2 rounded-input text-center" style={{ background: i === 0 ? "var(--dt-bg-card)" : "transparent", fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: i === 0 ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)", border: i === 0 ? "1px solid rgba(57,255,20,0.25)" : "1px solid transparent" }}>{t}</div>))}
        </div>
        <div className="rounded-card p-3" style={{ background: "var(--dt-bg-card)", border: "1px solid rgba(57,255,20,0.3)" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--dt-accent-primary)", marginBottom: 8 }}>Share Content ✓</div>
          <NeonProgressBar value={1} max={1}/>
        </div>
      </div>
    </PatternPreview>;
        case "patterns/leaderboard": return <PatternPreview title="Leaderboards" sub="2-tab global/friends + medal rows with trend arrows + 'You' highlight.">
      <div className="p-layout flex flex-col gap-stack">
        {[["🥇", "CryptoKing", "$8,420", 0], ["🥈", "MoneyQueen", "$7,100", 1], ["🥉", "HustleBro", "$6,340", -1]].map(([medal, name, earned, change]) => (<div key={String(name)} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--dt-border-subtle)" }}>
            <span style={{ fontSize: 18 }}>{medal}</span>
            <div className="flex-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-primary)" }}>{String(name)}</div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: "var(--dt-text-primary)" }}>{String(earned)}</span>
          </div>))}
      </div>
    </PatternPreview>;
        case "patterns/ai": return <PatternPreview title="AI Command Center" sub="Command input card + selectable list + terminal output panel.">
      <div className="p-layout flex flex-col gap-stack">
        <div className="flex items-center gap-2 px-3 py-2 rounded-input" style={{ background: "#0f1419", border: "1px solid rgba(57,255,20,0.2)" }}>
          <span style={{ color: "var(--dt-accent-primary)", fontFamily: "'JetBrains Mono', monospace" }}>&gt;</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-primary)" }}>/optimize referrals</span>
        </div>
        <button className="dt-btn-primary w-full">▶ Run</button>
        <div className="rounded-card p-3" style={{ background: "#020304", border: "1px solid var(--dt-border-subtle)" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)" }}>✓ Referral strategy optimized!</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-accent-primary)" }}>✓ 5 new leads found!</div>
        </div>
      </div>
    </PatternPreview>;
        case "code/tailwind": return <CodeSection title="Tailwind" lang="html" desc="Tailwind v4 utility classes generated from design tokens via Style Dictionary." code={`<!-- Colors -->\n<div class="bg-bg-primary text-text-primary">\n<div class="bg-bg-card text-text-secondary">\n<div class="bg-accent-primary text-bg-primary">\n\n<!-- Radius -->\n<div class="rounded-card">  <!-- 16px -->\n<button class="rounded-button"> <!-- 999px -->\n<input class="rounded-input">  <!-- 12px -->\n\n<!-- Spacing -->\n<div class="px-layout gap-section">\n<div class="gap-stack">\n\n<!-- Shadows -->\n<div class="shadow-card">\n<div class="shadow-glow">\n\n<!-- Typography -->\n<h1 class="text-display">    <!-- 28px -->\n<h2 class="text-title">      <!-- 24px -->\n<p  class="text-body">       <!-- 14px -->\n<span class="text-caption">  <!-- 12px -->`}/>;
        case "code/react": return <CodeSection title="React" lang="tsx" desc="Using design token CSS variables and Tailwind classes in React components." code={`import { NeonProgressBar } from "./components/NeonProgressBar";\n\n// Button using component token class\n<button className="dt-btn-primary">\n  Copy Link\n</button>\n\n// Card using token classes\n<div className="rounded-card p-layout bg-bg-card shadow-card"\n  style={{ border: "1px solid var(--dt-border-subtle)" }}>\n  <h2 style={{ color: "var(--dt-text-primary)" }}>XP Summary</h2>\n  <NeonProgressBar value={4280} max={5000} sublabel="86%" />\n</div>\n\n// Inline token vars for non-Tailwind values\nstyle={{ color: "var(--dt-accent-primary)" }}\nstyle={{ boxShadow: "var(--dt-shadow-glow)" }}`}/>;
        case "code/ios": return <CodeSection title="iOS" lang="objc" desc="Objective-C macros generated by Style Dictionary for native iOS usage." code={`// build/ios/tokens.h — auto-generated\n\n#define SemanticColorBackgroundPrimary  0x050608\n#define SemanticColorBackgroundCard     0x0B0F14\n#define SemanticColorAccentPrimary      0x39FF14\n#define SemanticColorTextPrimary        0xFFFFFF\n#define SemanticColorTextSecondary      0xA0A8B8\n#define SemanticColorBorderSubtle       0x1A1F2A\n\n#define SemanticRadiusCard     16.0f\n#define SemanticRadiusButton   999.0f\n#define SemanticRadiusInput    12.0f\n\n#define SemanticSpacingLayoutPadding   16.0f\n#define SemanticSpacingSectionGap      24.0f\n#define SemanticSpacingStackGap        12.0f`}/>;
        case "code/android": return <CodeSection title="Android" lang="xml" desc="Android resource XML generated by Style Dictionary for native Android usage." code={`<!-- build/android/tokens.xml — auto-generated -->\n\n<resources>\n  <color name="semantic_color_background_primary">#050608</color>\n  <color name="semantic_color_background_card">#0B0F14</color>\n  <color name="semantic_color_accent_primary">#39FF14</color>\n  <color name="semantic_color_text_primary">#FFFFFF</color>\n  <color name="semantic_color_text_secondary">#A0A8B8</color>\n  <color name="semantic_color_border_subtle">#1A1F2A</color>\n\n  <dimen name="semantic_radius_card">16dp</dimen>\n  <dimen name="semantic_radius_button">999dp</dimen>\n  <dimen name="semantic_radius_input">12dp</dimen>\n\n  <dimen name="semantic_spacing_layout_padding">16dp</dimen>\n  <dimen name="semantic_spacing_section_gap">24dp</dimen>\n  <dimen name="semantic_spacing_stack_gap">12dp</dimen>\n</resources>`}/>;
        case "code/tokens": return <CodeSection title="Web Tokens" lang="css" desc="Full CSS custom properties output from Style Dictionary. Import for non-Tailwind usage." code={`:root {\n  /* Primitive */\n  --primitive-color-black-900: #050608;\n  --primitive-color-green-neon: #39FF14;\n  --primitive-radius-lg: 16px;\n  --primitive-shadow-glow: 0px 0px 24px rgba(57,255,20,0.35);\n\n  /* Semantic */\n  --semantic-color-background-primary: var(--primitive-color-black-900);\n  --semantic-color-accent-primary: var(--primitive-color-green-neon);\n  --semantic-radius-card: var(--primitive-radius-lg);\n  --semantic-shadow-glow: var(--primitive-shadow-glow);\n\n  /* Component */\n  --component-button-primary-background: var(--semantic-color-accent-primary);\n  --component-button-primary-radius: var(--semantic-radius-button);\n  --component-card-primary-radius: var(--semantic-radius-card);\n  --component-card-primary-shadow: var(--semantic-shadow-card);\n}`}/>;
        default: return null;
    }
}
// ── Main export ───────────────────────────────────────────────────────────────
export function DesignSystemPage({ onClose }) {
    const [active, setActive] = useState("foundations/colors");
    const [collapsed, setCollapsed] = useState({});
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const toggle = (group) => setCollapsed((p) => ({ ...p, [group]: !p[group] }));
    return (<div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--dt-bg-primary)", fontFamily: "'Inter', sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--dt-border-subtle)", background: "var(--dt-bg-card)" }}>
        <div className="flex items-center gap-stack">
          <button onClick={() => setSidebarOpen((p) => !p)} className="w-8 h-8 rounded-input flex items-center justify-center" style={{ background: "var(--dt-border-subtle)" }}>
            <span style={{ fontSize: 14 }}>☰</span>
          </button>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-md)", fontWeight: 700, color: "var(--dt-text-primary)" }}>
            MoneyPlugHub <span style={{ color: "var(--dt-accent-primary)" }}>Design System</span>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-input flex items-center justify-center" style={{ background: "var(--dt-border-subtle)" }}>
          <X size={16} color="var(--dt-text-secondary)"/>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (<div className="flex-shrink-0 overflow-y-auto py-4" style={{ width: 220, background: "var(--dt-bg-card)", borderRight: "1px solid var(--dt-border-subtle)", scrollbarWidth: "none" }}>
            {NAV.map(({ group, items }) => (<div key={group} className="mb-1">
                <button onClick={() => toggle(group)} className="flex items-center justify-between w-full px-4 py-2">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--dt-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {group}
                  </span>
                  {collapsed[group] ? <ChevronRight size={12} color="var(--dt-text-secondary)"/> : <ChevronDown size={12} color="var(--dt-text-secondary)"/>}
                </button>
                {!collapsed[group] && items.map(({ id, label }) => (<button key={id} onClick={() => setActive(id)} className="w-full text-left px-6 py-2 transition-colors" style={{
                        background: active === id ? "rgba(57,255,20,0.08)" : "transparent",
                        borderLeft: active === id ? "2px solid var(--dt-accent-primary)" : "2px solid transparent",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "var(--dt-fs-sm)",
                        fontWeight: active === id ? 600 : 400,
                        color: active === id ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)",
                    }}>
                    {label}
                  </button>))}
              </div>))}
          </div>)}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8" style={{ scrollbarWidth: "none" }}>
          {renderSection(active)}
        </div>
      </div>
    </div>);
}
