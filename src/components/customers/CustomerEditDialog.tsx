import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customer";

interface CustomerEditDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface EditCustomerForm {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nationality?: string;
  passport_number?: string;
}

const CustomerEditDialog = ({ customer, open, onClose, onSave }: CustomerEditDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditCustomerForm>({
    defaultValues: {
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      nationality: customer.nationality || '',
      passport_number: customer.passport_number || '',
    }
  });

  useEffect(() => {
    if (customer && open) {
      reset({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        nationality: customer.nationality || '',
        passport_number: customer.passport_number || '',
      });
    }
  }, [customer, open, reset]);

  const onSubmit = async (data: EditCustomerForm) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
          nationality: data.nationality || null,
          passport_number: data.passport_number || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (error) throw error;

      toast.success('تم تحديث بيانات العميل بنجاح');
      onSave();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('حدث خطأ في تحديث بيانات العميل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات العميل</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">اسم العميل *</Label>
              <Input
                id="name"
                {...register('name', { required: 'اسم العميل مطلوب' })}
                placeholder="أدخل اسم العميل"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">رقم الهاتف *</Label>
              <Input
                id="phone"
                {...register('phone', { required: 'رقم الهاتف مطلوب' })}
                placeholder="أدخل رقم الهاتف"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="أدخل البريد الإلكتروني"
              />
            </div>

            <div>
              <Label htmlFor="nationality">الجنسية</Label>
              <Input
                id="nationality"
                {...register('nationality')}
                placeholder="أدخل الجنسية"
              />
            </div>

            <div>
              <Label htmlFor="passport_number">رقم الجواز</Label>
              <Input
                id="passport_number"
                {...register('passport_number')}
                placeholder="أدخل رقم الجواز"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">العنوان</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="أدخل العنوان"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerEditDialog;