export function MissionHubSelfKernelUI() {
  const k = MissionHubSelfKernel;

  return (
    <div className="selfkernel-container">
      <h1>Self‑Evolving Kernel</h1>

      <div className="selfkernel-card">
        <p><strong>Version:</strong> {k.architecture.version.toFixed(2)}</p>
        <p><strong>Layers:</strong> {k.architecture.layers.length}</p>
        <p><strong>Evolution Budget:</strong> {k.constraints.evolutionBudget}</p>
        <p><strong>Cycles Today:</strong> {k.mutationEngine.cyclesToday}</p>
      </div>

      <h2>Architecture Layers</h2>
      <div className="selfkernel-list">
        {k.architecture.layers.map((l, i) => (
          <div key={i} className="selfkernel-entry">{l}</div>
        ))}
      </div>
    </div>
  );
}
