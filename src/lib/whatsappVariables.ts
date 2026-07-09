/**
 * Interpolates WhatsApp message variables like {{customer_name}}, {{agent_name}}, etc.
 * Unknown variables are left as-is so the user can fill them manually.
 */

export interface VariableContext {
  customer_name?: string | null;
  customer_phone?: string | null;
  agent_name?: string | null;
  organization_name?: string | null;
  date?: string;
  time?: string;
}

export const AVAILABLE_VARIABLES: Array<{ key: keyof VariableContext; label: string; example: string }> = [
  { key: 'customer_name', label: 'اسم العميل', example: 'أحمد' },
  { key: 'customer_phone', label: 'رقم العميل', example: '+201...' },
  { key: 'agent_name', label: 'اسم الموظف', example: 'سارة' },
  { key: 'organization_name', label: 'اسم الشركة', example: 'Vogatchi' },
  { key: 'date', label: 'التاريخ', example: '2026-07-09' },
  { key: 'time', label: 'الوقت', example: '14:30' },
];

export const interpolateVariables = (template: string, ctx: VariableContext): string => {
  const now = new Date();
  const merged: VariableContext = {
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    ...ctx,
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const value = (merged as any)[key.toLowerCase()];
    return value ? String(value) : match;
  });
};
