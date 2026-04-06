import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedBookings, BookingType } from '@/hooks/useUnifiedBookings';
import { useAutomationEngine } from '@/hooks/useAutomationEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Hotel, Plane, Car, Truck, TrendingUp, TrendingDown, Search, Plus, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import StepWizard, { WizardNavButtons, FieldError } from '@/components/wizard/StepWizard';
import { useWizardForm, WizardStepConfig } from '@/hooks/useWizardForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import CustomerSearch from '@/components/customers/CustomerSearch';
import QuickCustomerAdd from '@/components/customers/QuickCustomerAdd';
import SupplierSelection from '@/components/shared/SupplierSelection';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { SupportedCurrency } from '@/types/currency';
import { Customer } from '@/types/customer';
import UnifiedHotelFields from '@/components/bookings/unified-fields/UnifiedHotelFields';
import UnifiedFlightFields from '@/components/bookings/unified-fields/UnifiedFlightFields';
import UnifiedCarFields from '@/components/bookings/unified-fields/UnifiedCarFields';
import UnifiedTransportFields from '@/components/bookings/unified-fields/UnifiedTransportFields';

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

const NewUnifiedBooking = () => {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { createBooking } = useUnifiedBookings();
  const { executeTrigger } = useAutomationEngine();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const wizard = useWizardForm({
    steps: wizardSteps,
    draftKey: orgId ? `draft_booking_${orgId}` : undefined,
    initialData: {
      booking_type: '', customer_id: '', customer_name: '', supplier_id: '', supplier_name: '',
      selling_price: 0, cost_price: 0, currency: 'EGP',
      start_date: '', end_date: '', notes: '',
    },
  });

  const profit = (Number(wizard.formData.selling_price) || 0) - (Number(wizard.formData.cost_price) || 0);
  const margin = Number(wizard.formData.selling_price) > 0 ? (profit / Number(wizard.formData.selling_price)) * 100 : 0;
  const bookingType = wizard.formData.booking_type as BookingType;

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    wizard.updateFields({ customer_id: customer.id, customer_name: customer.full_name || customer.name });
    setIsSearchOpen(false);
  };

  const handleQuickAdd = (customer: Customer) => {
    handleCustomerSelect(customer);
    setIsAddOpen(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    wizard.updateFields({ customer_id: '', customer_name: '' });
  };

  const handleSubmit = async () => {
    if (!bookingType) return;

    // جمع التفاصيل حسب النوع
    const hotelKeys = ['hotel_name', 'room_type', 'board_type', 'nights', 'check_in', 'check_out', 'rooms', 'star_rating', 'city', 'adults', 'children', 'children_ages', 'meal_plan', 'cancellation_policy', 'booking_reference'];
    const flightKeys = ['airline', 'flight_number', 'departure_airport', 'arrival_airport', 'departure_date', 'departure_time', 'arrival_date', 'arrival_time', 'pnr', 'ticket_number', 'passengers_count', 'flight_class', 'ticket_price_per_person', 'taxes_and_fees', 'is_round_trip', 'seat_preferences', 'meal_preferences'];
    const carKeys = ['car_type', 'pickup_location', 'dropoff_location', 'daily_rate', 'pickup_date', 'dropoff_date', 'insurance_included'];
    const transportKeys = ['vehicle_type', 'route', 'pickup_point', 'dropoff_point', 'passengers'];

    const keyMap: Record<string, string[]> = { hotel: hotelKeys, flight: flightKeys, car_rental: carKeys, transport: transportKeys };
    const detailKeyMap: Record<string, string> = { hotel: 'hotelDetails', flight: 'flightDetails', car_rental: 'carDetails', transport: 'transportDetails' };

    const keys = keyMap[bookingType] || [];
    const details: Record<string, any> = {};
    keys.forEach(k => { if (wizard.formData[k] != null && wizard.formData[k] !== '') details[k] = wizard.formData[k]; });

    const result = await createBooking.mutateAsync({
      booking_type: bookingType,
      customer_id: wizard.formData.customer_id || undefined,
      customer_name: wizard.formData.customer_name || undefined,
      supplier_id: wizard.formData.supplier_id || undefined,
      supplier_name: wizard.formData.supplier_name || undefined,
      selling_price: Number(wizard.formData.selling_price) || 0,
      cost_price: Number(wizard.formData.cost_price) || 0,
      currency: wizard.formData.currency,
      start_date: wizard.formData.start_date || undefined,
      end_date: wizard.formData.end_date || undefined,
      notes: wizard.formData.notes || undefined,
      [detailKeyMap[bookingType]]: Object.keys(details).length > 0 ? details : undefined,
    });

    if (result?.id) {
      executeTrigger('booking_created', {
        bookingId: result.id,
        bookingType,
        customerName: wizard.formData.customer_name,
        totalAmount: Number(wizard.formData.selling_price) || 0,
        travelDate: wizard.formData.start_date,
        organizationId: orgId,
      });
    }

    wizard.clearDraft();
    navigate('/bookings');
  };

  // ملصقات الحقول للمراجعة
  const reviewLabels: Record<string, string> = {
    hotel_name: 'الفندق', star_rating: 'التصنيف', city: 'المدينة', room_type: 'نوع الغرفة',
    rooms: 'عدد الغرف', check_in: 'الدخول', check_out: 'الخروج', nights: 'الليالي',
    adults: 'البالغين', children: 'الأطفال', meal_plan: 'الوجبات', booking_reference: 'مرجع المورد',
    airline: 'شركة الطيران', flight_number: 'رقم الرحلة', flight_class: 'درجة السفر',
    departure_airport: 'مطار المغادرة', arrival_airport: 'مطار الوصول',
    departure_date: 'تاريخ المغادرة', departure_time: 'وقت المغادرة',
    arrival_date: 'تاريخ الوصول', arrival_time: 'وقت الوصول',
    passengers_count: 'المسافرين', ticket_price_per_person: 'سعر التذكرة',
    taxes_and_fees: 'الضرائب', pnr: 'PNR', ticket_number: 'رقم التذكرة',
    is_round_trip: 'ذهاب وعودة',
    car_type: 'نوع السيارة', daily_rate: 'السعر اليومي',
    pickup_location: 'موقع الاستلام', dropoff_location: 'موقع التسليم',
    pickup_date: 'تاريخ الاستلام', dropoff_date: 'تاريخ التسليم',
    insurance_included: 'تأمين شامل',
    vehicle_type: 'نوع المركبة', route: 'المسار',
    pickup_point: 'نقطة الالتقاط', dropoff_point: 'نقطة التوصيل', passengers: 'الركاب',
  };

  const getReviewFields = () => {
    const keyMap: Record<string, string[]> = {
      hotel: ['hotel_name', 'star_rating', 'city', 'room_type', 'rooms', 'check_in', 'check_out', 'nights', 'adults', 'children', 'meal_plan', 'booking_reference'],
      flight: ['airline', 'flight_number', 'flight_class', 'departure_airport', 'arrival_airport', 'departure_date', 'departure_time', 'arrival_date', 'arrival_time', 'passengers_count', 'ticket_price_per_person', 'taxes_and_fees', 'pnr', 'ticket_number', 'is_round_trip'],
      car_rental: ['car_type', 'daily_rate', 'pickup_location', 'dropoff_location', 'pickup_date', 'dropoff_date', 'insurance_included'],
      transport: ['vehicle_type', 'route', 'pickup_point', 'dropoff_point', 'passengers'],
    };
    return (keyMap[bookingType] || []).filter(k => wizard.formData[k] != null && wizard.formData[k] !== '' && wizard.formData[k] !== false);
  };

  const formatReviewValue = (key: string, value: any): string => {
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (key === 'star_rating') return '⭐'.repeat(Number(value));
    return String(value);
  };

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
                      onClick={() => wizard.updateField('booking_type', t.value)}
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

        {/* Step 2: Base Info with CustomerSelection + SupplierSelection */}
        {wizard.currentStep === 1 && (
          <Card>
            <CardHeader><CardTitle>البيانات الأساسية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* اختيار العميل */}
              <div>
                <Label>العميل *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={wizard.formData.customer_name || ''}
                    onChange={e => wizard.updateField('customer_name', e.target.value)}
                    placeholder="اسم العميل"
                    readOnly={!!selectedCustomer}
                    className={selectedCustomer ? 'bg-muted/50' : ''}
                  />
                  <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" type="button"><Search className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader><DialogTitle>البحث عن عميل</DialogTitle></DialogHeader>
                      <CustomerSearch
                        onCustomerSelect={handleCustomerSelect}
                        onNewCustomer={() => { setIsSearchOpen(false); setIsAddOpen(true); }}
                        selectedCustomer={selectedCustomer}
                      />
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" type="button"><Plus className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
                      <QuickCustomerAdd onCustomerAdded={handleQuickAdd} onCancel={() => setIsAddOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
                <FieldError error={wizard.errors.customer_name} />
                {selectedCustomer && (
                  <div className="mt-2 p-3 rounded-lg border bg-primary/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">العميل المحدد</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearCustomer} type="button">إلغاء</Button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{selectedCustomer.full_name || selectedCustomer.name}</Badge>
                      {selectedCustomer.phone && <Badge variant="outline" className="text-xs">{selectedCustomer.phone}</Badge>}
                      {selectedCustomer.email && <Badge variant="outline" className="text-xs">{selectedCustomer.email}</Badge>}
                    </div>
                  </div>
                )}
              </div>

              {/* اختيار المورد */}
              <SupplierSelection
                selectedSupplierId={wizard.formData.supplier_id || ''}
                selectedSupplierName={wizard.formData.supplier_name || ''}
                onSupplierSelect={(id, name) => wizard.updateFields({ supplier_id: id, supplier_name: name })}
                supplierType={bookingType === 'hotel' ? 'hotel' : bookingType === 'flight' ? 'airline' : bookingType === 'transport' ? 'transport' : undefined}
              />

              {/* الأسعار والعملة */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>سعر البيع *</Label>
                  <Input type="number" value={wizard.formData.selling_price} onChange={e => wizard.updateField('selling_price', e.target.value)} />
                  <FieldError error={wizard.errors.selling_price} />
                </div>
                <div>
                  <Label>التكلفة *</Label>
                  <Input type="number" value={wizard.formData.cost_price} onChange={e => wizard.updateField('cost_price', e.target.value)} />
                  <FieldError error={wizard.errors.cost_price} />
                </div>
                <div>
                  <Label>العملة</Label>
                  <CurrencySelector
                    value={(wizard.formData.currency || 'EGP') as SupportedCurrency}
                    onValueChange={v => wizard.updateField('currency', v)}
                  />
                </div>
              </div>

              {/* التواريخ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>تاريخ البداية</Label>
                  <Input type="date" value={wizard.formData.start_date} onChange={e => wizard.updateField('start_date', e.target.value)} />
                </div>
                <div>
                  <Label>تاريخ النهاية</Label>
                  <Input type="date" value={wizard.formData.end_date} onChange={e => wizard.updateField('end_date', e.target.value)} />
                </div>
              </div>

              {/* الربح */}
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
              {bookingType === 'hotel' && (
                <UnifiedHotelFields formData={wizard.formData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}
              {bookingType === 'flight' && (
                <UnifiedFlightFields formData={wizard.formData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}
              {bookingType === 'car_rental' && (
                <UnifiedCarFields formData={wizard.formData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}
              {bookingType === 'transport' && (
                <UnifiedTransportFields formData={wizard.formData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}

              <div>
                <Label>ملاحظات</Label>
                <Textarea value={wizard.formData.notes} onChange={e => wizard.updateField('notes', e.target.value)} />
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

              {getReviewFields().length > 0 && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-3">تفاصيل {typeOptions.find(t => t.value === bookingType)?.label}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {getReviewFields().map(k => (
                      <ReviewRow key={k} label={reviewLabels[k] || k} value={formatReviewValue(k, wizard.formData[k])} />
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
