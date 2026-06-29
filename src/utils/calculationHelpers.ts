// مساعدات الحسابات التلقائية للنماذج

export interface DateRange {
  startDate: string | Date;
  endDate: string | Date;
}

export interface PriceCalculation {
  costPerNight: number;
  sellingPricePerNight: number;
  numberOfNights: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

export interface FlightCalculation {
  ticketPricePerPerson: number;
  numberOfPassengers: number;
  supplierCost: number;
  taxesAndFees: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

export interface FinancialBreakdown {
  subtotal: number;
  discountAmount: number;
  discountedAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  remainingAmount: number;
  paymentPercentage: number;
}

const roundAmount = (value: number): number => Math.round(value * 100) / 100;

// حساب عدد الليالي بين تاريخين
export const calculateNights = (checkIn: string | Date, checkOut: string | Date): number => {
  if (!checkIn || !checkOut) return 0;
  
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);
  
  if (startDate >= endDate) return 0;
  
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// حساب عدد الأيام بين تاريخين
export const calculateDays = (startDate: string | Date, endDate: string | Date): number => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) return 0;
  
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// حساب أسعار الفندق تلقائياً
export const calculateHotelPrices = (
  costPerNight: number,
  sellingPricePerNight: number,
  checkInDate: string | Date,
  checkOutDate: string | Date
): PriceCalculation & { totalSellingAmount: number; totalSupplierCost: number } => {
  const numberOfNights = calculateNights(checkInDate, checkOutDate);
  const totalSellingAmount = roundAmount(sellingPricePerNight * numberOfNights);
  const totalSupplierCost = roundAmount(costPerNight * numberOfNights);
  const totalProfit = roundAmount(totalSellingAmount - totalSupplierCost);
  const profitMargin = totalSellingAmount > 0 ? (totalProfit / totalSellingAmount) * 100 : 0;

  return {
    costPerNight,
    sellingPricePerNight,
    numberOfNights,
    totalCost: totalSellingAmount,
    totalProfit,
    profitMargin: roundAmount(profitMargin),
    totalSellingAmount,
    totalSupplierCost,
  };
};

// حساب أسعار الطيران تلقائياً
export const calculateFlightPrices = (
  ticketPricePerPerson: number,
  numberOfPassengers: number,
  supplierCost: number,
  taxesAndFees: number = 0
): FlightCalculation & { totalSellingAmount: number; totalSupplierCost: number } => {
  const totalTicketCost = roundAmount(ticketPricePerPerson * numberOfPassengers);
  const totalSellingAmount = roundAmount(totalTicketCost + taxesAndFees);
  const totalSupplierCost = roundAmount(supplierCost);
  const totalProfit = roundAmount(totalSellingAmount - totalSupplierCost);
  const profitMargin = totalSellingAmount > 0 ? (totalProfit / totalSellingAmount) * 100 : 0;

  return {
    ticketPricePerPerson,
    numberOfPassengers,
    supplierCost,
    taxesAndFees,
    totalCost: totalSellingAmount,
    totalProfit,
    profitMargin: roundAmount(profitMargin),
    totalSellingAmount,
    totalSupplierCost,
  };
};

// حساب النسبة المئوية
export const calculatePercentage = (part: number, whole: number): number => {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100 * 100) / 100;
};

// تنسيق العملة
export const formatCurrency = (amount: number, currency: string = 'EGP'): string => {
  const currencySymbols: Record<string, string> = {
    'EGP': 'ج.م',
    'USD': '$',
    'EUR': '€',
    'SAR': 'ر.س',
    'AED': 'د.إ'
  };

  const symbol = currencySymbols[currency] || currency;
  return `${amount.toLocaleString('ar-EG')} ${symbol}`;
};

// تحويل العملة (يتطلب سعر الصرف)
export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number => {
  if (fromCurrency === toCurrency) return amount;
  return Math.round(amount * exchangeRate * 100) / 100;
};

