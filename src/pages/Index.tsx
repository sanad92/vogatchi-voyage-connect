
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Users, User, Invoice, Whatsapp } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "إجمالي العملاء", value: 120, icon: <User className="text-blue-600" /> },
  { label: "عدد الموظفين", value: 18, icon: <Users className="text-orange-500" /> },
  { label: "الفواتير هذا الشهر", value: 53, icon: <Invoice className="text-green-600" /> },
  { label: "جلسات واتساب", value: 31, icon: <Whatsapp className="text-[#25d366]" /> },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50">
      <Navbar />
      <div className="container py-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 text-blue-700 text-center">لوحة التحكم - Vogatchi</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((s) => (
            <Card key={s.label} className="flex flex-col items-center justify-center p-6 hover:shadow-2xl transition-all group">
              <div className="mb-2 group-hover:scale-110 transition">{s.icon}</div>
              <CardTitle className="text-2xl font-extrabold">{s.value}</CardTitle>
              <span className="text-gray-500">{s.label}</span>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/customers">
            <Card className="p-5 text-center hover:bg-orange-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-blue-800 mb-1">إدارة العملاء</h2>
              <p className="text-gray-500">سجل، حرر واطّلع على كل عملائك بسهولة.</p>
            </Card>
          </Link>
          <Link to="/invoices">
            <Card className="p-5 text-center hover:bg-blue-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-orange-700 mb-1">الفواتير</h2>
              <p className="text-gray-500">أنشئ وأدر الفواتير ببساطة واحترافية.</p>
            </Card>
          </Link>
          <Link to="/whatsapp">
            <Card className="p-5 text-center hover:bg-green-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-[#25d366] mb-1">محادثات واتساب</h2>
              <p className="text-gray-500">تابع تواصلك مع العملاء عبر الواتساب.</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
