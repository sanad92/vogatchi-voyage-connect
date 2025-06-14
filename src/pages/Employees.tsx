
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
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-6 text-orange-900 flex items-center gap-2">
          <Users /> الموظفون
        </h2>
        <form
          onSubmit={handleAddEmployee}
          className="bg-white rounded-lg shadow p-6 mb-8 flex flex-col sm:flex-row gap-3 items-center"
        >
          <input
            type="text"
            placeholder="اسم الموظف"
            className="border rounded px-3 py-2 flex-1"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="القسم أو الوظيفة"
            className="border rounded px-3 py-2 flex-1"
            value={job}
            onChange={e => setJob(e.target.value)}
            required
          />
          <input
            type="tel"
            pattern="[0-9]{11}"
            title="أدخل رقم هاتف صحيح (11 رقم)"
            placeholder="رقم الهاتف"
            className="border rounded px-3 py-2 flex-1"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-orange-500 text-white px-5 py-2 rounded hover:bg-orange-600 transition"
          >
            إضافة
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-right">
            <thead>
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">الاسم</th>
                <th className="px-4 py-2">القسم</th>
                <th className="px-4 py-2">رقم الموبايل</th>
                <th className="px-4 py-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id} className="hover:bg-orange-50 transition">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">{e.job}</td>
                  <td className="px-4 py-2">{e.phone}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded ${e.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                      {e.active ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-500 text-center">لا يوجد موظفون حتى الآن.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;
