import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import type { PaginationControls } from '@/hooks/usePagination';

interface PaginationControlsProps {
  pagination: PaginationControls;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
}

const PaginationControlsUI = ({
  pagination,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
}: PaginationControlsProps) => {
  const { page, totalPages, from, to, totalCount, pageSize, setPage, setPageSize, nextPage, prevPage, hasNextPage, hasPrevPage } = pagination;

  if (totalCount <= 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1">
      <div className="text-sm text-muted-foreground order-2 sm:order-1">
        عرض {from} - {to} من {totalCount}
      </div>

      <div className="flex items-center gap-2 order-1 sm:order-2">
        {showPageSize && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground hidden sm:inline">عدد الصفوف:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[65px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={!hasPrevPage}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevPage} disabled={!hasPrevPage}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="text-sm min-w-[80px] text-center">
            {page} / {totalPages}
          </span>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextPage} disabled={!hasNextPage}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={!hasNextPage}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaginationControlsUI;
