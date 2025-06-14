
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
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center gap-2">
          <User /> العملاء
        </h2>
        <form
          onSubmit={handleAddCustomer}
          className="bg-white rounded-lg shadow p-6 mb-8 flex flex-col sm:flex-row gap-3 items-center"
        >
          <input
            type="text"
            placeholder="اسم العميل"
            className="border rounded px-3 py-2 flex-1"
            value={name}
            onChange={e => setName(e.target.value)}
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
          <input
            type="email"
            placeholder="البريد الالكتروني (اختياري)"
            className="border rounded px-3 py-2 flex-1"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="text"
            placeholder="ملاحظات"
            className="border rounded px-3 py-2 flex-1"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
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
                <th className="px-4 py-2">رقم الموبايل</th>
                <th className="px-4 py-2">البريد الالكتروني</th>
                <th className="px-4 py-2">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.phone}</td>
                  <td className="px-4 py-2">{c.email || "-"}</td>
                  <td className="px-4 py-2">{c.notes || "-"}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-500 text-center">لا يوجد عملاء حتى الآن.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;
