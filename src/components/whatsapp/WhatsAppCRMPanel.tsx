import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConversationCRM } from '@/hooks/useConversationCRM';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText, Building2, Plane, Bell, UserPlus, Search, Link2, ExternalLink, Plus,
} from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  conversationId: string;
  conversation: any;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

export const WhatsAppCRMPanel: React.FC<Props> = ({ conversationId, conversation }) => {
  const customerId = conversation.customer_id;
  const phone = conversation.phone_number;
  const {
    data, isLoading, searchCustomers, linkCustomer, createAndLinkCustomer,
  } = useConversationCRM(conversationId, customerId);

  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [newName, setNewName] = useState(conversation?.customer?.name || '');
  const [newEmail, setNewEmail] = useState('');

  const runSearch = async (v: string) => {
    setSearch(v);
    if (v.length < 2) return setResults([]);
    setResults(await searchCustomers(v));
  };

  if (!customerId) {
    return (
      <div className="p-4 space-y-3">
        <Card>
          <CardContent className="p-4 text-center space-y-3">
            <UserPlus className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">لا يوجد عميل مرتبط بهذه المحادثة</p>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full">
                  <Plus className="h-4 w-4 me-1" /> إنشاء عميل جديد وربطه
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>عميل جديد</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="اسم العميل" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Input placeholder="رقم الهاتف" value={phone || ''} disabled />
                  <Input placeholder="البريد الإلكتروني (اختياري)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  <Button
                    className="w-full"
                    disabled={!newName.trim() || createAndLinkCustomer.isPending}
                    onClick={async () => {
                      await createAndLinkCustomer.mutateAsync({
                        name: newName.trim(),
                        phone: phone || '',
                        email: newEmail.trim() || undefined,
                      });
                      setCreateOpen(false);
                    }}
                  >
                    إنشاء وربط
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full">
                  <Link2 className="h-4 w-4 me-1" /> ربط بعميل موجود
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>ربط بعميل</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="ps-8" placeholder="ابحث بالاسم / الهاتف / البريد"
                      value={search} onChange={(e) => runSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {results.map((c: any) => (
                      <button
                        key={c.id}
                        className="w-full text-start p-2 rounded hover:bg-accent border"
                        onClick={async () => {
                          await linkCustomer.mutateAsync(c.id);
                          setLinkOpen(false);
                        }}
                      >
                        <div className="text-sm font-medium">{c.name || c.full_name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone} · {c.email}</div>
                      </button>
                    ))}
                    {search.length >= 2 && results.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">لا نتائج</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  const quotes = data?.quotes || [];
  const hotels = data?.hotelBookings || [];
  const flights = data?.flightBookings || [];
  const followUps = data?.followUps || [];

  return (
    <div className="p-3 space-y-3">
      {/* Quick create actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={`/new-quote?customer=${customerId}`}>
            <FileText className="h-3.5 w-3.5 me-1" /> عرض سعر
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/new-hotel-booking?customer=${customerId}`}>
            <Building2 className="h-3.5 w-3.5 me-1" /> حجز فندق
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/new-flight-booking?customer=${customerId}`}>
            <Plane className="h-3.5 w-3.5 me-1" /> حجز طيران
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/customers/${customerId}`}>
            <ExternalLink className="h-3.5 w-3.5 me-1" /> ملف العميل
          </Link>
        </Button>
      </div>

      {/* Quotes */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
          <FileText className="h-3.5 w-3.5" /> عروض الأسعار ({quotes.length})
        </div>
        <div className="space-y-1.5">
          {quotes.length === 0 && <p className="text-xs text-muted-foreground">لا توجد عروض</p>}
          {quotes.map((q: any) => (
            <Card key={q.id}>
              <CardContent className="p-2.5">
                <Link to={`/quotes/${q.id}`} className="block hover:underline">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{q.quote_number || q.id.slice(0, 8)}</span>
                    <Badge className={STATUS_COLOR[q.status] || ''}>{q.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-between mt-0.5">
                    <span>{Number(q.total_amount || 0).toLocaleString()} EGP</span>
                    <span>{q.created_at && format(new Date(q.created_at), 'yyyy/MM/dd')}</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Hotel bookings */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
          <Building2 className="h-3.5 w-3.5" /> حجوزات الفنادق ({hotels.length})
        </div>
        <div className="space-y-1.5">
          {hotels.length === 0 && <p className="text-xs text-muted-foreground">لا توجد حجوزات</p>}
          {hotels.map((h: any) => {
            const statusName = h.status?.name || '-';
            return (
              <Card key={h.id}>
                <CardContent className="p-2.5">
                  <Link to={`/hotel-bookings/${h.id}`} className="block hover:underline">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{h.hotel_name || 'فندق'}</span>
                      <Badge className={STATUS_COLOR[statusName.toLowerCase()] || ''}>{statusName}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex justify-between">
                      <span>
                        {h.check_in_date && format(new Date(h.check_in_date), 'yyyy/MM/dd')}
                        {' → '}
                        {h.check_out_date && format(new Date(h.check_out_date), 'yyyy/MM/dd')}
                      </span>
                      <span>{Number(h.total_cost_customer || 0).toLocaleString()} {h.currency || 'EGP'}</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Flight bookings */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
          <Plane className="h-3.5 w-3.5" /> حجوزات الطيران ({flights.length})
        </div>
        <div className="space-y-1.5">
          {flights.length === 0 && <p className="text-xs text-muted-foreground">لا توجد حجوزات</p>}
          {flights.map((f: any) => {
            const statusName = f.status?.name || '-';
            const dep = f.departure_airport?.iata_code || f.departure_airport?.city || '?';
            const arr = f.arrival_airport?.iata_code || f.arrival_airport?.city || '?';
            return (
              <Card key={f.id}>
                <CardContent className="p-2.5">
                  <Link to={`/flight-bookings/${f.id}`} className="block hover:underline">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dep} → {arr}</span>
                      <Badge className={STATUS_COLOR[statusName.toLowerCase()] || ''}>{statusName}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex justify-between">
                      <span>{f.departure_date && format(new Date(f.departure_date), 'yyyy/MM/dd')}</span>
                      <span>{Number(f.total_cost || 0).toLocaleString()} {f.currency || 'EGP'}</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
          <Bell className="h-3.5 w-3.5" /> المتابعات ({followUps.length})
        </div>
        <div className="space-y-1.5">
          {followUps.length === 0 && <p className="text-xs text-muted-foreground">لا توجد متابعات</p>}
          {followUps.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{f.follow_up_type}</span>
                  <Badge variant="outline">{f.status}</Badge>
                </div>
                {f.scheduled_date && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(f.scheduled_date), 'yyyy/MM/dd HH:mm')}
                  </div>
                )}
                {f.notes && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.notes}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppCRMPanel;
