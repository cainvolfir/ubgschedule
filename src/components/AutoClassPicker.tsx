import { useMemo, useCallback } from 'react';
import { ArrowLeft, CaretDown, MagicWand, CheckSquare, XSquare, Funnel } from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import AutoClassCard from './AutoClassCard';
import { useJadwalStore, type DataTeoriMentah, type PraktikumCandidate } from '../store/useJadwalStore';
import {
  findMatchingRows,
  isLabRow,
  collectLabCandidates,
  uniqueKelasOf,
  selectByKelas,
  dedupeById,
} from '../utils/courseCode';
import BottomNav from './shared/BottomNav';

interface AutoClassPickerProps {
  onBack?: () => void;
  onNext?: () => void;
}

interface CourseOptions {
  theoryRows: DataTeoriMentah[];
  labCandidates: PraktikumCandidate[];
}

export default function AutoClassPicker({ onBack, onNext }: AutoClassPickerProps) {
  const {
    dataTeoriMentah,
    parsedCourseCodes,
    setCourseClassSelection,
    globalClassSelection,
    setGlobalClassSelection,
    autoPraktikumRaw,
    courseLabGroupSelections,
    courseTheorySelections,
    toggleCourseTheorySelection,
    toggleCourseLabGroupSelection,
    selectAllForCourse,
    deselectAllForCourse,
    selectAllCourses,
    deselectAllCourses,
    setJadwalTeoriTerpilih,
    setSelectedTheoryRowIds,
    setPraktikumCandidates,
    setSelectedCandidateIds,
  } = useJadwalStore();

  const matchMap = useMemo(
    () => findMatchingRows(parsedCourseCodes, dataTeoriMentah),
    [parsedCourseCodes, dataTeoriMentah]
  );

  // Theory rows and every practical candidate per course.
  // Practical candidates come from embedded lab rows in the theory file plus the
  // separately uploaded praktikum pool, deduped across both sources.
  const optionsByCode = useMemo(() => {
    const map = new Map<string, CourseOptions>();
    for (const code of parsedCourseCodes) {
      const matches = matchMap.get(code) || [];
      map.set(code, {
        theoryRows: matches.filter((r) => !isLabRow(r)),
        labCandidates: collectLabCandidates(code, dataTeoriMentah, autoPraktikumRaw),
      });
    }
    return map;
  }, [parsedCourseCodes, matchMap, dataTeoriMentah, autoPraktikumRaw]);

  // Every practical candidate across all courses, including unselected ones.
  const allPractical = useMemo(
    () =>
      dedupeById(
        parsedCourseCodes.flatMap((code) => optionsByCode.get(code)?.labCandidates ?? [])
      ),
    [parsedCourseCodes, optionsByCode]
  );

  // Every class letter offered by any matched theory row (global quick-select).
  const allKelas = useMemo(() => {
    const set = new Set<string>();
    for (const code of parsedCourseCodes) {
      const matches = matchMap.get(code) || [];
      uniqueKelasOf(matches.filter((r) => !isLabRow(r))).forEach((k) => set.add(k));
    }
    return Array.from(set).sort();
  }, [parsedCourseCodes, matchMap]);

  const matchedCount = parsedCourseCodes.filter(
    (c) => (matchMap.get(c) || []).length > 0
  ).length;
  const unmatchedCount = parsedCourseCodes.length - matchedCount;

  const theoryIdSet = useMemo(
    () => new Set(parsedCourseCodes.flatMap((c) => courseTheorySelections[c] ?? [])),
    [parsedCourseCodes, courseTheorySelections]
  );
  const labIdSet = useMemo(
    () => new Set(parsedCourseCodes.flatMap((c) => courseLabGroupSelections[c] ?? [])),
    [parsedCourseCodes, courseLabGroupSelections]
  );

  const totalTheorySelected = theoryIdSet.size;
  const totalLabSelected = labIdSet.size;
  const totalSelected = totalTheorySelected + totalLabSelected;
  const coursesWithSelection = parsedCourseCodes.filter(
    (c) =>
      (courseTheorySelections[c]?.length ?? 0) + (courseLabGroupSelections[c]?.length ?? 0) > 0
  ).length;

  // Quick-select: pick a section letter everywhere it exists, plus its lab sub-groups.
  const handleGlobalChange = useCallback(
    (kelas: string) => {
      setGlobalClassSelection(kelas);
      if (!kelas) return;
      const theorySelections: Record<string, string[]> = {};
      const labSelections: Record<string, string[]> = {};
      for (const code of parsedCourseCodes) {
        const options = optionsByCode.get(code);
        if (!options) continue;
        const { theoryIds, labIds } = selectByKelas(
          kelas,
          options.theoryRows,
          options.labCandidates
        );
        if (theoryIds.length > 0) {
          theorySelections[code] = theoryIds;
          setCourseClassSelection(code, kelas);
        }
        if (labIds.length > 0) labSelections[code] = labIds;
      }
      selectAllCourses({ theorySelections, labSelections });
    },
    [
      parsedCourseCodes,
      optionsByCode,
      setGlobalClassSelection,
      selectAllCourses,
      setCourseClassSelection,
    ]
  );

  const handleSelectAll = useCallback(() => {
    const theorySelections: Record<string, string[]> = {};
    const labSelections: Record<string, string[]> = {};
    for (const code of parsedCourseCodes) {
      const options = optionsByCode.get(code);
      if (!options) continue;
      const theoryIds = options.theoryRows.map((r) => r.id);
      const labIds = options.labCandidates.map((c) => c.id);
      if (theoryIds.length > 0) theorySelections[code] = theoryIds;
      if (labIds.length > 0) labSelections[code] = labIds;
    }
    selectAllCourses({ theorySelections, labSelections });
  }, [parsedCourseCodes, optionsByCode, selectAllCourses]);

  const handleDeselectAll = useCallback(() => {
    deselectAllCourses();
  }, [deselectAllCourses]);

  const handleNext = useCallback(() => {
    const selectedTheoryRows = dataTeoriMentah.filter(
      (r) => theoryIdSet.has(r.id) && !isLabRow(r)
    );

    // Only practical candidates that are actually selected go to the result step.
    const selectedPracticalIds = allPractical
      .filter((c) => labIdSet.has(c.id))
      .map((c) => c.id);

    setJadwalTeoriTerpilih(selectedTheoryRows);
    setSelectedTheoryRowIds(selectedTheoryRows.map((r) => r.id));
    setPraktikumCandidates(allPractical);
    setSelectedCandidateIds(selectedPracticalIds);
    onNext?.();
  }, [
    theoryIdSet,
    labIdSet,
    allPractical,
    dataTeoriMentah,
    setJadwalTeoriTerpilih,
    setSelectedTheoryRowIds,
    setPraktikumCandidates,
    setSelectedCandidateIds,
    onNext,
  ]);

  return (
    <div className="bg-background">
      <WizardHeader currentStep={2} />
      <main className="p-4 md:px-8 md:pt-8 pb-40 md:pb-48">
        <div className="w-full max-w-7xl mx-auto lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT: summary and global controls */}
          <section className="w-full lg:col-span-4 mb-8 lg:mb-0">
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-extrabold uppercase leading-tight mb-2 tracking-tight">
                Pilih Kelas
                <span className="block text-base font-bold text-gray-600 mt-2 normal-case">
                  Mode: Auto by Course Codes
                </span>
              </h1>
              <p className="font-semibold text-lg max-w-md mx-auto lg:mx-0 mt-4">
                Pilih satu atau beberapa kelas dan kelompok praktikum sekaligus.
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
              <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                Teori dipilih:<span className="bg-tertiary text-white px-2 rounded">{totalTheorySelected}</span>
              </div>
              <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                Praktikum dipilih:<span className="bg-secondary text-black px-2 rounded">{totalLabSelected}</span>
              </div>
            </div>

            {/* Global quick-select */}
            {allKelas.length > 0 && (
              <div className="mt-4 bg-white border-2 border-black rounded-none p-4">
                <label className="font-extrabold text-sm uppercase mb-1 flex items-center gap-1">
                  <Funnel weight="bold" size={14} />
                  Pilih Kelas Cepat untuk Semua
                </label>
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Pilih satu kelas untuk semua mata kuliah yang cocok, termasuk kelompok praktikumnya.
                </p>
                <div className="relative w-full">
                  <select
                    value={globalClassSelection}
                    onChange={(e) => handleGlobalChange(e.target.value)}
                    className="w-full appearance-none bg-white text-black rounded-none border-2 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none"
                  >
                    <option value="" className="bg-white text-black">- Tidak ada global -</option>
                    {allKelas.map((k) => (
                      <option key={k} value={k} className="bg-white text-black">
                        Kelas {k}
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

            {/* Bulk actions */}
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={matchedCount === 0}
                className={
                  'w-full py-2.5 rounded-none border-2 border-black font-extrabold uppercase text-sm transition-all inline-flex items-center justify-center gap-2 ' +
                  (matchedCount > 0
                    ? 'bg-tertiary text-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed')
                }
              >
                <CheckSquare weight="bold" size={18} />
                Pilih Semua Jadwal
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={totalSelected === 0}
                className={
                  'w-full py-2.5 rounded-none border-2 border-black font-extrabold uppercase text-sm transition-all inline-flex items-center justify-center gap-2 ' +
                  (totalSelected > 0
                    ? 'bg-white text-black shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed')
                }
              >
                <XSquare weight="bold" size={18} />
                Kosongkan Semua
              </button>
            </div>
          </section>

          {/* RIGHT: course cards */}
          <section className="w-full lg:col-span-8">
            <div className="bg-white border-2 border-black shadow-none h-full flex flex-col rounded-none overflow-hidden">
              <div className="border-b-2 border-black p-4 bg-tertiary text-white rounded-none flex flex-wrap justify-between items-center gap-2">
                <div className="font-extrabold text-xl uppercase">Pilih Kelas per Kode MK</div>
                <div className="font-bold text-sm">
                  {coursesWithSelection} / {matchedCount} MK &bull; {totalSelected} jadwal
                </div>
              </div>
              <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-background flex flex-col gap-4">
                {parsedCourseCodes.map((code) => {
                  const options = optionsByCode.get(code);
                  return (
                    <AutoClassCard
                      key={code}
                      code={code}
                      matches={matchMap.get(code) || []}
                      selectedTheoryIds={courseTheorySelections[code] ?? []}
                      selectedLabIds={courseLabGroupSelections[code] ?? []}
                      onToggleTheory={(rowId) => toggleCourseTheorySelection(code, rowId)}
                      onToggleLab={(labId) => toggleCourseLabGroupSelection(code, labId)}
                      onSelectAll={(theoryIds, labIds) =>
                        selectAllForCourse(code, theoryIds, labIds)
                      }
                      onDeselect={() => deselectAllForCourse(code)}
                      linkedPraktikum={options?.labCandidates ?? []}
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
        selectedCount={totalSelected}
        leftContent={
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="bg-white rounded-none border-2 border-black px-3 py-2 font-bold transition-all inline-flex items-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none text-sm"
            >
              <ArrowLeft weight="bold" />
              <span className="hidden md:inline">Kembali</span>
            </button>
            <div className="font-bold text-black text-xs md:text-sm">
              Terpilih:{' '}
              <span className="text-base md:text-xl px-2 bg-[#60A5FA] border-2 border-black ml-1">
                {totalSelected}
              </span>
              <span className="hidden md:inline ml-2 text-gray-600">
                ({totalTheorySelected} teori, {totalLabSelected} praktikum)
              </span>
            </div>
          </div>
        }
        rightContent={
          <button
            disabled={totalSelected === 0}
            onClick={handleNext}
            className={
              'rounded-none border-2 border-black px-4 py-3 font-extrabold uppercase transition-all inline-flex items-center gap-2 ' +
              (totalSelected > 0
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