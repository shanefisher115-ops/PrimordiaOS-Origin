export function MissionHubRiftsUI() {
  const rifts = MissionHubRifts.rifts;

  return (
    <div className="rifts-container">
      <h1>Dimensional Rifts</h1>

      <div className="rifts-grid">
        {Object.values(rifts).map((r) => (
          <div key={r.id} className={`rift-card ${r.unstable ? "unstable" : ""} ${r.collapsed ? "collapsed" : ""}`}>
            <h2>{r.id}</h2>
            <p><strong>Type:</strong> {r.type}</p>
            <p><strong>Severity:</strong> {r.severity.toFixed(2)}</p>
            <p><strong>Unstable:</strong> {r.unstable ? "Yes" : "No"}</p>
            <p><strong>Collapsed:</strong> {r.collapsed ? "Yes" : "No"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
