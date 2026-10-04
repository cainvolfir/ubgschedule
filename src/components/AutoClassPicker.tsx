import { useMemo, useCallback } from 'react';
import { ArrowLeft, CaretDown, MagicWand } from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import AutoClassCard from './AutoClassCard';
import { useJadwalStore } from '../store/useJadwalStore';
import { findMatchingRows, selectByKodeAndKelas } from '../utils/courseCode';
import BottomNav from './shared/BottomNav';

interface AutoClassPickerProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function AutoClassPicker({ onBack, onNext }: AutoClassPickerProps) {
  const {
    dataTeoriMentah,
    parsedCourseCodes,
    courseClassSelections,
    setCourseClassSelection,
    globalClassSelection,
    setGlobalClassSelection,
    setJadwalTeoriTerpilih,
    setSelectedTheoryRowIds,
  } = useJadwalStore();

  const matchMap = useMemo(
    () => findMatchingRows(parsedCourseCodes, dataTeoriMentah),
    [parsedCourseCodes, dataTeoriMentah]
  );

  // All unique kelas values across all matched rows (for the global dropdown)
  const allKelas = useMemo(() => {
    const set = new Set<string>();
    for (const code of parsedCourseCodes) {
      const matches = matchMap.get(code) || [];
      matches.forEach((r) => {
        if (r.Kelas) set.add(r.Kelas);
      });
    }
    return Array.from(set).sort();
  }, [parsedCourseCodes, matchMap]);

  const matchedCount = parsedCourseCodes.filter(
    (c) => (matchMap.get(c) || []).length > 0
  ).length;
  const unmatchedCount = parsedCourseCodes.length - matchedCount;

  const handleGlobalChange = useCallback(
    (kelas: string) => {
      setGlobalClassSelection(kelas);
      if (kelas) {
        // Apply immediately to all codes that have matches
        for (const code of parsedCourseCodes) {
          const matches = matchMap.get(code) || [];
          if (matches.length > 0) {
            // Only set if this kelas exists for this course, otherwise leave unset
            const hasKelas = matches.some((r) => r.Kelas === kelas);
            if (hasKelas) {
              setCourseClassSelection(code, kelas);
            }
          }
        }
      }
    },
    [parsedCourseCodes, matchMap, setGlobalClassSelection, setCourseClassSelection]
  );

  const handleNext = useCallback(() => {
    const selectedIds = selectByKodeAndKelas(
      parsedCourseCodes,
      courseClassSelections,
      dataTeoriMentah
    );
    const chosen = dataTeoriMentah.filter((r) => selectedIds.includes(r.id));
    setJadwalTeoriTerpilih(chosen);
    setSelectedTheoryRowIds(selectedIds);
    onNext?.();
  }, [parsedCourseCodes, courseClassSelections, dataTeoriMentah, setJadwalTeoriTerpilih, setSelectedTheoryRowIds, onNext]);

  const selectedCourseCount = Object.keys(courseClassSelections).filter(
    (k) => courseClassSelections[k]
  ).length;

  return (
    <div className="bg-background">
      <WizardHeader currentStep={2} />
      <main className="p-4 md:p-8 pb-36">
        <div className="w-full max-w-7xl mx-auto lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT: Summary + Global dropdown */}
          <section className="w-full lg:col-span-4 mb-8 lg:mb-0">
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-extrabold uppercase leading-tight mb-2 tracking-tight">
                Pilih Kelas
                <span className="block text-base font-bold text-gray-600 mt-2 normal-case">
                  Mode: Auto by Course Codes
                </span>
              </h1>
              <p className="font-semibold text-lg max-w-md mx-auto lg:mx-0 mt-4">
                Pilih kelas untuk semua mata kuliah sekaligus atau per mata kuliah.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-white border-2 border-black rounded-none shadow-none p-6 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                Total Kode:<span className="bg-black text-white px-2 rounded">{parsedCourseCodes.length}</span>
              </div>
              <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                Cocok:<span className="bg-green-600 text-white px-2 rounded">{matchedCount}</span>
              </div>
              {unmatchedCount > 0 && (
                <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                  Tidak cocok:<span className="bg-red-600 text-white px-2 rounded">{unmatchedCount}</span>
                </div>
              )}
            </div>

            {/* Apply-to-All global dropdown */}
            {allKelas.length > 0 && (
              <div className="mt-4 bg-white border-2 border-black rounded-none p-4">
                <label className="block font-extrabold text-sm uppercase mb-1">
                  Kelas untuk Semua
                </label>
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Pilih satu kelas untuk semua mata kuliah yang cocok.
                </p>
                <div className="relative w-full">
                  <select
                    value={globalClassSelection}
                    onChange={(e) => handleGlobalChange(e.target.value)}
                    className="w-full appearance-none bg-secondary rounded-none border-2 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none focus:shadow-brutal-sm hover:shadow-brutal-sm transition-shadow text-black"
                  >
                    <option value="">— Tidak ada global —</option>
                    {allKelas.map((k) => (
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
              </div>
            )}
          </section>

          {/* RIGHT: Course cards */}
          <section className="w-full lg:col-span-8">
            <div className="bg-white border-2 border-black shadow-none h-full flex flex-col rounded-none overflow-hidden">
              <div className="border-b-2 border-black p-4 bg-tertiary text-white rounded-none flex justify-between items-center">
                <div className="font-extrabold text-xl uppercase">Pilih Kelas per Kode MK</div>
                <div className="font-bold text-sm">
                  {selectedCourseCount} / {matchedCount} dipilih
                </div>
              </div>
              <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-background flex flex-col gap-4">
                {parsedCourseCodes.map((code) => {
                  const matches = matchMap.get(code) || [];
                  return (
                    <AutoClassCard
                      key={code}
                      code={code}
                      matches={matches}
                      selectedKelas={courseClassSelections[code] || ''}
                      globalKelas={globalClassSelection}
                      onSelectKelas={(kelas) => setCourseClassSelection(code, kelas)}
                    />
                  );
                })}
                {parsedCourseCodes.length === 0 && (
                  <div className="text-center py-8 font-bold text-gray-500">
                    Belum ada kode MK yang diparse. Kembali ke langkah 1.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Fixed bottom nav */}
      <BottomNav
        selectedCount={selectedCourseCount}
        leftContent={
          <button
            onClick={onBack}
            className="bg-white rounded-none border-2 border-black px-3 py-2 font-bold transition-all inline-flex items-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none text-sm"
          >
            <ArrowLeft weight="bold" />
            <span className="hidden md:inline">Kembali</span>
          </button>
        }
        rightContent={
          <button
            disabled={selectedCourseCount === 0}
            onClick={handleNext}
            className={
              'rounded-none border-2 border-black px-4 py-3 font-extrabold uppercase transition-all inline-flex items-center gap-2 ' +
              (selectedCourseCount > 0
                ? 'bg-tertiary text-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed')
            }
          >
            <span className="hidden md:inline">Lihat Hasil</span>
            <MagicWand weight="bold" />
          </button>
        }
      />
    </div>
  );
}
