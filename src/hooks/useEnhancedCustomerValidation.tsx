import { useCallback } from 'react';
import { useOrgId } from './useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import type { DuplicateContactResult } from '@/types/customer';

const emptyResult: DuplicateContactResult = {
  hasDuplication: false,
  phoneResult: { isDuplicate: false, duplicateCount: 0, allDuplicates: [] },
  emailResult: { isDuplicate: false },
};

export const useEnhancedCustomerValidation = () => {
  const orgId = useOrgId();

  const normalizePhoneNumber = useCallback((phone: string): string => {
    const digits = phone?.replace(/\D/g, '') || '';
    if (/^201\d{9}$/.test(digits)) return digits;
    if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`;
    if (/^1\d{9}$/.test(digits)) return `20${digits}`;
    return digits;
  }, []);

  const generatePhoneVariants = useCallback((phone: string): string[] => {
    const normalized = normalizePhoneNumber(phone);
    const variants = new Set([phone, normalized]);
    if (normalized.startsWith('201')) {
      const localNumber = normalized.slice(2);
      variants.add(`0${localNumber}`);
      variants.add(localNumber);
      variants.add(`+${normalized}`);
      variants.add(`+20 ${localNumber}`);
    }
    return [...variants].filter((value) => value.replace(/\D/g, '').length >= 10);
  }, [normalizePhoneNumber]);

  const validatePhoneNumber = useCallback((phone: string) => {
    const normalized = normalizePhoneNumber(phone);
    const isValid = /^\d{10,15}$/.test(normalized);
    return isValid
      ? { isValid: true }
      : { isValid: false, message: 'رقم الهاتف غير صحيح' };
  }, [normalizePhoneNumber]);

  const checkCustomerDuplication = useCallback(async (
    customerData: { phone: string; email?: string; name: string },
    excludeId?: string,
  ): Promise<DuplicateContactResult> => {
    if (!orgId) throw new Error('لم يتم تحديد المؤسسة');

    const { data, error } = await callUntypedRpc<DuplicateContactResult>(
      'check_customer_duplicate_contact',
      {
        _org_id: orgId,
        _phone: customerData.phone || null,
        _email: customerData.email?.trim().toLowerCase() || null,
        _exclude_id: excludeId || null,
      },
    );

    if (error) throw new Error(error.message || 'تعذر التحقق من تكرار بيانات العميل');
    return data || emptyResult;
  }, [orgId]);

  const checkDuplicatePhone = useCallback(async (phone: string, excludeId?: string) => {
    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) return { isDuplicate: false, error: validation.message };
    return (await checkCustomerDuplication({ phone, name: '' }, excludeId)).phoneResult;
  }, [checkCustomerDuplication, validatePhoneNumber]);

  const checkDuplicateEmail = useCallback(async (email: string, excludeId?: string) => (
    await checkCustomerDuplication({ phone: '', email, name: '' }, excludeId)
  ).emailResult, [checkCustomerDuplication]);

  return {
    normalizePhoneNumber,
    generatePhoneVariants,
    validatePhoneNumber,
    checkDuplicatePhone,
    checkDuplicateEmail,
    checkCustomerDuplication,
  };
};
