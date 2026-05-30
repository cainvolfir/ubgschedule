import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { UploadKrsPage } from './features/schedule/UploadKrsPage';
import { UploadTeoriPage } from './features/schedule/UploadTeoriPage';
import { UploadPraktikumPage } from './features/schedule/UploadPraktikumPage';
import { ResultPage } from './features/schedule/ResultPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export type WizardStep = 'krs' | 'teori' | 'praktikum' | 'result';

function WizardContent({
  step,
  onNext,
  onSkipToResult,
  onBack,
}: {
  step: WizardStep;
  onNext: () => void;
  onSkipToResult: () => void;
  onBack: () => void;
}) {
  switch (step) {
    case 'krs':
      return <UploadKrsPage onNext={onNext} />;
    case 'teori':
      return <UploadTeoriPage onNext={onNext} onSkipToResult={onSkipToResult} onBack={onBack} />;
    case 'praktikum':
      return <UploadPraktikumPage onNext={onNext} onBack={onBack} />;
    case 'result':
      return <ResultPage onBack={onBack} />;
  }
}

export default function App() {
  const [step, setStep] = useState<WizardStep>('krs');

  const steps: WizardStep[] = ['krs', 'teori', 'praktikum', 'result'];

  const goNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route
            path="/*"
            element={
              <ErrorBoundary>
                <WizardContent
                  step={step}
                  onNext={goNext}
                  onSkipToResult={() => setStep('result')}
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
