import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User, Calendar, CreditCard, Star, Download, Eye,
  MessageSquare, Search, FileText, Phone, Gift
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const CustomerPortalPage = () => {
  const orgId = useOrgId();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Fetch real customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['portal-customers', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch bookings for selected customer
  const { data: customerBookings = [] } = useQuery({
    queryKey: ['portal-customer-bookings', selectedCustomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, booking_statuses(name_ar, color)')
        .eq('customer_id', selectedCustomerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  // Fetch invoices for selected customer
  const { data: customerInvoices = [] } = useQuery({
    queryKey: ['portal-customer-invoices', selectedCustomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', selectedCustomerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const getStatusBadge = (status: string | null) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      confirmed: { label: 'مؤكد', variant: 'default' },
      pending: { label: 'في الانتظار', variant: 'secondary' },
      cancelled: { label: 'ملغي', variant: 'destructive' },
      paid: { label: 'مدفوع', variant: 'default' },
      unpaid: { label: 'غير مدفوع', variant: 'destructive' },
      partial: { label: 'جزئي', variant: 'outline' },
    };
    const s = map[status || ''] || { label: status || 'غير محدد', variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">بوابة العملاء</h2>
        <Badge variant="secondary">{customers.length} عميل</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Customer List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن عميل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[500px]">
            <CardContent className="space-y-1 pt-0">
              {isLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">جاري التحميل...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">لا توجد نتائج</div>
              ) : (
                filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${
                      selectedCustomerId === c.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone || c.email || ''}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Customer Details */}
        <div className="lg:col-span-3">
          {!selectedCustomer ? (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>اختر عميلاً لعرض تفاصيله</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Profile Header */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                          {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedCustomer.total_bookings || 0}</p>
                        <p className="text-xs text-muted-foreground">حجز</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{(selectedCustomer.total_spent || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500" />
                          <p className="text-2xl font-bold">{selectedCustomer.loyalty_points || 0}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">نقطة</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="bookings">
                <TabsList>
                  <TabsTrigger value="bookings">الحجوزات ({customerBookings.length})</TabsTrigger>
                  <TabsTrigger value="invoices">الفواتير ({customerInvoices.length})</TabsTrigger>
                  <TabsTrigger value="info">المعلومات</TabsTrigger>
                </TabsList>

                <TabsContent value="bookings" className="space-y-3 mt-4">
                  {customerBookings.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد حجوزات</CardContent></Card>
                  ) : customerBookings.map(b => (
                    <Card key={b.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{b.booking_number}</span>
                            <Badge variant="outline" className="text-xs">{b.booking_type}</Badge>
                          </div>
                          {b.booking_statuses ? (
                            <Badge style={{ backgroundColor: (b.booking_statuses as any)?.color || undefined }}>
                              {(b.booking_statuses as any)?.name_ar}
                            </Badge>
                          ) : getStatusBadge(b.status)}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">من: </span>
                            {b.start_date || '—'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">إلى: </span>
                            {b.end_date || '—'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">سعر البيع: </span>
                            {(b.selling_price || 0).toLocaleString()} {b.currency || 'EGP'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">ربح: </span>
                            <span className="text-emerald-600 font-medium">{(b.profit || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        {b.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{b.notes}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="invoices" className="space-y-3 mt-4">
                  {customerInvoices.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد فواتير</CardContent></Card>
                  ) : customerInvoices.map((inv: any) => (
                    <Card key={inv.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{inv.invoice_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {inv.created_at && formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: ar })}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-bold">{(inv.total_amount || 0).toLocaleString()} {inv.currency || 'EGP'}</p>
                            {getStatusBadge(inv.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="info" className="mt-4">
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">الاسم</label>
                          <p className="font-medium">{selectedCustomer.name}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">الهاتف</label>
                          <p className="font-medium">{selectedCustomer.phone || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">البريد</label>
                          <p className="font-medium">{selectedCustomer.email || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">الجنسية</label>
                          <p className="font-medium">{selectedCustomer.nationality || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-sm text-muted-foreground">العنوان</label>
                          <p className="font-medium">{selectedCustomer.address || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">آخر حجز</label>
                          <p className="font-medium">{selectedCustomer.last_booking_date || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">تاريخ التسجيل</label>
                          <p className="font-medium">
                            {selectedCustomer.created_at && formatDistanceToNow(new Date(selectedCustomer.created_at), { addSuffix: true, locale: ar })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalPage;
