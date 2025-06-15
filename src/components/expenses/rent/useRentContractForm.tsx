
import { useState } from 'react';

export interface RentContractFormData {
  contract_number: string;
  property_type: string;
  property_address: string;
  landlord_name: string;
  landlord_phone: string;
  monthly_rent: number;
  currency: string;
  start_date: string;
  end_date: string;
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
      renewal_period_months: 12,
      annual_increase_percentage: 0,
      security_deposit: 0,
      contract_terms: '',
      is_active: true
    });
  };

  const updateField = (field: keyof RentContractFormData, value: any) => {
    setContractData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return contractData.contract_number && 
           contractData.property_address && 
           contractData.landlord_name;
  };

  return {
    contractData,
    setContractData,
    resetForm,
    updateField,
    isFormValid
  };
};
