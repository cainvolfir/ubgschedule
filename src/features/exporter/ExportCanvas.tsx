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
  opts: { bg?: string; align?: CanvasTextAlign; font?: string; color?: string; padX?: number },
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = opts.bg || '#ffffff';
  ctx.fillRect(x, y, w, h);

  ctx.font = opts.font || '9px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = opts.align || 'left';
  ctx.fillStyle = opts.color || '#27272a';

  const px = opts.padX ?? (opts.align === 'center' ? 0 : 6);
  const tx = opts.align === 'center' ? x + w / 2 : x + px;
  ctx.fillText(text, tx, y + h / 2);

  ctx.restore();

  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export function ExportCanvas({ dayGroups, merged }: ExportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || merged.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const totalRows = merged.length;
    const rowHeight = 40;
    const headerHeight = 46;
    const pad = 40;
    const cols = [
      { key: 'Hari', w: 130 },
      { key: 'MataKuliah', w: 420 },
      { key: 'DosenPengampuh', w: 360 },
      { key: 'SKS', w: 72 },
      { key: 'Jam', w: 190 },
      { key: 'Ruang', w: 320 },
      { key: 'Keterangan', w: 160 },
    ];

    let totalW = pad * 2;
    for (const c of cols) totalW += c.w;
    const totalH = pad * 2 + headerHeight + totalRows * rowHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    ctx.scale(dpr, dpr);

    let x = pad;
    let y = pad;

    const hdrBase = { font: '11px "Press Start 2P", monospace', color: '#18181b' };
    const cellBase = { font: '10px "Press Start 2P", monospace', color: '#27272a' };

    const headers = ['Hari', 'Mata Kuliah', 'Dosen Pengampuh', 'SKS', 'Jam', 'Ruang', 'Keterangan'];
    let hx = x;
    for (let i = 0; i < headers.length; i++) {
      drawCell(ctx, hx, y, cols[i].w, headerHeight, headers[i], {
        ...hdrBase,
        bg: '#f4f4f5',
        align: headers[i] === 'SKS' ? 'center' : 'left',
        padX: headers[i] === 'SKS' ? 0 : 10,
      });
      hx += cols[i].w;
    }
    y += headerHeight;

    let hariRowIdx = 0;
    for (const group of dayGroups) {
      const gx = x;
      const gy = y + hariRowIdx * rowHeight;

      drawCell(ctx, gx, gy, cols[0].w, group.rows.length * rowHeight, group.hari, {
        ...cellBase,
        bg: '#f4f4f5',
        padX: 10,
      });

      for (let ri = 0; ri < group.rows.length; ri++) {
        const row = group.rows[ri];
        const ry = gy + ri * rowHeight;
        let cx = gx + cols[0].w;

        const vals = [row.MataKuliah, row.DosenPengampuh, row.SKS, row.Jam, row.Ruang, row.Keterangan];
        for (let ci = 0; ci < vals.length; ci++) {
          drawCell(ctx, cx, ry, cols[ci + 1].w, rowHeight, String(vals[ci] || ''), {
            ...cellBase,
            align: ci === 2 ? 'center' : 'left',
            padX: ci === 2 ? 0 : 10,
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
