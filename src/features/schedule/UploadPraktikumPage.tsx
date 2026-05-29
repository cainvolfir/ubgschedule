import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
import { cn } from '../../lib/utils';

function truncate(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

type DropState = 'empty' | 'processing' | 'populated';

export function UploadPraktikumPage({ onNext }: { onNext: () => void }) {
  const jadwalTeoriTerpilih = useJadwalStore((s) => s.jadwalTeoriTerpilih);
  const setDataPraktikum = useJadwalStore((s) => s.setDataPraktikum);
  const setJadwalFinal = useJadwalStore((s) => s.setJadwalFinal);
  const dataPraktikum = useJadwalStore((s) => s.dataPraktikum);
  const [dropState, setDropState] = useState<DropState>('empty');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/praktikum.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          console.log(`[Praktikum Worker] ${step}:`, data);
          break;
        case 'WARN':
          console.warn(`[Praktikum Worker] ${step}:`, data);
          break;
        case 'ERROR':
          console.error(`[Praktikum Worker] ${step}:`, data);
          setDropState('empty');
          break;
        case 'RESULT':
          console.log('[Praktikum Worker] RESULT:', data);
          if (Array.isArray(data) && data.length > 0) {
            setDataPraktikum(data);
            setDropState('populated');
          } else {
            console.warn('[Praktikum Worker] No rows matched');
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
          type: 'PARSE_PRAKTIKUM',
          fileBuffer: buffer,
          jadwalTeoriTerpilih,
        },
        [buffer],
      );
    });
  }, [jadwalTeoriTerpilih]);

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
  const hasValidResult = dropState === 'populated' && dataPraktikum.length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-sm flex-col px-3 pt-6">
      <p className="pixel-font mb-4 text-center text-[10px] uppercase tracking-wider text-zinc-400">
        Upload Practical Schedule
      </p>

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
                  {dropState === 'populated' ? truncate(fileName) : 'Drag & drop your Practical file here or click to browse'}
                </p>
              </>
            )}
          </div>

            {hasValidResult && (
              <div className="border-2 border-t-0 border-cyan-400/40 px-3 py-3">
                <p className="pixel-font text-[9px] text-zinc-500">
                  {dataPraktikum.length} jadwal praktikum terdeteksi
                </p>
                <Button
                  variant="default"
                  onClick={() => {
                    const merged = [
                      ...jadwalTeoriTerpilih.map((r) => ({
                        ...r,
                        Keterangan: r.Keterangan || '-',
                      })),
                      ...dataPraktikum.map((r: any) => ({
                        KodeMK: r.KodeMK || '',
                        MataKuliah: r.MataKuliah,
                        Kelas: r.Kelas || '',
                        SKS: r.SKS,
                        SMT: r.SMT || '',
                        DosenPengampuh: r.DosenPengampuh,
                        Hari: r.Hari,
                        Jam: r.Jam,
                        Ruang: r.Ruang,
                        Keterangan: r.Keterangan || '-',
                      })),
                    ];
                    setJadwalFinal(merged);
                    onNext();
                  }}
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
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
