
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors, Control } from "react-hook-form";
import CustomerSegmentSelector from "./CustomerSegmentSelector";
import { CustomerData } from "@/types/customer";

interface CustomerFormFieldsProps {
  register: UseFormRegister<CustomerData>;
  errors: FieldErrors<CustomerData>;
  control: Control<CustomerData>;
  step?: 1 | 2; // 1 = basic (name, phone, email), 2 = additional (nationality, address, segment)
}

const CustomerFormFields = ({ register, errors, control, step }: CustomerFormFieldsProps) => {
  const showStep1 = !step || step === 1;
  const showStep2 = !step || step === 2;

  return (
    <>
      {showStep1 && (
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
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
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
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
          </div>

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
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
        </div>
      )}

      {showStep2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nationality">الجنسية</Label>
            <Input
              id="nationality"
              {...register('nationality')}
              placeholder="المصرية"
              className="bg-white"
            />
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

          <CustomerSegmentSelector 
            control={control}
            error={errors.segment_id?.message}
          />
        </div>
      )}
    </>
  );
};

export default CustomerFormFields;
