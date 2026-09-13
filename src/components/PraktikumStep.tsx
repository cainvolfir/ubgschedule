import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FileXls, Sparkle,
  MagnifyingGlass, CaretDown, MagicWand, ArrowLeft,
} from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import ClassCard, { type ClassDisplayItem } from './ClassCard';
import { useJadwalStore } from '../store/useJadwalStore';
import FileDropZone from './shared/FileDropZone';
import LoadingState from './shared/LoadingState';
import FileSummaryCard from './shared/FileSummaryCard';
import BottomNav from './shared/BottomNav';

type Phase = 'upload' | 'loading' | 'selecting';
type WorkerMsg = { type: string; step?: string; data?: unknown };

interface PraktikumProps { onNext?: () => void; onBack?: () => void; }

export default function PraktikumStep({ onNext, onBack }: PraktikumProps) {
  const {
    selectedCandidateIds, toggleCandidateId,
    setSelectedCandidateIds, setPraktikumRoomPrefixes, setSelectedRoomPrefix,
    setPraktikumCandidates, praktikumCandidates, praktikumRoomPrefixes, selectedRoomPrefix,
    praktikumFileData, setPraktikumFileData,
  } = useJadwalStore();

  const [phase, setPhase] = useState<Phase>(() => praktikumCandidates.length > 0 ? 'selecting' : 'upload');
  const [loadingLog, setLoadingLog] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterSmt, setFilterSmt] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPrefix, setSelectedPrefixLocal] = useState(() => selectedRoomPrefix || '');

  const workerRef = useRef<Worker | null>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  useEffect(() => {
    if (praktikumFileData.length > 0 && !fileBufferRef.current) {
      fileBufferRef.current = new Uint8Array(praktikumFileData).buffer;
    }
  }, [praktikumFileData]);

  const spawnWorker = useCallback(() => {
    const w = new Worker(new URL('../workers/praktikum.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    return w;
  }, []);

  /* Phase 2: PARSE_PRAKTIKUM with selected prefix */
  const parseWithPrefix = useCallback((prefix: string) => {
    if (!fileBufferRef.current && praktikumFileData.length > 0) {
      fileBufferRef.current = new Uint8Array(praktikumFileData).buffer;
    }
    if (!fileBufferRef.current) return;
    setPhase('loading');
    setLoadingLog(prev => prev + '\n> Parsing dengan prefix: ' + prefix + '...\n');
    const worker = spawnWorker();
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const { type, step, data } = e.data;
      if (type === 'LOG') { setLoadingLog(p => p + '[' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'WARN') { setLoadingLog(p => p + '[WARN:' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'ERROR') { setLoadingLog(p => p + '[ERROR:' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'PARSE_RESULT') {
        const result = data as { candidates: Array<Record<string, unknown>> };
        const cands = (result.candidates || []).map(c => ({
          id: String(c.id), courseName: String(c.courseName), kelas: String(c.kelas),
          keterangan: String(c.keterangan || ''), dosen: String(c.dosen || ''),
          semester: String(c.semester || ''), hari: String(c.hari || ''),
          jam: String(c.jam || ''), ruang: String(c.ruang || ''), sks: String(c.sks || '1'),
        }));
        setPraktikumCandidates(cands);
        setSelectedCandidateIds([]); /* FIX #1: no default selections */
        setPhase('selecting');
        worker.terminate(); workerRef.current = null;
      }
    };
    worker.onerror = (err) => {
      setLoadingLog(p => p + '[FATAL] ' + err.message + '\n');
      setPhase('selecting'); worker.terminate(); workerRef.current = null;
    };
    worker.postMessage({ type: 'PARSE_PRAKTIKUM', file: fileBufferRef.current, roomPrefix: prefix });
  }, [spawnWorker, setPraktikumCandidates, setSelectedCandidateIds]);

  /* Phase 1: SCAN_XLSX discover prefixes, then auto-parse */
  const scanFile = useCallback((file: File) => {
    setFileName(file.name); setPhase('loading');
    setLoadingLog('> Memulai scan spreadsheet...\n');
    setSelectedCandidateIds([]); setPraktikumCandidates([]);
    const worker = spawnWorker();
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const { type, step, data } = e.data;
      if (type === 'LOG') { setLoadingLog(p => p + '[' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'WARN') { setLoadingLog(p => p + '[WARN:' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'ERROR') { setLoadingLog(p => p + '[ERROR:' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'SCAN_RESULT') {
        const result = data as { prefixes: string[] };
        const prefixes = result.prefixes || [];
        setPraktikumRoomPrefixes(prefixes);
        worker.terminate(); workerRef.current = null;
        if (prefixes.length === 0) {
          setLoadingLog(p => p + '> Tidak ada prefix ruangan ditemukan.\n');
          setPhase('upload'); return;
        }
        setLoadingLog(p => p + '> Prefix ditemukan: ' + prefixes.join(', ') + '\n');
        setSelectedPrefixLocal(prefixes[0]);
        setSelectedRoomPrefix(prefixes[0]);
        parseWithPrefix(prefixes[0]); return;
      }
    };
    worker.onerror = (err) => {
      setLoadingLog(p => p + '[FATAL] ' + err.message + '\n');
      setPhase('upload'); worker.terminate(); workerRef.current = null;
    };
    file.arrayBuffer().then(buf => {
      fileBufferRef.current = buf;
      setPraktikumFileData(Array.from(new Uint8Array(buf)));
      worker.postMessage({ type: 'SCAN_XLSX', file: buf });
    });
  }, [spawnWorker, setPraktikumRoomPrefixes, setSelectedRoomPrefix, setSelectedCandidateIds, setPraktikumCandidates, parseWithPrefix]);

  const handlePrefixChange = useCallback((prefix: string) => {
    setSelectedPrefixLocal(prefix); setSelectedRoomPrefix(prefix); parseWithPrefix(prefix);
  }, [setSelectedRoomPrefix, parseWithPrefix]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { const ext = file.name.split('.').pop()?.toLowerCase(); if (['xlsx','xls','csv'].includes(ext||'')) scanFile(file); }
  }, [scanFile]);

  const handleFileChange = useCallback((file: File) => {
    scanFile(file);
  }, [scanFile]);

  const toggleSelect = useCallback((id: string) => { toggleCandidateId(id); }, [toggleCandidateId]);

  const handleReset = useCallback(() => {
    workerRef.current?.terminate(); workerRef.current = null; fileBufferRef.current = null;
    setPhase('upload'); setLoadingLog(''); setSearchQuery(''); setFilterKelas(''); setFilterSmt('');
    setFileName(''); setSelectedPrefixLocal('');
    setSelectedCandidateIds([]); setPraktikumCandidates([]); setPraktikumFileData([]);
  }, [setSelectedCandidateIds, setPraktikumCandidates]);

  /* FIX #2: semester filter */
  const filteredClasses = praktikumCandidates.filter(c => {
    if (searchQuery && !c.courseName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterKelas && c.kelas !== filterKelas) return false;
    if (filterSmt && c.semester !== filterSmt) return false;
    return true;
  });

  const selectedCount = selectedCandidateIds.length;
  const uniqueSmt = useMemo(() => [...new Set(praktikumCandidates.map(c => c.semester).filter(Boolean))].sort(), [praktikumCandidates]);
  const uniqueKelasPrak = useMemo(() => [...new Set(praktikumCandidates.map(c => c.kelas).filter(Boolean))].sort(), [praktikumCandidates]);
  const isLoading = phase === 'loading';
  const isSelecting = phase === 'selecting';

  const footerButtons = (
    <>
      <button onClick={onBack} className="bg-white rounded-none border-2 border-black px-4 md:px-6 py-3 font-bold transition-all inline-flex items-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none">
        <ArrowLeft weight="bold" /><span className="hidden md:inline">Kembali</span>
      </button>
      <div className="flex items-center gap-3">
        <button onClick={onNext} className="bg-white rounded-none border-2 border-black px-4 md:px-6 py-3 font-bold transition-all inline-flex items-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none">
          Lewati Praktikum
        </button>
      </div>
    </>
  );

  return (
    <div className="bg-background">
      <WizardHeader currentStep={2} />
      <main className={"p-4 md:p-8 " + (isSelecting ? 'pb-32' : '')}>
        <div className={"w-full mx-auto transition-all duration-300 " + (isSelecting ? 'max-w-7xl lg:grid lg:grid-cols-12 gap-8 lg:gap-12' : 'max-w-2xl')}>

          {/* LEFT / CENTER */}
          <section className={"w-full h-fit transition-all duration-300 " + (isSelecting ? 'lg:col-span-4 mb-8 lg:mb-0' : '')}>
            {!isSelecting ? (
              <>
                <div className="mb-8 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight mb-4 tracking-tight">
                    Lanjut ke<br />
                    <span className="bg-tertiary text-white px-2 md:px-3 py-1 border-2 border-black inline-block mt-2 shadow-brutal rotate-[-2deg] rounded-none">Jadwal Praktikum</span>
                  </h1>
                  <p className="font-semibold text-lg max-w-md mx-auto md:mx-0">Upload file Spreadsheet (XLSX / CSV) jadwal praktikum.</p>
                </div>
                {isLoading ? (
                  <LoadingState
                    icon={<FileXls weight="bold" className="text-success text-3xl" />}
                    title="Memindai Spreadsheet..."
                    stripeColor="bg-success"
                    log={loadingLog}
                  />
                ) : (
                  <>
                    <FileDropZone
                      icon={<FileXls weight="bold" className="text-success text-3xl" />}
                      title="Drag & Drop File Jadwal Praktikum atau Klik untuk Memilih"
                      subtitle="Mendukung .xlsx, .xls, .csv"
                      buttonLabel="Pilih File Spreadsheet"
                      accept=".xlsx,.xls,.csv"
                      isDragOver={isDragOver}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onFileSelect={handleFileChange}
                    />
                    <div className="mt-8 bg-background border-2 border-black rounded-none shadow-none p-4 flex items-center gap-3">
                      <Sparkle weight="fill" className="text-tertiary text-2xl shrink-0" />
                      <p className="font-medium text-sm leading-relaxed">Aplikasi akan mengekstrak jadwal praktikum dari file spreadsheet dan mendeteksi prefix ruangan.</p>
                    </div>
                    {/* FIX #4: Back button + FIX #3: Skip button for upload state */}
                    <div className="mt-8 flex justify-between items-center">{footerButtons}</div>
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
                  <p className="font-semibold text-lg max-w-md mx-auto lg:mx-0 mt-4">Pilih jadwal kelas praktikum yang ingin Anda ikuti.</p>
                </div>
                <FileSummaryCard
                  fileName={fileName}
                  defaultFileName="praktikum.xlsx"
                  totalCount={praktikumCandidates.length}
                  statusText="Berhasil diproses"
                  statusTextClass="text-success"
                  resetLabel="Ganti File"
                  resetClassName="bg-white font-bold text-lg text-black"
                  onReset={handleReset}
                >
                  {praktikumRoomPrefixes.length > 0 && (
                    <div className="w-full text-left mt-2 border-t-2 border-black pt-4">
                      <label className="block font-bold text-sm uppercase mb-1">Pilih Prefix Ruangan</label>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Pilih kata awalan yang menandakan Ruang Praktikum di Excel.</p>
                      <div className="relative w-full">
                        <select value={selectedPrefix} onChange={e => handlePrefixChange(e.target.value)} className="w-full appearance-none bg-secondary rounded-none border-2 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none focus:shadow-brutal-sm hover:shadow-brutal-sm transition-shadow text-black">
                          {praktikumRoomPrefixes.map(p => (<option key={p} value={p}>{p}</option>))}
                        </select>
                        <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                      </div>
                    </div>
                  )}
                </FileSummaryCard>
              </>
            )}
          </section>

          {/* RIGHT COLUMN */}
          {isSelecting && (
            <section className="w-full lg:col-span-8 transition-all duration-300">
              <div className="bg-white border-2 border-black shadow-none h-full flex flex-col rounded-none overflow-hidden">
                <div className="border-b-2 border-black p-4 bg-tertiary text-white rounded-none flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="font-extrabold text-xl uppercase">Pilih Kelas Praktikum</div>
                  <div className="relative w-full sm:w-auto text-black">
                    <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl" />
                    <input type="text" placeholder="Cari praktikum atau lab..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-none border-2 border-black font-medium focus:outline-none focus:shadow-brutal transition-shadow" />
                  </div>
                </div>
                {/* FIX #2: Semester filter + Kelas filter side by side */}
                <div className="border-b-2 border-black p-4 bg-white flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1 md:w-44">
                    <select value={filterSmt} onChange={e => setFilterSmt(e.target.value)} className="w-full appearance-none bg-secondary rounded-none border-2 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none focus:shadow-brutal hover:shadow-brutal transition-shadow text-black">
                      <option value="">Semua SMT</option>
                      {uniqueSmt.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                  <div className="relative flex-1 md:w-44">
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="w-full appearance-none bg-primary rounded-none border-2 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none focus:shadow-brutal hover:shadow-brutal transition-shadow text-black">
                      <option value="">Semua Kelas</option>
                      {uniqueKelasPrak.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                </div>
                <div className="pb-36 scroll-pb-32 p-4 md:p-6 flex-1 overflow-y-auto bg-background flex flex-col gap-4">
                  {filteredClasses.map(c => {
                    const displayItem: ClassDisplayItem = { id: c.id, nama: c.courseName, kelas: c.kelas, keterangan: c.keterangan || '', hari: c.hari, jam: c.jam, ruang: c.ruang, sks: '1', dosen: c.dosen };
                    return (<ClassCard key={c.id} item={displayItem} isSelected={selectedCandidateIds.includes(c.id)} onToggle={toggleSelect} />);
                  })}
                  {filteredClasses.length === 0 && (<div className="text-center py-8 font-bold text-gray-500">Tidak ada kelas yang cocok.</div>)}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* FIXED BOTTOM NAV BAR */}
      {isSelecting && (
        <BottomNav
          selectedCount={selectedCount}
          leftContent={
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="bg-white rounded-none border-2 border-black px-3 py-2 font-bold transition-all inline-flex items-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none text-sm">
                <ArrowLeft weight="bold" /><span className="hidden md:inline">Kembali</span>
              </button>
              <div className="font-bold text-black">Terpilih: <span className="text-xl px-2 bg-[#60A5FA] border-2 border-black ml-1">{selectedCount}</span></div>
            </div>
          }
          rightContent={
            <div className="flex items-center gap-3">
              {selectedCount === 0 && (
                <button onClick={onNext} className="bg-white rounded-none border-2 border-black px-4 py-3 font-bold transition-all inline-flex items-center justify-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none text-sm whitespace-nowrap">
                  SKIP
                </button>
              )}
              <button disabled={selectedCount === 0} onClick={onNext}
                className={"rounded-none border-2 border-black px-4 py-3 font-extrabold uppercase transition-all inline-flex items-center justify-center gap-2 " + (selectedCount > 0 ? 'bg-tertiary text-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal' : 'bg-gray-300 text-gray-500 cursor-not-allowed') + " text-sm whitespace-nowrap"}>
                <span className="hidden md:inline">Lihat Hasil</span><span className="md:hidden">Next</span><MagicWand weight="bold" />
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
