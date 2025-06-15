
export interface Supplier {
  id: string;
  name: string;
  supplier_type: 'hotel' | 'airline' | 'transport' | 'tour';
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  tax_number?: string | null;
  rating?: number | null;
  payment_type: 'prepaid' | 'deferred';
  payment_method_options: string[];
  payment_terms?: string | null;
  is_active: boolean | null;
  notes?: string | null;
  credit_limit?: number | null;
  created_at?: string;
  updated_at?: string;
}
