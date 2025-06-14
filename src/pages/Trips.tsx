
import Navbar from "@/components/Navbar";
import { FileText } from "lucide-react";

const dummyTrips = [
  { id: 1, name: "رحلة شرم الشيخ", date: "2024-06-01", customers: 24, guide: "يوسف عادل" },
  { id: 2, name: "رحلة الأقصر وأسوان", date: "2024-05-15", customers: 18, guide: "ندى عاطف" },
];

const Trips = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Navbar />
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2">
          <FileText /> أرشيف الرحلات
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-right">
            <thead>
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">اسم الرحلة</th>
                <th className="px-4 py-2">التاريخ</th>
                <th className="px-4 py-2">عدد العملاء</th>
                <th className="px-4 py-2">المرافق/الدليل</th>
              </tr>
            </thead>
            <tbody>
              {dummyTrips.map((trip, i) => (
                <tr key={trip.id} className="hover:bg-yellow-50 transition">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{trip.name}</td>
                  <td className="px-4 py-2">{trip.date}</td>
                  <td className="px-4 py-2">{trip.customers}</td>
                  <td className="px-4 py-2">{trip.guide}</td>
                </tr>
              ))}
              {dummyTrips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-500 text-center">لا يوجد رحلات.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Trips;
