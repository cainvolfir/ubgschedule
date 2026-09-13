import { useRef, useCallback } from 'react';
import { UploadSimple } from '@phosphor-icons/react';

interface FileDropZoneProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  buttonLabel: string;
  accept: string;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
}

export default function FileDropZone({
  icon, title, subtitle, buttonLabel, accept,
  isDragOver, onDragOver, onDragLeave, onDrop, onFileSelect,
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div
      className={
        'bg-white rounded-none border-2 border-black p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 group hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-none ' +
        (isDragOver ? 'bg-[#DBEAFE]' : 'shadow-none')
      }
      onClick={() => fileInputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="w-20 h-20 bg-background border-2 border-black rounded-none flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-extrabold text-xl mb-1">{title}</h3>
      <p className="font-medium text-gray-600">{subtitle}</p>
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <button
        type="button"
        className="mt-2 bg-[#60A5FA] w-full py-3 border-2 border-black rounded-none shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none font-bold text-lg text-black transition-colors flex items-center justify-center"
        onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
      >
        <UploadSimple weight="bold" className="inline mr-2" />{buttonLabel}
      </button>
    </div>
  );
}
