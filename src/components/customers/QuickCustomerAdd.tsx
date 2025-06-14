
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { X, Save } from "lucide-react";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  address?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
}

interface QuickCustomerAddProps {
  onCustomerAdded: (customer: Customer) => void;
  onCancel: () => void;
  initialData?: Partial<CustomerData>;
}

const QuickCustomerAdd = ({ onCustomerAdded, onCancel, initialData }: QuickCustomerAddProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerData>({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      nationality: initialData?.nationality || "",
      address: initialData?.address || "",
    }
  });

  const onSubmit = async (data: CustomerData) => {
    setIsSubmitting(true);
    try {
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([{
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          nationality: data.nationality || null,
          address: data.address || null,
        }])
        .select('id, name, phone, email, nationality')
        .single();

      if (error) throw error;

      toast.success('تم إضافة العميل بنجاح');
      onCustomerAdded(newCustomer);
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('حدث خطأ في إضافة العميل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg">إضافة عميل جديد</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">اسم العميل *</Label>
            <Input
              id="name"
              {...register('name', { required: 'اسم العميل مطلوب' })}
              placeholder="الاسم الكامل"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone">رقم الهاتف *</Label>
            <Input
              id="phone"
              {...register('phone', { required: 'رقم الهاتف مطلوب' })}
              placeholder="+20 1XXXXXXXXX"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="example@email.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="nationality">الجنسية</Label>
            <Input
              id="nationality"
              {...register('nationality')}
              placeholder="المصرية"
            />
          </div>

          <div>
            <Label htmlFor="address">العنوان</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="العنوان التفصيلي"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ العميل'}
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

export default QuickCustomerAdd;
