import React, { useState } from "react";
import type { BlockData } from "@/types/blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSectionClasses, getContainerClass } from "@/utils/cms/layout";
import { Send, CheckCircle } from "lucide-react";
import OptimizedErrorBoundary from "@/components/common/OptimizedErrorBoundary";

interface ContactFormBlockContent {
  form_title?: string;
  form_description?: string;
  form_key?: string;
  success_message?: string;
  form_fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
  submit_button_text?: string;
  send_email_notification?: boolean;
  admin_email?: string;
}

interface Props {
  block: BlockData;
}

const ContactFormBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as ContactFormBlockContent;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // حفظ البيانات في قاعدة البيانات
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: null, // سنربطه بنموذج محدد لاحقاً
          data: formData,
          ip_address: null, // يمكن إضافة IP لاحقاً
          user_agent: navigator.userAgent,
          status: 'received'
        });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      toast({
        title: "تم إرسال الرسالة بنجاح",
        description: content.success_message || "سنتواصل معك في أقرب وقت ممكن",
      });

      // إعادة تعيين النموذج
      setFormData({});
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "خطأ في الإرسال",
        description: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="w-full">
        <div className={getContainerClass(block.layout_settings)}>
          <div className={getSectionClasses(block.layout_settings)}>
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  تم إرسال رسالتك بنجاح
                </h3>
                <p className="text-muted-foreground mb-6">
                  {content.success_message || "شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن."}
                </p>
                <Button 
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                >
                  إرسال رسالة أخرى
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <OptimizedErrorBoundary>
      <section className="w-full">
        <div className={getContainerClass(block.layout_settings)}>
          <div className={getSectionClasses(block.layout_settings)}>
            <div className="max-w-2xl mx-auto">
              {/* العنوان والوصف */}
              {(content.form_title || content.form_description) && (
                <div className="text-center mb-8">
                  {content.form_title && (
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                      {content.form_title}
                    </h2>
                  )}
                  {content.form_description && (
                    <p className="text-lg text-muted-foreground">
                      {content.form_description}
                    </p>
                  )}
                  <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto rounded-full mt-4"></div>
                </div>
              )}

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center flex items-center justify-center gap-2">
                    <Send className="h-5 w-5" />
                    نموذج التواصل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {content.form_fields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                          {field.label}
                          {field.required && <span className="text-red-500 mr-1">*</span>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            id={field.name}
                            name={field.name}
                            placeholder={field.placeholder}
                            required={field.required}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            className="min-h-[120px] resize-none"
                            disabled={isSubmitting}
                          />
                        ) : (
                          <Input
                            id={field.name}
                            name={field.name}
                            type={field.type}
                            placeholder={field.placeholder}
                            required={field.required}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            disabled={isSubmitting}
                          />
                        )}
                      </div>
                    ))}
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {content.submit_button_text || "إرسال الرسالة"}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* معلومات إضافية */}
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  نحن نحترم خصوصيتك ولن نقوم بمشاركة معلوماتك مع أطراف ثالثة
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </OptimizedErrorBoundary>
  );
};

export default ContactFormBlock;