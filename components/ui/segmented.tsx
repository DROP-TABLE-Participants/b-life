"use client";

import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
  /** Small status dot after the label (e.g. a blood group with a shortage). */
  marker?: boolean;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onValueChange: (value: T) => void;
  /** "track": tabs inside a tinted track. "chips": separate bordered chips (grid friendly). */
  variant?: "track" | "chips";
  className?: string;
}

/** Segmented control / tab triggers from the Kit (Tabs / Item). */
export function Segmented<T extends string>({ label, value, options, onValueChange, variant = "track", className }: SegmentedProps<T>) {
  return <div role="radiogroup" aria-label={label}
    className={cn(variant === "track" ? "inline-flex gap-0.5 rounded-xl bg-hairline p-1" : "grid grid-cols-4 gap-2", className)}>
    {options.map((option) => {
      const active = option.value === value;
      return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => onValueChange(option.value)}
        className={cn("inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active ? "border border-hairline bg-white font-medium text-ink shadow-control" : "border border-transparent text-ink-secondary hover:text-ink",
          variant === "chips" && !active && "border-border bg-white/60")}>
        {option.label}
        {option.marker && <span aria-label="недостиг" className="size-1.5 rounded-full bg-critical" />}
        {option.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] leading-4", active ? "bg-brand-soft text-brand-strong" : "bg-hairline text-ink-secondary")}>{option.count}</span>}
      </button>;
    })}
  </div>;
}
