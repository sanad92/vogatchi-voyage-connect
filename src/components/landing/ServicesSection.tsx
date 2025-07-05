import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Hotel, Car } from 'lucide-react';
import { useLandingContent } from '@/hooks/useLandingContent';
import { useNavigate } from 'react-router-dom';

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Hotel,
    Plane, 
    Car
  };
  return icons[iconName] || Hotel;
};

const getColorClass = (colorName: string) => {
  const colors: Record<string, string> = {
    'blue-500': 'bg-blue-500',
    'green-500': 'bg-green-500', 
    'purple-500': 'bg-purple-500'
  };
  return colors[colorName] || 'bg-blue-500';
};

const ServicesSection = () => {
  const { getContentBySection, isLoading } = useLandingContent();
  const navigate = useNavigate();
  
  const services = getContentBySection('services').filter(item => item.section_type === 'service');

  const handleServiceClick = (buttonLink: string) => {
    if (buttonLink.startsWith('/')) {
      navigate(buttonLink);
    } else {
      window.open(buttonLink, '_blank');
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded mx-auto max-w-xs"></div>
              <div className="h-6 bg-gray-200 rounded mx-auto max-w-lg"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">خدماتنا المميزة</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            نقدم لك مجموعة شاملة من الخدمات السياحية لجعل رحلتك مثالية
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {services.map((service, index) => {
            const IconComponent = getIconComponent(service.icon_name || 'Hotel');
            const colorClass = getColorClass(service.style_config?.iconColor || 'blue-500');
            
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 ${colorClass} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">{service.content}</p>
                  {service.button_text && service.button_link && (
                    <Button 
                      onClick={() => handleServiceClick(service.button_link)}
                      className="w-full"
                      variant="outline"
                    >
                      {service.button_text}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;