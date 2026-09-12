import { useState } from 'react';
import { Question, CheckCircle } from '@phosphor-icons/react';
import HelpModal from './HelpModal';

interface WizardHeaderProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { num: 1, label: 'Teori' },
  { num: 2, label: 'Praktikum' },
  { num: 3, label: 'Selesai' },
];

export default function WizardHeader({ currentStep }: WizardHeaderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      {/* Top Bar: Logo + Help */}
      <header className="bg-background border-b-2 border-black p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border-2 border-black shadow-none rounded-none flex items-center justify-center p-1 shrink-0">
            <img src="/logo-ubg.png" alt="UBG" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-lg tracking-tight uppercase">UBG Schedule</span>
        </div>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="flex items-center gap-2 bg-white px-3 py-1.5 border-2 border-black rounded-none shadow-none font-bold text-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
        >
          <Question weight="bold" />
          <span className="hidden sm:inline">Bantuan</span>
        </button>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b-2 border-black px-4 py-3 flex justify-center items-center gap-2 md:gap-4 sticky top-0 z-50">
        {steps.map((step, i) => {
          const isCompleted = step.num < currentStep;
          const isCurrent = step.num === currentStep;

          return (
            <div key={step.num} className="flex items-center gap-2 md:gap-4">
              <div
className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 border-2 border-black rounded-none transition-all ${
                    isCurrent
                      ? 'bg-tertiary text-white shadow-[3px_3px_0px_#000000] -translate-x-0.5 -translate-y-0.5'
                      : isCompleted
                        ? 'bg-white text-black'
                        : 'bg-white text-gray-400 border-slate-400 shadow-none translate-x-0 translate-y-0'
                    }`}
              >
                {isCompleted ? (
                  <CheckCircle weight="fill" className="text-tertiary text-xl" />
                ) : (
                  <span
                    className={`rounded-none w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-xs border-2 border-black ${
                      isCurrent
                        ? 'bg-black text-white'
                        : isCompleted
                          ? 'bg-white text-gray-800'
                          : 'bg-transparent text-gray-400'
                    }`}
                  >
                    {step.num}
                  </span>
                )}
                <span className="hidden sm:inline text-sm font-bold">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-6 md:w-10 h-1 ${
                    step.num < currentStep ? 'bg-black' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </>
  );
}
