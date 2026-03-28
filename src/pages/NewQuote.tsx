import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, type QuoteFormData } from '@/hooks/useQuotes';
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
import StepWizard, { WizardNavButtons, FieldError } from '@/components/wizard/StepWizard';
import { useWizardForm, WizardStepConfig } from '@/hooks/useWizardForm';

const quoteSteps: WizardStepConfig[] = [
  {
    title: 'بيانات العميل',
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (!data.customer_id && !data.customer_name) errors.customer_name = 'يرجى اختيار عميل أو إدخال اسم';
      return errors;
    },
  },
  {
    title: 'عناصر العرض',
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (!data.items || data.items.length === 0) errors.items = 'يرجى إضافة عنصر واحد على الأقل';
      return errors;
    },
  },
  { title: 'مراجعة وإرسال' },
];

export default function NewQuote() {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { createQuote } = useQuotes();

  const wizard = useWizardForm({
    steps: quoteSteps,
    draftKey: orgId ? `draft_quote_${orgId}` : undefined,
    initialData: {
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
      items: [],
    },
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

  const items = wizard.formData.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + (i.total_selling || 0), 0);
  const totalCost = items.reduce((s: number, i: any) => s + (i.total_cost || 0), 0);
  const discountAmount = Number(wizard.formData.discount_amount) || 0;
  const vatRate = Number(wizard.formData.vat_rate) || 0;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * (vatRate / 100);
  const totalAmount = afterDiscount + vatAmount;
  const totalProfit = totalAmount - totalCost;

  const handleSubmit = async (status: string) => {
    const formData: QuoteFormData = {
      customer_id: wizard.formData.customer_id,
      customer_name: wizard.formData.customer_name,
      travel_date: wizard.formData.travel_date,
      return_date: wizard.formData.return_date,
      destination: wizard.formData.destination,
      number_of_travelers: wizard.formData.number_of_travelers,
      notes: wizard.formData.notes,
      discount_amount: discountAmount,
      vat_rate: vatRate,
      valid_until: wizard.formData.valid_until,
      assigned_employee_id: wizard.formData.assigned_employee_id,
      status,
      items,
    };
    await createQuote.mutateAsync(formData);
    wizard.clearDraft();
    navigate('/quotes');
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    wizard.updateFields({ customer_id: customerId, customer_name: customer?.name || '' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">إنشاء عرض سعر جديد</h1>
      </div>

      <StepWizard
        steps={quoteSteps}
        currentStep={wizard.currentStep}
        hasDraft={wizard.hasDraft}
        onLoadDraft={wizard.loadDraft}
        onDismissDraft={wizard.dismissDraft}
      >
        {/* Step 1: Customer & Trip Info */}
        {wizard.currentStep === 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">بيانات العرض</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>العميل</Label>
                  <Select value={wizard.formData.customer_id || ''} onValueChange={handleCustomerChange}>
                    <SelectTrigger><SelectValue placeholder="اختر عميل..." /></SelectTrigger>
                    <SelectContent>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError error={wizard.errors.customer_name} />
                </div>

                <div>
                  <Label>أو اسم العميل يدوياً</Label>
                  <Input
                    value={wizard.formData.customer_name}
                    onChange={e => wizard.updateField('customer_name', e.target.value)}
                    placeholder="اسم العميل"
                  />
                </div>

                <div>
                  <Label>الوجهة</Label>
                  <Input
                    value={wizard.formData.destination}
                    onChange={e => wizard.updateField('destination', e.target.value)}
                    placeholder="الوجهة"
                  />
                </div>

                <div>
                  <Label>تاريخ السفر</Label>
                  <Input type="date" value={wizard.formData.travel_date || ''} onChange={e => wizard.updateField('travel_date', e.target.value)} />
                </div>

                <div>
                  <Label>تاريخ العودة</Label>
                  <Input type="date" value={wizard.formData.return_date || ''} onChange={e => wizard.updateField('return_date', e.target.value)} />
                </div>

                <div>
                  <Label>عدد المسافرين</Label>
                  <Input type="number" min={1} value={wizard.formData.number_of_travelers} onChange={e => wizard.updateField('number_of_travelers', Number(e.target.value))} />
                </div>

                <div>
                  <Label>الموظف المسؤول</Label>
                  <Select value={wizard.formData.assigned_employee_id || ''} onValueChange={v => wizard.updateField('assigned_employee_id', v)}>
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
                  <Input type="date" value={wizard.formData.valid_until || ''} onChange={e => wizard.updateField('valid_until', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea value={wizard.formData.notes} onChange={e => wizard.updateField('notes', e.target.value)} placeholder="ملاحظات إضافية..." />
              </div>

              <WizardNavButtons isFirstStep onNext={() => wizard.goNext()} nextLabel="التالي — عناصر العرض" />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Items */}
        {wizard.currentStep === 1 && (
          <Card>
            <CardContent className="pt-6">
              <QuoteItemsEditor items={items} onChange={newItems => wizard.updateField('items', newItems)} />
              <FieldError error={wizard.errors.items} />
              <WizardNavButtons onBack={() => wizard.goBack()} onNext={() => wizard.goNext()} nextLabel="مراجعة" />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Submit */}
        {wizard.currentStep === 2 && (
          <>
            {/* Totals */}
            <Card>
              <CardHeader><CardTitle className="text-lg">الملخص المالي</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>الخصم</Label>
                    <Input type="number" min={0} value={wizard.formData.discount_amount} onChange={e => wizard.updateField('discount_amount', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>نسبة الضريبة %</Label>
                    <Input type="number" min={0} max={100} value={wizard.formData.vat_rate} onChange={e => wizard.updateField('vat_rate', Number(e.target.value))} />
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

            {/* Review Info */}
            <Card>
              <CardHeader><CardTitle className="text-lg">مراجعة البيانات</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/50">
                  <ReviewRow label="العميل" value={wizard.formData.customer_name || '—'} />
                  <ReviewRow label="الوجهة" value={wizard.formData.destination || '—'} />
                  <ReviewRow label="عدد المسافرين" value={String(wizard.formData.number_of_travelers)} />
                  <ReviewRow label="تاريخ السفر" value={wizard.formData.travel_date || '—'} />
                  <ReviewRow label="تاريخ العودة" value={wizard.formData.return_date || '—'} />
                  <ReviewRow label="عدد العناصر" value={String(items.length)} />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => wizard.goBack()}>
                <ArrowRight className="h-4 w-4 ml-1" />رجوع
              </Button>
              <div className="flex gap-3">
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
          </>
        )}
      </StepWizard>
    </div>
  );
}

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-sm text-muted-foreground">{label}: </span>
    <span className="font-medium">{value}</span>
  </div>
);
