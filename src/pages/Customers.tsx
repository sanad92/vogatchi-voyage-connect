
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { User } from "lucide-react";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

const dummyCustomers: Customer[] = [
  { id: 1, name: "أحمد علي", phone: "01001234567", email: "ahmed@example.com", notes: "عميل مميز" },
  { id: 2, name: "سارة محمد", phone: "01111223344", email: "sara@example.com", notes: "" },
];

const Customers = () => {
  const [customers, setCustomers] = useState(dummyCustomers);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setCustomers([
      ...customers,
      {
        id: customers.length + 1,
        name,
        phone,
        email,
        notes,
      },
    ]);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-900 flex items-center gap-2">
          <User className="h-5 w-5 sm:h-6 sm:w-6" /> العملاء
        </h2>
        
        {/* نموذج إضافة عميل جديد */}
        <form
          onSubmit={handleAddCustomer}
          className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="اسم العميل"
              className="border rounded px-3 py-2 text-sm sm:text-base w-full"
              value={name}
              onChange={e => setName(e.target.value)}
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
            <input
              type="email"
              placeholder="البريد الالكتروني (اختياري)"
              className="border rounded px-3 py-2 text-sm sm:text-base w-full"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="ملاحظات"
              className="border rounded px-3 py-2 text-sm sm:text-base w-full"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 sm:px-5 py-2 rounded hover:bg-blue-700 transition text-sm sm:text-base w-full sm:w-auto"
            >
              إضافة
            </button>
          </div>
        </form>

        {/* جدول العملاء */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">#</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">الاسم</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">رقم الموبايل</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">البريد الالكتروني</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((c, i) => (
                  <tr key={c.id} className="hover:bg-blue-50 transition">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{i + 1}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">
                      <div>
                        <div>{c.name}</div>
                        <div className="sm:hidden text-xs text-gray-500 mt-1">{c.phone}</div>
                        {c.email && <div className="md:hidden text-xs text-gray-500 mt-1">{c.email}</div>}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell">{c.phone}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">{c.email || "-"}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">{c.notes || "-"}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-gray-500 text-center text-sm">لا يوجد عملاء حتى الآن.</td>
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

export default Customers;
