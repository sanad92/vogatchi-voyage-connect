
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Plane, Hotel, Car } from 'lucide-react';

const ServicesSection = () => {
  const services = [
    {
      icon: Hotel,
      title: 'حجز الفنادق',
      description: 'احجز أفضل الفنادق في مصر والعالم بأسعار تنافسية',
      color: 'bg-blue-500'
    },
    {
      icon: Plane,
      title: 'حجز الطيران',
      description: 'رحلات جوية مريحة لجميع الوجهات العالمية',
      color: 'bg-green-500'
    },
    {
      icon: Car,
      title: 'تأجير السيارات',
      description: 'سيارات حديثة ومريحة لرحلتك',
      color: 'bg-purple-500'
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">خدماتنا المميزة</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            نقدم مجموعة شاملة من الخدمات السياحية لتلبية جميع احتياجاتك
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className={`w-16 h-16 ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
                <p className="text-gray-600 leading-relaxed">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
