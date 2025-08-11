import React from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookingRequestForm from '@/components/forms/BookingRequestForm';

const BookingRequestStatic = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <SiteHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">طلب حجز</h1>
            <p className="text-xl text-muted-foreground">احجز رحلتك معنا واستمتع بتجربة لا تُنسى</p>
          </div>
          
          <BookingRequestForm />
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
};

export default BookingRequestStatic;