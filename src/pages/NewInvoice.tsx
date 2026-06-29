import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { calculateFinancialBreakdown } from '@/utils/calculationHelpers';
import { useCurrencyHelper } from '@/hooks/useCurrencyHelper';

const NewInvoice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const orgId = useOrgId();
  const { ensureSupportedCurrency } = useCurrencyHelper();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    booking_type: '',
    booking_id: '',
    amount: '',
    currency: 'EGP',
    description: '',
    notes: ''
  });

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ['customers-select', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone')
        .order('name')
        .limit(500);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !orgId) return;

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ title: 'خطأ', description: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Generate invoice number via RPC
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
      const financialBreakdown = calculateFinancialBreakdown({
        subtotal: parseFloat(formData.amount),
        discountAmount: 0,
        vatRate: 0,
      });
      const currency = ensureSupportedCurrency(formData.currency);

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          organization_id: orgId,
          customer_id: formData.customer_id || null,
          booking_type: formData.booking_type || null,
          booking_id: formData.booking_id || null,
          subtotal: financialBreakdown.subtotal,
          total_amount: financialBreakdown.totalAmount,
          final_amount: financialBreakdown.totalAmount,
          currency,
          invoice_number: invoiceNumber || `INV-${Date.now()}`,
          notes: formData.notes || null,
          status: 'pending',
          issued_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "تم إنشاء الفاتورة بنجاح",
        description: `فاتورة رقم ${data.invoice_number}`,
      });

      navigate('/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "خطأ في إنشاء الفاتورة",
        description: error?.message || "حدث خطأ أثناء إنشاء الفاتورة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">فاتورة جديدة</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الفاتورة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العميل *</Label>
                  <Select value={formData.customer_id} onValueChange={(value) => handleChange('customer_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers || []).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>نوع الحجز</Label>
                  <Select value={formData.booking_type} onValueChange={(value) => handleChange('booking_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحجز" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">حجز فندق</SelectItem>
                      <SelectItem value="flight">حجز طيران</SelectItem>
                      <SelectItem value="car_rental">تأجير سيارة</SelectItem>
                      <SelectItem value="transport">حجز نقل</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>العملة *</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleChange('currency', value)} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                      <SelectItem value="EUR">يورو (EUR)</SelectItem>
                      <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    يجب أن تطابق عملة الفاتورة عملة الحجز المرتبط بها.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف الفاتورة</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="وصف مختصر للفاتورة"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="ملاحظات إضافية (اختياري)"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/invoices')}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewInvoice;
