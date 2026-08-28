import { useEffect, useState } from 'react';

/** Global ⌘K / Ctrl+K listener. Returns the command palette open state. */
export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return [open, setOpen] as const;
};
