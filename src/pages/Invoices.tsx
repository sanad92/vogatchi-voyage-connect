
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { Invoice } from "lucide-react";

type InvoiceType = {
  id: number;
  customer: string;
  amount: number;
  date: string;
  status: "مدفوع" | "معلق";
};

const dummyInvoices: InvoiceType[] = [
  { id: 1, customer: "أحمد علي", amount: 6500, date: "2024-06-13", status: "مدفوع" },
  { id: 2, customer: "سارة محمد", amount: 3500, date: "2024-05-27", status: "معلق" },
];

const Invoices = () => {
  const [invoices, setInvoices] = useState(dummyInvoices);
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"مدفوع" | "معلق">("معلق");

  const handleAddInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !amount || !date) return;
    setInvoices([
      ...invoices,
      {
        id: invoices.length + 1,
        customer,
        amount: Number(amount),
        date,
        status,
      },
    ]);
    setCustomer("");
    setAmount("");
    setDate("");
    setStatus("معلق");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar />
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-6 text-green-800 flex items-center gap-2">
          <Invoice /> الفواتير
        </h2>
        <form
          onSubmit={handleAddInvoice}
          className="bg-white rounded-lg shadow p-6 mb-8 flex flex-col sm:flex-row gap-3 items-center"
        >
          <input
            type="text"
            placeholder="اسم العميل"
            className="border rounded px-3 py-2 flex-1"
            value={customer}
            onChange={e => setCustomer(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="المبلغ بالجنيه"
            className="border rounded px-3 py-2 flex-1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            min={0}
          />
          <input
            type="date"
            className="border rounded px-3 py-2 flex-1"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <select
            className="border rounded px-3 py-2 flex-1"
            value={status}
            onChange={e => setStatus(e.target.value as "مدفوع" | "معلق")}
          >
            <option value="معلق">معلق</option>
            <option value="مدفوع">مدفوع</option>
          </select>
          <button
            type="submit"
            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 transition"
          >
            إضافة
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-right">
            <thead>
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">اسم العميل</th>
                <th className="px-4 py-2">المبلغ</th>
                <th className="px-4 py-2">التاريخ</th>
                <th className="px-4 py-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} className="hover:bg-green-50 transition">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{inv.customer}</td>
                  <td className="px-4 py-2">{inv.amount.toLocaleString()} ج.م</td>
                  <td className="px-4 py-2">{inv.date}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 rounded ${inv.status === "مدفوع" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-orange-800"}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-500 text-center">لا يوجد فواتير.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
