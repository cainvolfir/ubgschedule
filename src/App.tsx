import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { UploadKrsPage } from './features/schedule/UploadKrsPage';
import { UploadTeoriPage } from './features/schedule/UploadTeoriPage';
import { UploadPraktikumPage } from './features/schedule/UploadPraktikumPage';
import { ResultPage } from './features/schedule/ResultPage';

type WizardStep = 'krs' | 'teori' | 'praktikum' | 'result';

function WizardContent({ step, onNext }: { step: WizardStep; onNext: () => void }) {
  switch (step) {
    case 'krs':
      return <UploadKrsPage onNext={onNext} />;
    case 'teori':
      return <UploadTeoriPage onNext={onNext} />;
    case 'praktikum':
      return <UploadPraktikumPage onNext={onNext} />;
    case 'result':
      return <ResultPage onBack={() => onNext()} />;
  }
}

export default function App() {
  const [step, setStep] = useState<WizardStep>('krs');

  const steps: WizardStep[] = ['krs', 'teori', 'praktikum', 'result'];

  const goNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route
            path="/*"
            element={<WizardContent step={step} onNext={goNext} />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
