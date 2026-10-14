import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DataTeoriMentah {
  id: string;
  KodeMK: string;
  MataKuliah: string;
  Kelas: string;
  SKS: string;
  SMT: string;
  DosenPengampuh: string;
  Hari: string;
  Jam: string;
  Ruang: string;
  Keterangan: string;
}

export interface PraktikumCandidate {
  id: string;
  courseName: string;
  kelas: string;
  keterangan: string;
  dosen: string;
  semester: string;
  hari: string;
  jam: string;
  ruang: string;
  kodeMk?: string;
}

interface CourseColor {
  [courseName: string]: string; // hex color
}

export type ScheduleMode = 'manual' | 'auto-codes';

/** Map of course code -> selected items (theory row ids or practical candidate ids). */
export type CourseSelectionMap = Record<string, string[]>;

/**
 * Normalize any persisted selection value into a string[].
 * Accepts the legacy single-string shape ({ kode: 'row-id' }) as well as arrays.
 */
export function normalizeSelectionMap(value: unknown): CourseSelectionMap {
  if (!value || typeof value !== 'object') return {};
  const out: CourseSelectionMap = {};
  for (const [kode, raw] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(raw)) {
      out[kode] = raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
    } else if (typeof raw === 'string' && raw.length > 0) {
      out[kode] = [raw];
    }
  }
  return out;
}

/**
 * Legacy whole-cohort noise the parser used to fold into a Keterangan:
 * 'TEORI - Jadwal Teori (2T) dari Akademik - Kelompok Semua Mhs'. The
 * '- Kelompok Semua Mhs' tail says nothing about the section and made every
 * row look like a lab group in older persisted data.
 */
export const STALE_GROUP_PATTERN = /\s*-\s*(?:kelompok\s+)?semua\s+mhs\b/gi;

/** Strip the stale whole-cohort tail from a Keterangan and tidy the result. */
export function sanitizeKeterangan(keterangan: string): string {
  const cleaned = String(keterangan ?? '')
    .replace(STALE_GROUP_PATTERN, '')
    .replace(/\s*-\s*$/, '')
    .trim();
  return cleaned === '-' ? '' : cleaned;
}

/** Rebuild a list, dropping the stale tail from each item's Keterangan. */
function sanitizeKeteranganRows<T extends { Keterangan?: string }>(rows: T[]): T[] {
  return rows.map((row) =>
    sanitizeKeterangan(row.Keterangan || '') === (row.Keterangan || '')
      ? row
      : { ...row, Keterangan: sanitizeKeterangan(row.Keterangan || '') }
  );
}

/** Same, for praktikum candidates which carry a lowercase `keterangan`. */
function sanitizeCandidateList<T extends { keterangan?: string }>(rows: T[]): T[] {
  return rows.map((row) =>
    sanitizeKeterangan(row.keterangan || '') === (row.keterangan || '')
      ? row
      : { ...row, keterangan: sanitizeKeterangan(row.keterangan || '') }
  );
}

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

interface JadwalState {
  wizardStep: 1 | 2 | 3;
  dataTeoriMentah: DataTeoriMentah[];
  selectedTheoryRowIds: string[];
  jadwalTeoriTerpilih: DataTeoriMentah[];
  dataPraktikum: unknown[];
  jadwalFinal: unknown[];
  courseColors: CourseColor;

  praktikumRoomPrefixes: string[];
  selectedRoomPrefix: string;
  praktikumCandidates: PraktikumCandidate[];
  selectedCandidateIds: string[];
  praktikumFileData: number[];
  isScanning: boolean;
  isParsing: boolean;

  // --- Auto-codes mode state ---
  scheduleMode: ScheduleMode;
  courseCodeInput: string;
  parsedCourseCodes: string[];
  courseClassSelections: Record<string, string>;
  globalClassSelection: string;
  autoPraktikumRaw: PraktikumCandidate[];
  courseLabGroupSelections: CourseSelectionMap;
  courseTheorySelections: CourseSelectionMap;

