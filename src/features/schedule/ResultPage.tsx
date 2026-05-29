import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';

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

  const goBack = onBack;

  if (merged.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-sm flex-col items-center justify-center px-3 pt-6">
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
    <div className="mx-auto max-w-lg px-2 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <ArrowLeft size={16} />
          <span className="pixel-font text-[9px]">Back</span>
        </button>
        <p className="pixel-font text-[10px] uppercase tracking-wider text-zinc-400">
          Jadwal Perkuliahan
        </p>
      </div>

      {/* Desktop table — hidden on small screens */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black dark:border-zinc-600">
          <thead>
            <tr className="pixel-font border-b-2 border-black text-[9px] dark:border-zinc-600">
              <th className="border-r border-black px-2 py-1.5 dark:border-zinc-600">Hari</th>
              <th className="border-r border-black px-2 py-1.5 dark:border-zinc-600">Mata Kuliah</th>
              <th className="border-r border-black px-2 py-1.5 dark:border-zinc-600">Dosen Pengampuh</th>
              <th className="border-r border-black px-2 py-1.5 dark:border-zinc-600">SKS</th>
              <th className="border-r border-black px-2 py-1.5 dark:border-zinc-600">Jam</th>
              <th className="border-r border-black px-2 py-1.5 dark:border-zinc-600">Ruang</th>
              <th className="px-2 py-1.5">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {dayGroups.map((group) =>
              group.rows.map((row, idx) => (
                <tr
                  key={`${group.hari}-${idx}`}
                  className="pixel-font border-b border-black text-[9px] dark:border-zinc-700"
                >
                  {idx === 0 && (
                    <td
                      className="border-r border-black px-2 py-1.5 align-top dark:border-zinc-600"
                      rowSpan={group.rows.length}
                    >
                      {group.hari}
                    </td>
                  )}
                  <td className="border-r border-black px-2 py-1.5 dark:border-zinc-600">
                    {row.MataKuliah}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 dark:border-zinc-600">
                    {row.DosenPengampuh}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-center dark:border-zinc-600">
                    {row.SKS}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 dark:border-zinc-600">
                    {row.Jam}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 dark:border-zinc-600">
                    {row.Ruang}
                  </td>
                  <td className="px-2 py-1.5">{row.Keterangan}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — visible only on small screens */}
      <div className="sm:hidden flex flex-col gap-3">
        {dayGroups.map((group) => (
          <div key={group.hari}>
            <h3 className="pixel-font mb-1.5 text-[10px] font-bold">{group.hari}</h3>
            <div className="flex flex-col gap-2">
              {group.rows.map((row, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
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
                    <span className="pixel-font inline-block border border-black px-2 py-0.5 text-[8px] dark:border-zinc-500">
                      {row.Keterangan}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
