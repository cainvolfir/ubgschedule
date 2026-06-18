import { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import {
  ChevronDown, AlertTriangle, Pencil, Trash2, Plus, X, Check,
} from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { CatState } from '../../components/CatState';
import { TypingMessage } from '../../components/TypingMessage';
import { UBGMascot } from '../../components/UBGMascot';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/Toast';
import { CourseColorPicker } from './CourseColorPicker';

const ExportCanvas = lazy(() => import('../../features/exporter/ExportCanvas'));
const ExportICS = lazy(() => import('../../features/exporter/ExportICS'));
const ExportCopy = lazy(() => import('./ExportCopy'));

const HARI_ORDER: Record<string, number> = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 7 };
const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface FinalRow {
  KodeMK: string; Hari: string; MataKuliah: string; DosenPengampuh: string; SKS: string; Jam: string; Ruang: string; Keterangan: string;
}

const EMPTY_ROW: FinalRow = {
  KodeMK: '', Hari: 'Senin', MataKuliah: '', DosenPengampuh: '', SKS: '2',
  Jam: '08.00-09.40', Ruang: '', Keterangan: '-',
};

function toFinalRow(r: Record<string, unknown>): FinalRow {
  return {
    KodeMK: String(r?.KodeMK ?? ''), Hari: String(r?.Hari ?? ''), MataKuliah: String(r?.MataKuliah ?? ''),
    DosenPengampuh: String(r?.DosenPengampuh ?? ''), SKS: String(r?.SKS ?? ''),
    Jam: String(r?.Jam ?? ''), Ruang: String(r?.Ruang ?? ''),
    Keterangan: String(r?.Keterangan ?? '-'),
  };
}

