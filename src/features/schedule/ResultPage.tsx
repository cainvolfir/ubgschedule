import { lazy, Suspense, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';

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

  const merged = useMemo(() => {
    const all: FinalRow[] = (jadwalFinal as any[]).map((r: any) => ({
      Hari: r.Hari,
      MataKuliah: r.MataKuliah,
      DosenPengampuh: r.DosenPengampuh,
      SKS: r.SKS,
      Jam: r.Jam,
      Ruang: r.Ruang,
      Keterangan: r.Keterangan || '-',
    }));

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

  const goBack = onBack;

  if (merged.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col items-center justify-center px-4 pt-6 lg:px-8">
        <p className="pixel-font text-center text-[10px] text-zinc-500">
          No schedule data available.
        </p>
        <Button
          variant="default"
          className="pixel-font mt-4 text-[9px]"
          onClick={goBack}
        >
          Back to Upload
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-8 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <ArrowLeft size={16} />
          <span className="pixel-font text-[9px]">Back</span>
        </button>
        <p className="pixel-font mr-auto text-[10px] uppercase tracking-wider text-zinc-400">
          Jadwal Perkuliahan
        </p>
        <Suspense
          fallback={
            <span className="pixel-font text-[8px] text-zinc-400">Loading...</span>
          }
        >
          <ExportCanvas dayGroups={dayGroups} merged={merged} />
        </Suspense>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black dark:border-zinc-600">
          <thead>
            <tr className="pixel-font border-b-2 border-black text-[9px] lg:text-[10px] dark:border-zinc-600">
              <th className="border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600">Hari</th>
              <th className="border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600">Mata Kuliah</th>
              <th className="border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600">Dosen Pengampuh</th>
              <th className="border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600">SKS</th>
              <th className="border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600">Jam</th>
              <th className="border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600">Ruang</th>
              <th className="px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {(() => { let globalIdx = 0; return dayGroups.map((group) =>
              group.rows.map((row, idx) => {
                const gi = globalIdx++;
                const collided = collisionMap.get(gi);
                const keterangan = collided
                  ? `${row.Keterangan} (Bentrok dengan jam Mata Kuliah ${collided.join(', ')})`
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
                        className="border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600"
                        rowSpan={group.rows.length}
                      >
                        <span className="flex w-full items-center justify-center">{group.hari}</span>
                      </td>
                    )}
                    <td className={`border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.MataKuliah}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.DosenPengampuh}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.SKS}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.Jam}</span>
                    </td>
                    <td className={`border-r border-black px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 dark:border-zinc-600 ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{row.Ruang}</span>
                    </td>
                    <td className={`px-2 py-1.5 text-center align-middle leading-none lg:px-4 lg:py-2.5 ${ketCls} ${cellCls}`}>
                      <span className="flex w-full items-center justify-center">{keterangan}</span>
                    </td>
                  </tr>
                );
              }),
            ); })()}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — visible only on small screens */}
      <div className="sm:hidden flex flex-col gap-3">
        {(() => { let globalIdx = 0; return dayGroups.map((group) => (
          <div key={group.hari}>
            <h3 className="pixel-font mb-1.5 text-[10px] font-bold">{group.hari}</h3>
            <div className="flex flex-col gap-2">
              {group.rows.map((row, idx) => {
                const gi = globalIdx++;
                const collided = collisionMap.get(gi);
                const keterangan = collided
                  ? `${row.Keterangan} (Bentrok dengan jam Mata Kuliah ${collided.join(', ')})`
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
                    className={`border-2 border-black px-3 py-2 dark:border-zinc-600 ${cardCls}`}
                  >
                    <div className="pixel-font mb-1 text-[9px] font-bold leading-tight">
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
          </div>
        )); })()}
      </div>
    </div>
  );
}
