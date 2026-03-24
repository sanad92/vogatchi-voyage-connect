import { useState, useMemo, useCallback } from 'react';

/**
 * Client-side pagination for pre-fetched/filtered data arrays.
 * Use when data is already loaded and filtered client-side.
 */
export const useClientPagination = <T,>(items: T[], initialPageSize = 25) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Reset to page 1 when items change significantly
  const safePageVal = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePageVal - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePageVal, pageSize]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPage(1);
  }, []);

  const pagination = {
    page: safePageVal,
    pageSize,
    totalCount,
    totalPages,
    from: totalCount === 0 ? 0 : (safePageVal - 1) * pageSize + 1,
    to: Math.min(safePageVal * pageSize, totalCount),
    setPage,
    setPageSize,
    setTotalCount: () => {},
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
    hasNextPage: safePageVal < totalPages,
    hasPrevPage: safePageVal > 1,
    rangeFrom: (safePageVal - 1) * pageSize,
    rangeTo: safePageVal * pageSize - 1,
  };

  return { paginatedItems, pagination };
};
