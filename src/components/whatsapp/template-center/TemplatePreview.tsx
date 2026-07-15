import React from 'react';
import { interpolateVariables, type VariableContext } from '@/lib/whatsappVariables';
import { Check, CheckCheck } from 'lucide-react';

interface Props {
  header?: string | null;
  body: string;
  footer?: string | null;
  variables?: VariableContext;
  locale?: 'ar' | 'en';
}

/** WhatsApp-style bubble preview. RTL/LTR aware. */
export const TemplatePreview: React.FC<Props> = ({ header, body, footer, variables = {}, locale = 'ar' }) => {
  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  return (
    <div
      className="rounded-xl p-4 bg-[#e5ddd5] dark:bg-slate-800 min-h-[220px]"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-[85%] ml-auto bg-[#dcf8c6] dark:bg-emerald-900/60 rounded-lg p-3 shadow-sm relative">
        {header && (
          <div className="font-semibold text-sm mb-1 text-foreground">
            {interpolateVariables(header, variables)}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
          {interpolateVariables(body, variables)}
        </div>
        {footer && (
          <div className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-black/5">
            {interpolateVariables(footer, variables)}
          </div>
        )}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground">
          <span>{time}</span>
          <CheckCheck className="w-3 h-3 text-blue-500" />
        </div>
      </div>
    </div>
  );
};
