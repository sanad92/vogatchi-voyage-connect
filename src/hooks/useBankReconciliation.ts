import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export type ReconciliationStatus = 'draft' | 'in_review' | 'reconciled' | 'closed';
export type LineStatus = 'unmatched' | 'partial' | 'matched' | 'ignored';
export type Direction = 'credit' | 'debit';
export interface BankReconciliationSession { id:string; organization_id:string; bank_account_id:string; account_name:string; bank_name:string; statement_start:string; statement_end:string; statement_opening_balance:number; statement_closing_balance:number; book_opening_balance:number; book_closing_balance_snapshot:number; currency:string; status:ReconciliationStatus; notes:string|null; line_count:number; matched_count:number; unresolved_count:number; created_at:string }
export interface BankStatementImportLine { transaction_date:string; value_date?:string; direction:Direction; amount:number; reference?:string; description?:string; external_id?:string; occurrence:number; row_number:number; raw_data:Record<string,string|number|null> }
export interface BankStatementLine { id:string; transaction_date:string; value_date:string|null; direction:Direction; amount:number; currency:string; reference:string|null; description:string|null; status:LineStatus; ignored_reason:string|null; import_row:number|null; matched_amount:number; match_count:number }
export interface BookTransaction { id:string; transaction_date:string; transaction_type:string; direction:Direction; amount:number; matched_amount:number; remaining_amount:number; description:string|null; reference_number:string|null; currency:string|null; source_type:string|null; source_id:string|null; created_at:string }
export interface ReconciliationMatch { id:string; statement_line_id:string; bank_transaction_id:string; journal_entry_id:string|null; matched_amount:number; match_type:'automatic'|'manual'|'adjustment'; confidence:number|null; notes:string|null; created_at:string; book_date:string; transaction_type:string; book_amount:number; book_reference:string|null; book_description:string|null }
export interface AdjustmentAccount { id:string; code:string; name:string; type:string }
export interface WorkspaceBaseline { is_first_session:boolean; is_set:boolean; opening_balance:number|null; opening_balance_date:string|null; note:string|null; set_at:string|null; set_by_name:string|null; locked:boolean; can_manage:boolean }
export interface BankReconciliationWorkspace { session:BankReconciliationSession; baseline:WorkspaceBaseline; summary:{ statement_movement:number; book_movement:number; current_book_closing_balance:number; difference:number; line_count:number; matched_count:number; ignored_count:number; unresolved_count:number }; lines:BankStatementLine[]; matches:ReconciliationMatch[]; book_transactions:BookTransaction[]; adjustment_accounts:AdjustmentAccount[] }


const rpc = async <T>(name:string, args:Record<string,unknown>) => { const { data, error } = await callUntypedRpc<T>(name,args); if (error) throw error; return data as T; };

export interface ReconciliationPermission { allowed:boolean; isLoading:boolean; isError:boolean; refetch:()=>void }

