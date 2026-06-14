import { useCallback, useState } from 'react';
import { Copy, Check, FileText, Table } from 'lucide-react';
import { Button } from '../../components/ui/pixelact-ui/button';
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
    <div className="flex items-center gap-1.5">
      <Button
        variant="secondary"
        onClick={() => handleCopy('text')}
        className="pixel-font text-[9px] gap-1.5"
        title="Copy as plain text"
      >
        {copied ? <Check size={12} /> : <FileText size={12} />}
        Copy Text
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleCopy('markdown')}
        className="pixel-font text-[9px] gap-1.5"
        title="Copy as markdown table"
      >
        {copied ? <Check size={12} /> : <Table size={12} />}
        Copy MD
      </Button>
    </div>
  );
}

export default ExportCopy;
