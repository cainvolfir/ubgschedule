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

export function ExportCanvas({ dayGroups, merged }: ExportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || merged.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const totalRows = merged.length;
    const rowHeight = 26;
    const headerHeight = 30;
    const pad = 10;
    const cols = [
      { key: 'Hari', w: 70 },
      { key: 'MataKuliah', w: 200 },
      { key: 'DosenPengampuh', w: 170 },
      { key: 'SKS', w: 40 },
      { key: 'Jam', w: 110 },
      { key: 'Ruang', w: 130 },
      { key: 'Keterangan', w: 80 },
    ];

    let totalW = pad * 2;
    for (const c of cols) totalW += c.w;
    const totalH = pad * 2 + headerHeight + totalRows * rowHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    ctx.scale(dpr, dpr);

    const bc = '#18181b';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    let x = pad;
    let y = pad;

    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(x, y, totalW - pad * 2, headerHeight);

    ctx.strokeStyle = bc;
    ctx.lineWidth = 1;
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#18181b';
    const headers = ['Hari', 'Mata Kuliah', 'Dosen Pengampuh', 'SKS', 'Jam', 'Ruang', 'Keterangan'];
    let hx = x;
    for (let i = 0; i < headers.length; i++) {
      const cw = cols[i].w;
      ctx.strokeRect(hx, y, cw, headerHeight);
      ctx.textAlign = headers[i] === 'SKS' ? 'center' : 'left';
      ctx.fillText(headers[i], headers[i] === 'SKS' ? hx + cw / 2 : hx + 5, y + headerHeight / 2);
      hx += cw;
    }
    y += headerHeight;

    let hariRowIdx = 0;
    for (let gi = 0; gi < dayGroups.length; gi++) {
      const group = dayGroups[gi];
      const gx = x;
      let gy = y + hariRowIdx * rowHeight;

      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(gx, gy, cols[0].w, group.rows.length * rowHeight);

      ctx.strokeStyle = bc;
      ctx.lineWidth = 1;
      ctx.strokeRect(gx, gy, cols[0].w, group.rows.length * rowHeight);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#27272a';

      const lines = group.hari.split(' ');
      const lineH = 12;
      const startY = gy + (group.rows.length * rowHeight - lines.length * lineH) / 2;
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], gx + 5, startY + li * lineH);
      }

      for (let ri = 0; ri < group.rows.length; ri++) {
        const row = group.rows[ri];
        const ry = gy + ri * rowHeight;
        let cx = gx + cols[0].w;

        const vals = [row.MataKuliah, row.DosenPengampuh, row.SKS, row.Jam, row.Ruang, row.Keterangan];
        for (let ci = 0; ci < vals.length; ci++) {
          const cw = cols[ci + 1].w;
          ctx.strokeStyle = bc;
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, ry, cw, rowHeight);
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.textAlign = ci === 2 ? 'center' : 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#27272a';
          ctx.fillText(String(vals[ci] || ''), ci === 2 ? cx + cw / 2 : cx + 4, ry + rowHeight / 2);
          cx += cw;
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
