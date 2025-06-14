
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Building, Plus, Edit, Eye, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Supplier = {
  id: string;
  name: string;
  type: 'hotel' | 'airline' | 'transport' | 'tour';
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account: string | null;
  tax_number: string | null;
  rating: number | null;
  notes: string | null;
  is_active: boolean | null;
};

const Suppliers = () => {
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    type: "hotel" as const,
    contact_person: "",
    email: "",
    phone: "",
    bank_name: "",
    bank_account: "",
    tax_number: "",
    rating: 0,
    notes: ""
  });
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    }
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (supplier: typeof newSupplier) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplier])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setNewSupplier({
        name: "",
        type: "hotel",
        contact_person: "",
        email: "",
        phone: "",
        bank_name: "",
        bank_account: "",
        tax_number: "",
        rating: 0,
        notes: ""
      });
      setShowForm(false);
      toast({
        title: "تم إضافة المورد بنجاح",
        description: "تم حفظ بيانات المورد الجديد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة المورد",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getTypeLabel = (type: string) => {
    const types = {
      hotel: "فندق",
      airline: "طيران",
      transport: "نقل",
      tour: "جولة سياحية"
    };
    return types[type as keyof typeof types] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      hotel: "bg-blue-100 text-blue-800",
      airline: "bg-green-100 text-green-800",
      transport: "bg-yellow-100 text-yellow-800",
      tour: "bg-purple-100 text-purple-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const renderStars = (rating: number | null) => {
    const stars = [];
    const ratingValue = rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i <= ratingValue ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) {
      toast({
        title: "اسم المورد مطلوب",
        variant: "destructive",
      });
      return;
    }
    addSupplierMutation.mutate(newSupplier);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <Building /> إدارة الموردين المتقدمة
          </h2>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            إضافة مورد جديد
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>إضافة مورد جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="اسم المورد"
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                  required
                />
                <Select value={newSupplier.type} onValueChange={(value: any) => setNewSupplier({...newSupplier, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">فندق</SelectItem>
                    <SelectItem value="airline">طيران</SelectItem>
                    <SelectItem value="transport">نقل</SelectItem>
                    <SelectItem value="tour">جولة سياحية</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="اسم الشخص المسؤول"
                  value={newSupplier.contact_person}
                  onChange={e => setNewSupplier({...newSupplier, contact_person: e.target.value})}
                />
                <Input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={newSupplier.email}
                  onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
                />
                <Input
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={newSupplier.phone}
                  onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                />
                <Input
                  placeholder="اسم البنك"
                  value={newSupplier.bank_name}
                  onChange={e => setNewSupplier({...newSupplier, bank_name: e.target.value})}
                />
                <Input
                  placeholder="رقم الحساب البنكي"
                  value={newSupplier.bank_account}
                  onChange={e => setNewSupplier({...newSupplier, bank_account: e.target.value})}
                />
                <Input
                  placeholder="الرقم الضريبي"
                  value={newSupplier.tax_number}
                  onChange={e => setNewSupplier({...newSupplier, tax_number: e.target.value})}
                />
                <Select value={newSupplier.rating.toString()} onValueChange={(value) => setNewSupplier({...newSupplier, rating: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue placeholder="التقييم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">بدون تقييم</SelectItem>
                    <SelectItem value="1">⭐</SelectItem>
                    <SelectItem value="2">⭐⭐</SelectItem>
                    <SelectItem value="3">⭐⭐⭐</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐</SelectItem>
                  </SelectContent>
                </Select>
                <div className="md:col-span-2">
                  <Textarea
                    placeholder="ملاحظات إضافية"
                    value={newSupplier.notes}
                    onChange={e => setNewSupplier({...newSupplier, notes: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={addSupplierMutation.isPending}>
                    {addSupplierMutation.isPending ? "جاري الحفظ..." : "حفظ المورد"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8">جاري تحميل الموردين...</div>
          ) : suppliers.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">لا يوجد موردون حتى الآن</div>
          ) : (
            suppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    <Badge className={getTypeColor(supplier.type)}>
                      {getTypeLabel(supplier.type)}
                    </Badge>
                  </div>
                  {supplier.rating && supplier.rating > 0 && (
                    <div className="flex items-center gap-2">
                      {renderStars(supplier.rating)}
                      <span className="text-sm text-gray-600">({supplier.rating}/5)</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {supplier.contact_person && (
                      <p><span className="font-medium">الشخص المسؤول:</span> {supplier.contact_person}</p>
                    )}
                    {supplier.phone && (
                      <p><span className="font-medium">الهاتف:</span> {supplier.phone}</p>
                    )}
                    {supplier.email && (
                      <p><span className="font-medium">البريد:</span> {supplier.email}</p>
                    )}
                    {supplier.bank_name && (
                      <p><span className="font-medium">البنك:</span> {supplier.bank_name}</p>
                    )}
                    {supplier.bank_account && (
                      <p><span className="font-medium">رقم الحساب:</span> {supplier.bank_account}</p>
                    )}
                    {supplier.tax_number && (
                      <p><span className="font-medium">الرقم الضريبي:</span> {supplier.tax_number}</p>
                    )}
                    {supplier.notes && (
                      <p><span className="font-medium">ملاحظات:</span> {supplier.notes}</p>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant={supplier.is_active ? "default" : "secondary"}>
                        {supplier.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
