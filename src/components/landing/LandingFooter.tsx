
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, MessageSquare } from 'lucide-react';

interface LandingFooterProps {
  onWhatsAppClick: () => void;
}

const LandingFooter = ({ onWhatsAppClick }: LandingFooterProps) => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">V</span>
              </div>
              <span className="text-xl font-bold">Vogatchi Travel</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية بجودة عالية وأسعار تنافسية.
            </p>
            <Button
              onClick={onWhatsAppClick}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              تواصل عبر الواتساب
            </Button>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">خدماتنا</h3>
            <ul className="space-y-2 text-gray-400">
              <li>حجز الفنادق</li>
              <li>حجز الطيران</li>
              <li>الباقات السياحية</li>
              <li>تأجير السيارات</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">الوجهات</h3>
            <ul className="space-y-2 text-gray-400">
              <li>القاهرة</li>
              <li>الإسكندرية</li>
              <li>شرم الشيخ</li>
              <li>الغردقة</li>
              <li>مرسى علم</li>
              <li>الأقصر</li>
              <li>أسوان</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">تواصل معنا</h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                01103442881
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                ops@vogatchitrips.com
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                القاهرة، مصر
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Vogatchi Travel. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
