
import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import VogantraLogo from '@/components/brand/VogantraLogo';

interface LandingFooterProps {
  onWhatsAppClick: () => void;
}

const LandingFooter = ({ onWhatsAppClick: _onWhatsAppClick }: LandingFooterProps) => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 xl:px-10 2xl:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <VogantraLogo variant="white" size="lg" />
            <p className="text-white/70 leading-relaxed mt-4 text-sm">
              منصة ERP ذكية متكاملة لشركات السياحة والسفر — حجوزات، حسابات، CRM، وتقارير في مكان واحد.
            </p>
            <p className="text-white/50 text-xs mt-3 font-inter italic">
              Powering Travel Business
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">المنتج</h3>
            <ul className="space-y-2 text-white/70 text-sm">
              <li><Link to="/" className="hover:text-white transition">المميزات</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition">الأسعار</Link></li>
              <li><Link to="/login" className="hover:text-white transition">تسجيل الدخول</Link></li>
              <li><Link to="/signup" className="hover:text-white transition">ابدأ تجربة مجانية</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">المنتجات</h3>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>Vogantra Booking Engine</li>
              <li>Vogantra Finance</li>
              <li>Vogantra CRM</li>
              <li>Vogantra HR</li>
              <li>Vogantra Analytics</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">تواصل معنا</h3>
            <div className="space-y-3 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span dir="ltr">+20 110 344 2881</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                hello@vogantra.com
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                القاهرة، مصر
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-white/60 text-sm">
          <p>© {new Date().getFullYear()} Vogantra. جميع الحقوق محفوظة. — The Operating System for Travel</p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
