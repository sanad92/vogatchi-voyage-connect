
import { useState } from 'react';
import { SupportedCurrency } from '@/types/currency';

export interface RentContractFormData {
  contract_number: string;
  property_type: string;
  property_address: string;
  landlord_name: string;
  landlord_phone: string;
  monthly_rent: number;
  currency: SupportedCurrency;
  start_date: string;
  end_date: string;
  contract_start_date: string;
  contract_end_date: string;
  renewal_period_months: number;
  annual_increase_percentage: number;
  security_deposit: number;
  contract_terms: string;
  is_active: boolean;
}

export const useRentContractForm = () => {
  const [contractData, setContractData] = useState<RentContractFormData>({
    contract_number: '',
    property_type: 'office',
    property_address: '',
    landlord_name: '',
    landlord_phone: '',
    monthly_rent: 0,
    currency: 'EGP',
    start_date: '',
    end_date: '',
    contract_start_date: '',
    contract_end_date: '',
    renewal_period_months: 12,
    annual_increase_percentage: 0,
    security_deposit: 0,
    contract_terms: '',
    is_active: true
  });

  const resetForm = () => {
    setContractData({
      contract_number: '',
      property_type: 'office',
      property_address: '',
      landlord_name: '',
      landlord_phone: '',
      monthly_rent: 0,
      currency: 'EGP',
      start_date: '',
      end_date: '',
      contract_start_date: '',
      contract_end_date: '',
      renewal_period_months: 12,
      annual_increase_percentage: 0,
      security_deposit: 0,
      contract_terms: '',
      is_active: true
    });
  };

  const updateField = (field: keyof RentContractFormData, value: any) => {
    setContractData(prev => {
      const next = { ...prev, [field]: value };

      if (field === 'start_date') next.contract_start_date = value;
      if (field === 'end_date') next.contract_end_date = value;
      if (field === 'contract_start_date') next.start_date = value;
      if (field === 'contract_end_date') next.end_date = value;

      return next;
    });
  };

  const getValidationErrors = () => {
    const errors: string[] = [];

    if (!contractData.contract_number.trim()) errors.push('رقم العقد مطلوب');
    if (!contractData.property_address.trim()) errors.push('عنوان العقار مطلوب');
    if (!contractData.landlord_name.trim()) errors.push('اسم المالك مطلوب');
    if (!contractData.monthly_rent || contractData.monthly_rent <= 0) errors.push('الإيجار الشهري يجب أن يكون أكبر من صفر');
    if (!contractData.start_date) errors.push('تاريخ بداية العقد مطلوب');
    if (!contractData.end_date) errors.push('تاريخ انتهاء العقد مطلوب');

    if (contractData.start_date && contractData.end_date) {
      const start = new Date(contractData.start_date);
      const end = new Date(contractData.end_date);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        errors.push('صيغة تاريخ العقد غير صحيحة');
      } else if (start >= end) {
        errors.push('تاريخ انتهاء العقد يجب أن يكون بعد تاريخ البداية');
      }
    }

    return errors;
  };

  const isFormValid = () => {
    return getValidationErrors().length === 0;
  };

  return {
    contractData,
    setContractData,
    resetForm,
    updateField,
    isFormValid,
    getValidationErrors
  };
};