export function ResultPage({ onBack }: { onBack: () => void }) {
  const jadwalFinal = useJadwalStore((s) => s.jadwalFinal);
  const addJadwalRow = useJadwalStore((s) => s.addJadwalRow);
  const updateJadwalRow = useJadwalStore((s) => s.updateJadwalRow);
  const removeJadwalRow = useJadwalStore((s) => s.removeJadwalRow);
  const courseColors = useJadwalStore((s) => s.courseColors);
  const setCourseColor = useJadwalStore((s) => s.setCourseColor);
  const { addToast } = useToast();

  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FinalRow>({ ...EMPTY_ROW });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FinalRow>({ ...EMPTY_ROW });
  const [showCollisionDetail, setShowCollisionDetail] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const merged = useMemo(() => {
    const all: FinalRow[] = (jadwalFinal as unknown[]).map((r) => toFinalRow(r as Record<string, unknown>));
    all.sort((a, b) => {
      const ha = HARI_ORDER[a.Hari] ?? 99; const hb = HARI_ORDER[b.Hari] ?? 99;
      if (ha !== hb) return ha - hb;
      return a.Jam.replace(/[.\s-]/g, '').localeCompare(b.Jam.replace(/[.\s-]/g, ''));
    });
    return all;
  }, [jadwalFinal]);

  // Search filter
  const filteredMerged = useMemo(() => {
    if (!searchQuery.trim()) return merged;
    const q = searchQuery.toLowerCase();
    return merged.filter((r) =>
      r.MataKuliah.toLowerCase().includes(q) ||
      r.DosenPengampuh.toLowerCase().includes(q) ||
      r.Ruang.toLowerCase().includes(q) ||
      r.Hari.toLowerCase().includes(q) ||
      r.KodeMK?.toLowerCase().includes(q),
    );
  }, [merged, searchQuery]);

  // Highlight matching text
  const highlightMatch = useCallback((text: string) => {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${q})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-warning/30 text-foreground rounded-sm px-0.5">{part}</mark>
        : part,
    );
  }, [searchQuery]);

  const dayGroups = useMemo(() => {
    const groups: { hari: string; rows: FinalRow[]; indices: number[] }[] = [];
    // Build groups from filtered data — need to map back to original indices
    // We'll use the original merged array for collision detection
    // and filteredMerged for display
    const filteredWithOriginalIdx = filteredMerged.map((row) => ({
      row,
      originalIdx: merged.indexOf(row),
    }));

    for (let i = 0; i < filteredWithOriginalIdx.length; i++) {
      const { row, originalIdx } = filteredWithOriginalIdx[i];
      const last = groups[groups.length - 1];
      if (last && last.hari === row.Hari) {
        last.rows.push(row);
        last.indices.push(originalIdx);
      } else {
        groups.push({ hari: row.Hari, rows: [row], indices: [originalIdx] });
      }
    }
    return groups;
  }, [filteredMerged, merged]);

  const collisionMap = useMemo(() => {
    const parseJam = (jam: string) => {
      if (!jam) return null;
      const m = jam.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/);
      return m ? { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) } : null;
    };
    const map = new Map<number, number[]>();
    const byDay = new Map<string, number[]>();
    merged.forEach((row, idx) => { if (!byDay.has(row.Hari)) byDay.set(row.Hari, []); byDay.get(row.Hari)!.push(idx); });
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
            map.get(ai)!.push(bi);
            map.get(bi)!.push(ai);
          }
        }
      }
    }
    return map;
  }, [merged]);

  const toggleDay = (hari: string) => {
    setCollapsedDays((prev) => { const next = new Set(prev); if (next.has(hari)) next.delete(hari); else next.add(hari); return next; });
  };

  const startEdit = (globalIdx: number) => {
    setEditingIdx(globalIdx);
    setEditForm({ ...merged[globalIdx] });
    setShowAddForm(false);
    setShowCollisionDetail(null);
  };

  const cancelEdit = () => { setEditingIdx(null); setEditForm({ ...EMPTY_ROW }); };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const row: Record<string, unknown> = { ...editForm };
    updateJadwalRow(editingIdx, row);
    setEditingIdx(null);
  };

  const handleDelete = (globalIdx: number) => {
    removeJadwalRow(globalIdx);
    setEditingIdx(null);
    setShowCollisionDetail(null);
  };

  const handleAdd = () => {
    const row: Record<string, unknown> = { ...addForm };
    addJadwalRow(row);
    setShowAddForm(false);
    setAddForm({ ...EMPTY_ROW });
    addToast({ type: 'success', title: 'Class added', message: addForm.MataKuliah, duration: 3000 });
  };

  const resetAll = () => { useJadwalStore.getState().reset(); };

  const handlePrint = () => { window.print(); };

  const handleSetColor = useCallback((courseName: string, color: string) => {
    setCourseColor(courseName, color);
  }, [setCourseColor]);

  const goBack = onBack;
  const totalCollisions = new Set([...collisionMap.keys()]).size;
  const isSearching = searchQuery.trim().length > 0;

  if (merged.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-4xl flex-col items-center justify-center px-4 py-6 sm:px-8">
        <CatState pose="sleep" size={80} message="No schedule data available.">
          <button className="terminal-btn text-xs mt-2" onClick={goBack}>Back to Upload</button>
        </CatState>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full animate-fade-in-up">
      {/* Print-only header */}
      <div className="print-only hidden">
        <div className="print-header">
          <h1>Jadwal Perkuliahan — UBG Schedule</h1>
          <span className="print-date">Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-4 no-print">
        <div className="flex items-center gap-2 mb-3">
          <TypingMessage
            messages={[
              `❯ schedule generated: ${merged.length} classes, ${dayGroups.length} days.`,
              '❯ use the toolbar to search, edit, or export.',
              '❯ click any cell to edit. add new classes with +.',
            ]}
            typingSpeed={30}
            pauseDuration={6000}
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={goBack} className="terminal-btn-sm" aria-label="Go back">
              [ back ]
            </button>
            <h2 className="font-mono text-sm font-bold">
              <span className="text-[var(--blue)]">❯</span>{' '}
              ~/schedule{' '}
              <span className="text-[var(--text-muted)] font-normal">
                — {filteredMerged.length !== merged.length
                  ? `${filteredMerged.length}/${merged.length} classes`
                  : `${merged.length} classes, ${dayGroups.length} days`}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {totalCollisions > 0 && (
              <button
                onClick={() => {
                  const firstCollision = [...collisionMap.keys()][0];
                  const el = document.querySelector(`[data-row-idx="${firstCollision}"]`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-[9px] pixel-font text-destructive hover:bg-destructive/20 transition-colors"
                aria-label={`View ${totalCollisions} schedule collision${totalCollisions > 1 ? 's' : ''}`}
              >
                <AlertTriangle size={12} className="text-destructive" />
                {totalCollisions} collision{totalCollisions > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Search bar — full width */}
        <div className="mt-3">
          <div className="relative">
            <label htmlFor="schedule-search" className="sr-only">Search</label>
            <input
              id="schedule-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="❯ search courses, lecturers, rooms..."
              className="terminal-input pr-5 py-1 text-[10px] w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                aria-label="Clear search"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Action buttons — single row */}
        <div className="mt-2 flex items-center gap-1">
          <Suspense fallback={null}><ExportCopy dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} /></Suspense>
          <Suspense fallback={null}><ExportCanvas dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} /></Suspense>
          <Suspense fallback={null}><ExportICS dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} courseColors={courseColors} /></Suspense>

          <button className="terminal-btn-sm" onClick={handlePrint} title="Print schedule" aria-label="Print schedule">
            [ PRINT ]
          </button>

          <button
            className="terminal-btn-sm !bg-[var(--red)] !border-[var(--red)] !text-white hover:!bg-[var(--red)]/80"
            onClick={resetAll}
            title="Reset all data"
            aria-label="Reset all schedule data"
          >
            [ RESET ]
          </button>
        </div>
      </div>

      {/* Search active indicator */}
      {isSearching && (
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
          <span className="text-[var(--blue)]">❯</span>
          <span>
            {filteredMerged.length > 0
              ? `showing ${filteredMerged.length} result${filteredMerged.length > 1 ? 's' : ''} for "${searchQuery}"`
              : `no results for "${searchQuery}"`}
          </span>
          <button onClick={() => setSearchQuery('')} className="ml-auto text-[var(--blue)] hover:underline">clear</button>
        </div>
      )}

      {/* Add Class Form */}
      {showAddForm && (
        <div className="mb-4 rounded-xl border-2 border-[var(--primary)] bg-primary/5 p-3 sm:p-4 no-print animate-fade-in-up" role="dialog" aria-label="Add new class form">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold text-foreground flex items-center gap-2">
              <Plus size={14} className="text-primary" /> Add New Class
            </p>
            <button onClick={() => setShowAddForm(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-[var(--ring)]" aria-label="Close form">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3">
            <FieldInput label="mata kuliah" value={addForm.MataKuliah} onChange={(v) => setAddForm((f) => ({ ...f, MataKuliah: v }))} placeholder="e.g. Algoritma" />
            <FieldInput label="dosen" value={addForm.DosenPengampuh} onChange={(v) => setAddForm((f) => ({ ...f, DosenPengampuh: v }))} placeholder="e.g. Budi" />
            <div>
              <label className="mb-1 block font-mono text-[10px] text-[var(--text-faint)]" id="add-hari-label">hari</label>
              <select value={addForm.Hari} onChange={(e) => setAddForm((f) => ({ ...f, Hari: e.target.value }))} className="terminal-input text-xs py-1" aria-labelledby="add-hari-label">
                {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <FieldInput label="jam" value={addForm.Jam} onChange={(v) => setAddForm((f) => ({ ...f, Jam: v }))} placeholder="08.00-09.40" />
            <FieldInput label="ruang" value={addForm.Ruang} onChange={(v) => setAddForm((f) => ({ ...f, Ruang: v }))} placeholder="e.g. LAB 101" />
            <FieldInput label="sks" value={addForm.SKS} onChange={(v) => setAddForm((f) => ({ ...f, SKS: v }))} placeholder="2" />
            <FieldInput label="ket" value={addForm.Keterangan} onChange={(v) => setAddForm((f) => ({ ...f, Keterangan: v }))} placeholder="-" />
          </div>
          <div className="mt-2 flex gap-2">
            <button className="terminal-btn text-xs" onClick={handleAdd}>save</button>
            <button className="terminal-btn text-xs" onClick={() => setShowAddForm(false)}>cancel</button>
          </div>
        </div>
      )}

      {/* ===== TABLE VIEW ===== */}
      <>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <div className="rounded-lg border border-[var(--color-rule)] overflow-hidden">
            <table className="w-full border-collapse">
                <thead>
                  <tr className="font-mono text-[9px] bg-[var(--surface-2)] text-[var(--blue)] uppercase tracking-wider border-b border-[var(--border)]">
                    {['hari', 'mata kuliah', 'dosen', 'sks', 'jam', 'ruang', 'ket', ''].map((h, i, arr) => (
                      <th key={h || i} className={`px-1 py-1.5 text-left align-middle font-semibold font-mono ${i < arr.length - 1 ? 'border-r border-[var(--border)]' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let displayIdx = 0;
                    return dayGroups.map((group) =>
                      group.rows.map((row, idx) => {
                        const originalIdx = group.indices[displayIdx];
                        const gi = originalIdx;
                        displayIdx++;
                        const collided = collisionMap.get(gi) || [];
                        const isEditing = editingIdx === gi;
                        const keterangan = collided.length > 0 ? 'Jadwal Bentrok' : row.Keterangan;
                        const cellCls = collided.length > 0 ? 'bg-[var(--red)]/5' : '';
                        const ketCls = collided.length > 0 ? 'text-[var(--red)] font-semibold' : '';

                        if (isEditing) {
                          return (
                            <tr key={`edit-${gi}`} className="text-[12px] bg-primary/5 border-b border-[var(--border)]">
                              <td className="border-r border-[var(--border)] px-2 py-2 align-middle" colSpan={8}>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                  <FieldInput label="Mata Kuliah" value={editForm.MataKuliah} onChange={(v) => setEditForm((f) => ({ ...f, MataKuliah: v }))} placeholder="e.g. Algoritma" small />
                                  <FieldInput label="Dosen" value={editForm.DosenPengampuh} onChange={(v) => setEditForm((f) => ({ ...f, DosenPengampuh: v }))} placeholder="e.g. Budi" small />
                                  <div>
                                    <label className="mb-0.5 block text-[9px] font-medium text-muted-foreground">Hari</label>
                                    <select value={editForm.Hari} onChange={(e) => setEditForm((f) => ({ ...f, Hari: e.target.value }))} className="w-full rounded-md border-2 border-[var(--border)] bg-card px-1.5 py-1 text-[11px] outline-none focus:border-[var(--primary)]">
                                      {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                  </div>
                                  <FieldInput label="Jam" value={editForm.Jam} onChange={(v) => setEditForm((f) => ({ ...f, Jam: v }))} placeholder="08.00-09.40" small />
                                  <FieldInput label="Ruang" value={editForm.Ruang} onChange={(v) => setEditForm((f) => ({ ...f, Ruang: v }))} placeholder="LAB 101" small />
                                  <FieldInput label="SKS" value={editForm.SKS} onChange={(v) => setEditForm((f) => ({ ...f, SKS: v }))} placeholder="2" small />
                                </div>
                              </td>
                              <td className="px-2 py-2 align-middle text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={saveEdit} className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors" title="Save"><Check size={13} /></button>
                                  <button onClick={cancelEdit} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Cancel"><X size={13} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`${group.hari}-${idx}`} className={cn('text-[10px] border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--surface-2)]', collided.length > 0 && 'hover:bg-[var(--red)]/10')}>
                            {idx === 0 && (
                              <td className="border-r border-[var(--border)] bg-[var(--surface-2)] px-1 py-1 align-middle" rowSpan={group.rows.length}>
                                <span className="font-mono text-[9px] font-bold text-[var(--blue)]">{group.hari}</span>
                              </td>
                            )}
                            <td className={cn('border-r border-[var(--border)] px-1 py-1 align-middle font-mono text-[10px]', cellCls)}>
                              <span className="text-[var(--text)]">{highlightMatch(row.MataKuliah)}</span>
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-1 py-1 align-middle font-mono text-[10px]', cellCls)}>
                              <span className="text-[var(--text)]">{highlightMatch(row.DosenPengampuh)}</span>
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-1 py-1 align-middle font-mono text-[10px] text-center', cellCls)}>
                              {row.SKS}
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-1 py-1 align-middle font-mono text-[10px]', cellCls)}>
                              {highlightMatch(row.Jam)}
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-1 py-1 align-middle font-mono text-[10px]', cellCls)}>
                              {highlightMatch(row.Ruang)}
                            </td>
                            <td className={cn('px-1 py-1 align-middle font-mono text-[9px]', ketCls, cellCls)}>
                              <span
                                className={cn('cursor-pointer inline-flex items-center gap-1', collided.length > 0 && 'hover:underline')}
                                onClick={() => collided.length > 0 && setShowCollisionDetail(showCollisionDetail === gi ? null : gi)}
                              >
                                {collided.length > 0 && <AlertTriangle size={9} className="text-[var(--red)]" />}
                                {keterangan}
                              </span>
                            </td>
                            <td className="px-1.5 py-1.5 align-middle no-print">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => startEdit(gi)} className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--blue)]/10 hover:text-[var(--blue)] transition-colors" title="Edit"><Pencil size={10} /></button>
                                <button onClick={() => handleDelete(gi)} className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--red)]/10 hover:text-[var(--red)] transition-colors" title="Delete"><Trash2 size={10} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {(() => { let globalIdx = 0; return dayGroups.map((group) => {
              const isCollapsed = collapsedDays.has(group.hari);
              const hasCollision = group.rows.some((_, idx) => (collisionMap.get(group.indices[globalIdx + idx]) || []).length > 0);
              return (
                <div key={group.hari}>
                  <button
                    onClick={() => toggleDay(group.hari)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border-2 px-3 py-3 text-left transition-all shadow-sm',
                      hasCollision ? 'border-destructive/30 bg-destructive/5' : 'border-[var(--border)] bg-muted',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <UBGMascot pose={hasCollision ? 'blink' : 'idle'} size={18} />
                      <span className="pixel-font text-[10px] font-bold">{group.hari}</span>
                      <span className="rounded-full bg-card/80 px-2 py-0.5 text-[8px] pixel-font text-muted-foreground border border-[var(--border)]">
                        {group.rows.length}
                      </span>
                      {hasCollision && <AlertTriangle size={12} className="text-destructive" />}
                    </div>
                    <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', !isCollapsed && 'rotate-180')} />
                  </button>

                  {!isCollapsed && (
                    <div className="border-2 border-t-0 border-[var(--border)] rounded-b-xl px-2 py-2 bg-card-solid/50">
                      {group.rows.map((row, idx) => {
                        const rowIdx = group.indices[globalIdx++];
                        const collided = collisionMap.get(rowIdx) || [];
                        const keterangan = collided.length > 0 ? 'Jadwal Bentrok' : row.Keterangan;
                        const cardCls = collided.length > 0 ? 'bg-destructive/5 border-destructive/30' : 'bg-card hover:bg-primary/5';
                        const ketCls = collided.length > 0
                          ? 'border-destructive/40 bg-destructive/10 text-destructive'
                          : 'border-[var(--border)] bg-muted/50 text-muted-foreground';
                        const rowColor = courseColors[row.MataKuliah];
                        return (
                          <div key={idx} className={cn('rounded-xl border-2 px-3 py-2.5 shadow-sm transition-all mb-2 last:mb-0', cardCls)}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <CourseColorPicker courseName={row.MataKuliah} currentColor={rowColor} onSetColor={handleSetColor} />
                                  <div className="text-[13px] font-bold leading-tight">{highlightMatch(row.MataKuliah)}</div>
                                </div>
                                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                  <span>Dosen</span><span className="text-foreground font-medium">{highlightMatch(row.DosenPengampuh)}</span>
                                  <span>SKS</span><span className="text-foreground font-medium">{row.SKS}</span>
                                  <span>Jam</span><span className="text-foreground font-medium">{highlightMatch(row.Jam)}</span>
                                  <span>Ruang</span><span className="text-foreground font-medium">{highlightMatch(row.Ruang)}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-1.5">
                                  <span className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium', ketCls)}>
                                    {collided.length > 0 && <AlertTriangle size={10} className="text-destructive" />}
                                    {keterangan}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0 no-print">
                                <button onClick={() => startEdit(rowIdx)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-muted-foreground hover:text-primary hover:border-[var(--primary)] transition-colors"><Pencil size={11} /></button>
                                <button onClick={() => handleDelete(rowIdx)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"><Trash2 size={11} /></button>
                              </div>
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
        </>

      {/* Collision detail overlay */}
      {showCollisionDetail !== null && (
        <div className="mt-4 rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 no-print">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle size={14} /> Collision Details
            </p>
            <button onClick={() => setShowCollisionDetail(null)} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>
          </div>
          <div className="space-y-2">
            {[showCollisionDetail, ...(collisionMap.get(showCollisionDetail) || [])].sort((a, b) => a - b).map((idx) => {
              const r = merged[idx];
              return (
                <div key={idx} className={cn('rounded-lg border p-3', idx === showCollisionDetail ? 'border-destructive/40 bg-destructive/10' : 'border-[var(--border)] bg-card')}>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold">{r.MataKuliah}</p>
                    <div className="flex gap-1">
                      <button onClick={() => { startEdit(idx); setShowCollisionDetail(null); }} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"><Pencil size={10} /> Edit</button>
                      <button onClick={() => handleDelete(idx)} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 size={10} /> Remove</button>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {r.Hari} • {r.Jam} • {r.Ruang || 'No room'} • {r.DosenPengampuh || 'No lecturer'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 print-stats">
        {[
          { label: 'Total Classes', value: merged.length, color: '' },
          { label: 'Days', value: dayGroups.length, color: '' },
          { label: 'Collisions', value: totalCollisions, color: totalCollisions > 0 ? 'text-destructive' : '' },
          { label: 'Total SKS', value: merged.reduce((s, r) => s + (parseInt(r.SKS) || 0), 0), color: '' },
        ].map((stat) => (
          <div key={stat.label} className={cn(
            'rounded-xl border-2 border-[var(--border)] bg-card-solid p-3 text-center shadow-sm',
            stat.color && 'border-destructive/30 bg-destructive/5',
          )}>
            <p className={cn('text-[20px] font-bold text-foreground', stat.color)}>{stat.value}</p>
            <p className="pixel-font mt-0.5 text-[6px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Shared Input Field ===== */
function FieldInput({
  label, value, onChange, placeholder, small,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; small?: boolean;
}) {
  return (
    <div>
      <label className={cn('mb-1 block font-medium text-muted-foreground', small ? 'text-[9px]' : 'text-[10px]')}>{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn('w-full rounded-lg border-2 border-[var(--border)] bg-card outline-none transition-colors focus:border-[var(--primary)]', small ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1.5 text-[11px]')}
      />
    </div>
  );
}