  setWizardStep: (step: 1 | 2 | 3) => void;
  setPraktikumFileData: (data: number[]) => void;
  setDataTeoriMentah: (data: DataTeoriMentah[]) => void;
  setSelectedTheoryRowIds: (ids: string[]) => void;
  toggleTheoryRowId: (id: string) => void;
  setJadwalTeoriTerpilih: (data: DataTeoriMentah[]) => void;
  setDataPraktikum: (data: unknown[]) => void;
  setJadwalFinal: (data: unknown[]) => void;
  setPraktikumRoomPrefixes: (prefixes: string[]) => void;
  setSelectedRoomPrefix: (prefix: string) => void;
  setPraktikumCandidates: (candidates: PraktikumCandidate[]) => void;
  setSelectedCandidateIds: (ids: string[]) => void;
  toggleCandidateId: (id: string) => void;
  removeJadwalTeoriRow: (id: string) => void;
  updateJadwalTeoriRow: (id: string, row: DataTeoriMentah) => void;
  updatePraktikumCandidate: (id: string, candidate: PraktikumCandidate) => void;
  setIsScanning: (v: boolean) => void;
  setIsParsing: (v: boolean) => void;
  setScheduleMode: (mode: ScheduleMode) => void;
  setCourseCodeInput: (input: string) => void;
  setParsedCourseCodes: (codes: string[]) => void;
  setCourseClassSelection: (kode: string, kelas: string) => void;
  setGlobalClassSelection: (kelas: string) => void;
  applyGlobalToAll: () => void;
  clearAutoCodesState: () => void;
  clearCourseClassSelections: () => void;
  setAutoPraktikumRaw: (candidates: PraktikumCandidate[]) => void;
  clearAutoPraktikumRaw: () => void;

  // --- Auto-codes multi-selection ---
  setCourseTheorySelections: (kode: string, rowIds: string[]) => void;
  toggleCourseTheorySelection: (kode: string, rowId: string) => void;
  setCourseLabGroupSelections: (kode: string, labIds: string[]) => void;
  toggleCourseLabGroupSelection: (kode: string, labId: string) => void;
  /** Legacy single-group setter. Kept for compatibility; writes a one-item array. */
  setCourseLabGroupSelection: (kode: string, groupId: string) => void;
  selectAllForCourse: (kode: string, theoryRowIds: string[], labCandidateIds: string[]) => void;
  deselectAllForCourse: (kode: string) => void;
  selectAllCourses: (allSelections: {
    theorySelections: CourseSelectionMap;
    labSelections: CourseSelectionMap;
  }) => void;
  deselectAllCourses: () => void;

  addJadwalRow: (row: Record<string, unknown>) => void;
  updateJadwalRow: (index: number, row: Record<string, unknown>) => void;
  removeJadwalRow: (index: number) => void;
  setCourseColor: (courseName: string, color: string) => void;
  reset: () => void;
}

const initialState = {
  wizardStep: 1 as 1 | 2 | 3,
  dataTeoriMentah: [],
  selectedTheoryRowIds: [],
  jadwalTeoriTerpilih: [],
  dataPraktikum: [],
  jadwalFinal: [],
  courseColors: {},
  praktikumRoomPrefixes: [],
  selectedRoomPrefix: '',
  praktikumCandidates: [],
  selectedCandidateIds: [],
  praktikumFileData: [] as number[],
  isScanning: false,
  isParsing: false,
  scheduleMode: 'auto-codes' as ScheduleMode,
  courseCodeInput: '',
  parsedCourseCodes: [],
  courseClassSelections: {},
  globalClassSelection: '',
  autoPraktikumRaw: [] as PraktikumCandidate[],
  courseLabGroupSelections: {} as CourseSelectionMap,
  courseTheorySelections: {} as CourseSelectionMap,
};

