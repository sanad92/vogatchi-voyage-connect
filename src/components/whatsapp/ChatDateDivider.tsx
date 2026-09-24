import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';

export const dayKeyOf = (value: string) => format(new Date(value), 'yyyy-MM-dd');

export const dayLabelOf = (value: string) => {
  const date = new Date(value);
  if (isToday(date)) return 'اليوم';
  if (isYesterday(date)) return 'أمس';
  return format(date, 'd MMMM yyyy', { locale: ar });
};

export const ChatDateDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-center py-2">
    <span className="rounded-full bg-card/80 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground border shadow-[var(--shadow-xs)]">
      {label}
    </span>
  </div>
);
