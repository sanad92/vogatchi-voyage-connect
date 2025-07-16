import { toast } from "sonner";

// أنواع البيانات للتحقق من المدخلات
interface ValidationRule {
  field: string;
  message: string;
  validate: (value: any, formData: any) => boolean;
}

interface FieldConfig {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any, formData: any) => boolean;
  message?: string;
}

// قواعد التحقق الأساسية
export const ValidationRules = {
  required: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || `حقل ${field} مطلوب`,
    validate: (value) => value !== null && value !== undefined && value !== ''
  }),

  minLength: (field: string, min: number, message?: string): ValidationRule => ({
    field,
    message: message || `${field} يجب أن يكون ${min} أحرف على الأقل`,
    validate: (value) => !value || value.toString().length >= min
  }),

  maxLength: (field: string, max: number, message?: string): ValidationRule => ({
    field,
    message: message || `${field} لا يجب أن يتجاوز ${max} حرف`,
    validate: (value) => !value || value.toString().length <= max
  }),

  numeric: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || `${field} يجب أن يكون رقم صحيح`,
    validate: (value) => !value || !isNaN(Number(value))
  }),

  positiveNumber: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || `${field} يجب أن يكون رقم موجب`,
    validate: (value) => !value || (Number(value) > 0)
  }),

  email: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || `${field} يجب أن يكون بريد إلكتروني صحيح`,
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }),

  phone: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || `${field} يجب أن يكون رقم هاتف صحيح`,
    validate: (value) => !value || /^[\+]?[0-9\s\-\(\)]{10,}$/.test(value.replace(/\s+/g, ''))
  }),

  dateRange: (startField: string, endField: string, message?: string): ValidationRule => ({
    field: `${startField}_${endField}`,
    message: message || `تاريخ ${startField} يجب أن يكون قبل تاريخ ${endField}`,
    validate: (value, formData) => {
      const startDate = new Date(formData[startField]);
      const endDate = new Date(formData[endField]);
      return !formData[startField] || !formData[endField] || startDate < endDate;
    }
  }),

  custom: (field: string, validator: (value: any, formData: any) => boolean, message: string): ValidationRule => ({
    field,
    message,
    validate: validator
  })
};

// فئة التحقق من النماذج
export class FormValidator {
  private rules: ValidationRule[] = [];
  private errors: Record<string, string[]> = {};

  addRule(rule: ValidationRule): FormValidator {
    this.rules.push(rule);
    return this;
  }

  addRules(rules: ValidationRule[]): FormValidator {
    this.rules.push(...rules);
    return this;
  }

  validate(formData: any): { isValid: boolean; errors: Record<string, string[]> } {
    this.errors = {};
    
    for (const rule of this.rules) {
      const value = formData[rule.field];
      if (!rule.validate(value, formData)) {
        if (!this.errors[rule.field]) {
          this.errors[rule.field] = [];
        }
        this.errors[rule.field].push(rule.message);
      }
    }

    return {
      isValid: Object.keys(this.errors).length === 0,
      errors: this.errors
    };
  }

  validateAndShowErrors(formData: any): boolean {
    const result = this.validate(formData);
    
    if (!result.isValid) {
      // عرض أول خطأ كـ toast
      const firstError = Object.values(result.errors)[0][0];
      toast.error(firstError);
    }

    return result.isValid;
  }

  reset(): void {
    this.rules = [];
    this.errors = {};
  }
}

