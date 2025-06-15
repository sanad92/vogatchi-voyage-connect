
import { useAuth } from "@/hooks/useAuth";
import { ShieldOff, Database } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const DatabaseManager = () => {
  const { isSuperAdmin } = useAuth();

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

  // لاحقاً: سيتم جلب الجداول ديناميكياً من Supabase
  const fakeTables = [
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
      </div>
      <p className="mb-5 text-gray-600 max-w-2xl">
        يمكنك هنا استعراض الجداول الأساسية للنظام وإجراء العمليات الإدارية المتقدمة. ستتوفر لاحقًا أدوات التحرير، البحث، والتصدير.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[450px] w-full bg-white border rounded-xl shadow-sm divide-y">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-700">
              <th className="p-3 text-right">اسم الجدول</th>
              <th className="p-3 text-center">عدد السجلات</th>
              <th className="p-3 text-right">الوصف</th>
            </tr>
          </thead>
          <tbody>
            {fakeTables.map((tbl) => (
              <tr key={tbl.name} className="border-b hover:bg-blue-50 transition">
                <td className="p-3 font-mono text-blue-800">{tbl.name}</td>
                <td className="p-3 text-center">{tbl.rowCount}</td>
                <td className="p-3 text-gray-600">{tbl.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* لاحقًا: أدوات متقدمة - تحرير/تعديل وتحميل حقيقي للجداول */}
    </div>
  );
};

export default DatabaseManager;
