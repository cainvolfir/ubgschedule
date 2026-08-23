import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FilePdf, UploadSimple, Sparkle, CheckCircle,
  Trash, MagnifyingGlass, CaretDown, ArrowRight,
} from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import ClassCard, { type ClassDisplayItem } from './ClassCard';
import { useJadwalStore, type DataTeoriMentah } from '../store/useJadwalStore';

type WorkerMsg = { type: string; step?: string; data?: unknown };

interface TheoryStepProps { onNext?: () => void; }

export default function TheoryStep({ onNext }: TheoryStepProps) {
  const {
    dataTeoriMentah, setDataTeoriMentah,
    selectedTheoryRowIds, toggleTheoryRowId,
    setJadwalTeoriTerpilih, reset,
  } = useJadwalStore();

  const [isParsed, setIsParsed] = useState(() => dataTeoriMentah.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLog, setLoadingLog] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSmt, setFilterSmt] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [loadingLog]);
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  const startParsing = useCallback((file: File) => {
    setFileName(file.name); setIsLoading(true); setLoadingLog('');
    const worker = new Worker(new URL('../workers/theory.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const { type, step, data } = e.data;
      if (type === 'LOG') { setLoadingLog(p => p + '[' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'WARN') { setLoadingLog(p => p + '[WARN:' + step + '] ' + (data ?? '') + '\n'); return; }
      if (type === 'ERROR') { setLoadingLog(p => p + '[ERROR:' + step + '] ' + (data ?? '') + '\n'); return; }
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
    file.arrayBuffer().then(buf => { worker.postMessage({ type: 'PARSE_THEORY', fileBuffer: buf }); });
  }, [setDataTeoriMentah]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') startParsing(file);
  }, [startParsing]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) startParsing(file);
  }, [startParsing]);

  const toggleSelect = useCallback((id: string) => { toggleTheoryRowId(id); }, [toggleTheoryRowId]);

  const handleReset = useCallback(() => {
    reset(); setIsParsed(false); setIsLoading(false); setLoadingLog('');
    setSearchQuery(''); setFilterSmt(''); setFilterKelas(''); setFileName('');
  }, [reset]);

  const filteredClasses = dataTeoriMentah.filter(c => {
    if (searchQuery && !c.MataKuliah.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterSmt && c.SMT !== filterSmt) return false;
    if (filterKelas && c.Kelas !== filterKelas) return false;
    return true;
  });

  const uniqueSMT = useMemo(() => [...new Set(dataTeoriMentah.map(c => c.SMT).filter(Boolean))].sort(), [dataTeoriMentah]);
  const uniqueKelas = useMemo(() => [...new Set(dataTeoriMentah.map(c => c.Kelas).filter(Boolean))].sort(), [dataTeoriMentah]);
  const selectedCount = selectedTheoryRowIds.length;

  return (
    <div className="bg-background">
      <WizardHeader currentStep={1} />
      <main className={"p-4 md:p-8 " + (isParsed ? 'pb-32' : '')}>
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
                    <span className="bg-tertiary text-white px-2 md:px-3 py-1 border-4 border-black inline-block mt-2 shadow-[4px_4px_0px_#000000] rotate-[-2deg]">Jadwal Teori</span>
                  </h1>
                  <p className="font-semibold text-lg max-w-md mx-auto md:mx-0">Unggah file PDF jadwal kuliah teori.</p>
                </div>
                {isLoading ? (
                  <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_#000000] flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-20 h-20 bg-background border-4 border-black rounded-full flex items-center justify-center"><FilePdf weight="bold" className="text-tertiary text-3xl" /></div>
                    <h3 className="font-extrabold text-xl animate-pulse">Memproses PDF...</h3>
                    <div className="w-full h-8 bg-white border-3 border-black p-1"><div className="w-full h-full bg-tertiary loading-stripes border-r-3 border-black" /></div>
                    <div ref={logRef} className="font-medium text-sm mt-2 text-left w-full h-20 overflow-y-auto bg-gray-100 border-2 border-black p-2 font-mono text-xs whitespace-pre-wrap">{loadingLog}</div>
                  </div>
                ) : (
                  <>
                    <div
                      className={"bg-white border-4 border-black p-8 " + (isDragOver ? 'bg-[#DBEAFE] shadow-[6px_6px_0px_#000000]' : 'shadow-[8px_8px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[6px_6px_0px_#000000]') + " transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 group"}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}
                    >
                      <div className="w-20 h-20 bg-background border-4 border-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FilePdf weight="bold" className="text-tertiary text-3xl" /></div>
                      <h3 className="font-extrabold text-xl mb-1">Drag & Drop file PDF</h3>
                      <p className="font-medium text-gray-600">atau klik untuk memilih</p>
                      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                      <button type="button" className="mt-2 bg-[#60A5FA] w-full py-3 border-4 border-black shadow-[4px_4px_0px_#000000] font-bold text-lg text-black group-hover:bg-tertiary group-hover:text-white transition-colors" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        <UploadSimple weight="bold" className="inline mr-2" />Pilih File PDF
                      </button>
                    </div>
                    <div className="mt-8 bg-background border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_#000000] flex items-center gap-3">
                      <Sparkle weight="fill" className="text-tertiary text-2xl shrink-0" />
                      <p className="font-medium text-sm leading-relaxed">Aplikasi akan otomatis mengekstrak <strong>Kode MK</strong>, <strong>Mata Kuliah</strong>, <strong>Kelas</strong>, <strong>Jam</strong>, <strong>Ruang</strong>, dan <strong>Dosen</strong> dari PDF.</p>
                    </div>
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
                  <p className="font-semibold text-lg max-w-md mx-auto lg:mx-0 mt-4">Tandai kelas-kelas yang ingin Anda masukkan ke jadwal.</p>
                </div>
                <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_#000000] flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-20 h-20 bg-[#DBEAFE] border-4 border-black rounded-full flex items-center justify-center"><CheckCircle weight="fill" className="text-tertiary text-4xl" /></div>
                  <h3 className="font-extrabold text-lg mb-1 truncate w-48 mx-auto" title={fileName}>{fileName || 'jadwal.pdf'}</h3>
                  <div className="font-bold flex items-center justify-center gap-1"><Sparkle weight="bold" />Berhasil diproses!</div>
                  <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-lg">
                    Ditemukan:<span className="bg-black text-white px-2 rounded">{dataTeoriMentah.length} Kelas</span>
                  </div>
                  <button onClick={handleReset} className="mt-2 bg-white w-full py-3 border-4 border-black shadow-[4px_4px_0px_#000000] font-bold text-lg text-black hover:bg-red-50 hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000000] transition-all flex justify-center items-center gap-2">
                    <Trash weight="bold" />Upload Ulang
                  </button>
                </div>
              </>
            )}
          </section>

          {/* RIGHT COLUMN */}
          {isParsed && (
            <section className="w-full lg:col-span-8 transition-all duration-300">
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000000] h-full flex flex-col rounded-2xl overflow-hidden">
                <div className="border-b-4 border-black p-4 bg-tertiary text-white rounded-t-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="font-extrabold text-xl uppercase">Pilih Kelas Anda</div>
                  <div className="relative w-full sm:w-auto text-black">
                    <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl" />
                    <input type="text" placeholder="Cari mata kuliah..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border-3 border-black font-medium focus:outline-none focus:shadow-[4px_4px_0px_#000000] transition-shadow" />
                  </div>
                </div>
                <div className="border-b-4 border-black p-4 bg-white flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1 md:w-44">
                    <select value={filterSmt} onChange={e => setFilterSmt(e.target.value)} className="w-full appearance-none bg-secondary border-3 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000000] hover:shadow-[4px_4px_0px_#000000] transition-shadow text-black">
                      <option value="">Semua SMT</option>
                      {uniqueSMT.map(s => (<option key={s} value={s}>Semester {s}</option>))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                  <div className="relative flex-1 md:w-44">
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="w-full appearance-none bg-primary border-3 border-black pl-4 pr-10 py-2.5 font-bold cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#000000] hover:shadow-[4px_4px_0px_#000000] transition-shadow text-black">
                      <option value="">Semua Kelas</option>
                      {uniqueKelas.map(k => (<option key={k} value={k}>{k}</option>))}
                    </select>
                    <CaretDown weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg" />
                  </div>
                </div>
                <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-background flex flex-col gap-4">
                  {filteredClasses.map(c => {
                    const displayItem: ClassDisplayItem = {
                      id: c.id, nama: c.MataKuliah, kelas: c.Kelas, hari: c.Hari, jam: c.Jam, ruang: c.Ruang, sks: c.SKS, dosen: c.DosenPengampuh,
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
        <div className="fixed bottom-0 left-0 w-full z-[100] bg-white border-t-2 border-black p-4 flex justify-between items-center shadow-[0px_-2px_0px_rgba(0,0,0,1)]">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <div className="font-bold text-black">Terpilih: <span className="text-xl px-2 bg-[#60A5FA] border-2 border-black ml-1">{selectedCount}</span></div>
            <button disabled={selectedCount === 0} onClick={() => {
              const chosen = dataTeoriMentah.filter(r => selectedTheoryRowIds.includes(r.id));
              setJadwalTeoriTerpilih(chosen); onNext?.();
            }} className={"border-4 border-black px-4 md:px-6 py-3 font-extrabold transition-all inline-flex items-center gap-2 " + (selectedCount > 0 ? 'bg-tertiary text-white shadow-[4px_4px_0px_#000000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000000]' : 'bg-gray-300 text-gray-500 cursor-not-allowed')}>
              <span className="hidden md:inline">Praktikum</span><ArrowRight weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
