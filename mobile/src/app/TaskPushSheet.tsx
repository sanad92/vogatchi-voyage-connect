import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { erp } from './erp';
import { uuid } from './taskPush';

async function findTask(id: string, userId: string, signal: AbortSignal) {
  const inbox = await erp.from('notifications').select('organization_id, action_url')
    .eq('id', id).eq('user_id', userId).abortSignal(signal).maybeSingle();
  if (inbox.error) throw inbox.error;
  if (!inbox.data?.organization_id || !inbox.data.action_url) return null;
  const path = /^\/bookings\/([0-9a-f-]{36})\?tab=tasks&task=([0-9a-f-]{36})$/i.exec(inbox.data.action_url);
  if (!path || !uuid.test(path[1]) || !uuid.test(path[2])) return null;
  const task = await erp.from('booking_tasks').select('title, description, due_at')
    .eq('id', path[2]).eq('booking_id', path[1]).eq('organization_id', inbox.data.organization_id)
    .eq('assignee_id', userId).abortSignal(signal).maybeSingle();
  if (task.error) throw task.error;
  return task.data;
}

export function TaskPushSheet({ id, userId, close }: { id: string; userId: string; close: () => void }) {
  const task = useQuery({
    queryKey: ['mobile-assigned-task', userId, id],
    queryFn: ({ signal }) => findTask(id, userId, signal),
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
          {task.isPending ? <p role="status">جارٍ تحميل المهمة…</p> :
            task.isError ? <p role="alert">تعذّر تحميل المهمة.</p> :
            !task.data ? <p role="status">المهمة غير متاحة لهذا الحساب.</p> : (
              <dl>
                <div><dt>العنوان</dt><dd dir="auto">{task.data.title}</dd></div>
                {task.data.description && <div><dt>التفاصيل</dt><dd dir="auto">{task.data.description}</dd></div>}
                {task.data.due_at && <div><dt>الموعد</dt>
                  <dd>{new Intl.DateTimeFormat('ar-EG', {
                    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
                  }).format(new Date(task.data.due_at))}</dd>
                </div>}
              </dl>
            )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
