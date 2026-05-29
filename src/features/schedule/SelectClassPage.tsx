import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJadwalStore, type DataTeoriMentah } from '../../store/useJadwalStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/pixelact-ui/select';

interface CourseGroup {
  KodeMK: string;
  MataKuliah: string;
  kelasOptions: string[];
  rows: DataTeoriMentah[];
}

export function SelectClassPage() {
  const navigate = useNavigate();
  const dataTeoriMentah = useJadwalStore((s) => s.dataTeoriMentah);
  const [globalKelas, setGlobalKelas] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, { MataKuliah: string; kelasSet: Set<string>; rows: typeof dataTeoriMentah }>();

    for (const row of dataTeoriMentah) {
      const key = row.KodeMK;
      if (!map.has(key)) {
        map.set(key, { MataKuliah: row.MataKuliah, kelasSet: new Set(), rows: [] });
      }
      const group = map.get(key)!;
      if (row.Kelas) group.kelasSet.add(row.Kelas);
      group.rows.push(row);
    }

    const result: CourseGroup[] = [];
    for (const [KodeMK, g] of map) {
      result.push({
        KodeMK,
        MataKuliah: g.MataKuliah,
        kelasOptions: [...g.kelasSet].sort(),
        rows: g.rows,
      });
    }
    return result;
  }, [dataTeoriMentah]);

  const allKelasOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const k of g.kelasOptions) set.add(k);
    }
    return [...set].sort();
  }, [groups]);

  useEffect(() => {
    if (groups.length === 0) {
      navigate('/upload-teori', { replace: true });
    }
  }, [groups, navigate]);

  if (groups.length === 0) return null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-sm flex-col px-3 pt-6">
      <p className="pixel-font mb-4 text-center text-[10px] uppercase tracking-wider text-zinc-400">
        Select Classes
      </p>

      <div className="mb-4">
        <label className="pixel-font mb-1 block text-[9px] text-zinc-500">
          Set All Classes
        </label>
        <Select value={globalKelas} onValueChange={setGlobalKelas}>
          <SelectTrigger className="w-full text-[9px]">
            <SelectValue placeholder="[ All Classes... ]" />
          </SelectTrigger>
          <SelectContent>
            {allKelasOptions.map((k) => (
              <SelectItem key={k} value={k} className="pixel-font text-[9px]">
                Class {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="pixel-font text-center text-[9px] text-zinc-500">
        {groups.length} courses detected
      </p>
    </div>
  );
}
