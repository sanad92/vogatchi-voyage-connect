
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { Users } from "lucide-react";

type Employee = {
  id: number;
  name: string;
  job: string;
  phone: string;
  active: boolean;
};

const dummyEmployees: Employee[] = [
  { id: 1, name: "يوسف عادل", job: "مندوب مبيعات", phone: "01001783722", active: true },
  { id: 2, name: "ندى عاطف", job: "قسم التذاكر", phone: "01009564312", active: false },
];

const Employees = () => {
  const [employees, setEmployees] = useState(dummyEmployees);
  const [name, setName] = useState("");
  const [job, setJob] = useState("");
  const [phone, setPhone] = useState("");

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !job || !phone) return;
    setEmployees([
      ...employees,
      {
        id: employees.length + 1,
        name,
        job,
        phone,
        active: true,
      },
    ]);
    setName("");
    setJob("");
    setPhone("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-orange-900 flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" /> الموظفون
        </h2>

        {/* نموذج إضافة موظف جديد */}
        <form
          onSubmit={handleAddEmployee}
          className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="اسم الموظف"
              className="border rounded px-3 py-2 text-sm sm:text-base w-full"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="القسم أو الوظيفة"
              className="border rounded px-3 py-2 text-sm sm:text-base w-full"
              value={job}
              onChange={e => setJob(e.target.value)}
              required
            />
            <input
              type="tel"
              pattern="[0-9]{11}"
              title="أدخل رقم هاتف صحيح (11 رقم)"
              placeholder="رقم الهاتف"
              className="border rounded px-3 py-2 text-sm sm:text-base w-full"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-orange-500 text-white px-4 sm:px-5 py-2 rounded hover:bg-orange-600 transition text-sm sm:text-base w-full sm:w-auto"
            >
              إضافة
            </button>
          </div>
        </form>

        {/* جدول الموظفين */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">#</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">الاسم</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">القسم</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">رقم الموبايل</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((e, i) => (
                  <tr key={e.id} className="hover:bg-orange-50 transition">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{i + 1}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">
                      <div>
                        <div>{e.name}</div>
                        <div className="sm:hidden text-xs text-gray-500 mt-1">{e.job}</div>
                        <div className="md:hidden text-xs text-gray-500 mt-1">{e.phone}</div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell">{e.job}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">{e.phone}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        e.active 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {e.active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-gray-500 text-center text-sm">لا يوجد موظفون حتى الآن.</td>
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

export default Employees;
