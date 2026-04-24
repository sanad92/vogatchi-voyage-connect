import { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { arSA } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BookingDateRangePickerProps {
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string;
  onChange: (range: { checkIn?: string; checkOut?: string }) => void;
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const BookingDateRangePicker = ({ checkIn, checkOut, onChange }: BookingDateRangePickerProps) => {
  const [open, setOpen] = useState(false);

  const range: DateRange | undefined = checkIn
    ? { from: new Date(checkIn), to: checkOut ? new Date(checkOut) : undefined }
    : undefined;

  const nights = checkIn && checkOut
    ? Math.max(0, differenceInCalendarDays(new Date(checkOut), new Date(checkIn)))
    : 0;

  const display = !checkIn
    ? "اختر تواريخ الإقامة"
    : !checkOut
      ? `${format(new Date(checkIn), 'dd MMM yyyy', { locale: arSA })} → ?`
      : `${format(new Date(checkIn), 'dd MMM', { locale: arSA })} → ${format(new Date(checkOut), 'dd MMM yyyy', { locale: arSA })}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-right font-normal", !checkIn && "text-muted-foreground")}
        >
          <CalendarIcon className="ml-2 h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate">{display}</span>
          {nights > 0 && (
            <Badge variant="secondary" className="mr-2 flex-shrink-0">{nights} ليلة</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            onChange({
              checkIn: r?.from ? toISO(r.from) : undefined,
              checkOut: r?.to ? toISO(r.to) : undefined,
            });
            if (r?.from && r?.to) setOpen(false);
          }}
          numberOfMonths={2}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
          disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
        />
      </PopoverContent>
    </Popover>
  );
};

export default BookingDateRangePicker;
