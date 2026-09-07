import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export interface BaselineHistoryEntry {
  id: string;
  action: 'set' | 'update' | 'clear' | 'correction';
  old_balance: number | null;
  old_balance_date: string | null;
  new_balance: number | null;
  new_balance_date: string | null;
  note: string | null;
  reason: string | null;
  changed_at: string;
  changed_by_name: string | null;
}

export interface BankBaseline {
  bank_account_id: string;
  currency: string | null;
  is_set: boolean;
  opening_balance: number | null;
  opening_balance_date: string | null;
  note: string | null;
  set_at: string | null;
  set_by_name: string | null;
  locked: boolean;
  can_manage: boolean;
  can_correct: boolean;
  history: BaselineHistoryEntry[];
}

export interface SetBaselineInput {
  balance: number | null;
  balanceDate: string | null;
  note: string;
  reason?: string;
  forceCorrection?: boolean;
}

export const useBankBaseline = (accountId: string) => {
  const qc = useQueryClient();
  const queryKey = ['bank-account-baseline', accountId] as const;

  const baseline = useQuery({
    queryKey,
    enabled: Boolean(accountId),
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<BankBaseline>('get_bank_account_baseline', { _account: accountId });
      if (error) throw error;
      if (!data) throw new Error('تعذر تحميل بيانات الرصيد الافتتاحي');
      return data;
    },
  });

  const setBaseline = useMutation({
    mutationFn: async (input: SetBaselineInput) => {
      const { data, error } = await callUntypedRpc<unknown>('set_bank_account_opening_baseline', {
        _account: accountId,
        _balance: input.balance,
        _balance_date: input.balanceDate,
        _note: input.note,
        _reason: input.reason ?? null,
        _force_correction: input.forceCorrection ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey }),
        qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
        qc.invalidateQueries({ queryKey: ['bank-reconciliation-workspace'] }),
      ]);
    },
  });

  return { baseline, setBaseline };
};
