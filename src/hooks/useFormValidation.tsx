
import { useState, useCallback } from 'react';
import { z } from 'zod';
import { validateFormData } from '@/utils/enhancedValidation';

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  customValidations?: Array<(data: T) => string[]>;
}

export const useFormValidation = <T,>({ 
  schema, 
  onSubmit,
  customValidations 
}: UseFormValidationOptions<T>) => {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback((data: unknown) => {
    const result = validateFormData(schema, data, customValidations);
    
    if (result.success) {
      setErrors({});
      setWarnings(result.warnings || []);
      return { isValid: true, data: result.data };
    } else {
      setErrors(result.errors || {});
      setWarnings([]);
      return { isValid: false, data: null };
    }
  }, [schema, customValidations]);

  const handleSubmit = useCallback(async (data: unknown) => {
    setIsSubmitting(true);
    
    try {
      const validation = validate(data);
      
      if (!validation.isValid || !validation.data) {
        return false;
      }

      await onSubmit(validation.data);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        general: [error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ']
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, onSubmit]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setWarnings([]);
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: [message]
    }));
  }, []);

  return {
    errors,
    warnings,
    isSubmitting,
    validate,
    handleSubmit,
    clearErrors,
    setFieldError,
    hasErrors: Object.keys(errors).length > 0
  };
};
