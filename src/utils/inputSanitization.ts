
export const sanitizeHtml = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .slice(0, 1000); // Limit length
};

export const sanitizeNumber = (input: any): number => {
  if (typeof input === 'number' && isFinite(input)) {
    return Math.max(0, Math.min(input, 999999999)); // Reasonable bounds
  }
  
  if (typeof input === 'string') {
    const parsed = parseFloat(input.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 999999999));
  }
  
  return 0;
};

export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  return email
    .trim()
    .toLowerCase()
    .slice(0, 254) // RFC 5321 limit
    .replace(/[^\w@.-]/g, ''); // Only allow valid email characters
};

export const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  
  return phone
    .trim()
    .replace(/[^\d+()-\s]/g, '') // Only allow phone characters
    .slice(0, 20); // Reasonable phone length
};

export const sanitizeText = (text: string, maxLength: number = 500): string => {
  if (!text || typeof text !== 'string') return '';
  
  return sanitizeHtml(text).slice(0, maxLength);
};

export const sanitizeFileName = (fileName: string): string => {
  if (!fileName || typeof fileName !== 'string') return '';
  
  return fileName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid file name characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .slice(0, 255); // File name length limit
};

// معالجة خاصة للنصوص العربية
export const sanitizeArabicText = (text: string, maxLength: number = 500): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>\"']/g, '') // Remove HTML characters but keep Arabic
    .slice(0, maxLength);
};

export const validateAndSanitizeForm = (formData: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (value === null || value === undefined) {
      sanitized[key] = null;
      continue;
    }
    
    switch (key) {
      case 'email':
        sanitized[key] = sanitizeEmail(value);
        break;
      case 'phone':
      case 'phone_number':
        sanitized[key] = sanitizePhone(value);
        break;
      case 'amount':
      case 'cost':
      case 'price':
      case 'total':
        sanitized[key] = sanitizeNumber(value);
        break;
      default:
        if (typeof value === 'string') {
          sanitized[key] = sanitizeText(value);
        } else {
          sanitized[key] = value;
        }
    }
  }
  
  return sanitized;
};
