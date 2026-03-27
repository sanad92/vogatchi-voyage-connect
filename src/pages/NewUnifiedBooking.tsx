
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedBookings, BookingType } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hotel, Plane, Car, Truck, ArrowRight, ArrowLeft, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

const typeOptions = [
  { value: 'hotel' as BookingType, label: 'حجز فندق', icon: Hotel, desc: 'فنادق ومنتجعات' },
  { value: 'flight' as BookingType, label: 'حجز طيران', icon: Plane, desc: 'تذاكر طيران' },
  { value: 'car_rental' as BookingType, label: 'تأجير سيارات', icon: Car, desc: 'إيجار سيارات' },
  { value: 'transport' as BookingType, label: 'نقل', icon: Truck, desc: 'خدمات النقل' },
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

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold">إنشاء حجز جديد</h1>

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
            <div>
              <Label>الربح المتوقع</Label>
              <div className="p-3 bg-muted rounded-md font-bold text-lg">
                {((Number(formData.selling_price) || 0) - (Number(formData.cost_price) || 0)).toLocaleString()} {formData.currency}
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
              <Button onClick={handleSubmit} disabled={createBooking.isPending}>
                <Save className="h-4 w-4 ml-1" />
                {createBooking.isPending ? 'جاري الحفظ...' : 'حفظ الحجز'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewUnifiedBooking;
