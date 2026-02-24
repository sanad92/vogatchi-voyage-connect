
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BankAccount, BankAccountTransaction } from "@/types/currency";
import { useToast } from "@/hooks/use-toast";
import { useOrgId } from './useOrgId';

export const useBankAccounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('*').eq('is_active', true).order('currency', { ascending: true });
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!orgId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['bank-transactions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_account_transactions').select(`*, bank_accounts(account_name, currency)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const addBankAccountMutation = useMutation({
    mutationFn: async (newAccount: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('bank_accounts').insert([{ ...newAccount, organization_id: orgId }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }); toast({ title: "تم إضافة الحساب البنكي بنجاح" }); },
    onError: (error) => { toast({ title: "خطأ في إضافة الحساب البنكي", description: error.message, variant: "destructive" }); }
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { data: txns, error: txnError } = await supabase.from('bank_account_transactions').select('id').eq('bank_account_id', accountId).limit(1);
      if (txnError) throw txnError;
      if (txns && txns.length > 0) throw new Error('لا يمكن حذف الحساب لوجود معاملات مالية مرتبطة به');
      const { error } = await supabase.from('bank_accounts').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', accountId);
      if (error) throw error;
      return accountId;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }); toast({ title: "تم حذف الحساب البنكي بنجاح" }); },
    onError: (error) => { toast({ title: "خطأ في حذف الحساب البنكي", description: error.message, variant: "destructive" }); }
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<BankAccountTransaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('bank_account_transactions').insert({ ...transaction, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }); queryClient.invalidateQueries({ queryKey: ['bank-transactions'] }); toast({ title: "تم تسجيل الحركة البنكية بنجاح" }); }
  });

  const getAccountsByCurrency = (currency: string) => bankAccounts.filter(account => account.currency === currency);

  return {
    bankAccounts, transactions, isLoading,
    addBankAccount: addBankAccountMutation.mutate, deleteBankAccount: deleteBankAccountMutation.mutate,
    addTransaction: addTransactionMutation.mutate, getAccountsByCurrency,
    isAddingAccount: addBankAccountMutation.isPending, isDeletingAccount: deleteBankAccountMutation.isPending, isAddingTransaction: addTransactionMutation.isPending
  };
};
