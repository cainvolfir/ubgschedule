import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { useJadwalStore, type DataTeoriMentah } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/pixelact-ui/select';
import { cn } from '../../lib/utils';

function truncate(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

type DropState = 'empty' | 'processing' | 'populated';

interface CourseGroup {
  KodeMK: string;
  MataKuliah: string;
  kelasOptions: string[];
  rows: DataTeoriMentah[];
}

export function UploadTeoriPage({ onNext, onSkipToResult, onBack }: { onNext: () => void; onSkipToResult: () => void; onBack: () => void }) {
  const dataKRS = useJadwalStore((s) => s.dataKRS);
  const kodeMKTerverifikasi = useJadwalStore((s) => s.kodeMKTerverifikasi);
  const setDataTeoriMentah = useJadwalStore((s) => s.setDataTeoriMentah);
  const dataTeoriMentah = useJadwalStore((s) => s.dataTeoriMentah);
  const kelasPilihanUser = useJadwalStore((s) => s.kelasPilihanUser);
  const setKelasPilihanUser = useJadwalStore((s) => s.setKelasPilihanUser);
  const setJadwalTeoriTerpilih = useJadwalStore((s) => s.setJadwalTeoriTerpilih);
  const setJadwalFinal = useJadwalStore((s) => s.setJadwalFinal);
  const [dropState, setDropState] = useState<DropState>('empty');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [globalKelas, setGlobalKelas] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const map = new Map<string, { MataKuliah: string; kelasSet: Set<string>; rows: typeof dataTeoriMentah }>();
    for (const row of dataTeoriMentah) {
      const key = row.KodeMK;
      if (!map.has(key)) {
        map.set(key, { MataKuliah: row.MataKuliah, kelasSet: new Set(), rows: [] });
      }
      const group = map.get(key)!;
      if (row.Kelas) group.kelasSet.add(row.Kelas);
      group.rows.push(row);
    }
    const result: CourseGroup[] = [];
    for (const [KodeMK, g] of map) {
      result.push({
        KodeMK,
        MataKuliah: g.MataKuliah,
        kelasOptions: [...g.kelasSet].sort(),
        rows: g.rows,
      });
    }
    return result;
  }, [dataTeoriMentah]);

  const allKelasOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const k of g.kelasOptions) set.add(k);
    }
    return [...set].sort();
  }, [groups]);

  const allSelected = groups.length > 0 && groups.every((g) => kelasPilihanUser[g.KodeMK]);

  useEffect(() => {
    if (Object.keys(kelasPilihanUser).length > 0) {
      console.log('[TeoriSelect] Selection map:', kelasPilihanUser);
    }
  }, [kelasPilihanUser]);

  useEffect(() => {
    const selected = dataTeoriMentah.filter(
      (row) => kelasPilihanUser[row.KodeMK] === row.Kelas,
    );
    if (selected.length > 0) {
      console.log('[TeoriSelect] Saving jadwalTeoriTerpilih:', selected.length, 'rows');
      setJadwalTeoriTerpilih(selected);
    }
  }, [kelasPilihanUser, dataTeoriMentah, setJadwalTeoriTerpilih]);

  useEffect(() => {
    if (dataTeoriMentah.length > 0) {
      setDropState('populated');
    }
  }, [dataTeoriMentah]);

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
    setKelasPilihanUser({});

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
  }, [kodeMKTerverifikasi, setKelasPilihanUser]);

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

  const handleGlobalChange = useCallback((kelas: string) => {
    setGlobalKelas(kelas);
    const updated = { ...kelasPilihanUser };
    for (const g of groups) {
      if (g.kelasOptions.includes(kelas)) {
        updated[g.KodeMK] = kelas;
      }
    }
    setKelasPilihanUser(updated);
  }, [groups, kelasPilihanUser, setKelasPilihanUser]);

  const handleKelasChange = useCallback((kodeMK: string, kelas: string) => {
    setKelasPilihanUser({ ...kelasPilihanUser, [kodeMK]: kelas });
  }, [kelasPilihanUser, setKelasPilihanUser]);

  const handleContinue = () => {
    onNext();
  };

  const borderStyle = dropState === 'empty' || dropState === 'processing' ? 'border-dashed' : 'border-solid';
  const neonGlow = dropState === 'populated'
    ? 'shadow-[0_0_6px_rgba(0,255,200,0.5),0_0_14px_rgba(0,200,255,0.35),0_0_28px_rgba(150,0,255,0.2)] ring-[2px] ring-cyan-400/30'
    : '';
  const dragClasses = isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : '';
  const hasTheoryResult = dropState === 'populated' && dataTeoriMentah.length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col px-4 pt-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <ArrowLeft size={16} />
          <span className="pixel-font text-[9px]">Back</span>
        </button>
        <p className="pixel-font text-[10px] uppercase tracking-wider text-zinc-400">
          Theory & Class Selection
        </p>
      </div>

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

            {hasTheoryResult && (
              <div className="border-2 border-t-0 border-cyan-400/40 px-3 py-3">
                <p className="pixel-font text-[9px] text-zinc-500">
                  {dataTeoriMentah.length} jadwal terdeteksi
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasTheoryResult && (
        <div className="flex flex-col gap-3">
          <div className="mt-4">
            <label className="pixel-font mb-1 block text-[9px] text-zinc-500">
              Set All Classes
            </label>
            <Select value={globalKelas} onValueChange={handleGlobalChange}>
              <SelectTrigger className="w-full text-[9px]">
                <SelectValue placeholder="[ All Classes... ]" />
              </SelectTrigger>
              <SelectContent>
                {allKelasOptions.map((k) => (
                  <SelectItem key={k} value={k} className="pixel-font text-[9px]">
                    Class {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groups.map((g) => {
              const selected = kelasPilihanUser[g.KodeMK] || '';
              const detailRow = selected ? g.rows.find((r) => r.Kelas === selected) : null;
              return (
                <Card key={g.KodeMK} className="w-full">
                  <CardContent className="px-3 py-2">
                    <div className="pixel-font mb-1.5 text-[9px] font-bold leading-tight">
                      {g.KodeMK}
                    </div>
                    <div className="pixel-font mb-2 text-[8px] leading-tight text-zinc-500">
                      {g.MataKuliah}
                    </div>
                    <Select
                      value={selected}
                      onValueChange={(v) => handleKelasChange(g.KodeMK, v)}
                    >
                      <SelectTrigger className="w-full text-[9px]">
                        <SelectValue placeholder="[ Select Class... ]" />
                      </SelectTrigger>
                      <SelectContent>
                        {g.kelasOptions.map((k) => (
                          <SelectItem
                            key={k}
                            value={k}
                            className="pixel-font text-[9px]"
                          >
                            Class {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {detailRow && (
                      <div className="pixel-font mt-2 border-t border-zinc-300 pt-2 text-[8px] leading-relaxed text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                          <span>Dosen</span>
                          <span>{detailRow.DosenPengampuh}</span>
                          <span>Hari</span>
                          <span>{detailRow.Hari}</span>
                          <span>Jam</span>
                          <span>{detailRow.Jam}</span>
                          <span>Ruang</span>
                          <span>{detailRow.Ruang || '-'}</span>
                          <span>SKS</span>
                          <span>{detailRow.SKS}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 pb-8 pt-2">
            <Button
              variant={allSelected ? 'default' : 'secondary'}
              disabled={!allSelected}
              className="pixel-font w-full justify-center text-[9px]"
              onClick={handleContinue}
            >
              Continue to Practical
            </Button>
            {allSelected && (
              <button
                onClick={() => {
                  const filtered = dataTeoriMentah.filter(
                    (row) => kelasPilihanUser[row.KodeMK] === row.Kelas,
                  );
                  setJadwalFinal(filtered);
                  onSkipToResult();
                }}
                className="pixel-font cursor-pointer text-center text-[9px] text-zinc-400 underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Skip to Schedule
              </button>
            )}
          </div>
        </div>
      )}

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
