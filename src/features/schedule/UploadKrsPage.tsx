import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type DropState = 'empty' | 'processing' | 'populated';

export function UploadKrsPage() {
  const navigate = useNavigate();
  const [dropState, setDropState] = useState<DropState>('empty');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/krs.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          console.log(`[KRS Worker] ${step}:`, data);
          break;
        case 'WARN':
          console.warn(`[KRS Worker] ${step}:`, data);
          break;
        case 'ERROR':
          console.error(`[KRS Worker] ${step}:`, data);
          setDropState('empty');
          break;
        case 'RESULT':
          console.log('[KRS Worker] RESULT:', data);
          if (data.kodeMKTerverifikasi && data.kodeMKTerverifikasi.length > 0) {
            setDropState('populated');
          } else {
            console.warn('[KRS Worker] No course codes found, staying in empty state');
            setDropState('empty');
          }
          break;
      }
    };

    worker.onerror = (err) => {
      console.error('[KRS Worker] Unhandled error:', err);
      setDropState('empty');
    };

    workerRef.current = worker;
    return () => { worker.terminate(); };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    setFileName(file.name);
    setDropState('processing');

    file.arrayBuffer().then((buffer) => {
      workerRef.current?.postMessage(
        { type: 'PARSE_KRS', fileBuffer: buffer },
        [buffer],
      );
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const borderStyle =
    dropState === 'empty' ? 'border-dashed' : 'border-solid';
  const glowStyle =
    dropState === 'populated'
      ? 'shadow-[0_0_20px_rgba(34,197,94,0.3)] ring-2 ring-green-500/40'
      : '';
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
        className={`flex h-64 w-full max-w-lg cursor-pointer items-center justify-center rounded-xl border-2 ${borderStyle} ${glowStyle} ${dragClasses} border-zinc-300 bg-white transition-all hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500`}
      >
        {dropState === 'processing' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-green-500" />
            <p className="text-sm text-zinc-500">Processing {fileName}...</p>
          </div>
        ) : (
          <p className="px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {dropState === 'populated'
              ? `${fileName} uploaded successfully. Click to replace.`
              : 'Drag & drop your KRS PDF here or click to browse'}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      {dropState === 'populated' && (
        <button
          onClick={() => navigate('/upload-teori')}
          className="mt-6 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Continue
        </button>
      )}
    </div>
  );
}
