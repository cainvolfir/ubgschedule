import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, MapPin, UserCircle, Copy, Image, Prohibit,
  CheckCircle, Warning, ArrowLeft, Trash, PencilSimple,
} from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import { useJadwalStore, type DataTeoriMentah, type PraktikumCandidate } from '../store/useJadwalStore';

interface ResultProps { onBack?: () => void; }

interface UnifiedClass {
  id: string; kode: string; nama: string; kelas: string; sks: string;
  hari: string; jam: string; ruang: string; dosen: string; isPraktikum: boolean;
}

const HARI_ORDER = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];

function parseTimeToMinutes(jam: string): { start: number; end: number } | null {
  const m = jam.match(/(\d{2})[.:](\d{2})\s*[-\u2013]\s*(\d{2})[.:](\d{2})/);
  if (!m) return null;
  return { start: parseInt(m[1])*60+parseInt(m[2]), end: parseInt(m[3])*60+parseInt(m[4]) };
}

function timesOverlap(a: string, b: string): boolean {
  const ta = parseTimeToMinutes(a), tb = parseTimeToMinutes(b);
  if (!ta || !tb) return false;
  return ta.start < tb.end && tb.start < ta.end;
}

function findCollisions(classes: UnifiedClass[]): Set<string> {
  const collided = new Set<string>();
  const byDay: Record<string, UnifiedClass[]> = {};
  for (const c of classes) { if (!byDay[c.hari]) byDay[c.hari] = []; byDay[c.hari].push(c); }
  for (const dayClasses of Object.values(byDay)) {
    for (let i = 0; i < dayClasses.length; i++) {
      for (let j = i + 1; j < dayClasses.length; j++) {
        if (timesOverlap(dayClasses[i].jam, dayClasses[j].jam)) {
          collided.add(dayClasses[i].id); collided.add(dayClasses[j].id);
        }
      }
    }
  }
  return collided;
}

