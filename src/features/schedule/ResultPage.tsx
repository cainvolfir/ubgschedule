import { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft, ChevronDown, AlertTriangle, Pencil, Trash2, Plus, X, Check,
  RotateCcw, Search, LayoutGrid, List, Printer, Download,
} from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { CatState } from '../../components/CatState';
import { UBGMascot } from '../../components/UBGMascot';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/Toast';
import { WeeklyGrid } from './WeeklyGrid';
import { CourseColorPicker, ColorDot } from './CourseColorPicker';

const ExportCanvas = lazy(() => import('../../features/exporter/ExportCanvas'));
const ExportICS = lazy(() => import('../../features/exporter/ExportICS'));
const ExportCopy = lazy(() => import('./ExportCopy'));

const HARI_ORDER: Record<string, number> = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 7 };
const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface FinalRow {
  Hari: string; MataKuliah: string; DosenPengampuh: string; SKS: string; Jam: string; Ruang: string; Keterangan: string;
}

const EMPTY_ROW: FinalRow = {
  Hari: 'Senin', MataKuliah: '', DosenPengampuh: '', SKS: '2',
  Jam: '08.00-09.40', Ruang: '', Keterangan: '-',
};

function toFinalRow(r: Record<string, unknown>): FinalRow {
  return {
    Hari: String(r?.Hari ?? ''), MataKuliah: String(r?.MataKuliah ?? ''),
    DosenPengampuh: String(r?.DosenPengampuh ?? ''), SKS: String(r?.SKS ?? ''),
    Jam: String(r?.Jam ?? ''), Ruang: String(r?.Ruang ?? ''),
    Keterangan: String(r?.Keterangan ?? '-'),
  };
}

