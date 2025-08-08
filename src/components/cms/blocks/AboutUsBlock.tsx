import React from "react";
import type { BlockData } from "@/types/blocks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSectionClasses, getContainerClass } from "@/utils/cms/layout";
import { Award, Users, MapPin, Clock } from "lucide-react";

interface AboutUsBlockContent {
  main_title?: string;
  main_description?: string;
  company_story?: string;
  mission_statement?: string;
  vision_statement?: string;
  values?: string[];
  founded_year?: string;
  team_size?: string;
  locations?: string[];
  achievements?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  show_statistics?: boolean;
  statistics?: Array<{
    number: string;
    label: string;
    icon?: string;
  }>;
}

interface Props {
  block: BlockData;
}

const AboutUsBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as AboutUsBlockContent;

  // بيانات افتراضية لشركة فوجاتشي
  const defaultContent = {
    main_title: content.main_title || "عن شركة فوجاتشي للتسويق السياحي",
    main_description: content.main_description || "نحن شركة رائدة في مجال السياحة والسفر، نقدم تجارب سياحية استثنائية ونساعد عملاءنا على اكتشاف أجمل وجهات العالم.",
    company_story: content.company_story || "تأسست شركة فوجاتشي للتسويق السياحي برؤية واضحة لتقديم خدمات سياحية متميزة تلبي احتياجات وتطلعات عملائنا. منذ انطلاقتنا، كنا نسعى لجعل كل رحلة تجربة لا تُنسى.",
    mission_statement: content.mission_statement || "مهمتنا هي تقديم أفضل الخدمات السياحية وتنظيم رحلات استثنائية تتجاوز توقعات عملائنا، مع الحرص على الجودة والاحترافية في كل تفصيل.",
    vision_statement: content.vision_statement || "رؤيتنا أن نكون الخيار الأول للمسافرين في المنطقة، ونساهم في تطوير صناعة السياحة من خلال الابتكار والتميز.",
    values: content.values || ["الجودة والاحترافية", "خدمة العملاء المتميزة", "الشفافية والأمانة", "الابتكار المستمر", "الالتزام بالمواعيد"],
    statistics: content.statistics || [
      { number: "1000+", label: "عميل سعيد", icon: "users" },
      { number: "50+", label: "وجهة سياحية", icon: "map-pin" },
      { number: "5+", label: "سنوات خبرة", icon: "clock" },
      { number: "24/7", label: "دعم العملاء", icon: "award" }
    ]
  };

  const getIconComponent = (iconName?: string) => {
    switch (iconName) {
      case 'users': return Users;
      case 'map-pin': return MapPin;
      case 'clock': return Clock;
      case 'award': return Award;
      default: return Award;
    }
  };

  return (
    <section className="w-full">
      <div className={getContainerClass(block.layout_settings)}>
        <div className={getSectionClasses(block.layout_settings)}>
          {/* العنوان الرئيسي */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {defaultContent.main_title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {defaultContent.main_description}
            </p>
            <div className="w-32 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto rounded-full mt-8"></div>
          </div>

          {/* الإحصائيات */}
          {content.show_statistics !== false && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {defaultContent.statistics.map((stat, index) => {
                const IconComponent = getIconComponent(stat.icon);
                return (
                  <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="p-3 rounded-full bg-primary/10">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-3xl font-bold text-primary">
                          {stat.number}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {stat.label}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* قصة الشركة */}
            <Card className="p-8">
              <CardContent className="p-0">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  قصتنا
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {defaultContent.company_story}
                </p>
              </CardContent>
            </Card>

            {/* المهمة */}
            <Card className="p-8">
              <CardContent className="p-0">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  مهمتنا
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {defaultContent.mission_statement}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* الرؤية */}
          <Card className="p-8 mb-16">
            <CardContent className="p-0">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                رؤيتنا
              </h2>
              <p className="text-muted-foreground leading-relaxed text-center text-lg max-w-4xl mx-auto">
                {defaultContent.vision_statement}
              </p>
            </CardContent>
          </Card>

          {/* القيم */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-8">قيمنا</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {defaultContent.values.map((value, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-sm py-2 px-4 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {value}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsBlock;