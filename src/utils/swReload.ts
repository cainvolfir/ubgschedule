/**
 * Decide whether a service worker controllerchange should reload the page.
 *
 * The app imports a Labkom schedule from `#bridge=<payload>` at boot (see
 * utils/bridge). A reload fired by the service worker taking control re-runs
 * that import: on the second run the store is rebuilt from the payload and
 * anything the user changed after arriving is lost. The import clears the hash
 * with history.replaceState precisely so a reload cannot re-import, but an
 * embedded browser can refuse replaceState and leave the hash in the URL.
 *
 * When the hash is still present the reload is skipped. The imported schedule
 * is already in the persisted store, so nothing is lost by waiting for the next
 * navigation to pick up the new service worker.
 */
export function shouldReloadOnControllerChange(hash: string, alreadyRefreshing: boolean): boolean {
  if (alreadyRefreshing) return false;
  return !String(hash || '').includes('bridge=');
}
