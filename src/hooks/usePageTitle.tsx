import { useEffect } from 'react';

/**
 * Sets document.title to `${title} · Vogatchi` while a page is mounted.
 * Presentational only — no side effects on data.
 */
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · Vogatchi`;
    return () => {
      document.title = previous;
    };
  }, [title]);
};

export default usePageTitle;
