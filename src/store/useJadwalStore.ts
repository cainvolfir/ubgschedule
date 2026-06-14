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
}

interface CourseColor {
  [courseName: string]: string; // hex color
}

interface JadwalState {
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
  isScanning: boolean;
  isParsing: boolean;

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
  setIsScanning: (v: boolean) => void;
  setIsParsing: (v: boolean) => void;
  addJadwalRow: (row: Record<string, unknown>) => void;
  updateJadwalRow: (index: number, row: Record<string, unknown>) => void;
  removeJadwalRow: (index: number) => void;
  setCourseColor: (courseName: string, color: string) => void;
  reset: () => void;
}

const initialState = {
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
  isScanning: false,
  isParsing: false,
};

export const useJadwalStore = create<JadwalState>()(
  persist(
    (set) => ({
      ...initialState,

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

      setIsScanning: (v) => set({ isScanning: v }),

      setIsParsing: (v) => set({ isParsing: v }),

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
      version: 1,
      partialize: (state) => ({
        dataTeoriMentah: state.dataTeoriMentah,
        selectedTheoryRowIds: state.selectedTheoryRowIds,
        jadwalTeoriTerpilih: state.jadwalTeoriTerpilih,
        jadwalFinal: state.jadwalFinal,
        courseColors: state.courseColors,
        praktikumRoomPrefixes: state.praktikumRoomPrefixes,
        selectedRoomPrefix: state.selectedRoomPrefix,
        praktikumCandidates: state.praktikumCandidates,
        selectedCandidateIds: state.selectedCandidateIds,
      }),
    },
  ),
);
