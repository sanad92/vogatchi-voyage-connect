
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedBookings, BookingType } from '@/hooks/useUnifiedBookings';
import { useAutomationEngine } from '@/hooks/useAutomationEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hotel, Plane, Car, Truck, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import StepWizard, { WizardNavButtons, FieldError } from '@/components/wizard/StepWizard';
import { useWizardForm, WizardStepConfig } from '@/hooks/useWizardForm';

const typeOptions = [
  { value: 'hotel' as BookingType, label: 'حجز فندق', icon: Hotel, desc: 'فنادق ومنتجعات' },
  { value: 'flight' as BookingType, label: 'حجز طيران', icon: Plane, desc: 'تذاكر طيران' },
  { value: 'car_rental' as BookingType, label: 'تأجير سيارات', icon: Car, desc: 'إيجار سيارات' },
  { value: 'transport' as BookingType, label: 'نقل', icon: Truck, desc: 'خدمات النقل' },
];

const wizardSteps: WizardStepConfig[] = [
  {
    title: 'نوع الحجز',
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (!data.booking_type) errors.booking_type = 'يرجى اختيار نوع الحجز';
      return errors;
    },
  },
  {
    title: 'البيانات الأساسية',
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (!data.customer_id && !data.customer_name) errors.customer_name = 'يرجى اختيار عميل أو إدخال اسم';
      if (!data.selling_price || Number(data.selling_price) <= 0) errors.selling_price = 'سعر البيع مطلوب';
      if (!data.cost_price || Number(data.cost_price) <= 0) errors.cost_price = 'التكلفة مطلوبة';
      return errors;
    },
  },
  {
    title: 'التفاصيل',
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (data.booking_type === 'hotel' && !data.hotel_name) errors.hotel_name = 'اسم الفندق مطلوب';
      if (data.booking_type === 'flight' && !data.airline) errors.airline = 'شركة الطيران مطلوبة';
      if (data.booking_type === 'car_rental' && !data.car_type) errors.car_type = 'نوع السيارة مطلوب';
      if (data.booking_type === 'transport' && !data.vehicle_type) errors.vehicle_type = 'نوع المركبة مطلوب';
      return errors;
    },
  },
  { title: 'مراجعة' },
];

const fieldLabels: Record<string, string> = {
  hotel_name: 'اسم الفندق', room_type: 'نوع الغرفة', board_type: 'الإقامة',
  nights: 'الليالي', check_in: 'تسجيل الدخول', check_out: 'تسجيل الخروج',
  airline: 'شركة الطيران', flight_number: 'رقم الرحلة',
  departure_airport: 'مطار المغادرة', arrival_airport: 'مطار الوصول',
  departure_date: 'تاريخ المغادرة', ticket_number: 'رقم التذكرة',
  car_type: 'نوع السيارة', pickup_location: 'موقع الاستلام', dropoff_location: 'موقع التسليم',
  daily_rate: 'السعر اليومي', pickup_date: 'تاريخ الاستلام', dropoff_date: 'تاريخ التسليم',
  vehicle_type: 'نوع المركبة', route: 'المسار', pickup_point: 'نقطة الالتقاط',
  dropoff_point: 'نقطة التوصيل', passengers: 'عدد الركاب',
};

const detailFields: Record<string, string[]> = {
  hotel: ['hotel_name', 'room_type', 'board_type', 'nights', 'check_in', 'check_out'],
  flight: ['airline', 'flight_number', 'departure_airport', 'arrival_airport', 'departure_date', 'ticket_number'],
  car_rental: ['car_type', 'pickup_location', 'dropoff_location', 'daily_rate', 'pickup_date', 'dropoff_date'],
  transport: ['vehicle_type', 'route', 'pickup_point', 'dropoff_point', 'passengers'],
};

