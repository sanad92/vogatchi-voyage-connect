import { BookingSalesStaffSelect } from '@/components/bookings/staff/BookingSalesStaffSelect';
import { BookingCancellationTermsFields, BookingCancellationTermsSummary } from '@/components/bookings/BookingCancellationTermsFields';
import { emptyTerms, termsError } from '@/lib/bookingCancellationTerms';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUnifiedBookings, BookingType } from '@/hooks/useUnifiedBookings';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Hotel, Plane, Car, Truck, TrendingUp, TrendingDown, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/useOrgId';
import { readActiveCustomer, useCustomerContext, type CustomerContext } from '@/hooks/useCustomerContext';
import StepWizard, { WizardNavButtons, FieldError } from '@/components/wizard/StepWizard';
import { useWizardForm, WizardStepConfig } from '@/hooks/useWizardForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import CustomerSearch from '@/components/customers/CustomerSearch';
import SupplierSelection from '@/components/shared/SupplierSelection';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { SupportedCurrency } from '@/types/currency';
import { Customer } from '@/types/customer';
import UnifiedHotelFields from '@/components/bookings/unified-fields/UnifiedHotelFields';
import UnifiedFlightFields from '@/components/bookings/unified-fields/UnifiedFlightFields';
import UnifiedCarFields from '@/components/bookings/unified-fields/UnifiedCarFields';
import UnifiedTransportFields from '@/components/bookings/unified-fields/UnifiedTransportFields';

const typeOptions = [
  { value: 'hotel', label: 'حجز فندق', icon: Hotel, desc: 'فنادق ومنتجعات' },
  { value: 'flight', label: 'حجز طيران', icon: Plane, desc: 'تذاكر طيران' },
  { value: 'car_rental', label: 'تأجير سيارات', icon: Car, desc: 'إيجار سيارات' },
  { value: 'transport', label: 'نقل', icon: Truck, desc: 'خدمات النقل' },
] as const;

const serviceDateKeys: Record<(typeof typeOptions)[number]['value'], [string, string]> = {
  hotel: ['check_in', 'check_out'],
  flight: ['departure_date', 'arrival_date'],
  car_rental: ['pickup_date', 'dropoff_date'],
  transport: ['start_date', 'end_date'],
};

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function bookingDates(data: Record<string, unknown>) {
  const type = typeOptions.find((option) => option.value === data.booking_type)?.value;
  if (!type) return { start: '', end: '', outboundEnd: '', data };
  const keys = serviceDateKeys[type];
  const [startKey, endKey] = keys;
  // A restored draft may still contain the dates formerly entered on the basic step.
  // An explicitly cleared service field stays empty.
  const start = textValue(data[startKey] ?? data.start_date);
  const outboundEnd = textValue(data[endKey] ?? data.end_date);
  const end = data.booking_type === 'flight' && data.is_round_trip === true
    ? textValue(data.return_arrival_date) : outboundEnd;
  return {
    start, end, outboundEnd,
    data: { ...data, [startKey]: start, [endKey]: outboundEnd },
  };
}

