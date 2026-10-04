import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import TheoryStep from './components/TheoryStep';
import PraktikumStep from './components/PraktikumStep';
import ResultStep from './components/ResultStep';
import AutoClassPicker from './components/AutoClassPicker';
import { useJadwalStore } from './store/useJadwalStore';
import './index.css';

registerSW({ immediate: true });

let refreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});

export default function App() {
  const { wizardStep, setWizardStep, scheduleMode } = useJadwalStore();

  return (
    <StrictMode>
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