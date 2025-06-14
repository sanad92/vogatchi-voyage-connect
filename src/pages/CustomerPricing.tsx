
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CustomerPricing = {
  id: string;
  customer_id: string;
  service_id: string;
  custom_price: number;
  profit_margin: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  customers: { name: string; phone: string };
  services: { name: string; type: string; location: string | null };
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

type Service = {
  id: string;
  name: string;
  type: string;
  location: string | null;
};

const CustomerPricing = () => {
  const [newPricing, setNewPricing] = useState({
    customer_id: "",
    service_id: "",
    custom_price: 0,
    profit_margin: 15,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: ""
  });
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // استعلام الأسعار المخصصة
  const { data: pricings = [], isLoading } = useQuery({
    queryKey: ['customer-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_pricing')
        .select(`
          *,
          customers(name, phone),
          services(name, type, location)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomerPricing[];
    }
  });

  // استعلام العملاء
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .order('name');
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  // استعلام الخدمات
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, type, location')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  // إضافة سعر مخصص جديد
  const addPricingMutation = useMutation({
    mutationFn: async (pricing: typeof newPricing) => {
      const { data, error } = await supabase
        .from('customer_pricing')
        .insert([{
          customer_id: pricing.customer_id,
          service_id: pricing.service_id,
          custom_price: pricing.custom_price,
          profit_margin: pricing.profit_margin,
          valid_from: pricing.valid_from,
          valid_until: pricing.valid_until || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-pricing'] });
      setNewPricing({
        customer_id: "",
        service_id: "",
        custom_price: 0,
        profit_margin: 15,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: ""
      });
      setShowForm(false);
      toast({
        title: "تم إضافة السعر المخصص بنجاح",
        description: "تم حفظ السعر الجديد للعميل",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة السعر المخصص",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // حذف سعر مخصص
  const deletePricingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_pricing')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-pricing'] });
      toast({
        title: "تم حذف السعر المخصص",
        description: "تم حذف السعر بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف السعر",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getServiceTypeLabel = (type: string) => {
    const types = {
      hotel: "فندق",
      flight: "طيران",
      transfer: "نقل",
      car_rental: "إيجار سيارة",
      local_tour: "رحلة داخلية"
    };
    return types[type as keyof typeof types] || type;
  };

  const getServiceTypeColor = (type: string) => {
    const colors = {
      hotel: "bg-blue-100 text-blue-800",
      flight: "bg-green-100 text-green-800",
      transfer: "bg-yellow-100 text-yellow-800",
      car_rental: "bg-purple-100 text-purple-800",
      local_tour: "bg-orange-100 text-orange-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPricing.customer_id || !newPricing.service_id || newPricing.custom_price <= 0) {
      toast({
        title: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    addPricingMutation.mutate(newPricing);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <DollarSign /> إدارة الأسعار المرنة
          </h2>
          <Button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 ml-2" />
            إضافة سعر مخصص
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>إضافة سعر مخصص جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={newPricing.customer_id} onValueChange={(value) => setNewPricing({...newPricing, customer_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={newPricing.service_id} onValueChange={(value) => setNewPricing({...newPricing, service_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {getServiceTypeLabel(service.type)}
                        {service.location && ` (${service.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="السعر المخصص"
                  value={newPricing.custom_price}
                  onChange={e => setNewPricing({...newPricing, custom_price: parseFloat(e.target.value) || 0})}
                  step="0.01"
                  required
                />

                <Input
                  type="number"
                  placeholder="هامش الربح %"
                  value={newPricing.profit_margin}
                  onChange={e => setNewPricing({...newPricing, profit_margin: parseFloat(e.target.value) || 0})}
                  step="0.01"
                />

                <Input
                  type="date"
                  placeholder="ساري من"
                  value={newPricing.valid_from}
                  onChange={e => setNewPricing({...newPricing, valid_from: e.target.value})}
                  required
                />

                <Input
                  type="date"
                  placeholder="ساري حتى (اختياري)"
                  value={newPricing.valid_until}
                  onChange={e => setNewPricing({...newPricing, valid_until: e.target.value})}
                />

                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={addPricingMutation.isPending}>
                    {addPricingMutation.isPending ? "جاري الحفظ..." : "حفظ السعر"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="text-center py-8">جاري تحميل الأسعار...</div>
          ) : pricings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد أسعار مخصصة حتى الآن</div>
          ) : (
            pricings.map((pricing) => (
              <Card key={pricing.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{pricing.customers.name}</h3>
                      <p className="text-gray-600">{pricing.customers.phone}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getServiceTypeColor(pricing.services.type)}>
                          {getServiceTypeLabel(pricing.services.type)}
                        </Badge>
                        <span className="text-sm text-gray-600">{pricing.services.name}</span>
                      </div>
                      {pricing.services.location && (
                        <p className="text-sm text-gray-500">الموقع: {pricing.services.location}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold text-purple-600">
                        {pricing.custom_price.toLocaleString()} ج.م
                      </div>
                      <div className="text-sm text-gray-600">
                        هامش الربح: {pricing.profit_margin}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium">ساري من:</span>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(pricing.valid_from).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">ساري حتى:</span>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {pricing.valid_until ? new Date(pricing.valid_until).toLocaleDateString('ar-EG') : 'مفتوح'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">الحالة:</span>
                      <p>
                        <Badge variant={pricing.is_active && !isExpired(pricing.valid_until) ? "default" : "secondary"}>
                          {pricing.is_active && !isExpired(pricing.valid_until) ? "نشط" : "غير نشط"}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  {isExpired(pricing.valid_until) && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">⚠️ هذا السعر منتهي الصلاحية</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      تعديل
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => deletePricingMutation.mutate(pricing.id)}
                      disabled={deletePricingMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      حذف
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

export default CustomerPricing;
