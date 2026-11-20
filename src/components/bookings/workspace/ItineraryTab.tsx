import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hotel, Plane, Car, Truck, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { AddServiceBookingDialog } from './AddServiceBookingDialog';
import { TripServicesMoneySummary } from './TripServicesMoneySummary';
import { useBookingServices, type ServiceKind } from '@/hooks/useBookingServices';
import { useTripServiceAmendmentHistory } from '@/hooks/useTripServiceAmendments';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { getTravelServiceSections, type TravelServiceSection } from '@/lib/travelDocuments';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
  canEdit: boolean;
  financialsIssued: boolean;
  onRequestEdit: () => void;
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

export const ItineraryTab = ({ workspace, canEdit, financialsIssued, onRequestEdit }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const booking = workspace.booking;
  const bookingId: string | undefined = booking?.id;
  const [openKind, setOpenKind] = useState<ServiceKind | null>(null);
  const { hasPermission } = useSupabasePermissions();
  const canViewFinance = hasPermission('financial_view');

  const { data: services = [], isLoading, isError, error, refetch } = useBookingServices(bookingId);
  const history = useTripServiceAmendmentHistory(bookingId);
  const amendments = history.data ?? [];
  const sections = getTravelServiceSections({ booking, itinerary: workspace.itinerary, linkedServices: services, amendments });
  const failed = isError || history.isError || workspace.itineraryError;
  const activeLinked = services.filter(service =>
    sections.some(section => section.source === 'linked' && section.serviceId === service.id &&
      section.kind === service.kind && !section.cancelled));

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
          {financialsIssued ? <Button size="sm" variant="outline" onClick={onRequestEdit}>التعديلات والتسويات</Button>
            : !canEdit && <Button size="sm" variant="outline" onClick={onRequestEdit}>طلب فتح التعديل</Button>}
          {canEdit && !financialsIssued && KINDS.map((kind) => (
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
            <CardTitle className="text-base">خدمات البرنامج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading || history.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
              </div>
            ) : failed ? (
              <div className="rounded-md border border-destructive/30 p-4 space-y-2">
                <p className="text-sm text-destructive" role="alert">
                  {(error as Error)?.message || 'تعذر تحميل خدمات البرنامج'}
                </p>
                <Button variant="outline" size="sm" onClick={() => {
                  void refetch();
                  void history.refetch();
                  void workspace.refreshItinerary();
                }}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد خدمات مضافة إلى ملف الحجز.
              </p>
            ) : (
              sections.map(section => {
                const linked = section.source === 'linked'
                  ? services.find(service => service.id === section.serviceId && service.kind === section.kind)
                  : undefined;
                const hotelRates = canViewFinance && section.source === 'detail' && section.kind === 'hotel'
                  ? workspace.itinerary?.hotel : null;
                return <div key={`${section.source}-${section.kind}-${section.serviceId}`}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {KIND_META[section.kind].icon}
                      <span className="font-medium">{section.title}</span>
                      {linked && <Badge variant="outline">{linked.reference}</Badge>}
                      {section.cancelled && <Badge variant="destructive">ملغاة</Badge>}
                    </div>
                    <ServiceFacts section={section} />
                    {linked?.supplierName && <p className="text-xs text-muted-foreground">المورد: {linked.supplierName}</p>}
                    {hotelRates && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {hotelRates.selling_per_night != null && <span>سعر البيع لليلة: {fmtMoney(hotelRates.selling_per_night, booking?.currency)}</span>}
                      {hotelRates.cost_per_night != null && <span>تكلفة الليلة: {fmtMoney(hotelRates.cost_per_night, booking?.currency)}</span>}
                    </div>}
                  </div>
                  {linked && <div className="flex items-center gap-4">
                    {canViewFinance && <div className="text-sm text-left">
                      <div className="font-semibold">{fmtMoney(linked.selling, linked.currency)}</div>
                      <div className="text-xs text-muted-foreground">التكلفة: {fmtMoney(linked.cost, linked.currency)}</div>
                    </div>}
                    <Button size="sm" variant="ghost" onClick={() => navigate(linked.detailsPath)}>
                      <ExternalLink className="h-4 w-4 ml-1" /> فتح
                    </Button>
                  </div>}
                </div>;
              })
            )}
          </CardContent>
        </Card>

        {canViewFinance && !failed && activeLinked.length > 0 && <TripServicesMoneySummary services={activeLinked} />}

        {amendments.length > 0 && <Card>
          <CardHeader><CardTitle className="text-base">التعديلات والإلغاءات المنفذة</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {amendments.map(a => <div key={`${a.service_id}:${a.ticket_number}:${a.applied_at}`} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={a.operation === 'cancel' ? 'destructive' : 'secondary'}>{a.operation === 'cancel' ? 'إلغاء' : 'تعديل تواريخ'}</Badge>
              <span>{KIND_META[a.service_kind].title}</span>
              {a.ticket_number && <span>تذكرة {a.ticket_number}</span>}
              {a.new_ticket && <span>التذكرة البديلة {a.new_ticket}</span>}
              {a.start_date && <span>{a.start_date} إلى {a.end_date}</span>}
            </div>)}
          </CardContent>
        </Card>}

      </div>

      {bookingId && openKind && canEdit && !financialsIssued && (
        <AddServiceBookingDialog
          open={!!openKind}
          onOpenChange={(o) => !o && setOpenKind(null)}
          kind={openKind}
          bookingId={bookingId}
          bookingNumber={booking?.booking_number}
          bookingCustomerId={booking?.customer_id}
          bookingCustomerName={booking?.customer_name}
          bookingCurrency={booking?.currency}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

const ServiceFacts = ({ section }: { section: TravelServiceSection }) => (
  <>
    {section.subtitle && <p className="text-xs text-muted-foreground">{section.subtitle}</p>}
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {section.facts.map(({ label, value }) => (
        <div key={label} className="flex flex-wrap gap-1">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
    {section.notes?.map((note) => <p key={note} className="text-xs text-muted-foreground">{note}</p>)}
  </>
);
