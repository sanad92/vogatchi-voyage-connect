
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FlightDetailsSectionProps {
  form: any;
  airports: any[];
  airlines: any[];
  flightClasses: any[];
}

const FlightDetailsSection = ({ form, airports, airlines, flightClasses }: FlightDetailsSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      control={form.control}
      name="departure_airport_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>مطار المغادرة</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="اختر مطار المغادرة" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {airports.map((airport) => (
                <SelectItem key={airport.id} value={airport.id}>
                  {airport.name} ({airport.iata_code}) - {airport.city}
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
      name="arrival_airport_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>مطار الوصول</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="اختر مطار الوصول" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {airports.map((airport) => (
                <SelectItem key={airport.id} value={airport.id}>
                  {airport.name} ({airport.iata_code}) - {airport.city}
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
      name="departure_time"
      render={({ field }) => (
        <FormItem>
          <FormLabel>وقت المغادرة (اختياري)</FormLabel>
          <FormControl>
            <Input {...field} type="time" />
          </FormControl>
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
      name="arrival_time"
      render={({ field }) => (
        <FormItem>
          <FormLabel>وقت الوصول (اختياري)</FormLabel>
          <FormControl>
            <Input {...field} type="time" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="airline_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>شركة الطيران</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="اختر شركة الطيران" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {airlines.map((airline) => (
                <SelectItem key={airline.id} value={airline.id}>
                  {airline.name} {airline.iata_code && `(${airline.iata_code})`}
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
  </div>
);

export default FlightDetailsSection;
