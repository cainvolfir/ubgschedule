import { X, FilePdf, FileXls, PaperPlaneTilt, ArrowRight, Question } from '@phosphor-icons/react';

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_#000000] w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-tertiary border-b-4 border-black p-4 flex justify-between items-center text-white">
          <h2 className="font-extrabold text-xl uppercase flex items-center gap-2">
            <Question weight="bold" className="text-2xl" />
            Pusat Bantuan
          </h2>
          <button onClick={onClose} className="bg-black text-white hover:bg-white hover:text-black border-2 border-transparent hover:border-black rounded-lg p-1 transition-colors">
            <X weight="bold" className="text-xl" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4">
          <a href="https://drive.google.com/drive/folders/1y-BktyEAzQEKGoNV_Dyy3nqyK437TFv1?usp=sharing" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-background border-3 border-black rounded-xl hover:bg-[#DBEAFE] hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000000] transition-all group">
            <div className="flex items-center gap-3">
              <div className="bg-tertiary text-white p-2 rounded-lg border-2 border-black">
                <FilePdf weight="bold" className="text-xl" />
              </div>
              <span className="font-bold text-black">Dapatkan File Jadwal Teori</span>
            </div>
            <ArrowRight weight="bold" className="text-xl opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 text-black" />
          </a>

          <a href="https://drive.google.com/drive/folders/1Ry1ml2bsC4ME8df6ppXmV21rRz3Jjvmv?usp=sharing" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-background border-3 border-black rounded-xl hover:bg-[#DBEAFE] hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000000] transition-all group">
            <div className="flex items-center gap-3">
              <div className="bg-white text-black p-2 rounded-lg border-2 border-black">
                <FileXls weight="bold" className="text-xl" />
              </div>
              <span className="font-bold text-black">Dapatkan File Jadwal Praktikum</span>
            </div>
            <ArrowRight weight="bold" className="text-xl opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 text-black" />
          </a>

          <div className="w-full h-1 bg-black rounded-full" />

          <a href="https://wa.me/62895383507673" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-error text-white border-3 border-black rounded-xl hover:bg-rose-600 hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000000] transition-all group">
            <div className="flex items-center gap-3">
              <div className="bg-white text-black p-2 rounded-lg border-2 border-black">
                <PaperPlaneTilt weight="bold" className="text-xl" />
              </div>
              <span className="font-bold">Hubungi Pengembang</span>
            </div>
            <ArrowRight weight="bold" className="text-xl opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </div>
  );
}
