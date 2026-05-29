import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
import { cn } from '../../lib/utils';

function truncate(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

type DropState = 'empty' | 'processing' | 'populated';

export function UploadTeoriPage() {
  const navigate = useNavigate();
  const dataKRS = useJadwalStore((s) => s.dataKRS);
  const kodeMKTerverifikasi = useJadwalStore((s) => s.kodeMKTerverifikasi);
  const setDataTeoriMentah = useJadwalStore((s) => s.setDataTeoriMentah);
  const dataTeoriMentah = useJadwalStore((s) => s.dataTeoriMentah);
  const [dropState, setDropState] = useState<DropState>('empty');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/theory.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          console.log(`[Theory Worker] ${step}:`, data);
          break;
        case 'WARN':
          console.warn(`[Theory Worker] ${step}:`, data);
          break;
        case 'ERROR':
          console.error(`[Theory Worker] ${step}:`, data);
          setDropState('empty');
          break;
        case 'RESULT':
          console.log('[Theory Worker] RESULT:', data);
          if (data.length > 0) {
            setDataTeoriMentah(data);
            setDropState('populated');
          } else {
            console.warn('[Theory Worker] No rows parsed');
            setDropState('empty');
          }
          break;
      }
    };

    worker.onerror = () => setDropState('empty');

    workerRef.current = worker;
    return () => { worker.terminate(); };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    setFileName(file.name);
    setDropState('processing');

    file.arrayBuffer().then((buffer) => {
      workerRef.current?.postMessage(
        {
          type: 'PARSE_THEORY',
          fileBuffer: buffer,
          kodeMKTerverifikasi,
        },
        [buffer],
      );
    });
  }, [kodeMKTerverifikasi]);

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

  const borderStyle = dropState === 'empty' || dropState === 'processing' ? 'border-dashed' : 'border-solid';
  const neonGlow = dropState === 'populated'
    ? 'shadow-[0_0_6px_rgba(0,255,200,0.5),0_0_14px_rgba(0,200,255,0.35),0_0_28px_rgba(150,0,255,0.2)] ring-[2px] ring-cyan-400/30'
    : '';
  const dragClasses = isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : '';
  const hasValidResult = dropState === 'populated' && dataTeoriMentah.length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-sm flex-col px-3 pt-6">
      <p className="pixel-font mb-4 text-center text-[10px] uppercase tracking-wider text-zinc-400">
        Upload Theory Schedule
      </p>

      {dataKRS && (
        <Card className="mb-3 w-full">
          <CardContent className="px-3 py-2">
            <div className="pixel-font grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[9px]">
              <span className="text-zinc-400">Nama</span>
              <span>{dataKRS.Nama}</span>
              <span className="text-zinc-400">NIM</span>
              <span>{dataKRS.NIM}</span>
              <span className="text-zinc-400">Semester</span>
              <span>{dataKRS.Semester}</span>
            </div>
            <details className="group mt-1.5">
              <summary className="pixel-font cursor-pointer text-[9px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                Mata Kuliah ({kodeMKTerverifikasi.length})
              </summary>
              <ul className="mt-1 flex flex-wrap gap-1">
                {kodeMKTerverifikasi.map((kode) => (
                  <li
                    key={kode}
                    className="pixel-font border border-black px-1.5 py-0.5 text-[8px] dark:border-zinc-600"
                  >
                    {kode}
                  </li>
                ))}
              </ul>
            </details>
          </CardContent>
        </Card>
      )}

      <Card className={cn("w-full", dropState === 'populated' && 'shadow-none')}>
        <CardContent className="p-0">
          <div className={dropState === 'populated' ? `${neonGlow} bg-white dark:bg-zinc-900` : ''}>
            <div
              role="button"
              tabIndex={0}
              onClick={handleClick}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`flex cursor-pointer flex-col items-center justify-center border-2 bg-white px-4 py-6 text-center transition-all dark:bg-zinc-900 ${borderStyle} ${dropState === 'populated' ? 'border-b-0 border-cyan-400/40' : 'border-black dark:border-zinc-600'} ${dragClasses}`}
            >
            {dropState === 'processing' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-zinc-300 border-t-green-500" />
                <p className="pixel-font text-[9px] text-zinc-500">{truncate(fileName)}</p>
              </div>
            ) : (
              <>
                <Upload size={18} className="mb-1 text-zinc-400" />
                <p className="pixel-font text-[9px] leading-relaxed text-zinc-500">
                  {dropState === 'populated' ? truncate(fileName) : 'Drag & drop your Theory PDF here or click to browse'}
                </p>
              </>
            )}
          </div>

            {hasValidResult && (
              <div className="border-2 border-t-0 border-cyan-400/40 px-3 py-3">
                <p className="pixel-font text-[9px] text-zinc-500">
                  {dataTeoriMentah.length} jadwal terdeteksi
                </p>
                <Button
                  variant="default"
                  onClick={() => navigate('/select-class')}
                  className="mt-3 w-full justify-center text-[9px]"
                >
                  Continue
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
