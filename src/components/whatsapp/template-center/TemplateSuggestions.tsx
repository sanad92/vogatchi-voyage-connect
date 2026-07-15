import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppTemplateCenter, suggestTemplatesForContext } from '@/hooks/useWhatsAppTemplateCenter';
import { categoryMeta } from '@/data/travelTemplateCategories';
import { interpolateVariables, type VariableContext } from '@/lib/whatsappVariables';
import { toast } from 'sonner';

interface Props {
  context: {
    type: 'booking' | 'invoice' | 'crm';
    status?: string | null;
    subtype?: string | null;
  };
  variables: VariableContext;
  /** Optional customer phone (E.164) — when provided, enables one-click send. */
  phone?: string | null;
  organizationId?: string;
}

/** Reusable context-aware suggestion block for Booking/Invoice/CRM screens. */
export const TemplateSuggestions: React.FC<Props> = ({ context, variables, phone, organizationId }) => {
  const { templates } = useWhatsAppTemplateCenter();
  const suggestions = useMemo(
    () => suggestTemplatesForContext(templates as any[], context),
    [templates, context],
  );

  if (!suggestions.length) return null;

  const sendTemplate = async (t: any) => {
    if (!phone) {
      toast.info('لا يوجد رقم واتساب لهذا العميل');
      return;
    }
    if ((t.status || '').toLowerCase() !== 'approved') {
      toast.warning('هذا القالب غير معتمد من Meta — استخدمه من نافذة المحادثة');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          to: phone,
          type: 'template',
          templateName: t.name,
          templateLanguage: t.language || t.locale || 'ar',
          templateParameters: extractParams(t.body_text || '', variables),
          organizationId,
        },
      });
      if (error) throw error;
      toast.success('تم إرسال القالب');
    } catch (e: any) {
      toast.error(e?.message || 'فشل الإرسال');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          قوالب مقترحة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((t: any) => {
          const meta = categoryMeta(t.category_key);
          const preview = interpolateVariables((t.body_text || '').slice(0, 140), variables);
          return (
            <div key={t.id} className="p-2 rounded border hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium truncate">{t.name}</span>
                    {meta && (
                      <span className={`text-[9px] px-1 rounded ${meta.color}`}>{meta.labelAr}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{preview}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => sendTemplate(t)} title="إرسال">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

function extractParams(body: string, ctx: VariableContext): string[] {
  const matches = Array.from(body.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi));
  return matches.map((m) => {
    const key = m[1].toLowerCase();
    const val = (ctx as any)[key];
    return val != null ? String(val) : '';
  });
}
