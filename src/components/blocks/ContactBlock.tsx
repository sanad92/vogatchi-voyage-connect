import React from 'react';
import { BlockData, ContactBlockContent } from '@/types/blocks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ContactBlockProps {
  block: BlockData;
}

const ContactBlock: React.FC<ContactBlockProps> = ({ block }) => {
  const content = block.content as ContactBlockContent;
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: content.success_message || 'تم إرسال الرسالة بنجاح',
      description: 'سنتواصل معك قريباً',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center space-y-4 mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {content.section_title}
        </h2>
        <p className="text-lg text-muted-foreground">
          {content.section_description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">نموذج التواصل</CardTitle>
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
                    className="min-h-[100px]"
                  />
                ) : (
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            
            <Button type="submit" className="w-full" size="lg">
              {content.submit_button_text}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactBlock;