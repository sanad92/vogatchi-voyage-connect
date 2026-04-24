import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  total_debit: number;
  total_credit: number;
  status: string;
  created_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  line_order: number;
  account?: { account_code: string; account_name: string; account_name_ar: string | null };
}

export const useJournalEntries = (limit = 100) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['journal-entries', orgId, limit],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('organization_id', orgId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as JournalEntry[];
    },
    enabled: !!orgId,
  });
};

export const useJournalEntryLines = (entryId: string | null) => {
  return useQuery({
    queryKey: ['journal-entry-lines', entryId],
    queryFn: async () => {
      if (!entryId) return [];
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select('*, account:chart_of_accounts(account_code, account_name, account_name_ar)')
        .eq('journal_entry_id', entryId)
        .order('line_order');
      if (error) throw error;
      return (data || []) as JournalEntryLine[];
    },
    enabled: !!entryId,
  });
};
