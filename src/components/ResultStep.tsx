import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, MapPin, UserCircle, Copy, Image, Prohibit,
  CheckCircle, Warning, ArrowLeft, Trash, PencilSimple,
} from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import { EditModal } from './EditModal';
import { useJadwalStore, type DataTeoriMentah, type PraktikumCandidate } from '../store/useJadwalStore';

interface ResultProps { onBack?: () => void; }

interface UnifiedClass {
  id: string; kode: string; nama: string; kelas: string; keterangan: string; sks: string;
  hari: string; jam: string; ruang: string; dosen: string; isPraktikum: boolean;
}

function mergeSequentialSlots(classes: UnifiedClass[]): UnifiedClass[] {
  const prakOnly = classes.filter(c => c.isPraktikum);
  const theoryOnly = classes.filter(c => !c.isPraktikum);
  const groups = new Map<string, UnifiedClass[]>();
  for (const c of prakOnly) {
    const key = [c.hari, c.nama, c.kelas, c.keterangan, c.ruang, c.dosen].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const merged: UnifiedClass[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => {
      const ta = parseTimeToMinutes(a.jam), tb = parseTimeToMinutes(b.jam);
      return (ta?.start ?? 0) - (tb?.start ?? 0);
    });
    let current = { ...group[0] };
    let totalSKS = parseInt(current.sks) || 1;
    for (let i = 1; i < group.length; i++) {
      const prevEnd = parseTimeToMinutes(current.jam);
      const nextStart = parseTimeToMinutes(group[i].jam);
      if (prevEnd && nextStart && prevEnd.end === nextStart.start) {
        const sm = String(Math.floor(prevEnd.start / 60)).padStart(2, '0') + '.' + String(prevEnd.start % 60).padStart(2, '0');
        const em = String(Math.floor(nextStart.end / 60)).padStart(2, '0') + '.' + String(nextStart.end % 60).padStart(2, '0');
        current.jam = sm + '-' + em;
        totalSKS += parseInt(group[i].sks) || 1;
      } else {
        current.sks = String(totalSKS);
        merged.push(current);
        current = { ...group[i] };
        totalSKS = parseInt(current.sks) || 1;
      }
    }
    current.sks = String(totalSKS);
    merged.push(current);
  }
  return [...theoryOnly, ...merged];
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
  const { jadwalTeoriTerpilih, selectedCandidateIds, praktikumCandidates, selectedTheoryRowIds, setJadwalTeoriTerpilih, setSelectedTheoryRowIds, setPraktikumCandidates, toggleCandidateId, reset, setWizardStep } = useJadwalStore();
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<UnifiedClass | null>(null);

  const triggerSuccess = useCallback((key: string) => {
    setExportSuccess(key); setTimeout(() => setExportSuccess(null), 2000);
  }, []);

  const handleDelete = useCallback((item: UnifiedClass) => {
    if (item.isPraktikum) {
      toggleCandidateId(item.id);
    } else {
      setJadwalTeoriTerpilih(jadwalTeoriTerpilih.filter((t) => t.id !== item.id));
      setSelectedTheoryRowIds(selectedTheoryRowIds.filter((id) => id !== item.id));
    }
  }, [toggleCandidateId, setJadwalTeoriTerpilih, setSelectedTheoryRowIds, jadwalTeoriTerpilih, selectedTheoryRowIds]);

  const handleSaveEdit = useCallback((updated: UnifiedClass) => {
    if (updated.isPraktikum) {
      setPraktikumCandidates(praktikumCandidates.map(p => p.id === updated.id ? { ...p, courseName: updated.nama, kelas: updated.kelas, keterangan: updated.keterangan, dosen: updated.dosen, hari: updated.hari, jam: updated.jam, ruang: updated.ruang } : p));
    } else {
      setJadwalTeoriTerpilih(jadwalTeoriTerpilih.map(t => t.id === updated.id ? { ...t, MataKuliah: updated.nama, Kelas: updated.kelas, SKS: updated.sks, DosenPengampuh: updated.dosen, Hari: updated.hari, Jam: updated.jam, Ruang: updated.ruang } : t));
    }
    setEditingClass(null);
  }, [praktikumCandidates, setPraktikumCandidates, jadwalTeoriTerpilih, setJadwalTeoriTerpilih]);

  const unified: UnifiedClass[] = useMemo(() => {
    const theory: UnifiedClass[] = jadwalTeoriTerpilih.map((r: DataTeoriMentah) => ({
      id: r.id, kode: r.KodeMK, nama: r.MataKuliah, kelas: r.Kelas, keterangan: r.Keterangan || '',
      sks: r.SKS, hari: r.Hari, jam: r.Jam, ruang: r.Ruang, dosen: r.DosenPengampuh, isPraktikum: false,
    }));
    const prak: UnifiedClass[] = praktikumCandidates
      .filter((c: PraktikumCandidate) => selectedCandidateIds.includes(c.id))
      .map((c: PraktikumCandidate) => ({
        id: c.id, kode: c.courseName, nama: c.courseName, kelas: c.kelas, keterangan: c.keterangan || '',
        sks: '1', hari: c.hari, jam: c.jam, ruang: c.ruang, dosen: c.dosen, isPraktikum: true,
      }));
    return mergeSequentialSlots([...theory, ...prak]);
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

    // --- Constants ---
    const W = 1200;              // logical width
    const SCALE = 2;             // 2x for sharpness
    const PAD = 48;
    const FONT = '"Space Grotesk", system-ui, sans-serif';
    const BW = 2;                // border width

    // Title banner
    const BANNER_H = 100;

    // Day section header
    const DAY_HEADER_H = 52;

    // Card dimensions
    const CARD_W = 540;
    const CARD_H = 178;
    const CARD_GAP = 24;         // gap between cards in grid
    const GRID_X = PAD;          // left edge of card grid
    const GRID_COLS = 2;

    // Footer
    const FOOTER_H = 40;

    // --- Helper: draw neubrutalism shadow + border box ---
    const drawCardBg = (x: number, y: number, w: number, h: number, fill: string) => {
      // Shadow (offset)
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 4, y + 4, w, h);
      // Background
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      // Border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = BW;
      ctx.strokeRect(x, y, w, h);
    };

    // --- Helper: draw rounded rect ---
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    };

    // --- Helper: wrap text and return lines ---
    const wrapText = (text: string, maxWidth: number, font: string): string[] => {
      ctx.font = font;
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    // --- Helper: draw a neubrutalism badge ---
    const drawBadge = (x: number, y: number, text: string, bg: string, fg: string, bold = true, withBorder = false) => {
      ctx.font = `${bold ? 'bold ' : ''}12px ${FONT}`;
      const tw = ctx.measureText(text).width;
      const bw = 8; // badge horizontal padding
      const bh = 6; // badge vertical padding
      const badgeW = tw + bw * 2;
      const badgeH = 12 + bh * 2;
      if (withBorder) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 1, y + 1, badgeW, badgeH);
      }
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, badgeW, badgeH);
      if (withBorder) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, badgeW, badgeH);
      }
      ctx.fillStyle = fg;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + bw, y + badgeH / 2);
      return badgeW;
    };

    // --- Phase 1: Measure total height ---
    const daysWithClasses: { hari: string; items: UnifiedClass[] }[] = [];
    for (const hari of HARI_ORDER) {
      const items = grouped.get(hari);
      if (!items || items.length === 0) continue;
      daysWithClasses.push({
        hari,
        items: items.sort((a, b) => (parseTimeToMinutes(a.jam)?.start ?? 0) - (parseTimeToMinutes(b.jam)?.start ?? 0)),
      });
    }

    let totalH = PAD + BANNER_H + 16; // top padding + banner + gap after banner
    for (const day of daysWithClasses) {
      totalH += DAY_HEADER_H + 8; // day header + gap
      const rows = Math.ceil(day.items.length / GRID_COLS);
      totalH += rows * CARD_H + (rows - 1) * CARD_GAP + 24; // cards + gaps + section bottom padding
    }
    totalH += FOOTER_H + PAD; // footer + bottom padding

    // --- Set canvas at 2x ---
    canvas.width = W * SCALE;
    canvas.height = totalH * SCALE;
    canvas.style.width = W + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(SCALE, SCALE);

    // --- Background ---
    ctx.fillStyle = '#EFF6FF';
    ctx.fillRect(0, 0, W, totalH);

    // --- Phase 2: Draw title banner ---
    let curY = PAD;
    const bannerX = PAD;
    const bannerW = W - PAD * 2;
    drawCardBg(bannerX, curY, bannerW, BANNER_H, '#3B82F6');

    // Title text
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText('JADWAL KULIAH', W / 2, curY + 42);

    // Subtitle badges
    const subtitleY = curY + 64;
    // Total SKS badge
    const sksText = `Total SKS: ${totalSKS}`;
    ctx.font = `bold 14px ${FONT}`;
    const sksTw = ctx.measureText(sksText).width;
    const sksBadgeW = sksTw + 20;
    const sksBadgeX = W / 2 - sksBadgeW - 8;
    roundRect(sksBadgeX, subtitleY, sksBadgeW, 26, 4);
    ctx.fillStyle = '#FFD13B';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sksText, sksBadgeX + sksBadgeW / 2, subtitleY + 13);

    // Total Kelas badge
    const kelasText = `Total Kelas: ${totalKelas}`;
    const kelasTw = ctx.measureText(kelasText).width;
    const kelasBadgeW = kelasTw + 20;
    const kelasBadgeX = W / 2 + 8;
    roundRect(kelasBadgeX, subtitleY, kelasBadgeW, 26, 4);
    ctx.fillStyle = '#FF90E8';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kelasText, kelasBadgeX + kelasBadgeW / 2, subtitleY + 13);

    ctx.textAlign = 'left';
    curY += BANNER_H + 16;

    // --- Phase 3: Draw days + cards ---
    for (const day of daysWithClasses) {
      // Day section header
      const hdrX = GRID_X;
      const hdrW = bannerW;
      drawCardBg(hdrX, curY, hdrW, DAY_HEADER_H, '#FFD13B');
      ctx.fillStyle = '#000';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`📅  ${day.hari.toUpperCase()}`, hdrX + 16, curY + DAY_HEADER_H / 2);

      // Item count badge on right
      ctx.font = `bold 13px ${FONT}`;
      const countText = `${day.items.length} kelas`;
      const countTw = ctx.measureText(countText).width;
      const countBadgeW = countTw + 16;
      const countBadgeX = hdrX + hdrW - countBadgeW - 12;
      roundRect(countBadgeX, curY + (DAY_HEADER_H - 28) / 2, countBadgeW, 28, 4);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countText, countBadgeX + countBadgeW / 2, curY + DAY_HEADER_H / 2);

      curY += DAY_HEADER_H + 8;

      // Draw cards in 2-column grid
      for (let i = 0; i < day.items.length; i++) {
        const col = i % GRID_COLS;
        const cardX = GRID_X + col * (CARD_W + CARD_GAP);
        const cardY = curY;
        const c = day.items[i];
        const isCollided = collisions.has(c.id);
        const isPrak = c.isPraktikum;

        // Card background color
        let cardBg = '#FFFFFF';
        if (isCollided) cardBg = '#FFD13B';
        else if (isPrak) cardBg = '#FF90E8';

        // Draw card body
        drawCardBg(cardX, cardY, CARD_W, CARD_H, cardBg);

        // --- Badges row ---
        let badgeX = cardX + 14;
        const badgeY = cardY + 12;

        // Course code badge
        if (isPrak && !isCollided) {
          // Practical: white bg, black text, 2px border
          badgeX += drawBadge(badgeX, badgeY, c.kode, '#FFFFFF', '#000', true, true) + 8;
        } else {
          // Theory (or collided): blue bg, white text
          badgeX += drawBadge(badgeX, badgeY, c.kode, '#3B82F6', '#FFFFFF', true, false) + 8;
        }

        // SKS badge
        badgeX += drawBadge(badgeX, badgeY, `${c.sks} SKS`, '#000000', '#FFFFFF', true, false) + 8;

        // Status badge (final — no need to advance badgeX)
        if (isCollided) {
          drawBadge(badgeX, badgeY, '⚠ BENTROK!', '#F43F5E', '#FFFFFF', true, false);
        } else if (isPrak) {
          drawBadge(badgeX, badgeY, 'PRAKTIKUM', '#000000', '#FFFFFF', true, false);
        }

        // --- Course title (max 2 lines) ---
        const titleFont = `bold 15px ${FONT}`;
        ctx.font = titleFont;
        const titleMaxW = CARD_W - 28;
        const titleLines = wrapText(c.nama.toUpperCase(), titleMaxW, titleFont).slice(0, 2);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const titleStartY = titleLines.length > 1 ? cardY + 48 : cardY + 54;
        for (let li = 0; li < titleLines.length; li++) {
          ctx.fillText(titleLines[li], cardX + 14, titleStartY + li * 18);
        }

        // --- Inner info box ---
        const infoBoxX = cardX + 14;
        const infoBoxY = cardY + 88;
        const infoBoxW = CARD_W - 28;
        const infoBoxH = 76;
        // Info box background
        const infoBg = isCollided ? 'rgba(255,255,255,0.7)' : isPrak ? 'rgba(255,255,255,0.7)' : '#EFF6FF';
        ctx.fillStyle = infoBg;
        ctx.fillRect(infoBoxX, infoBoxY, infoBoxW, infoBoxH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(infoBoxX, infoBoxY, infoBoxW, infoBoxH);

        // Time
        ctx.font = `bold 13px ${FONT}`;
        ctx.fillStyle = '#000';
        ctx.textBaseline = 'top';
        const timeText = `🕐 ${c.jam}`;
        ctx.fillText(timeText, infoBoxX + 10, infoBoxY + 9);

        // Room
        const roomText = `📍 ${c.ruang}`;
        ctx.fillText(roomText, infoBoxX + 10, infoBoxY + 31);

        // Lecturer (truncate if too long)
        ctx.font = `12px ${FONT}`;
        const cleanDosen = c.dosen.replace(/[""]/g, '').replace(/,\s*,/g, ', ').trim();
        let dosenText = `👤 ${cleanDosen}`;
        while (ctx.measureText(dosenText).width > infoBoxW - 20 && dosenText.length > 10) {
          dosenText = dosenText.slice(0, -1);
        }
        if (dosenText !== `👤 ${cleanDosen}`) dosenText += '…';
        ctx.fillText(dosenText, infoBoxX + 10, infoBoxY + 53);
      }

      // Advance past the last row of cards
      const cardRows = Math.ceil(day.items.length / GRID_COLS);
      curY += cardRows * CARD_H + (cardRows - 1) * CARD_GAP + 24;
    }

    // --- Footer ---
    ctx.fillStyle = '#000';
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('* Dibuat dengan UBG Schedule - ubgjadwal.vercel.app', W / 2, curY + 20);
    ctx.textAlign = 'left';

    // --- Export ---
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ubg-schedule.png';
      a.click();
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
            <div className="flex items-end justify-between border-b-2 border-black pb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight">Jadwal Akhir</h1>
                <p className="font-semibold text-lg mt-2 text-gray-800">Periksa kembali jadwalmu. Siap untuk diekspor!</p>
              </div>
              <button onClick={onBack} className="bg-white rounded-none border-2 border-black px-3 py-2 font-bold transition-all inline-flex items-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none text-sm shrink-0">
                <ArrowLeft weight="bold" /><span className="hidden md:inline">Kembali</span>
              </button>
            </div>

            {unified.length === 0 && (
              <div className="text-center py-16 bg-white border-2 border-black rounded-none shadow-brutal">
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
                    <div className="w-3 h-3 bg-black rounded-none" />
                    <h2 className="text-2xl font-black uppercase tracking-wide">{hari}</h2>
                    <div className="h-1 bg-black rounded-none opacity-10" />
                  </div>
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    {items.sort((a: UnifiedClass, b: UnifiedClass) => (parseTimeToMinutes(a.jam)?.start ?? 0) - (parseTimeToMinutes(b.jam)?.start ?? 0)).map((c: UnifiedClass) => {
                      const isCollided = collisions.has(c.id);
                      const cardBg = isCollided ? 'bg-[#FFD13B]' : c.isPraktikum ? 'bg-secondary' : 'bg-white';
                      return (
                        <motion.div key={c.id} className={"relative border-2 border-black rounded-none p-5 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-brutal transition-transform group " + cardBg}>
                          {isCollided && (
                            <motion.div
                              className="absolute -top-4 -right-2 bg-error text-white border-2 border-black px-3 py-1 font-black text-sm rounded-none shadow-brutal-sm flex items-center gap-1 z-10"
                              animate={{ x: [-3, 3, -3, 3, 0] }}
                              transition={{ duration: 0.25, repeat: Infinity, repeatDelay: 3 }}
                            >
                              <Warning weight="bold" /> Bentrok!
                            </motion.div>
                          )}
                          {c.isPraktikum && !isCollided && (
                            <div className="absolute top-4 right-4 bg-black text-white px-2 py-1 text-[10px] font-black uppercase rounded-none">Praktikum</div>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2">
                              <span className={(c.isPraktikum ? 'bg-white text-black' : 'bg-tertiary text-white') + " px-2 py-0.5 text-xs font-extrabold border-2 border-black rounded-none uppercase"}>{c.kode}</span>
                              <span className="bg-black text-white px-2 py-0.5 text-xs font-extrabold rounded-none">{c.sks} SKS</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="w-8 h-8 flex items-center justify-center bg-[#DBEAFE] border-2 border-black rounded-none hover:bg-tertiary hover:text-white transition-colors" onClick={() => setEditingClass(c)}><PencilSimple weight="bold" /></button>
                              <button className="w-8 h-8 flex items-center justify-center bg-red-100 border-2 border-black rounded-none hover:bg-error hover:text-white transition-colors" onClick={() => handleDelete(c)}><Trash weight="bold" /></button>
                            </div>
                          </div>
                          <h3 className={"text-xl font-black leading-tight mb-4 uppercase " + (c.isPraktikum && !isCollided ? 'pr-16' : '')}>{c.nama}</h3>
                          <div className={"space-y-2 text-sm font-bold border-2 border-black rounded-none p-3 " + (isCollided ? 'bg-white/70' : c.isPraktikum ? 'bg-white/70 backdrop-blur-sm' : 'bg-background')}>
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
            <div className="lg:sticky lg:top-28 bg-white rounded-none border-2 border-black p-6 shadow-none flex flex-col gap-6">
              <h3 className="text-xl font-black border-b-2 border-black pb-2">Ringkasan</h3>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">Total SKS</span>
                <span className="font-black bg-primary px-3 py-1 border-2 border-black rounded-none shadow-brutal-sm">{totalSKS}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">Total Kelas</span>
                <span className="font-black bg-secondary px-3 py-1 border-2 border-black rounded-none shadow-brutal-sm">{totalKelas}</span>
              </div>

              {collisionCount > 0 && (
                <div className="bg-red-100 border-2 border-error rounded-none p-3 flex gap-3">
                  <Warning weight="fill" className="text-error shrink-0 text-lg" />
                  <p className="text-sm font-bold leading-snug">Ada <strong>{collisionCount}</strong> kelas yang memiliki jadwal bertabrakan!</p>
                </div>
              )}

              <div className="h-1 bg-black rounded-none opacity-10" />

              <div className="flex flex-col gap-3">
                <button onClick={copyToClipboard} className={"w-full flex items-center justify-between rounded-none border-2 border-black p-3 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none transition-all group font-bold " + (exportSuccess === 'copy' ? 'bg-green-100 border-green-500 text-green-600' : 'bg-white')}>
                  {exportSuccess === 'copy' ? (<><CheckCircle weight="bold" className="text-xl text-green-600" /> Tersalin!</>) : (<><Copy weight="bold" className="text-xl" /> <span>Salin Teks</span> <span className="opacity-0 group-hover:opacity-100 transition-opacity">{'\u2192'}</span></>)}
                </button>
                <button onClick={downloadImage} className={"w-full flex items-center justify-between rounded-none border-2 border-black p-3 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none transition-all group font-bold " + (exportSuccess === 'image' ? 'bg-green-100 border-green-500 text-green-600' : 'bg-white')}>
                  {exportSuccess === 'image' ? (<><CheckCircle weight="bold" className="text-xl text-green-600" /> Terunduh!</>) : (<><Image weight="bold" className="text-xl text-error" /> <span>Unduh Gambar</span> <span className="opacity-0 group-hover:opacity-100 transition-opacity">{'\u2192'}</span></>)}
                </button>
                <button onClick={handleReset} className="w-full flex items-center justify-center bg-error text-white rounded-none border-2 border-black p-3 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none transition-all group font-extrabold uppercase mt-2">
                  <div className="flex items-center gap-2"><Prohibit weight="bold" className="text-xl" /> <span>Reset Semua</span></div>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
      {editingClass && <EditModal row={editingClass} onClose={() => setEditingClass(null)} onSave={handleSaveEdit} />}
    </div>
  );
}
