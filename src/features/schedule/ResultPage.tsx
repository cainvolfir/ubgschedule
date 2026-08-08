import { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle, Pencil, Trash2, Plus, X, Check, Search,
} from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/Toast';

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
  const { addToast } = useToast();

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

  const highlightMatch = useCallback((text: string) => {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${q})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="rounded-sm bg-warning/30 px-0.5 text-primary dark:text-dark-primary">{part}</mark>
        : part,
    );
  }, [searchQuery]);

  const dayGroups = useMemo(() => {
    const groups: { hari: string; rows: FinalRow[]; indices: number[] }[] = [];
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
  const goBack = onBack;
  const totalCollisions = new Set([...collisionMap.keys()]).size;
  const isSearching = searchQuery.trim().length > 0;

  if (merged.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-4 py-6">
        <div className="flex flex-col items-center justify-center py-xl text-center">
          <p className="font-headline-md text-headline-md text-primary dark:text-dark-primary">No schedule data available</p>
          <p className="font-body-md text-body-md mt-sm text-secondary dark:text-on-tertiary-container">Upload theory schedule first, return here.</p>
          <button
            onClick={goBack}
            className="font-body-semibold text-body-semibold mt-md rounded-full border border-outline px-xl py-md text-primary transition-colors hover:bg-surface-container-low dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10"
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full animate-fade-in-up">
      {/* Print-only header */}
      <div className="print-only hidden">
        <div className="print-header">
          <h1>Class Schedule — UBG Schedule</h1>
          <span className="print-date">Printed: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-lg no-print">
        <div className="mb-md">
          <h1 className="font-headline-lg text-headline-lg font-display-serif mb-sm text-primary dark:text-dark-primary">Class Schedule</h1>
          <p className="font-body-md text-body-md text-secondary dark:text-on-tertiary-container">{merged.length} classes across {dayGroups.length} days. Use toolbar search, edit, export.</p>
        </div>

        {/* Stats cards */}
        <div className="mb-md grid grid-cols-2 gap-sm sm:grid-cols-4 print-stats">
          {[
            { label: 'Total Classes', value: merged.length, color: '' },
            { label: 'Days', value: dayGroups.length, color: '' },
            { label: 'Conflicts', value: totalCollisions, color: totalCollisions > 0 ? 'text-error dark:text-dark-error' : '' },
            { label: 'Total SKS', value: merged.reduce((s, r) => s + (parseInt(r.SKS) || 0), 0), color: '' },
          ].map((stat) => (
            <div key={stat.label} className={cn(
              'rounded-xl border border-border bg-surface-container-low p-md text-center dark:border-dark-border dark:bg-dark-background',
              stat.color && 'border-error/30 dark:border-dark-error/30',
            )}>
              <p className={cn('font-headline-md text-headline-md font-bold text-primary dark:text-dark-primary', stat.color)}>{stat.value}</p>
              <p className="font-label-sm text-label-sm mt-xs uppercase tracking-wider text-secondary dark:text-on-tertiary-container">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-sm">
          {/* Search bar */}
          <div className="relative">
            <label htmlFor="schedule-search" className="sr-only">Search</label>
            <Search size={14} className="absolute left-md top-1/2 -translate-y-1/2 text-secondary dark:text-on-tertiary-container" />
            <input
              id="schedule-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course, lecturer, room..."
              className="font-body-md text-body-md h-10 w-full rounded-full border border-border bg-surface pl-xl pr-lg text-primary shadow-sm outline-none transition-colors placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-dark-border dark:bg-dark-surface dark:text-dark-primary dark:placeholder:text-on-tertiary-container"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-md top-1/2 -translate-y-1/2 rounded-full p-1 text-secondary transition-colors hover:text-primary dark:text-on-tertiary-container dark:hover:text-dark-primary"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-sm">
            <Suspense fallback={null}><ExportCopy dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} /></Suspense>
            <Suspense fallback={null}><ExportCanvas dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} /></Suspense>
            <Suspense fallback={null}><ExportICS dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} courseColors={courseColors} /></Suspense>
            <button
              onClick={handlePrint}
              className="font-label-sm text-label-sm flex items-center gap-1 rounded-full border border-border px-lg py-sm text-primary transition-colors hover:bg-surface-container-low dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10"
              title="Print schedule"
            >
              Print
            </button>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="font-label-sm text-label-sm flex items-center gap-1 rounded-full border border-border px-lg py-sm text-primary transition-colors hover:bg-surface-container-low dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10"
              title="Add new class"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={resetAll}
              className="font-label-sm text-label-sm flex items-center gap-1 rounded-full border border-error/40 px-lg py-sm text-error transition-colors hover:bg-error/10 dark:border-dark-error/40 dark:text-dark-error dark:hover:bg-dark-error/10"
              title="Reset all data"
            >
              Reset
            </button>
            {totalCollisions > 0 && (
              <button
                onClick={() => {
                  const firstCollision = [...collisionMap.keys()][0];
                  const el = document.querySelector(`[data-row-idx="${firstCollision}"]`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="font-label-sm text-label-sm flex items-center gap-1 rounded-full border border-error/40 bg-error/10 px-lg py-sm text-error dark:border-dark-error/40 dark:bg-dark-error/10 dark:text-dark-error"
              >
                <AlertTriangle size={12} />
                {totalCollisions} conflicts
              </button>
            )}
            <button
              onClick={goBack}
              className="font-label-sm text-label-sm ml-auto flex items-center gap-1 rounded-full border border-outline px-lg py-sm text-primary transition-colors hover:bg-surface-container-low dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10"
              title="Back to upload"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Search active indicator */}
      {isSearching && (
        <div className="mb-md flex items-center gap-sm">
          <span className="font-label-sm text-label-sm text-secondary dark:text-on-tertiary-container">
            {filteredMerged.length > 0
              ? `${filteredMerged.length} results for "${searchQuery}"`
              : `No results for "${searchQuery}"`}
          </span>
          <button onClick={() => setSearchQuery('')} className="font-label-sm text-label-sm text-primary underline underline-offset-4 dark:text-dark-primary">clear</button>
        </div>
      )}

      {/* Add Class Form */}
      {showAddForm && (
        <div className="mb-md rounded-2xl border-2 border-primary bg-surface-container-low p-lg no-print animate-fade-in-up dark:border-dark-primary dark:bg-dark-background" role="dialog" aria-label="Add new class form">
          <div className="mb-md flex items-center justify-between">
            <p className="font-body-semibold text-body-semibold flex items-center gap-sm text-primary dark:text-dark-primary">
              <Plus size={14} /> Add New Class
            </p>
            <button onClick={() => setShowAddForm(false)} className="rounded-full p-sm text-secondary transition-colors hover:text-primary dark:text-on-tertiary-container dark:hover:text-dark-primary" aria-label="Close form"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <FieldInput label="Course" value={addForm.MataKuliah} onChange={(v) => setAddForm((f) => ({ ...f, MataKuliah: v }))} placeholder="e.g. Algoritma" />
            <FieldInput label="Lecturer" value={addForm.DosenPengampuh} onChange={(v) => setAddForm((f) => ({ ...f, DosenPengampuh: v }))} placeholder="e.g. Budi" />
            <div>
              <label className="font-label-sm text-label-sm mb-sm block text-secondary dark:text-on-tertiary-container" id="add-hari-label">Day</label>
              <select value={addForm.Hari} onChange={(e) => setAddForm((f) => ({ ...f, Hari: e.target.value }))} className="font-body-md text-body-md h-10 w-full rounded-lg border border-border bg-surface px-md text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-dark-border dark:bg-dark-surface dark:text-dark-primary" aria-labelledby="add-hari-label">
                {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <FieldInput label="Time" value={addForm.Jam} onChange={(v) => setAddForm((f) => ({ ...f, Jam: v }))} placeholder="08.00-09.40" />
            <FieldInput label="Room" value={addForm.Ruang} onChange={(v) => setAddForm((f) => ({ ...f, Ruang: v }))} placeholder="e.g. LAB 101" />
            <FieldInput label="SKS" value={addForm.SKS} onChange={(v) => setAddForm((f) => ({ ...f, SKS: v }))} placeholder="2" />
            <FieldInput label="Notes" value={addForm.Keterangan} onChange={(v) => setAddForm((f) => ({ ...f, Keterangan: v }))} placeholder="-" />
          </div>
          <div className="mt-md flex gap-sm">
            <button
              onClick={handleAdd}
              className="font-body-semibold text-body-semibold flex items-center gap-sm rounded-full bg-primary px-xl py-md text-on-primary shadow-md transition-all hover:opacity-90 active:scale-[0.98] dark:bg-dark-primary dark:text-primary"
            >
              Save
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="font-body-semibold text-body-semibold rounded-full border border-outline px-xl py-md text-primary transition-colors hover:bg-surface-container-low dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="hidden md:block -mx-4 overflow-x-auto px-4">
        <div className="min-w-[500px] overflow-hidden rounded-xl border border-border dark:border-dark-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="font-label-sm text-label-sm border-b border-border bg-surface-container-low text-left uppercase tracking-wider text-secondary dark:border-dark-border dark:bg-dark-background dark:text-on-tertiary-container">
                {['day', 'course', 'lecturer', 'sks', 'time', 'room', 'notes', ''].map((h, i, arr) => (
                  <th key={h || i} className={`px-md py-sm align-middle font-semibold ${i < arr.length - 1 ? 'border-r border-border dark:border-dark-border' : ''}`}>{h}</th>
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
                    const keterangan = collided.length > 0 ? 'Schedule Conflict' : row.Keterangan;
                    const cellCls = collided.length > 0 ? 'bg-error/5 dark:bg-dark-error/5' : '';
                    const ketCls = collided.length > 0 ? 'text-error dark:text-dark-error font-semibold' : 'text-secondary dark:text-on-tertiary-container';

                    if (isEditing) {
                      return (
                        <tr key={`edit-${gi}`} className="border-b border-border bg-primary/5 text-primary dark:border-dark-border dark:bg-dark-primary/5 dark:text-dark-primary">
                          <td className="border-r border-border px-md py-sm align-middle dark:border-dark-border" colSpan={8}>
                            <div className="grid grid-cols-2 gap-sm">
                              <FieldInput label="Course" value={editForm.MataKuliah} onChange={(v) => setEditForm((f) => ({ ...f, MataKuliah: v }))} placeholder="e.g. Algoritma" small />
                              <FieldInput label="Lecturer" value={editForm.DosenPengampuh} onChange={(v) => setEditForm((f) => ({ ...f, DosenPengampuh: v }))} placeholder="e.g. Budi" small />
                              <div>
                                <label className="font-label-sm text-label-sm mb-sm block text-secondary dark:text-on-tertiary-container">Day</label>
                                <select value={editForm.Hari} onChange={(e) => setEditForm((f) => ({ ...f, Hari: e.target.value }))} className="font-body-md text-body-md h-10 w-full rounded-lg border border-border bg-surface px-md text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-dark-border dark:bg-dark-surface dark:text-dark-primary">
                                  {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>
                              <FieldInput label="Time" value={editForm.Jam} onChange={(v) => setEditForm((f) => ({ ...f, Jam: v }))} placeholder="08.00-09.40" small />
                              <FieldInput label="Room" value={editForm.Ruang} onChange={(v) => setEditForm((f) => ({ ...f, Ruang: v }))} placeholder="LAB 101" small />
                              <FieldInput label="SKS" value={editForm.SKS} onChange={(v) => setEditForm((f) => ({ ...f, SKS: v }))} placeholder="2" small />
                            </div>
                          </td>
                          <td className="px-md py-sm align-middle text-center">
                            <div className="flex items-center justify-center gap-sm">
                              <button onClick={saveEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success transition-colors hover:bg-success/20 dark:text-dark-success" title="Save"><Check size={13} /></button>
                              <button onClick={cancelEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-secondary transition-colors hover:text-primary dark:bg-dark-surface dark:text-on-tertiary-container dark:hover:text-dark-primary" title="Cancel"><X size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`${group.hari}-${idx}`} className={cn('border-b border-border text-primary transition-colors last:border-b-0 hover:bg-surface-container-low dark:border-dark-border dark:text-dark-primary dark:hover:bg-dark-surface', collided.length > 0 && 'hover:bg-error/10 dark:hover:bg-dark-error/10')}>
                        {idx === 0 && (
                          <td className="border-r border-border bg-surface-container-low px-md py-sm align-middle dark:border-dark-border dark:bg-dark-background" rowSpan={group.rows.length}>
                            <span className="font-label-sm text-label-sm font-bold text-primary dark:text-dark-primary">{group.hari}</span>
                          </td>
                        )}
                        <td className={cn('border-r border-border px-md py-sm align-middle font-body-md text-body-md dark:border-dark-border', cellCls)}>
                          {highlightMatch(row.MataKuliah)}
                        </td>
                        <td className={cn('border-r border-border px-md py-sm align-middle font-body-md text-body-md dark:border-dark-border', cellCls)}>
                          {highlightMatch(row.DosenPengampuh)}
                        </td>
                        <td className={cn('border-r border-border px-md py-sm text-center font-body-md text-body-md dark:border-dark-border', cellCls)}>{row.SKS}</td>
                        <td className={cn('border-r border-border px-md py-sm align-middle font-body-md text-body-md dark:border-dark-border', cellCls)}>{highlightMatch(row.Jam)}</td>
                        <td className={cn('border-r border-border px-md py-sm align-middle font-body-md text-body-md dark:border-dark-border', cellCls)}>{highlightMatch(row.Ruang)}</td>
                        <td className={cn('px-md py-sm align-middle font-label-sm text-label-sm', ketCls, cellCls)}>
                          <span className={cn('inline-flex items-center gap-xs', collided.length > 0 && 'cursor-pointer hover:underline')} onClick={() => collided.length > 0 && setShowCollisionDetail(showCollisionDetail === gi ? null : gi)}>
                            {collided.length > 0 && <AlertTriangle size={12} className="text-error dark:text-dark-error" />}
                            {keterangan}
                          </span>
                        </td>
                        <td className="px-md py-sm align-middle no-print">
                          <div className="flex items-center justify-center gap-xs">
                            <button onClick={() => startEdit(gi)} className="flex h-7 w-7 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-variant hover:text-primary dark:text-on-tertiary-container dark:hover:bg-dark-surface dark:hover:text-dark-primary" title="Edit"><Pencil size={12} /></button>
                            <button onClick={() => handleDelete(gi)} className="flex h-7 w-7 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error/10 hover:text-error dark:text-on-tertiary-container dark:hover:bg-dark-error/10 dark:hover:text-dark-error" title="Delete"><Trash2 size={12} /></button>
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
      <div className="md:hidden flex flex-col gap-sm">
        {(() => {
          let displayIdx = 0;
          return dayGroups.map((group) => (
            <div key={group.hari} className="overflow-hidden rounded-xl border border-border dark:border-dark-border">
              <div className="bg-surface-container-low px-md py-sm font-label-sm text-label-sm font-bold text-primary dark:bg-dark-background dark:text-dark-primary">{group.hari}</div>
              {group.rows.map((row, idx) => {
                const gi = group.indices[displayIdx];
                displayIdx++;
                const collided = collisionMap.get(gi) || [];
                const isEditing = editingIdx === gi;
                const cardCls = collided.length > 0 ? 'bg-error/5 dark:bg-dark-error/5' : '';

                if (isEditing) {
                  return (
                    <div key={`edit-${gi}`} className="border-t border-border p-md dark:border-dark-border">
                      <div className="grid grid-cols-2 gap-sm">
                        <FieldInput label="Course" value={editForm.MataKuliah} onChange={(v) => setEditForm((f) => ({ ...f, MataKuliah: v }))} placeholder="e.g. Algoritma" small />
                        <FieldInput label="Lecturer" value={editForm.DosenPengampuh} onChange={(v) => setEditForm((f) => ({ ...f, DosenPengampuh: v }))} placeholder="e.g. Budi" small />
                        <div>
                          <label className="font-label-sm text-label-sm mb-sm block text-secondary dark:text-on-tertiary-container">Day</label>
                          <select value={editForm.Hari} onChange={(e) => setEditForm((f) => ({ ...f, Hari: e.target.value }))} className="font-body-md text-body-md h-10 w-full rounded-lg border border-border bg-surface px-md text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-dark-border dark:bg-dark-surface dark:text-dark-primary">
                            {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <FieldInput label="Time" value={editForm.Jam} onChange={(v) => setEditForm((f) => ({ ...f, Jam: v }))} placeholder="08.00-09.40" small />
                        <FieldInput label="Room" value={editForm.Ruang} onChange={(v) => setEditForm((f) => ({ ...f, Ruang: v }))} placeholder="LAB 101" small />
                        <FieldInput label="SKS" value={editForm.SKS} onChange={(v) => setEditForm((f) => ({ ...f, SKS: v }))} placeholder="2" small />
                      </div>
                      <div className="mt-md flex items-center justify-end gap-sm">
                        <button onClick={saveEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success transition-colors hover:bg-success/20 dark:text-dark-success" title="Save"><Check size={13} /></button>
                        <button onClick={cancelEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-secondary transition-colors hover:text-primary dark:bg-dark-surface dark:text-on-tertiary-container dark:hover:text-dark-primary" title="Cancel"><X size={13} /></button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`${group.hari}-${idx}`} className={cn('border-t border-border p-md dark:border-dark-border', cardCls)}>
                    <div className="flex items-start justify-between gap-sm">
                      <p className="font-body-semibold text-body-semibold text-primary dark:text-dark-primary">{highlightMatch(row.MataKuliah)}</p>
                      {collided.length > 0 && (
                        <button onClick={() => setShowCollisionDetail(showCollisionDetail === gi ? null : gi)} className="flex shrink-0 items-center gap-xs font-label-sm text-label-sm text-error dark:text-dark-error">
                          <AlertTriangle size={12} /> Schedule Conflict
                        </button>
                      )}
                    </div>
                    <p className="font-label-sm text-label-sm mt-xs text-secondary dark:text-on-tertiary-container">{highlightMatch(row.DosenPengampuh)}</p>
                    <p className="font-body-md text-body-md mt-xs text-primary dark:text-dark-primary">{highlightMatch(row.Jam)} • {highlightMatch(row.Ruang)}</p>
                    {row.Keterangan && row.Keterangan !== '-' && (
                      <p className="font-label-sm text-label-sm mt-xs text-secondary dark:text-on-tertiary-container">Notes: {row.Keterangan}</p>
                    )}
                    <div className="mt-sm flex justify-end gap-xs">
                      <button onClick={() => startEdit(gi)} className="flex h-7 w-7 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-variant hover:text-primary dark:text-on-tertiary-container dark:hover:bg-dark-surface dark:hover:text-dark-primary" title="Edit"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(gi)} className="flex h-7 w-7 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error/10 hover:text-error dark:text-on-tertiary-container dark:hover:bg-dark-error/10 dark:hover:text-dark-error" title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Collision detail overlay */}
      {showCollisionDetail !== null && (
        <div className="mt-md rounded-2xl border-2 border-error/30 bg-error/5 p-lg no-print dark:border-dark-error/30 dark:bg-dark-error/5">
          <div className="mb-md flex items-center justify-between">
            <p className="font-body-semibold text-body-semibold flex items-center gap-sm text-error dark:text-dark-error">
              <AlertTriangle size={14} /> Conflict Details
            </p>
            <button onClick={() => setShowCollisionDetail(null)} className="rounded-full p-sm text-secondary transition-colors hover:text-primary dark:text-on-tertiary-container dark:hover:text-dark-primary"><X size={14} /></button>
          </div>
          <div className="space-y-sm">
            {[showCollisionDetail, ...(collisionMap.get(showCollisionDetail) || [])].sort((a, b) => a - b).map((idx) => {
              const r = merged[idx];
              return (
                <div key={idx} className={cn('rounded-xl border p-md', idx === showCollisionDetail ? 'border-error/40 bg-error/10 dark:border-dark-error/40 dark:bg-dark-error/10' : 'border-border bg-surface dark:border-dark-border dark:bg-dark-surface')}>
                  <div className="flex items-center justify-between">
                    <p className="font-body-semibold text-body-semibold text-primary dark:text-dark-primary">{r.MataKuliah}</p>
                    <div className="flex gap-sm">
                      <button onClick={() => { startEdit(idx); setShowCollisionDetail(null); }} className="font-label-sm text-label-sm flex items-center gap-xs text-secondary transition-colors hover:text-primary dark:text-on-tertiary-container dark:hover:text-dark-primary"><Pencil size={10} /> Edit</button>
                      <button onClick={() => handleDelete(idx)} className="font-label-sm text-label-sm flex items-center gap-xs text-secondary transition-colors hover:text-error dark:text-on-tertiary-container dark:hover:text-dark-error"><Trash2 size={10} /> Delete</button>
                    </div>
                  </div>
                  <div className="font-body-md text-body-md mt-sm text-secondary dark:text-on-tertiary-container">
                    {r.Hari} • {r.Jam} • {r.Ruang || 'No room'} • {r.DosenPengampuh || 'No lecturer'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
      <label className={cn('font-label-sm text-label-sm mb-sm block text-secondary dark:text-on-tertiary-container', small && 'text-[10px]')}>{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn(
          'font-body-md text-body-md w-full rounded-lg border border-border bg-surface px-md text-primary outline-none transition-colors placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-dark-border dark:bg-dark-surface dark:text-dark-primary dark:placeholder:text-on-tertiary-container',
          small ? 'h-8 text-[11px]' : 'h-10',
        )}
      />
    </div>
  );
}

export default ResultPage;