export function useBankReconciliation(accountId:string, sessionId:string) {
  const orgId=useOrgId(); const client=useQueryClient(); const { user }=useOptimizedAuth();
  const permissionQuery=useQuery({
    queryKey:['bank-reconciliation-can-manage',orgId,user?.id],
    enabled:Boolean(orgId&&user?.id),
    staleTime:30_000,
    gcTime:0,
    retry:false,
    refetchOnWindowFocus:true,
    queryFn:async()=>{
      const {data,error}=await callUntypedRpc<boolean>('_can_manage_bank_reconciliation',{_org:orgId});
      if(error)throw error;
      return data===true;
    },
  });
  const permissionPending=Boolean(orgId&&user?.id)&&(permissionQuery.isPending||permissionQuery.isFetching&&permissionQuery.data===undefined);
  const permission:ReconciliationPermission={
    allowed:!permissionPending&&!permissionQuery.isError&&permissionQuery.data===true,
    isLoading:!user||!orgId||permissionPending,
    isError:permissionQuery.isError,
    refetch:()=>{void permissionQuery.refetch();},
  };
  const sessionsKey=['bank-reconciliation-sessions',orgId,accountId]; const workspaceKey=['bank-reconciliation-workspace',sessionId];
  const accounts=useQuery({queryKey:['reconciliation-bank-accounts',orgId],enabled:!!orgId,queryFn:async()=>{const {data,error}=await supabase.from('bank_accounts').select('id,account_name,bank_name,account_number,currency,current_balance,treasury_kind,is_active').eq('organization_id',orgId!).eq('is_active',true).eq('treasury_kind','bank').order('account_name');if(error)throw error;return data||[];}});
  const sessions=useQuery({queryKey:sessionsKey,enabled:!!orgId&&!!accountId,queryFn:()=>rpc<BankReconciliationSession[]>('list_bank_reconciliation_sessions',{_org:orgId,_bank_account:accountId})});
  const workspace=useQuery({queryKey:workspaceKey,enabled:!!sessionId,queryFn:()=>rpc<BankReconciliationWorkspace>('get_bank_reconciliation_workspace',{_session:sessionId})});
  const refresh=async()=>{await Promise.all([client.invalidateQueries({queryKey:sessionsKey}),client.invalidateQueries({queryKey:workspaceKey}),client.invalidateQueries({queryKey:['reconciliation-bank-accounts',orgId]}),client.invalidateQueries({queryKey:['bank-accounts']}),client.invalidateQueries({queryKey:['bank-transactions']}),client.invalidateQueries({queryKey:['bank-account-baseline']})]);};
  const createSession=useMutation({mutationFn:(v:{statementStart:string;statementEnd:string;openingBalance:number;closingBalance:number;notes?:string})=>rpc<string>('create_bank_reconciliation_session',{_org:orgId,_bank_account:accountId,_statement_start:v.statementStart,_statement_end:v.statementEnd,_opening_balance:v.openingBalance,_closing_balance:v.closingBalance,_notes:v.notes||null}),onSuccess:refresh});
  const importLines=useMutation({mutationFn:(lines:BankStatementImportLine[])=>rpc<{inserted:number;duplicates_skipped:number}>('import_bank_statement_lines',{_session:sessionId,_lines:lines}),onSuccess:refresh});
  const autoMatch=useMutation({mutationFn:()=>rpc<{matched_lines:number}>('auto_match_bank_reconciliation',{_session:sessionId,_tolerance:.01,_date_window_days:3}),onSuccess:refresh});
  const manualMatch=useMutation({mutationFn:(v:{lineId:string;transactionId:string;amount?:number;notes?:string})=>rpc<string>('match_bank_statement_line',{_line:v.lineId,_bank_transaction:v.transactionId,_amount:v.amount??null,_notes:v.notes||null}),onSuccess:refresh});
  const unmatch=useMutation({mutationFn:(id:string)=>rpc<null>('unmatch_bank_reconciliation',{_match:id}),onSuccess:refresh});
  const setIgnored=useMutation({mutationFn:(v:{lineId:string;ignored:boolean;reason?:string})=>rpc<null>('set_bank_statement_line_ignored',{_line:v.lineId,_ignored:v.ignored,_reason:v.reason||null}),onSuccess:refresh});
  const createAdjustment=useMutation({mutationFn:(v:{lineId:string;counterAccountId:string;description:string})=>rpc<{journal_entry_id:string;bank_transaction_id:string;amount:number}>('create_bank_reconciliation_adjustment',{_line:v.lineId,_counter_account:v.counterAccountId,_description:v.description}),onSuccess:refresh});
  const approve=useMutation({mutationFn:()=>rpc<{status:string;difference:number}>('approve_bank_reconciliation',{_session:sessionId,_tolerance:.01}),onSuccess:refresh});
  const close=useMutation({mutationFn:()=>rpc<{status:string}>('close_bank_reconciliation',{_session:sessionId}),onSuccess:refresh});
  return {orgId,permission,accounts,sessions,workspace,createSession,importLines,autoMatch,manualMatch,unmatch,setIgnored,createAdjustment,approve,close};
}
