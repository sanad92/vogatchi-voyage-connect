// Free/personal mailbox providers that cannot be used for company sign-up or staff invitations.
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'mail.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'zoho.com', 'yandex.com',
] as const;

export const BUSINESS_EMAIL_MESSAGE =
  'التسجيل مخصص للشركات والمؤسسات السياحية فقط. يرجى استخدام بريد العمل الرسمي (Gmail و Outlook وما يشبههما غير مقبولة).';
export const BUSINESS_INVITE_MESSAGE = 'دعوات الموظفين تتطلب بريد عمل رسمي تابع للشركة، البريد المجاني غير مقبول.';

export const isFreeEmail = (email: string): boolean => {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  return (FREE_EMAIL_DOMAINS as readonly string[]).some((d) => domain === d || domain.endsWith(`.${d}`));
};
