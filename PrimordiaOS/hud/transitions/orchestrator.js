export function transitionToRealm(realm, onComplete) {
  console.log('[TRANSITION] Entering realm:', realm);
  if (typeof onComplete === 'function') {
    onComplete(realm);
  }
}
