
import Navbar from "@/components/Navbar";
import { FileText } from "lucide-react";

const stats = [
  { label: "إجمالي العملاء", value: 120 },
  { label: "العملاء النشطون", value: 75 },
  { label: "إجمالي الفواتير", value: "375,000 ج.م" },
  { label: "عدد الرحلات", value: 34 },
  { label: "أكثر موظف مبيعا", value: "يوسف عادل" },
];

const Reports = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-orange-900 flex items-center gap-2">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6" /> تقارير الأعمال
        </h2>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-6 sm:mb-10">
          {stats.map((s, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow text-center p-4 sm:p-6 hover:bg-orange-50 transition">
              <div className="font-extrabold text-lg sm:text-xl text-blue-700 mb-2">{s.value}</div>
              <div className="text-gray-600 text-sm sm:text-base">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ملخص الأعمال */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-8 text-gray-700">
          <h3 className="font-bold text-lg sm:text-xl mb-3 sm:mb-4 text-blue-600">ملخص الأعمال</h3>
          <ul className="list-disc list-inside leading-relaxed sm:leading-loose text-right space-y-2 text-sm sm:text-base">
            <li>زيادة بنسبة 25% في عدد العملاء خلال هذا الشهر.</li>
            <li>أعلى حجم رحلات تم بيعه في شهر 5.</li>
            <li>متوسط فاتورة الرحلة: 11,200 ج.م</li>
            <li>عودة 40% من العملاء الحاليين لرحلات جديدة.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Reports;
