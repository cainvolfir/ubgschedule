import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Time slots from 07:00 to 21:00 in 30-min increments
const START_HOUR = 7;
const END_HOUR = 21;

interface FinalRow {
  Hari: string;
  MataKuliah: string;
  DosenPengampuh: string;
  SKS: string;
  Jam: string;
  Ruang: string;
  Keterangan: string;
}

interface WeeklyGridProps {
  merged: FinalRow[];
  collisionMap: Map<number, number[]>;
  courseColors: Record<string, string>;
  onEdit: (globalIdx: number) => void;
  onDelete: (globalIdx: number) => void;
}

function parseTimeToSlot(jam: string): { startSlot: number; endSlot: number } | null {
  const m = jam.match(/^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/);
  if (!m) return null;
  const startHour = parseInt(m[1]);
  const startMin = parseInt(m[2]);
  const endHour = parseInt(m[3]);
  const endMin = parseInt(m[4]);

  const startSlot = (startHour - START_HOUR) * 2 + (startMin >= 30 ? 1 : 0);
  const endSlot = (endHour - START_HOUR) * 2 + (endMin > 0 ? (endMin >= 30 ? 2 : 1) : 0);

  return { startSlot: Math.max(0, startSlot), endSlot: Math.max(startSlot + 1, endSlot) };
}

function slotToTime(slot: number): string {
  const totalMin = START_HOUR * 60 + slot * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function WeeklyGrid({ merged, collisionMap, courseColors, onEdit, onDelete }: WeeklyGridProps) {
  const totalSlots = (END_HOUR - START_HOUR) * 2;

  // Build a grid: hari -> slot -> { row, globalIdx, span }
  const grid = useMemo(() => {
    const g: Record<string, { row: FinalRow; globalIdx: number; span: number; startSlot: number }[]> = {};
    for (const hari of HARI_LIST) g[hari] = [];

    merged.forEach((row, globalIdx) => {
      if (!HARI_LIST.includes(row.Hari)) return;
      const time = parseTimeToSlot(row.Jam);
      if (!time) return;
      g[row.Hari].push({ row, globalIdx, span: time.endSlot - time.startSlot, startSlot: time.startSlot });
    });

    return g;
  }, [merged]);

  // Get color for a course
  const getColor = (courseName: string): string | undefined => courseColors[courseName];

  // Time labels (every hour)
  const timeLabels: { slot: number; label: string }[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    timeLabels.push({ slot: (h - START_HOUR) * 2, label: `${String(h).padStart(2, '0')}:00` });
  }

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-[var(--border)] shadow-lg">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid border-b-2 border-[var(--border)] bg-primary text-primary-foreground" style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}>
          <div className="pixel-font text-[7px] px-2 py-3 text-center font-semibold border-r border-primary-foreground/20">
            Waktu
          </div>
          {HARI_LIST.map((hari) => (
            <div key={hari} className="pixel-font text-[7px] px-2 py-3 text-center font-semibold border-r border-primary-foreground/20 last:border-r-0">
              {hari}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="relative" style={{ height: `${totalSlots * 32}px` }}>
          {/* Horizontal grid lines */}
          {timeLabels.map((tl) => (
            <div
              key={tl.slot}
              className="absolute left-0 right-0 border-b border-[var(--border)] flex items-start"
              style={{ top: `${tl.slot * 32}px`, height: '32px' }}
            >
              <div className="pixel-font text-[7px] text-muted-foreground w-[60px] px-2 pt-1 shrink-0 -translate-y-1/2">
                {tl.label}
              </div>
            </div>
          ))}

          {/* Day columns */}
          {HARI_LIST.map((hari, dayIdx) => (
            <div
              key={hari}
              className="absolute top-0 bottom-0"
              style={{
                left: `calc(60px + ${(dayIdx / 6) * 100}%)`,
                width: `${100 / 6}%`,
                borderRight: dayIdx < 5 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Half-hour grid lines */}
              {Array.from({ length: totalSlots / 2 - 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-b border-[var(--border)]/40"
                  style={{ top: `${(i + 1) * 64}px` }}
                />
              ))}

              {/* Course blocks */}
              {grid[hari].map((item) => {
                const bgColor = getColor(item.row.MataKuliah);
                const isDark = bgColor ? getLuminance(bgColor) < 0.5 : false;
                const isCollided = (collisionMap.get(item.globalIdx) || []).length > 0;

                return (
                  <div
                    key={`${item.globalIdx}`}
                    className={cn(
                      'absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group/card',
                      isCollided && 'ring-2 ring-destructive/50',
                    )}
                    style={{
                      top: `${item.startSlot * 32}px`,
                      height: `${item.span * 32}px`,
                      backgroundColor: bgColor || 'var(--card)',
                      border: `2px solid ${bgColor || 'var(--border)'}`,
                    }}
                    onClick={() => onEdit(item.globalIdx)}
                    title={`${item.row.MataKuliah}\n${item.row.Jam} • ${item.row.Ruang || '-'}\n${item.row.DosenPengampuh || '-'}`}
                  >
                    <div className={cn('text-[10px] font-bold leading-tight truncate', isDark ? 'text-white' : 'text-card-foreground')}>
                      {item.row.MataKuliah}
                    </div>
                    {item.span >= 2 && (
                      <div className={cn('text-[8px] mt-0.5', isDark ? 'text-white/80' : 'text-muted-foreground')}>
                        {item.row.Jam}
                      </div>
                    )}
                    {item.span >= 3 && (
                      <div className={cn('text-[8px]', isDark ? 'text-white/70' : 'text-muted-foreground')}>
                        {item.row.Ruang || ''}
                      </div>
                    )}
                    {isCollided && (
                      <AlertTriangle size={10} className="absolute top-1 right-1 text-destructive animate-pulse" />
                    )}
                    {/* Hover actions */}
                    <div className="absolute top-0.5 right-0.5 hidden group-hover/card:flex gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item.globalIdx); }}
                        className="flex h-5 w-5 items-center justify-center rounded bg-black/40 text-white/90 hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
