
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { FlightBookingFormData } from "../hooks/useFlightBookingForm";

interface AdditionalServicesFormSectionProps {
  form: UseFormReturn<FlightBookingFormData>;
}

const AdditionalServicesFormSection = ({ form }: AdditionalServicesFormSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الطلبات والخدمات الإضافية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="special_requests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>طلبات خاصة</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="كرسي متحرك، مساعدة خاصة، إلخ..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meal_preferences"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تفضيلات الوجبات</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="حلال، نباتي، لا يحتوي على الجلوتين، إلخ..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="seat_preferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تفضيلات المقاعد</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="نافذة، ممر، مقدمة الطائرة، إلخ..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default AdditionalServicesFormSection;
