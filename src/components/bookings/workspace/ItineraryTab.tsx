import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Hotel, Plane, Car, Truck, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { AddServiceBookingDialog } from './AddServiceBookingDialog';
import { useBookingServices, type ServiceKind } from '@/hooks/useBookingServices';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

const KIND_META: Record<ServiceKind, { title: string; icon: React.ReactNode; add: string }> = {
  hotel: { title: 'الفنادق', icon: <Hotel className="h-4 w-4" />, add: 'إضافة فندق' },
  flight: { title: 'الطيران', icon: <Plane className="h-4 w-4" />, add: 'إضافة طيران' },
  transport: { title: 'الانتقالات', icon: <Truck className="h-4 w-4" />, add: 'إضافة انتقالات' },
  car: { title: 'تأجير السيارات', icon: <Car className="h-4 w-4" />, add: 'إضافة تأجير سيارة' },
};

const KINDS: ServiceKind[] = ['hotel', 'flight', 'transport', 'car'];

const fmtMoney = (v: number, currency?: string | null) =>
  `${(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency || 'EGP'}`;

export const ItineraryTab = ({ workspace }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const booking = (workspace as any).booking;
  const bookingId: string | undefined = booking?.id;
  const [openKind, setOpenKind] = useState<ServiceKind | null>(null);

  const { data: services = [], isLoading } = useBookingServices(bookingId);
  const legacy = workspace.itinerary;

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['booking-linked-services', bookingId] });
    queryClient.invalidateQueries({ queryKey: ['booking-workspace'] });
    queryClient.invalidateQueries({ queryKey: ['booking-financials'] });
    queryClient.invalidateQueries({ queryKey: ['booking-profit-cockpit'] });
    workspace.refetch();
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((kind) => (
            <Button
              key={kind}
              size="sm"
              variant="outline"
              disabled={!bookingId}
              onClick={() => setOpenKind(kind)}
            >
              <Plus className="h-4 w-4 ml-1" />
              {KIND_META[kind].add}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">خدمات البرنامج المرتبطة بملف العميل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
              </div>
            ) : services.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد خدمات مضافة بعد. استخدم الأزرار بالأعلى لإضافة حجز فندق أو طيران أو انتقالات
                بالنموذج المعتمد، وسيحصل كل حجز على رقم مستقل وبيانات المورد الخاصة به.
              </p>
            ) : (
              services.map((s) => (
                <div
                  key={`${s.kind}-${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {KIND_META[s.kind].icon}
                      <span className="font-medium">{s.title}</span>
                      <Badge variant="outline">{s.reference}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                      {s.supplierName && <span>المورد: {s.supplierName}</span>}
                      {s.dateFrom && (
                        <span>
                          {s.dateFrom}
                          {s.dateTo ? ` ← ${s.dateTo}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-left">
                      <div className="font-semibold">{fmtMoney(s.selling, s.currency)}</div>
                      <div className="text-xs text-muted-foreground">
                        التكلفة: {fmtMoney(s.cost, s.currency)}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => navigate(s.detailsPath)}>
                      <ExternalLink className="h-4 w-4 ml-1" />
                      فتح
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {(legacy?.hotel || legacy?.flight || legacy?.transport || legacy?.car) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تفاصيل مسجلة سابقًا (للقراءة فقط)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">
                هذه بيانات مختصرة أُدخلت قبل اعتماد نماذج الحجوزات الكاملة. أضِف الحجز بالنموذج
                المعتمد للحصول على رقم حجز ومورد وتفاصيل كاملة.
              </p>
              <Separator />
              <LegacyBlock title="الفندق" data={legacy?.hotel} />
              <LegacyBlock title="الطيران" data={legacy?.flight} />
              <LegacyBlock title="النقل" data={legacy?.transport} />
              <LegacyBlock title="تأجير سيارة" data={legacy?.car} />
            </CardContent>
          </Card>
        )}
      </div>

      {bookingId && openKind && (
        <AddServiceBookingDialog
          open={!!openKind}
          onOpenChange={(o) => !o && setOpenKind(null)}
          kind={openKind}
          bookingId={bookingId}
          bookingNumber={booking?.booking_number}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

const HIDDEN_KEYS = new Set(['id', 'booking_id', 'created_at', 'updated_at']);

const LegacyBlock = ({ title, data }: { title: string; data: any }) => {
  if (!data) return null;
  const entries = Object.entries(data).filter(
    ([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== '',
  );
  if (!entries.length) return null;
  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-muted-foreground text-xs">{k}</span>
            <span className="text-xs font-medium truncate">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
