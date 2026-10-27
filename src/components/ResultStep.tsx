import { useState, useCallback, useMemo } from 'react';
import { Copy, Image, Prohibit, CheckCircle, Warning, ArrowLeft } from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import { EditModal } from './EditModal';
import { useJadwalStore, type DataTeoriMentah, type PraktikumCandidate } from '../store/useJadwalStore';
import { isPraktikumClass } from '../utils/courseCode';
import { findCollisions, parseTimeToMinutes, byStartTime } from '../utils/collision';
import { dayGroups, dayLabel, normalizeHari } from '../utils/hari';
import { scheduleTextLines } from '../utils/scheduleExport';
import ScheduleDaySections, { type UnifiedClass } from './ScheduleDaySections';

interface ResultProps { onBack?: () => void; }

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

export default function ResultStep({ onBack }: ResultProps) {
  const { jadwalTeoriTerpilih, selectedCandidateIds, praktikumCandidates, selectedTheoryRowIds, setJadwalTeoriTerpilih, setSelectedTheoryRowIds, setPraktikumCandidates, toggleCandidateId, reset, setWizardStep } = useJadwalStore();
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<UnifiedClass | null>(null);

  const triggerSuccess = useCallback((key: string) => {
    setExportSuccess(key); setTimeout(() => setExportSuccess(null), 2000);
  }, []);

  const handleDelete = useCallback((item: UnifiedClass) => {
    // Remove from theory selection (covers both manual and auto-mode courses) regardless of isPraktikum.
    setJadwalTeoriTerpilih(jadwalTeoriTerpilih.filter((t) => t.id !== item.id));
    setSelectedTheoryRowIds(selectedTheoryRowIds.filter((id) => id !== item.id));
    // If it's a praktikum candidate, also deselect it.
    if (selectedCandidateIds.includes(item.id)) {
      toggleCandidateId(item.id);
    }
  }, [toggleCandidateId, setJadwalTeoriTerpilih, setSelectedTheoryRowIds, jadwalTeoriTerpilih, selectedTheoryRowIds, selectedCandidateIds]);

  const handleSaveEdit = useCallback((updated: UnifiedClass) => {
    // Update theory row if present (covers both manual and auto-mode courses).
    if (jadwalTeoriTerpilih.some((t) => t.id === updated.id)) {
      setJadwalTeoriTerpilih(jadwalTeoriTerpilih.map(t => t.id === updated.id ? { ...t, MataKuliah: updated.nama, Kelas: updated.kelas, SKS: updated.sks, DosenPengampuh: updated.dosen, Hari: updated.hari, Jam: updated.jam, Ruang: updated.ruang } : t));
    }
    // Update praktikum candidate if present.
    if (praktikumCandidates.some((p) => p.id === updated.id)) {
      setPraktikumCandidates(praktikumCandidates.map(p => p.id === updated.id ? { ...p, courseName: updated.nama, kelas: updated.kelas, keterangan: updated.keterangan, dosen: updated.dosen, hari: updated.hari, jam: updated.jam, ruang: updated.ruang } : p));
    }
    setEditingClass(null);
  }, [praktikumCandidates, setPraktikumCandidates, jadwalTeoriTerpilih, setJadwalTeoriTerpilih]);

  const unified: UnifiedClass[] = useMemo(() => {
    const theory: UnifiedClass[] = jadwalTeoriTerpilih.map((r: DataTeoriMentah) => ({
      id: r.id, kode: r.KodeMK, nama: r.MataKuliah, kelas: r.Kelas, keterangan: r.Keterangan || '',
      sks: r.SKS, hari: normalizeHari(r.Hari), jam: r.Jam, ruang: r.Ruang, dosen: r.DosenPengampuh,
      isPraktikum: isPraktikumClass({ keterangan: r.Keterangan, nama: r.MataKuliah, ruang: r.Ruang, kelas: r.Kelas }),
    }));
    const prak: UnifiedClass[] = praktikumCandidates
      .filter((c: PraktikumCandidate) => selectedCandidateIds.includes(c.id))
      .map((c: PraktikumCandidate) => ({
        id: c.id, kode: c.courseName, nama: c.courseName, kelas: c.kelas, keterangan: c.keterangan || '',
        sks: '1', hari: normalizeHari(c.hari), jam: c.jam, ruang: c.ruang, dosen: c.dosen, isPraktikum: true,
      }));
    return mergeSequentialSlots([...theory, ...prak]);
  }, [jadwalTeoriTerpilih, selectedCandidateIds, praktikumCandidates]);

  const collisions = useMemo(() => findCollisions(unified), [unified]);
  const collisionCount = collisions.size;

  /*
   * Every row lands in a group, in the order the page shows them: the seven
   * canonical days first, then any other group (an unreadable day, or a day
   * outside the list) in first-seen order. Walking only the canonical day list
   * here is what made a schedule with unreadable days render as blank space
   * under the heading, with nothing on screen to say a row had gone missing.
   */
  const days = useMemo(() => dayGroups(unified), [unified]);

  const totalSKS = useMemo(() => unified.reduce((s, c) => s + parseInt(c.sks || '0'), 0), [unified]);
  const totalKelas = unified.length;

  const copyToClipboard = useCallback(() => {
    // Built from the SAME group list the page renders, so a group outside the
    // seven canonical days reaches the clipboard too instead of vanishing from
    // the export while it is visible on screen.
    navigator.clipboard.writeText(scheduleTextLines(days).join('\n'));
    triggerSuccess('copy');
  }, [days, triggerSuccess]);

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
    // Same walk the page uses, so the picture carries every row the screen does:
    // a group outside the seven canonical days is exported, not dropped.
    const daysWithClasses: { hari: string; items: UnifiedClass[] }[] = days
      .filter((day) => day.items.length > 0)
      .map((day) => ({ hari: day.hari, items: [...day.items].sort(byStartTime) }));

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
      ctx.fillText(`📅  ${dayLabel(day.hari).toUpperCase()}`, hdrX + 16, curY + DAY_HEADER_H / 2);

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
        // Advance curY to next row when starting a new row (except the first)
        if (col === 0 && i > 0) {
          curY += CARD_H + CARD_GAP;
        }
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

        // Type badge, then collision badge laid out side by side (measured, so
        // they never draw on top of each other).
        let statusX = badgeX;
        if (isPrak) {
          statusX += drawBadge(statusX, badgeY, 'PRAKTIKUM', '#000000', '#FFFFFF', true, false) + 6;
        } else {
          statusX += drawBadge(statusX, badgeY, 'TEORI', '#DBEAFE', '#000000', true, true) + 6;
        }
        if (isCollided) {
          drawBadge(statusX, badgeY, '⚠ BENTROK!', '#F43F5E', '#FFFFFF', true, false);
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
      curY += CARD_H + 24;
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
  }, [days, totalSKS, totalKelas, collisions, triggerSuccess]);

  const handleReset = useCallback(() => {
    reset();
    setWizardStep(1);
  }, [reset, setWizardStep]);

  return (
    <div className="bg-background">
      <WizardHeader currentStep={3} />
      <main className="p-4 md:px-8 md:pt-8 pb-40 md:pb-48">
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

            {/* Every row is in `days`, so every row gets a section: a day the
                page cannot read is grouped and labelled, never dropped. */}
            <ScheduleDaySections
              days={days}
              collisions={collisions}
              onEdit={setEditingClass}
              onDelete={handleDelete}
            />
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
