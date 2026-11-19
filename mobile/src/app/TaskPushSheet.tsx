import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { erp } from './erp';
import { findTaskPushDetails } from './taskPushDetails';

export function TaskPushSheet({ id, userId, close }: { id: string; userId: string; close: () => void }) {
  const task = useQuery({
    queryKey: ['mobile-assigned-task', userId, id],
    queryFn: ({ signal }) => findTaskPushDetails(erp, id, userId, signal),
    gcTime: 0,
    refetchOnMount: 'always',
  });
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="sheet" aria-describedby={undefined}>
          <header className="sheet-heading">
            <Dialog.Title>المهمة</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="إغلاق"><X aria-hidden="true" /></Dialog.Close>
          </header>
          {task.isPending || task.isFetching ? <p role="status">جارٍ تحميل المهمة…</p> :
            task.isError ? <p role="alert">تعذّر تحميل المهمة.</p> :
            !task.data ? <p role="status">المهمة غير متاحة لهذا الحساب.</p> :
            task.data.state !== 'active' ? (
              <p role="status">{task.data.state === 'completed' ? 'تم إكمال هذه المهمة.' : 'أُلغيت هذه المهمة.'}</p>
            ) : (
              <dl>
                <div><dt>العنوان</dt><dd dir="auto">{task.data.title}</dd></div>
                {task.data.description && <div><dt>التفاصيل</dt><dd dir="auto">{task.data.description}</dd></div>}
                {task.data.dueAt && <div><dt>الموعد</dt>
                  <dd>{new Intl.DateTimeFormat('ar-EG', {
                    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
                  }).format(new Date(task.data.dueAt))}</dd>
                </div>}
              </dl>
            )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
