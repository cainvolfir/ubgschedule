import { useState } from 'react';
import { BookOpen, CaretDown, ArrowSquareOut } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstructionAccordion() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="w-full">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-4 border-2 border-black bg-primary text-black font-extrabold rounded-none text-left transition-all hover:bg-yellow-300"
      >
        <BookOpen size={24} weight="bold" className="shrink-0" />
        <div className="flex-1">
          <p className="text-sm md:text-base leading-tight">
            Panduan Langkah Demi Langkah — Cara Mendapatkan Jadwal &amp; Kode MK
          </p>
        </div>
        <span className="text-xs font-black bg-black text-white px-2 py-1 border-2 border-black rounded-none shrink-0">
          10 Langkah
        </span>
        <CaretDown
          size={20}
          weight="bold"
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ol className="p-4 space-y-3 bg-white border-2 border-black border-t-0 rounded-none">
              {/* Step 1 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  1
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Buka Portal Labkom</span> —{' '}
                  <a
                    href="https://labkom.ubg.ac.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-tertiary underline underline-offset-2 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    https://labkom.ubg.ac.id
                    <ArrowSquareOut size={12} weight="bold" />
                  </a>
                </div>
              </li>

              {/* Step 2 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  2
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Atur Filter Jadwal</span> — Kosongkan Semester dan
                  Kelas, biarkan Tipe Perkuliahan &apos;Semua (Teori dan Lab)&apos;.
                </div>
              </li>

              {/* Step 3 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  3
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Toggle &apos;SEMUA HARI&apos; &amp; Unduh</span>{' '}
                  — Aktifkan toggle SEMUA HARI lalu unduh file Excel (.xlsx).
                </div>
              </li>

              {/* Step 4 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  4
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Unggah File Jadwal</span> — Masukkan file Excel
                  tadi ke drop zone di halaman ini.
                </div>
              </li>

              {/* Step 5 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  5
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Pasang Ekstensi Tampermonkey</span> — Link ke
                  Chrome Web Store dan Firefox Add-ons:{' '}
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    <a
                      href="https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-tertiary underline underline-offset-2 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      Chrome Web Store
                      <ArrowSquareOut size={12} weight="bold" />
                    </a>
                    <a
                      href="https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-tertiary underline underline-offset-2 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      Firefox Add-ons
                      <ArrowSquareOut size={12} weight="bold" />
                    </a>
                  </span>
                </div>
              </li>

              {/* Step 6 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  6
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Pasang Userscript KRS</span> — Klik link
                  instalasi userscript UBG KRS Helper
                  <a
                    href="#"
                    className="font-black bg-secondary text-black px-2 py-0.5 border-2 border-black rounded-none text-xs inline-flex items-center gap-1 ml-1 align-middle"
                  >
                    Userscript <ArrowSquareOut size={10} weight="bold" />
                  </a>
                </div>
              </li>

              {/* Step 7 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  7
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Buka Portal SISKA</span> — Masuk ke{' '}
                  <a
                    href="https://siska.ubg.ac.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-tertiary underline underline-offset-2 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    siska.ubg.ac.id
                    <ArrowSquareOut size={12} weight="bold" />
                  </a>{' '}
                  lalu buka menu Kartu Rencana Studi (KRS).
                </div>
              </li>

              {/* Step 8 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  8
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Salin Kode MK Otomatis</span> — Di halaman KRS
                  SISKA, klik tombol &apos;Salin Semua Kode MK&apos; yang dibuat oleh userscript.
                </div>
              </li>

              {/* Step 9 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  9
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Tempel Kode MK</span> — Paste daftar kode MK ke
                  dalam textarea input di sebelah kanan, lalu klik &apos;Parse Kode&apos;.
                </div>
              </li>

              {/* Step 10 */}
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                  10
                </span>
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="font-extrabold">Pilih Kelas &amp; Selesai</span> — Klik tombol
                  &apos;Pilih Kelas&apos; untuk menentukan kelas (global atau per matkul) dan jadwal
                  siap digunakan!
                </div>
              </li>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
