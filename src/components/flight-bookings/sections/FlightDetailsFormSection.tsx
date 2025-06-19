
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plane } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";
import TripTypeSelection from "./TripTypeSelection";
import FlightDataSelectionSection from "./FlightDataSelectionSection";
import { FlightBookingFormData } from "../hooks/useFlightBookingForm";

interface FlightDetailsFormSectionProps {
  form: UseFormReturn<FlightBookingFormData>;
  flightClasses: any[];
}

const FlightDetailsFormSection = ({ form, flightClasses }: FlightDetailsFormSectionProps) => {
  return (
    <>
      <FormField
        control={form.control}
        name="trip_type"
        render={({ field }) => (
          <FormItem>
            <TripTypeSelection
              value={field.value}
              onChange={field.onChange}
            />
          </FormItem>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            تفاصيل الرحلة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FlightDataSelectionSection
            departureAirportId={form.watch('departure_airport_id') || ''}
            arrivalAirportId={form.watch('arrival_airport_id') || ''}
            airlineId={form.watch('airline_id') || ''}
            onDepartureAirportChange={(id) => form.setValue('departure_airport_id', id)}
            onArrivalAirportChange={(id) => form.setValue('arrival_airport_id', id)}
            onAirlineChange={(id) => form.setValue('airline_id', id)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
    </>
  );
};

export default FlightDetailsFormSection;
