import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

const db = supabase as any;

export interface EmailAccount {
  id: string; organization_id: string; provider: string; email_address: string; display_name: string | null;
  imap_host: string; imap_port: number; smtp_host: string; smtp_port: number; username: string;
  is_active: boolean; last_synced_at: string | null; sync_error: string | null;
}
export interface EmailThread {
  id: string; account_id: string; subject: string | null; contact_email: string; contact_name: string | null;
  customer_id: string | null; assigned_to: string | null; status: 'open' | 'closed';
  last_message_at: string; last_inbound_at: string | null; last_read_at: string | null; marked_unread: boolean; snippet: string | null;
}
export interface EmailMessage {
  id: string; thread_id: string; direction: 'inbound' | 'outbound'; from_email: string | null; from_name: string | null;
  to_emails: string[]; cc_emails: string[]; subject: string | null; body_text: string | null; body_html: string | null; sent_at: string;
  email_attachments?: { id: string; file_name: string; mime_type: string | null; size_bytes: number | null; storage_path: string }[];
}

export const isThreadUnread = (t: EmailThread) =>
  t.marked_unread || (!!t.last_inbound_at && (!t.last_read_at || t.last_inbound_at > t.last_read_at));

export function useEmailAccounts() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['email-accounts', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<EmailAccount[]> => {
      const { data, error } = await db.from('email_accounts_public').select('*').eq('organization_id', orgId).order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEmailThreads() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const timer = useRef<number>();
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase.channel(`email-threads:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_threads', filter: `organization_id=eq.${orgId}` }, () => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => qc.invalidateQueries({ queryKey: ['email-threads', orgId] }), 1500);
      }).subscribe();
    return () => { window.clearTimeout(timer.current); supabase.removeChannel(ch); };
  }, [orgId, qc]);
  return useQuery({
    queryKey: ['email-threads', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<EmailThread[]> => {
      const rows: EmailThread[] = [];
      const PAGE = 1000;
      for (let from = 0; from < 20000; from += PAGE) {
        const { data, error } = await db.from('email_threads').select('*').eq('organization_id', orgId)
          .order('last_message_at', { ascending: false }).order('id').range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },
  });
}

export function useEmailMessages(threadId: string | null) {
  return useQuery({
    queryKey: ['email-messages', threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<EmailMessage[]> => {
      const { data, error } = await db.from('email_messages')
        .select('id, thread_id, direction, from_email, from_name, to_emails, cc_emails, subject, body_text, body_html, sent_at, email_attachments(id, file_name, mime_type, size_bytes, storage_path)')
        .eq('thread_id', threadId).order('sent_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function invokeEmailFn(name: string, body: unknown) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try { const t = await (error as any).context?.json?.(); if (t?.error) msg = t.error; } catch { /* keep */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
