interface BottomNavProps {
  selectedCount: number;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  nextLabel?: string;
  nextIcon?: React.ReactNode;
  onNext?: () => void;
  nextDisabled?: boolean;
}

export default function BottomNav({
  selectedCount, leftContent, rightContent,
  nextLabel, nextIcon, onNext, nextDisabled,
}: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] bg-white rounded-none border-t-2 border-black p-4 flex justify-between items-center shadow-[0px_-2px_0px_rgba(0,0,0,1)]">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        {leftContent ?? (
          <div className="font-bold text-black">
            Terpilih: <span className="text-xl px-2 bg-[#60A5FA] border-2 border-black ml-1">{selectedCount}</span>
          </div>
        )}
        {rightContent ?? (
          <button
            disabled={nextDisabled ?? selectedCount === 0}
            onClick={onNext}
            className={
              'rounded-none border-2 border-black px-4 md:px-6 py-3 font-extrabold transition-all inline-flex items-center gap-2 ' +
              (selectedCount > 0
                ? 'bg-tertiary text-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed')
            }
          >
            <span className="hidden md:inline">{nextLabel}</span>{nextIcon}
          </button>
        )}
      </div>
    </div>
  );
}
