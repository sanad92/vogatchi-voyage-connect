
import { z } from 'zod';

// Enhanced validation schemas with better error messages
export const enhancedCustomerValidationSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'اسم العميل يجب أن يكون على الأقل حرفين')
    .max(100, 'اسم العميل طويل جداً (الحد الأقصى 100 حرف)')
    .regex(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z\s]+$/, 'اسم العميل يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),
  
  email: z.union([
    z.string().email('البريد الإلكتروني غير صحيح'),
    z.literal('')
  ]).optional(),
  
  phone: z.string()
    .trim()
    .min(10, 'رقم الهاتف يجب أن يكون على الأقل 10 أرقام')
    .max(15, 'رقم الهاتف طويل جداً')
    .regex(/^[\+]?[0-9]+$/, 'رقم الهاتف يجب أن يحتوي على أرقام فقط'),
    
  nationality: z.string().optional(),
  passport_number: z.string().optional(),
  address: z.string().max(500, 'العنوان طويل جداً').optional(),
});

export const enhancedHotelBookingValidationSchema = z.object({
  customer_name: z.string().min(2, 'اسم العميل مطلوب'),
  hotel_name: z.string().min(2, 'اسم الفندق مطلوب'),
  destination_city: z.string().min(2, 'مدينة الوجهة مطلوبة'),
  check_in_date: z.string().min(1, 'تاريخ الوصول مطلوب').refine((date) => {
    const checkIn = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkIn >= today;
  }, 'تاريخ الوصول يجب أن يكون في المستقبل'),
  
  check_out_date: z.string().min(1, 'تاريخ المغادرة مطلوب'),
  number_of_nights: z.number().min(1, 'عدد الليالي يجب أن يكون على الأقل 1').max(365, 'عدد الليالي مفرط'),
  number_of_adults: z.number().min(1, 'عدد البالغين يجب أن يكون على الأقل 1').max(20, 'عدد البالغين مفرط'),
  number_of_children: z.number().min(0, 'عدد الأطفال لا يمكن أن يكون سالب').max(20, 'عدد الأطفال مفرط'),
  room_type: z.string().min(1, 'نوع الغرفة مطلوب'),
  meal_plan: z.string().min(1, 'خطة الطعام مطلوبة'),
  cost_per_night: z.number().min(0, 'تكلفة الليلة لا يمكن أن تكون سالبة').max(100000, 'تكلفة الليلة مفرطة'),
  selling_price_per_night: z.number().min(0, 'سعر البيع لا يمكن أن يكون سالب').max(100000, 'سعر البيع مفرط'),
  supplier_name: z.string().min(2, 'اسم المورد مطلوب'),
  booking_agent_name: z.string().min(2, 'اسم وكيل الحجز مطلوب'),
}).refine((data) => {
  const checkIn = new Date(data.check_in_date);
  const checkOut = new Date(data.check_out_date);
  return checkOut > checkIn;
}, {
  message: 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول',
  path: ['check_out_date']
}).refine((data) => {
  return data.selling_price_per_night >= data.cost_per_night;
}, {
  message: 'سعر البيع يجب أن يكون أكبر من أو يساوي تكلفة الليلة',
  path: ['selling_price_per_night']
});

// Enhanced financial validation
export const validateFinancialData = (cost: number, sellingPrice: number, currency: string = 'EGP') => {
  const errors: string[] = [];
  
  if (cost < 0) errors.push('التكلفة لا يمكن أن تكون سالبة');
  if (sellingPrice < 0) errors.push('سعر البيع لا يمكن أن يكون سالب');
  if (sellingPrice < cost) errors.push('سعر البيع يجب أن يكون أكبر من أو يساوي التكلفة');
  
  // Currency-specific validations
  const maxAmounts: Record<string, number> = {
    EGP: 1000000, // 1 million EGP
    USD: 50000,   // 50K USD
    EUR: 45000    // 45K EUR
  };
  
  const maxAmount = maxAmounts[currency] || 1000000;
  if (cost > maxAmount) errors.push(`التكلفة تتجاوز الحد المسموح (${maxAmount} ${currency})`);
  if (sellingPrice > maxAmount) errors.push(`سعر البيع يتجاوز الحد المسموح (${maxAmount} ${currency})`);
  
  const profit = sellingPrice - cost;
  const margin = cost > 0 ? (profit / sellingPrice) * 100 : 0;
  
  return {
    isValid: errors.length === 0,
    errors,
    profit,
    margin,
    warnings: margin < 5 ? ['هامش الربح منخفض جداً (أقل من 5%)'] : []
  };
};

// Safe math operations
export const safeMath = {
  add: (a: number, b: number): number => {
    const result = Number((a + b).toFixed(2));
    if (!isFinite(result)) throw new Error('نتيجة الجمع غير صحيحة');
    return result;
  },
  
  subtract: (a: number, b: number): number => {
    const result = Number((a - b).toFixed(2));
    if (!isFinite(result)) throw new Error('نتيجة الطرح غير صحيحة');
    return result;
  },
  
  multiply: (a: number, b: number): number => {
    const result = Number((a * b).toFixed(2));
    if (!isFinite(result)) throw new Error('نتيجة الضرب غير صحيحة');
    return result;
  },
  
  divide: (a: number, b: number): number => {
    if (b === 0) throw new Error('لا يمكن القسمة على صفر');
    const result = Number((a / b).toFixed(2));
    if (!isFinite(result)) throw new Error('نتيجة القسمة غير صحيحة');
    return result;
  },
  
  percentage: (value: number, total: number): number => {
    if (total === 0) return 0;
    return Number(((value / total) * 100).toFixed(2));
  }
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
};

// Enhanced form validation
export const validateFormData = <T>(
  schema: z.ZodSchema<T>, 
  data: unknown,
  customValidations?: Array<(data: T) => string[]>
): { 
  success: boolean; 
  data?: T; 
  errors?: Record<string, string[]>; 
  warnings?: string[] 
} => {
  try {
    const validatedData = schema.parse(data);
    
    // Run custom validations
    let warnings: string[] = [];
    if (customValidations) {
      for (const validate of customValidations) {
        warnings.push(...validate(validatedData));
      }
    }
    
    return { success: true, data: validatedData, warnings };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: ['خطأ في التحقق من البيانات'] } };
  }
};
