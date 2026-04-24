import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Hotel, Receipt, Users, Briefcase, Building2, BarChart3,
} from 'lucide-react';

const products = [
  {
    icon: Hotel,
    name: 'Vogantra Booking Engine',
    desc: 'حجوزات فنادق، طيران، نقل، رحلات وعمرة في واجهة موحدة مع تتبع الحالات تلقائياً.',
    color: 'from-primary to-primary-glow',
  },
  {
    icon: Receipt,
    name: 'Vogantra Finance',
    desc: 'فواتير احترافية، عمولات، مدفوعات موردين، حسابات بنكية، وتقارير أرباح لحظية.',
    color: 'from-accent to-primary',
  },
  {
    icon: Users,
    name: 'Vogantra CRM',
    desc: 'قاعدة بيانات عملاء، تكامل واتساب، Segments ذكية، ومتابعة دقيقة لكل تواصل.',
    color: 'from-primary-glow to-accent',
  },
  {
    icon: Briefcase,
    name: 'Vogantra HR',
    desc: 'موظفين، حضور، رواتب، عمولات شهرية، وصلاحيات دقيقة لكل دور.',
    color: 'from-secondary to-primary',
  },
  {
    icon: Building2,
    name: 'Vogantra Suppliers',
    desc: 'إدارة الموردين، عقود الأسعار، الـ Allotments، وعملات متعددة لكل مورد.',
    color: 'from-primary to-accent',
  },
  {
    icon: BarChart3,
    name: 'Vogantra Analytics',
    desc: 'لوحات قياس KPIs لحظية، تقارير مالية مفصلة، وتحليل ربحية كل قسم وفرع.',
    color: 'from-accent to-primary-glow',
  },
];

const ServicesSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs font-inter font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            The Vogantra Suite
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            منظومة واحدة. كل أعمالك السياحية.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
            ست منتجات متكاملة تعمل معاً بسلاسة — تشغّل شركتك من الحجز للفاتورة للتقرير.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p, i) => {
            const Icon = p.icon;
            return (
              <Card
                key={i}
                className="group relative overflow-hidden p-6 border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-300 bg-card"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.color}`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-foreground font-inter">{p.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