// التحقق من نماذج محددة
export const BookingValidators = {
  hotel: (data: any, selectedCustomer: any) => {
    const validator = new FormValidator();
    
    validator.addRules([
      ValidationRules.required('customer_name', 'يجب اختيار عميل أو إضافة عميل جديد'),
      ValidationRules.required('hotel_name', 'اسم الفندق مطلوب'),
      ValidationRules.required('destination_city', 'مدينة الوجهة مطلوبة'),
      ValidationRules.required('check_in_date', 'تاريخ الوصول مطلوب'),
      ValidationRules.required('check_out_date', 'تاريخ المغادرة مطلوب'),
      ValidationRules.positiveNumber('cost_per_night', 'تكلفة الليلة يجب أن تكون رقم موجب'),
      ValidationRules.positiveNumber('selling_price_per_night', 'سعر البيع يجب أن يكون رقم موجب'),
      ValidationRules.required('supplier_name', 'يجب اختيار مورد للحجز'),
      ValidationRules.dateRange('check_in_date', 'check_out_date', 'تاريخ الوصول يجب أن يكون قبل تاريخ المغادرة'),
      ValidationRules.custom('customer_validation', 
        () => selectedCustomer !== null, 
        'يجب اختيار عميل صحيح من القائمة')
    ]);

    return validator.validateAndShowErrors(data);
  },

  flight: (data: any, selectedCustomer: any) => {
    const validator = new FormValidator();
    
    validator.addRules([
      ValidationRules.required('customer_name', 'يجب اختيار عميل أو إضافة عميل جديد'),
      ValidationRules.required('departure_airport_id', 'مطار المغادرة مطلوب'),
      ValidationRules.required('arrival_airport_id', 'مطار الوصول مطلوب'),
      ValidationRules.required('departure_date', 'تاريخ المغادرة مطلوب'),
      ValidationRules.required('arrival_date', 'تاريخ الوصول مطلوب'),
      ValidationRules.positiveNumber('ticket_price_per_person', 'سعر التذكرة يجب أن يكون رقم موجب'),
      ValidationRules.positiveNumber('supplier_cost', 'تكلفة المورد يجب أن تكون رقم موجب'),
      ValidationRules.positiveNumber('number_of_passengers', 'عدد المسافرين يجب أن يكون رقم موجب'),
      ValidationRules.required('supplier_name', 'يجب اختيار مورد للحجز'),
      ValidationRules.custom('customer_validation', 
        () => selectedCustomer !== null, 
        'يجب اختيار عميل صحيح من القائمة')
    ]);

    return validator.validateAndShowErrors(data);
  },

  customer: (data: any) => {
    const validator = new FormValidator();
    
    validator.addRules([
      ValidationRules.required('name', 'اسم العميل مطلوب'),
      ValidationRules.required('phone', 'رقم الهاتف مطلوب'),
      ValidationRules.minLength('name', 2, 'اسم العميل يجب أن يكون حرفين على الأقل'),
      ValidationRules.phone('phone', 'رقم الهاتف غير صحيح'),
      ValidationRules.email('email', 'البريد الإلكتروني غير صحيح')
    ]);

    return validator.validateAndShowErrors(data);
  },

  invoice: (data: any) => {
    const validator = new FormValidator();
    
    validator.addRules([
      ValidationRules.required('final_amount', 'مبلغ الفاتورة مطلوب'),
      ValidationRules.required('total_amount', 'المبلغ الإجمالي مطلوب'),
      ValidationRules.required('invoice_number', 'رقم الفاتورة مطلوب'),
      ValidationRules.positiveNumber('final_amount', 'مبلغ الفاتورة يجب أن يكون رقم موجب'),
      ValidationRules.positiveNumber('total_amount', 'المبلغ الإجمالي يجب أن يكون رقم موجب')
    ]);

    return validator.validateAndShowErrors(data);
  }
};

// المساعد العام للتحقق من المدخلات
export const validateField = (value: any, config: FieldConfig): string | null => {
  if (config.required && (!value || value === '')) {
    return config.message || 'هذا الحقل مطلوب';
  }

  if (value && config.min && Number(value) < config.min) {
    return config.message || `القيمة يجب أن تكون ${config.min} على الأقل`;
  }

  if (value && config.max && Number(value) > config.max) {
    return config.message || `القيمة يجب أن تكون ${config.max} كحد أقصى`;
  }

  if (value && config.pattern && !config.pattern.test(value)) {
    return config.message || 'تنسيق غير صحيح';
  }

  if (value && config.custom && !config.custom(value, {})) {
    return config.message || 'قيمة غير صحيحة';
  }

  return null;
};