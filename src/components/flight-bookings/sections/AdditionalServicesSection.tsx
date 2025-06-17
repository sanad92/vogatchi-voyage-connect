
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";

interface AdditionalServicesSectionProps {
  control: Control<any>;
}

const AdditionalServicesSection = ({ control }: AdditionalServicesSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الطلبات والخدمات الإضافية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
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
            control={control}
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
          control={control}
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

export default AdditionalServicesSection;
