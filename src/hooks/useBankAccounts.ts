
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BankAccount, BankAccountTransaction } from "@/types/currency";
import { useToast } from "@/hooks/use-toast";

export const useBankAccounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all bank accounts
  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('currency', { ascending: true });
      
      if (error) throw error;
      return data as BankAccount[];
    }
  });

  // Get bank account transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_account_transactions')
        .select(`
          *,
          bank_accounts(account_name, currency)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Add new bank account
  const addBankAccountMutation = useMutation({
    mutationFn: async (newAccount: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert([newAccount])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast({
        title: "تم إضافة الحساب البنكي بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة الحساب البنكي",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add transaction
  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<BankAccountTransaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('bank_account_transactions')
        .insert([transaction])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({
        title: "تم تسجيل الحركة البنكية بنجاح",
      });
    }
  });

  // Get accounts by currency
  const getAccountsByCurrency = (currency: string) => {
    return bankAccounts.filter(account => account.currency === currency);
  };

  return {
    bankAccounts,
    transactions,
    isLoading,
    addBankAccount: addBankAccountMutation.mutate,
    addTransaction: addTransactionMutation.mutate,
    getAccountsByCurrency,
    isAddingAccount: addBankAccountMutation.isPending,
    isAddingTransaction: addTransactionMutation.isPending
  };
};
