import { Bot } from 'lucide-react';
import { botMayReply } from '../../../supabase/functions/_shared/whatsapp-bot-policy';

type Conversation = Parameters<typeof botMayReply>[0];

function pauseExplanation(conversation: Conversation): string {
  if (['closed', 'resolved', 'archived'].includes(conversation.status || '')) {
    return 'المحادثة منتهية. إذا أرسل العميل رسالة جديدة، تعود المحادثة إلى طابور الموظفين للمتابعة.';
  }
  if (conversation.assigned_to) {
    return 'المحادثة مسندة لموظف؛ يتولى الموظف الرد ومتابعة طلب العميل.';
  }
  switch (conversation.assignment_reason) {
    case 'chatbot_handoff':
      return 'طلب العميل التحدث إلى موظف. المحادثة تنتظر الاستلام من الطابور.';
    case 'chatbot_max_replies':
      return 'وصلت المحادثة إلى الحد الأقصى من ردود البوت. يلزم استلامها من الطابور لمتابعة الطلب.';
    case 'chatbot_error':
      return 'تعذر إكمال الرد الآلي، وأُحيلت المحادثة للمتابعة البشرية. يلزم استلامها من الطابور.';
    case 'chatbot_intake_complete':
      return 'اكتمل جمع طلب العميل. يلزم استلام المحادثة ومراجعة ملخص الطلب قبل المتابعة.';
    case 'human_queue':
    case 'manual_pickup':
    case 'manual_assignment':
      return 'المحادثة مخصصة للمتابعة البشرية. تغيير حالتها إلى «مفتوحة» وحده لا يلغي إحالتها للموظفين.';
    default:
      return 'المحادثة بانتظار متابعة بشرية. يلزم استلامها من الطابور للرد على العميل.';
  }
}

// The shared runtime policy determines whether to show a pause. A conversation
// allowed by that policy is not labelled "bot active": settings and the provider
// messaging window still apply, and cannot be established from this row alone.
export function ConversationBotNotice({ conversation }: { conversation: Conversation }) {
  if (botMayReply(conversation)) return null;

  return (
    <div role="status" dir="rtl" className="shrink-0 border-b bg-muted/50 px-4 py-2.5 flex items-start gap-2">
      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5 text-sm">
        <p className="font-medium">الرد الآلي متوقف في هذه المحادثة</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{pauseExplanation(conversation)}</p>
      </div>
    </div>
  );
}
