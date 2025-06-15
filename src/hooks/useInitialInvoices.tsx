
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const initialInvoices = [
  {
    invoice_number: 'INV-2024-000001',
    customer_id: null,
    booking_id: null,
    booking_type: 'hotel',
    subtotal: 5000.00,
    vat_rate: 14.00,
    discount_amount: 0.00,
    total_amount: 5700.00,
    final_amount: 5700.00,
    payment_terms: '30 days',
    notes: 'فاتورة حجز فندق القاهرة',
    due_date: '2024-12-30',
    issued_date: '2024-12-01',
    currency: 'EGP',
    status: 'sent'
  },
  {
    invoice_number: 'INV-2024-000002',
    customer_id: null,
    booking_id: null,
    booking_type: 'flight',
    subtotal: 8000.00,
    vat_rate: 14.00,
    discount_amount: 200.00,
    total_amount: 9120.00,
    final_amount: 8920.00,
    payment_terms: '15 days',
    notes: 'فاتورة حجز طيران دبي',
    due_date: '2024-12-20',
    issued_date: '2024-12-05',
    currency: 'EGP',
    status: 'paid'
  },
  {
    invoice_number: 'INV-2024-000003',
    customer_id: null,
    booking_id: null,
    booking_type: 'transport',
    subtotal: 1500.00,
    vat_rate: 14.00,
    discount_amount: 0.00,
    total_amount: 1710.00,
    final_amount: 1710.00,
    payment_terms: '7 days',
    notes: 'فاتورة خدمة نقل مطار',
    due_date: '2024-12-10',
    issued_date: '2024-12-03',
    currency: 'EGP',
    status: 'overdue'
  },
  {
    invoice_number: 'INV-2024-000004',
    customer_id: null,
    booking_id: null,
    booking_type: 'car_rental',
    subtotal: 3000.00,
    vat_rate: 14.00,
    discount_amount: 100.00,
    total_amount: 3420.00,
    final_amount: 3320.00,
    payment_terms: '30 days',
    notes: 'فاتورة إيجار سيارة أسبوعي',
    due_date: '2025-01-05',
    issued_date: '2024-12-06',
    currency: 'EGP',
    status: 'draft'
  },
  {
    invoice_number: 'INV-2024-000005',
    customer_id: null,
    booking_id: null,
    booking_type: 'hotel',
    subtotal: 12000.00,
    vat_rate: 14.00,
    discount_amount: 500.00,
    total_amount: 13680.00,
    final_amount: 13180.00,
    payment_terms: '30 days',
    notes: 'فاتورة حجز منتجع شرم الشيخ',
    due_date: '2025-01-10',
    issued_date: '2024-12-11',
    currency: 'EGP',
    status: 'sent'
  }
];

export const useInitialInvoices = () => {
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: invoices } = useQuery({
    queryKey: ['invoices-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      return data;
    }
  });

  const addInvoiceMutation = useMutation({
    mutationFn: async (invoice: any) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Error adding initial invoice:', error);
    }
  });

  useEffect(() => {
    if (invoices && invoices.length === 0 && !initialized) {
      setInitialized(true);
      
      // Add initial invoices one by one
      initialInvoices.forEach((invoice, index) => {
        setTimeout(() => {
          addInvoiceMutation.mutate(invoice);
        }, index * 300); // Stagger the additions
      });

      // Invalidate queries after all invoices are added
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        toast.success('تم إضافة فواتير تجريبية للنظام');
      }, initialInvoices.length * 300 + 1000);
    }
  }, [invoices, addInvoiceMutation, initialized, queryClient]);

  return { initialized };
};
