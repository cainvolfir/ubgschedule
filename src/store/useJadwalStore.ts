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

interface JadwalState {
  dataKRS: DataKRS | null;
  kodeMKTerverifikasi: string[];
  dataTeoriMentah: DataTeoriMentah[];
  kelasPilihanUser: Record<string, string>;
  jadwalTeoriTerpilih: DataTeoriMentah[];
  dataPraktikum: unknown[];
  jadwalFinal: unknown[];

  setKRSResult: (krs: DataKRS, kodeMK: string[]) => void;
  setDataTeoriMentah: (data: DataTeoriMentah[]) => void;
  setKelasPilihanUser: (pilihan: Record<string, string>) => void;
  setJadwalTeoriTerpilih: (data: DataTeoriMentah[]) => void;
  setDataPraktikum: (data: unknown[]) => void;
  setJadwalFinal: (data: unknown[]) => void;
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

  reset: () => set({ ...initialState }),
}));
