import { useCallback } from 'react';

export interface WhatsAppConfig {
  phoneNumber: string;
  defaultMessage: string;
}

export const useLandingWhatsApp = (config?: Partial<WhatsAppConfig>) => {
  const defaultConfig: WhatsAppConfig = {
    phoneNumber: "201103442881",
    defaultMessage: "مرحباً، أريد الاستفسار عن الخدمات السياحية",
    ...config
  };

  const openWhatsApp = useCallback((customMessage?: string) => {
    const message = customMessage || defaultConfig.defaultMessage;
    const whatsappUrl = `https://wa.me/${defaultConfig.phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }, [defaultConfig]);

  const createWhatsAppHandler = useCallback((customMessage?: string) => {
    return () => openWhatsApp(customMessage);
  }, [openWhatsApp]);

  return {
    openWhatsApp,
    createWhatsAppHandler,
    phoneNumber: defaultConfig.phoneNumber
  };
};