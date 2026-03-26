import { useState, useEffect, useCallback } from 'react';
import { FormValidator, BookingValidators } from '@/utils/formValidation';
import { toast } from 'sonner';

import { FormValues } from '@/types/common';

interface UseEnhancedFormValidationProps {
  formType: 'hotel' | 'flight' | 'customer' | 'invoice' | 'custom';
  customValidator?: (data: FormValues) => { isValid: boolean; errors: Record<string, string[]> };
  onValidationChange?: (isValid: boolean, errors: Record<string, string[]>) => void;
}


export const useEnhancedFormValidation = ({
  formType,
  customValidator,
  onValidationChange
}: UseEnhancedFormValidationProps) => {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isValidating, setIsValidating] = useState(false);

  // تحديد المتحقق بناءً على نوع النموذج
  const getValidator = useCallback((data: FormValues, additionalData?: FormValues) => {
    switch (formType) {
      case 'hotel':
        return BookingValidators.hotel(data, additionalData);
      case 'flight':
        return BookingValidators.flight(data, additionalData);
      case 'customer':
        return BookingValidators.customer(data);
      case 'invoice':
        return BookingValidators.invoice(data);
      case 'custom':
        return customValidator ? customValidator(data) : { isValid: true, errors: {} };
      default:
        return { isValid: true, errors: {} };
    }
  }, [formType, customValidator]);


  // التحقق من صحة البيانات
  const validateForm = useCallback((formData: FormValues, additionalData?: FormValues): boolean => {
    setIsValidating(true);
    
    try {
      let validationResult;
      
      if (formType === 'custom' && customValidator) {
        validationResult = customValidator(formData);
      } else {
        // استخدام المتحقق المناسب
        const validator = new FormValidator();
        
        switch (formType) {
          case 'hotel':
            return BookingValidators.hotel(formData, additionalData);
          case 'flight':
            return BookingValidators.flight(formData, additionalData);
          case 'customer':
            return BookingValidators.customer(formData);
          case 'invoice':
            return BookingValidators.invoice(formData);
          default:
            validationResult = { isValid: true, errors: {} };
        }
      }
      
      if (validationResult && 'errors' in validationResult) {
        setErrors(validationResult.errors);
        onValidationChange?.(validationResult.isValid, validationResult.errors);
        return validationResult.isValid;
      }
      
      return true;
    } catch (error) {
      console.error('خطأ في التحقق من صحة البيانات:', error);
      toast.error('حدث خطأ أثناء التحقق من صحة البيانات');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [formType, customValidator, onValidationChange]);

  // التحقق من حقل واحد
  const validateField = useCallback((fieldName: string, value: unknown, formData: FormValues): string[] => {
    // إنشاء بيانات مؤقتة للتحقق
    const tempData = { ...formData, [fieldName]: value } as FormValues;
    
    try {
      const validator = new FormValidator();
      const result = validator.validate(tempData);
      
      return result.errors[fieldName] || [];
    } catch (error) {
      console.error(`خطأ في التحقق من حقل ${fieldName}:`, error);
      return [];
    }
  }, []);

  // تحديد الحقول التي تم لمسها
  const markFieldAsTouched = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]));
  }, []);

  // إعادة تعيين الأخطاء
  const clearErrors = useCallback(() => {
    setErrors({});
    setTouchedFields(new Set());
  }, []);

  // إعادة تعيين خطأ حقل معين
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // التحقق من وجود أخطاء
  const hasErrors = Object.keys(errors).length > 0;
  const hasFieldError = (fieldName: string) => !!(errors[fieldName] && errors[fieldName].length > 0);
  const getFieldErrors = (fieldName: string) => errors[fieldName] || [];

  // التحقق من أن الحقل تم لمسه
  const isFieldTouched = (fieldName: string) => touchedFields.has(fieldName);

  // التحقق التلقائي عند تغيير البيانات (اختياري)
  const validateOnChange = useCallback((fieldName: string, value: unknown, formData: FormValues) => {
    if (isFieldTouched(fieldName)) {
      const fieldErrors = validateField(fieldName, value, formData);
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: fieldErrors
      }));
    }
  }, [validateField, isFieldTouched]);

  return {
    // حالة التحقق
    errors,
    hasErrors,
    isValidating,
    touchedFields,
    
    // دوال التحقق
    validateForm,
    validateField,
    
    // إدارة الحقول
    markFieldAsTouched,
    clearErrors,
    clearFieldError,
    validateOnChange,
    
    // مساعدات
    hasFieldError,
    getFieldErrors,
    isFieldTouched
  };
};