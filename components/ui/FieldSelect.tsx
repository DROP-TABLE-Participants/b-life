"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FieldSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function FieldSelect({ label, value, onValueChange, options, placeholder = "Изберете", disabled, required, className }: FieldSelectProps) {
  return <Select value={value} onValueChange={onValueChange} disabled={disabled} required={required}>
    <SelectTrigger aria-label={label} title={options.find((item) => item.value === value)?.label} className={className}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((item) => <SelectItem key={item.value} value={item.value} disabled={item.disabled}>{item.label}</SelectItem>)}
    </SelectContent>
  </Select>;
}
