import { create } from 'zustand';

export interface DataKRS {
  Nama: string;
  NIM: string;
  Semester: string;
}

export interface DataTeoriMentah {
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
  dataKRS: DataKRS | null;
  kodeMKTerverifikasi: string[];
  dataTeoriMentah: DataTeoriMentah[];
  kelasPilihanUser: Record<string, string>;
  jadwalTeoriTerpilih: DataTeoriMentah[];
  dataPraktikum: unknown[];
  jadwalFinal: unknown[];

  praktikumRoomPrefixes: string[];
  selectedRoomPrefix: string;
  praktikumCandidates: PraktikumCandidate[];
  selectedCandidateIds: Set<string>;
  isScanning: boolean;
  isParsing: boolean;

  setKRSResult: (krs: DataKRS, kodeMK: string[]) => void;
  setDataTeoriMentah: (data: DataTeoriMentah[]) => void;
  setKelasPilihanUser: (pilihan: Record<string, string>) => void;
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
  dataKRS: null,
  kodeMKTerverifikasi: [],
  dataTeoriMentah: [],
  kelasPilihanUser: {},
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

  setKRSResult: (krs, kodeMK) =>
    set({ dataKRS: krs, kodeMKTerverifikasi: kodeMK }),

  setDataTeoriMentah: (data) => set({ dataTeoriMentah: data }),

  setKelasPilihanUser: (pilihan) => set({ kelasPilihanUser: pilihan }),

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
