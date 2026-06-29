import { useState, useEffect, useCallback } from 'react';
import { 
  calculateHotelPrices, 
  calculateFlightPrices, 
  calculateNights,
  calculateDays,
  formatCurrency,
  calculateRemainingAmount,
  calculatePaymentPercentage,
  calculateTax,
  calculateFinancialBreakdown,
  PriceCalculation,
  FlightCalculation
} from '@/utils/calculationHelpers';

interface UseAutoCalculationsProps {
  calculationType: 'hotel' | 'flight' | 'invoice' | 'custom';
  currency?: string;
  taxRate?: number;
  onCalculationUpdate?: (calculations: any) => void;
}

export const useAutoCalculations = ({
  calculationType,
  currency = 'EGP',
  taxRate = 0,
  onCalculationUpdate
}: UseAutoCalculationsProps) => {
  const [calculations, setCalculations] = useState<any>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // حساب أسعار الفندق
  const calculateHotelBooking = useCallback((formData: any) => {
    const {
      cost_per_night,
      selling_price_per_night,
      check_in_date,
      check_out_date,
      paid_amount = 0
    } = formData;

    if (!cost_per_night || !selling_price_per_night || !check_in_date || !check_out_date) {
      return null;
    }

    setIsCalculating(true);
    
    try {
      const priceCalc = calculateHotelPrices(
        Number(cost_per_night),
        Number(selling_price_per_night),
        check_in_date,
        check_out_date
      );

      const financialBreakdown = calculateFinancialBreakdown({
        subtotal: priceCalc.totalCost,
        vatRate: taxRate,
        paidAmount: Number(paid_amount),
        totalCost: priceCalc.totalSupplierCost ?? priceCalc.totalCost,
      });

      const result = {
        ...priceCalc,
        ...financialBreakdown,
        remainingAmount: financialBreakdown.remainingAmount,
        paymentPercentage: financialBreakdown.paymentPercentage,
        taxAmount: financialBreakdown.vatAmount,
        totalWithTax: financialBreakdown.totalAmount,
        // تنسيق العملة
        formattedTotalCost: formatCurrency(financialBreakdown.totalAmount, currency),
        formattedTotalProfit: formatCurrency(financialBreakdown.totalProfit, currency),
        formattedRemainingAmount: formatCurrency(financialBreakdown.remainingAmount, currency)
      };

      setCalculations(result);
      onCalculationUpdate?.(result);
      return result;
    } catch (error) {
      console.error('خطأ في حساب أسعار الفندق:', error);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [currency, taxRate, onCalculationUpdate]);

  // حساب أسعار الطيران
  const calculateFlightBooking = useCallback((formData: any) => {
    const {
      ticket_price_per_person,
      number_of_passengers,
      supplier_cost,
      taxes_and_fees = 0,
      paid_amount = 0
    } = formData;

    if (!ticket_price_per_person || !number_of_passengers || !supplier_cost) {
      return null;
    }

    setIsCalculating(true);
    
    try {
      const flightCalc = calculateFlightPrices(
        Number(ticket_price_per_person),
        Number(number_of_passengers),
        Number(supplier_cost),
        Number(taxes_and_fees)
      );

      const financialBreakdown = calculateFinancialBreakdown({
        subtotal: flightCalc.totalCost,
        vatRate: taxRate,
        paidAmount: Number(paid_amount),
        totalCost: flightCalc.totalSupplierCost ?? flightCalc.totalCost,
      });

      const result = {
        ...flightCalc,
        ...financialBreakdown,
        remainingAmount: financialBreakdown.remainingAmount,
        paymentPercentage: financialBreakdown.paymentPercentage,
        taxAmount: financialBreakdown.vatAmount,
        totalWithTax: financialBreakdown.totalAmount,
        // تنسيق العملة
        formattedTotalCost: formatCurrency(financialBreakdown.totalAmount, currency),
        formattedTotalProfit: formatCurrency(financialBreakdown.totalProfit, currency),
        formattedRemainingAmount: formatCurrency(financialBreakdown.remainingAmount, currency)
      };

      setCalculations(result);
      onCalculationUpdate?.(result);
      return result;
    } catch (error) {
      console.error('خطأ في حساب أسعار الطيران:', error);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [currency, taxRate, onCalculationUpdate]);

  // حساب الفاتورة
  const calculateInvoiceAmount = useCallback((formData: any) => {
    const {
      subtotal,
      discount_amount = 0,
      vat_rate = 0,
      paid_amount = 0
    } = formData;

    if (!subtotal) {
      return null;
    }

    setIsCalculating(true);
    
    try {
      const financialBreakdown = calculateFinancialBreakdown({
        subtotal,
        discountAmount: discount_amount,
        vatRate: vat_rate,
        paidAmount: paid_amount,
      });

      const result = {
        subtotal: financialBreakdown.subtotal,
        discountAmount: financialBreakdown.discountAmount,
        discountedAmount: financialBreakdown.discountedAmount,
        vatAmount: financialBreakdown.vatAmount,
        finalAmount: financialBreakdown.totalAmount,
        remainingAmount: financialBreakdown.remainingAmount,
        paymentPercentage: financialBreakdown.paymentPercentage,
        // تنسيق العملة
        formattedSubtotal: formatCurrency(financialBreakdown.subtotal, currency),
        formattedFinalAmount: formatCurrency(financialBreakdown.totalAmount, currency),
        formattedRemainingAmount: formatCurrency(financialBreakdown.remainingAmount, currency)
      };

      setCalculations(result);
      onCalculationUpdate?.(result);
      return result;
    } catch (error) {
      console.error('خطأ في حساب الفاتورة:', error);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [currency, onCalculationUpdate]);

  // التحديث التلقائي للحسابات
  const updateCalculations = useCallback((formData: any) => {
    switch (calculationType) {
      case 'hotel':
        return calculateHotelBooking(formData);
      case 'flight':
        return calculateFlightBooking(formData);
      case 'invoice':
        return calculateInvoiceAmount(formData);
      default:
        return null;
    }
  }, [calculationType, calculateHotelBooking, calculateFlightBooking, calculateInvoiceAmount]);

  // حساب عدد الليالي/الأيام
  const calculateDateDifference = useCallback((startDate: string, endDate: string, type: 'nights' | 'days' = 'nights') => {
    if (!startDate || !endDate) return 0;
    
    if (type === 'nights') {
      return calculateNights(startDate, endDate);
    } else {
      return calculateDays(startDate, endDate);
    }
  }, []);

  // إعادة تعيين الحسابات
  const resetCalculations = useCallback(() => {
    setCalculations({});
  }, []);

  return {
    // البيانات المحسوبة
    calculations,
    isCalculating,
    
    // دوال الحساب
    updateCalculations,
    calculateDateDifference,
    resetCalculations,
    
    // دوال متخصصة
    calculateHotelBooking,
    calculateFlightBooking,
    calculateInvoiceAmount,
    
    // مساعدات التنسيق
    formatCurrency: (amount: number) => formatCurrency(amount, currency)
  };
};