const NewUnifiedBooking = () => {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { createBooking } = useUnifiedBookings();
  const { executeTrigger } = useAutomationEngine();

  const wizard = useWizardForm({
    steps: wizardSteps,
    draftKey: orgId ? `draft_booking_${orgId}` : undefined,
    initialData: {
      booking_type: '', customer_id: '', customer_name: '', supplier_name: '',
      selling_price: 0, cost_price: 0, currency: 'EGP',
      start_date: '', end_date: '', notes: '',
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').limit(500);
      return data || [];
    },
    enabled: !!orgId,
  });

  const profit = (Number(wizard.formData.selling_price) || 0) - (Number(wizard.formData.cost_price) || 0);
  const margin = Number(wizard.formData.selling_price) > 0 ? (profit / Number(wizard.formData.selling_price)) * 100 : 0;
  const bookingType = wizard.formData.booking_type as BookingType;

  const handleSubmit = async () => {
    if (!bookingType) return;
    const fields = detailFields[bookingType] || [];
    const details: Record<string, any> = {};
    fields.forEach(f => { if (wizard.formData[f] != null && wizard.formData[f] !== '') details[f] = wizard.formData[f]; });

    const detailKey = bookingType === 'hotel' ? 'hotelDetails' :
      bookingType === 'flight' ? 'flightDetails' :
      bookingType === 'car_rental' ? 'carDetails' : 'transportDetails';

    await createBooking.mutateAsync({
      booking_type: bookingType,
      customer_id: wizard.formData.customer_id || undefined,
      customer_name: wizard.formData.customer_name || undefined,
      supplier_name: wizard.formData.supplier_name || undefined,
      selling_price: Number(wizard.formData.selling_price) || 0,
      cost_price: Number(wizard.formData.cost_price) || 0,
      currency: wizard.formData.currency,
      start_date: wizard.formData.start_date || undefined,
      end_date: wizard.formData.end_date || undefined,
      notes: wizard.formData.notes || undefined,
      [detailKey]: Object.keys(details).length > 0 ? details : undefined,
    });
    wizard.clearDraft();
    navigate('/bookings');
  };

  const dateFields = ['check_in', 'check_out', 'departure_date', 'pickup_date', 'dropoff_date'];
  const numberFields = ['nights', 'daily_rate', 'passengers'];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold">إنشاء حجز جديد</h1>

      <StepWizard
        steps={wizardSteps}
        currentStep={wizard.currentStep}
        hasDraft={wizard.hasDraft}
        onLoadDraft={wizard.loadDraft}
        onDismissDraft={wizard.dismissDraft}
      >
        {/* Step 1: Choose Type */}
        {wizard.currentStep === 0 && (
          <Card>
            <CardHeader><CardTitle>اختر نوع الحجز</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {typeOptions.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.value}
                      onClick={() => { wizard.updateField('booking_type', t.value); }}
                      className={`p-6 rounded-lg border-2 text-center transition-all hover:border-primary hover:shadow-md ${
                        wizard.formData.booking_type === t.value ? 'border-primary bg-primary/5' : 'border-border'
                      }`}>
                      <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-sm text-muted-foreground">{t.desc}</div>
                    </button>
                  );
                })}
              </div>
              <FieldError error={wizard.errors.booking_type} />
              <WizardNavButtons isFirstStep onNext={() => wizard.goNext()} />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Base Info */}
        {wizard.currentStep === 1 && (
          <Card>
            <CardHeader><CardTitle>البيانات الأساسية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>العميل</Label>
                  <Select value={wizard.formData.customer_id} onValueChange={(v) => {
                    const cust = customers?.find((c: any) => c.id === v);
                    wizard.updateFields({ customer_id: v, customer_name: cust?.name || '' });
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر عميل" /></SelectTrigger>
                    <SelectContent>
                      {(customers || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError error={wizard.errors.customer_name} />
                </div>
                <div>
                  <Label>اسم المورد</Label>
                  <Input value={wizard.formData.supplier_name} onChange={(e) => wizard.updateField('supplier_name', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>سعر البيع</Label>
                  <Input type="number" value={wizard.formData.selling_price} onChange={(e) => wizard.updateField('selling_price', e.target.value)} />
                  <FieldError error={wizard.errors.selling_price} />
                </div>
                <div>
                  <Label>التكلفة</Label>
                  <Input type="number" value={wizard.formData.cost_price} onChange={(e) => wizard.updateField('cost_price', e.target.value)} />
                  <FieldError error={wizard.errors.cost_price} />
                </div>
                <div>
                  <Label>العملة</Label>
                  <Select value={wizard.formData.currency} onValueChange={(v) => wizard.updateField('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGP">EGP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تاريخ البداية</Label>
                  <Input type="date" value={wizard.formData.start_date} onChange={(e) => wizard.updateField('start_date', e.target.value)} />
                </div>
                <div>
                  <Label>تاريخ النهاية</Label>
                  <Input type="date" value={wizard.formData.end_date} onChange={(e) => wizard.updateField('end_date', e.target.value)} />
                </div>
              </div>
              {/* Profit Preview */}
              <div className={`p-4 rounded-lg border-2 ${profit >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {profit >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                    <span className="text-sm font-medium text-muted-foreground">الربح المتوقع</span>
                  </div>
                  <div className="text-left">
                    <span className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit.toLocaleString()} {wizard.formData.currency}
                    </span>
                    <span className={`mr-2 text-sm ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({margin.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
              <WizardNavButtons onBack={() => wizard.goBack()} onNext={() => wizard.goNext()} />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Type-specific Details */}
        {wizard.currentStep === 2 && (
          <Card>
            <CardHeader><CardTitle>تفاصيل {typeOptions.find(t => t.value === bookingType)?.label}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(detailFields[bookingType] || []).map(field => (
                  <div key={field}>
                    <Label>{fieldLabels[field] || field}</Label>
                    <Input
                      type={dateFields.includes(field) ? 'date' : numberFields.includes(field) ? 'number' : 'text'}
                      value={wizard.formData[field] || ''}
                      onChange={(e) => wizard.updateField(field, numberFields.includes(field) ? Number(e.target.value) : e.target.value)}
                      placeholder={fieldLabels[field]}
                    />
                    <FieldError error={wizard.errors[field]} />
                  </div>
                ))}
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea value={wizard.formData.notes} onChange={(e) => wizard.updateField('notes', e.target.value)} />
              </div>
              <WizardNavButtons onBack={() => wizard.goBack()} onNext={() => wizard.goNext()} nextLabel="مراجعة" />
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {wizard.currentStep === 3 && (
          <Card>
            <CardHeader><CardTitle>مراجعة الحجز</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                {(() => { const t = typeOptions.find(t => t.value === bookingType); const Icon = t?.icon || Hotel; return <><Icon className="h-5 w-5 text-primary" />{t?.label}</>; })()}
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50">
                <ReviewRow label="العميل" value={wizard.formData.customer_name || '—'} />
                <ReviewRow label="المورد" value={wizard.formData.supplier_name || '—'} />
                <ReviewRow label="تاريخ البداية" value={wizard.formData.start_date || '—'} />
                <ReviewRow label="تاريخ النهاية" value={wizard.formData.end_date || '—'} />
              </div>

              <div className={`p-4 rounded-lg border-2 ${profit >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">سعر البيع</div>
                    <div className="text-lg font-bold">{Number(wizard.formData.selling_price).toLocaleString()} {wizard.formData.currency}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">التكلفة</div>
                    <div className="text-lg font-bold">{Number(wizard.formData.cost_price).toLocaleString()} {wizard.formData.currency}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">الربح ({margin.toFixed(1)}%)</div>
                    <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit.toLocaleString()} {wizard.formData.currency}
                    </div>
                  </div>
                </div>
              </div>

              {(detailFields[bookingType] || []).some(f => wizard.formData[f]) && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-3">تفاصيل {typeOptions.find(t => t.value === bookingType)?.label}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(detailFields[bookingType] || [])
                      .filter(f => wizard.formData[f] != null && wizard.formData[f] !== '')
                      .map(f => (
                        <ReviewRow key={f} label={fieldLabels[f] || f} value={String(wizard.formData[f])} />
                      ))}
                  </div>
                </div>
              )}

              {wizard.formData.notes && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-1">ملاحظات</h3>
                  <p className="text-muted-foreground text-sm">{wizard.formData.notes}</p>
                </div>
              )}

              <WizardNavButtons
                onBack={() => wizard.goBack()}
                onNext={handleSubmit}
                isSubmitting={createBooking.isPending}
                submitLabel={createBooking.isPending ? 'جاري الحفظ...' : 'تأكيد وحفظ الحجز'}
              />
            </CardContent>
          </Card>
        )}
      </StepWizard>
    </div>
  );
};

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-sm text-muted-foreground">{label}: </span>
    <span className="font-medium">{value}</span>
  </div>
);

export default NewUnifiedBooking;
