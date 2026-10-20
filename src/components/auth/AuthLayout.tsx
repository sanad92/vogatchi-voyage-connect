import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Hotel, Car, BarChart3 } from 'lucide-react';
import authSideImage from '@/assets/auth-side-image.jpg';
import VogantraLogo from '@/components/brand/VogantraLogo';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-sm sm:max-w-md">
          {children}
        </div>
      </div>

      {/* Left side - Image & Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        {/* Background image */}
        <img
          src={authSideImage}
          alt="SafarERP — Travel Business Software"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Brand overlay - Midnight Blue + Sky Blue */}
        <div className="absolute inset-0 bg-brand-navy/90" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full text-brand-ivory">
          {/* Top - Logo */}
          <Link to="/" className="inline-flex">
            <VogantraLogo variant="white" size="lg" showTagline />
          </Link>

          {/* Middle - Value Props */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
                إدارة أعمال السياحة،
                <br />
                برؤية أوضح.
              </h2>
              <p className="text-brand-ivory/70 text-lg leading-relaxed max-w-md">
                نظام متكامل لإدارة الحجوزات، العملاء، والتقارير المالية في مكان واحد.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Hotel, label: 'حجوزات الفنادق' },
                { icon: Plane, label: 'حجوزات الطيران' },
                { icon: Car, label: 'تأجير السيارات' },
                { icon: BarChart3, label: 'تقارير مالية' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-brand-ivory/10 backdrop-blur-sm rounded-xl p-3 border border-brand-ivory/10">
                  <item.icon className="w-5 h-5 text-brand-ivory/80 flex-shrink-0" />
                  <span className="text-sm text-brand-ivory/90">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom - Stats */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xl font-bold">العملاء</div>
              <div className="text-xs text-brand-ivory/60">طلبات ومتابعات</div>
            </div>
            <div className="w-px h-10 bg-brand-ivory/20" />
            <div>
              <div className="text-xl font-bold">الحجوزات</div>
              <div className="text-xs text-brand-ivory/60">خدمات وتشغيل</div>
            </div>
            <div className="w-px h-10 bg-brand-ivory/20" />
            <div>
              <div className="text-xl font-bold">الحسابات</div>
              <div className="text-xs text-brand-ivory/60">تحصيل ومستحقات</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
