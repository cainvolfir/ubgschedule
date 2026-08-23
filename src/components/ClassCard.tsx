import { CalendarBlank, Clock, MapPin, BookOpen, UserCircle } from '@phosphor-icons/react';

export interface ClassDisplayItem {
  id: string;
  nama: string;
  kelas: string;
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
      className={`p-4 border-3 border-black rounded-xl flex gap-4 cursor-pointer select-none transition-all duration-150 ${
        isSelected
          ? 'bg-white shadow-[6px_6px_0px_#000000] -translate-y-1'
          : 'bg-white/50 shadow-[0px_0px_0px_#000000] hover:bg-white hover:shadow-[4px_4px_0px_#000000]'
      }`}
    >
      <div className="pt-1">
        <input
          type="checkbox"
          className="brutalist-checkbox"
          checked={isSelected}
          readOnly
          style={{ pointerEvents: 'none' }}
        />
      </div>
      <div className="flex-1 text-black">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <h4 className="font-extrabold text-lg leading-tight uppercase">{item.nama}</h4>
          <span className="bg-black text-white px-2 py-0.5 text-xs font-bold rounded-full">
            {item.kelas}
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
