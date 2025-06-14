
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
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-6 text-orange-900 flex items-center gap-2">
          <FileText /> تقارير الأعمال
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {stats.map((s, idx) => (
            <div key={idx} className="bg-white rounded shadow text-center p-6 hover:bg-orange-50 transition text-lg">
              <span className="font-extrabold text-blue-700">{s.value}</span>
              <div className="text-gray-600 mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white shadow rounded p-8 text-gray-700">
          <h3 className="font-bold text-xl mb-3 text-blue-600">ملخص الأعمال</h3>
          <ul className="list-disc list-inside leading-loose text-right">
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
