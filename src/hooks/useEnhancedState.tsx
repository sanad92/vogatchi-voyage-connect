
import { useState, useCallback, useRef, useEffect } from 'react';
import { handleError } from '@/utils/errorHandling';

interface StateOptions<T> {
  initialValue: T;
  validate?: (value: T) => boolean;
  onError?: (error: Error) => void;
  debounceMs?: number;
}

export const useEnhancedState = <T>({
  initialValue,
  validate,
  onError,
  debounceMs = 0
}: StateOptions<T>) => {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    try {
      setError(null);
      setIsLoading(true);

      const finalValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value)
        : newValue;

      // Validate if validator is provided
      if (validate && !validate(finalValue)) {
        throw new Error('قيمة غير صحيحة');
      }

      if (debounceMs > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setValue(finalValue);
          setIsLoading(false);
        }, debounceMs);
      } else {
        setValue(finalValue);
        setIsLoading(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      setError(errorMessage);
      setIsLoading(false);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      } else {
        handleError(error, 'useEnhancedState');
      }
    }
  }, [value, validate, onError, debounceMs]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setIsLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [initialValue]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    value,
    setValue: updateValue,
    isLoading,
    error,
    reset,
    isValid: error === null
  };
};
