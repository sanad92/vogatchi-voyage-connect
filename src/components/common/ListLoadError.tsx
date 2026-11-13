import { Button } from '@/components/ui/button';

export function ListLoadError({ message, retry, pending }: {
  message: string;
  retry: () => void;
  pending?: boolean;
}) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 p-5 text-sm">
      <span className="text-destructive">{message}</span>
      <Button type="button" variant="outline" size="sm" onClick={retry} disabled={pending}>
        {pending ? 'جارٍ التحميل…' : 'إعادة المحاولة'}
      </Button>
    </div>
  );
}
