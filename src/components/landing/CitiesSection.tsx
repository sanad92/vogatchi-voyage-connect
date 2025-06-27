
import React from 'react';
import { Card } from '@/components/ui/card';

const CitiesSection = () => {
  const cities = [
    {
      name: 'القاهرة',
      image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'العاصمة وأم الدنيا'
    },
    {
      name: 'الإسكندرية',
      image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'عروس البحر المتوسط'
    },
    {
      name: 'شرم الشيخ',
      image: 'https://images.unsplash.com/photo-1544467082-8b6b2b2a39a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'جنة الغوص والشواطئ'
    },
    {
      name: 'الغردقة',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'بوابة البحر الأحمر'
    },
    {
      name: 'مرسى علم',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'لؤلؤة الصحراء الشرقية'
    },
    {
      name: 'الأقصر',
      image: 'https://images.unsplash.com/photo-1471919743851-c4df8b6ee260?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'متحف العالم المفتوح'
    },
    {
      name: 'أسوان',
      image: 'https://images.unsplash.com/photo-1525082156961-c38a5eb89054?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'لؤلؤة الجنوب'
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">وجهاتنا السياحية</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            اكتشف أجمل المدن والوجهات السياحية في مصر مع خدماتنا المتميزة
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {cities.map((city, index) => (
            <Card key={index} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="relative overflow-hidden">
                <img 
                  src={city.image} 
                  alt={city.name}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-bold">{city.name}</h3>
                  <p className="text-sm opacity-90">{city.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;