export default function ResultStep({ onBack }: ResultProps) {
  const { jadwalTeoriTerpilih, selectedCandidateIds, praktikumCandidates, reset, setWizardStep } = useJadwalStore();
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const triggerSuccess = useCallback((key: string) => {
    setExportSuccess(key); setTimeout(() => setExportSuccess(null), 2000);
  }, []);

  const unified: UnifiedClass[] = useMemo(() => {
    const theory: UnifiedClass[] = jadwalTeoriTerpilih.map((r: DataTeoriMentah) => ({
      id: r.id, kode: r.KodeMK, nama: r.MataKuliah, kelas: r.Kelas,
      sks: r.SKS, hari: r.Hari, jam: r.Jam, ruang: r.Ruang, dosen: r.DosenPengampuh, isPraktikum: false,
    }));
    const prak: UnifiedClass[] = praktikumCandidates
      .filter((c: PraktikumCandidate) => selectedCandidateIds.includes(c.id))
      .map((c: PraktikumCandidate) => ({
        id: c.id, kode: c.courseName, nama: c.courseName, kelas: c.kelas,
        sks: '1', hari: c.hari, jam: c.jam, ruang: c.ruang, dosen: c.dosen, isPraktikum: true,
      }));
    return [...theory, ...prak];
  }, [jadwalTeoriTerpilih, selectedCandidateIds, praktikumCandidates]);

  const collisions = useMemo(() => findCollisions(unified), [unified]);
  const collisionCount = collisions.size;

  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedClass[]>();
    for (const c of unified) { const arr = map.get(c.hari) || []; arr.push(c); map.set(c.hari, arr); }
    return map;
  }, [unified]);

  const totalSKS = useMemo(() => unified.reduce((s, c) => s + parseInt(c.sks || '0'), 0), [unified]);
  const totalKelas = unified.length;

  const copyToClipboard = useCallback(() => {
    const lines: string[] = ['JADWAL UBG SCHEDULE', '=================='];
    for (const hari of HARI_ORDER) {
      const items = grouped.get(hari);
      if (!items || items.length === 0) continue;
      lines.push('', hari.toUpperCase());
      for (const c of items.sort((a: UnifiedClass, b: UnifiedClass) => (parseTimeToMinutes(a.jam)?.start ?? 0) - (parseTimeToMinutes(b.jam)?.start ?? 0))) {
        lines.push('  ' + c.jam + ' | ' + c.nama + ' (' + c.kelas + ') | ' + c.ruang + ' | ' + c.dosen + ' | ' + c.sks + ' SKS' + (c.isPraktikum ? ' [Praktikum]' : ''));
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
    triggerSuccess('copy');
  }, [grouped, triggerSuccess]);

  const downloadImage = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 1080;
    const pad = 40;
    const bw = 3;
    const rowH = 44;
    const headerRowH = 50;
    const titleH = 90;
    const dayH = 42;
    const colW = [130, 180, 200, 80, 60, 100, 190];
    const colH = ['Hari', 'Jam', 'Mata Kuliah', 'Kelas', 'SKS', 'Ruang', 'Dosen'];
    const tableW = colW.reduce((a, b) => a + b, 0);
    const tableX = (W - tableW) / 2;
    const tblRows: { hari: string; jam: string; nama: string; kelas: string; sks: string; ruang: string; dosen: string; collided: boolean; praktikum: boolean }[] = [];
    for (const hari of HARI_ORDER) {
      const items = grouped.get(hari);
      if (!items || items.length === 0) continue;
      const sorted = items.sort((a: UnifiedClass, b: UnifiedClass) => (parseTimeToMinutes(a.jam)?.start ?? 0) - (parseTimeToMinutes(b.jam)?.start ?? 0));
      for (const c of sorted) {
        tblRows.push({ hari, jam: c.jam, nama: c.nama, kelas: c.kelas, sks: c.sks, ruang: c.ruang, dosen: c.dosen, collided: collisions.has(c.id), praktikum: c.isPraktikum });
      }
    }
    const daySec = new Map<string, number>();
    for (const r of tblRows) daySec.set(r.hari, (daySec.get(r.hari) || 0) + 1);
    const totalH = pad + titleH + (tblRows.length * rowH) + (daySec.size * dayH) + headerRowH + pad + 20;
    canvas.width = W * 2; canvas.height = totalH * 2;
    canvas.style.width = W + 'px'; canvas.style.height = totalH + 'px';
    ctx.scale(2, 2);
    ctx.fillStyle = '#EFF6FF'; ctx.fillRect(0, 0, W, totalH);
    const bx = (x: number, y: number, w: number, h: number, fill: string) => {
      ctx.fillStyle = '#000'; ctx.fillRect(x + bw / 2, y + bw / 2, w, h);
      ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#000'; ctx.lineWidth = bw; ctx.strokeRect(x, y, w, h);
    };
    let curY = pad;
    bx(tableX - 10, curY - 5, tableW + 20, titleH - 10, '#3B82F6');
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 28px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JADWAL UBG SCHEDULE', W / 2, curY + 30);
    ctx.font = 'bold 14px "Space Grotesk", system-ui, sans-serif';
    ctx.fillText(totalSKS + ' SKS  |  ' + totalKelas + ' Kelas' + (collisionCount > 0 ? '  |  ' + collisionCount + ' Bentrok!' : ''), W / 2, curY + 54);
    ctx.textAlign = 'left';
    curY += titleH;
    bx(tableX, curY, tableW, headerRowH, '#000000');
    let cx = tableX;
    ctx.font = 'bold 13px "Space Grotesk", system-ui, sans-serif'; ctx.fillStyle = '#FFF';
    for (let i = 0; i < colH.length; i++) { ctx.fillText(colH[i], cx + 10, curY + 30); cx += colW[i]; }
    curY += headerRowH;
    let currentDay = '';
    for (const r of tblRows) {
      if (r.hari !== currentDay) {
        currentDay = r.hari;
        bx(tableX, curY, tableW, dayH, '#FFD13B');
        ctx.fillStyle = '#000'; ctx.font = 'bold 16px "Space Grotesk", system-ui, sans-serif';
        ctx.fillText(currentDay.toUpperCase(), tableX + 12, curY + 28);
        curY += dayH;
      }
      const bg = r.collided ? '#FFD13B' : r.praktikum ? '#FF90E8' : '#FFFFFF';
      bx(tableX, curY, tableW, rowH, bg);
      const vals = [r.jam, r.nama, r.kelas, r.sks, r.ruang, r.dosen];
      let cx2 = tableX + colW[0];
      ctx.font = '12px "Space Grotesk", system-ui, sans-serif'; ctx.fillStyle = '#000';
      for (let i = 0; i < vals.length; i++) {
        let txt = vals[i];
        const mw = colW[i + 1] - 16;
        while (ctx.measureText(txt).width > mw && txt.length > 3) txt = txt.slice(0, -1);
        if (txt !== vals[i]) txt += '...';
        ctx.fillText(txt, cx2 + 8, curY + 28);
        cx2 += colW[i + 1];
      }
      if (r.collided) {
        ctx.fillStyle = '#F43F5E'; ctx.font = 'bold 10px "Space Grotesk", system-ui, sans-serif';
        ctx.fillText('BENTROK', tableX + tableW - 72, curY + 28);
      }
      if (r.praktikum) {
        ctx.fillStyle = '#000'; ctx.font = 'bold 9px "Space Grotesk", system-ui, sans-serif';
        ctx.fillText('[PRK]', tableX + 4, curY + 28);
      }
      curY += rowH;
    }
    curY += 10;
    ctx.fillStyle = '#000'; ctx.font = '11px "Space Grotesk", system-ui, sans-serif';
    ctx.fillText('* Made with UBG Schedule - ubgjadwal.vercel.app', pad, curY);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'ubg-schedule.png'; a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
    triggerSuccess('image');
  }, [grouped, totalSKS, totalKelas, collisionCount, collisions, triggerSuccess]);

  const handleReset = useCallback(() => {
    reset();
    setWizardStep(1);
  }, [reset, setWizardStep]);

  return (
    <div className="bg-background">
      <WizardHeader currentStep={3} />
      <main className="p-4 md:p-8 pb-32">
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* LEFT: Schedule List */}
          <div className="flex-1 flex flex-col gap-8 order-2 lg:order-1">
            <div className="flex items-end justify-between border-b-4 border-black pb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight">Jadwal Akhir</h1>
                <p className="font-semibold text-lg mt-2 text-gray-800">Periksa kembali jadwalmu. Siap untuk diekspor!</p>
              </div>
              <button onClick={onBack} className="bg-white border-3 border-black px-3 py-2 font-bold transition-all inline-flex items-center gap-2 shadow-[2px_2px_0px_#000000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000000] text-sm shrink-0">
                <ArrowLeft weight="bold" /><span className="hidden md:inline">Kembali</span>
              </button>
            </div>

            {unified.length === 0 && (
              <div className="text-center py-16 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0px_#000000]">
                <p className="font-bold text-xl text-gray-500">Belum ada jadwal dipilih.</p>
                <p className="font-medium text-gray-400 mt-2">Kembali ke langkah sebelumnya untuk memilih kelas.</p>
              </div>
            )}

            {HARI_ORDER.map(hari => {
              const items = grouped.get(hari);
              if (!items || items.length === 0) return null;
              return (
                <section key={hari} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-black rounded-full" />
                    <h2 className="text-2xl font-black uppercase tracking-wide">{hari}</h2>
                    <div className="h-1 bg-black flex-1 rounded-full opacity-10" />
                  </div>
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    {items.sort((a: UnifiedClass, b: UnifiedClass) => (parseTimeToMinutes(a.jam)?.start ?? 0) - (parseTimeToMinutes(b.jam)?.start ?? 0)).map((c: UnifiedClass) => {
                      const isCollided = collisions.has(c.id);
                      const cardBg = isCollided ? 'bg-[#FFD13B]' : c.isPraktikum ? 'bg-secondary' : 'bg-white';
                      return (
                        <motion.div key={c.id} className={"relative border-4 border-black rounded-xl p-5 shadow-[4px_4px_0px_#000000] hover:-translate-y-1 transition-transform group " + cardBg}>
                          {isCollided && (
                            <motion.div
                              className="absolute -top-4 -right-2 bg-error text-white border-3 border-black px-3 py-1 font-black text-sm rounded-full shadow-[2px_2px_0px_#000000] flex items-center gap-1 z-10"
                              animate={{ x: [-3, 3, -3, 3, 0] }}
                              transition={{ duration: 0.25, repeat: Infinity, repeatDelay: 3 }}
                            >
                              <Warning weight="bold" /> Bentrok!
                            </motion.div>
                          )}
                          {c.isPraktikum && !isCollided && (
                            <div className="absolute top-4 right-4 bg-black text-white px-2 py-1 text-[10px] font-black uppercase rounded">Praktikum</div>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2">
                              <span className={(c.isPraktikum ? 'bg-white text-black' : 'bg-tertiary text-white') + " px-2 py-0.5 text-xs font-extrabold border-2 border-black rounded-full uppercase"}>{c.kode}</span>
                              <span className="bg-black text-white px-2 py-0.5 text-xs font-extrabold rounded-full">{c.sks} SKS</span>
                            </div>
                            {!c.isPraktikum && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="w-8 h-8 flex items-center justify-center bg-[#DBEAFE] border-2 border-black rounded-md hover:bg-tertiary hover:text-white transition-colors"><PencilSimple weight="bold" /></button>
                                <button className="w-8 h-8 flex items-center justify-center bg-red-100 border-2 border-black rounded-md hover:bg-error hover:text-white transition-colors"><Trash weight="bold" /></button>
                              </div>
                            )}
                          </div>
                          <h3 className={"text-xl font-black leading-tight mb-4 uppercase " + (c.isPraktikum && !isCollided ? 'pr-16' : '')}>{c.nama}</h3>
                          <div className={"space-y-2 text-sm font-bold border-2 border-black rounded-lg p-3 " + (isCollided ? 'bg-white/70' : c.isPraktikum ? 'bg-white/70 backdrop-blur-sm' : 'bg-background')}>
                            <div className="flex items-center gap-2"><Clock weight="bold" className={"text-lg " + (isCollided ? 'text-error' : '')} /> {c.jam}</div>
                            <div className="flex items-center gap-2"><MapPin weight="bold" className="text-lg text-tertiary" /> {c.ruang}</div>
                            <div className="flex items-center gap-2 truncate"><UserCircle weight="bold" className="text-lg text-tertiary" /> {c.dosen}</div>
                            </div>
                          </motion.div>
                      );
                    })}
                  </motion.div>
                </section>
              );
            })}
          </div>

          {/* RIGHT: Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 order-1 lg:order-2">
            <div className="lg:sticky lg:top-28 bg-white border-4 border-black p-6 shadow-[4px_4px_0px_#000000] flex flex-col gap-6">
              <h3 className="text-xl font-black border-b-4 border-black pb-2">Ringkasan</h3>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">Total SKS</span>
                <span className="font-black bg-primary px-3 py-1 border-3 border-black rounded-lg shadow-[2px_2px_0px_#000000]">{totalSKS}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">Total Kelas</span>
                <span className="font-black bg-secondary px-3 py-1 border-3 border-black rounded-lg shadow-[2px_2px_0px_#000000]">{totalKelas}</span>
              </div>

              {collisionCount > 0 && (
                <div className="bg-red-100 border-3 border-error rounded-xl p-3 flex gap-3">
                  <Warning weight="fill" className="text-error shrink-0 text-lg" />
                  <p className="text-sm font-bold leading-snug">Ada <strong>{collisionCount}</strong> kelas yang memiliki jadwal bertabrakan!</p>
                </div>
              )}

              <div className="h-1 bg-black rounded-full opacity-10" />

              <div className="flex flex-col gap-3">
                <button onClick={copyToClipboard} className={"w-full flex items-center justify-between border-3 border-black p-3 rounded-xl shadow-[4px_4px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all group font-bold " + (exportSuccess === 'copy' ? 'bg-green-100 border-green-500 text-green-600' : 'bg-white')}>
                  {exportSuccess === 'copy' ? (<><CheckCircle weight="bold" className="text-xl text-green-600" /> Tersalin!</>) : (<><Copy weight="bold" className="text-xl" /> <span>Salin Teks</span> <span className="opacity-0 group-hover:opacity-100 transition-opacity">{'\u2192'}</span></>)}
                </button>
                <button onClick={downloadImage} className={"w-full flex items-center justify-between border-3 border-black p-3 rounded-xl shadow-[4px_4px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all group font-bold " + (exportSuccess === 'image' ? 'bg-green-100 border-green-500 text-green-600' : 'bg-white')}>
                  {exportSuccess === 'image' ? (<><CheckCircle weight="bold" className="text-xl text-green-600" /> Terunduh!</>) : (<><Image weight="bold" className="text-xl text-error" /> <span>Unduh Gambar</span> <span className="opacity-0 group-hover:opacity-100 transition-opacity">{'\u2192'}</span></>)}
                </button>
                <button onClick={handleReset} className="w-full flex items-center justify-center bg-error text-white border-3 border-black p-3 rounded-xl shadow-[4px_4px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all group font-extrabold uppercase mt-2">
                  <div className="flex items-center gap-2"><Prohibit weight="bold" className="text-xl" /> <span>Reset Semua</span></div>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
