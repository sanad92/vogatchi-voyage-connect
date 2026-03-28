import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { useCallback } from 'react';

export type AutomationTrigger = 'booking_created' | 'payment_confirmed' | 'before_travel' | 'booking_status_changed' | 'invoice_created' | 'customer_registered';

interface TriggerContext {
  bookingId?: string;
  bookingType?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  travelDate?: string;
  totalAmount?: number;
  customerId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  [key: string]: any;
}

export function useAutomationEngine() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const executeTrigger = useCallback(async (triggerType: AutomationTrigger, context: TriggerContext) => {
    if (!orgId) return;

    try {
      // Fetch active rules for this trigger
      const { data: rules, error: rulesErr } = await supabase
        .from('automation_rules')
        .select('*, automation_actions(*)')
        .eq('organization_id', orgId)
        .eq('trigger_type', triggerType)
        .eq('is_active', true);

      if (rulesErr || !rules?.length) return;

      for (const rule of rules) {
        const actions = (rule as any).automation_actions || [];
        const sortedActions = [...actions].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

        for (const action of sortedActions) {
          if (!action.is_active) continue;

          // Log the execution
          const { data: log } = await supabase
            .from('automation_logs')
            .insert({
              rule_id: rule.id,
              organization_id: orgId,
              trigger_type: triggerType,
              action_type: action.action_type,
              booking_id: context.bookingId,
              booking_type: context.bookingType,
              status: 'processing',
              metadata: { context, action_config: action.action_config },
            })
            .select()
            .single();

          try {
            await executeAction(action.action_type, action.action_config, context);

            if (log) {
              await supabase
                .from('automation_logs')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', log.id);
            }
          } catch (actionError: any) {
            if (log) {
              await supabase
                .from('automation_logs')
                .update({ status: 'failed', error_message: actionError.message, completed_at: new Date().toISOString() })
                .eq('id', log.id);
            }
            console.error(`Automation action failed: ${action.action_type}`, actionError);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['automation-logs', orgId] });
    } catch (error) {
      console.error('Automation engine error:', error);
    }
  }, [orgId, queryClient]);

  return { executeTrigger };
}

async function executeAction(
  actionType: string,
  config: Record<string, any>,
  context: TriggerContext,
) {
  switch (actionType) {
    case 'send_email':
      await executeEmailAction(config, context);
      break;
    case 'send_whatsapp':
      await executeWhatsAppAction(config, context);
      break;
    case 'create_invoice':
      await executeCreateInvoice(config, context);
      break;
    case 'send_reminder':
      await executeReminder(config, context);
      break;
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

async function executeEmailAction(config: Record<string, any>, context: TriggerContext) {
  if (!context.customerEmail) {
    throw new Error('No customer email available');
  }
  // Queue email
  const { error } = await supabase.from('email_queue').insert({
    email_type: config.template || 'booking_notification',
    recipient_email: context.customerEmail,
    recipient_name: context.customerName || '',
    subject: config.subject || `تأكيد الحجز - ${context.bookingType}`,
    template_data: {
      customer_name: context.customerName,
      booking_type: context.bookingType,
      booking_id: context.bookingId,
      travel_date: context.travelDate,
      total_amount: context.totalAmount,
      ...config.extra_data,
    },
    organization_id: context.organizationId || null,
  });
  if (error) throw error;
}

async function executeWhatsAppAction(config: Record<string, any>, context: TriggerContext) {
  if (!context.customerPhone) {
    throw new Error('No customer phone available');
  }
  // Use existing whatsapp edge function
  const message = config.message_template
    ? config.message_template
        .replace('{{customer_name}}', context.customerName || '')
        .replace('{{booking_type}}', context.bookingType || '')
        .replace('{{travel_date}}', context.travelDate || '')
        .replace('{{total_amount}}', String(context.totalAmount || ''))
    : `مرحباً ${context.customerName}، تم تسجيل حجزك بنجاح.`;

  const { error } = await supabase.functions.invoke('send-whatsapp', {
    body: {
      phone: context.customerPhone,
      message,
    },
  });
  if (error) throw error;
}

async function executeCreateInvoice(config: Record<string, any>, context: TriggerContext) {
  const { error } = await supabase.from('invoices').insert({
    booking_id: context.bookingId,
    booking_type: context.bookingType,
    customer_name: context.customerName || 'عميل',
    total_amount: context.totalAmount || 0,
    status: 'draft',
    organization_id: context.organizationId || null,
  });
  if (error) throw error;
}

async function executeReminder(config: Record<string, any>, context: TriggerContext) {
  // Queue a reminder email
  const daysBeforeTravel = config.days_before || 3;
  const scheduledDate = context.travelDate
    ? new Date(new Date(context.travelDate).getTime() - daysBeforeTravel * 86400000).toISOString()
    : new Date().toISOString();

  if (context.customerEmail) {
    const { error } = await supabase.from('email_queue').insert({
      email_type: 'travel_reminder',
      recipient_email: context.customerEmail,
      recipient_name: context.customerName || '',
      subject: config.subject || `تذكير بموعد سفرك`,
      template_data: {
        customer_name: context.customerName,
        booking_type: context.bookingType,
        travel_date: context.travelDate,
        days_before: daysBeforeTravel,
      },
      scheduled_for: scheduledDate,
      organization_id: context.organizationId || null,
    });
    if (error) throw error;
  }
}
