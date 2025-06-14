
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { X, Save, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import CustomerFormFields from "./CustomerFormFields";

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

interface CustomerFormProps {
  onCustomerAdded: (customer: Customer) => void;
  onCancel: () => void;
  initialData?: Partial<CustomerData>;
}

const CustomerForm = ({ onCustomerAdded, onCancel, initialData }: CustomerFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userRole } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerData>({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      nationality: initialData?.nationality || "",
      address: initialData?.address || "",
    }
  });

  const checkDuplicatePhone = async (phone: string) => {
    if (!phone || phone.length < 10) return false;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phone)
        .limit(1);
      
      if (error) {
        console.error('Error checking duplicate phone:', error);
        return false;
      }
      return data && data.length > 0 ? data[0] : false;
    } catch (error) {
      console.error('Error in checkDuplicatePhone:', error);
      return false;
    }
  };

  const onSubmit = async (data: CustomerData) => {
    console.log('بدء عملية إضافة عميل جديد...');
    console.log('دور المستخدم الحالي:', userRole);
    
    setIsSubmitting(true);
    try {
      // التحقق من تكرار رقم الهاتف
      console.log('التحقق من تكرار رقم الهاتف:', data.phone);
      const existingCustomer = await checkDuplicatePhone(data.phone);
      if (existingCustomer) {
        toast.error(`رقم الهاتف ${data.phone} مُسجل بالفعل للعميل: ${existingCustomer.name}`);
        setIsSubmitting(false);
        return;
      }

      console.log('محاولة إدراج العميل الجديد...');
      const customerData = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        nationality: data.nationality?.trim() || null,
        address: data.address?.trim() || null,
      };
      
      console.log('بيانات العميل المراد إدراجها:', customerData);

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select('id, name, phone, email, nationality')
        .single();

      if (error) {
        console.error('خطأ في قاعدة البيانات:', error);
        
        // معالجة أنواع الأخطاء المختلفة
        if (error.code === '42501') {
          toast.error('ليس لديك صلاحية إضافة العملاء. يرجى التواصل مع الإدارة.');
        } else if (error.code === '23505') {
          toast.error('هذا العميل موجود بالفعل في النظام.');
        } else if (error.message.includes('RLS')) {
          toast.error('مشكلة في الصلاحيات. يرجى التواصل مع الدعم الفني.');
        } else {
          toast.error(`خطأ في إضافة العميل: ${error.message}`);
        }
        throw error;
      }

      console.log('تم إضافة العميل بنجاح:', newCustomer);
      toast.success('تم إضافة العميل بنجاح');
      onCustomerAdded(newCustomer);
    } catch (error) {
      console.error('خطأ عام في إضافة العميل:', error);
      
      // إذا لم يتم التعامل مع الخطأ أعلاه
      if (!error.code) {
        toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      }
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
          <CustomerFormFields register={register} errors={errors} />
          
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

export default CustomerForm;
