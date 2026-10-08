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
  courseLabGroupSelections: Record<string, string>;

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
  setCourseLabGroupSelection: (kode: string, groupId: string) => void;
  clearAutoPraktikumRaw: () => void;
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
  courseLabGroupSelections: {} as Record<string, string>,
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
        set((state) => {
          const next = state.selectedTheoryRowIds.includes(id)
            ? state.selectedTheoryRowIds.filter((x) => x !== id)
            : [...state.selectedTheoryRowIds, id];
          return { selectedTheoryRowIds: next };
        }),

      setJadwalTeoriTerpilih: (data) => set({ jadwalTeoriTerpilih: data }),

      setDataPraktikum: (data) => set({ dataPraktikum: data }),

      setJadwalFinal: (data) => set({ jadwalFinal: data }),

      setPraktikumRoomPrefixes: (prefixes) => set({ praktikumRoomPrefixes: prefixes }),

      setSelectedRoomPrefix: (prefix) => set({ selectedRoomPrefix: prefix }),

      setPraktikumCandidates: (candidates) => set({ praktikumCandidates: candidates }),

      setSelectedCandidateIds: (ids) => set({ selectedCandidateIds: ids }),

      toggleCandidateId: (id) =>
        set((state) => {
          const next = state.selectedCandidateIds.includes(id)
            ? state.selectedCandidateIds.filter((x) => x !== id)
            : [...state.selectedCandidateIds, id];
          return { selectedCandidateIds: next };
        }),

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
        }),

      clearCourseClassSelections: () => set({ courseClassSelections: {} }),

      setAutoPraktikumRaw: (candidates) => set({ autoPraktikumRaw: candidates }),

      setCourseLabGroupSelection: (kode, groupId) =>
        set((state) => ({
          courseLabGroupSelections: { ...state.courseLabGroupSelections, [kode]: groupId },
        })),

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
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 3) {
          return { ...(persistedState as Record<string, unknown>), scheduleMode: 'auto-codes' };
        }
        return persistedState;
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
      }),
    },
  ),
);