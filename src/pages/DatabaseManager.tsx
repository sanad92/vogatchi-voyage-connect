
import { useAuth } from "@/hooks/useAuth";
import { ShieldOff, Database } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import TableViewer from "@/components/database/TableViewer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog"; // fixed import

const DatabaseManager = () => {
  const { isSuperAdmin } = useAuth();
  const [selectedTable, setSelectedTable] = useState<keyof import("@/integrations/supabase/types").Database["Tables"] | null>(null);
  const [showSqlEditor, setShowSqlEditor] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <div className="container mx-auto px-4 py-10 flex justify-center items-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldOff className="h-6 w-6 mb-2" />
          <div>
            <div className="font-bold mb-1 text-lg">صلاحية غير كافية</div>
            <div className="text-gray-700 mb-1">هذه الصفحة متاحة فقط للسوبر أدمن.</div>
            <div className="text-xs text-gray-500">
              إذا كنت بحاجة للوصول، يرجى التواصل مع مدير النظام.
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  // List of main tables: Feel free to extend as needed!
  const availableTables: { name: keyof import("@/integrations/supabase/types").Database["Tables"]; rowCount?: number, description: string }[] = [
    { name: "customers", rowCount: 112, description: "عملاء النظام" },
    { name: "suppliers", rowCount: 32, description: "الموردين" },
    { name: "hotel_bookings", rowCount: 224, description: "الحجوزات الفندقية" },
    { name: "flight_bookings", rowCount: 80, description: "حجوزات الطيران" },
    { name: "invoices", rowCount: 156, description: "الفواتير" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Database Manager</h1>
        <Badge className="bg-red-100 text-red-700">سوبر أدمن فقط</Badge>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setShowSqlEditor(true)}
        >محرر SQL تجريبي</Button>
      </div>
      <p className="mb-5 text-gray-600 max-w-2xl">
        يمكنك هنا استعراض الجداول الأساسية للنظام وإجراء العمليات الإدارية المتقدمة.
        <span className="text-blue-700 font-bold"> الآن يمكنك تصفح كل جدول أو تصدير بياناته أو فتح محرر SQL.</span>
      </p>
      {!selectedTable ? (
        <div className="overflow-x-auto">
          <table className="min-w-[450px] w-full bg-white border rounded-xl shadow-sm divide-y">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-700">
                <th className="p-3 text-right">اسم الجدول</th>
                <th className="p-3 text-center">عدد السجلات</th>
                <th className="p-3 text-right">الوصف</th>
                <th className="p-3 text-center">أدوات</th>
              </tr>
            </thead>
            <tbody>
              {availableTables.map((tbl) => (
                <tr key={tbl.name} className="border-b hover:bg-blue-50 transition">
                  <td className="p-3 font-mono text-blue-800">{tbl.name}</td>
                  <td className="p-3 text-center">{tbl.rowCount ?? "?"}</td>
                  <td className="p-3 text-gray-600">{tbl.description}</td>
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
      {/* محرر SQL البسيط (placeholder فقط كبداية) */}
      <Dialog open={showSqlEditor} onOpenChange={setShowSqlEditor}>
        <DialogContent>
          <div className="p-4">
            <div className="text-lg font-bold mb-2">محرر SQL (تجريبي)</div>
            <div className="text-gray-600 mb-2">سيتم إضافة وظيفة التنفيذ قريبًا!</div>
            <textarea
              className="w-full min-h-[120px] p-2 border rounded bg-gray-50 text-sm"
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
