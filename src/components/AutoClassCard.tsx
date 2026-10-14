import { CheckCircle, XCircle, Warning, Flask, Square, CheckSquare, Check, X } from '@phosphor-icons/react';
import type { DataTeoriMentah, PraktikumCandidate } from '../store/useJadwalStore';
import {
  groupRowsByKelas,
  isLabRow,
  keteranganNote,
  practicalGroupLabel,
  sortCandidatesByKelas,
  sortRowsByKelas,
} from '../utils/courseCode';

interface AutoClassCardProps {
  code: string;
  matches: DataTeoriMentah[];
  /** Selected theory row ids for this course. */
  selectedTheoryIds: string[];
  /** Selected practical candidate ids for this course. */
  selectedLabIds: string[];
  onToggleTheory: (rowId: string) => void;
  onToggleLab: (labId: string) => void;
  /** Select every theory row and practical candidate for this course. */
  onSelectAll: (theoryIds: string[], labIds: string[]) => void;
  /** Clear every selection for this course. */
  onDeselect: () => void;
  linkedPraktikum?: PraktikumCandidate[];
}

/**
 * Class section band. Rows are bucketed by Kelas so every schedule sits under a
 * bold 'Kelas A' / 'Kelas B' / 'Kelas C' header: the section is obvious at a
 * glance instead of being buried inside one identical whole-cohort label.
 */
function KelasHeader({
  kelas,
  count,
  unit,
  color,
}: {
  kelas: string;
  count: number;
  unit: string;
  color: 'emerald' | 'purple';
}) {
  const chip = color === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white';
  return (
    <div className="mt-3 first:mt-0 flex flex-wrap items-center gap-2">
      <span
        className={
          'font-mono font-black uppercase text-[11px] border-2 border-black px-2 py-0.5 rounded-none ' +
          chip
        }
      >
        Kelas {kelas}
      </span>
      <span className="text-[10px] font-black uppercase text-gray-600">
        {count} {unit}
      </span>
      <span className="h-0.5 flex-1 bg-black/20" />
    </div>
  );
}