const bookingSteps = (canCreateCustomers: boolean): WizardStepConfig[] => [
  {
    title: 'نوع الحجز',
    validate: (data) => typeOptions.some((option) => option.value === data.booking_type) ? {} : { booking_type: 'يرجى اختيار نوع الحجز' },
  },
  {
    title: 'البيانات الأساسية',
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (data.customer_id) return errors;
      if (!canCreateCustomers) {
        errors.customer_name = 'اختر عميلًا مسجّلًا. إضافة عميل جديد تحتاج صلاحية إنشاء العملاء.';
        return errors;
      }
      if (!String(data.customer_name ?? '').trim()) errors.customer_name = 'اختر عميلًا مسجّلًا أو أدخل اسم العميل الجديد.';
      const phone = String(data.customer_phone ?? '').trim();
      const email = String(data.customer_email ?? '').trim();
      if (!phone && !email) errors.customer_contact = 'أدخل رقم الهاتف أو البريد الإلكتروني لحفظ العميل الجديد.';
      if (email && !/^[^\s@]+@[^\s@]+$/.test(email)) errors.customer_email = 'أدخل بريدًا إلكترونيًا صحيحًا.';
      return errors;
    },
  },
  {
    title: 'التفاصيل',
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (!Number.isFinite(Number(data.selling_price)) || Number(data.selling_price) <= 0) errors.selling_price = 'سعر البيع مطلوب';
      if (data.cost_price == null || data.cost_price === '' || !Number.isFinite(Number(data.cost_price)) || Number(data.cost_price) < 0) errors.cost_price = 'أدخل تكلفة غير سالبة';
      if (Number(data.cost_price) > 0 && !data.supplier_id) errors.supplier_id = 'اختر المورد لتسجيل المستحقات';
      const policyError = termsError(data.cancellation_terms, Number(data.cost_price), Number(data.selling_price));
      if (policyError) errors.cancellation_terms = policyError;
      if (data.booking_type === 'hotel' && !data.hotel_name?.trim()) errors.hotel_name = 'اسم الفندق مطلوب';
      if (data.booking_type === 'flight' && !data.airline?.trim()) errors.airline = 'شركة الطيران مطلوبة';
      if (data.booking_type === 'car_rental' && !data.car_type?.trim()) errors.car_type = 'نوع السيارة مطلوب';
      if (data.booking_type === 'transport' && !data.vehicle_type) errors.vehicle_type = 'نوع المركبة مطلوب';

      const { start, end, outboundEnd } = bookingDates(data);
      if (data.booking_type === 'flight') {
        if (!data.departure_airport?.trim()) errors.departure_airport = 'أدخل مطار المغادرة.';
        if (!data.arrival_airport?.trim()) errors.arrival_airport = 'أدخل مطار الوصول.';
        if (!validDate(start)) errors.departure_date = 'أدخل تاريخ مغادرة صحيحًا.';
        if (!validDate(outboundEnd) || outboundEnd < start) errors.arrival_date = 'أدخل تاريخ وصول صحيحًا في يوم المغادرة أو بعده.';
        if (data.is_round_trip === true) {
          const returnDeparture = textValue(data.return_departure_date);
          if (!data.return_departure_airport?.trim()) errors.return_departure_airport = 'أدخل مطار مغادرة العودة.';
          if (!data.return_arrival_airport?.trim()) errors.return_arrival_airport = 'أدخل مطار وصول العودة.';
          if (!validDate(returnDeparture) || returnDeparture < outboundEnd) {
            errors.return_departure_date = 'أدخل تاريخ مغادرة العودة في يوم وصول الذهاب أو بعده.';
          }
          if (!validDate(end) || end < returnDeparture) {
            errors.return_arrival_date = 'أدخل تاريخ وصول العودة في يوم مغادرتها أو بعده.';
          }
        }
      } else if (!validDate(start) || !validDate(end)) {
        errors.service_dates = 'أدخل تاريخي بداية الخدمة ونهايتها.';
      } else if (end < start || (data.booking_type === 'hotel' && end === start)) {
        errors.service_dates = data.booking_type === 'hotel'
          ? 'تاريخ تسجيل الخروج لازم يكون بعد تسجيل الدخول.'
          : 'تاريخ نهاية الخدمة لازم يكون في يوم البداية أو بعده.';
      }
      return errors;
    },
  },
  { title: 'مراجعة' },
];

