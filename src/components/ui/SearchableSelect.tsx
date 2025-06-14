
import React, { useState, useMemo } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // تصفية الخيارات حسب النص المدخل
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(s)
    );
  }, [search, options]);

  const currentOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "border rounded px-3 py-2 cursor-pointer bg-background flex items-center justify-between",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        tabIndex={0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={currentOption ? "" : "text-muted-foreground"}>
          {currentOption ? currentOption.label : placeholder || "اختر ..."}
        </span>
        <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </div>
      {open && (
        <div className="absolute z-50 bg-white dark:bg-background border w-full mt-1 rounded shadow-lg max-h-60 overflow-y-auto p-2">
          <Input
            autoFocus
            className="mb-2"
            placeholder="ابحث هنا..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-gray-500 text-sm text-center">لا توجد نتائج</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "px-3 py-2 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground",
                  value === opt.value && "bg-primary/10 font-bold"
                )}
                tabIndex={0}
                onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    onChange(opt.value); setOpen(false); setSearch("");
                  }
                }}
                aria-selected={value === opt.value}
                role="option"
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