type ViewMode = 'table' | 'grid';

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
  const [viewMode, setViewMode] = useState<ViewMode>('table');

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
    const row: Record<string, unknown> = { KodeMK: '', ...addForm };
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
          <Button variant="default" className="pixel-font mt-2 text-[9px]" onClick={goBack}>Back to Upload</Button>
        </CatState>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      {/* Print-only header */}
      <div className="print-only hidden">
        <div className="print-header">
          <h1>📅 Jadwal Perkuliahan — UBG Schedule</h1>
          <span className="print-date">Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-4 sm:mb-6 no-print">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-card text-foreground shadow-sm transition-all hover:border-[var(--primary)] hover:shadow-md hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="pixel-font text-[10px] uppercase tracking-[0.2em] text-primary">Your Schedule</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {filteredMerged.length !== merged.length
                  ? `${filteredMerged.length} of ${merged.length} classes`
                  : `${merged.length} classes across ${dayGroups.length} days`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {totalCollisions > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-[9px] pixel-font text-destructive">
                <AlertTriangle size={12} className="animate-pulse" />
                {totalCollisions} collision{totalCollisions > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course, lecturer, room..."
              className="w-full rounded-xl border-2 border-[var(--border)] bg-card py-2 pl-9 pr-8 text-[11px] outline-none transition-colors focus:border-[var(--primary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border-2 border-[var(--border)] bg-card overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex h-9 w-9 items-center justify-center transition-colors',
                viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              title="Table view"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex h-9 w-9 items-center justify-center transition-colors',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <Button variant="warning" onClick={() => { setShowAddForm(true); setEditingIdx(null); setShowCollisionDetail(null); }} className="pixel-font text-[9px] gap-1.5">
            <Plus size={12} /> Add
          </Button>

          <Suspense fallback={null}><ExportCopy dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} /></Suspense>
          <Suspense fallback={null}><ExportCanvas dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} /></Suspense>
          <Suspense fallback={null}><ExportICS dayGroups={dayGroups as { hari: string; rows: FinalRow[] }[]} merged={merged} courseColors={courseColors} /></Suspense>

          <Button variant="secondary" onClick={handlePrint} className="pixel-font text-[9px] gap-1.5" title="Print schedule">
            <Printer size={12} /> Print
          </Button>

          <Button variant="destructive" onClick={resetAll} className="pixel-font text-[9px] gap-1.5" title="Reset all data">
            <RotateCcw size={11} /> Reset
          </Button>
        </div>
      </div>

      {/* Search active indicator */}
      {isSearching && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 no-print">
          <Search size={12} className="text-primary" />
          <p className="text-[11px] text-muted-foreground">
            {filteredMerged.length > 0
              ? `Showing ${filteredMerged.length} result${filteredMerged.length > 1 ? 's' : ''} for "${searchQuery}"`
              : `No results for "${searchQuery}"`}
          </p>
          <button onClick={() => setSearchQuery('')} className="ml-auto text-[10px] text-primary hover:underline">Clear</button>
        </div>
      )}

      {/* Add Class Form */}
      {showAddForm && (
        <div className="mb-4 rounded-xl border-2 border-[var(--primary)] bg-primary/5 p-4 no-print">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold text-foreground flex items-center gap-2">
              <Plus size={14} className="text-primary" /> Add New Class
            </p>
            <button onClick={() => setShowAddForm(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <FieldInput label="Mata Kuliah" value={addForm.MataKuliah} onChange={(v) => setAddForm((f) => ({ ...f, MataKuliah: v }))} placeholder="e.g. Algoritma" />
            <FieldInput label="Dosen" value={addForm.DosenPengampuh} onChange={(v) => setAddForm((f) => ({ ...f, DosenPengampuh: v }))} placeholder="e.g. Budi, S.Kom" />
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Hari</label>
              <select value={addForm.Hari} onChange={(e) => setAddForm((f) => ({ ...f, Hari: e.target.value }))} className="w-full rounded-lg border-2 border-[var(--border)] bg-card px-2 py-1.5 text-[11px] outline-none focus:border-[var(--primary)]">
                {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <FieldInput label="Jam" value={addForm.Jam} onChange={(v) => setAddForm((f) => ({ ...f, Jam: v }))} placeholder="08.00-09.40" />
            <FieldInput label="Ruang" value={addForm.Ruang} onChange={(v) => setAddForm((f) => ({ ...f, Ruang: v }))} placeholder="e.g. LAB 101" />
            <FieldInput label="SKS" value={addForm.SKS} onChange={(v) => setAddForm((f) => ({ ...f, SKS: v }))} placeholder="2" />
            <FieldInput label="Keterangan" value={addForm.Keterangan} onChange={(v) => setAddForm((f) => ({ ...f, Keterangan: v }))} placeholder="-" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="default" onClick={handleAdd} className="text-[9px] gap-1.5"><Check size={11} /> Save</Button>
            <Button variant="secondary" onClick={() => setShowAddForm(false)} className="text-[9px]">Cancel</Button>
          </div>
        </div>
      )}

      {/* ===== WEEKLY GRID VIEW ===== */}
      {viewMode === 'grid' && (
        <div className="mb-6">
          <WeeklyGrid
            merged={merged}
            collisionMap={collisionMap}
            courseColors={courseColors}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
          {/* Color legend */}
          <div className="mt-3 flex flex-wrap gap-2 no-print">
            {Object.entries(courseColors).filter(([, c]) => c).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-card px-2.5 py-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-muted-foreground max-w-[120px] truncate">{name}</span>
                <CourseColorPicker courseName={name} currentColor={color} onSetColor={handleSetColor} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== TABLE VIEW ===== */}
      {viewMode === 'table' && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <div className="rounded-xl border-2 border-[var(--border)] shadow-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="pixel-font text-[9px] bg-primary text-primary-foreground">
                    {['', 'Hari', 'Mata Kuliah', 'Dosen Pengampuh', 'SKS', 'Jam', 'Ruang', 'Keterangan', ''].map((h, i, arr) => (
                      <th key={h || i} className={`px-2 py-3.5 text-center align-middle leading-none lg:px-4 lg:py-4 font-semibold ${i < arr.length - 1 ? 'border-r border-primary-foreground/20' : ''}`}>
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
                        const cellCls = collided.length > 0 ? 'bg-destructive/5' : '';
                        const ketCls = collided.length > 0 ? 'text-destructive font-semibold' : '';
                        const rowColor = courseColors[row.MataKuliah];

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
                          <tr key={`${group.hari}-${idx}`} className={cn('text-[12px] bg-card border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-primary/5', collided.length > 0 && 'hover:bg-destructive/10')}>
                            {/* Color dot column */}
                            <td className={cn('border-r border-[var(--border)] px-1 py-3 text-center align-middle', cellCls)}>
                              <div className="flex items-center justify-center">
                                <CourseColorPicker courseName={row.MataKuliah} currentColor={rowColor} onSetColor={handleSetColor} />
                              </div>
                            </td>
                            {idx === 0 && (
                              <td className="border-r border-[var(--border)] bg-muted/50 px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4" rowSpan={group.rows.length}>
                                <span className="flex w-full items-center justify-center font-bold text-sm">{group.hari}</span>
                              </td>
                            )}
                            <td className={cn('border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4', cellCls)}>
                              <span className="flex w-full items-center justify-center font-medium">{highlightMatch(row.MataKuliah)}</span>
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4', cellCls)}>
                              <span className="flex w-full items-center justify-center">{highlightMatch(row.DosenPengampuh)}</span>
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4', cellCls)}>
                              <span className="flex w-full items-center justify-center">{row.SKS}</span>
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4', cellCls)}>
                              <span className="flex w-full items-center justify-center font-medium">{highlightMatch(row.Jam)}</span>
                            </td>
                            <td className={cn('border-r border-[var(--border)] px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4', cellCls)}>
                              <span className="flex w-full items-center justify-center">{highlightMatch(row.Ruang)}</span>
                            </td>
                            <td className={cn('px-2 py-3 text-center align-middle leading-none lg:px-4 lg:py-4', ketCls, cellCls)}>
                              <span className="flex w-full items-center justify-center">
                                <span
                                  className={cn('cursor-pointer inline-flex items-center gap-1 text-[11px]', collided.length > 0 && 'hover:underline')}
                                  onClick={() => collided.length > 0 && setShowCollisionDetail(showCollisionDetail === gi ? null : gi)}
                                >
                                  {collided.length > 0 && <AlertTriangle size={10} className="animate-pulse" />}
                                  {keterangan}
                                </span>
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center align-middle no-print">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => startEdit(gi)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Edit"><Pencil size={12} /></button>
                                <button onClick={() => handleDelete(gi)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete"><Trash2 size={12} /></button>
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
                      {hasCollision && <AlertTriangle size={12} className="text-destructive animate-pulse" />}
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
                                    {collided.length > 0 && <AlertTriangle size={10} className="animate-pulse" />}
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
      )}

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
