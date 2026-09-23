export async function initializeRealm() {
  console.log('[Realm] Initializing...');
  const surface = document.getElementById('realm');
  if (!surface) throw new Error('Realm surface missing');

  surface.innerHTML = `
    <div class="surface-title">Realm</div>
    <div class="realm-body">Realm initialized.</div>
  `;
}
