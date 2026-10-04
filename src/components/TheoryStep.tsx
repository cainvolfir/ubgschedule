import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FilePdf, FileXls, Warning,
  MagnifyingGlass, CaretDown, ArrowRight, ArrowsDownUp,
  Sparkle,
} from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import ClassCard, { type ClassDisplayItem } from './ClassCard';
import { useJadwalStore, type DataTeoriMentah } from '../store/useJadwalStore';
import FileDropZone from './shared/FileDropZone';
import LoadingState from './shared/LoadingState';
import FileSummaryCard from './shared/FileSummaryCard';
import BottomNav from './shared/BottomNav';
import AutoCourseCodeInput from './AutoCourseCodeInput';

const HARI_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
type HariOrderKey = (typeof HARI_ORDER)[number];

const HARI_ABBR: Record<HariOrderKey, string> = {
  Senin: 'Sen', Selasa: 'Sel', Rabu: 'Rab', Kamis: 'Kam', Jumat: 'Jum', Sabtu: 'Sab', Minggu: 'Min',
};

type WorkerMsg = { type: string; step?: string; data?: unknown };

interface TheoryStepProps { onNext?: () => void; }

export default function TheoryStep({ onNext }: TheoryStepProps) {
  const {
    dataTeoriMentah, setDataTeoriMentah,
    selectedTheoryRowIds, toggleTheoryRowId,
    setJadwalTeoriTerpilih, reset,
    scheduleMode, parsedCourseCodes,
    clearCourseClassSelections,
  } = useJadwalStore();

  const [isParsed, setIsParsed] = useState(() => dataTeoriMentah.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLog, setLoadingLog] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSmt, setFilterSmt] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterHari, setFilterHari] = useState<string>('');
  const [sortHariOrder, setSortHariOrder] = useState<'asc' | 'desc'>('asc');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  const startParsing = useCallback((file: File) => {
    clearCourseClassSelections();
    setFileName(file.name); setIsLoading(true); setLoadingLog(''); setErrorMessage(null);
    const worker = new Worker(new URL('../workers/theory.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const { type, step, data } = e.data;
      if (type === 'LOG') { setLoadingLog(p => p + '[' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'WARN') { setLoadingLog(p => p + '[WARN:' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'ERROR') {
        setLoadingLog(p => p + '[ERROR:' + step + '] ' + (data ?? '') + '\n');
        setErrorMessage(typeof data === 'string' ? data : ((data as { message?: string } | undefined)?.message ?? 'Terjadi kesalahan saat memproses file.'));
        setIsLoading(false);
        worker.terminate(); workerRef.current = null;
        return;
      }
      if (type === 'RESULT') {
        setDataTeoriMentah(data as DataTeoriMentah[]);
        setIsLoading(false); setIsParsed(true);
        worker.terminate(); workerRef.current = null;
      }
    };
    worker.onerror = (err) => {
      setLoadingLog(p => p + '[FATAL] ' + err.message + '\n');
      setIsLoading(false); worker.terminate(); workerRef.current = null;
    };
    file.arrayBuffer().then(buf => { worker.postMessage({ type: 'PARSE_THEORY', fileBuffer: buf, fileName: file.name }); });
  }, [setDataTeoriMentah, clearCourseClassSelections]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (scheduleMode === 'auto-codes') {
      if (file && /\.(xlsx|xls)$/i.test(file.name)) startParsing(file);
    } else {
      if (file && (file.type === 'application/pdf' || /\.(xlsx|xls)$/i.test(file.name))) startParsing(file);
    }
  }, [startParsing, scheduleMode]);

  const handleFileChange = useCallback((file: File) => {
    startParsing(file);
  }, [startParsing]);

  const toggleSelect = useCallback((id: string) => { toggleTheoryRowId(id); }, [toggleTheoryRowId]);

  const handleReset = useCallback(() => {
    reset(); setIsParsed(false); setIsLoading(false); setLoadingLog('');
    setSearchQuery(''); setFilterSmt(''); setFilterKelas(''); setFileName('');
    setFilterHari(''); setSortHariOrder('asc');
    setErrorMessage(null);
    clearCourseClassSelections();
  }, [reset, clearCourseClassSelections]);

  const uniqueHari = useMemo(() => {
    const set = new Set<string>();
    dataTeoriMentah.forEach(r => { if (r.Hari) set.add(r.Hari); });
    return Array.from(set).sort(
      (a, b) => HARI_ORDER.indexOf(a as HariOrderKey) - HARI_ORDER.indexOf(b as HariOrderKey)
    );
  }, [dataTeoriMentah]);

  const filteredClasses = useMemo(() => {
    const dir = sortHariOrder === 'asc' ? 1 : -1;
    return dataTeoriMentah
      .filter(c => {
        if (searchQuery && !c.MataKuliah.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterSmt && c.SMT !== filterSmt) return false;
        if (filterKelas && c.Kelas !== filterKelas) return false;
        if (filterHari && c.Hari !== filterHari) return false;
        return true;
      })
      .sort((a, b) => {
        const dayA = HARI_ORDER.indexOf(a.Hari as HariOrderKey);
        const dayB = HARI_ORDER.indexOf(b.Hari as HariOrderKey);
        // Unknown days sort last regardless of direction.
        if (dayA !== dayB) {
          if (dayA === -1) return 1;
          if (dayB === -1) return -1;
          return (dayA - dayB) * dir;
        }
        const byName = a.MataKuliah.localeCompare(b.MataKuliah, 'id');
        if (byName !== 0) return byName;
        const jamA = (a.Jam ?? '').split(/[-–]/)[0].trim();
        const jamB = (b.Jam ?? '').split(/[-–]/)[0].trim();
        const byJam = jamA.localeCompare(jamB);
        if (byJam !== 0) return byJam;
        return a.Kelas.localeCompare(b.Kelas, 'id');
      });
  }, [searchQuery, filterSmt, filterKelas, filterHari, sortHariOrder, dataTeoriMentah]);

  const uniqueSMT = useMemo(() => [...new Set(dataTeoriMentah.map(c => c.SMT).filter(Boolean))].sort(), [dataTeoriMentah]);
  const uniqueKelas = useMemo(() => [...new Set(dataTeoriMentah.map(c => c.Kelas).filter(Boolean))].sort(), [dataTeoriMentah]);
  const selectedCount = selectedTheoryRowIds.length;

  // Auto-mode: check if at least one parsed code has a match
  const autoHasMatch = useMemo(
    () => {
      if (scheduleMode !== 'auto-codes' || parsedCourseCodes.length === 0 || dataTeoriMentah.length === 0) return false;
      return dataTeoriMentah.some((r) =>
        parsedCourseCodes.some((c) => c === r.KodeMK.trim().toUpperCase().replace(/\s+/g, ''))
      );
    },
    [scheduleMode, parsedCourseCodes, dataTeoriMentah]
  );

  const autoNextDisabled = scheduleMode === 'auto-codes' && !autoHasMatch;

  // --- Auto-codes mode: 2-column layout from the start ---
  if (scheduleMode === 'auto-codes') {
    const dropIcon = <FileXls weight="bold" className="text-tertiary text-3xl" />;
    return (
      <div className="bg-background">
        <WizardHeader currentStep={1} />
        <main className="p-4 md:px-8 md:pt-8 pb-40 md:pb-48">
          <div className="w-full max-w-7xl mx-auto lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
            {/* LEFT COLUMN: Upload area / summary */}
            <section className="w-full lg:col-span-4 mb-8 lg:mb-0">
              {/* Distinct hero for auto-codes mode */}
              <div className="mb-6 text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-tight tracking-tight">
                  Mode Cepat<br />
                  <span className="bg-tertiary text-white px-2.5 md:px-3 py-1 border-2 border-black inline-block mt-2 shadow-brutal rotate-[-2deg] rounded-none text-2xl sm:text-3xl lg:text-4xl">
                    <Sparkle weight="fill" className="inline mr-1" />
                    Jadwal KRS Otomatis
                  </span>
                </h1>
                <p className="font-semibold text-base md:text-lg max-w-md mx-auto lg:mx-0 mt-3">
                  Unggah file Excel jadwal lengkap dari Labkom &amp; masukkan daftar Kode MK Anda.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 bg-red-100 border-3 border-error shadow-brutal rounded-none p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <Warning weight="fill" className="text-error shrink-0 text-2xl" />
                    <div className="flex-1">
                      <h2 className="font-extrabold uppercase text-lg tracking-tight text-error mb-1">Gagal Memproses File</h2>
                      <p className="font-medium text-sm leading-relaxed mb-3">{errorMessage}</p>
                      <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="bg-error text-white border-2 border-black rounded-none px-4 py-2 font-extrabold uppercase text-sm shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isParsed ? (
                isLoading ? (
                  <LoadingState
                    icon={dropIcon}
                    title="Memproses Excel..."
                    stripeColor="bg-tertiary"
                    log={loadingLog}
                  />
                ) : (
                  <FileDropZone
                    icon={dropIcon}
                    title="Drag & Drop file Excel"
                    subtitle="Format .xlsx atau .xls dari Labkom"
                    buttonLabel="Pilih File Excel"
                    accept=".xlsx,.xls"
                    isDragOver={isDragOver}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onFileSelect={handleFileChange}
                  />
                )
              ) : (
                <>
                  <FileSummaryCard
                    fileName={fileName}
                    defaultFileName="jadwal-labkom.xlsx"
                    totalCount={dataTeoriMentah.length}
                    statusText="Berhasil diproses!"
                    resetLabel="Upload Ulang"
                    resetClassName="hover:bg-red-50"
                    onReset={handleReset}
                  />
                </>
              )}
            </section>

            {/* RIGHT COLUMN: AutoCourseCodeInput — visible IMMEDIATELY, even before upload */}
            <section className="w-full lg:col-span-8">
              <div className="bg-white border-2 border-black shadow-none h-fit flex flex-col rounded-none">
                <div className="border-b-2 border-black p-4 bg-tertiary text-white rounded-none flex justify-between items-center">
                  <div className="font-extrabold text-xl uppercase flex items-center gap-2">
                    <Sparkle weight="fill" />
                    Masukkan Kode MK
                  </div>
                  {!isParsed && (
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-none">
                      Bisa diisi sebelum upload
                    </span>
                  )}
                </div>
                <div className="p-4 md:p-6 bg-background">
                  <AutoCourseCodeInput />
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* FIXED BOTTOM NAV BAR */}
        <BottomNav
          selectedCount={parsedCourseCodes.length}
          nextLabel="Pilih Kelas"
          nextIcon={<ArrowRight weight="bold" />}
          onNext={() => { onNext?.(); }}
          nextDisabled={autoNextDisabled}
        />
      </div>
    );
  }

  // --- Manual mode: original UI unchanged ---
  return (
    <div className="bg-background">
      <WizardHeader currentStep={1} />
      <main className={"p-4 md:px-8 md:pt-8 " + (isParsed ? 'pb-40 md:pb-48' : '')}>
        <div
          className={"w-full mx-auto transition-all duration-300 " + (isParsed ? 'max-w-7xl lg:grid lg:grid-cols-12 gap-8 lg:gap-12' : 'max-w-2xl')}
        >
          {/* LEFT / CENTER */}
          <section className={"w-full h-fit transition-all duration-300 " + (isParsed ? 'lg:col-span-4 mb-8 lg:mb-0' : '')}>
            {!isParsed ? (
              <>
                <div className="mb-8 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight mb-4 tracking-tight">
                    Mulai dari<br />
                    <span className="bg-tertiary text-white px-2 md:px-3 py-1 border-2 border-black inline-block mt-2 shadow-brutal rotate-[-2deg] rounded-none">Jadwal Teori</span>
                  </h1>
                  <p className="font-semibold text-lg max-w-md mx-auto md:mx-0">Unggah file PDF atau XLSX jadwal kuliah teori.</p>
                </div>
                {errorMessage && (
                  <div className="mb-8 bg-red-100 border-3 border-error shadow-brutal rounded-none p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <Warning weight="fill" className="text-error shrink-0 text-2xl" />
                      <div className="flex-1">
                        <h2 className="font-extrabold uppercase text-lg tracking-tight text-error mb-1">Gagal Memproses File</h2>
                        <p className="font-medium text-sm leading-relaxed mb-3">{errorMessage}</p>
                        <p className="font-bold text-xs uppercase tracking-wide leading-relaxed mb-4">Alternatif: gunakan file XLSX jadwal lengkap hasil unduh dari web kampus.</p>
                        <button
                          type="button"
                          onClick={() => setErrorMessage(null)}
                          className="bg-error text-white border-2 border-black rounded-none px-4 py-2 font-extrabold uppercase text-sm shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {isLoading ? (
                  <LoadingState
                    icon={<FilePdf weight="bold" className="text-tertiary text-3xl" />}
                    title="Memproses PDF..."
                    stripeColor="bg-tertiary"
                    log={loadingLog}
                  />
                ) : (
                  <>
                    <FileDropZone
                      icon={<FilePdf weight="bold" className="text-tertiary text-3xl" />}
                      title="Drag & Drop file PDF atau XLSX"
                      subtitle="atau klik untuk memilih"
                      buttonLabel="Pilih File PDF atau XLSX"
                      accept=".pdf,.xlsx,.xls"
                      isDragOver={isDragOver}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onFileSelect={handleFileChange}
                    />
                    </>
                )}
              </>
            ) : (
              <>
                <div className="mb-6 text-center lg:text-left">
                  <h1 className="text-4xl lg:text-5xl font-extrabold uppercase leading-tight mb-2 tracking-tight">
                    Mulai dari<br />
                    <span className="bg-tertiary text-white px-2 md:px-3 py-1 border-2 border-black inline-block shadow-brutal rotate-[-2deg] rounded-none">Pilih Kelas</span>
                  </h1>
                  <p className="font-semibold text-lg max-w-md mx-auto lg:mx-0 mt-4">Tandai kelas-kelas yang ingin Anda masukkan ke jadwal.</p>
                </div>
                <FileSummaryCard
                  fileName={fileName}
                  defaultFileName="jadwal.pdf"
                  totalCount={dataTeoriMentah.length}
                  statusText="Berhasil diproses!"
                  resetLabel="Upload Ulang"
                  resetClassName="hover:bg-red-50"
                  onReset={handleReset}
                />
              </>
            )}
          </section>

          {/* RIGHT COLUMN — manual mode only */}
          {isParsed && (
            <section className="w-full lg:col-span-8 transition-all duration-300">
              <div className="bg-white border-2 border-black shadow-none h-fit flex flex-col rounded-none">
                <div className="border-b-2 border-black p-4 bg-tertiary text-white rounded-none flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="font-extrabold text-xl uppercase">Pilih Kelas Anda</div>
                  <div className="relative w-full sm:w-auto text-black">
                    <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl" />
                    <input type="text" placeholder="Cari mata kuliah..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-none border-2 border-black font-medium focus:outline-none focus:shadow-brutal transition-shadow" />
                  </div>
                </div>
                <div className="border-b-2 border-black p-4 bg-white flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1 md:w-44">
                    <select value={filterSmt} onChange={e => setFilterSmt(e.target.value)} className="w-full appearance-none bg-white text-black rounded-none border-2 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none">
                      <option value="" className="bg-white text-black">Semua SMT</option>
                      {uniqueSMT.map(s => (<option key={s} value={s} className="bg-white text-black">Semester {s}</option>))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                  <div className="relative flex-1 md:w-44">
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="w-full appearance-none bg-white text-black rounded-none border-2 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none">
                      <option value="" className="bg-white text-black">Semua Kelas</option>
                      {uniqueKelas.map(k => (<option key={k} value={k} className="bg-white text-black">{k}</option>))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                  <div className="relative flex-1 md:w-44">
                    <select value={filterHari} onChange={e => setFilterHari(e.target.value)} aria-label="Filter hari" className="w-full appearance-none bg-white text-black rounded-none border-2 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none">
                      <option value="" className="bg-white text-black">Semua Hari</option>
                      {uniqueHari.map(h => (<option key={h} value={h} className="bg-white text-black">{h}</option>))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSortHariOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
                    aria-label={sortHariOrder === 'asc' ? 'Hari: Sen → Sab' : 'Hari: Sab → Sen'}
                    title={sortHariOrder === 'asc' ? 'Hari: Sen → Sab' : 'Hari: Sab → Sen'}
                    className="relative flex items-center justify-center gap-2 bg-white rounded-none border-2 border-black px-4 py-2.5 font-bold cursor-pointer focus:outline-none focus:shadow-brutal hover:shadow-brutal transition-shadow text-black"
                  >
                    <ArrowsDownUp size={16} weight="bold" />
                    <span className="whitespace-nowrap">
                      {sortHariOrder === 'asc'
                        ? `Hari: ${HARI_ABBR.Senin} → ${HARI_ABBR.Sabtu}`
                        : `Hari: ${HARI_ABBR.Sabtu} → ${HARI_ABBR.Senin}`}
                    </span>
                  </button>
                </div>
                <div className="p-4 md:px-6 md:pt-6 pb-40 md:pb-48 bg-background flex flex-col gap-4">
                  {filteredClasses.map(c => {
                    const displayItem: ClassDisplayItem = {
                      id: c.id, nama: c.MataKuliah, kelas: c.Kelas, hari: c.Hari, jam: c.Jam, ruang: c.Ruang, sks: c.SKS, dosen: c.DosenPengampuh,
                      keterangan: c.Keterangan && c.Keterangan !== "-" ? c.Keterangan : undefined,
                    };
                    return (<ClassCard key={c.id} item={displayItem} isSelected={selectedTheoryRowIds.includes(c.id)} onToggle={toggleSelect} />);
                  })}
                  {filteredClasses.length === 0 && (<div className="text-center py-8 font-bold text-gray-500">Tidak ada kelas yang cocok.</div>)}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* FIXED BOTTOM NAV BAR */}
      {isParsed && (
        <BottomNav
          selectedCount={selectedCount}
          nextLabel="Praktikum"
          nextIcon={<ArrowRight weight="bold" />}
          onNext={() => {
            const chosen = dataTeoriMentah.filter(r => selectedTheoryRowIds.includes(r.id));
            setJadwalTeoriTerpilih(chosen); onNext?.();
          }}
          nextDisabled={selectedCount === 0}
        />
      )}
    </div>
  );
}
