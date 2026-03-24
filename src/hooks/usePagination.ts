import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PaginationControls {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  rangeFrom: number;
  rangeTo: number;
}

export const usePagination = (initialPageSize = 25): PaginationControls => {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

  const setPage = useCallback((p: number) => {
    setPageRaw(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1);
  }, []);

  const nextPage = useCallback(() => {
    setPageRaw(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPageRaw(prev => Math.max(prev - 1, 1));
  }, []);

  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  const from = totalCount === 0 ? 0 : rangeFrom + 1;
  const to = Math.min(rangeFrom + pageSize, totalCount);

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    from,
    to,
    setPage,
    setPageSize,
    setTotalCount,
    nextPage,
    prevPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    rangeFrom,
    rangeTo,
  };
};
