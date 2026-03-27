import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'مسودة', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'تم الإرسال', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  accepted: { label: 'مقبول', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'مرفوض', className: 'bg-destructive/10 text-destructive' },
  expired: { label: 'منتهي', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
};

export default function QuoteStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
