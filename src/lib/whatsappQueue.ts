export type QueueConversation = {
  id: string; assigned_to?: string | null; status?: string | null;
  priority?: string | null; created_at?: string | null; assignment_reason?: string | null;
  last_inbound_at?: string | null;
};
export const isClosedConversation = (c: QueueConversation) => ['closed', 'resolved', 'archived'].includes(c.status || '');
// Queue = customers waiting for us: unassigned, open, and the customer has actually written to us.
// Campaign-only threads (we sent, no reply yet) stay out of the queue.
export const isQueuedConversation = (c: QueueConversation) =>
  !c.assigned_to && !isClosedConversation(c) && (c.last_inbound_at === undefined || !!c.last_inbound_at);
export function orderQueue<T extends QueueConversation>(rows: T[]): T[] {
  const priorities: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  return [...rows].sort((a, b) => (priorities[a.priority || 'normal'] ?? 2) - (priorities[b.priority || 'normal'] ?? 2)
    || (Date.parse(a.created_at || '') || 0) - (Date.parse(b.created_at || '') || 0) || a.id.localeCompare(b.id));
}