export const calculateFinancialBreakdown = ({
  subtotal = 0,
  discountAmount = 0,
  vatRate = 0,
  paidAmount = 0,
  totalCost = 0,
}: {
  subtotal?: number;
  discountAmount?: number;
  vatRate?: number;
  paidAmount?: number;
  totalCost?: number;
}): FinancialBreakdown => {
  const safeSubtotal = Number(subtotal) || 0;
  const safeDiscountAmount = Number(discountAmount) || 0;
  const safeVatRate = Number(vatRate) || 0;
  const safePaidAmount = Number(paidAmount) || 0;
  const safeTotalCost = Number(totalCost) || 0;

  const discountedAmount = Math.max(0, safeSubtotal - safeDiscountAmount);
  const vatAmount = roundAmount(discountedAmount * (safeVatRate / 100));
  const totalAmount = roundAmount(discountedAmount + vatAmount);
  const remainingAmount = Math.max(0, totalAmount - safePaidAmount);
  const paymentPercentage = totalAmount > 0
    ? Math.min(100, roundAmount((safePaidAmount / totalAmount) * 100))
    : 0;

  return {
    subtotal: roundAmount(safeSubtotal),
    discountAmount: roundAmount(safeDiscountAmount),
    discountedAmount: roundAmount(discountedAmount),
    vatRate: roundAmount(safeVatRate),
    vatAmount,
    totalAmount,
    totalCost: roundAmount(safeTotalCost),
    totalProfit: roundAmount(totalAmount - safeTotalCost),
    remainingAmount: roundAmount(remainingAmount),
    paymentPercentage,
  };
};

// حساب المبلغ المتبقي
export const calculateRemainingAmount = (totalAmount: number, paidAmount: number): number => {
  return Math.max(0, totalAmount - paidAmount);
};

// حساب نسبة الدفع
export const calculatePaymentPercentage = (paidAmount: number, totalAmount: number): number => {
  if (totalAmount === 0) return 0;
  return Math.min(100, Math.round((paidAmount / totalAmount) * 100 * 100) / 100);
};

// حساب الخصم
export const calculateDiscount = (originalPrice: number, discountedPrice: number): {
  discountAmount: number;
  discountPercentage: number;
} => {
  const discountAmount = originalPrice - discountedPrice;
  const discountPercentage = originalPrice > 0 ? (discountAmount / originalPrice) * 100 : 0;
  
  return {
    discountAmount: Math.max(0, discountAmount),
    discountPercentage: Math.round(discountPercentage * 100) / 100
  };
};

// حساب الضريبة
export const calculateTax = (amount: number, taxRate: number): {
  taxAmount: number;
  totalWithTax: number;
} => {
  const taxAmount = roundAmount(amount * (taxRate / 100));
  const totalWithTax = roundAmount(amount + taxAmount);
  
  return {
    taxAmount,
    totalWithTax,
  };
};

// حساب عمولة الموظف
export const calculateCommission = (
  totalAmount: number,
  commissionRate: number,
  commissionType: 'percentage' | 'fixed' = 'percentage'
): number => {
  if (commissionType === 'fixed') {
    return commissionRate;
  }
  
  return Math.round(totalAmount * (commissionRate / 100) * 100) / 100;
};

// دالة مساعدة لتحديث الحسابات التلقائية في الوقت الفعلي
export const createCalculationWatcher = (
  watchFields: string[],
  calculateFunction: (...args: any[]) => any,
  updateFunction: (result: any) => void
) => {
  return (formData: any) => {
    const values = watchFields.map(field => formData[field]);
    
    // التحقق من وجود جميع القيم المطلوبة
    if (values.some(value => value === undefined || value === null || value === '')) {
      return;
    }
    
    try {
      const result = calculateFunction(...values);
      updateFunction(result);
    } catch (error) {
      console.error('خطأ في الحساب التلقائي:', error);
    }
  };
};

// التحقق من صحة التواريخ
export const validateDateRange = (startDate: string | Date, endDate: string | Date): {
  isValid: boolean;
  message?: string;
} => {
  if (!startDate || !endDate) {
    return { isValid: false, message: 'يجب إدخال كلا التاريخين' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: 'تنسيق التاريخ غير صحيح' };
  }
  
  if (start >= end) {
    return { isValid: false, message: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' };
  }
  
  // التحقق من أن التاريخ ليس في الماضي (اختياري)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (start < today) {
    return { isValid: false, message: 'لا يمكن اختيار تاريخ في الماضي' };
  }
  
  return { isValid: true };
};