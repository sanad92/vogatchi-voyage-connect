
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, CheckCircle } from 'lucide-react';

const HotelsSection = () => {
  const cairoHotels = [
    {
      id: 1,
      name: 'فور سيزونز القاهرة',
      image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 5,
      location: 'النيل - القاهرة',
      features: ['إطلالة على النيل', 'سبا فاخر', 'مطاعم متنوعة']
    },
    {
      id: 2,
      name: 'فيرمونت نايل سيتي',
      image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 5,
      location: 'نايل سيتي - القاهرة',
      features: ['برج حديث', 'مرافق متكاملة', 'موقع متميز']
    },
    {
      id: 3,
      name: 'كيمبينسكي نايل هوتل',
      image: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 5,
      location: 'جاردن سيتي - القاهرة',
      features: ['تصميم فاخر', 'خدمة راقية', 'مطاعم عالمية']
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">فنادق القاهرة الفاخرة</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            تعرف على أفضل الفنادق الخمس نجوم في القاهرة مع إمكانية الدفع عند الوصول
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {cairoHotels.map((hotel) => (
            <Card key={hotel.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="relative overflow-hidden">
                <img 
                  src={hotel.image} 
                  alt={hotel.name}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-yellow-500 text-white px-3 py-1">
                    <div className="flex items-center">
                      {Array.from({ length: hotel.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <Badge className="bg-green-500 text-white w-full justify-center py-2">
                    الدفع عند الوصول متاح
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{hotel.name}</h3>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="h-4 w-4 mr-2" />
                  {hotel.location}
                </div>
                <div className="space-y-2">
                  {hotel.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HotelsSection;