export default function AutoClassCard({
  code,
  matches,
  selectedTheoryIds,
  selectedLabIds,
  onToggleTheory,
  onToggleLab,
  onSelectAll,
  onDeselect,
  linkedPraktikum = [],
}: AutoClassCardProps) {
  const found = matches.length > 0;
  // Sorted by class section so A, B, C read in order instead of portal export order.
  const theoryRows = sortRowsByKelas(matches.filter((r) => !isLabRow(r)));
  const practicalCandidates = sortCandidatesByKelas(linkedPraktikum);
  // Bucketed by Kelas: each section renders as one labelled block, in A, B, C order.
  const theoryGroups = groupRowsByKelas(theoryRows);
  const labGroups = groupRowsByKelas(practicalCandidates, (c) => c.kelas || '');
  const classCount = new Set([...theoryGroups, ...labGroups].map((g) => g.kelas)).size;

  const totalOptions = theoryRows.length + practicalCandidates.length;
  const selectedCount = selectedTheoryIds.length + selectedLabIds.length;

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

  const allTheoryIds = theoryRows.map((r) => r.id);
  const allLabIds = practicalCandidates.map((c) => c.id);

  return (
    <div className="border-2 border-black rounded-none p-4 bg-white shadow-brutal">
      {/* Header: code + option count + selected count */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <CheckCircle weight="fill" className="text-green-600 shrink-0" />
        <span className="font-mono font-extrabold text-sm bg-black text-white px-2 py-0.5 border-2 border-black rounded-none">
          {code}
        </span>
        <span className="text-[10px] font-black uppercase bg-background border-2 border-black px-1.5 py-0.5 rounded-none">
          {totalOptions} pilihan
        </span>
        <span
          className={
            'text-[10px] font-black uppercase border-2 border-black px-1.5 py-0.5 rounded-none ' +
            (selectedCount > 0 ? 'bg-success text-white' : 'bg-gray-200 text-gray-600')
          }
        >
          {selectedCount} dipilih
        </span>
        {classCount > 0 && (
          <span className="text-[10px] font-black uppercase bg-blue-100 border-2 border-black px-1.5 py-0.5 rounded-none">
            {classCount} kelas
          </span>
        )}
      </div>

      {/* Course name */}
      <h4 className="font-extrabold text-lg uppercase leading-tight mb-2">
        {matches[0]?.MataKuliah || code}
      </h4>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => onSelectAll(allTheoryIds, allLabIds)}
          disabled={totalOptions === 0}
          className={
            'px-2.5 py-1 text-[11px] font-extrabold uppercase border-2 border-black rounded-none inline-flex items-center gap-1 transition-all ' +
            (totalOptions > 0
              ? 'bg-tertiary text-white hover:-translate-y-0.5 hover:shadow-brutal-sm'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed')
          }
        >
          <CheckSquare weight="bold" size={14} />
          Pilih Semua
        </button>
        <button
          type="button"
          onClick={onDeselect}
          disabled={selectedCount === 0}
          className={
            'px-2.5 py-1 text-[11px] font-extrabold uppercase border-2 border-black rounded-none inline-flex items-center gap-1 transition-all ' +
            (selectedCount > 0
              ? 'bg-white text-black hover:-translate-y-0.5 hover:shadow-brutal-sm'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed')
          }
        >
          <X weight="bold" size={14} />
          Batal
        </button>
      </div>

      {/* Section 1: theory schedules */}
      {theoryRows.length > 0 && (
        <div className="border-t-2 border-dashed border-gray-400 pt-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold uppercase text-gray-500">Jadwal Teori</p>
            <span className="bg-tertiary text-white border-2 border-black px-1.5 py-0.5 text-[9px] font-black uppercase rounded-none ml-auto">
              {theoryRows.length} tersedia
            </span>
          </div>
          <p className="text-[10px] font-bold text-gray-500 mb-2">
            Dikelompokkan per kelas teori: A, B, C, dan seterusnya.
          </p>
          <div className="space-y-1">
            {theoryGroups.map((group) => (
              <div key={group.kelas}>
                <KelasHeader
                  kelas={group.kelas}
                  count={group.rows.length}
                  unit="jadwal teori"
                  color="emerald"
                />
                <ul className="space-y-1.5 mt-1">
                  {group.rows.map((row) => {
                    const isSelected = selectedTheoryIds.includes(row.id);
                    const note = keteranganNote(row.Keterangan);
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => onToggleTheory(row.id)}
                          aria-pressed={isSelected}
                          className={
                            'w-full text-left flex flex-wrap items-center gap-2 text-xs font-semibold border-2 border-black rounded-none px-2 py-1.5 transition-all ' +
                            (isSelected
                              ? 'bg-emerald-100 shadow-brutal-sm'
                              : 'bg-gray-50 hover:bg-white hover:shadow-brutal-sm')
                          }
                        >
                          {isSelected ? (
                            <CheckSquare weight="fill" className="text-emerald-600 shrink-0" size={16} />
                          ) : (
                            <Square weight="bold" className="text-gray-500 shrink-0" size={16} />
                          )}
                          <span className="font-mono font-black uppercase border-2 border-emerald-300 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-none">
                            Kelas {row.Kelas || '-'}
                          </span>
                          <span className="text-[9px] font-black uppercase border border-black bg-blue-100 px-1 py-0.5 rounded-none">
                            Teori
                          </span>
                          {note && (
                            <span className="text-[10px] font-black uppercase border border-black bg-amber-100 px-1 py-0.5 rounded-none">
                              [{note}]
                            </span>
                          )}
                          <span className="truncate">
                            {row.Hari}, {row.Jam}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="truncate">Ruang {row.Ruang}</span>
                          <span className="text-gray-500">•</span>
                          <span className="truncate max-w-[14rem]">{row.DosenPengampuh}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: practical schedules */}
      {practicalCandidates.length > 0 ? (
        <div className="border-t-2 border-dashed border-gray-400 pt-3 mt-3">
          <div className="flex items-center gap-2 mb-1">
            <Flask weight="fill" className="text-secondary shrink-0" />
            <p className="text-xs font-bold uppercase text-gray-500">Jadwal Praktikum</p>
            <span className="bg-secondary text-black border-2 border-black px-1.5 py-0.5 text-[9px] font-black uppercase rounded-none ml-auto">
              {practicalCandidates.length} tersedia
            </span>
          </div>
          <p className="text-[10px] font-bold text-gray-500 mb-2">
            Kelas induk plus kelompoknya (mis. A1, A2). Boleh pilih lebih dari satu kelompok.
          </p>
          <div className="space-y-1">
            {labGroups.map((group) => (
              <div key={group.kelas}>
                <KelasHeader
                  kelas={group.kelas}
                  count={group.rows.length}
                  unit="jadwal praktikum"
                  color="purple"
                />
                <ul className="space-y-1.5 mt-1">
                  {group.rows.map((cand) => {
                    const isSelected = selectedLabIds.includes(cand.id);
                    const groupLabel = practicalGroupLabel(cand.keterangan);
                    const note = keteranganNote(cand.keterangan);
                    return (
                      <li key={cand.id}>
                        <button
                          type="button"
                          onClick={() => onToggleLab(cand.id)}
                          aria-pressed={isSelected}
                          className={
                            'w-full text-left flex flex-wrap items-center gap-2 text-xs font-semibold border-2 border-black rounded-none px-2 py-1.5 transition-all ' +
                            (isSelected
                              ? 'bg-purple-100 shadow-brutal-sm'
                              : 'bg-gray-50 hover:bg-white hover:shadow-brutal-sm')
                          }
                        >
                          {isSelected ? (
                            <CheckSquare weight="fill" className="text-purple-600 shrink-0" size={16} />
                          ) : (
                            <Square weight="bold" className="text-gray-500 shrink-0" size={16} />
                          )}
                          <span className="font-mono font-black uppercase border-2 border-purple-300 bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-none">
                            Kelas {cand.kelas || '-'}
                          </span>
                          {groupLabel && (
                            <span className="font-mono font-bold uppercase border-2 border-black bg-white px-1.5 py-0.5 rounded-none">
                              Kelompok {groupLabel}
                            </span>
                          )}
                          <span className="text-[9px] font-black uppercase border border-black bg-pink-100 px-1 py-0.5 rounded-none">
                            Praktikum
                          </span>
                          {note && (
                            <span className="text-[10px] font-black uppercase border border-black bg-amber-100 px-1 py-0.5 rounded-none">
                              [{note}]
                            </span>
                          )}
                          <span className="truncate">
                            {cand.hari}, {cand.jam}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="truncate">Ruang {cand.ruang}</span>
                          {cand.dosen && (
                            <>
                              <span className="text-gray-500">•</span>
                              <span className="truncate max-w-[14rem]">{cand.dosen}</span>
                            </>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t-2 border-dashed border-gray-400 pt-3 mt-3">
          <p className="text-[11px] font-bold uppercase text-gray-400 flex items-center gap-1">
            <Check weight="bold" size={12} />
            Tidak ada praktikum
          </p>
        </div>
      )}
    </div>
  );
}