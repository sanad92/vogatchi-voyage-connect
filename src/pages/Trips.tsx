
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
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-900 flex items-center gap-2">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6" /> أرشيف الرحلات
        </h2>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">#</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">اسم الرحلة</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">التاريخ</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">عدد العملاء</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">المرافق/الدليل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dummyTrips.map((trip, i) => (
                  <tr key={trip.id} className="hover:bg-yellow-50 transition">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{i + 1}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">
                      <div>
                        <div>{trip.name}</div>
                        <div className="sm:hidden text-xs text-gray-500 mt-1">{trip.date}</div>
                        <div className="md:hidden text-xs text-gray-500 mt-1">{trip.customers} عميل</div>
                        <div className="lg:hidden text-xs text-gray-500 mt-1">{trip.guide}</div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell">{trip.date}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">{trip.customers}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">{trip.guide}</td>
                  </tr>
                ))}
                {dummyTrips.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-gray-500 text-center text-sm">لا يوجد رحلات.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trips;
