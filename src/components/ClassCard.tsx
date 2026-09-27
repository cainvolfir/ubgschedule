import { CalendarBlank, Clock, MapPin, BookOpen, UserCircle } from '@phosphor-icons/react';

export interface ClassDisplayItem {
  id: string;
  nama: string;
  kelas: string;
  keterangan?: string;
  hari: string;
  jam: string;
  ruang: string;
  sks: string;
  dosen: string;
}

interface ClassCardProps {
  item: ClassDisplayItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export default function ClassCard({ item, isSelected, onToggle }: ClassCardProps) {
  return (
    <div
      onClick={() => onToggle(item.id)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle(item.id);
        }
      }}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      className={`p-4 border-2 border-black rounded-none flex gap-4 cursor-pointer select-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black ${
        isSelected
          ? 'bg-white shadow-brutal -translate-x-1 -translate-y-1 active:translate-x-0 active:translate-y-0 active:shadow-none'
          : 'bg-white/70 shadow-none translate-x-0 translate-y-0 hover:bg-white hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none'
      }`}
    >
      <div className="pt-1">
        <input
          type="checkbox"
          className="brutalist-checkbox rounded-none"
          checked={isSelected}
          readOnly
          style={{ pointerEvents: 'none' }}
        />
      </div>
      <div className="flex-1 text-black">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <h4 className="font-extrabold text-lg leading-tight uppercase">{item.nama}</h4>
          <span className="bg-black text-white px-2 py-0.5 text-xs font-bold rounded-none border-2 border-black">
            {item.kelas}{item.keterangan ? ` ${item.keterangan}` : ''}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm font-semibold mb-3">
          <div className="flex items-center gap-2">
            <CalendarBlank weight="bold" className="text-error" />
            {item.hari}
          </div>
          <div className="flex items-center gap-2">
            <Clock weight="bold" className="text-error" />
            {item.jam}
          </div>
          <div className="flex items-center gap-2">
            <MapPin weight="bold" className="text-tertiary" />
            {item.ruang}
          </div>
          <div className="flex items-center gap-2">
            <BookOpen weight="bold" className="text-tertiary" />
            {item.sks} SKS
          </div>
        </div>
        <div className="pt-2 border-t-2 border-dashed border-gray-400 text-sm font-bold text-gray-700 flex items-center gap-2">
          <UserCircle weight="fill" className="text-lg" />
          {item.dosen}
        </div>
      </div>
    </div>
  );
}
