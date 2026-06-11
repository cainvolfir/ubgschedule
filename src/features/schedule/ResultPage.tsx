import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { CatState } from '../../components/CatState';
import { PixelCat } from '../../components/PixelCat';

const ExportCanvas = lazy(() => import('../../features/exporter/ExportCanvas'));

const HARI_ORDER: Record<string, number> = {
  Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 7,
};

interface FinalRow {
  Hari: string;
  MataKuliah: string;
  DosenPengampuh: string;
  SKS: string;
  Jam: string;
  Ruang: string;
  Keterangan: string;
}

export function ResultPage({ onBack }: { onBack: () => void }) {
  const jadwalFinal = useJadwalStore((s) => s.jadwalFinal);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const merged = useMemo(() => {
    const all: FinalRow[] = (jadwalFinal as unknown[]).map((r) => {
      const obj = r as Record<string, unknown>;
      return {
        Hari: String(obj?.Hari ?? ''),
        MataKuliah: String(obj?.MataKuliah ?? ''),
        DosenPengampuh: String(obj?.DosenPengampuh ?? ''),
        SKS: String(obj?.SKS ?? ''),
        Jam: String(obj?.Jam ?? ''),
        Ruang: String(obj?.Ruang ?? ''),
        Keterangan: String(obj?.Keterangan ?? '-'),
      };
    });

    all.sort((a, b) => {
      const ha = HARI_ORDER[a.Hari] ?? 99;
      const hb = HARI_ORDER[b.Hari] ?? 99;
      if (ha !== hb) return ha - hb;
      const ja = a.Jam.replace(/[.\s-]/g, '');
      const jb = b.Jam.replace(/[.\s-]/g, '');
      return ja.localeCompare(jb);
    });
    return all;
  }, [jadwalFinal]);

  const dayGroups = useMemo(() => {
    const groups: { hari: string; rows: FinalRow[] }[] = [];
    for (const row of merged) {
      const last = groups[groups.length - 1];
      if (last && last.hari === row.Hari) {
        last.rows.push(row);
      } else {
        groups.push({ hari: row.Hari, rows: [row] });
      }
    }
    return groups;
  }, [merged]);

  const collisionMap = useMemo(() => {
    const parseJam = (jam: string) => {
      if (!jam) return null;
      const m = jam.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/);
      if (!m) return null;
      return { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) };
    };
    const map = new Map<number, string[]>();
    const byDay = new Map<string, number[]>();
    merged.forEach((row, idx) => {
      if (!byDay.has(row.Hari)) byDay.set(row.Hari, []);
      byDay.get(row.Hari)!.push(idx);
    });
    for (const [, indices] of byDay) {
      for (let i = 0; i < indices.length; i++) {
        const a = parseJam(merged[indices[i]].Jam);
        if (!a) continue;
        for (let j = i + 1; j < indices.length; j++) {
          const b = parseJam(merged[indices[j]].Jam);
          if (!b) continue;
          if (a.start < b.end && b.start < a.end) {
            const ai = indices[i], bi = indices[j];
            if (!map.has(ai)) map.set(ai, []);
            if (!map.has(bi)) map.set(bi, []);
            map.get(ai)!.push(merged[bi].MataKuliah);
            map.get(bi)!.push(merged[ai].MataKuliah);
          }
        }
      }
    }
    return map;
  }, [merged]);

  const toggleDay = (hari: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(hari)) next.delete(hari);
      else next.add(hari);
      return next;
    });
  };

  const goBack = onBack;

  if (merged.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-4xl flex-col items-center justify-center px-4 py-6 sm:px-8">
        <CatState pose="sleep" size={80} message="No schedule data available.">
          <Button
            variant="default"
            className="pixel-font mt-2 text-[9px]"
            onClick={goBack}
          >
            Back to Upload
          </Button>
        </CatState>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center text-zinc-400 hover:text-zinc-600 sm:h-8 sm:w-8 dark:hover:text-zinc-300"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="mr-auto">
          <p className="pixel-font text-[10px] uppercase tracking-wider text-zinc-400">
            Jadwal Perkuliahan
          </p>
          <p className="pixel-font mt-0.5 text-[8px] text-zinc-400">
            {merged.length} classes across {dayGroups.length} days
          </p>
        </div>
        <Suspense
          fallback={
            <span className="pixel-font text-[8px] text-zinc-400">Loading...</span>
          }
        >
          <ExportCanvas dayGroups={dayGroups} merged={merged} />
        </Suspense>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse border-2 border-black dark:border-zinc-600">
          <thead>
            <tr className="pixel-font border-b-2 border-black text-[9px] dark:border-zinc-600">
              <th className="border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600">Hari</th>
              <th className="border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600">Mata Kuliah</th>
              <th className="border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600">Dosen Pengampuh</th>
              <th className="border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600">SKS</th>
              <th className="border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600">Jam</th>
              <th className="border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600">Ruang</th>
              <th className="px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {(() => { let globalIdx = 0; return dayGroups.map((group) =>
              group.rows.map((row, idx) => {
                const gi = globalIdx++;
                const collided = collisionMap.get(gi);
                const keterangan = collided
                  ? 'Jadwal Bentrok'
                  : row.Keterangan;
                const cellCls = collided
                  ? 'bg-red-50 dark:bg-red-950/30 shadow-[inset_0_0_6px_rgba(239,68,68,0.35)]'
                  : '';
                const ketCls = collided
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : '';
                return (
                  <tr
                    key={`${group.hari}-${idx}`}
                    className="pixel-font border-b border-black text-[9px] lg:text-[10px] dark:border-zinc-700"
                  >
                    {idx === 0 && (
                      <td
                        className="border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600"
                        rowSpan={group.rows.length}
                      >
                        <span className="flex w-full items-center justify-center">{group.hari}</span>
                      </td>
                    )}
                    <td className={`border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.MataKuliah}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.DosenPengampuh}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.SKS}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.Jam}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.Ruang}</span>
                    </td>
                    <td className={`px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 ${ketCls} ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{keterangan}</span>
                    </td>
                  </tr>
                );
              }),
            ); })()}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — collapsible day sections */}
      <div className="flex flex-col gap-3 sm:hidden">
        {(() => { let globalIdx = 0; return dayGroups.map((group) => {
          const isCollapsed = collapsedDays.has(group.hari);
          return (
            <div key={group.hari}>
              {/* Day header — collapsible */}
              <button
                onClick={() => toggleDay(group.hari)}
                className="flex w-full items-center justify-between border-2 border-black bg-zinc-100 px-3 py-2.5 text-left dark:border-zinc-600 dark:bg-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <PixelCat pose="idle" size={16} />
                  <span className="pixel-font text-[10px] font-bold">{group.hari}</span>
                  <span className="pixel-font text-[8px] text-zinc-400">
                    ({group.rows.length})
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown size={14} className="text-zinc-400" />
                ) : (
                  <ChevronUp size={14} className="text-zinc-400" />
                )}
              </button>

              {/* Cards */}
              {!isCollapsed && (
                <div className="flex flex-col gap-2 border-2 border-t-0 border-black px-2 py-2 dark:border-zinc-600">
                  {group.rows.map((row, idx) => {
                    const gi = globalIdx++;
                    const collided = collisionMap.get(gi);
                    const keterangan = collided
                      ? 'Jadwal Bentrok'
                      : row.Keterangan;
                    const cardCls = collided
                      ? 'bg-red-50 dark:bg-red-950/30 shadow-[0_0_8px_rgba(239,68,68,0.35)] border-red-300 dark:border-red-700'
                      : 'bg-white dark:bg-zinc-900';
                    const ketCls = collided
                      ? 'border-red-400 bg-red-100 text-red-700 dark:border-red-500 dark:bg-red-900/50 dark:text-red-300'
                      : 'border-black dark:border-zinc-500';
                    return (
                      <div
                        key={idx}
                        className={`border-2 border-black px-3 py-2.5 dark:border-zinc-600 ${cardCls}`}
                      >
                        <div className="pixel-font mb-1.5 text-[10px] font-bold leading-tight">
                          {row.MataKuliah}
                        </div>
                        <div className="pixel-font grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[8px] text-zinc-600 dark:text-zinc-400">
                          <span>Dosen</span>
                          <span>{row.DosenPengampuh}</span>
                          <span>SKS</span>
                          <span>{row.SKS}</span>
                          <span>Jam</span>
                          <span>{row.Jam}</span>
                          <span>Ruang</span>
                          <span>{row.Ruang}</span>
                        </div>
                        <div className="mt-1.5">
                          <span className={`pixel-font inline-block border px-2 py-0.5 text-[8px] ${ketCls}`}>
                            {keterangan}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }); })()}
      </div>
    </div>
  );
}
