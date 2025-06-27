
import React from 'react';
import { Card } from '@/components/ui/card';
import { Award, Building2, Hotel } from 'lucide-react';

const DirectContracts = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">تعاقدات مباشرة مع الفنادق</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            نفخر بتعاقداتنا المباشرة مع أفضل الفنادق من 3 إلى 5 نجوم في جميع أنحاء مصر
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center p-6 hover:shadow-xl transition-all duration-300">
            <Award className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">فنادق 5 نجوم</h3>
            <p className="text-gray-600">تعاقدات حصرية مع أرقى الفنادق الفاخرة</p>
          </Card>
          <Card className="text-center p-6 hover:shadow-xl transition-all duration-300">
            <Building2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">فنادق 4 نجوم</h3>
            <p className="text-gray-600">أفضل الفنادق متوسطة التكلفة بجودة عالية</p>
          </Card>
          <Card className="text-center p-6 hover:shadow-xl transition-all duration-300">
            <Hotel className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">فنادق 3 نجوم</h3>
            <p className="text-gray-600">إقامة مريحة واقتصادية للميزانية المحدودة</p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default DirectContracts;
