import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJadwalStore, type DataTeoriMentah } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
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
  const kelasPilihanUser = useJadwalStore((s) => s.kelasPilihanUser);
  const setKelasPilihanUser = useJadwalStore((s) => s.setKelasPilihanUser);
  const setJadwalTeoriTerpilih = useJadwalStore((s) => s.setJadwalTeoriTerpilih);
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

  const allSelected = useMemo(() => groups.length > 0 && groups.every((g) => kelasPilihanUser[g.KodeMK]), [groups, kelasPilihanUser]);

  useEffect(() => {
    if (Object.keys(kelasPilihanUser).length > 0) {
      console.log('[SelectClass] Selection map:', kelasPilihanUser);
    }
  }, [kelasPilihanUser]);

  const handleGlobalChange = useCallback((kelas: string) => {
    setGlobalKelas(kelas);
    const updated: Record<string, string> = {};
    for (const g of groups) {
      if (g.kelasOptions.includes(kelas)) {
        updated[g.KodeMK] = kelas;
      }
    }
    setKelasPilihanUser(updated);
  }, [groups, setKelasPilihanUser]);

  const handleKelasChange = useCallback((kodeMK: string, kelas: string) => {
    setKelasPilihanUser({ ...kelasPilihanUser, [kodeMK]: kelas });
  }, [kelasPilihanUser, setKelasPilihanUser]);

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
        <Select value={globalKelas} onValueChange={handleGlobalChange}>
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

      <div className="flex flex-col gap-2">
        {groups.map((g) => {
          const selected = kelasPilihanUser[g.KodeMK] || '';
          return (
            <Card key={g.KodeMK} className="w-full">
              <CardContent className="px-3 py-2">
                <div className="pixel-font mb-1.5 text-[9px] font-bold leading-tight">
                  {g.KodeMK}
                </div>
                <div className="pixel-font mb-2 text-[8px] leading-tight text-zinc-500">
                  {g.MataKuliah}
                </div>
                <Select
                  value={selected}
                  onValueChange={(v) => handleKelasChange(g.KodeMK, v)}
                >
                  <SelectTrigger className="w-full text-[9px]">
                    <SelectValue placeholder="[ Select Class... ]" />
                  </SelectTrigger>
                  <SelectContent>
                    {g.kelasOptions.map((k) => (
                      <SelectItem
                        key={k}
                        value={k}
                        className="pixel-font text-[9px]"
                      >
                        Class {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center pb-8">
        <Button
          variant={allSelected ? 'default' : 'secondary'}
          disabled={!allSelected}
          className="pixel-font w-full text-[9px]"
          onClick={() => {
            const filtered = dataTeoriMentah.filter(
              (row) => kelasPilihanUser[row.KodeMK] === row.Kelas,
            );
            console.log('[SelectClass] jadwalTeoriTerpilih:', filtered.length, 'rows');
            console.log('[SelectClass] First 3 rows:', filtered.slice(0, 3));
            setJadwalTeoriTerpilih(filtered);
            navigate('/upload-praktikum');
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
