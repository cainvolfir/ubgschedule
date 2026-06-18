import { useCallback, useState } from 'react';
import { Check, FileText, Table } from 'lucide-react';
import { useToast } from '../../components/Toast';

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

interface ExportCopyProps {
  dayGroups: DayGroup[];
  merged: FinalRow[];
}

function scheduleToPlainText(dayGroups: DayGroup[]): string {
  const lines: string[] = [];
  lines.push('═'.repeat(40));
  lines.push('  📅 JADWAL PERKULIAHAN');
  lines.push('═'.repeat(40));
  lines.push('');

  for (const group of dayGroups) {
    lines.push(`📌 ${group.hari.toUpperCase()}`);
    lines.push('─'.repeat(35));
    for (const row of group.rows) {
      lines.push(`  📚 ${row.MataKuliah}`);
      lines.push(`     Waktu : ${row.Jam}`);
      lines.push(`     Ruang : ${row.Ruang || '-'}`);
      lines.push(`     Dosen : ${row.DosenPengampuh || '-'}`);
      lines.push(`     SKS   : ${row.SKS}`);
      lines.push('');
    }
  }

  const totalSKS = dayGroups
    .flatMap((g) => g.rows)
    .reduce((s, r) => s + (parseInt(r.SKS) || 0), 0);
  lines.push('═'.repeat(40));
  lines.push(`  Total: ${dayGroups.flatMap((g) => g.rows).length} kelas, ${totalSKS} SKS`);
  lines.push('═'.repeat(40));

  return lines.join('\n');
}

function scheduleToMarkdown(dayGroups: DayGroup[]): string {
  const lines: string[] = [];
  lines.push('# 📅 Jadwal Perkuliahan');
  lines.push('');

  for (const group of dayGroups) {
    lines.push(`## 📌 ${group.hari}`);
    lines.push('');
    lines.push('| Waktu | Mata Kuliah | Dosen | Ruang | SKS |');
    lines.push('|-------|-------------|-------|-------|-----|');
    for (const row of group.rows) {
      lines.push(
        `| ${row.Jam} | ${row.MataKuliah} | ${row.DosenPengampuh || '-'} | ${row.Ruang || '-'} | ${row.SKS} |`,
      );
    }
    lines.push('');
  }

  const totalSKS = dayGroups
    .flatMap((g) => g.rows)
    .reduce((s, r) => s + (parseInt(r.SKS) || 0), 0);
  lines.push(`**Total: ${dayGroups.flatMap((g) => g.rows).length} kelas, ${totalSKS} SKS**`);

  return lines.join('\n');
}

export function ExportCopy({ dayGroups }: ExportCopyProps) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleCopy = useCallback(
    async (format: 'text' | 'markdown') => {
      const content = format === 'text' ? scheduleToPlainText(dayGroups) : scheduleToMarkdown(dayGroups);
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        addToast({
          type: 'success',
          title: 'Copied!',
          message: `Schedule copied as ${format === 'text' ? 'plain text' : 'markdown table'}.`,
          duration: 2500,
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        addToast({
          type: 'error',
          title: 'Copy failed',
          message: 'Could not copy to clipboard. Try selecting and copying manually.',
          duration: 4000,
        });
      }
    },
    [dayGroups, addToast],
  );

  if (dayGroups.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleCopy('text')}
        className="terminal-btn-sm"
        title="Copy as plain text"
      >
        {copied ? <Check size={9} /> : <FileText size={9} />}
        <span>TXT</span>
      </button>
      <button
        onClick={() => handleCopy('markdown')}
        className="terminal-btn-sm"
        title="Copy as markdown table"
      >
        {copied ? <Check size={9} /> : <Table size={9} />}
        <span>MD</span>
      </button>
    </div>
  );
}

export default ExportCopy;
