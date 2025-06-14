
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface Service {
  id: string;
  name: string;
  type: string;
  location: string | null;
  supplier_id: string;
  service_category: string | null;
  suppliers: {
    name: string;
  };
}

interface BookingFormProps {
  customers: Customer[];
  services: Service[];
  onSubmit: (booking: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const BookingForm = ({ customers, services, onSubmit, onCancel, isLoading }: BookingFormProps) => {
  const [newBooking, setNewBooking] = useState({
    customer_id: "",
    service_id: "",
    check_in_date: "",
    check_out_date: "",
    number_of_guests: 1,
    supplier_cost: 0,
    selling_price: 0,
    notes: ""
  });
  const { toast } = useToast();

  const getServiceCategoryLabel = (category: string | null) => {
    const labels = {
      hotel: "فندق",
      flight: "طيران",
      transfer: "انتقالات",
      car_rental: "إيجار سيارة",
      local_tour: "رحلة داخلية",
      other: "أخرى"
    };
    return labels[category as keyof typeof labels] || "غير محدد";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.customer_id || !newBooking.service_id || !newBooking.selling_price) {
      toast({
        title: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    onSubmit(newBooking);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إنشاء حجز جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select value={newBooking.customer_id} onValueChange={(value) => setNewBooking({...newBooking, customer_id: value})}>
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

          <Select value={newBooking.service_id} onValueChange={(value) => setNewBooking({...newBooking, service_id: value})}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الخدمة" />
            </SelectTrigger>
            <SelectContent>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - {getServiceCategoryLabel(service.service_category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={newBooking.check_in_date}
            onChange={e => setNewBooking({...newBooking, check_in_date: e.target.value})}
            placeholder="تاريخ الوصول"
          />

          <Input
            type="date"
            value={newBooking.check_out_date}
            onChange={e => setNewBooking({...newBooking, check_out_date: e.target.value})}
            placeholder="تاريخ المغادرة"
          />

          <Input
            type="number"
            value={newBooking.number_of_guests}
            onChange={e => setNewBooking({...newBooking, number_of_guests: parseInt(e.target.value) || 1})}
            placeholder="عدد الضيوف"
            min="1"
          />

          <Input
            type="number"
            value={newBooking.supplier_cost}
            onChange={e => setNewBooking({...newBooking, supplier_cost: parseFloat(e.target.value) || 0})}
            placeholder="تكلفة المورد"
            step="0.01"
          />

          <Input
            type="number"
            value={newBooking.selling_price}
            onChange={e => setNewBooking({...newBooking, selling_price: parseFloat(e.target.value) || 0})}
            placeholder="سعر البيع"
            step="0.01"
          />

          <div className="md:col-span-2">
            <Input
              value={newBooking.notes}
              onChange={e => setNewBooking({...newBooking, notes: e.target.value})}
              placeholder="ملاحظات إضافية"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : "إنشاء الحجز"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
