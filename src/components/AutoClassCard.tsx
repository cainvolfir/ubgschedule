import { useEffect } from 'react';
import { CaretDown, CheckCircle, XCircle, Warning, Flask } from '@phosphor-icons/react';
import type { DataTeoriMentah, PraktikumCandidate } from '../store/useJadwalStore';
import { filterPraktikumByKelas } from '../utils/courseCode';

interface AutoClassCardProps {
  code: string;
  matches: DataTeoriMentah[];
  selectedKelas: string;
  globalKelas: string;
  onSelectKelas: (kelas: string) => void;
  linkedPraktikum?: PraktikumCandidate[];
  selectedLabGroup?: string;
  onSelectLabGroup?: (groupId: string) => void;
}

export default function AutoClassCard({
  code,
  matches,
  selectedKelas,
  globalKelas,
  onSelectKelas,
  linkedPraktikum = [],
  selectedLabGroup = '',
  onSelectLabGroup,
}: AutoClassCardProps) {
  const found = matches.length > 0;
  const uniqueKelas = [...new Set(matches.map((r) => r.Kelas))].sort();
  const singleSection = uniqueKelas.length === 1;
  const effectiveKelas = selectedKelas || globalKelas;

  // Practical candidates belonging to the currently selected section letter.
  const matchingPraktikum = effectiveKelas
    ? filterPraktikumByKelas(linkedPraktikum, effectiveKelas)
    : [];

  // The candidate the user has committed to (falls back to the first match).
  const effectiveLabId =
    selectedLabGroup && matchingPraktikum.some((c) => c.id === selectedLabGroup)
      ? selectedLabGroup
      : matchingPraktikum[0]?.id ?? '';

  const selectedLab =
    matchingPraktikum.find((c) => c.id === effectiveLabId) ?? matchingPraktikum[0];

  // Auto-commit the first lab sub-group when a section is chosen but nothing is set yet.
  useEffect(() => {
    if (
      matchingPraktikum.length > 0 &&
      effectiveLabId &&
      effectiveLabId !== selectedLabGroup
    ) {
      onSelectLabGroup?.(effectiveLabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLabId, selectedLabGroup, matchingPraktikum.length]);

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
    <div className="border-2 border-black rounded-none p-4 bg-white shadow-brutal">
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
              'w-full appearance-none bg-white text-black rounded-none border-2 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none ' +
              (singleSection ? 'opacity-60 cursor-not-allowed' : '')
            }
          >
            <option value="" className="bg-white text-black">— Pilih Kelas —</option>
            {uniqueKelas.map((k) => (
              <option key={k} value={k} className="bg-white text-black">
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
            const isLab = /prak|lab|kelompok/i.test(row.Keterangan || '') || /lab/i.test(row.Ruang || '') || /prak|lab/i.test(row.MataKuliah || '');
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
                {isLab && (
                  <span className="bg-black text-white px-1 py-0.5 text-[9px] font-black uppercase rounded-none shrink-0">Lab</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Practical / lab section — only when a section is chosen and lab slots exist */}
      {effectiveKelas && matchingPraktikum.length > 0 && (
        <div className="border-t-2 border-dashed border-gray-400 pt-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Flask weight="fill" className="text-secondary shrink-0" />
            <p className="text-xs font-bold uppercase text-gray-500">Jadwal Praktikum</p>
            <span className="bg-secondary text-black px-1.5 py-0.5 text-[9px] font-black uppercase border-2 border-black rounded-none ml-auto">
              Praktikum
            </span>
          </div>

          {/* Single lab slot: show full details inline */}
          {matchingPraktikum.length === 1 && selectedLab && (
            <ul className="space-y-1">
              <li className="flex flex-wrap items-center gap-2 text-xs font-semibold border-2 border-black rounded-none px-2 py-1.5 bg-secondary/40">
                <span className="font-mono font-bold text-center px-1 border border-black bg-white">
                  {selectedLab.kelas}
                </span>
                {selectedLab.keterangan && (
                  <span className="italic text-gray-700">{selectedLab.keterangan}</span>
                )}
                <span className="ml-auto">{selectedLab.hari}</span>
                <span>{selectedLab.jam}</span>
                <span className="truncate">{selectedLab.ruang}</span>
              </li>
              {selectedLab.dosen && (
                <li className="text-[11px] font-bold text-gray-600 px-1 truncate">
                  Pengampu: {selectedLab.dosen}
                </li>
              )}
            </ul>
          )}

          {/* Multiple sub-groups: selector pills */}
          {matchingPraktikum.length > 1 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase text-gray-500">
                Pilih Kelompok Lab ({matchingPraktikum.length} kelompok)
              </p>
              <div className="flex flex-wrap gap-2">
                {matchingPraktikum.map((cand) => {
                  const isActive = cand.id === effectiveLabId;
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => onSelectLabGroup?.(cand.id)}
                      className={
                        'px-2.5 py-1 text-xs font-extrabold uppercase border-2 border-black rounded-none transition-all ' +
                        (isActive
                          ? 'bg-secondary text-black shadow-brutal-sm'
                          : 'bg-white text-black hover:-translate-y-0.5 hover:shadow-brutal-sm')
                      }
                    >
                      {cand.keterangan || cand.kelas}
                    </button>
                  );
                })}
              </div>
              {selectedLab && (
                <ul className="space-y-1 pt-1">
                  <li className="flex flex-wrap items-center gap-2 text-xs font-semibold border-2 border-black rounded-none px-2 py-1.5 bg-secondary/40">
                    <span className="font-mono font-bold text-center px-1 border border-black bg-white">
                      {selectedLab.kelas}
                    </span>
                    <span className="ml-auto">{selectedLab.hari}</span>
                    <span>{selectedLab.jam}</span>
                    <span className="truncate">{selectedLab.ruang}</span>
                  </li>
                  {selectedLab.dosen && (
                    <li className="text-[11px] font-bold text-gray-600 px-1 truncate">
                      Pengampu: {selectedLab.dosen}
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
