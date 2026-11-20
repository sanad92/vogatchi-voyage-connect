import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { safeCell } from '@/lib/spreadsheet-safe';

type Cell = string | number | boolean | null | undefined;
type Props = {
  title: string;
  scope: string[];
  columns: string[];
  loadRows: () => Promise<Cell[][]>;
  disabled?: boolean;
};

function printReport(preview: Window, title: string, scope: string[], columns: string[], rows: Cell[][]) {
  const { document } = preview;
  document.title = title;
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';

  const style = document.createElement('style');
  style.textContent = `
    @page { size: A4 landscape; margin: 12mm; }
    body { font: 12pt Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td { padding: 5pt; text-align: start; border: 1px solid #999; overflow-wrap: anywhere; }
  `;
  document.head.append(style);
  const heading = document.createElement('h1');
  heading.textContent = title;
  document.body.append(heading);
  for (const line of [...scope, `عدد السجلات: ${rows.length}`]) {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    document.body.append(paragraph);
  }
  const table = document.createElement('table');
  const header = table.createTHead().insertRow();
  for (const column of columns) {
    const cell = document.createElement('th');
    cell.textContent = column;
    header.append(cell);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    for (const value of row) tr.insertCell().textContent = value == null ? '' : String(value);
  }
  document.body.append(table);

  preview.opener = null;
  preview.focus();
  preview.print();
}

export default function ReportDownloadButtons({ title, scope, columns, loadRows, disabled }: Props) {
  const running = useRef(false);
  const mounted = useRef(false);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const exportReport = async (format: 'xlsx' | 'print') => {
    if (running.current || disabled) return;
    const preview = format === 'print' ? window.open('', '_blank') : null;
    if (format === 'print' && !preview) {
      toast.error('اسمح بالنوافذ المنبثقة لفتح معاينة الطباعة.');
      return;
    }

    running.current = true;
    setExporting(true);
    try {
      const rows = await loadRows();
      if (!mounted.current) {
        preview?.close();
        return;
      }
      if (rows.length === 0) {
        preview?.close();
        toast.info('لا توجد بيانات مطابقة للتصدير.');
        return;
      }

      if (preview) {
        if (!preview.closed) printReport(preview, title, scope, columns, rows);
      } else {
        const { utils, writeFile } = await import('xlsx');
        if (!mounted.current) return;
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, utils.aoa_to_sheet([columns, ...rows.map((row) => row.map(safeCell))]), 'البيانات');
        utils.book_append_sheet(workbook, utils.aoa_to_sheet([[title], ...scope.map((line) => [safeCell(line)]), ['عدد السجلات', rows.length]]), 'نطاق التقرير');
        writeFile(workbook, `${title}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      }
    } catch {
      preview?.close();
      if (mounted.current) toast.error('تعذر تجهيز التقرير. حاول مرة أخرى.');
    } finally {
      running.current = false;
      if (mounted.current) setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2" aria-busy={exporting}>
      <Button variant="outline" disabled={disabled || exporting} onClick={() => void exportReport('xlsx')}>
        <FileSpreadsheet className="h-4 w-4" /> تصدير Excel
      </Button>
      <Button variant="outline" disabled={disabled || exporting} onClick={() => void exportReport('print')}>
        <Printer className="h-4 w-4" /> طباعة أو حفظ PDF
      </Button>
    </div>
  );
}
