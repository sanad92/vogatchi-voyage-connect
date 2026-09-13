type QueueConversation = { assigned_to?: string | null; status?: string | null; assignment_reason?: string | null };
const isClosedConversation = (c: QueueConversation) => ['closed', 'resolved', 'archived'].includes(c.status || '');
export const botMayReply = (c: QueueConversation) => !c.assigned_to
  && !isClosedConversation(c) && c.status !== 'pending'
  && !c.assignment_reason?.startsWith('chatbot_')
  && !['human_queue', 'manual_pickup', 'manual_assignment'].includes(c.assignment_reason || '');
