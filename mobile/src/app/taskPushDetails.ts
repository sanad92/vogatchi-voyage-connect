import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@safar-db';

export const taskPushUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

type TaskPushDetails =
  | { state: 'completed' | 'cancelled' }
  | { state: 'active'; title: string; description: string | null; dueAt: string | null };

export async function findTaskPushDetails(
  client: SupabaseClient<Database>, id: string, userId: string, signal: AbortSignal,
): Promise<TaskPushDetails | null> {
  const inbox = await client.from('notifications').select('organization_id, action_url')
    .eq('id', id).eq('user_id', userId).abortSignal(signal).maybeSingle();
  if (inbox.error) throw inbox.error;
  if (!inbox.data?.organization_id || !inbox.data.action_url) return null;

  const path = /^\/bookings\/([0-9a-f-]{36})\?tab=tasks&task=([0-9a-f-]{36})$/i.exec(inbox.data.action_url);
  if (!path || !taskPushUuid.test(path[1]) || !taskPushUuid.test(path[2])) return null;

  const task = await client.from('booking_tasks').select('status, title, description, due_at')
    .eq('id', path[2]).eq('booking_id', path[1]).eq('organization_id', inbox.data.organization_id)
    .eq('assignee_id', userId).abortSignal(signal).maybeSingle();
  if (task.error) throw task.error;
  if (!task.data) return null;

  switch (task.data.status) {
    case 'done':
    case 'completed':
      return { state: 'completed' };
    case 'cancelled':
    case 'canceled':
      return { state: 'cancelled' };
    default:
      return { state: 'active', title: task.data.title, description: task.data.description, dueAt: task.data.due_at };
  }
}
