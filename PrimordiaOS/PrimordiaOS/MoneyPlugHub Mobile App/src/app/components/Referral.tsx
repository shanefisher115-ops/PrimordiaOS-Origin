import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Plus, Bell, TrendingUp } from "lucide-react";
import { Skeleton, RowSkeleton, ErrorState, EmptyState } from "./Skeleton";
import { fetchReferrals } from "../../lib/api/mockData";
import type { ReferralEntry } from "../../lib/api/types";

const referralLink = "moneyhub.io/ref/plugmaster";

function QRCode() {
  const cells: boolean[][] = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      const corner = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
      const border =
        (r === 0 || r === 8) || (c === 0 || c === 8) ||
        (r === 2 && c <= 2) || (r <= 2 && c === 2) ||
        (r === 2 && c >= 6) || (r <= 2 && c === 6) ||
        (r === 6 && c <= 2) || (r >= 6 && c === 2);
      const data = [
        [false,false,false,true, false,true, false,false,false],
        [false,false,false,false,true, false,false,false,false],
        [false,false,false,true, false,false,false,false,false],
        [true, false,true, false,true, false,true, false,true ],
        [false,true, false,true, false,true, false,true, false],
        [true, false,false,false,true, false,false,false,true ],
        [false,false,false,false,false,true, false,false,false],
        [false,false,false,true, false,false,false,false,false],
        [false,false,false,false,true, false,false,false,false],
      ];
      return corner || border || data[r][c];
    })
  );
  return (
    <div className="p-2 rounded-input" style={{ background: "#fff", display: "inline-block" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 2 }}>
        {cells.flat().map((on, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: 1, background: on ? "var(--semantic-color-background-primary)" : "#fff" }} />
        ))}
      </div>
    </div>
  );
}

const statusStyle: Record<string, { text: string; bg: string; border: string }> = {
  Approved: { text: "var(--semantic-color-accent-primary)", bg: "rgba(57,255,20,0.1)",   border: "rgba(57,255,20,0.25)" },
  Pending:  { text: "#f59e0b",                              bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  Rejected: { text: "#ff3b5c",                              bg: "rgba(255,59,92,0.1)",  border: "rgba(255,59,92,0.25)"  },
};

export function Referral() {
  const [copied, setCopied]         = useState(false);
  const [referrals, setReferrals]   = useState<ReferralEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReferrals(await fetchReferrals());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-section px-layout pb-24">

      {/* Card / ReferralLink */}
      <div className="rounded-card p-layout flex flex-col gap-stack shadow-card"
        style={{ background: "var(--semantic-color-background-card)", border: "1px solid rgba(57,255,20,0.2)" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)" }}>Your referral link</div>
        <div className="flex items-center px-layout py-stack rounded-input" style={{ background: "#0f1419", border: "1px solid var(--semantic-color-border-subtle)" }}>
          <span className="flex-1 truncate" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--semantic-color-text-primary)" }}>
            {referralLink}
          </span>
        </div>
        <div className="flex items-center gap-stack">
          <button onClick={handleCopy} className={`flex-1 ${copied ? "dt-btn-secondary" : "dt-btn-primary"} transition-all active:scale-95`}
            style={copied ? { background: "rgba(57,255,20,0.08)" } : undefined}>
            {copied ? <Check size={16} color="var(--semantic-color-accent-primary)" /> : <Copy size={16} color="var(--semantic-color-background-primary)" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <QRCode />
        </div>
      </div>

      {/* Table / Referrals */}
      <div className="rounded-card overflow-hidden" style={{ border: "1px solid var(--semantic-color-border-subtle)" }}>
        {/* Header */}
        <div className="grid px-layout py-stack" style={{ gridTemplateColumns: "1fr 1fr 1fr 60px", background: "#0f1419", borderBottom: "1px solid var(--semantic-color-border-subtle)" }}>
          {["Name", "Platform", "Status", "Reward"].map((h) => (
            <div key={h} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--semantic-color-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
        ) : referrals.length === 0 ? (
          <EmptyState message="No referrals yet. Share your link to get started." />
        ) : (
          referrals.map(({ id, name, platform, status, reward }, i) => {
            const s = statusStyle[status] ?? statusStyle.Pending;
            return (
              <div key={id} className="grid items-center px-layout py-layout"
                style={{ gridTemplateColumns: "1fr 1fr 1fr 60px", background: "var(--semantic-color-background-card)", borderBottom: i < referrals.length - 1 ? "1px solid var(--semantic-color-border-subtle)" : "none" }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", fontWeight: 500, color: "var(--semantic-color-text-primary)" }}>{name}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", color: "var(--semantic-color-text-secondary)" }}>{platform}</div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-button" style={{ background: s.bg, border: `1px solid ${s.border}`, fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: s.text }}>{status}</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: "var(--semantic-color-accent-primary)" }}>{reward}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Button Row */}
      <div className="grid grid-cols-2 gap-stack">
        <button className="dt-btn-secondary" style={{ background: "rgba(57,255,20,0.08)" }}>
          <TrendingUp size={15} color="var(--semantic-color-accent-primary)" />
          Track Reward
        </button>
        <button className="dt-btn-secondary" style={{ color: "var(--semantic-color-text-secondary)", borderColor: "var(--semantic-color-border-subtle)", background: "#0f1419" }}>
          <Bell size={15} color="var(--semantic-color-text-secondary)" />
          Send Reminder
        </button>
      </div>

      {/* FloatingButton_AddReferral */}
      <button className="dt-btn-primary fixed" style={{ bottom: 100, left: "50%", transform: "translateX(-50%)", boxShadow: "var(--semantic-shadow-glow)", zIndex: 50, whiteSpace: "nowrap", paddingInline: 20, paddingBlock: 14 }}>
        <Plus size={18} color="var(--semantic-color-background-primary)" strokeWidth={2.5} />
        Add Referral
      </button>
    </div>
  );
}
