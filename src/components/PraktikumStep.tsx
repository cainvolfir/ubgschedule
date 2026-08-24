import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FileXls, UploadSimple, Sparkle, CheckCircle,
  Trash, MagnifyingGlass, CaretDown, MagicWand, ArrowLeft,
} from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import ClassCard, { type ClassDisplayItem } from './ClassCard';
import { useJadwalStore } from '../store/useJadwalStore';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [loadingLog]);
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) scanFile(file);
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
      <button onClick={onBack} className="bg-white border-4 border-black px-4 md:px-6 py-3 font-bold transition-all inline-flex items-center gap-2 shadow-[3px_3px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000000]">
        <ArrowLeft weight="bold" /><span className="hidden md:inline">Kembali</span>
      </button>
      <div className="flex items-center gap-3">
        <button onClick={onNext} className="bg-white border-4 border-black px-4 md:px-6 py-3 font-bold transition-all inline-flex items-center gap-2 shadow-[3px_3px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000000]">
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
                    <span className="bg-tertiary text-white px-2 md:px-3 py-1 border-4 border-black inline-block mt-2 shadow-[4px_4px_0px_#000000] rotate-[-2deg]">Jadwal Praktikum</span>
                  </h1>
                  <p className="font-semibold text-lg max-w-md mx-auto md:mx-0">Upload file Spreadsheet (XLSX / CSV) jadwal praktikum.</p>
                </div>
                {isLoading ? (
                  <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_#000000] flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-20 h-20 bg-background border-4 border-black rounded-full flex items-center justify-center"><FileXls weight="bold" className="text-success text-3xl" /></div>
                    <h3 className="font-extrabold text-xl animate-pulse">Memindai Spreadsheet...</h3>
                    <div className="w-full h-8 bg-white border-3 border-black p-1"><div className="w-full h-full bg-success loading-stripes border-r-3 border-black" /></div>
                    <div ref={logRef} className="font-medium text-sm mt-2 text-left w-full h-20 overflow-y-auto bg-gray-100 border-2 border-black p-2 font-mono text-xs whitespace-pre-wrap">{loadingLog}</div>
                  </div>
                ) : (
                  <>
                    <div className={"bg-white border-4 border-black p-8 " + (isDragOver ? 'bg-[#DBEAFE] shadow-[6px_6px_0px_#000000]' : 'shadow-[8px_8px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[6px_6px_0px_#000000]') + " transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 group"}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}>
                      <div className="w-20 h-20 bg-background border-4 border-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FileXls weight="bold" className="text-success text-3xl" /></div>
                      <h3 className="font-extrabold text-xl mb-1">Tarik sini</h3>
                      <p className="font-medium text-gray-600">Mendukung .xlsx, .xls, .csv</p>
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                      <button type="button" className="mt-2 bg-[#60A5FA] w-full py-3 border-4 border-black shadow-[4px_4px_0px_#000000] font-bold text-lg text-black group-hover:bg-tertiary group-hover:text-white transition-colors" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        <UploadSimple weight="bold" className="inline mr-2" />Pilih File Spreadsheet
                      </button>
                    </div>
                    <div className="mt-8 bg-background border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_#000000] flex items-center gap-3">
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
                    <span className="bg-tertiary text-white px-2 md:px-3 py-1 border-4 border-black inline-block shadow-[4px_4px_0px_#000000] rotate-[-2deg]">Pilih Kelas</span>
                  </h1>
                  <p className="font-semibold text-lg max-w-md mx-auto lg:mx-0 mt-4">Pilih jadwal kelas praktikum yang ingin Anda ikuti.</p>
                </div>
                <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_#000000] flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-20 h-20 bg-[#DBEAFE] border-4 border-black rounded-full flex items-center justify-center"><CheckCircle weight="fill" className="text-tertiary text-4xl" /></div>
                  <h3 className="font-extrabold text-lg mb-1 truncate w-48 mx-auto" title={fileName}>{fileName || 'praktikum.xlsx'}</h3>
                  <div className="font-bold text-success flex items-center justify-center gap-1"><Sparkle weight="bold" />Berhasil diproses</div>
                  <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-lg">
                    Ditemukan:<span className="bg-black text-white px-2 rounded">{praktikumCandidates.length} Kelas</span>
                  </div>
                  {praktikumRoomPrefixes.length > 0 && (
                    <div className="w-full text-left mt-2 border-t-4 border-black pt-4">
                      <label className="block font-bold text-sm uppercase mb-1">Pilih Prefix Ruangan</label>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Pilih kata awalan yang menandakan Ruang Praktikum di Excel.</p>
                      <div className="relative w-full">
                        <select value={selectedPrefix} onChange={e => handlePrefixChange(e.target.value)} className="w-full appearance-none bg-secondary border-3 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none focus:shadow-[2px_2px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] transition-shadow text-black rounded-md">
                          {praktikumRoomPrefixes.map(p => (<option key={p} value={p}>{p}</option>))}
                        </select>
                        <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                      </div>
                    </div>
                  )}
                  <button onClick={handleReset} className="mt-2 bg-white w-full py-3 border-4 border-black shadow-[4px_4px_0px_#000000] font-bold text-lg text-black hover:bg-red-50 hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all flex justify-center items-center gap-2">
                    <Trash weight="bold" />Ganti File
                  </button>
                </div>
              </>
            )}
          </section>

          {/* RIGHT COLUMN */}
          {isSelecting && (
            <section className="w-full lg:col-span-8 transition-all duration-300">
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000000] h-full flex flex-col rounded-2xl overflow-hidden">
                <div className="border-b-4 border-black p-4 bg-tertiary text-white rounded-t-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="font-extrabold text-xl uppercase">Pilih Kelas Praktikum</div>
                  <div className="relative w-full sm:w-auto text-black">
                    <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl" />
                    <input type="text" placeholder="Cari praktikum atau lab..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border-3 border-black font-medium focus:outline-none focus:shadow-[4px_4px_0px_#000000] transition-shadow" />
                  </div>
                </div>
                {/* FIX #2: Semester filter + Kelas filter side by side */}
                <div className="border-b-4 border-black p-4 bg-white flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1 md:w-44">
                    <select value={filterSmt} onChange={e => setFilterSmt(e.target.value)} className="w-full appearance-none bg-secondary border-3 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000000] hover:shadow-[4px_4px_0px_#000000] transition-shadow text-black">
                      <option value="">Semua SMT</option>
                      {uniqueSmt.map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                  <div className="relative flex-1 md:w-44">
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="w-full appearance-none bg-primary border-3 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000000] hover:shadow-[4px_4px_0px_#000000] transition-shadow text-black">
                      <option value="">Semua Kelas</option>
                      {uniqueKelasPrak.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                </div>
                <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-background flex flex-col gap-4">
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
        <div className="fixed bottom-0 left-0 w-full z-[100] bg-white border-t-2 border-black p-4 flex justify-between items-center shadow-[0px_-2px_0px_rgba(0,0,0,1)]">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="bg-white border-3 border-black px-3 py-2 font-bold transition-all inline-flex items-center gap-2 shadow-[2px_2px_0px_#000000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000000] text-sm">
                <ArrowLeft weight="bold" /><span className="hidden md:inline">Kembali</span>
              </button>
              <div className="font-bold text-black">Terpilih: <span className="text-xl px-2 bg-[#60A5FA] border-2 border-black ml-1">{selectedCount}</span></div>
            </div>
            <div className="flex items-center gap-3">
              {selectedCount === 0 && (
                <button onClick={onNext} className="bg-white border-4 border-black px-4 py-3 font-bold transition-all inline-flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000000] text-sm whitespace-nowrap">
                  SKIP
                </button>
              )}
              <button disabled={selectedCount === 0} onClick={onNext}
                className={"border-4 border-black px-4 py-3 font-extrabold uppercase transition-all inline-flex items-center justify-center gap-2 " + (selectedCount > 0 ? 'bg-tertiary text-white shadow-[4px_4px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000000]' : 'bg-gray-300 text-gray-500 cursor-not-allowed') + " text-sm whitespace-nowrap"}>
                <span className="hidden md:inline">Lihat Hasil</span><span className="md:hidden">Next</span><MagicWand weight="bold" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
