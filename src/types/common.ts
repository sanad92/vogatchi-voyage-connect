// src/types/common.ts - Shared types for the entire app (fixed parsing)
export type FormChangeHandler = (field: string, value: unknown) => void;
export type FormValues = Record<string, unknown>;
export type ApiResponse<T = Record<string, unknown>> = {
  data: T[];
  error?: { message: string };
  count?: number;
};

export interface UserBase {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  created_at?: string;
}

// Fixed parsing error: added proper line ending
export type ApiData<T> = T extends Array<infer U> ? U[] : Record<string, unknown>;

export type SafeAny = unknown; // Use this instead of any, cast with type guards

export type MutationFn<TInput = SafeAny, TOutput = SafeAny> = (input: TInput) => Promise<TOutput>;

