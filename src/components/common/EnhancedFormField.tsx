import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { validateField } from '@/utils/formValidation';

interface EnhancedFormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'textarea' | 'select';
  value: any;
  onChange: (name: string, value: any) => void;
  onBlur?: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
    message?: string;
  };
  showValidation?: boolean;
  className?: string;
  description?: string;
}

const EnhancedFormField = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  options = [],
  validation,
  showValidation = true,
  className = '',
  description
}: EnhancedFormFieldProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  // التحقق من صحة الحقل
  const validateCurrentField = () => {
    if (!validation || !isTouched) return;

    const validationConfig = {
      required,
      ...validation
    };

    const errorMessage = validateField(value, validationConfig);
    setError(errorMessage);
    setIsValid(errorMessage === null);
  };

  // التحقق عند تغيير القيمة
  useEffect(() => {
    if (isTouched) {
      validateCurrentField();
    }
  }, [value, isTouched]);

  // معالج تغيير القيمة
  const handleChange = (newValue: any) => {
    onChange(name, newValue);
    if (!isTouched) {
      setIsTouched(true);
    }
  };

  // معالج فقدان التركيز
  const handleBlur = () => {
    setIsTouched(true);
    validateCurrentField();
    onBlur?.(name);
  };

  // تحديد أيقونة التحقق
  const getValidationIcon = () => {
    if (!showValidation || !isTouched) return null;
    
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    return null;
  };

  // تحديد فئات CSS
  const getInputClasses = () => {
    let classes = className;
    
    if (isTouched && showValidation) {
      if (error) {
        classes += ' border-red-500 focus:border-red-500';
      } else if (isValid) {
        classes += ' border-green-500 focus:border-green-500';
      }
    }
    
    return classes;
  };

  // رندر الحقل حسب النوع
  const renderField = () => {
    const commonProps = {
      value: value || '',
      placeholder,
      disabled,
      onBlur: handleBlur,
      className: getInputClasses()
    };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            onChange={(e) => handleChange(e.target.value)}
            rows={3}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={handleChange} disabled={disabled}>
            <SelectTrigger className={getInputClasses()}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            {...commonProps}
            type={type}
            onChange={(e) => handleChange(e.target.value)}
            step={type === 'number' ? '0.01' : undefined}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={name} className={required ? 'after:content-["*"] after:text-red-500' : ''}>
          {label}
        </Label>
        {getValidationIcon()}
      </div>
      
      <div className="relative">
        {renderField()}
      </div>

      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}

      {error && showValidation && isTouched && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default EnhancedFormField;