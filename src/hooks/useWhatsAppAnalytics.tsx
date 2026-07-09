import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { subDays, format, startOfDay } from 'date-fns';

export interface AnalyticsFilters {
  days?: number; // default 30
}

export const useWhatsAppAnalytics = (filters: AnalyticsFilters = {}) => {
  const orgId = useOrgId();
  const days = filters.days ?? 30;
  const since = subDays(new Date(), days).toISOString();

  return useQuery({
    queryKey: ['whatsapp-analytics', orgId, days],
    queryFn: async () => {
      if (!orgId) return null;
      const s = supabase as any;

      const [convRes, msgRes, brRes, autoRes, followRes] = await Promise.all([
        s.from('whatsapp_conversations')
          .select('id, status, priority, assigned_to, created_at, last_message_at, sla_breached_first_response, sla_breached_resolution')
          .eq('organization_id', orgId).gte('created_at', since),
        s.from('whatsapp_messages')
          .select('id, direction, status, sent_at, sent_by, conversation_id, message_type')
          .eq('organization_id', orgId).gte('sent_at', since).limit(10000),
        s.from('whatsapp_broadcasts')
          .select('id, name, status, total_recipients, sent_count, failed_count, created_at')
          .eq('organization_id', orgId).gte('created_at', since),
        s.from('whatsapp_automation_executions')
          .select('id, status, trigger_type, created_at')
          .eq('organization_id', orgId).gte('created_at', since),
        s.from('whatsapp_followups')
          .select('id, status, scheduled_at, completed_at')
          .eq('organization_id', orgId).gte('created_at', since),
      ]);

      const conversations = convRes.data || [];
      const messages = msgRes.data || [];
      const broadcasts = brRes.data || [];
      const automations = autoRes.data || [];
      const followups = followRes.data || [];

      // Time series (daily)
      const daysArr: { date: string; inbound: number; outbound: number; conversations: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
        daysArr.push({ date: d, inbound: 0, outbound: 0, conversations: 0 });
      }
      const dayMap = new Map(daysArr.map((d) => [d.date, d]));
      for (const m of messages) {
        const d = format(new Date(m.sent_at), 'yyyy-MM-dd');
        const row = dayMap.get(d);
        if (row) {
          if (m.direction === 'inbound') row.inbound++; else row.outbound++;
        }
      }
      for (const c of conversations) {
        const d = format(new Date(c.created_at), 'yyyy-MM-dd');
        const row = dayMap.get(d);
        if (row) row.conversations++;
      }

      // Status distribution
      const statusDist = ['active', 'pending', 'closed', 'transferred'].map((st) => ({
        name: st, value: conversations.filter((c: any) => c.status === st).length,
      }));

      // Priority distribution
      const priorityDist = ['low', 'normal', 'high', 'urgent'].map((p) => ({
        name: p, value: conversations.filter((c: any) => c.priority === p).length,
      }));

      // Peak hours (0-23)
      const peakHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
      for (const m of messages) {
        const h = new Date(m.sent_at).getHours();
        peakHours[h].count++;
      }

      // Agent leaderboard
      const agentMap = new Map<string, { sent: number; conversations: Set<string> }>();
      for (const m of messages.filter((x: any) => x.direction === 'outbound' && x.sent_by)) {
        const cur = agentMap.get(m.sent_by) || { sent: 0, conversations: new Set() };
        cur.sent++;
        cur.conversations.add(m.conversation_id);
        agentMap.set(m.sent_by, cur);
      }
      const agentIds = Array.from(agentMap.keys());
      let agentProfiles: any[] = [];
      if (agentIds.length) {
        const { data } = await s.from('profiles').select('id, full_name').in('id', agentIds);
        agentProfiles = data || [];
      }
      const leaderboard = agentIds.map((id) => {
        const p = agentProfiles.find((x) => x.id === id);
        const st = agentMap.get(id)!;
        return {
          agent_id: id,
          name: p?.full_name || id.slice(0, 8),
          messages_sent: st.sent,
          conversations_handled: st.conversations.size,
        };
      }).sort((a, b) => b.messages_sent - a.messages_sent);

      // KPIs
      const totalMsgs = messages.length;
      const inboundCount = messages.filter((m: any) => m.direction === 'inbound').length;
      const outboundCount = totalMsgs - inboundCount;
      const slaBreach = conversations.filter((c: any) =>
        c.sla_breached_first_response || c.sla_breached_resolution).length;
      const slaBreachRate = conversations.length ? (slaBreach / conversations.length) * 100 : 0;

      // Broadcast stats
      const broadcastStats = {
        total: broadcasts.length,
        total_recipients: broadcasts.reduce((s: number, b: any) => s + (b.total_recipients || 0), 0),
        sent: broadcasts.reduce((s: number, b: any) => s + (b.sent_count || 0), 0),
        failed: broadcasts.reduce((s: number, b: any) => s + (b.failed_count || 0), 0),
      };

      // Automation stats
      const autoStats = {
        total: automations.length,
        success: automations.filter((a: any) => a.status === 'success').length,
        failed: automations.filter((a: any) => a.status === 'failed').length,
        skipped: automations.filter((a: any) => a.status === 'skipped').length,
      };

      return {
        kpis: {
          total_conversations: conversations.length,
          active_conversations: conversations.filter((c: any) => c.status === 'active').length,
          total_messages: totalMsgs,
          inbound_messages: inboundCount,
          outbound_messages: outboundCount,
          sla_breach_count: slaBreach,
          sla_breach_rate: Math.round(slaBreachRate * 10) / 10,
          followups_pending: followups.filter((f: any) => f.status === 'pending').length,
        },
        timeSeries: daysArr,
        statusDist,
        priorityDist,
        peakHours,
        leaderboard,
        broadcastStats,
        autoStats,
        raw: { conversations, messages, broadcasts },
      };
    },
    enabled: !!orgId,
  });
};
