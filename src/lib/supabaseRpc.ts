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

type RpcQuery<T> = PromiseLike<RpcResponse<T>> & {
  gt(column: string, value: unknown): RpcQuery<T>;
  gte(column: string, value: unknown): RpcQuery<T>;
  lt(column: string, value: unknown): RpcQuery<T>;
  order(column: string, options?: { ascending?: boolean }): RpcQuery<T>;
  limit(count: number): RpcQuery<T>;
};

type UntypedRpcClient = {
  rpc: <T>(
    functionName: string,
    args?: Record<string, unknown>,
  ) => RpcQuery<T>;
};

// Keeps generated Supabase types untouched while newly deployed RPCs await
// the next schema type generation pass.
export const callUntypedRpc = async <T>(
  functionName: string,
  args?: Record<string, unknown>,
  configure?: (query: RpcQuery<T>) => RpcQuery<T>,
): Promise<RpcResponse<T>> => {
  const query = (supabase as unknown as UntypedRpcClient).rpc<T>(functionName, args);
  return configure ? configure(query) : query;
};
