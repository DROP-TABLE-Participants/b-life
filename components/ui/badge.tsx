import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] leading-[14px] font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-hairline bg-glass-strong text-ink",
        secondary: "border-transparent bg-muted text-ink-secondary",
        destructive: "border-critical-border bg-critical-soft text-critical",
        outline: "border-hairline bg-glass-strong text-ink",
        safe: "border-safe-border bg-safe-soft text-safe",
        elevated: "border-elevated-border bg-elevated-soft text-elevated",
        high: "border-high-border bg-high-soft text-high",
        critical: "border-critical-border bg-critical-soft text-critical",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { dot?: boolean };

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
