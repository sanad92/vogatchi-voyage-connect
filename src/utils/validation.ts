
import { z } from 'zod';

// مخططات التحقق من البيانات
export const customerValidationSchema = z.object({
  name: z.string().min(2, 'اسم العميل يجب أن يكون على الأقل حرفين').max(100, 'اسم العميل طويل جداً'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  phone: z.string().min(10, 'رقم الهاتف يجب أن يكون على الأقل 10 أرقام').max(15, 'رقم الهاتف طويل جداً'),
  nationality: z.string().optional(),
  passport_number: z.string().optional(),
  address: z.string().optional(),
});

export const hotelBookingValidationSchema = z.object({
  customer_name: z.string().min(2, 'اسم العميل مطلوب'),
  hotel_name: z.string().min(2, 'اسم الفندق مطلوب'),
  destination_city: z.string().min(2, 'مدينة الوجهة مطلوبة'),
  check_in_date: z.string().min(1, 'تاريخ الوصول مطلوب'),
  check_out_date: z.string().min(1, 'تاريخ المغادرة مطلوب'),
  number_of_nights: z.number().min(1, 'عدد الليالي يجب أن يكون على الأقل 1'),
  number_of_adults: z.number().min(1, 'عدد البالغين يجب أن يكون على الأقل 1'),
  number_of_children: z.number().min(0, 'عدد الأطفال لا يمكن أن يكون سالب'),
  room_type: z.string().min(1, 'نوع الغرفة مطلوب'),
  meal_plan: z.string().min(1, 'خطة الطعام مطلوبة'),
  cost_per_night: z.number().min(0, 'تكلفة الليلة لا يمكن أن تكون سالبة'),
  selling_price_per_night: z.number().min(0, 'سعر البيع لا يمكن أن يكون سالب'),
  supplier_name: z.string().min(2, 'اسم المورد مطلوب'),
  booking_agent_name: z.string().min(2, 'اسم وكيل الحجز مطلوب'),
});

export const flightBookingValidationSchema = z.object({
  customer_name: z.string().min(2, 'اسم العميل مطلوب'),
  departure_airport_id: z.string().min(1, 'مطار المغادرة مطلوب'),
  arrival_airport_id: z.string().min(1, 'مطار الوصول مطلوب'),
  departure_date: z.string().min(1, 'تاريخ المغادرة مطلوب'),
  arrival_date: z.string().min(1, 'تاريخ الوصول مطلوب'),
  airline_id: z.string().min(1, 'شركة الطيران مطلوبة'),
  flight_class_id: z.string().min(1, 'درجة الطيران مطلوبة'),
  number_of_passengers: z.number().min(1, 'عدد المسافرين يجب أن يكون على الأقل 1'),
  ticket_price_per_person: z.number().min(0, 'سعر التذكرة لا يمكن أن يكون سالب'),
  supplier_cost: z.number().min(0, 'تكلفة المورد لا يمكن أن تكون سالبة'),
  total_cost: z.number().min(0, 'التكلفة الإجمالية لا يمكن أن تكون سالبة'),
  supplier_name: z.string().min(2, 'اسم المورد مطلوب'),
  booking_agent_name: z.string().min(2, 'اسم وكيل الحجز مطلوب'),
});

export const expenseValidationSchema = z.object({
  description: z.string().min(3, 'وصف المصروف يجب أن يكون على الأقل 3 أحرف'),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  category_id: z.string().min(1, 'فئة المصروف مطلوبة'),
  transaction_date: z.string().min(1, 'تاريخ المعاملة مطلوب'),
  payment_method: z.string().min(1, 'طريقة الدفع مطلوبة'),
  currency: z.string().min(1, 'العملة مطلوبة'),
});

export const employeeValidationSchema = z.object({
  full_name: z.string().min(2, 'الاسم الكامل يجب أن يكون على الأقل حرفين'),
  employee_code: z.string().min(2, 'كود الموظف مطلوب'),
  position: z.string().min(2, 'المنصب مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  phone: z.string().optional(),
  base_salary: z.number().min(0, 'الراتب الأساسي لا يمكن أن يكون سالب'),
  hire_date: z.string().min(1, 'تاريخ التوظيف مطلوب'),
});

// دوال مساعدة للتحقق
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'خطأ في التحقق من البيانات' } };
  }
};

// دوال التحقق من القيم المالية
export const validateFinancialCalculation = (cost: number, sellingPrice: number): { isValid: boolean; profit: number; margin: number } => {
  const profit = sellingPrice - cost;
  const margin = cost > 0 ? (profit / sellingPrice) * 100 : 0;
  
  return {
    isValid: sellingPrice >= cost && cost >= 0 && sellingPrice >= 0,
    profit,
    margin
  };
};

// التحقق من صحة التواريخ
export const validateDateRange = (startDate: string, endDate: string): { isValid: boolean; nights?: number; error?: string } => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start >= end) {
    return { isValid: false, error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' };
  }

  if (start < today) {
    return { isValid: false, error: 'لا يمكن اختيار تاريخ في الماضي' };
  }

  const timeDiff = end.getTime() - start.getTime();
  const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return { isValid: true, nights };
};

// التحقق من صحة رقم الهاتف
export const validatePhoneNumber = (phone: string): { isValid: boolean; formatted?: string; error?: string } => {
  // إزالة المسافات والرموز الخاصة
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // التحقق من الصيغة الأساسية
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return { isValid: false, error: 'رقم الهاتف يجب أن يكون بين 10 و 15 رقم' };
  }

  // صيغة موحدة للرقم
  let formatted = cleanPhone;
  if (!formatted.startsWith('+') && !formatted.startsWith('00')) {
    formatted = `+${formatted}`;
  }

  return { isValid: true, formatted };
};

// التحقق من صحة البريد الإلكتروني
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) return { isValid: true }; // البريد الإلكتروني اختياري
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'البريد الإلكتروني غير صحيح' };
  }

  return { isValid: true };
};
