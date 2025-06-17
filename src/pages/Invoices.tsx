import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Eye, Edit, Trash2, AlertCircle, Plus, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useInitialInvoices } from "@/hooks/useInitialInvoices";
import { useInvoicesManagement } from "@/hooks/useInvoicesManagement";
import CreateInvoiceDialog from "@/components/invoices/CreateInvoiceDialog";
import InvoiceDetailsDialog from "@/components/invoices/InvoiceDetailsDialog";
import EditInvoiceDialog from "@/components/invoices/EditInvoiceDialog";

const Invoices = () => {
  useInitialInvoices();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    invoices,
    isLoading,
    updateStatus,
    deleteInvoice,
    updateInvoice,
    isUpdatingStatus,
    isDeletingInvoice,
    isUpdatingInvoice,
    invoiceStats,
  } = useInvoicesManagement({
    searchTerm: debouncedSearchTerm,
    status: filterStatus,
    bookingType: filterType,
    dateFrom,
    dateTo,
  });

  const getBookingTypeLabel = (type) => {
    const types = {
      hotel: "حجز فندق",
      flight: "حجز طيران",
      transport: "حجز نقل",
      car_rental: "إيجار سيارة",
    };
    return types[type] || type;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      draft: "مسودة",
      sent: "مرسلة",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغاة",
    };
    return statuses[status] || status;
  };

  const getPaymentStatusLabel = (status) => {
    const statuses = {
      unpaid: "غير مدفوعة",
      partially_paid: "مدفوعة جزئياً",
      fully_paid: "مدفوعة بالكامل",
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status): "default" | "destructive" | "outline" | "secondary" => {
    const colors = {
      draft: "secondary" as const,
      sent: "default" as const,
      paid: "default" as const,
      overdue: "destructive" as const,
      cancelled: "outline" as const,
    };
    return colors[status] || "default";
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      unpaid: "destructive",
      partially_paid: "outline",
      fully_paid: "default",
    };
    return colors[status] || "default";
  };

  const getBookingDetails = (invoice) => {
    switch (invoice.booking_type) {
      case "hotel":
        return invoice.hotel_booking;
      case "flight":
        return invoice.flight_booking;
      case "transport":
        return invoice.transport_booking;
      case "car_rental":
        return invoice.car_rental;
      default:
        return null;
    }
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsDialog(true);
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowEditDialog(true);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      try {
        await deleteInvoice(invoiceId);
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleUpdateStatus = async (invoiceId, status, paymentDate) => {
    try {
      await updateStatus({ invoiceId, status, paymentDate });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveInvoice = async (invoiceId, updateData) => {
    try {
      await updateInvoice({ invoiceId, updateData });
      setShowEditDialog(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterType("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* رأس الصفحة مع الإحصائيات المحدثة */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الفواتير</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceStats?.totalInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">مدفوعة بالكامل</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceStats?.paidInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">مدفوعة جزئياً</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceStats?.partiallyPaidInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">غير مدفوعة</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceStats?.unpaidInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">المبلغ المتبقي</p>
                <p className="text-xl font-bold text-gray-900">
                  {invoiceStats?.totalRemainingAmount?.toLocaleString() || 0} ج.م
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أدوات التصفية والبحث */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>تصفية الفواتير</CardTitle>
              <CardDescription>استخدم الخيارات أدناه للبحث وتصفية الفواتير</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              فاتورة جديدة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">بحث</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="رقم الفاتورة، ملاحظات..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">حالة الفاتورة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="sent">مرسلة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">نوع الحجز</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="hotel">حجز فندق</SelectItem>
                  <SelectItem value="flight">حجز طيران</SelectItem>
                  <SelectItem value="transport">حجز نقل</SelectItem>
                  <SelectItem value="car_rental">إيجار سيارة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">من تاريخ</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="flex flex-col justify-end">
              <Label htmlFor="dateTo">إلى تاريخ</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {(searchTerm || filterStatus !== 'all' || filterType !== 'all' || dateFrom || dateTo) && (
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قائمة الفواتير */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>
            {isLoading
              ? "جاري تحميل الفواتير..."
              : `${invoices?.length || 0} فاتورة`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 rtl:space-x-reverse">
                    <Skeleton className="h-12 w-12" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-10 w-[100px]" />
                  </div>
                ))}
            </div>
          ) : invoices?.length === 0 ? (
            <div className="text-center py-10 space-y-4">
              <div className="text-gray-500">
                لا توجد فواتير تطابق معايير البحث
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                إنشاء أول فاتورة
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium">رقم الفاتورة</th>
                    <th className="text-right py-3 px-4 font-medium">العميل</th>
                    <th className="text-right py-3 px-4 font-medium">نوع الحجز</th>
                    <th className="text-right py-3 px-4 font-medium">المبلغ الإجمالي</th>
                    <th className="text-right py-3 px-4 font-medium">المبلغ المدفوع</th>
                    <th className="text-right py-3 px-4 font-medium">المبلغ المتبقي</th>
                    <th className="text-right py-3 px-4 font-medium">حالة الدفع</th>
                    <th className="text-right py-3 px-4 font-medium">تاريخ الإصدار</th>
                    <th className="text-right py-3 px-4 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices?.map((invoice) => {
                    const bookingDetails = getBookingDetails(invoice);
                    return (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{invoice.customer?.name || "غير محدد"}</div>
                          {invoice.customer?.email && (
                            <div className="text-sm text-gray-500">{invoice.customer.email}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getBookingTypeLabel(invoice.booking_type)}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {invoice.final_amount?.toLocaleString()} {invoice.currency}
                        </td>
                        <td className="py-3 px-4 font-medium text-green-600">
                          {invoice.total_paid_amount?.toLocaleString()} {invoice.currency}
                        </td>
                        <td className="py-3 px-4 font-medium text-red-600">
                          {invoice.remaining_amount?.toLocaleString()} {invoice.currency}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getPaymentStatusColor(invoice.payment_status)}>
                            {getPaymentStatusLabel(invoice.payment_status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {format(new Date(invoice.issued_date), "d MMM yyyy", {
                            locale: ar,
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(invoice)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              عرض
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditInvoice(invoice)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              تعديل
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              disabled={isDeletingInvoice}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              حذف
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* النوافذ المنبثقة */}
      <CreateInvoiceDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {selectedInvoice && (
        <>
          <InvoiceDetailsDialog
            invoice={selectedInvoice}
            open={showDetailsDialog}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedInvoice(null);
            }}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onUpdateStatus={handleUpdateStatus}
          />

          <EditInvoiceDialog
            invoice={selectedInvoice}
            open={showEditDialog}
            onClose={() => {
              setShowEditDialog(false);
              setSelectedInvoice(null);
            }}
            onSave={handleSaveInvoice}
            isLoading={isUpdatingInvoice}
          />
        </>
      )}
    </div>
  );
};

export default Invoices;
