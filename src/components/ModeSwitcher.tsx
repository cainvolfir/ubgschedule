import { ArrowsDownUp } from '@phosphor-icons/react';
import { useJadwalStore } from '../store/useJadwalStore';
import type { ScheduleMode } from '../store/useJadwalStore';

const MODES: { value: ScheduleMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto-codes', label: 'Auto by Course Codes' },
];

interface ModeSwitcherProps {
  /** Hide the switcher (e.g. on step 3 ResultStep) */
  hidden?: boolean;
}

export default function ModeSwitcher({ hidden }: ModeSwitcherProps) {
  const { scheduleMode, setScheduleMode } = useJadwalStore();

  if (hidden) return null;

  return (
    <div className="flex justify-center">
      <div className="inline-flex border-2 border-black rounded-none overflow-hidden">
        {MODES.map((mode, i) => {
          const isActive = scheduleMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => setScheduleMode(mode.value)}
              className={
                'px-4 md:px-6 py-2 font-bold text-sm uppercase tracking-wide transition-all flex items-center gap-2 ' +
                (isActive
                  ? 'bg-tertiary text-white shadow-[3px_3px_0px_#000000] -translate-x-0.5 -translate-y-0.5'
                  : 'bg-white text-black hover:bg-gray-100') +
                (i > 0 ? ' border-l-2 border-black' : '')
              }
            >
              <ArrowsDownUp weight="bold" size={16} />
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
