
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Plane } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Control } from "react-hook-form";
import FlightDataSelectionSection from "./FlightDataSelectionSection";

interface FlightDetailsFormSectionProps {
  control: Control<any>;
  flightClasses: any[];
  watch: any;
  setValue: any;
}

const FlightDetailsFormSection = ({ 
  control, 
  flightClasses, 
  watch, 
  setValue 
}: FlightDetailsFormSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          تفاصيل الرحلة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FlightDataSelectionSection
          departureAirportId={watch('departure_airport_id') || ''}
          arrivalAirportId={watch('arrival_airport_id') || ''}
          airlineId={watch('airline_id') || ''}
          onDepartureAirportChange={(id) => setValue('departure_airport_id', id)}
          onArrivalAirportChange={(id) => setValue('arrival_airport_id', id)}
          onAirlineChange={(id) => setValue('airline_id', id)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="departure_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>تاريخ المغادرة</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>اختر التاريخ</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="arrival_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>تاريخ الوصول</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>اختر التاريخ</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="flight_class_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>درجة السفر</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر درجة السفر" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {flightClasses.map((flightClass) => (
                      <SelectItem key={flightClass.id} value={flightClass.id}>
                        {flightClass.name_ar} ({flightClass.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="number_of_passengers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>عدد المسافرين</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="flight_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الرحلة (اختياري)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="مثل: MS123" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FlightDetailsFormSection;
