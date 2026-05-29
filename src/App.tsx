import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { UploadKrsPage } from './features/schedule/UploadKrsPage';
import { UploadTeoriPage } from './features/schedule/UploadTeoriPage';
import { UploadPraktikumPage } from './features/schedule/UploadPraktikumPage';
import { ResultPage } from './features/schedule/ResultPage';

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
      return <UploadTeoriPage onNext={onNext} onSkipToResult={onSkipToResult} />;
    case 'praktikum':
      return <UploadPraktikumPage onNext={onNext} />;
    case 'result':
      return <ResultPage onBack={onBack} />;
  }
}

export default function App() {
  const [step, setStep] = useState<WizardStep>('krs');

  const goTo = (s: WizardStep) => setStep(s);

  const goNext = () => {
    const steps: WizardStep[] = ['krs', 'teori', 'praktikum', 'result'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goBack = () => setStep('praktikum');

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route
            path="/*"
            element={
              <WizardContent
                step={step}
                onNext={goNext}
                onSkipToResult={() => goTo('result')}
                onBack={goBack}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
