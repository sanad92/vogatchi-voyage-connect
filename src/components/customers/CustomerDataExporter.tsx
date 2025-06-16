
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, FileSpreadsheet, FileText, Database, Calendar } from "lucide-react";
import { Customer } from "@/types/customer";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface CustomerDataExporterProps {
  customers: Customer[];
  selectedCustomers: string[];
}

interface ExportField {
  key: keyof Customer | 'segment_name';
  label: string;
  selected: boolean;
}

const CustomerDataExporter = ({ customers, selectedCustomers }: CustomerDataExporterProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [exportType, setExportType] = useState("selected"); // "all" | "selected"
  
  const [exportFields, setExportFields] = useState<ExportField[]>([
    { key: 'name', label: 'الاسم', selected: true },
    { key: 'phone', label: 'رقم الهاتف', selected: true },
    { key: 'email', label: 'البريد الإلكتروني', selected: true },
    { key: 'nationality', label: 'الجنسية', selected: true },
    { key: 'segment_name', label: 'الشريحة', selected: true },
    { key: 'total_bookings', label: 'عدد الحجوزات', selected: true },
    { key: 'total_spent', label: 'إجمالي الإنفاق', selected: true },
    { key: 'loyalty_points', label: 'نقاط الولاء', selected: false },
    { key: 'last_booking_date', label: 'تاريخ آخر حجز', selected: true },
    { key: 'created_at', label: 'تاريخ التسجيل', selected: false },
    { key: 'address', label: 'العنوان', selected: false },
    { key: 'passport_number', label: 'رقم جواز السفر', selected: false },
  ]);

  const getExportData = () => {
    const dataToExport = exportType === "selected" 
      ? customers.filter(customer => selectedCustomers.includes(customer.id))
      : customers;

    const selectedFields = exportFields.filter(field => field.selected);

    return dataToExport.map(customer => {
      const exportRow: any = {};
      
      selectedFields.forEach(field => {
        if (field.key === 'segment_name') {
          exportRow[field.label] = customer.segment?.name_ar || 'غير محدد';
        } else if (field.key === 'created_at' || field.key === 'last_booking_date') {
          const dateValue = customer[field.key];
          exportRow[field.label] = dateValue 
            ? new Date(dateValue).toLocaleDateString('ar-EG')
            : 'غير متوفر';
        } else if (field.key === 'total_spent') {
          exportRow[field.label] = customer[field.key] 
            ? `${customer[field.key]} ج.م`
            : '0 ج.م';
        } else {
          exportRow[field.label] = customer[field.key] || 'غير متوفر';
        }
      });

      return exportRow;
    });
  };

  const handleExportExcel = () => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    // تعيين عرض الأعمدة
    const colWidths = exportFields
      .filter(field => field.selected)
      .map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'عملاء');
    
    const fileName = `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setIsDialogOpen(false);
  };

  const handleExportCSV = () => {
    const data = getExportData();
    const headers = exportFields
      .filter(field => field.selected)
      .map(field => field.label);
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
    
    setIsDialogOpen(false);
  };

  const handleExportJSON = () => {
    const data = getExportData();
    const jsonContent = JSON.stringify(data, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const fileName = `customers_export_${new Date().toISOString().split('T')[0]}.json`;
    saveAs(blob, fileName);
    
    setIsDialogOpen(false);
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'excel':
        handleExportExcel();
        break;
      case 'csv':
        handleExportCSV();
        break;
      case 'json':
        handleExportJSON();
        break;
      default:
        handleExportExcel();
    }
  };

  const toggleField = (fieldKey: keyof Customer | 'segment_name') => {
    setExportFields(prev => 
      prev.map(field => 
        field.key === fieldKey 
          ? { ...field, selected: !field.selected }
          : field
      )
    );
  };

  const selectAllFields = () => {
    setExportFields(prev => prev.map(field => ({ ...field, selected: true })));
  };

  const deselectAllFields = () => {
    setExportFields(prev => prev.map(field => ({ ...field, selected: false })));
  };

  const selectedFieldsCount = exportFields.filter(field => field.selected).length;
  const totalCustomersToExport = exportType === "selected" ? selectedCustomers.length : customers.length;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          تصدير البيانات
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            تصدير بيانات العملاء
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* اختيار نوع التصدير */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">نوع البيانات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  id="export-all"
                  name="exportType"
                  value="all"
                  checked={exportType === "all"}
                  onChange={(e) => setExportType(e.target.value)}
                />
                <label htmlFor="export-all" className="text-sm">
                  جميع العملاء ({customers.length} عميل)
                </label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  id="export-selected"
                  name="exportType"
                  value="selected"
                  checked={exportType === "selected"}
                  onChange={(e) => setExportType(e.target.value)}
                  disabled={selectedCustomers.length === 0}
                />
                <label 
                  htmlFor="export-selected" 
                  className={`text-sm ${selectedCustomers.length === 0 ? 'text-gray-400' : ''}`}
                >
                  العملاء المحددين ({selectedCustomers.length} عميل)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* اختيار تنسيق التصدير */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تنسيق التصدير</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      Excel (.xlsx)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      CSV (.csv)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-purple-600" />
                      JSON (.json)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* اختيار الحقول */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">
                الحقول المطلوبة ({selectedFieldsCount} من {exportFields.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllFields}>
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllFields}>
                  إلغاء التحديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {exportFields.map((field) => (
                  <div key={field.key} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={field.key}
                      checked={field.selected}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    <label htmlFor={field.key} className="text-sm">
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ملخص التصدير */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">ملخص التصدير:</span>
            </div>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• عدد العملاء: {totalCustomersToExport}</p>
              <p>• عدد الحقول: {selectedFieldsCount}</p>
              <p>• التنسيق: {exportFormat.toUpperCase()}</p>
              <p>• التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-3">
            <Button 
              onClick={handleExport}
              disabled={selectedFieldsCount === 0 || totalCustomersToExport === 0}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              تصدير البيانات
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDataExporter;
