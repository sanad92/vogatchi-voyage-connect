
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  type: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  rating: number | null;
  payment_type: 'prepaid' | 'deferred';
  payment_method_options: string[];
  payment_terms: string | null;
  is_active: boolean | null;
}

interface SupplierGridProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onSupplierSelect: (id: string) => void;
}

const SupplierGrid = ({ suppliers, isLoading, onSupplierSelect }: SupplierGridProps) => {
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

  const getPaymentTypeLabel = (type: string) => {
    return type === 'prepaid' ? 'دفع مسبق' : 'دفع آجل';
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'نقدي',
      bank_transfer: 'حوالة بنكية',
      check: 'شيك',
      credit_card: 'بطاقة ائتمان',
      installments: 'أقساط',
      trade_credit: 'ائتمان تجاري'
    };
    return methods[method as keyof typeof methods] || method;
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

  if (isLoading) {
    return (
      <div className="col-span-full text-center py-8">جاري تحميل الموردين...</div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="col-span-full text-center py-8 text-gray-500">لا يوجد موردون مطابقون للبحث</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {suppliers.map((supplier) => (
        <Card key={supplier.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSupplierSelect(supplier.id)}>
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
              <p><span className="font-medium">نوع الدفع:</span> {getPaymentTypeLabel(supplier.payment_type)}</p>
              {supplier.payment_method_options && supplier.payment_method_options.length > 0 && (
                <div>
                  <span className="font-medium">وسائل الدفع:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {supplier.payment_method_options.map((method, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {getPaymentMethodLabel(method)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {supplier.payment_terms && (
                <p><span className="font-medium">شروط الدفع:</span> {supplier.payment_terms}</p>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Badge variant={supplier.is_active ? "default" : "secondary"}>
                  {supplier.is_active ? "نشط" : "غير نشط"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SupplierGrid;
