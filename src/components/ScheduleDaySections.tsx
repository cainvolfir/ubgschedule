import { motion } from 'framer-motion';
import { Clock, MapPin, UserCircle, PencilSimple, Trash, Warning } from '@phosphor-icons/react';
import { byStartTime } from '../utils/collision';
import { dayLabel, type UnifiedRow } from '../utils/hari';

/**
 * The schedule body of the result step: one section per day group, one card per
 * row.
 *
 * It is deliberately hook-free so the node suite can invoke it directly and walk
 * the produced element tree, the same way AutoClassCard is checked. That matters
 * here because the fault it replaced was structural: the page walked the seven
 * canonical day names and looked each up in a group map, so a row whose day was
 * empty or unrecognised matched no key and was NEVER drawn. The schedule stopped
 * under its own heading with nothing on screen to say a row had gone missing.
 *
 * `days` is the input that cannot make that mistake: it is built from the rows
 * themselves, so every row in it is a section that gets rendered.
 */

export interface UnifiedClass extends UnifiedRow {
  id: string; kode: string; nama: string; kelas: string; keterangan: string; sks: string;
  hari: string; jam: string; ruang: string; dosen: string; isPraktikum: boolean;
}

export interface DayGroup {
  hari: string;
  items: UnifiedClass[];
}

interface Props {
  days: DayGroup[];
  collisions: Set<string>;
  onEdit: (item: UnifiedClass) => void;
  onDelete: (item: UnifiedClass) => void;
}

export default function ScheduleDaySections({ days, collisions, onEdit, onDelete }: Props) {
  return (
    <>
      {days.map((day) => {
        const items = day.items;
        if (items.length === 0) return null;
        const label = dayLabel(day.hari);
        return (
          <section key={day.hari} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-black rounded-none" />
              <h2 className="text-2xl font-black uppercase tracking-wide">{label}</h2>
              <div className="h-1 bg-black rounded-none opacity-10" />
            </div>
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...items].sort(byStartTime).map((c) => {
                const isCollided = collisions.has(c.id);
                const cardBg = isCollided ? 'bg-[#FFD13B]' : c.isPraktikum ? 'bg-secondary' : 'bg-white';
                return (
                  <motion.div key={c.id} className={"relative border-2 border-black rounded-none p-5 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-brutal transition-transform group " + cardBg}>
                    {isCollided && (
                      <motion.div
                        className="absolute -top-4 -right-2 bg-error text-white border-2 border-black px-3 py-1 font-black text-sm rounded-none shadow-brutal-sm flex items-center gap-1 z-10"
                        animate={{ x: [-3, 3, -3, 3, 0] }}
                        transition={{ duration: 0.25, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Warning weight="bold" /> Bentrok!
                      </motion.div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 flex-wrap">
                        <span className={(c.isPraktikum ? 'bg-white text-black' : 'bg-tertiary text-white') + " px-2 py-0.5 text-xs font-extrabold border-2 border-black rounded-none uppercase"}>{c.kode}</span>
                        <span className="bg-black text-white px-2 py-0.5 text-xs font-extrabold rounded-none">{c.sks} SKS</span>
                        {c.isPraktikum ? (
                          <span className="bg-black text-white px-2 py-0.5 text-xs font-extrabold rounded-none uppercase">Praktikum</span>
                        ) : (
                          <span className="bg-blue-100 text-black px-2 py-0.5 text-xs font-extrabold border-2 border-black rounded-none uppercase">Teori</span>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 shrink-0">
                        <button className="w-8 h-8 flex items-center justify-center bg-[#DBEAFE] border-2 border-black rounded-none hover:bg-tertiary hover:text-white transition-colors" onClick={() => onEdit(c)}><PencilSimple weight="bold" /></button>
                        <button className="w-8 h-8 flex items-center justify-center bg-red-100 border-2 border-black rounded-none hover:bg-error hover:text-white transition-colors" onClick={() => onDelete(c)}><Trash weight="bold" /></button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black leading-tight mb-4 uppercase">{c.nama}</h3>
                    <div className={"space-y-2 text-sm font-bold border-2 border-black rounded-none p-3 " + (isCollided ? 'bg-white/70' : c.isPraktikum ? 'bg-white/70 backdrop-blur-sm' : 'bg-background')}>
                      <div className="flex items-center gap-2"><Clock weight="bold" className={"text-lg " + (isCollided ? 'text-error' : '')} /> {c.jam}</div>
                      <div className="flex items-center gap-2"><MapPin weight="bold" className="text-lg text-tertiary" /> {c.ruang}</div>
                      <div className="flex items-center gap-2 truncate"><UserCircle weight="bold" className="text-lg text-tertiary" /> {c.dosen}</div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        );
      })}
    </>
  );
}
