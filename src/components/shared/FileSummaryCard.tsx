import { CheckCircle, Sparkle, Trash } from '@phosphor-icons/react';

interface FileSummaryCardProps {
  fileName: string;
  defaultFileName: string;
  totalCount: number;
  statusText: string;
  statusTextClass?: string;
  resetLabel: string;
  resetClassName?: string;
  onReset: () => void;
  children?: React.ReactNode;
}

export default function FileSummaryCard({
  fileName, defaultFileName, totalCount, statusText, statusTextClass,
  resetLabel, resetClassName, onReset, children,
}: FileSummaryCardProps) {
  return (
    <div className="bg-white border-2 border-black rounded-none shadow-none p-6 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-20 h-20 bg-[#DBEAFE] border-2 border-black rounded-none flex items-center justify-center">
        <CheckCircle weight="fill" className="text-tertiary text-4xl" />
      </div>
      <h3 className="font-extrabold text-lg mb-1 truncate w-48 mx-auto" title={fileName}>
        {fileName || defaultFileName}
      </h3>
      <div className={`font-bold flex items-center justify-center gap-1 ${statusTextClass || ''}`}>
        <Sparkle weight="bold" />{statusText}
      </div>
      <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
        Ditemukan:<span className="bg-black text-white px-2 rounded">{totalCount} Kelas</span>
      </div>
      {children}
      <button
        onClick={onReset}
        className={`mt-2 w-full py-3 rounded-none border-2 border-black shadow-none transition-all flex justify-center items-center gap-2 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none ${resetClassName || ''}`}
      >
        <Trash weight="bold" />{resetLabel}
      </button>
    </div>
  );
}
