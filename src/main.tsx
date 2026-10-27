import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import TheoryStep from './components/TheoryStep';
import PraktikumStep from './components/PraktikumStep';
import ResultStep from './components/ResultStep';
import AutoClassPicker from './components/AutoClassPicker';
import { useJadwalStore } from './store/useJadwalStore';
import { importScheduleFromHash } from './utils/bridge';
import { shouldReloadOnControllerChange } from './utils/swReload';
import './index.css';

registerSW({ immediate: true });

let refreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  // Skip the reload while a bridge hash is still in the URL. The import below
  // clears it with history.replaceState, so only a browser that refused that
  // call gets here with one; reloading then would re-import the payload and
  // overwrite whatever the user changed since arriving. The schedule is already
  // in the persisted store, so the reload can wait for the next navigation.
  if (!shouldReloadOnControllerChange(window.location.hash, refreshing)) return;
  refreshing = true;
  window.location.reload();
});

/*
 * Jalur 2: a schedule arriving from the Labkom userscript.
 *
 * The userscript opens this app at `#bridge=<base64 payload>`. Import it before
 * the first render so the store already holds the rows and wizardStep is 3; the
 * result step then mounts with the schedule instead of flashing step 1 and
 * swapping underneath the user. importScheduleFromHash clears the hash with
 * history.replaceState, so the hash cannot be re-imported by the service worker
 * reload triggered by `controllerchange` above.
 */
let bridgeError: string | null = null;
try {
  importScheduleFromHash(useJadwalStore, (message) => {
    bridgeError = message;
  });
} catch (error) {
  bridgeError = error instanceof Error ? error.message : String(error);
}

export default function App() {
  const { wizardStep, setWizardStep, scheduleMode } = useJadwalStore();

  return (
    <StrictMode>
      {bridgeError && (
        <div className="bg-red-100 border-b-3 border-error text-error font-bold text-sm px-4 py-2">
          Gagal membuka jadwal dari helper Labkom: {bridgeError}
        </div>
      )}
      {wizardStep === 1 && <TheoryStep onNext={() => setWizardStep(2)} />}
      {wizardStep === 2 && scheduleMode === 'auto-codes' && (
        <AutoClassPicker onBack={() => setWizardStep(1)} onNext={() => setWizardStep(3)} />
      )}
      {wizardStep === 2 && scheduleMode === 'manual' && (
        <PraktikumStep onBack={() => setWizardStep(1)} onNext={() => setWizardStep(3)} />
      )}
      {wizardStep === 3 && <ResultStep onBack={() => setWizardStep(2)} />}
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<App />);