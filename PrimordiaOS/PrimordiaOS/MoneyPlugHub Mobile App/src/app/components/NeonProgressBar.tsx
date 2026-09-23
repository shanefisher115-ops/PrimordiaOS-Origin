interface NeonProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function NeonProgressBar({ value, max = 100, label, sublabel, color = "var(--dt-accent-primary)" }: NeonProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full">
      {(label || sublabel) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>{label}</span>
          )}
          {sublabel && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 600, color }}>{sublabel}</span>
          )}
        </div>
      )}
      <div className="w-full h-2 overflow-hidden" style={{ background: "var(--dt-border-subtle)", borderRadius: "var(--dt-radius-full)" }}>
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99 0%, ${color} 100%)`,
            boxShadow: `0 0 10px ${color}80`,
            borderRadius: "var(--dt-radius-full)",
          }}
        />
      </div>
    </div>
  );
}
