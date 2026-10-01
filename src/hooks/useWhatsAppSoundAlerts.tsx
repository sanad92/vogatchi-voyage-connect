import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { playAlertSound, getActiveConversation } from '@/lib/soundAlerts';

/**
 * Plays an alert sound whenever a customer message arrives, from any screen.
 * Mounted once at the dashboard layout level.
 */
export const useWhatsAppSoundAlerts = () => {
  const orgId = useOrgId();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`whatsapp-inbound-sound:${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `organization_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as { id?: string; direction?: string; conversation_id?: string; organization_id?: string } | null;
          if (!row?.id || row.direction !== 'inbound') return;
          if (row.organization_id && row.organization_id !== orgId) return;
          if (seen.current.has(row.id)) return;
          const onScreen = getActiveConversation()
            || window.location.pathname.match(/\/whatsapp-inbox\/([^/?#]+)/)?.[1];
          if (row.conversation_id && row.conversation_id === onScreen && document.visibilityState === 'visible') return;
          seen.current.add(row.id);
          if (seen.current.size > 200) seen.current = new Set([row.id]);
          playAlertSound('message');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);
};
