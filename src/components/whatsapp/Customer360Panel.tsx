import React from 'react';
import { Link } from 'react-router-dom';
import { useCustomer360 } from '@/hooks/useCustomer360';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, Phone, Mail, MapPin, Wallet, Calendar, Plane, Building2, MessageCircle, ExternalLink, Star, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  phone?: string | null;
  customerId?: string | null;
}

const scoreColor = (s: number) =>
  s >= 75 ? 'text-emerald-600' : s >= 50 ? 'text-blue-600' : s >= 25 ? 'text-amber-600' : 'text-muted-foreground';

const scoreLabel = (s: number) =>
  s >= 75 ? 'عميل VIP' : s >= 50 ? 'عميل نشط' : s >= 25 ? 'عميل عادي' : 'جديد';

export const Customer360Panel: React.FC<Props> = ({ phone, customerId }) => {
  const { data, isLoading } = useCustomer360(phone, customerId);

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <Card className="m-3">
        <CardContent className="p-4 text-center space-y-2">
          <User className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">لا يوجد عميل مرتبط بهذا الرقم</p>
          {phone && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/customers/new?phone=${encodeURIComponent(phone)}`}>
                إنشاء ملف عميل
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const { customer, stats, hotelBookings, flightBookings, bookings } = data;
  const lastHotel = hotelBookings[0];
  const lastFlight = flightBookings[0];

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-base">{customer.name || customer.full_name}</div>
              {customer.segment && (
                <Badge style={{ backgroundColor: customer.segment.color || undefined }} className="text-white text-[10px] mt-1">
                  {customer.segment.name_ar || customer.segment.name}
                </Badge>
              )}
            </div>
            <Button asChild size="icon" variant="ghost">
              <Link to={`/customers/${customer.id}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            {customer.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {customer.phone}</div>}
            {customer.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {customer.email}</div>}
            {customer.nationality && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {customer.nationality}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Customer Score */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Star className="h-3.5 w-3.5" /> تقييم العميل
            </div>
            <div className={`text-lg font-bold ${scoreColor(stats.customerScore)}`}>
              {stats.customerScore}
            </div>
          </div>
          <Progress value={stats.customerScore} className="h-1.5" />
          <div className={`text-xs ${scoreColor(stats.customerScore)} font-medium`}>
            {scoreLabel(stats.customerScore)}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card><CardContent className="p-2.5 space-y-0.5">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> الحجوزات</div>
          <div className="text-lg font-bold">{stats.totalBookings}</div>
        </CardContent></Card>
        <Card><CardContent className="p-2.5 space-y-0.5">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> إجمالي الإنفاق</div>
          <div className="text-lg font-bold">{stats.totalSpent.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-2.5 space-y-0.5">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3 w-3" /> المحادثات</div>
          <div className="text-lg font-bold">{stats.conversationsCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-2.5 space-y-0.5">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> مدة العميل</div>
          <div className="text-lg font-bold">{stats.lifetimeMonths} شهر</div>
        </CardContent></Card>
      </div>

      {/* Last activities */}
      {lastHotel && (
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
              <Building2 className="h-3 w-3" /> آخر حجز فندقي
            </div>
            <div className="text-sm font-medium truncate">{lastHotel.hotel_name || 'حجز فندق'}</div>
            {lastHotel.check_in_date && (
              <div className="text-xs text-muted-foreground">
                {format(new Date(lastHotel.check_in_date), 'yyyy/MM/dd')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {lastFlight && (
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
              <Plane className="h-3 w-3" /> آخر حجز طيران
            </div>
            <div className="text-sm font-medium truncate">
              {lastFlight.departure_airport || ''} → {lastFlight.arrival_airport || ''}
            </div>
            {lastFlight.departure_date && (
              <div className="text-xs text-muted-foreground">
                {format(new Date(lastFlight.departure_date), 'yyyy/MM/dd')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={`/new-quote?customer=${customer.id}`}>عرض سعر</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/new-hotel-booking?customer=${customer.id}`}>حجز فندق</Link>
        </Button>
      </div>
    </div>
  );
};

export default Customer360Panel;
