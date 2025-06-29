import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Users,
  Building2,
  UserCheck
} from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ImportData {
  headers: string[];
  rows: any[][];
  errors: string[];
  warnings: string[];
}

const DataImportExport = () => {
  const { hasRole, isSuperAdmin } = useOptimizedAuth();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // التحقق من الصلاحيات
  if (!hasRole('admin') && !hasRole('manager') && !isSuperAdmin()) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ليس لديك صلاحية</h3>
            <p className="text-gray-600">هذه الميزة متاحة للأدمن والمديرين فقط</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tableOptions = [
    { value: 'customers', label: 'العملاء', icon: Users },
    { value: 'suppliers', label: 'الموردين', icon: Building2 },
    { value: 'employees', label: 'الموظفين', icon: UserCheck }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      handleExcelFile(file);
    } else if (fileExtension === 'csv') {
      handleCSVFile(file);
    } else {
      toast.error('نوع الملف غير مدعوم. يرجى استخدام Excel أو CSV');
    }
  };

  const handleExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        processImportData(jsonData as any[][]);
      } catch (error) {
        toast.error('خطأ في قراءة ملف Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCSVFile = (file: File) => {
    Papa.parse(file, {
      complete: (results) => {
        processImportData(results.data as any[][]);
      },
      error: () => {
        toast.error('خطأ في قراءة ملف CSV');
      }
    });
  };

  const processImportData = (data: any[][]) => {
    if (data.length < 2) {
      toast.error('الملف يجب أن يحتوي على رأس الجدول والبيانات');
      return;
    }

    const headers = data[0];
    const rows = data.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null));
    const errors: string[] = [];
    const warnings: string[] = [];

    // التحقق من صحة البيانات حسب نوع الجدول
    validateData(selectedTable, headers, rows, errors, warnings);

    setImportData({ headers, rows, errors, warnings });
  };

  const validateData = (table: string, headers: string[], rows: any[][], errors: string[], warnings: string[]) => {
    const requiredFields: Record<string, string[]> = {
      customers: ['name', 'phone'],
      suppliers: ['name', 'contact_person'],
      employees: ['full_name', 'position', 'employee_code']
    };

    const required = requiredFields[table] || [];
    const missingFields = required.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      errors.push(`الحقول المطلوبة مفقودة: ${missingFields.join(', ')}`);
    }

    // فحص البيانات المكررة
    const duplicates = new Set();
    rows.forEach((row, index) => {
      const key = row[0]; // استخدام العمود الأول كمفتاح
      if (duplicates.has(key)) {
        warnings.push(`صف ${index + 2}: بيانات مكررة`);
      } else {
        duplicates.add(key);
      }
    });
  };

  const handleImport = async () => {
    if (!importData || !selectedTable) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      for (let i = 0; i < importData.rows.length; i++) {
        const row = importData.rows[i];
        const record: any = {};
        
        importData.headers.forEach((header, index) => {
          if (row[index] !== undefined && row[index] !== '') {
            record[header] = row[index];
          }
        });

        const { error } = await supabase
          .from(selectedTable as any)
          .insert(record);

        if (error) {
          console.error(`خطأ في استيراد الصف ${i + 1}:`, error);
        }

        setProgress(((i + 1) / importData.rows.length) * 100);
      }

      toast.success(`تم استيراد ${importData.rows.length} سجل بنجاح`);
      setImportData(null);
      
    } catch (error) {
      toast.error('حدث خطأ أثناء الاستيراد');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleExport = async () => {
    if (!selectedTable) {
      toast.error('يرجى اختيار نوع البيانات للتصدير');
      return;
    }

    setIsProcessing(true);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from(selectedTable as any)
        .select('*');

      if (error) {
        toast.error('خطأ في جلب البيانات');
        return;
      }

      // تصدير إلى Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, selectedTable);
      
      const fileName = `${selectedTable}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('تم تصدير البيانات بنجاح');
      
    } catch (error) {
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد وتصدير البيانات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* اختيار نوع البيانات */}
            <div>
              <label className="text-sm font-medium mb-2 block">نوع البيانات</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع البيانات" />
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="import" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="import" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  استيراد
                </TabsTrigger>
                <TabsTrigger value="export" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  تصدير
                </TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="space-y-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedTable}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    اختيار ملف للاستيراد
                  </Button>
                </div>

                {/* معاينة البيانات */}
                {importData && (
                  <div className="space-y-4">
                    {importData.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside">
                            {importData.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {importData.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside">
                            {importData.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">معاينة البيانات ({importData.rows.length} سجل)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {importData.headers.map((header, index) => (
                                <th key={index} className="text-right p-2">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importData.rows.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-b">
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="p-2">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importData.rows.length > 5 && (
                          <p className="text-center text-gray-500 mt-2">
                            ...و {importData.rows.length - 5} سجل آخر
                          </p>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={handleImport}
                      disabled={isProcessing || importData.errors.length > 0}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      تأكيد الاستيراد
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <Button 
                  onClick={handleExport}
                  disabled={!selectedTable || isProcessing}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  تصدير البيانات
                </Button>

                <div className="text-sm text-gray-600">
                  <p>سيتم تصدير جميع البيانات من الجدول المحدد بصيغة Excel (.xlsx)</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* شريط التقدم */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>جاري المعالجة...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataImportExport;
