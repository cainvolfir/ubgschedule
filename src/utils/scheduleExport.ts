import { byStartTime } from './collision';
import { dayLabel } from './hari';

/**
 * The plain-text schedule the 'Salin Teks' button copies.
 *
 * Pure and separate from the component so the node suite can assert on the text
 * itself. It walks the SAME group list the page renders, so a group outside the
 * seven canonical days is copied under its own heading rather than being
 * silently absent from the export while it is visible on screen.
 */

export interface ExportRow {
  jam: string;
  nama: string;
  kelas: string;
  ruang: string;
  dosen: string;
  sks: string;
  isPraktikum: boolean;
}

export interface ExportDay<T extends ExportRow> {
  hari: string;
  items: T[];
}

export function scheduleTextLines<T extends ExportRow>(days: ExportDay<T>[]): string[] {
  const lines: string[] = ['JADWAL UBG SCHEDULE', '=================='];
  for (const day of days) {
    if (day.items.length === 0) continue;
    lines.push('', dayLabel(day.hari).toUpperCase());
    for (const c of [...day.items].sort(byStartTime)) {
      lines.push(
        '  ' + c.jam + ' | ' + c.nama + ' (' + c.kelas + ') | ' + c.ruang + ' | ' +
        c.dosen + ' | ' + c.sks + ' SKS' + (c.isPraktikum ? ' [Praktikum]' : '')
      );
    }
  }
  return lines;
}
