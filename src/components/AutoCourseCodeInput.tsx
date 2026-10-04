import { useMemo } from 'react';
import { CheckCircle, XCircle, Warning, ListChecks } from '@phosphor-icons/react';
import { useJadwalStore } from '../store/useJadwalStore';
import { normalizeCourseCodes, findMatchingRows } from '../utils/courseCode';

export default function AutoCourseCodeInput() {
  const {
    courseCodeInput,
    setCourseCodeInput,
    parsedCourseCodes,
    setParsedCourseCodes,
    dataTeoriMentah,
    setCourseClassSelection,
  } = useJadwalStore();

  const handleParse = () => {
    const codes = normalizeCourseCodes(courseCodeInput);
    setParsedCourseCodes(codes);
    // Auto-select single-section courses
    if (dataTeoriMentah.length > 0 && codes.length > 0) {
      const matchMap = findMatchingRows(codes, dataTeoriMentah);
      for (const code of codes) {
        const matches = matchMap.get(code) || [];
        const uniqueKelas = [...new Set(matches.map((r) => r.Kelas))];
        if (uniqueKelas.length === 1) {
          setCourseClassSelection(code, uniqueKelas[0]);
        }
      }
    }
  };

  const matchMap = useMemo(
    () => findMatchingRows(parsedCourseCodes, dataTeoriMentah),
    [parsedCourseCodes, dataTeoriMentah]
  );

  const matchedCount = parsedCourseCodes.filter(
    (c) => (matchMap.get(c) || []).length > 0
  ).length;
  const unmatchedCount = parsedCourseCodes.length - matchedCount;

  return (
    <div className="w-full space-y-4">
      {/* Textarea */}
      <div>
        <label className="block font-extrabold text-sm uppercase mb-2 tracking-tight">
          Masukkan Kode MK
        </label>
        <p className="text-xs font-semibold text-gray-600 mb-2">
          Satu kode per baris (atau pisahkan dengan koma/titik koma).
        </p>
        <textarea
          value={courseCodeInput}
          onChange={(e) => setCourseCodeInput(e.target.value)}
          placeholder={'MI2113\nIF2104\nEK2201'}
          rows={6}
          data-lenis-prevent
          className="w-full border-2 border-black rounded-none p-3 font-mono text-sm bg-white focus:outline-none focus:shadow-brutal transition-shadow resize-y"
        />
      </div>

      {/* Parse button */}
      <button
        type="button"
        onClick={handleParse}
        disabled={!courseCodeInput.trim()}
        className={
          'w-full py-3 rounded-none border-2 border-black font-extrabold uppercase text-sm transition-all flex items-center justify-center gap-2 ' +
          (courseCodeInput.trim()
            ? 'bg-tertiary text-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed')
        }
      >
        <ListChecks weight="bold" size={18} />
        Parse Kode
      </button>

      {/* Match preview */}
      {parsedCourseCodes.length > 0 && (
        <div className="border-2 border-black rounded-none bg-white p-4">
          <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-2">
            <span className="font-extrabold text-sm uppercase">Hasil Pencocokan</span>
            <span className="text-xs font-bold">
              <span className="text-green-600">{matchedCount} cocok</span>
              {' / '}
              <span className="text-red-600">{unmatchedCount} tidak</span>
            </span>
          </div>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {parsedCourseCodes.map((code) => {
              const matches = matchMap.get(code) || [];
              const found = matches.length > 0;
              return (
                <li
                  key={code}
                  className={
                    'flex items-center gap-2 text-sm font-bold border-2 border-black px-2 py-1.5 rounded-none ' +
                    (found ? 'bg-green-50' : 'bg-red-50')
                  }
                >
                  {found ? (
                    <CheckCircle weight="fill" className="text-green-600 shrink-0" />
                  ) : (
                    <XCircle weight="fill" className="text-red-600 shrink-0" />
                  )}
                  <span className="font-mono">{code}</span>
                  {found && (
                    <span className="text-xs text-gray-600 ml-auto">
                      {matches.length} kelas
                    </span>
                  )}
                  {!found && dataTeoriMentah.length === 0 && (
                    <Warning weight="fill" className="text-yellow-600 ml-auto" size={14} />
                  )}
                </li>
              );
            })}
          </ul>
          {unmatchedCount === parsedCourseCodes.length &&
            parsedCourseCodes.length > 0 &&
            dataTeoriMentah.length > 0 && (
              <p className="mt-3 text-xs font-bold text-red-600 text-center">
                Tidak ada kode MK yang cocok dengan file yang diunggah.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
