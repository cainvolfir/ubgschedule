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
      <header className="bg-background border-b-2 border-black p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border-3 border-black shadow-[2px_2px_0px_#000000] rounded-md flex items-center justify-center p-1 shrink-0">
            <img src="/logo-ubg.png" alt="UBG" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-lg tracking-tight uppercase">UBG Schedule</span>
        </div>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="flex items-center gap-2 bg-white px-3 py-1.5 border-3 border-black shadow-[2px_2px_0px_#000000] rounded-lg font-bold text-sm hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000000] transition-all"
        >
          <Question weight="bold" />
          <span className="hidden sm:inline">Bantuan</span>
        </button>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b-3 border-black px-4 py-3 flex justify-center items-center gap-2 md:gap-4 sticky top-[60px] z-40">
        {steps.map((step, i) => {
          const isCompleted = step.num < currentStep;
          const isCurrent = step.num === currentStep;

          return (
            <div key={step.num} className="flex items-center gap-2 md:gap-4">
              <div
                className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 border-3 border-black rounded-full transition-all ${
                  isCurrent
                    ? 'bg-tertiary text-white shadow-[3px_3px_0px_#000000]'
                    : isCompleted
                      ? 'bg-white text-black'
                      : 'bg-white text-gray-400 border-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle weight="fill" className="text-tertiary text-xl" />
                ) : (
                  <span
                    className={`rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-xs ${
                      isCurrent
                        ? 'bg-black text-white border-2 border-black'
                        : 'border-2 border-gray-400 text-gray-400'
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
