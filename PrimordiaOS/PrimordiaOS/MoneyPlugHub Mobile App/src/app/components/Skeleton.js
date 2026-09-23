export function Skeleton({ className = "", height = 16, width = "100%", radius = 8 }) {
    return (<div className={className} style={{
            height,
            width,
            borderRadius: radius,
            background: "linear-gradient(90deg, #1A1F2A 25%, #222836 50%, #1A1F2A 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease-in-out infinite",
            flexShrink: 0,
        }}/>);
}
export function CardSkeleton({ rows = 3 }) {
    return (<div className="rounded-card p-layout flex flex-col gap-stack" style={{ background: "var(--semantic-color-background-card)", border: "1px solid var(--semantic-color-border-subtle)" }}>
      <Skeleton height={14} width="40%"/>
      <Skeleton height={28} width="60%"/>
      {Array.from({ length: rows }).map((_, i) => (<Skeleton key={i} height={12} width={`${70 + i * 10}%`}/>))}
    </div>);
}
export function RowSkeleton() {
    return (<div className="flex items-center gap-stack px-layout py-layout" style={{ borderBottom: "1px solid var(--semantic-color-border-subtle)" }}>
      <Skeleton height={40} width={40} radius={12}/>
      <div className="flex-1 flex flex-col gap-1">
        <Skeleton height={13} width="55%"/>
        <Skeleton height={11} width="35%"/>
      </div>
      <Skeleton height={13} width={48}/>
    </div>);
}
export function ErrorState({ message, onRetry }) {
    return (<div className="flex flex-col items-center justify-center py-12 gap-stack px-layout text-center">
      <span style={{ fontSize: 28 }}>⚠️</span>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)", lineHeight: 1.6 }}>
        {message}
      </div>
      {onRetry && (<button className="dt-btn-secondary" onClick={onRetry} style={{ marginTop: 4 }}>
          Retry
        </button>)}
    </div>);
}
export function EmptyState({ message }) {
    return (<div className="flex flex-col items-center justify-center py-12 gap-stack text-center">
      <span style={{ fontSize: 28 }}>📭</span>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)" }}>
        {message}
      </div>
    </div>);
}
// Global shimmer keyframe — injected once
const style = document.createElement("style");
style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
document.head.appendChild(style);
