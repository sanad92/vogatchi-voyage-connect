
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { ShieldOff, Database } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import TableViewer from "@/components/database/TableViewer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const DatabaseManager = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showSqlEditor, setShowSqlEditor] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-10 flex justify-center items-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldOff className="h-6 w-6 mb-2" />
          <div>
            <div className="font-bold mb-1 text-lg">صلاحية غير كافية</div>
            <div className="text-foreground mb-1">هذه الصفحة متاحة فقط للسوبر أدمن.</div>
            <div className="text-xs text-muted-foreground">
              إذا كنت بحاجة للوصول، يرجى التواصل مع مدير النظام.
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  // قائمة الجداول الرئيسية
  const availableTables: { name: string; rowCount?: number; description: string }[] = [
    { name: "customers", rowCount: 112, description: "عملاء النظام" },
    { name: "suppliers", rowCount: 32, description: "الموردين" },
    { name: "hotel_bookings", rowCount: 224, description: "الحجوزات الفندقية" },
    { name: "flight_bookings", rowCount: 80, description: "حجوزات الطيران" },
    { name: "invoices", rowCount: 156, description: "الفواتير" },
    { name: "employee_commission_periods", rowCount: 0, description: "العمولات المجمعة" },
  ];

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-foreground">Database Manager</h1>
        <Badge className="bg-red-100 text-red-700">سوبر أدمن فقط</Badge>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setShowSqlEditor(true)}
        >محرر SQL تجريبي</Button>
      </div>
      <p className="mb-5 text-muted-foreground max-w-2xl">
        يمكنك هنا استعراض الجداول الأساسية للنظام وإجراء العمليات الإدارية المتقدمة.
        <span className="text-foreground font-bold"> الآن يمكنك تصفح كل جدول أو تصدير بياناته أو فتح محرر SQL.</span>
      </p>
      {!selectedTable ? (
        <div className="overflow-x-auto">
          <table className="min-w-[450px] w-full bg-card border rounded-xl shadow-sm divide-y">
            <thead>
              <tr className="bg-muted border-b text-foreground">
                <th className="p-3 text-right">اسم الجدول</th>
                <th className="p-3 text-center">عدد السجلات</th>
                <th className="p-3 text-right">الوصف</th>
                <th className="p-3 text-center">أدوات</th>
              </tr>
            </thead>
            <tbody>
              {availableTables.map((tbl) => (
                <tr key={tbl.name} className="border-b hover:bg-muted transition">
                  <td className="p-3 font-mono text-foreground">{tbl.name}</td>
                  <td className="p-3 text-center">{tbl.rowCount ?? "?"}</td>
                  <td className="p-3 text-muted-foreground">{tbl.description}</td>
                  <td className="flex gap-2 items-center justify-center p-3">
                    <Button size="sm" onClick={() => setSelectedTable(tbl.name)}>تصفح</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TableViewer table={selectedTable} onBack={() => setSelectedTable(null)} />
      )}
      <Dialog open={showSqlEditor} onOpenChange={setShowSqlEditor}>
        <DialogContent>
          <div className="p-4">
            <div className="text-lg font-bold mb-2">محرر SQL (تجريبي)</div>
            <div className="text-muted-foreground mb-2">سيتم إضافة وظيفة التنفيذ قريبًا!</div>
            <textarea
              className="w-full min-h-[120px] p-2 border rounded bg-muted text-sm"
              defaultValue="-- اكتب استعلام SQL هنا مثل: SELECT * FROM customers LIMIT 10"
              readOnly
            />
            <div className="flex justify-end mt-2">
              <Button variant="outline" onClick={() => setShowSqlEditor(false)}>إغلاق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseManager;
