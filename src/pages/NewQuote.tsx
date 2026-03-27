import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, type QuoteItem, type QuoteFormData } from '@/hooks/useQuotes';
import QuoteItemsEditor from '@/components/quotes/QuoteItemsEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Save, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useQuery } from '@tanstack/react-query';

export default function NewQuote() {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { createQuote } = useQuotes();

  const [form, setForm] = useState<QuoteFormData>({
    customer_id: null,
    customer_name: '',
    travel_date: null,
    return_date: null,
    destination: '',
    number_of_travelers: 1,
    notes: '',
    discount_amount: 0,
    vat_rate: 14,
    valid_until: null,
    assigned_employee_id: null,
    status: 'draft',
    items: [],
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-select', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name, phone').eq('organization_id', orgId!).order('name').limit(500);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-select', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('id, full_name').eq('organization_id', orgId!).eq('is_active', true).order('full_name').limit(200);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const subtotal = form.items.reduce((s, i) => s + i.total_selling, 0);
  const totalCost = form.items.reduce((s, i) => s + i.total_cost, 0);
  const afterDiscount = subtotal - form.discount_amount;
  const vatAmount = afterDiscount * (form.vat_rate / 100);
  const totalAmount = afterDiscount + vatAmount;
  const totalProfit = totalAmount - totalCost;

  const handleSubmit = async (status: string) => {
    if (!form.customer_name && !form.customer_id) return;
    if (form.items.length === 0) return;
    await createQuote.mutateAsync({ ...form, status });
    navigate('/quotes');
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    setForm(f => ({ ...f, customer_id: customerId, customer_name: customer?.name || '' }));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">إنشاء عرض سعر جديد</h1>
      </div>

      {/* Customer & Trip Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">بيانات العرض</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>العميل</Label>
              <Select value={form.customer_id || ''} onValueChange={handleCustomerChange}>
                <SelectTrigger><SelectValue placeholder="اختر عميل..." /></SelectTrigger>
                <SelectContent>
                  {customers?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>أو اسم العميل يدوياً</Label>
              <Input
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="اسم العميل"
              />
            </div>

            <div>
              <Label>الوجهة</Label>
              <Input
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="الوجهة"
              />
            </div>

            <div>
              <Label>تاريخ السفر</Label>
              <Input type="date" value={form.travel_date || ''} onChange={e => setForm(f => ({ ...f, travel_date: e.target.value }))} />
            </div>

            <div>
              <Label>تاريخ العودة</Label>
              <Input type="date" value={form.return_date || ''} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} />
            </div>

            <div>
              <Label>عدد المسافرين</Label>
              <Input type="number" min={1} value={form.number_of_travelers} onChange={e => setForm(f => ({ ...f, number_of_travelers: Number(e.target.value) }))} />
            </div>

            <div>
              <Label>الموظف المسؤول</Label>
              <Select value={form.assigned_employee_id || ''} onValueChange={v => setForm(f => ({ ...f, assigned_employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر موظف..." /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>صالح حتى</Label>
              <Input type="date" value={form.valid_until || ''} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية..." />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="pt-6">
          <QuoteItemsEditor items={form.items} onChange={items => setForm(f => ({ ...f, items }))} />
        </CardContent>
      </Card>

      {/* Totals */}
      {form.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">الملخص المالي</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>الخصم</Label>
                <Input type="number" min={0} value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>نسبة الضريبة %</Label>
                <Input type="number" min={0} max={100} value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-muted-foreground">الإجمالي الفرعي</div>
                <div className="text-lg font-bold">{subtotal.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-muted-foreground">الضريبة</div>
                <div className="text-lg font-bold">{vatAmount.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="text-muted-foreground">الإجمالي</div>
                <div className="text-lg font-bold text-primary">{totalAmount.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-muted-foreground">الربح المتوقع</div>
                <div className="text-lg font-bold text-green-600">{totalProfit.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={createQuote.isPending}>
          <Save className="h-4 w-4 ml-1" />
          حفظ كمسودة
        </Button>
        <Button onClick={() => handleSubmit('sent')} disabled={createQuote.isPending}>
          <Send className="h-4 w-4 ml-1" />
          حفظ وإرسال
        </Button>
      </div>
    </div>
  );
}
