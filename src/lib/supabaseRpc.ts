import { supabase } from '@/integrations/supabase/client';

type RpcError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type RpcResponse<T> = {
  data: T | null;
  error: RpcError | null;
};

type UntypedRpcClient = {
  rpc: <T>(
    functionName: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<RpcResponse<T>>;
};

// Keeps generated Supabase types untouched while newly deployed RPCs await
// the next schema type generation pass.
export const callUntypedRpc = async <T>(
  functionName: string,
  args?: Record<string, unknown>,
): Promise<RpcResponse<T>> => (
  (supabase as unknown as UntypedRpcClient).rpc<T>(functionName, args)
);
