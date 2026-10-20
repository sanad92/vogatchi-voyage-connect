import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Scrollable, sticky-header container for platform tables (keeps horizontal scrollbar on screen). */
export const PLATFORM_TABLE_CONTAINER =
  'max-h-[calc(100vh-300px)] min-h-[240px] overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card [&_thead]:shadow-sm';

export const PAGE_SIZE = 15;

export function paginate<T>(rows: T[], page: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  return { pageRows: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), pageCount, current };
}

interface Props {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
}

export const TablePager = ({ page, pageCount, total, onChange }: Props) => {
  if (total <= PAGE_SIZE) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        {from.toLocaleString('ar-EG')}–{to.toLocaleString('ar-EG')} من {total.toLocaleString('ar-EG')}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="السابق">
          <ChevronRight className="h-4 w-4" /> السابق
        </Button>
        <span className="text-muted-foreground">صفحة {page} / {pageCount}</span>
        <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="التالي">
          التالي <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
