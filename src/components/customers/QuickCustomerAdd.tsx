
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { X, Save, UserPlus } from "lucide-react";

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

  const { register, handleSubmit, formState: { errors }, watch } = useForm<CustomerData>({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      nationality: initialData?.nationality || "",
      address: initialData?.address || "",
    }
  });

  const phoneValue = watch('phone');

  const checkDuplicatePhone = async (phone: string) => {
    if (!phone || phone.length < 10) return false;
    
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', phone)
      .limit(1);
    
    if (error) return false;
    return data && data.length > 0 ? data[0] : false;
  };

  const onSubmit = async (data: CustomerData) => {
    setIsSubmitting(true);
    try {
      // التحقق من تكرار رقم الهاتف
      const existingCustomer = await checkDuplicatePhone(data.phone);
      if (existingCustomer) {
        toast.error(`رقم الهاتف ${data.phone} مُسجل بالفعل للعميل: ${existingCustomer.name}`);
        setIsSubmitting(false);
        return;
      }

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([{
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email?.trim() || null,
          nationality: data.nationality?.trim() || null,
          address: data.address?.trim() || null,
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
    <Card className="w-full border-blue-200 bg-blue-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-800">إضافة عميل جديد</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">اسم العميل *</Label>
              <Input
                id="name"
                {...register('name', { 
                  required: 'اسم العميل مطلوب',
                  minLength: { value: 2, message: 'الاسم يجب أن يكون حرفين على الأقل' }
                })}
                placeholder="الاسم الكامل"
                className="bg-white"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="phone">رقم الهاتف *</Label>
              <Input
                id="phone"
                {...register('phone', { 
                  required: 'رقم الهاتف مطلوب',
                  pattern: {
                    value: /^[+]?[0-9\s-()]+$/,
                    message: 'رقم الهاتف غير صحيح'
                  }
                })}
                placeholder="+20 1XXXXXXXXX"
                className="bg-white"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'البريد الإلكتروني غير صحيح'
                  }
                })}
                placeholder="example@email.com"
                className="bg-white"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="nationality">الجنسية</Label>
              <Input
                id="nationality"
                {...register('nationality')}
                placeholder="المصرية"
                className="bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">العنوان</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="العنوان التفصيلي"
              className="bg-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
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
