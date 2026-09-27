import { useState } from 'react';

interface UnifiedClass {
  id: string;
  kode: string;
  nama: string;
  kelas: string;
  keterangan: string;
  sks: string;
  hari: string;
  jam: string;
  ruang: string;
  dosen: string;
  isPraktikum: boolean;
}

interface EditModalProps {
  row: UnifiedClass;
  onSave: (updatedRow: UnifiedClass) => void;
  onClose: () => void;
}

export function EditModal({ row, onSave, onClose }: EditModalProps) {
  const [fields, setFields] = useState<Partial<UnifiedClass>>({
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    kelas: row.kelas,
    keterangan: row.keterangan,
    sks: row.sks,
    hari: row.hari,
    jam: row.jam,
    ruang: row.ruang,
    dosen: row.dosen,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields({ ...fields, [name]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div
        className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_#000000] p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xl font-bold">Edit Data Kelas</span>
          <button
            onClick={onClose}
            className="text-black opacity-50 hover:text-black transition-colors"
          >
            ✕
          </button>
        </div>

        <form>
          <div className="mb-3">
            <label className="font-bold text-sm mb-1 block">Nama Mata Kuliah</label>
            <input
              type="text"
              name="nama"
              value={fields.nama || ''}
              onChange={handleChange}
              className="border-2 border-black rounded-none px-3 py-2 w-full"
            />
          </div>

          <div className="mb-3">
            <label className="font-bold text-sm mb-1 block">Kelas</label>
            <input
              type="text"
              name="kelas"
              value={fields.kelas || ''}
              onChange={handleChange}
              className="border-2 border-black rounded-none px-3 py-2 w-full"
            />
          </div>

          <div className="mb-3">
            <label className="font-bold text-sm mb-1 block">SKS</label>
            <input
              type="text"
              name="sks"
              value={fields.sks || ''}
              onChange={handleChange}
              className="border-2 border-black rounded-none px-3 py-2 w-full"
            />
          </div>

          <div className="mb-3">
            <label className="font-bold text-sm mb-1 block">Dosen Pengampuh</label>
            <input
              type="text"
              name="dosen"
              value={fields.dosen || ''}
              onChange={handleChange}
              className="border-2 border-black rounded-none px-3 py-2 w-full"
            />
          </div>

          <div className="mb-3">
            <label className="font-bold text-sm mb-1 block">Hari</label>
            <select
              name="hari"
              value={fields.hari || ''}
              onChange={(e) => setFields({ ...fields, hari: e.target.value })}
              className="border-2 border-black rounded-none px-3 py-2 w-full bg-white"
            >
              <option value="">Pilih Hari</option>
              <option value="Senin">Senin</option>
              <option value="Selasa">Selasa</option>
              <option value="Rabu">Rabu</option>
              <option value="Kamis">Kamis</option>
              <option value="Jumat">Jumat</option>
              <option value="Sabtu">Sabtu</option>
              <option value="Minggu">Minggu</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="font-bold text-sm mb-1 block">Ruang</label>
            <input
              type="text"
              name="ruang"
              value={fields.ruang || ''}
              onChange={handleChange}
              className="border-2 border-black rounded-none px-3 py-2 w-full"
            />
          </div>

          <div className="mb-3">
            <label className="font-bold text-sm mb-1 block">Keterangan</label>
            <input
              type="text"
              name="keterangan"
              value={fields.keterangan || ''}
              onChange={handleChange}
              className="border-2 border-black rounded-none px-3 py-2 w-full"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white text-black border-2 border-black rounded-none px-4 py-2 font-bold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
const updated: UnifiedClass = {
                  id: fields.id ?? row.id,
                  kode: fields.kode ?? row.kode,
                  nama: fields.nama ?? row.nama,
                  kelas: fields.kelas ?? row.kelas,
                  keterangan: fields.keterangan ?? row.keterangan,
                  sks: fields.sks ?? row.sks,
                  hari: fields.hari ?? row.hari,
                  jam: fields.jam ?? row.jam,
                  ruang: fields.ruang ?? row.ruang,
                  dosen: fields.dosen ?? row.dosen,
                  isPraktikum: row.isPraktikum,
                };
                onSave(updated);
              }}
              className="bg-primary text-black border-2 border-black rounded-none px-4 py-2 font-bold"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}