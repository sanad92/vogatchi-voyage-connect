import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Condition {
  field: string; // e.g. 'message.content', 'conversation.status', 'customer.tag'
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'not_equals' | 'in' | 'greater_than' | 'less_than';
  value: any;
}

interface Action {
  type: 'send_message' | 'send_template' | 'assign_to' | 'add_tag' | 'set_priority' | 'set_status' | 'create_followup' | 'notify_agent' | 'webhook';
  config: Record<string, any>;
}

interface Rule {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: Condition[];
  actions: Action[];
  priority: number;
}

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function evaluateCondition(cond: Condition, ctx: any): boolean {
  const actual = getNested(ctx, cond.field);
  const expected = cond.value;
  if (actual == null) return cond.operator === 'not_equals';
  const a = String(actual).toLowerCase();
  const e = String(expected ?? '').toLowerCase();
  switch (cond.operator) {
    case 'equals': return a === e;
    case 'not_equals': return a !== e;
    case 'contains': return a.includes(e);
    case 'starts_with': return a.startsWith(e);
    case 'ends_with': return a.endsWith(e);
    case 'regex': try { return new RegExp(expected, 'i').test(String(actual)); } catch { return false; }
    case 'in': return Array.isArray(expected) && expected.map(String).map(v => v.toLowerCase()).includes(a);
    case 'greater_than': return Number(actual) > Number(expected);
    case 'less_than': return Number(actual) < Number(expected);
    default: return false;
  }
}

function interpolate(template: string, ctx: any): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, p) => {
    const v = getNested(ctx, p);
    return v == null ? '' : String(v);
  });
}

async function executeAction(supabase: any, action: Action, ctx: any, rule: Rule): Promise<any> {
  switch (action.type) {
    case 'send_message': {
      const body = interpolate(action.config.message || '', ctx);
      if (!ctx.conversation?.phone_number) throw new Error('no phone_number in context');
      return await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: ctx.conversation.phone_number,
          message: body,
          organization_id: rule.organization_id,
          conversation_id: ctx.conversation?.id,
        },
      });
    }
    case 'send_template': {
      return await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: ctx.conversation.phone_number,
          template_id: action.config.template_id,
          organization_id: rule.organization_id,
          conversation_id: ctx.conversation?.id,
        },
      });
    }
    case 'assign_to': {
      return await supabase.from('whatsapp_conversations')
        .update({ assigned_to: action.config.user_id, auto_assigned: true, assignment_reason: `automation:${rule.name}` })
        .eq('id', ctx.conversation.id);
    }
    case 'set_priority': {
      return await supabase.from('whatsapp_conversations')
        .update({ priority: action.config.priority })
        .eq('id', ctx.conversation.id);
    }
    case 'set_status': {
      return await supabase.from('whatsapp_conversations')
        .update({ status: action.config.status })
        .eq('id', ctx.conversation.id);
    }
    case 'add_tag': {
      const { data: tag } = await supabase.from('conversation_tags')
        .select('id').eq('organization_id', rule.organization_id).eq('name', action.config.tag_name).maybeSingle();
      if (tag) {
        return await supabase.from('conversation_tag_assignments').insert({
          conversation_id: ctx.conversation.id, tag_id: tag.id,
        });
      }
      return { error: 'tag not found' };
    }
    case 'create_followup': {
      const scheduledAt = new Date(Date.now() + (action.config.minutes_from_now || 60) * 60000).toISOString();
      return await supabase.from('whatsapp_followups').insert({
        organization_id: rule.organization_id,
        conversation_id: ctx.conversation.id,
        title: interpolate(action.config.title || 'متابعة تلقائية', ctx),
        scheduled_at: scheduledAt,
        assigned_to: action.config.assigned_to || ctx.conversation.assigned_to,
      });
    }
    case 'notify_agent': {
      if (!ctx.conversation.assigned_to) return { skipped: true };
      return await supabase.from('notifications').insert({
        user_id: ctx.conversation.assigned_to,
        organization_id: rule.organization_id,
        type: 'whatsapp_automation',
        title: interpolate(action.config.title || 'تنبيه أتمتة', ctx),
        message: interpolate(action.config.message || '', ctx),
      });
    }
    case 'webhook': {
      if (!action.config.url) throw new Error('webhook url required');
      const res = await fetch(action.config.url, {
        method: action.config.method || 'POST',
        headers: { 'Content-Type': 'application/json', ...(action.config.headers || {}) },
        body: JSON.stringify({ rule: rule.name, context: ctx }),
      });
      return { status: res.status };
    }
    default:
      throw new Error(`unknown action: ${action.type}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { trigger_type, organization_id, conversation_id, message_id, extra } = await req.json();
    if (!trigger_type || !organization_id) {
      return new Response(JSON.stringify({ error: 'missing params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load matching rules
    const { data: rules } = await supabase
      .from('whatsapp_automation_rules_v2')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('trigger_type', trigger_type)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build execution context
    let conversation: any = null, message: any = null, customer: any = null;
    if (conversation_id) {
      const { data } = await supabase.from('whatsapp_conversations')
        .select('*, customer:customer_id(*)').eq('id', conversation_id).maybeSingle();
      conversation = data;
      customer = data?.customer;
    }
    if (message_id) {
      const { data } = await supabase.from('whatsapp_messages').select('*').eq('id', message_id).maybeSingle();
      message = data;
    }
    const ctx = { conversation, message, customer, extra: extra || {} };

    const executed: any[] = [];
    for (const rule of rules as Rule[]) {
      const start = Date.now();
      try {
        const conds = Array.isArray(rule.conditions) ? rule.conditions : [];
        const allMatch = conds.every((c) => evaluateCondition(c, ctx));
        if (!allMatch) {
          await supabase.from('whatsapp_automation_executions').insert({
            organization_id, rule_id: rule.id, conversation_id, message_id,
            trigger_type, status: 'skipped', execution_time_ms: Date.now() - start,
          });
          continue;
        }

        const results: any[] = [];
        for (const action of (rule.actions || [])) {
          try {
            const r = await executeAction(supabase, action, ctx, rule);
            results.push({ type: action.type, ok: !r?.error, error: r?.error?.message || null });
          } catch (e: any) {
            results.push({ type: action.type, ok: false, error: String(e?.message || e) });
          }
        }

        await supabase.from('whatsapp_automation_executions').insert({
          organization_id, rule_id: rule.id, conversation_id, message_id,
          trigger_type, status: 'success', actions_executed: results,
          execution_time_ms: Date.now() - start,
        });
        await supabase.from('whatsapp_automation_rules_v2').update({
          execution_count: (rule as any).execution_count + 1,
          last_executed_at: new Date().toISOString(),
        }).eq('id', rule.id);

        executed.push({ rule_id: rule.id, results });
      } catch (e: any) {
        await supabase.from('whatsapp_automation_executions').insert({
          organization_id, rule_id: rule.id, conversation_id, message_id,
          trigger_type, status: 'failed', error_message: String(e?.message || e),
          execution_time_ms: Date.now() - start,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, executed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
