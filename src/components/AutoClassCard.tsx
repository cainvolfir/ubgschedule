import { CaretDown, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import type { DataTeoriMentah } from '../store/useJadwalStore';

interface AutoClassCardProps {
  code: string;
  matches: DataTeoriMentah[];
  selectedKelas: string;
  globalKelas: string;
  onSelectKelas: (kelas: string) => void;
}

export default function AutoClassCard({
  code,
  matches,
  selectedKelas,
  globalKelas,
  onSelectKelas,
}: AutoClassCardProps) {
  const found = matches.length > 0;
  const uniqueKelas = [...new Set(matches.map((r) => r.Kelas))].sort();
  const singleSection = uniqueKelas.length === 1;
  const effectiveKelas = selectedKelas || globalKelas;

  if (!found) {
    return (
      <div className="border-2 border-black rounded-none p-4 bg-gray-100 opacity-70">
        <div className="flex items-center gap-2 mb-2">
          <XCircle weight="fill" className="text-red-500 shrink-0" />
          <span className="font-mono font-extrabold text-sm bg-black text-white px-2 py-0.5 border-2 border-black rounded-none">
            {code}
          </span>
        </div>
        <p className="text-sm font-bold text-gray-500 flex items-center gap-1">
          <Warning weight="fill" size={14} />
          Kode MK tidak ditemukan di file yang diunggah.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black rounded-none p-4 bg-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-brutal transition-transform">
      {/* Header: code + section count */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle weight="fill" className="text-green-600 shrink-0" />
        <span className="font-mono font-extrabold text-sm bg-black text-white px-2 py-0.5 border-2 border-black rounded-none">
          {code}
        </span>
        <span className="text-xs font-bold text-gray-600 ml-auto">
          {matches.length} kelas • {uniqueKelas.length} pilihan
        </span>
      </div>

      {/* Course name (from first match) */}
      <h4 className="font-extrabold text-lg uppercase leading-tight mb-3">
        {matches[0]?.MataKuliah || code}
      </h4>

      {/* Kelas dropdown */}
      <div className="mb-3">
        <label className="block font-bold text-xs uppercase mb-1">
          Kelas {singleSection && '(otomatis — 1 kelas)'}
        </label>
        <div className="relative">
          <select
            value={selectedKelas || globalKelas}
            onChange={(e) => onSelectKelas(e.target.value)}
            disabled={singleSection}
            className={
              'w-full appearance-none bg-secondary rounded-none border-2 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none focus:shadow-brutal-sm hover:shadow-brutal-sm transition-shadow text-black ' +
              (singleSection ? 'opacity-60 cursor-not-allowed' : '')
            }
          >
            <option value="">— Pilih Kelas —</option>
            {uniqueKelas.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <CaretDown
            weight="bold"
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg"
          />
        </div>
        {selectedKelas && globalKelas && selectedKelas !== globalKelas && (
          <p className="text-xs font-bold text-yellow-600 mt-1">
            Override global (global: {globalKelas})
          </p>
        )}
      </div>

      {/* Section list */}
      <div className="border-t-2 border-dashed border-gray-400 pt-3">
        <p className="text-xs font-bold uppercase text-gray-500 mb-2">Kelas Tersedia</p>
        <ul className="space-y-1">
          {matches.map((row) => {
            const isSelected = effectiveKelas === row.Kelas;
            return (
              <li
                key={row.id}
                className={
                  'flex items-center gap-2 text-xs font-semibold border-2 border-black rounded-none px-2 py-1.5 ' +
                  (isSelected ? 'bg-tertiary text-white' : 'bg-gray-50 text-black')
                }
              >
                <span className="font-mono font-bold w-6 text-center">{row.Kelas}</span>
                <span>—</span>
                <span>{row.Hari}</span>
                <span>{row.Jam}</span>
                <span className="ml-auto truncate">{row.Ruang}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
