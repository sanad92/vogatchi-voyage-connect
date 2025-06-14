
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Receipt, Eye, Edit, FileText, DollarSign, Search, Filter } from "lucide-react";
import { useState } from "react";

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  booking_id: string;
  status: string;
  total_amount: number;
  subtotal: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  discount_amount: number | null;
  final_amount: number;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  currency: string | null;
  created_at: string;
  customers: {
    name: string;
    phone: string;
    email: string | null;
  };
  hotel_bookings?: {
    internal_booking_number: string;
    hotel_name: string;
    destination_city: string;
  };
  flight_bookings?: {
    booking_reference: string;
    departure_airport_id: string;
    arrival_airport_id: string;
  };
};

const Invoices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // استعلام الفواتير
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, email),
          hotel_bookings(internal_booking_number, hotel_name, destination_city),
          flight_bookings(booking_reference, departure_airport_id, arrival_airport_id)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invoice[];
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: "مسودة",
      sent: "مرسلة",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغية"
    };
    return labels[status as keyof typeof labels] || status;
  };

  // تصفية الفواتير
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === "" || 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customers.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.final_amount, 0);
  const paidAmount = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.final_amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل الفواتير...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            الفواتير المصدرة
          </h1>
          <p className="text-gray-600 mt-1">إدارة ومتابعة جميع الفواتير المصدرة من الحجوزات</p>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي الفواتير</p>
                <p className="text-2xl font-bold">{totalInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي المبلغ</p>
                <p className="text-2xl font-bold">{totalAmount.toFixed(2)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">المدفوع</p>
                <p className="text-2xl font-bold text-green-600">{paidAmount.toFixed(2)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">المعلق</p>
                <p className="text-2xl font-bold text-orange-600">{pendingAmount.toFixed(2)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* مرشحات البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث برقم الفاتورة أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="فلترة حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="sent">مرسلة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
                <SelectItem value="cancelled">ملغية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الفواتير */}
      <div className="grid grid-cols-1 gap-4">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد فواتير مطابقة للبحث</p>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      فاتورة #{invoice.invoice_number}
                    </h3>
                    <p className="text-gray-600">العميل: {invoice.customers.name}</p>
                    <p className="text-gray-600">الهاتف: {invoice.customers.phone}</p>
                    {invoice.hotel_bookings && (
                      <p className="text-sm text-gray-500">
                        حجز فندق: {invoice.hotel_bookings.internal_booking_number} - {invoice.hotel_bookings.hotel_name}
                      </p>
                    )}
                    {invoice.flight_bookings && (
                      <p className="text-sm text-gray-500">
                        حجز طيران: {invoice.flight_bookings.booking_reference}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <Badge className={getStatusColor(invoice.status)}>
                      {getStatusLabel(invoice.status)}
                    </Badge>
                    <div className="mt-2 text-lg font-bold flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {invoice.final_amount.toFixed(2)} ر.س
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium">تاريخ الإصدار:</span>
                    <p>{invoice.issued_date ? new Date(invoice.issued_date).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الاستحقاق:</span>
                    <p>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="font-medium">شروط الدفع:</span>
                    <p>{invoice.payment_terms}</p>
                  </div>
                  <div>
                    <span className="font-medium">الضريبة:</span>
                    <p>{invoice.vat_rate}% = {invoice.vat_amount?.toFixed(2) || '0.00'} ر.س</p>
                  </div>
                </div>

                {invoice.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <span className="font-medium">ملاحظات:</span>
                    <p className="text-sm mt-1">{invoice.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    عرض
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-1" />
                    تعديل
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileText className="w-4 h-4 mr-1" />
                    طباعة
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Invoices;
