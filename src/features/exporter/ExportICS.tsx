import { useCallback } from 'react';
import { CalendarDays } from 'lucide-react';

interface FinalRow {
  Hari: string;
  MataKuliah: string;
  DosenPengampuh: string;
  SKS: string;
  Jam: string;
  Ruang: string;
  Keterangan: string;
}

interface DayGroup {
  hari: string;
  rows: FinalRow[];
}

interface ExportICSProps {
  dayGroups: DayGroup[];
  merged: FinalRow[];
  courseColors: Record<string, string>;
}

const HARI_TO_ICS: Record<string, string> = {
  Senin: 'MO',
  Selasa: 'TU',
  Rabu: 'WE',
  Kamis: 'TH',
  Jumat: 'FR',
  Sabtu: 'SA',
  Minggu: 'SU',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseTime(jam: string): { startH: number; startM: number; endH: number; endM: number } | null {
  const m = jam.match(/^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/);
  if (!m) return null;
  return { startH: parseInt(m[1]), startM: parseInt(m[2]), endH: parseInt(m[3]), endM: parseInt(m[4]) };
}

function getSemesterDates(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  // Rough semester boundaries:
  // Even semester (Feb-Jul), Odd semester (Aug-Jan)
  if (month >= 1 && month <= 6) {
    // Even semester: Feb 1 - Jul 31
    return {
      start: new Date(year, 1, 1),
      end: new Date(year, 6, 31),
    };
  } else {
    // Odd semester: Aug 1 - Jan 31 (next year)
    const endYear = month >= 7 ? year + 1 : year;
    return {
      start: new Date(year, 7, 1),
      end: new Date(endYear, 0, 31),
    };
  }
}

function getNextDayOccurrence(dayName: string, afterDate: Date): Date | null {
  const dayMap: Record<string, number> = {
    Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 0,
  };
  const targetDay = dayMap[dayName];
  if (targetDay === undefined) return null;

  const result = new Date(afterDate);
  const currentDay = result.getDay();
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd < 0) daysToAdd += 7;
  result.setDate(result.getDate() + daysToAdd);
  return result;
}

function formatDateICS(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function formatTimeICS(h: number, m: number): string {
  return `${pad(h)}${pad(m)}00`;
}

function toRFC5545DTSTART(date: Date, h: number, m: number): string {
  return `DTSTART:${formatDateICS(date)}T${formatTimeICS(h, m)}`;
}

function toRFC5545DTEND(date: Date, h: number, m: number): string {
  return `DTEND:${formatDateICS(date)}T${formatTimeICS(h, m)}`;
}

function generateUID(row: FinalRow, dayGroup: DayGroup): string {
  const hash = `${dayGroup.hari}-${row.MataKuliah}-${row.Jam}-${row.Ruang}`;
  let h = 0;
  for (let i = 0; i < hash.length; i++) {
    h = ((h << 5) - h + hash.charCodeAt(i)) | 0;
  }
  return `ubg-${Math.abs(h).toString(36)}@ubgschedule.app`;
}

function escapeICS(text: string): string {
  return text.replace(/[,;\\]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
}

export function ExportICS({ dayGroups, merged, courseColors }: ExportICSProps) {
  const handleExport = useCallback(() => {
    if (merged.length === 0) return;

    const { start, end } = getSemesterDates();
    const events: string[] = [];

    for (const group of dayGroups) {
      const icsDay = HARI_TO_ICS[group.hari];
      if (!icsDay) continue;

      for (const row of group.rows) {
        const time = parseTime(row.Jam);
        if (!time) continue;

        // Find the first occurrence of this day on or after semester start
        const firstOccurrence = getNextDayOccurrence(group.hari, start);
        if (!firstOccurrence) continue;

        const dtStart = toRFC5545DTSTART(firstOccurrence, time.startH, time.startM);
        const dtEnd = toRFC5545DTEND(firstOccurrence, time.endH, time.endM);

        const uid = generateUID(row, group);
        const now = new Date();
        const dtStamp = `DTSTAMP:${formatDateICS(now)}T${formatTimeICS(now.getHours(), now.getMinutes())}`;

        const summary = escapeICS(row.MataKuliah);
        const location = escapeICS(row.Ruang || '');
        const colorInfo = courseColors[row.MataKuliah]
          ? `Color: ${courseColors[row.MataKuliah]}`
          : '';
        const description = escapeICS(
          [
            row.DosenPengampuh ? `Dosen: ${row.DosenPengampuh}` : '',
            row.SKS ? `SKS: ${row.SKS}` : '',
            row.Keterangan && row.Keterangan !== '-' ? `Keterangan: ${row.Keterangan}` : '',
            colorInfo,
          ]
            .filter(Boolean)
            .join('\n'),
        );

        const until = `UNTIL=${formatDateICS(end)}T235959`;

        const event = [
          'BEGIN:VEVENT',
          uid,
          dtStamp,
          dtStart,
          dtEnd,
          `SUMMARY:${summary}`,
          location ? `LOCATION:${location}` : '',
          description ? `DESCRIPTION:${description}` : '',
          `RRULE:FREQ=WEEKLY;BYDAY=${icsDay};${until}`,
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n');

        events.push(event);
      }
    }

    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UBG Schedule//UBG Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:UBG Schedule',
      'X-WR-TIMEZONE:Asia/Jakarta',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jadwal-perkuliahan.ics';
    link.click();
    URL.revokeObjectURL(url);
  }, [dayGroups, merged]);

  if (merged.length === 0) return null;

  return (
    <button onClick={handleExport} className="terminal-btn-sm" title="Export as ICS calendar">
      <CalendarDays size={9} />
      <span>ICS</span>
    </button>
  );
}

export default ExportICS;
