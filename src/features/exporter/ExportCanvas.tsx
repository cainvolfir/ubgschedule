import { useRef, useCallback } from 'react';
import { Button } from '../../components/ui/pixelact-ui/button';

interface FinalRow {
  Hari: string;
  MataKuliah: string;
  DosenPengampuh: string;
  SKS: string;
  Jam: string;
  Ruang: string;
  Keterangan: string;
}

interface DayGroup {
  hari: string;
  rows: FinalRow[];
}

interface ExportCanvasProps {
  dayGroups: DayGroup[];
  merged: FinalRow[];
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  opts: { bg?: string; align?: CanvasTextAlign; font?: string; color?: string; padX?: number; lineH?: number },
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = opts.bg || '#ffffff';
  ctx.fillRect(x, y, w, h);

  ctx.font = opts.font || '18px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = opts.align || 'left';
  ctx.fillStyle = opts.color || '#27272a';

  const px = opts.padX ?? (opts.align === 'center' ? 0 : 12);
  const lh = opts.lineH || 26;
  const maxW = w - px - 12;
  const maxLines = Math.max(1, Math.floor((h - 12) / lh));
  const words = text.split(' ');

  // build wrapped lines
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && cur) {
      if (lines.length >= maxLines) break;
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);

  const totalTextH = lines.length * lh;
  const startY = y + (h - totalTextH) / 2;

  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    const tx = opts.align === 'center' ? x + w / 2 : x + px;
    ctx.fillText(lines[i], tx, startY + i * lh);
  }

  ctx.restore();

  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

export function ExportCanvas({ dayGroups, merged }: ExportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || merged.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-resolution scale factor — 4x for crisp text when zoomed
    const SCALE = 4;

    const totalRows = merged.length;
    const rowHeight = 88;       // 44 * 2
    const headerHeight = 96;    // 48 * 2
    const pad = 120;            // 60 * 2
    const cols = [
      { key: 'Hari', w: 200 },       // 100 * 2
      { key: 'MataKuliah', w: 440 }, // 220 * 2
      { key: 'DosenPengampuh', w: 360 }, // 180 * 2
      { key: 'SKS', w: 120 },        // 60 * 2
      { key: 'Jam', w: 280 },        // 140 * 2
      { key: 'Ruang', w: 260 },      // 130 * 2
      { key: 'Keterangan', w: 360 }, // 180 * 2
    ];

    let totalW = pad * 2;
    for (const c of cols) totalW += c.w;
    const totalH = pad * 2 + headerHeight + totalRows * rowHeight;

    canvas.width = totalW * SCALE;
    canvas.height = totalH * SCALE;
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, totalW - 24, totalH - 24);

    const x = pad;
    let y = pad;

    const hdrBase = { font: 'bold 22px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#18181b' };
    const cellBase = { font: '20px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#27272a' };

    const headers = ['Hari', 'Mata Kuliah', 'Dosen Pengampuh', 'SKS', 'Jam', 'Ruang', 'Keterangan'];
    let hx = x;
    for (let i = 0; i < headers.length; i++) {
      drawCell(ctx, hx, y, cols[i].w, headerHeight, headers[i], {
        ...hdrBase,
        bg: '#f4f4f5',
        align: 'center',
        padX: 0,
        lineH: 28,
      });
      hx += cols[i].w;
    }
    y += headerHeight;

    const parseJam = (jam: string) => {
      const m = jam.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/);
      if (!m) return null;
      return { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) };
    };
    const collisionMap = new Map<number, string[]>();
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
            if (!collisionMap.has(ai)) collisionMap.set(ai, []);
            if (!collisionMap.has(bi)) collisionMap.set(bi, []);
            collisionMap.get(ai)!.push(merged[bi].MataKuliah);
            collisionMap.get(bi)!.push(merged[ai].MataKuliah);
          }
        }
      }
    }

    let hariRowIdx = 0;
    let globalIdx = 0;
    for (const group of dayGroups) {
      const gx = x;
      const gy = y + hariRowIdx * rowHeight;

      drawCell(ctx, gx, gy, cols[0].w, group.rows.length * rowHeight, group.hari, {
        ...cellBase,
        bg: '#f4f4f5',
        padX: 20,
        lineH: 26,
      });

      for (let ri = 0; ri < group.rows.length; ri++) {
        const row = group.rows[ri];
        const gi = globalIdx++;
        const collided = collisionMap.get(gi);
        const keterangan = collided
          ? 'Jadwal Bentrok'
          : row.Keterangan;
        const cellBg = collided ? '#fef2f2' : '#ffffff';
        const cellColor = collided ? '#991b1b' : '#27272a';

        const ry = gy + ri * rowHeight;
        let cx = gx + cols[0].w;

        const vals = [row.MataKuliah, row.DosenPengampuh, row.SKS, row.Jam, row.Ruang, keterangan];
        for (let ci = 0; ci < vals.length; ci++) {
          drawCell(ctx, cx, ry, cols[ci + 1].w, rowHeight, String(vals[ci] || ''), {
            font: '20px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: cellColor,
            bg: cellBg,
            align: 'center',
            padX: 0,
            lineH: 26,
          });
          cx += cols[ci + 1].w;
        }
      }
      hariRowIdx += group.rows.length;
    }

    const link = document.createElement('a');
    link.download = 'jadwal-perkuliahan.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [dayGroups, merged]);

  if (merged.length === 0) return null;

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <Button
        variant="default"
        onClick={handleExport}
        className="pixel-font text-[9px]"
      >
        Export PNG
      </Button>
    </>
  );
}

export default ExportCanvas;
