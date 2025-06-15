
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  date?: DateRange
  onDateChange?: (range: DateRange | undefined) => void
  placeholder?: string
  locale?: any
  className?: string
}

export function DatePickerWithRange({
  value,
  onChange,
  date,
  onDateChange,
  placeholder = "اختر نطاق التاريخ",
  locale,
  className,
}: DatePickerWithRangeProps) {
  const dateValue = value || date;
  const dateOnChange = onChange || onDateChange;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateValue && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue?.from ? (
              dateValue.to ? (
                <>
                  {format(dateValue.from, "dd/MM/yyyy")} -{" "}
                  {format(dateValue.to, "dd/MM/yyyy")}
                </>
              ) : (
                format(dateValue.from, "dd/MM/yyyy")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateValue?.from}
            selected={dateValue}
            onSelect={dateOnChange}
            numberOfMonths={2}
            locale={locale}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
