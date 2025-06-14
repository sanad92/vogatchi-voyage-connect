
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  address?: string;
}

interface CustomerFormFieldsProps {
  register: UseFormRegister<CustomerData>;
  errors: FieldErrors<CustomerData>;
}

const CustomerFormFields = ({ register, errors }: CustomerFormFieldsProps) => {
  return (
    <>
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
    </>
  );
};

export default CustomerFormFields;
