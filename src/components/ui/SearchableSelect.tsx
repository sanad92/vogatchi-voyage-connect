
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SearchableSelectOption {
  value: string
  label: string
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onChange?: (value: string) => void
  onValueChange?: (value: string) => void
  placeholder?: string
  emptyText?: string
  loading?: boolean
  className?: string
}

const SearchableSelect = React.forwardRef<
  React.ElementRef<typeof Button>,
  SearchableSelectProps
>(({ options, value, onChange, onValueChange, placeholder = "Select option...", emptyText = "No option found.", loading = false, className }, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue
    onChange?.(newValue)
    onValueChange?.(newValue)
    setOpen(false)
  }

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={loading}
        >
          {loading ? "Loading..." : selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
SearchableSelect.displayName = "SearchableSelect"

export default SearchableSelect
