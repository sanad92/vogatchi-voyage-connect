
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Users, User, Receipt, MessageCircle, Building, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [customers, employees, bookings, conversations] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('suppliers').select('id', { count: 'exact' }),
        supabase.from('bookings').select('id', { count: 'exact' }),
        supabase.from('conversations').select('id', { count: 'exact' })
      ]);

      return {
        customers: customers.count || 0,
        suppliers: employees.count || 0,
        bookings: bookings.count || 0,
        conversations: conversations.count || 0
      };
    }
  });

  const statsData = [
    { label: "إجمالي العملاء", value: stats?.customers || 0, icon: <User className="text-blue-600" /> },
    { label: "عدد الموردين", value: stats?.suppliers || 0, icon: <Building className="text-orange-500" /> },
    { label: "الحجوزات النشطة", value: stats?.bookings || 0, icon: <Calendar className="text-green-600" /> },
    { label: "جلسات واتساب", value: stats?.conversations || 0, icon: <MessageCircle className="text-[#25d366]" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50">
      <Navbar />
      <div className="container py-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 text-blue-700 text-center">لوحة التحكم - Vogatchi Tourism</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {statsData.map((s) => (
            <Card key={s.label} className="flex flex-col items-center justify-center p-6 hover:shadow-2xl transition-all group">
              <div className="mb-2 group-hover:scale-110 transition">{s.icon}</div>
              <CardTitle className="text-2xl font-extrabold">{s.value}</CardTitle>
              <span className="text-gray-500">{s.label}</span>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/bookings">
            <Card className="p-5 text-center hover:bg-green-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-green-800 mb-1">إدارة الحجوزات</h2>
              <p className="text-gray-500">إنشاء وإدارة حجوزات الفنادق والطيران والجولات السياحية.</p>
            </Card>
          </Link>
          
          <Link to="/suppliers">
            <Card className="p-5 text-center hover:bg-orange-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-orange-700 mb-1">إدارة الموردين</h2>
              <p className="text-gray-500">إضافة وإدارة الفنادق وشركات الطيران والنقل.</p>
            </Card>
          </Link>

          <Link to="/customers">
            <Card className="p-5 text-center hover:bg-blue-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-blue-800 mb-1">إدارة العملاء</h2>
              <p className="text-gray-500">سجل وحرر واطّلع على كل عملائك بسهولة.</p>
            </Card>
          </Link>
          
          <Link to="/invoices">
            <Card className="p-5 text-center hover:bg-purple-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-purple-700 mb-1">الفواتير والمدفوعات</h2>
              <p className="text-gray-500">أنشئ فواتير العملاء وأوامر دفع الموردين.</p>
            </Card>
          </Link>
          
          <Link to="/whatsapp">
            <Card className="p-5 text-center hover:bg-green-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-[#25d366] mb-1">محادثات واتساب</h2>
              <p className="text-gray-500">تابع تواصلك مع العملاء عبر الواتساب.</p>
            </Card>
          </Link>

          <Link to="/reports">
            <Card className="p-5 text-center hover:bg-red-50 transition shadow hover:-translate-y-1">
              <h2 className="font-bold text-lg text-red-700 mb-1">تقارير الأرباح</h2>
              <p className="text-gray-500">تقارير مفصلة عن الأرباح والخسائر والأداء.</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
