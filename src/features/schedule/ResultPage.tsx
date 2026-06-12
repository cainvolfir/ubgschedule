import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, AlertTriangle } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { CatState } from '../../components/CatState';
import { PixelCat } from '../../components/PixelCat';

const ExportCanvas = lazy(() => import('../../features/exporter/ExportCanvas'));

const HARI_ORDER: Record<string, number> = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 7 };

interface FinalRow {
  Hari: string; MataKuliah: string; DosenPengampuh: string; SKS: string; Jam: string; Ruang: string; Keterangan: string;
}

export function ResultPage({ onBack }: { onBack: () => void }) {
  const jadwalFinal = useJadwalStore((s) => s.jadwalFinal);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const merged = useMemo(() => {
    const all: FinalRow[] = (jadwalFinal as unknown[]).map((r) => {
      const o = r as Record<string, unknown>;
      return { Hari: String(o?.Hari ?? ''), MataKuliah: String(o?.MataKuliah ?? ''), DosenPengampuh: String(o?.DosenPengampuh ?? ''), SKS: String(o?.SKS ?? ''), Jam: String(o?.Jam ?? ''), Ruang: String(o?.Ruang ?? ''), Keterangan: String(o?.Keterangan ?? '-') };
    });
    all.sort((a, b) => { const ha = HARI_ORDER[a.Hari] ?? 99; const hb = HARI_ORDER[b.Hari] ?? 99; if (ha !== hb) return ha - hb; return a.Jam.replace(/[.\s-]/g, '').localeCompare(b.Jam.replace(/[.\s-]/g, '')); });
    return all;
  }, [jadwalFinal]);

  const dayGroups = useMemo(() => {
    const groups: { hari: string; rows: FinalRow[] }[] = [];
    for (const row of merged) { const last = groups[groups.length - 1]; if (last && last.hari === row.Hari) last.rows.push(row); else groups.push({ hari: row.Hari, rows: [row] }); }
    return groups;
  }, [merged]);

  const collisionMap = useMemo(() => {
    const parseJam = (jam: string) => { if (!jam) return null; const m = jam.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/); return m ? { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) } : null; };
    const map = new Map<number, string[]>(); const byDay = new Map<string, number[]>();
    merged.forEach((row, idx) => { if (!byDay.has(row.Hari)) byDay.set(row.Hari, []); byDay.get(row.Hari)!.push(idx); });
    for (const [, indices] of byDay) { for (let i = 0; i < indices.length; i++) { const a = parseJam(merged[indices[i]].Jam); if (!a) continue; for (let j = i + 1; j < indices.length; j++) { const b = parseJam(merged[indices[j]].Jam); if (!b) continue; if (a.start < b.end && b.start < a.end) { const ai = indices[i], bi = indices[j]; if (!map.has(ai)) map.set(ai, []); if (!map.has(bi)) map.set(bi, []); map.get(ai)!.push(merged[bi].MataKuliah); map.get(bi)!.push(merged[ai].MataKuliah); } } } }
    return map;
  }, [merged]);

  const toggleDay = (hari: string) => { setCollapsedDays((prev) => { const next = new Set(prev); if (next.has(hari)) next.delete(hari); else next.add(hari); return next; }); };
  const goBack = onBack;
  const collisionCount = new Set([...collisionMap.keys()]).size;

  if (merged.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-4xl flex-col items-center justify-center px-4 py-6 sm:px-8">
        <CatState pose="sleep" size={80} message="No schedule data available.">
          <Button variant="default" className="pixel-font mt-2 text-[9px]" onClick={goBack}>Back to Upload</Button>
        </CatState>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-card text-foreground shadow-sm transition-all hover:border-[var(--primary)] hover:shadow-md hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="pixel-font text-[10px] uppercase tracking-[0.2em] text-primary">
                Your Schedule
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {merged.length} classes across {dayGroups.length} days
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {collisionCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-[9px] pixel-font text-destructive">
                <AlertTriangle size={12} className="animate-pulse" />
                {collisionCount} collision{collisionCount > 1 ? 's' : ''}
              </div>
            )}
            <Suspense fallback={<span className="pixel-font text-[8px] text-muted-foreground">...</span>}>
              <ExportCanvas dayGroups={dayGroups} merged={merged} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <div className="rounded-xl border-2 border-[var(--border)] shadow-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="pixel-font text-[9px] bg-primary text-primary-foreground">
                {['Hari', 'Mata Kuliah', 'Dosen Pengampuh', 'SKS', 'Jam', 'Ruang', 'Keterangan'].map((h, i, arr) => (
                  <th key={h} className={`px-2 py-3.5 text-center align-middle leading-none lg:px-4 lg:py-4 font-semibold ${i < arr.length - 1 ? 'border-r border-primary-foreground/20' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => { let globalIdx = 0; return dayGroups.map((group) =>
                group.rows.map((row, idx) => {
                  const gi = globalIdx++;
                  const collided = collisionMap.get(gi);
                  const keterangan = collided ? 'Jadwal Bentrok' : row.Keterangan;
                  const cellCls = collided ? 'bg-destructive/5' : '';
                  const ketCls = collided ? 'text-destructive font-semibold' : '';
                  return (
                    <tr
                      key={`${group.hari}-${idx}`}
                      className={`text-[12px] bg-card border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-primary/5 ${collided ? 'hover:bg-destructive/10' : ''}`}
                    >
                      {idx === 0 && (
                        <td className="border-r border-[var(--border)] bg-muted/50 px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4" rowSpan={group.rows.length}>
                          <span className="flex w-full items-center justify-center font-bold text-sm">{group.hari}</span>
                        </td>
                      )}
                      <td className={`border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 ${cellCls}`}>
                        <span className="flex w-full items-center justify-center font-medium">{row.MataKuliah}</span>
                      </td>
                      <td className={`border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 ${cellCls}`}>
                        <span className="flex w-full items-center justify-center">{row.DosenPengampuh}</span>
                      </td>
                      <td className={`border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 ${cellCls}`}>
                        <span className="flex w-full items-center justify-center">{row.SKS}</span>
                      </td>
                      <td className={`border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 ${cellCls}`}>
                        <span className="flex w-full items-center justify-center font-medium">{row.Jam}</span>
                      </td>
                      <td className={`border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 ${cellCls}`}>
                        <span className="flex w-full items-center justify-center">{row.Ruang}</span>
                      </td>
                      <td className={`px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4 ${ketCls} ${cellCls}`}>
                        <span className="flex w-full items-center justify-center">
                          {collided && <AlertTriangle size={10} className="mr-1 animate-pulse" />}
                          {keterangan}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ); })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {(() => { let globalIdx = 0; return dayGroups.map((group) => {
          const isCollapsed = collapsedDays.has(group.hari);
          const hasCollision = group.rows.some((_, idx) => collisionMap.get(globalIdx + idx));
          return (
            <div key={group.hari}>
              <button
                onClick={() => toggleDay(group.hari)}
                className={`flex w-full items-center justify-between rounded-xl border-2 px-3 py-3 text-left transition-all ${
                  hasCollision
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-[var(--border)] bg-muted'
                } shadow-sm`}
              >
                <div className="flex items-center gap-2.5">
                  <PixelCat pose={hasCollision ? "blink" : "idle"} size={18} />
                  <span className="pixel-font text-[10px] font-bold">{group.hari}</span>
                  <span className="rounded-full bg-card/80 px-2 py-0.5 text-[8px] pixel-font text-muted-foreground border border-[var(--border)]">
                    {group.rows.length}
                  </span>
                  {hasCollision && <AlertTriangle size={12} className="text-destructive animate-pulse" />}
                </div>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
              </button>

              {!isCollapsed && (
                <div className="border-2 border-t-0 border-[var(--border)] rounded-b-xl px-2 py-2 bg-card-solid/50">
                  {group.rows.map((row, idx) => {
                    const rowIdx = globalIdx++;
                    const collided = collisionMap.get(rowIdx);
                    const keterangan = collided ? 'Jadwal Bentrok' : row.Keterangan;
                    const cardCls = collided ? 'bg-destructive/5 border-destructive/30' : 'bg-card hover:bg-primary/5';
                    const ketCls = collided
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-[var(--border)] bg-muted/50 text-muted-foreground';
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border-2 px-3 py-2.5 shadow-sm transition-all ${cardCls}`}
                      >
                        <div className="mb-1.5 text-[13px] font-bold leading-tight">{row.MataKuliah}</div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>Dosen</span><span className="text-foreground font-medium">{row.DosenPengampuh}</span>
                          <span>SKS</span><span className="text-foreground font-medium">{row.SKS}</span>
                          <span>Jam</span><span className="text-foreground font-medium">{row.Jam}</span>
                          <span>Ruang</span><span className="text-foreground font-medium">{row.Ruang}</span>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${ketCls}`}>
                            {collided && <AlertTriangle size={10} className="animate-pulse" />}
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

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Classes', value: merged.length },
          { label: 'Days', value: dayGroups.length },
          { label: 'Collisions', value: collisionCount },
          { label: 'Total SKS', value: merged.reduce((s, r) => s + (parseInt(r.SKS) || 0), 0) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border-2 border-[var(--border)] bg-card-solid p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-foreground">{stat.value}</p>
            <p className="pixel-font mt-0.5 text-[6px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
