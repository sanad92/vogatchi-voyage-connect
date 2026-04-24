import React from "react";
import type { BlockData } from "@/types/blocks";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Globe, Clock } from "lucide-react";
import { getSectionClasses, getContainerClass } from "@/utils/cms/layout";

interface CompanyInfoBlockContent {
  show_address?: boolean;
  show_phone?: boolean;
  show_email?: boolean;
  show_website?: boolean;
  show_working_hours?: boolean;
  custom_address?: string;
  custom_phone?: string;
  custom_email?: string;
  custom_website?: string;
  working_hours?: string;
  map_embed_url?: string;
}

interface Props {
  block: BlockData;
}

const CompanyInfoBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as CompanyInfoBlockContent;

  // بيانات الشركة الافتراضية من قاعدة البيانات
  const companyData = {
    name: "شركة فوجاتشي للتسويق السياحي",
    address: content.custom_address || "08 شارع الدكتور المحروقي- المهندسين- الجيزه - مصر",
    phone: content.custom_phone || "01103442881",
    email: content.custom_email || "hello@vogantra.com",
    website: content.custom_website || "https://vogantra.com",
    working_hours: content.working_hours || "السبت - الخميس: 9:00 ص - 6:00 م"
  };

  const contactItems = [
    {
      icon: MapPin,
      label: "العنوان",
      value: companyData.address,
      show: content.show_address !== false,
      className: "text-primary"
    },
    {
      icon: Phone,
      label: "الهاتف",
      value: companyData.phone,
      show: content.show_phone !== false,
      className: "text-green-600",
      href: `tel:${companyData.phone}`
    },
    {
      icon: Mail,
      label: "البريد الإلكتروني",
      value: companyData.email,
      show: content.show_email !== false,
      className: "text-blue-600",
      href: `mailto:${companyData.email}`
    },
    {
      icon: Globe,
      label: "الموقع الإلكتروني",
      value: companyData.website,
      show: content.show_website !== false,
      className: "text-purple-600",
      href: companyData.website
    },
    {
      icon: Clock,
      label: "ساعات العمل",
      value: companyData.working_hours,
      show: content.show_working_hours !== false,
      className: "text-orange-600"
    }
  ];

  return (
    <section className="w-full">
      <div className={getContainerClass(block.layout_settings)}>
        <div className={getSectionClasses(block.layout_settings)}>
          {block.title && (
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {block.title}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto rounded-full"></div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* معلومات الاتصال */}
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-foreground mb-6">
                معلومات التواصل
              </h3>
              
              <div className="space-y-4">
                {contactItems
                  .filter(item => item.show)
                  .map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <Card key={index} className="border border-border/50 hover:border-primary/20 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg bg-background ${item.className}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground mb-1">
                                {item.label}
                              </p>
                              {item.href ? (
                                <a
                                  href={item.href}
                                  target={item.href.startsWith('http') ? '_blank' : undefined}
                                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                  {item.value}
                                </a>
                              ) : (
                                <p className="text-muted-foreground">
                                  {item.value}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>

            {/* الخريطة */}
            {content.map_embed_url && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-foreground mb-6">
                  موقعنا على الخريطة
                </h3>
                
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-video">
                      <iframe
                        src={content.map_embed_url}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="موقع الشركة على الخريطة"
                        className="w-full h-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyInfoBlock;