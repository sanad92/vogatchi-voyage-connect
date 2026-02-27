import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { 
  MoreVertical, 
  Plus, 
  FileText, 
  MessageSquare, 
  Download,
  Printer,
  Star,
  Mail
} from "lucide-react";
import { Customer } from "@/types/customer";
import { toast } from "sonner";

interface CustomerQuickActionsProps {
  customer: Customer;
}

const escapeHtml = (unsafe: string | null | undefined): string => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const CustomerQuickActions = ({ customer }: CustomerQuickActionsProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleNewBooking = () => {
    // Navigate to new booking with customer pre-selected
    navigate('/new-hotel-booking', { 
      state: { selectedCustomer: customer } 
    });
  };

  const handleNewInvoice = () => {
    // Navigate to new invoice with customer pre-selected
    navigate('/new-invoice', { 
      state: { selectedCustomer: customer } 
    });
  };

  const handleSendMessage = () => {
    // Open WhatsApp or SMS with customer phone
    if (customer.phone) {
      const whatsappUrl = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`;
      window.open(whatsappUrl, '_blank');
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

  const handleSendEmail = () => {
    if (customer.email) {
      const emailUrl = `mailto:${customer.email}`;
      window.open(emailUrl, '_self');
    } else {
      toast.error('البريد الإلكتروني غير متوفر');
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      // Create customer data export
      const exportData = {
        customer: customer,
        exportDate: new Date().toISOString(),
        exportedBy: 'نظام Hostretor.online'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `customer-${customer.name}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('تم تصدير بيانات العميل بنجاح');
    } catch (error) {
      console.error('Error exporting customer data:', error);
      toast.error('حدث خطأ في تصدير البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintProfile = () => {
    // Generate printable customer profile
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ملف العميل - ${escapeHtml(customer.name)}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .info-section { margin-bottom: 20px; }
            .info-row { display: flex; margin-bottom: 10px; }
            .label { font-weight: bold; width: 150px; }
            .value { flex: 1; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ملف العميل</h1>
            <h2>${escapeHtml(customer.name)}</h2>
          </div>
          
          <div class="info-section">
            <h3>المعلومات الأساسية</h3>
            <div class="info-row">
              <span class="label">الاسم:</span>
              <span class="value">${escapeHtml(customer.name)}</span>
            </div>
            <div class="info-row">
              <span class="label">الهاتف:</span>
              <span class="value">${escapeHtml(customer.phone)}</span>
            </div>
            <div class="info-row">
              <span class="label">البريد الإلكتروني:</span>
              <span class="value">${escapeHtml(customer.email) || 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="label">العنوان:</span>
              <span class="value">${escapeHtml(customer.address) || 'غير محدد'}</span>
            </div>
            <div class="info-row">
              <span class="label">الجنسية:</span>
              <span class="value">${escapeHtml(customer.nationality) || 'غير محددة'}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>الإحصائيات</h3>
            <div class="info-row">
              <span class="label">عدد الحجوزات:</span>
              <span class="value">${customer.total_bookings || 0}</span>
            </div>
            <div class="info-row">
              <span class="label">إجمالي الإنفاق:</span>
              <span class="value">${(customer.total_spent || 0).toLocaleString()} ج.م</span>
            </div>
            <div class="info-row">
              <span class="label">نقاط الولاء:</span>
              <span class="value">${customer.loyalty_points || 0}</span>
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
            تم الطباعة في ${new Date().toLocaleDateString('ar-EG')} - نظام Hostretor.online — Travel ERP System
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleNewBooking}>
          <Plus className="h-4 w-4 mr-2" />
          حجز جديد
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleNewInvoice}>
          <FileText className="h-4 w-4 mr-2" />
          فاتورة جديدة
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSendMessage}>
          <MessageSquare className="h-4 w-4 mr-2" />
          إرسال رسالة واتساب
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSendEmail}>
          <Mail className="h-4 w-4 mr-2" />
          إرسال بريد إلكتروني
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExportData} disabled={isLoading}>
          <Download className="h-4 w-4 mr-2" />
          {isLoading ? 'جاري التصدير...' : 'تصدير البيانات'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handlePrintProfile}>
          <Printer className="h-4 w-4 mr-2" />
          طباعة الملف
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CustomerQuickActions;