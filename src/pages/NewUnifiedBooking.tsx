
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedBookings, BookingType } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hotel, Plane, Car, Truck, ArrowRight, ArrowLeft, Save, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

const typeOptions = [
  { value: 'hotel' as BookingType, label: 'حجز فندق', icon: Hotel, desc: 'فنادق ومنتجعات' },
  { value: 'flight' as BookingType, label: 'حجز طيران', icon: Plane, desc: 'تذاكر طيران' },
  { value: 'car_rental' as BookingType, label: 'تأجير سيارات', icon: Car, desc: 'إيجار سيارات' },
  { value: 'transport' as BookingType, label: 'نقل', icon: Truck, desc: 'خدمات النقل' },
];

const steps = [
  { num: 1, label: 'نوع الحجز' },
  { num: 2, label: 'البيانات الأساسية' },
  { num: 3, label: 'التفاصيل' },
  { num: 4, label: 'مراجعة' },
];

const NewUnifiedBooking = () => {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { createBooking } = useUnifiedBookings();
  const [step, setStep] = useState(1);
  const [bookingType, setBookingType] = useState<BookingType | ''>('');
  const [formData, setFormData] = useState<any>({
    customer_id: '', customer_name: '', supplier_name: '',
    selling_price: 0, cost_price: 0, currency: 'EGP',
    start_date: '', end_date: '', notes: '',
  });
  const [details, setDetails] = useState<any>({});

  const { data: customers } = useQuery({
    queryKey: ['customers-list', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').limit(500);
      return data || [];
    },
    enabled: !!orgId,
  });

  const profit = (Number(formData.selling_price) || 0) - (Number(formData.cost_price) || 0);
  const margin = Number(formData.selling_price) > 0 ? (profit / Number(formData.selling_price)) * 100 : 0;

  const handleSubmit = async () => {
    if (!bookingType) return;
    const detailKey = bookingType === 'hotel' ? 'hotelDetails' :
      bookingType === 'flight' ? 'flightDetails' :
      bookingType === 'car_rental' ? 'carDetails' : 'transportDetails';

    await createBooking.mutateAsync({
      booking_type: bookingType,
      customer_id: formData.customer_id || undefined,
      customer_name: formData.customer_name || undefined,
      supplier_name: formData.supplier_name || undefined,
      selling_price: Number(formData.selling_price) || 0,
      cost_price: Number(formData.cost_price) || 0,
      currency: formData.currency,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      notes: formData.notes || undefined,
      [detailKey]: Object.keys(details).length > 0 ? details : undefined,
    });
    navigate('/bookings');
  };

  const updateField = (key: string, val: any) => setFormData((p: any) => ({ ...p, [key]: val }));
  const updateDetail = (key: string, val: any) => setDetails((p: any) => ({ ...p, [key]: val }));

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

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold">إنشاء حجز جديد</h1>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                step > s.num ? 'bg-primary text-primary-foreground border-primary' :
                step === s.num ? 'border-primary text-primary bg-primary/10' :
                'border-muted-foreground/30 text-muted-foreground'
              }`}>
                {step > s.num ? <Check className="h-5 w-5" /> : s.num}
              </div>
              <span className={`text-xs mt-1 ${step >= s.num ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mt-[-16px] ${step > s.num ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Type */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>اختر نوع الحجز</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {typeOptions.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.value}
                    onClick={() => { setBookingType(t.value); setStep(2); }}
                    className={`p-6 rounded-lg border-2 text-center transition-all hover:border-primary hover:shadow-md ${bookingType === t.value ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-sm text-muted-foreground">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Base Info */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>البيانات الأساسية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>العميل</Label>
                <Select value={formData.customer_id} onValueChange={(v) => {
                  const cust = customers?.find((c: any) => c.id === v);
                  updateField('customer_id', v);
                  if (cust) updateField('customer_name', cust.name);
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر عميل" /></SelectTrigger>
                  <SelectContent>
                    {(customers || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>اسم المورد</Label>
                <Input value={formData.supplier_name} onChange={(e) => updateField('supplier_name', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>سعر البيع</Label>
                <Input type="number" value={formData.selling_price} onChange={(e) => updateField('selling_price', e.target.value)} />
              </div>
              <div>
                <Label>التكلفة</Label>
                <Input type="number" value={formData.cost_price} onChange={(e) => updateField('cost_price', e.target.value)} />
              </div>
              <div>
                <Label>العملة</Label>
                <Select value={formData.currency} onValueChange={(v) => updateField('currency', v)}>
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
                <Input type="date" value={formData.start_date} onChange={(e) => updateField('start_date', e.target.value)} />
              </div>
              <div>
                <Label>تاريخ النهاية</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => updateField('end_date', e.target.value)} />
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
                    {profit.toLocaleString()} {formData.currency}
                  </span>
                  <span className={`mr-2 text-sm ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({margin.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowRight className="h-4 w-4 ml-1" />رجوع
              </Button>
              <Button onClick={() => setStep(3)}>
                التالي<ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Type-specific Details */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>تفاصيل {typeOptions.find(t => t.value === bookingType)?.label}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {bookingType === 'hotel' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>اسم الفندق</Label><Input value={details.hotel_name || ''} onChange={(e) => updateDetail('hotel_name', e.target.value)} /></div>
                <div><Label>نوع الغرفة</Label><Input value={details.room_type || ''} onChange={(e) => updateDetail('room_type', e.target.value)} /></div>
                <div><Label>الإقامة</Label><Input value={details.board_type || ''} onChange={(e) => updateDetail('board_type', e.target.value)} placeholder="مثال: إفطار فقط" /></div>
                <div><Label>عدد الليالي</Label><Input type="number" value={details.nights || ''} onChange={(e) => updateDetail('nights', Number(e.target.value))} /></div>
                <div><Label>تسجيل الدخول</Label><Input type="date" value={details.check_in || ''} onChange={(e) => updateDetail('check_in', e.target.value)} /></div>
                <div><Label>تسجيل الخروج</Label><Input type="date" value={details.check_out || ''} onChange={(e) => updateDetail('check_out', e.target.value)} /></div>
              </div>
            )}
            {bookingType === 'flight' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>شركة الطيران</Label><Input value={details.airline || ''} onChange={(e) => updateDetail('airline', e.target.value)} /></div>
                <div><Label>رقم الرحلة</Label><Input value={details.flight_number || ''} onChange={(e) => updateDetail('flight_number', e.target.value)} /></div>
                <div><Label>مطار المغادرة</Label><Input value={details.departure_airport || ''} onChange={(e) => updateDetail('departure_airport', e.target.value)} /></div>
                <div><Label>مطار الوصول</Label><Input value={details.arrival_airport || ''} onChange={(e) => updateDetail('arrival_airport', e.target.value)} /></div>
                <div><Label>تاريخ المغادرة</Label><Input type="date" value={details.departure_date || ''} onChange={(e) => updateDetail('departure_date', e.target.value)} /></div>
                <div><Label>رقم التذكرة</Label><Input value={details.ticket_number || ''} onChange={(e) => updateDetail('ticket_number', e.target.value)} /></div>
              </div>
            )}
            {bookingType === 'car_rental' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>نوع السيارة</Label><Input value={details.car_type || ''} onChange={(e) => updateDetail('car_type', e.target.value)} /></div>
                <div><Label>موقع الاستلام</Label><Input value={details.pickup_location || ''} onChange={(e) => updateDetail('pickup_location', e.target.value)} /></div>
                <div><Label>موقع التسليم</Label><Input value={details.dropoff_location || ''} onChange={(e) => updateDetail('dropoff_location', e.target.value)} /></div>
                <div><Label>السعر اليومي</Label><Input type="number" value={details.daily_rate || ''} onChange={(e) => updateDetail('daily_rate', Number(e.target.value))} /></div>
                <div><Label>تاريخ الاستلام</Label><Input type="date" value={details.pickup_date || ''} onChange={(e) => updateDetail('pickup_date', e.target.value)} /></div>
                <div><Label>تاريخ التسليم</Label><Input type="date" value={details.dropoff_date || ''} onChange={(e) => updateDetail('dropoff_date', e.target.value)} /></div>
              </div>
            )}
            {bookingType === 'transport' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>نوع المركبة</Label><Input value={details.vehicle_type || ''} onChange={(e) => updateDetail('vehicle_type', e.target.value)} /></div>
                <div><Label>المسار</Label><Input value={details.route || ''} onChange={(e) => updateDetail('route', e.target.value)} /></div>
                <div><Label>نقطة الالتقاط</Label><Input value={details.pickup_point || ''} onChange={(e) => updateDetail('pickup_point', e.target.value)} /></div>
                <div><Label>نقطة التوصيل</Label><Input value={details.dropoff_point || ''} onChange={(e) => updateDetail('dropoff_point', e.target.value)} /></div>
                <div><Label>عدد الركاب</Label><Input type="number" value={details.passengers || ''} onChange={(e) => updateDetail('passengers', Number(e.target.value))} /></div>
              </div>
            )}
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowRight className="h-4 w-4 ml-1" />رجوع
              </Button>
              <Button onClick={() => setStep(4)}>
                مراجعة<ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>مراجعة الحجز</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Type */}
            <div className="flex items-center gap-2 text-lg font-semibold">
              {(() => { const t = typeOptions.find(t => t.value === bookingType); const Icon = t?.icon || Hotel; return <><Icon className="h-5 w-5 text-primary" />{t?.label}</>; })()}
            </div>

            {/* Base Info */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50">
              <ReviewRow label="العميل" value={formData.customer_name || '—'} />
              <ReviewRow label="المورد" value={formData.supplier_name || '—'} />
              <ReviewRow label="تاريخ البداية" value={formData.start_date || '—'} />
              <ReviewRow label="تاريخ النهاية" value={formData.end_date || '—'} />
            </div>

            {/* Financial */}
            <div className={`p-4 rounded-lg border-2 ${profit >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">سعر البيع</div>
                  <div className="text-lg font-bold">{Number(formData.selling_price).toLocaleString()} {formData.currency}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">التكلفة</div>
                  <div className="text-lg font-bold">{Number(formData.cost_price).toLocaleString()} {formData.currency}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">الربح ({margin.toFixed(1)}%)</div>
                  <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit.toLocaleString()} {formData.currency}
                  </div>
                </div>
              </div>
            </div>

            {/* Type Details */}
            {Object.keys(details).length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-3">تفاصيل {typeOptions.find(t => t.value === bookingType)?.label}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(details)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => (
                      <ReviewRow key={k} label={fieldLabels[k] || k} value={String(v)} />
                    ))}
                </div>
              </div>
            )}

            {formData.notes && (
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-1">ملاحظات</h3>
                <p className="text-muted-foreground text-sm">{formData.notes}</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowRight className="h-4 w-4 ml-1" />رجوع
              </Button>
              <Button onClick={handleSubmit} disabled={createBooking.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {createBooking.isPending ? 'جاري الحفظ...' : 'تأكيد وحفظ الحجز'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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