export const useJadwalStore = create<JadwalState>()(
  persist(
    (set) => ({
      ...initialState,

      setWizardStep: (step) => set({ wizardStep: step }),

      setPraktikumFileData: (data) => set({ praktikumFileData: data }),

      setDataTeoriMentah: (data) => set({ dataTeoriMentah: data }),

      setSelectedTheoryRowIds: (ids) => set({ selectedTheoryRowIds: ids }),

      toggleTheoryRowId: (id) =>
        set((state) => ({
          selectedTheoryRowIds: toggleInList(state.selectedTheoryRowIds, id),
        })),

      setJadwalTeoriTerpilih: (data) => set({ jadwalTeoriTerpilih: data }),

      setDataPraktikum: (data) => set({ dataPraktikum: data }),

      setJadwalFinal: (data) => set({ jadwalFinal: data }),

      setPraktikumRoomPrefixes: (prefixes) => set({ praktikumRoomPrefixes: prefixes }),

      setSelectedRoomPrefix: (prefix) => set({ selectedRoomPrefix: prefix }),

      setPraktikumCandidates: (candidates) => set({ praktikumCandidates: candidates }),

      setSelectedCandidateIds: (ids) => set({ selectedCandidateIds: ids }),

      toggleCandidateId: (id) =>
        set((state) => ({
          selectedCandidateIds: toggleInList(state.selectedCandidateIds, id),
        })),

      removeJadwalTeoriRow: (id: string) =>
        set((state) => ({
          jadwalTeoriTerpilih: state.jadwalTeoriTerpilih.filter((r) => r.id !== id),
          selectedTheoryRowIds: state.selectedTheoryRowIds.filter((x) => x !== id),
        })),

      updateJadwalTeoriRow: (id: string, row: DataTeoriMentah) =>
        set((state) => ({
          jadwalTeoriTerpilih: state.jadwalTeoriTerpilih.map((r) => r.id === id ? row : r),
        })),

      updatePraktikumCandidate: (id: string, candidate: PraktikumCandidate) =>
        set((state) => ({
          praktikumCandidates: state.praktikumCandidates.map((c) => c.id === id ? candidate : c),
        })),

      setIsScanning: (v) => set({ isScanning: v }),

      setIsParsing: (v) => set({ isParsing: v }),

      setScheduleMode: (mode) =>
        set((state) => {
          if (mode === 'manual') {
            return {
              scheduleMode: 'manual',
              courseClassSelections: {},
              globalClassSelection: '',
              autoPraktikumRaw: [],
              courseLabGroupSelections: {},
              courseTheorySelections: {},
              selectedTheoryRowIds: [],
            };
          }
          // Switching to auto-codes: clear manual selection state
          return {
            scheduleMode: 'auto-codes',
            selectedTheoryRowIds: [],
            wizardStep: state.wizardStep === 3 ? 1 : state.wizardStep,
          };
        }),

      setCourseCodeInput: (input) => set({ courseCodeInput: input }),

      setParsedCourseCodes: (codes) => set({ parsedCourseCodes: codes }),

      setCourseClassSelection: (kode, kelas) =>
        set((state) => ({
          courseClassSelections: { ...state.courseClassSelections, [kode]: kelas },
        })),

      setGlobalClassSelection: (kelas) => set({ globalClassSelection: kelas }),

      applyGlobalToAll: () =>
        set((state) => {
          if (!state.globalClassSelection) return {};
          const next: Record<string, string> = {};
          for (const code of state.parsedCourseCodes) {
            next[code] = state.globalClassSelection;
          }
          return { courseClassSelections: next };
        }),

      clearAutoCodesState: () =>
        set({
          courseCodeInput: '',
          parsedCourseCodes: [],
          courseClassSelections: {},
          globalClassSelection: '',
          autoPraktikumRaw: [],
          courseLabGroupSelections: {},
          courseTheorySelections: {},
        }),

      clearCourseClassSelections: () => set({ courseClassSelections: {} }),

      setAutoPraktikumRaw: (candidates) => set({ autoPraktikumRaw: candidates }),

      setCourseTheorySelections: (kode, rowIds) =>
        set((state) => ({
          courseTheorySelections: { ...state.courseTheorySelections, [kode]: [...rowIds] },
        })),

      toggleCourseTheorySelection: (kode, rowId) =>
        set((state) => ({
          courseTheorySelections: {
            ...state.courseTheorySelections,
            [kode]: toggleInList(state.courseTheorySelections[kode] ?? [], rowId),
          },
        })),

      setCourseLabGroupSelections: (kode, labIds) =>
        set((state) => ({
          courseLabGroupSelections: { ...state.courseLabGroupSelections, [kode]: [...labIds] },
        })),

      toggleCourseLabGroupSelection: (kode, labId) =>
        set((state) => ({
          courseLabGroupSelections: {
            ...state.courseLabGroupSelections,
            [kode]: toggleInList(state.courseLabGroupSelections[kode] ?? [], labId),
          },
        })),

      setCourseLabGroupSelection: (kode, groupId) =>
        set((state) => ({
          courseLabGroupSelections: {
            ...state.courseLabGroupSelections,
            [kode]: groupId ? [groupId] : [],
          },
        })),

      selectAllForCourse: (kode, theoryRowIds, labCandidateIds) =>
        set((state) => ({
          courseTheorySelections: {
            ...state.courseTheorySelections,
            [kode]: [...theoryRowIds],
          },
          courseLabGroupSelections: {
            ...state.courseLabGroupSelections,
            [kode]: [...labCandidateIds],
          },
        })),

      deselectAllForCourse: (kode) =>
        set((state) => {
          const theory = { ...state.courseTheorySelections };
          const lab = { ...state.courseLabGroupSelections };
          const classSel = { ...state.courseClassSelections };
          delete theory[kode];
          delete lab[kode];
          delete classSel[kode];
          return {
            courseTheorySelections: theory,
            courseLabGroupSelections: lab,
            courseClassSelections: classSel,
          };
        }),

      selectAllCourses: ({ theorySelections, labSelections }) =>
        set(() => ({
          courseTheorySelections: normalizeSelectionMap(theorySelections),
          courseLabGroupSelections: normalizeSelectionMap(labSelections),
        })),

      deselectAllCourses: () =>
        set({
          courseTheorySelections: {},
          courseLabGroupSelections: {},
          courseClassSelections: {},
          globalClassSelection: '',
        }),

      clearAutoPraktikumRaw: () =>
        set({
          autoPraktikumRaw: [],
          courseLabGroupSelections: {},
        }),

      addJadwalRow: (row) =>
        set((state) => ({ jadwalFinal: [...state.jadwalFinal, row] })),

      updateJadwalRow: (index, row) =>
        set((state) => {
          const next = [...state.jadwalFinal];
          next[index] = row;
          return { jadwalFinal: next };
        }),

      removeJadwalRow: (index) =>
        set((state) => ({
          jadwalFinal: state.jadwalFinal.filter((_, i) => i !== index),
        })),

      setCourseColor: (courseName, color) =>
        set((state) => ({
          courseColors: { ...state.courseColors, [courseName]: color },
        })),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'ubg-schedule-storage',
      version: 5,
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        const next: Record<string, unknown> = { ...state };
        if (version < 3) {
          next.scheduleMode = 'auto-codes';
        }
        if (version < 4) {
          // v3 and below stored a single lab group id per course; multi-select uses arrays.
          next.courseLabGroupSelections = normalizeSelectionMap(state.courseLabGroupSelections);
          next.courseTheorySelections = normalizeSelectionMap(state.courseTheorySelections);
        }
        if (version < 5) {
          // v4 and below stored '- Kelompok Semua Mhs' inside Keterangan; the
          // whole-cohort marker made every theory row read as a lab row.
          for (const key of ['dataTeoriMentah', 'jadwalTeoriTerpilih'] as const) {
            const rows = state[key];
            if (Array.isArray(rows)) {
              next[key] = sanitizeKeteranganRows(rows as { Keterangan?: string }[]);
            }
          }
          for (const key of ['praktikumCandidates', 'autoPraktikumRaw'] as const) {
            const rows = state[key];
            if (Array.isArray(rows)) {
              next[key] = sanitizeCandidateList(rows as { keterangan?: string }[]);
            }
          }
        }
        return next;
      },
      // Sanitize on every hydration: a stale marker can survive in storage
      // written by an older parser even after the version bump.
      merge: (persistedState: unknown, currentState: JadwalState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<JadwalState>),
        };
        return {
          ...merged,
          dataTeoriMentah: sanitizeKeteranganRows(
            Array.isArray(merged.dataTeoriMentah) ? merged.dataTeoriMentah : []
          ),
          jadwalTeoriTerpilih: sanitizeKeteranganRows(
            Array.isArray(merged.jadwalTeoriTerpilih) ? merged.jadwalTeoriTerpilih : []
          ),
          praktikumCandidates: sanitizeCandidateList(
            Array.isArray(merged.praktikumCandidates) ? merged.praktikumCandidates : []
          ),
          autoPraktikumRaw: sanitizeCandidateList(
            Array.isArray(merged.autoPraktikumRaw) ? merged.autoPraktikumRaw : []
          ),
          courseLabGroupSelections: normalizeSelectionMap(merged.courseLabGroupSelections),
          courseTheorySelections: normalizeSelectionMap(merged.courseTheorySelections),
        };
      },
      partialize: (state) => ({
        wizardStep: state.wizardStep,
        dataTeoriMentah: state.dataTeoriMentah,
        selectedTheoryRowIds: state.selectedTheoryRowIds,
        jadwalTeoriTerpilih: state.jadwalTeoriTerpilih,
        jadwalFinal: state.jadwalFinal,
        courseColors: state.courseColors,
        praktikumRoomPrefixes: state.praktikumRoomPrefixes,
        selectedRoomPrefix: state.selectedRoomPrefix,
        praktikumCandidates: state.praktikumCandidates,
        selectedCandidateIds: state.selectedCandidateIds,
        praktikumFileData: state.praktikumFileData,
        scheduleMode: state.scheduleMode,
        courseCodeInput: state.courseCodeInput,
        parsedCourseCodes: state.parsedCourseCodes,
        courseClassSelections: state.courseClassSelections,
        globalClassSelection: state.globalClassSelection,
        autoPraktikumRaw: state.autoPraktikumRaw,
        courseLabGroupSelections: state.courseLabGroupSelections,
        courseTheorySelections: state.courseTheorySelections,
      }),
    },
  ),
);