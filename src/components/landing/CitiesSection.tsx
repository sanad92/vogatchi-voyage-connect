
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plane, Camera, Star } from 'lucide-react';
import { useLandingContent } from '@/hooks/useLandingContent';

const CitiesSection = () => {
  const { getContentBySection, isLoading } = useLandingContent();
  
  const citiesContent = getContentBySection('cities').find(item => item.section_type === 'section');

  // Popular destinations - this could also come from database
  const destinations = [
    {
      name: 'القاهرة',
      nameEn: 'Cairo',
      image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      attractions: ['الأهرامات', 'المتحف المصري', 'خان الخليلي'],
      rating: 4.8
    },
    {
      name: 'الأقصر',
      nameEn: 'Luxor',
      image: 'https://images.unsplash.com/photo-1471919743851-c4df8b6ee260?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      attractions: ['معبد الكرنك', 'وادي الملوك', 'معبد حتشبسوت'],
      rating: 4.9
    },
    {
      name: 'أسوان',
      nameEn: 'Aswan',
      image: 'https://images.unsplash.com/photo-1525082156961-c38a5eb89054?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      attractions: ['السد العالي', 'معبد فيلة', 'جزيرة النباتات'],
      rating: 4.7
    },
    {
      name: 'الغردقة',
      nameEn: 'Hurghada',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      attractions: ['الشعاب المرجانية', 'الغوص', 'الشواطئ'],
      rating: 4.6
    },
    {
      name: 'شرم الشيخ',
      nameEn: 'Sharm El Sheikh',
      image: 'https://images.unsplash.com/photo-1544467082-8b6b2b2a39a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      attractions: ['رأس محمد', 'نعمة باي', 'دهب'],
      rating: 4.8
    },
    {
      name: 'الإسكندرية',
      nameEn: 'Alexandria',
      image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      attractions: ['مكتبة الإسكندرية', 'قلعة قايتباي', 'الكورنيش'],
      rating: 4.5
    }
  ];

  const handleExploreClick = () => {
    // Navigate to destinations page or contact
    const phoneNumber = "201103442881";
    const message = "مرحباً، أريد الاستفسار عن الوجهات السياحية المتاحة";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded mx-auto max-w-xs"></div>
              <div className="h-6 bg-gray-200 rounded mx-auto max-w-lg"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <MapPin className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {citiesContent?.title || 'اكتشف أجمل المدن'}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {citiesContent?.content || 'نقدم لك رحلات مميزة لأفضل الوجهات السياحية في مصر والعالم'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {destinations.map((destination, index) => (
            <Card key={index} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 shadow-lg">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={destination.image} 
                  alt={destination.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-semibold text-sm">{destination.rating}</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4" />
                    <span className="text-sm font-medium">اكتشف المعالم</span>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{destination.name}</h3>
                  <span className="text-sm text-gray-500">{destination.nameEn}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm mb-3">أهم المعالم:</p>
                  <div className="flex flex-wrap gap-2">
                    {destination.attractions.map((attraction, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        {attraction}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button 
            onClick={handleExploreClick}
            size="lg" 
            className="px-8 py-4 text-lg"
          >
            <Plane className="h-5 w-5 mr-2" />
            {citiesContent?.button_text || 'استكشف المزيد'}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;
