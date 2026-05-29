import { useRef, useState } from 'react';

export function UploadKrsPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const dragClasses = isDragOver
    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
    : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex h-64 w-full max-w-lg cursor-pointer items-center justify-center rounded-xl border-2 border-dashed ${dragClasses} border-zinc-300 bg-white transition-all hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500`}
      >
        <p className="px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Drag & drop your KRS PDF here or click to browse
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
      />
    </div>
  );
}