export const NewUnifiedBookingForm = ({ initialCustomer, missingCustomer = false }: {
  initialCustomer?: CustomerContext | null;
  missingCustomer?: boolean;
}) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = typeOptions.find(option => option.value === params.get('type'))?.value ?? '';
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const { createBooking, finishCreation } = useUnifiedBookings();
  const { hasAllPermissions } = useSupabasePermissions();
  const canCreate = hasAllPermissions(['bookings_create', 'invoices_create', 'customers_view']);
  const canCreateCustomers = hasAllPermissions(['customers_create']);
  const wizardSteps = bookingSteps(canCreateCustomers);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const activeScope = useRef('');
  activeScope.current = `${orgId}:${user?.id}`;
  const [customerSelection, setSelectedCustomer] = useState<Customer | null>(initialCustomer ?? null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const wizard = useWizardForm({
    steps: wizardSteps,
    draftKey: orgId && user?.id ? `draft_booking_${orgId}_${user.id}${initialCustomer ? `_${initialCustomer.id}` : ''}` : undefined,
    initialData: {
      booking_type: initialType, employee_id: '', customer_id: initialCustomer?.id ?? '',
      customer_name: initialCustomer?.name ?? '', supplier_id: '', supplier_name: '',
      selling_price: 0, cost_price: 0, currency: 'EGP',
      start_date: '', end_date: '', notes: '',
    },
  });

  const savedCustomer = useCustomerContext(
    orgId,
    customerSelection?.id === wizard.formData.customer_id ? null : wizard.formData.customer_id,
  );
  const selectedCustomer: Customer | null | undefined = customerSelection?.id && customerSelection.id === wizard.formData.customer_id
    ? customerSelection
    : savedCustomer.data;
  const profit = (Number(wizard.formData.selling_price) || 0) - (Number(wizard.formData.cost_price) || 0);
  const margin = Number(wizard.formData.selling_price) > 0 ? (profit / Number(wizard.formData.selling_price)) * 100 : 0;
  const bookingType = wizard.formData.booking_type as BookingType;
  const dates = bookingDates(wizard.formData);
  const serviceData = dates.data;
  const customerUnavailable = Boolean(wizard.formData.customer_id && !selectedCustomer);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    wizard.updateFields({ customer_id: customer.id, customer_name: customer.full_name || customer.name,
      customer_phone: '', customer_email: '' });
    setIsSearchOpen(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    wizard.updateFields({ customer_id: '', customer_name: '', customer_phone: '', customer_email: '' });
  };

  const handleSubmit = async () => {
    if (!orgId || !bookingType || !canCreate || createBooking.isPending || submitting.current) return;
    const firstIncompleteStep = [1, 2].find((step) => Object.keys(wizardSteps[step].validate?.(wizard.formData) ?? {}).length > 0);
    if (firstIncompleteStep !== undefined) {
      wizard.goToStep(firstIncompleteStep);
      toast.error('راجع البيانات المطلوبة في خطوة الحجز قبل الحفظ.');
      return;
    }
    const submittedScope = activeScope.current;
    submitting.current = true;
    try {
      let verifiedCustomer: CustomerContext | null = null;
      if (wizard.formData.customer_id) {
        try {
          verifiedCustomer = await readActiveCustomer(orgId, wizard.formData.customer_id);
        } catch {
          return toast.error('تعذر التحقق من العميل المرتبط بالحجز');
        }
        if (!verifiedCustomer) return toast.error('اختر عميلاً متاحًا في الشركة الحالية');
      }
      if (!mounted.current || activeScope.current !== submittedScope) return;

      // جمع التفاصيل حسب النوع
      const hotelKeys = ['hotel_name', 'room_type', 'board_type', 'nights', 'check_in', 'check_out', 'rooms', 'star_rating', 'city', 'adults', 'children', 'children_ages', 'meal_plan', 'cancellation_policy', 'booking_reference', 'cost_per_night', 'selling_per_night'];
      const flightKeys = ['airline', 'flight_number', 'departure_airport', 'arrival_airport', 'departure_date', 'departure_time', 'arrival_date', 'arrival_time', 'pnr', 'ticket_number', 'passengers_count', 'flight_class', 'ticket_price_per_person', 'taxes_and_fees', 'is_round_trip', 'seat_preferences', 'meal_preferences', 'return_flight_number', 'return_departure_airport', 'return_arrival_airport', 'return_departure_date', 'return_departure_time', 'return_arrival_date', 'return_arrival_time'];
      const carKeys = ['car_type', 'pickup_location', 'dropoff_location', 'daily_rate', 'pickup_date', 'dropoff_date', 'insurance_included'];
      const transportKeys = ['vehicle_type', 'route', 'pickup_point', 'dropoff_point', 'passengers', 'pickup_time'];

      const keyMap: Record<string, string[]> = { hotel: hotelKeys, flight: flightKeys, car_rental: carKeys, transport: transportKeys };
      const detailKeyMap: Record<string, string> = { hotel: 'hotelDetails', flight: 'flightDetails', car_rental: 'carDetails', transport: 'transportDetails' };

      const keys = keyMap[bookingType] || [];
      const details: Record<string, unknown> = {};
      for (const key of keys) {
        if (key.startsWith('return_') && serviceData.is_round_trip !== true) continue;
        if (key === 'children_ages' && !(Number(serviceData.children) > 0)) continue;
        const value = serviceData[key];
        if (value != null && value !== '') details[key] = value;
      }

      const result = await createBooking.mutateAsync({
        booking_type: bookingType,
        customer_id: verifiedCustomer?.id,
        customer_name: verifiedCustomer?.name || textValue(wizard.formData.customer_name).trim() || undefined,
        customer_phone: wizard.formData.customer_id ? undefined : textValue(wizard.formData.customer_phone).trim() || undefined,
        customer_email: wizard.formData.customer_id ? undefined : textValue(wizard.formData.customer_email).trim() || undefined,
        employee_id: wizard.formData.employee_id || undefined,
        supplier_id: wizard.formData.supplier_id || undefined,
        supplier_name: wizard.formData.supplier_name || undefined,
        selling_price: Number(wizard.formData.selling_price),
        cost_price: Number(wizard.formData.cost_price),
        currency: wizard.formData.currency,
        start_date: dates.start,
        end_date: dates.end,
        notes: wizard.formData.notes || undefined,
        cancellation_terms: wizard.formData.cancellation_terms ?? emptyTerms,
        [detailKeyMap[bookingType]]: Object.keys(details).length > 0 ? details : undefined,
      });

      // The server already generated the canonical invoice, supplier obligation,
      // voucher and event. Do not start a second client-side invoice workflow.
      if (!mounted.current || activeScope.current !== submittedScope) return;
      wizard.clearDraft();
      finishCreation();
      navigate(`/bookings/${result.id}`);
    } catch {
      // The mutation displays the server error; preserve the form and draft.
    } finally {
      submitting.current = false;
    }
  };

  // ملصقات الحقول للمراجعة
  const reviewLabels: Record<string, string> = {
    hotel_name: 'الفندق', star_rating: 'التصنيف', city: 'المدينة', room_type: 'نوع الغرفة',
    rooms: 'عدد الغرف', check_in: 'الدخول', check_out: 'الخروج', nights: 'الليالي',
    adults: 'البالغين', children: 'الأطفال', children_ages: 'أعمار الأطفال', meal_plan: 'الوجبات', booking_reference: 'مرجع المورد',
    cost_per_night: 'تكلفة الليلة', selling_per_night: 'بيع الليلة', cancellation_policy: 'ملاحظات الإلغاء',
    airline: 'شركة الطيران', flight_number: 'رقم الرحلة', flight_class: 'درجة السفر',
    departure_airport: 'مطار المغادرة', arrival_airport: 'مطار الوصول',
    departure_date: 'تاريخ المغادرة', departure_time: 'وقت المغادرة',
    arrival_date: 'تاريخ الوصول', arrival_time: 'وقت الوصول',
    passengers_count: 'المسافرين', ticket_price_per_person: 'سعر التذكرة',
    taxes_and_fees: 'الضرائب', pnr: 'PNR', ticket_number: 'رقم التذكرة',
    is_round_trip: 'ذهاب وعودة', seat_preferences: 'تفضيل المقعد', meal_preferences: 'تفضيل الوجبة',
    return_flight_number: 'رقم رحلة العودة', return_departure_airport: 'مطار مغادرة العودة',
    return_arrival_airport: 'مطار وصول العودة', return_departure_date: 'تاريخ مغادرة العودة',
    return_departure_time: 'وقت مغادرة العودة', return_arrival_date: 'تاريخ وصول العودة', return_arrival_time: 'وقت وصول العودة',
    car_type: 'نوع السيارة', daily_rate: 'السعر اليومي',
    pickup_location: 'موقع الاستلام', dropoff_location: 'موقع التسليم',
    pickup_date: 'تاريخ الاستلام', dropoff_date: 'تاريخ التسليم',
    insurance_included: 'تأمين شامل',
    vehicle_type: 'نوع المركبة', route: 'المسار',
    pickup_point: 'نقطة الالتقاط', dropoff_point: 'نقطة التوصيل', passengers: 'الركاب', pickup_time: 'وقت الالتقاط',
  };

  const getReviewFields = () => {
    const keyMap: Record<string, string[]> = {
      hotel: ['hotel_name', 'star_rating', 'city', 'room_type', 'rooms', 'nights', 'adults', 'children', 'children_ages', 'meal_plan', 'booking_reference', 'cost_per_night', 'selling_per_night', 'cancellation_policy'],
      flight: ['airline', 'flight_number', 'flight_class', 'departure_airport', 'arrival_airport', 'departure_date', 'departure_time', 'arrival_date', 'arrival_time', 'passengers_count', 'ticket_price_per_person', 'taxes_and_fees', 'pnr', 'ticket_number', 'is_round_trip', 'seat_preferences', 'meal_preferences', 'return_flight_number', 'return_departure_airport', 'return_arrival_airport', 'return_departure_date', 'return_departure_time', 'return_arrival_date', 'return_arrival_time'],
      car_rental: ['car_type', 'daily_rate', 'pickup_location', 'dropoff_location', 'insurance_included'],
      transport: ['vehicle_type', 'route', 'pickup_point', 'dropoff_point', 'passengers', 'pickup_time'],
    };
    return (keyMap[bookingType] || []).filter(key => {
      if (key.startsWith('return_') && serviceData.is_round_trip !== true) return false;
      if (key === 'children_ages' && !(Number(serviceData.children) > 0)) return false;
      return serviceData[key] != null && serviceData[key] !== '';
    });
  };

  const formatReviewValue = (key: string, value: unknown): string => {
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (key === 'star_rating') return '⭐'.repeat(Number(value));
    return String(value);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold">إنشاء حجز جديد</h1>
      {!canCreate && <p role="alert" className="text-sm text-destructive">حفظ الحجز يحتاج صلاحيات إنشاء الحجوزات والفواتير وعرض العملاء.</p>}

      <fieldset disabled={createBooking.isPending}>
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
                {(['umrah', 'hajj'] as const).map((programType) => (
                  <button key={programType} type="button" onClick={() => navigate(`/pilgrimage?type=${programType}`)}
                    className="rounded-lg border-2 border-border p-6 text-center transition-all hover:border-primary hover:shadow-md">
                    <div className="font-semibold">{programType === 'hajj' ? 'حج' : 'عمرة'}</div>
                    <div className="text-sm text-muted-foreground">اختيار الدفعة والحجز من رصيدها</div>
                  </button>
                ))}
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

        {/* Step 2: customer and staff */}
        {missingCustomer && <p role="status" className="text-sm text-muted-foreground">تعذر اختيار العميل من الرابط. اختر عميلاً من الشركة الحالية.</p>}
        {wizard.currentStep === 1 && (
          <Card>
            <CardHeader><CardTitle>البيانات الأساسية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* اختيار العميل */}
              <div>
                <Label htmlFor="booking-customer-name">العميل *</Label>
                <div className="mt-1 flex flex-wrap gap-2 sm:flex-nowrap">
                  <Input
                    id="booking-customer-name"
                    value={wizard.formData.customer_name || ''}
                    onChange={e => wizard.updateFields({ customer_id: '', customer_name: e.target.value })}
                    placeholder={canCreateCustomers ? 'اختر عميلًا أو اكتب اسم عميل جديد' : 'اختر عميلًا مسجّلًا'}
                    readOnly={!!selectedCustomer || !canCreateCustomers}
                    aria-invalid={Boolean(wizard.errors.customer_name || (customerUnavailable && !savedCustomer.isLoading))}
                    className={selectedCustomer ? 'bg-muted/50' : ''}
                  />
                  <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" type="button"><Search className="h-4 w-4" aria-hidden="true" /> بحث عن عميل</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader><DialogTitle>البحث عن عميل</DialogTitle></DialogHeader>
                      <CustomerSearch
                        onCustomerSelect={handleCustomerSelect}
                        selectedCustomer={selectedCustomer ? { ...selectedCustomer, phone: selectedCustomer.phone || '' } : null}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                <FieldError error={wizard.errors.customer_name} />
                {customerUnavailable && (
                  <p role="status" className="mt-2 text-sm text-muted-foreground">
                    {savedCustomer.isLoading ? 'جاري التحقق من العميل…' : 'تعذر التحقق من العميل في هذه الشركة. اختر السجل من البحث.'}
                  </p>
                )}
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

              {!wizard.formData.customer_id && canCreateCustomers && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <p className="text-sm text-muted-foreground md:col-span-2">للعميل الجديد، أدخل هاتفًا أو بريدًا إلكترونيًا. سيتم إنشاء العميل عند حفظ الحجز.</p>
                  <div>
                    <Label htmlFor="booking-customer-phone">هاتف العميل الجديد</Label>
                    <Input id="booking-customer-phone" type="tel" value={wizard.formData.customer_phone || ''} onChange={e => wizard.updateField('customer_phone', e.target.value)} aria-invalid={Boolean(wizard.errors.customer_contact)} />
                  </div>
                  <div>
                    <Label htmlFor="booking-customer-email">بريد العميل الجديد</Label>
                    <Input id="booking-customer-email" type="email" value={wizard.formData.customer_email || ''} onChange={e => wizard.updateField('customer_email', e.target.value)} aria-invalid={Boolean(wizard.errors.customer_email || wizard.errors.customer_contact)} />
                    <FieldError error={wizard.errors.customer_email} />
                  </div>
                  {wizard.errors.customer_contact && <div className="md:col-span-2"><FieldError error={wizard.errors.customer_contact} /></div>}
                </div>
              )}

              <BookingSalesStaffSelect value={wizard.formData.employee_id ?? ''} enabled={canCreate}
                disabled={createBooking.isPending} onChange={value => wizard.updateField('employee_id', value)} />
              <WizardNavButtons onBack={() => wizard.goBack()} onNext={() => wizard.goNext()} nextDisabled={!canCreate || customerUnavailable} />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Type-specific Details */}
        {wizard.currentStep === 2 && (
          <Card>
            <CardHeader><CardTitle>تفاصيل {typeOptions.find(t => t.value === bookingType)?.label}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {bookingType === 'hotel' && (
                <UnifiedHotelFields formData={serviceData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}
              {bookingType === 'flight' && (
                <UnifiedFlightFields formData={serviceData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}
              {bookingType === 'car_rental' && (
                <UnifiedCarFields formData={serviceData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}
              {bookingType === 'transport' && (
                <UnifiedTransportFields formData={serviceData} updateField={wizard.updateField} updateFields={wizard.updateFields} errors={wizard.errors} />
              )}

              {bookingType === 'transport' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="booking-transport-start">تاريخ بداية النقل *</Label>
                    <Input id="booking-transport-start" type="date" value={dates.start} onChange={e => wizard.updateField('start_date', e.target.value)} aria-invalid={Boolean(wizard.errors.service_dates)} />
                  </div>
                  <div>
                    <Label htmlFor="booking-transport-end">تاريخ نهاية النقل *</Label>
                    <Input id="booking-transport-end" type="date" value={dates.end} onChange={e => wizard.updateField('end_date', e.target.value)} aria-invalid={Boolean(wizard.errors.service_dates)} />
                  </div>
                </div>
              )}
              <FieldError error={wizard.errors.service_dates} />

              <div>
                <Label>ملاحظات</Label>
                <Textarea value={wizard.formData.notes} onChange={e => wizard.updateField('notes', e.target.value)} />
              </div>

              {/* الأسعار والعملة */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  الأسعار والتكاليف
                </h3>
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

                <div className="mt-4">
                  <SupplierSelection
                    selectedSupplierId={wizard.formData.supplier_id || ''}
                    selectedSupplierName={wizard.formData.supplier_name || ''}
                    onSupplierSelect={(id, name) => wizard.updateFields({ supplier_id: id, supplier_name: name })}
                    supplierType={bookingType === 'hotel' ? 'hotel' : bookingType === 'flight' ? 'airline' : bookingType === 'transport' ? 'transport' : undefined}
                  />
                  <FieldError error={wizard.errors.supplier_id} />
                </div>

                {/* الربح */}
                <div className={`mt-4 p-4 rounded-lg border-2 ${profit >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
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
              </div>
              <BookingCancellationTermsFields value={wizard.formData.cancellation_terms} currency={wizard.formData.currency}
                onChange={terms => wizard.updateField('cancellation_terms', terms)} />
              <FieldError error={wizard.errors.cancellation_terms} />
              <WizardNavButtons onBack={() => wizard.goBack()} onNext={() => wizard.goNext()} nextDisabled={!canCreate} nextLabel="مراجعة" />
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
                {bookingType !== 'flight' && (
                  <>
                    <ReviewRow label={bookingType === 'hotel' ? 'تسجيل الدخول' : bookingType === 'car_rental' ? 'تاريخ الاستلام' : 'بداية النقل'} value={dates.start || '—'} />
                    <ReviewRow label={bookingType === 'hotel' ? 'تسجيل الخروج' : bookingType === 'car_rental' ? 'تاريخ التسليم' : 'نهاية النقل'} value={dates.end || '—'} />
                  </>
                )}
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
                      <ReviewRow key={k} label={reviewLabels[k] || k} value={formatReviewValue(k, serviceData[k])} />
                    ))}
                  </div>
                </div>
              )}

              <BookingCancellationTermsSummary terms={wizard.formData.cancellation_terms ?? emptyTerms} currency={wizard.formData.currency} />

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
                nextDisabled={!canCreate}
                submitLabel={createBooking.isPending ? 'جاري الحفظ...' : 'تأكيد وحفظ الحجز'}
              />
            </CardContent>
          </Card>
        )}
      </StepWizard>
      </fieldset>
    </div>
  );
};

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-sm text-muted-foreground">{label}: </span>
    <span className="font-medium">{value}</span>
  </div>
);

const NewUnifiedBooking = () => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const [params] = useSearchParams();
  const customerId = params.get('customer_id') ?? params.get('customer');
  const customer = useCustomerContext(orgId, customerId);
  if (customer.isLoading) return <p className="p-6 text-center">جاري التحقق من العميل...</p>;
  return (
    <NewUnifiedBookingForm
      key={`${orgId}:${user?.id}:${params.get('type') ?? ''}:${customerId ?? ''}`}
      initialCustomer={customer.data}
      missingCustomer={Boolean(customerId && !customer.data)}
    />
  );
};

export default NewUnifiedBooking;
