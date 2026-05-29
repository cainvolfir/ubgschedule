import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';

type DropState = 'empty' | 'processing' | 'populated';

export function UploadKrsPage() {
  const setKRSResult = useJadwalStore((s) => s.setKRSResult);
  const dataKRS = useJadwalStore((s) => s.dataKRS);
  const kodeMKTerverifikasi = useJadwalStore((s) => s.kodeMKTerverifikasi);
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
            setKRSResult(
              { Nama: data.Nama, NIM: data.NIM, Semester: data.Semester },
              data.kodeMKTerverifikasi,
            );
            setDropState('populated');
          } else {
            console.warn('[KRS Worker] No course codes found');
            setDropState('empty');
          }
          break;
      }
    };

    worker.onerror = () => {
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

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleReupload = () => {
    setDropState('empty');
    setFileName('');
    setKRSResult({ Nama: '', NIM: '', Semester: '' }, []);
  };

  const borderStyle = dropState === 'empty' || dropState === 'processing' ? 'border-dashed' : 'border-solid';
  const glowStyle = dropState === 'populated'
    ? 'shadow-[0_0_12px_rgba(34,197,94,0.25)] ring-2 ring-green-500/30'
    : '';
  const dragClasses = isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : '';

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-sm flex-col px-3 pt-6">
      <div className="pixel-font mb-4 text-center text-[10px] uppercase tracking-wider text-zinc-400">
        Upload KRS (Study Plan)
      </div>

      <Card className="w-full">
        <CardContent className="p-0">
          {/* Upload zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`flex cursor-pointer flex-col items-center justify-center border-2 bg-white px-4 py-6 text-center transition-all dark:bg-zinc-900 ${borderStyle} ${glowStyle} ${dragClasses} ${dropState === 'populated' ? 'border-b-0' : 'rounded-none border-black dark:border-zinc-600'}`}
          >
            {dropState === 'processing' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-zinc-300 border-t-green-500" />
                <p className="pixel-font text-[9px] text-zinc-500">{fileName}</p>
              </div>
            ) : (
              <>
                <Upload size={20} className="mb-1 text-zinc-400" />
                <p className="pixel-font text-[9px] leading-relaxed text-zinc-500">
                  {dropState === 'populated'
                    ? `${fileName}`
                    : 'Drag & drop or click to browse'}
                </p>
              </>
            )}
          </div>

          {/* Parsed data inside same card */}
          {dropState === 'populated' && dataKRS && (
            <div className="border-2 border-t-0 border-black px-3 py-3 dark:border-zinc-600">
              <div className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
                <span className="text-zinc-400">Nama</span>
                <span className="font-medium">{dataKRS.Nama}</span>
                <span className="text-zinc-400">NIM</span>
                <span className="font-medium">{dataKRS.NIM}</span>
                <span className="text-zinc-400">Semester</span>
                <span className="font-medium">{dataKRS.Semester}</span>
              </div>

              <details className="group mt-1">
                <summary className="cursor-pointer text-[10px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                  Mata Kuliah ({kodeMKTerverifikasi.length})
                </summary>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {kodeMKTerverifikasi.map((kode) => (
                    <li
                      key={kode}
                      className="rounded-none border border-black px-1.5 py-0.5 text-[9px] font-mono dark:border-zinc-600"
                    >
                      {kode}
                    </li>
                  ))}
                </ul>
              </details>

              <Button
                variant="default"
                onClick={handleReupload}
                className="mt-3 w-full justify-center gap-1.5 text-[10px]"
              >
                <RefreshCw size={12} />
                Upload Different KRS
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      {dropState === 'populated' && (
        <p className="mt-3 text-center text-[9px] text-green-600 dark:text-green-400">
          KRS parsed successfully
        </p>
      )}
    </div>
  );
}
