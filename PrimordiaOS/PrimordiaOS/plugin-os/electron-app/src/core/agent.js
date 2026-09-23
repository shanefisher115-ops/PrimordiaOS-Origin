export async function initializeAgent() {
  const surface = document.getElementById('agent');
  surface.innerHTML = `
    <div class="surface-title">Agent</div>
    <div class="agent-body">Agent initialized.</div>
  `;
}
