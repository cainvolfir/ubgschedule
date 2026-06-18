import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJadwalStore } from '../../store/useJadwalStore';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/pixelact-ui/select';
import { cn } from '../../lib/utils';
import { CatState } from '../../components/CatState';
import { UGOMascotArt } from '../../components/UGOMascotArt';
import { useToast } from '../../components/Toast';

function truncate(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

type DropState = 'empty' | 'processing' | 'populated' | 'error';

const PRAKTIKUM_ERRORS: Record<string, string> = {
  PARSE: 'could not read the spreadsheet. make sure it is a valid XLSX/XLS file.',
  SCAN: 'could not scan for room prefixes. the file may be empty or unsupported.',
  default: 'something went wrong. try a different file.',
};

export function UploadPraktikumPage({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const jadwalTeoriTerpilih = useJadwalStore((s) => s.jadwalTeoriTerpilih);
  const jadwalFinal = useJadwalStore((s) => s.jadwalFinal);
  const setJadwalFinal = useJadwalStore((s) => s.setJadwalFinal);
  const praktikumRoomPrefixes = useJadwalStore((s) => s.praktikumRoomPrefixes);
  const setPraktikumRoomPrefixes = useJadwalStore((s) => s.setPraktikumRoomPrefixes);
  const selectedRoomPrefix = useJadwalStore((s) => s.selectedRoomPrefix);
  const setSelectedRoomPrefix = useJadwalStore((s) => s.setSelectedRoomPrefix);
  const praktikumCandidates = useJadwalStore((s) => s.praktikumCandidates);
  const setPraktikumCandidates = useJadwalStore((s) => s.setPraktikumCandidates);
  const selectedCandidateIds = useJadwalStore((s) => s.selectedCandidateIds);
  const toggleCandidateId = useJadwalStore((s) => s.toggleCandidateId);
  const isParsing = useJadwalStore((s) => s.isParsing);
  const setIsParsing = useJadwalStore((s) => s.setIsParsing);
  const { addToast } = useToast();

  const [dropState, setDropState] = useState<DropState>('empty');
  const [isScanning, setIsScanning] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterKelas, setFilterKelas] = useState('__all__');
  const [filterSemester, setFilterSemester] = useState('__all__');
  const [errorDetail, setErrorDetail] = useState('');
  const [progressStage, setProgressStage] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/praktikum.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          if (step === 'SCAN') setProgressStage('scanning for room prefixes...');
          if (step === 'PARSE') setProgressStage('parsing schedule data...');
          break;
        case 'WARN': break;
        case 'ERROR':
          setIsScanning(false); setIsParsing(false); setDropState('error'); setProgressStage('');
          setErrorDetail(PRAKTIKUM_ERRORS[step] || PRAKTIKUM_ERRORS.default);
          addToast({ type: 'error', title: 'failed to parse spreadsheet', message: PRAKTIKUM_ERRORS[step] || PRAKTIKUM_ERRORS.default, duration: 8000 });
          break;
        case 'SCAN_RESULT':
          setPraktikumRoomPrefixes(data.prefixes || []); setIsScanning(false); setProgressStage('');
          if (data.prefixes?.length > 0) {
            setDropState('populated');
            addToast({ type: 'success', title: `found ${data.prefixes.length} room prefixes`, message: 'select a room prefix to see classes.', duration: 4000 });
          } else {
            setDropState('error'); setErrorDetail('no room prefixes found.');
            addToast({ type: 'error', title: 'no room prefixes found', duration: 6000 });
          }
          break;
        case 'PARSE_RESULT':
          setPraktikumCandidates(data.candidates || []); setIsParsing(false); setProgressStage('');
          if (data.candidates?.length > 0) addToast({ type: 'success', title: `found ${data.candidates.length} classes`, duration: 4000 });
          else addToast({ type: 'info', title: 'no classes for this prefix', duration: 4000 });
          break;
      }
    };
    worker.onerror = () => {
      setIsScanning(false); setIsParsing(false); setDropState('error'); setProgressStage('');
      setErrorDetail('unexpected error. please try again.');
      addToast({ type: 'error', title: 'unexpected error', message: 'the parser crashed.', duration: 6000 });
    };
    workerRef.current = worker;
    return () => { worker.terminate(); };
  }, [addToast]);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    if (!validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      addToast({ type: 'error', title: 'invalid file type', message: 'please upload XLSX, XLS, or CSV.', duration: 5000 }); return;
    }
    if (file.size > 50 * 1024 * 1024) {
      addToast({ type: 'error', title: 'file too large', message: 'maximum 50MB.', duration: 5000 }); return;
    }
    setFileName(file.name); setDropState('processing'); setProgressStage('starting...');
    setErrorDetail(''); setIsScanning(true); setPraktikumRoomPrefixes([]); setSelectedRoomPrefix(''); setPraktikumCandidates([]);
    setFilterKelas('__all__'); setFilterSemester('__all__');
    file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer); setFileData(bytes);
      workerRef.current?.postMessage({ type: 'SCAN_XLSX', file: bytes });
    }).catch(() => {
      setDropState('error'); setIsScanning(false); setProgressStage(''); setErrorDetail('failed to read file.');
      addToast({ type: 'error', title: 'file read error', duration: 5000 });
    });
  }, [addToast]);

  const handleRetry = useCallback(() => { setDropState('empty'); setErrorDetail(''); setProgressStage(''); inputRef.current?.click(); }, []);
  const handlePrefixChange = useCallback((prefix: string) => {
    if (!workerRef.current || !fileData) return;
    setSelectedRoomPrefix(prefix); setFilterKelas('__all__'); setFilterSemester('__all__');
    setIsParsing(true); setProgressStage('parsing candidates...');
    workerRef.current.postMessage({ type: 'PARSE_PRAKTIKUM', file: fileData, roomPrefix: prefix });
  }, [fileData]);

  const uniqueKelas = useMemo(() => [...new Set(praktikumCandidates.map((c) => c.kelas))].sort(), [praktikumCandidates]);
  const uniqueSemesters = useMemo(() => [...new Set(praktikumCandidates.map((c) => c.semester).filter(Boolean))].sort(), [praktikumCandidates]);
  const filteredCandidates = useMemo(() => praktikumCandidates.filter((c) => {
    if (filterKelas !== '__all__' && c.kelas !== filterKelas) return false;
    if (filterSemester !== '__all__' && c.semester !== filterSemester) return false;
    return true;
  }), [praktikumCandidates, filterKelas, filterSemester]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }, [processFile]);
  const handleClick = () => inputRef.current?.click();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); };

  const handleContinue = () => {
    const checked = filteredCandidates.filter((c) => selectedCandidateIds.includes(c.id));
    const parseJam = (jam: string) => { const m = jam.match(/^(\d{2})[:.](\d{2})\s*[-–]\s*(\d{2})[:.](\d{2})$/); return m ? { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) } : null; };
    const formatJam = (s: number, e: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}-${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
    const groupKey = (c: typeof checked[number]) => `${c.courseName}|${c.dosen}|${c.hari}|${c.ruang}`;
    const groups = new Map<string, typeof checked>();
    for (const c of checked) { const k = groupKey(c); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(c); }
    const praktikumMerged: Record<string, unknown>[] = [];
    for (const items of groups.values()) {
      const parsed = items.map((c) => ({ c, jam: parseJam(c.jam) }));
      const valid = parsed.filter((p): p is { c: typeof checked[number]; jam: NonNullable<ReturnType<typeof parseJam>> } => p.jam !== null).sort((a, b) => a.jam.start - b.jam.start);
      for (const p of parsed) { if (!p.jam) praktikumMerged.push({ KodeMK: '', MataKuliah: p.c.courseName, Kelas: p.c.kelas, SKS: '1', SMT: p.c.semester, DosenPengampuh: p.c.dosen, Hari: p.c.hari, Jam: p.c.jam || '', Ruang: p.c.ruang, Keterangan: p.c.keterangan || '-' }); }
      if (valid.length === 0) continue;
      let run = { items: [valid[0].c], start: valid[0].jam.start, end: valid[0].jam.end };
      for (let i = 1; i < valid.length; i++) { const v = valid[i]; if (v.jam.start === run.end) { run.items.push(v.c); run.end = v.jam.end; } else { const f = run.items[0]; praktikumMerged.push({ KodeMK: '', MataKuliah: f.courseName, Kelas: f.kelas, SKS: String(run.items.length), SMT: f.semester, DosenPengampuh: f.dosen, Hari: f.hari, Jam: formatJam(run.start, run.end), Ruang: f.ruang, Keterangan: run.items.map((x) => x.keterangan).filter(Boolean).join(', ') || '-' }); run = { items: [v.c], start: v.jam.start, end: v.jam.end }; } }
      const f = run.items[0]; praktikumMerged.push({ KodeMK: '', MataKuliah: f.courseName, Kelas: f.kelas, SKS: String(run.items.length), SMT: f.semester, DosenPengampuh: f.dosen, Hari: f.hari, Jam: formatJam(run.start, run.end), Ruang: f.ruang, Keterangan: run.items.map((x) => x.keterangan).filter(Boolean).join(', ') || '-' });
    }
    setJadwalFinal([...jadwalTeoriTerpilih.map((r) => ({ ...r, Keterangan: '-' })), ...praktikumMerged]);
    onNext();
  };

  const handleSkip = () => {
    if (jadwalFinal.length === 0) setJadwalFinal(jadwalTeoriTerpilih.map((r) => ({ ...r, Keterangan: '-' })));
    onNext();
  };

  const dragClasses = isDragOver ? 'border-[var(--blue)] bg-[var(--blue-faint)]' : '';
  const hasCandidates = praktikumCandidates.length > 0;
  const hasChecked = selectedCandidateIds.length > 0;
  const isProcessing = dropState === 'processing' || isScanning || isParsing;

  return (
    <div className="animate-fade-in-up">
      {/* Back button + typing */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="terminal-btn-sm"
        >[ back ]</button>
      </div>

      {/* Command line prompt */}
      <div className="prompt-line">
        <span className="prompt-arrow">❯</span>
        <span className="prompt-path">~/tools</span>
        <span className="prompt-cmd">--upload</span>
        <span className="prompt-file">your_practical_schedule.xlsx</span>
      </div>

      {/* Input area */}
      <div className="input-block">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CatState pose="loading" size={40} message={truncate(fileName)} />
            <div className="font-mono text-xs text-[var(--blue)]">{'❯'} {isScanning ? 'scanning spreadsheet...' : 'parsing data...'}</div>
            {progressStage && <div className="font-mono text-[10px] text-[var(--text-muted)]">{progressStage}</div>}
            <div className="w-40 h-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden">
              <div className="h-full bg-[var(--blue)] rounded-full animate-progress-bar" />
            </div>
          </div>
        ) : dropState === 'empty' ? (
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={cn('terminal-input text-center cursor-pointer py-8', dragClasses)}
          >
            <div className="flex flex-col items-center gap-2">
              <UGOMascotArt size={36} alt="UGO" />
              <span className="text-[var(--text-faint)] text-xs">drop spreadsheet here or click to browse</span>
            </div>
          </div>
        ) : dropState === 'error' ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CatState pose="blink" size={32} />
            <div className="error-line visible !block font-mono text-xs">{errorDetail}</div>
            <div className="flex gap-2 mt-1">
              <button className="terminal-btn-sm" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>[ try again ]</button>
              <button className="terminal-btn-sm" onClick={(e) => { e.stopPropagation(); handleClick(); }}>[ different file ]</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <UGOMascotArt size={36} alt="UGO" />
            <div className="font-mono text-xs text-[var(--success)]">{'❯'} {truncate(fileName)} — loaded</div>
            <button className="terminal-btn-sm" onClick={handleClick}>[ replace file ]</button>
          </div>
        )}
      </div>

      {dropState === 'empty' && (
        <button className="terminal-btn" onClick={handleClick}>
          <span>[ browse files ]</span>
        </button>
      )}

      {/* Room prefix selection */}
      {dropState === 'populated' && praktikumRoomPrefixes.length > 0 && (
        <div className="mt-3">
          <div className="prompt-line mb-2">
            <span className="prompt-arrow">❯</span>
            <span className="prompt-cmd">select room prefix</span>
          </div>
          <Select value={selectedRoomPrefix} onValueChange={handlePrefixChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="choose a room prefix..." />
            </SelectTrigger>
            <SelectContent>
              {praktikumRoomPrefixes.map((prefix) => <SelectItem key={prefix} value={prefix}>{prefix}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Parsing spinner */}
      {isParsing && (
        <div className="flex flex-col items-center gap-2 mt-3 py-4">
          <CatState pose="loading" size={32} />
          <div className="font-mono text-[10px] text-[var(--text-muted)]">{progressStage || 'parsing...'}</div>
          <div className="w-40 h-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden">
            <div className="h-full bg-[var(--blue)] rounded-full animate-progress-bar" />
          </div>
        </div>
      )}

      {/* Candidates */}
      {!isScanning && hasCandidates && !isParsing && (
        <div className="animate-expand mt-3">
          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            <span>output</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span>{praktikumCandidates.length} classes</span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
            {[{ label: 'kelas', value: filterKelas, setter: setFilterKelas, items: uniqueKelas },
              { label: 'smt', value: filterSemester, setter: setFilterSemester, items: uniqueSemesters },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1">
                <span className="font-mono text-[9px] text-[var(--text-faint)]">{f.label}:</span>
                <Select value={f.value} onValueChange={f.setter}>
                  <SelectTrigger size="xs" className="min-w-[36px]">
                    <SelectValue placeholder="all" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="text-[9px]">all</SelectItem>
                    {f.items.map((item) => <SelectItem key={item} value={item} className="text-[9px]">{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <span className="font-mono text-[10px] text-[var(--blue)]">{selectedCandidateIds.length} selected</span>
          </div>

          {filteredCandidates.length > 0 ? (
            <div className="max-h-[180px] overflow-y-auto border border-[var(--border)] rounded-sm">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {filteredCandidates.map((cand) => {
                    const isChecked = selectedCandidateIds.includes(cand.id);
                    return (
                      <tr
                        key={cand.id}
                        className={cn(
                          'border-b border-[var(--border)] cursor-pointer transition-colors',
                          isChecked ? 'bg-[var(--blue-faint)]' : 'hover:bg-[var(--surface-2)]',
                        )}
                        onClick={() => toggleCandidateId(cand.id)}
                      >
                        <td className="px-2 py-1.5 w-6">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleCandidateId(cand.id)} className="accent-[var(--blue)] w-3 h-3" />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-xs">
                          <div className="text-[var(--text)]">{cand.courseName}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {cand.dosen || '—'}{cand.semester ? ` • SMT ${cand.semester}` : ''} • {cand.kelas}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-[var(--text-muted)] text-right">
                          {cand.hari} {cand.jam}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="font-mono text-xs text-[var(--text-muted)] py-2">{'❯'} no classes match this filter.</div>
          )}

          {hasChecked && (
            <button className="terminal-btn mt-3" onClick={handleContinue}>
              <span>[ continue with {selectedCandidateIds.length} classes ]</span>
            </button>
          )}
        </div>
      )}

      {/* Skip */}
      <button className="terminal-btn-sm mt-3" onClick={handleSkip}>
        {'>'} skip practical — view schedule
      </button>

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInputChange} />
    </div>
  );
}
