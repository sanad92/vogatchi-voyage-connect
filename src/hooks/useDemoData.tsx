
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDemoData = () => {
  const [loading, setLoading] = useState(false);

  const generateDemoData = async (organizationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-demo-data', {
        body: { organization_id: organizationId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('تم إنشاء البيانات التجريبية بنجاح! 🎉');
      return data;
    } catch (error: any) {
      console.error('Demo data generation error:', error);
      toast.error('حدث خطأ أثناء إنشاء البيانات التجريبية');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearDemoData = async (organizationId: string) => {
    setLoading(true);
    try {
      // Delete demo data in reverse order (invoices → bookings → suppliers → customers)
      await supabase.from('invoices').delete().eq('organization_id', organizationId).like('invoice_number', 'DEMO-%');
      await supabase.from('hotel_bookings').delete().eq('organization_id', organizationId);
      await supabase.from('suppliers').delete().eq('organization_id', organizationId).like('name', '%تجريبي%');
      await supabase.from('customers').delete().eq('organization_id', organizationId).like('email', '%@demo.com');
      
      await supabase.from('organizations').update({ has_demo_data: false }).eq('id', organizationId);
      
      toast.success('تم حذف البيانات التجريبية بنجاح');
    } catch (error: any) {
      console.error('Clear demo data error:', error);
      toast.error('حدث خطأ أثناء حذف البيانات التجريبية');
    } finally {
      setLoading(false);
    }
  };

  return { generateDemoData, clearDemoData, loading };
};
