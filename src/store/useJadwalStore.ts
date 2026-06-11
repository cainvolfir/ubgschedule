import { create } from 'zustand';

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

interface JadwalState {
  dataTeoriMentah: DataTeoriMentah[];
  selectedTheoryRowIds: Set<string>;
  jadwalTeoriTerpilih: DataTeoriMentah[];
  dataPraktikum: unknown[];
  jadwalFinal: unknown[];

  praktikumRoomPrefixes: string[];
  selectedRoomPrefix: string;
  praktikumCandidates: PraktikumCandidate[];
  selectedCandidateIds: Set<string>;
  isScanning: boolean;
  isParsing: boolean;

  setDataTeoriMentah: (data: DataTeoriMentah[]) => void;
  setSelectedTheoryRowIds: (ids: Set<string>) => void;
  toggleTheoryRowId: (id: string) => void;
  setJadwalTeoriTerpilih: (data: DataTeoriMentah[]) => void;
  setDataPraktikum: (data: unknown[]) => void;
  setJadwalFinal: (data: unknown[]) => void;
  setPraktikumRoomPrefixes: (prefixes: string[]) => void;
  setSelectedRoomPrefix: (prefix: string) => void;
  setPraktikumCandidates: (candidates: PraktikumCandidate[]) => void;
  setSelectedCandidateIds: (ids: Set<string>) => void;
  toggleCandidateId: (id: string) => void;
  setIsScanning: (v: boolean) => void;
  setIsParsing: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  dataTeoriMentah: [],
  selectedTheoryRowIds: new Set<string>(),
  jadwalTeoriTerpilih: [],
  dataPraktikum: [],
  jadwalFinal: [],
  praktikumRoomPrefixes: [],
  selectedRoomPrefix: '',
  praktikumCandidates: [],
  selectedCandidateIds: new Set<string>(),
  isScanning: false,
  isParsing: false,
};

export const useJadwalStore = create<JadwalState>((set) => ({
  ...initialState,

  setDataTeoriMentah: (data) => set({ dataTeoriMentah: data }),

  setSelectedTheoryRowIds: (ids) => set({ selectedTheoryRowIds: ids }),

  toggleTheoryRowId: (id) =>
    set((state) => {
      const next = new Set(state.selectedTheoryRowIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      const next = new Set(state.selectedCandidateIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedCandidateIds: next };
    }),

  setIsScanning: (v) => set({ isScanning: v }),

  setIsParsing: (v) => set({ isParsing: v }),

  reset: () => set({ ...initialState }),
}));
