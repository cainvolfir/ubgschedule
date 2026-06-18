import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { UploadTeoriPage } from './features/schedule/UploadTeoriPage';
import { UploadPraktikumPage } from './features/schedule/UploadPraktikumPage';
import { ResultPage } from './features/schedule/ResultPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export type WizardStep = 'teori' | 'praktikum' | 'result';

const STEP_LABELS: Record<WizardStep, string> = {
  teori: 'upload theory schedule',
  praktikum: 'upload practical schedule',
  result: 'view generated schedule',
};

function WizardContent({
  step,
  onNext,
  onBack,
}: {
  step: WizardStep;
  onNext: () => void;
  onBack: () => void;
}) {
  switch (step) {
    case 'teori':
      return <UploadTeoriPage onNext={onNext} />;
    case 'praktikum':
      return <UploadPraktikumPage onNext={onNext} onBack={onBack} />;
    case 'result':
      return <ResultPage onBack={onBack} />;
  }
}

export default function App() {
  const [step, setStep] = useState<WizardStep>('teori');

  const steps: WizardStep[] = ['teori', 'praktikum', 'result'];

  const goNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const stepIndex = steps.indexOf(step);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={
          <RootLayout
            currentStep={stepIndex}
            statusText={STEP_LABELS[step]}
          />
        }>
          <Route
            path="/*"
            element={
              <ErrorBoundary>
                <WizardContent
                  step={step}
                  onNext={goNext}
                  onBack={goBack}
                />
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
