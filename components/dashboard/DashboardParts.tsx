import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, ArrowUpRight, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared building blocks of the redesigned workspace (Figma: B.Life / Kit).

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <header className="flex flex-wrap items-center justify-between gap-4">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-sm text-ink-secondary">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
  </header>;
}

export function LiveStamp({ label = "Обновено преди 1 мин." }: { label?: string }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
    <span aria-hidden="true" className="size-1.5 rounded-full bg-safe" />{label}
  </span>;
}

interface OutlookPillProps {
  shortage: boolean;
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}

/** Replaces the full-width outlook banner: quiet when covered, a compact alert when short. */
export function OutlookPill({ shortage, title, detail, actionHref, actionLabel }: OutlookPillProps) {
  if (!shortage) {
    return <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-glass-strong px-3 py-2 text-xs shadow-control">
      <span aria-hidden="true" className="size-2 rounded-full bg-safe" />
      <span className="font-medium text-ink">{title}</span>
      <span className="text-ink-secondary">· {detail}</span>
    </span>;
  }
  return <div role="status" className="flex items-center gap-3 rounded-xl border border-critical-border bg-critical-soft py-1.5 pr-1.5 pl-3.5">
    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-critical" />
    <div className="text-xs leading-4">
      <p className="font-medium text-critical">{title}</p>
      <p className="text-ink-secondary">{detail}</p>
    </div>
    {actionHref && <Button size="sm" nativeButton={false} render={<Link href={actionHref} />}>{actionLabel}</Button>}
  </div>;
}

export interface KpiItem {
  label: string;
  value: string | number;
  unit?: string;
  context: string;
  tone?: "default" | "critical";
  /** Fraction of the bar shown in brand colour (e.g. reserved units). */
  reservedShare?: number;
}

export function KpiStrip({ items }: { items: KpiItem[] }) {
  return <section className="grid overflow-hidden rounded-2xl border border-hairline bg-white shadow-glass-card sm:grid-cols-2 xl:grid-cols-4">
    {items.map((item, index) => <div key={item.label} className={cn("space-y-1.5 px-6 py-5", index > 0 && "border-hairline xl:border-l")}>
      <p className="text-xs text-ink-secondary">{item.label}</p>
      <p className="flex items-baseline gap-1.5">
        <span className={cn("text-[32px] leading-10 font-bold tracking-tight", item.tone === "critical" ? "text-critical" : "text-ink")}>{item.value}</span>
        {item.unit && <span className="text-sm text-ink-muted">{item.unit}</span>}
      </p>
      {item.reservedShare !== undefined && <div aria-hidden="true" className="flex h-1 gap-0.5">
        <span className="rounded-full bg-ink/80" style={{ flexGrow: 1 - item.reservedShare }} />
        {item.reservedShare > 0 && <span className="min-w-1.5 rounded-full bg-brand" style={{ flexGrow: item.reservedShare }} />}
      </div>}
      <p className="text-xs text-ink-secondary">{item.context}</p>
    </div>)}
  </section>;
}

interface SectionCardProps {
  title: string;
  count?: number | string;
  subtitle?: string;
  action?: { label: string; href: string; icon?: LucideIcon };
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, count, subtitle, action, className, bodyClassName, children }: SectionCardProps) {
  const Icon = action?.icon;
  return <section className={cn("flex min-w-0 flex-col rounded-2xl border border-hairline bg-white px-5 py-[18px] shadow-glass-card", className)}>
    <header className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-baseline gap-1.5 text-base font-semibold text-ink">{title}{count !== undefined && <span className="text-xs font-normal text-ink-muted">{count}</span>}</h2>
        {subtitle && <p className="text-xs text-ink-secondary">{subtitle}</p>}
      </div>
      {action && <Button size="sm" variant="outline" nativeButton={false} render={<Link href={action.href} />}>{Icon && <Icon />}{action.label}</Button>}
    </header>
    <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
  </section>;
}

export type TransferKind = "recommendation" | "outgoing" | "incoming" | "request";

const kindIcons: Record<TransferKind, LucideIcon> = { recommendation: Sparkles, outgoing: ArrowUpRight, incoming: ArrowDownLeft, request: ArrowDownLeft };

export function TransferIcon({ kind, className }: { kind: TransferKind; className?: string }) {
  const Icon = kindIcons[kind];
  return <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline",
    kind === "recommendation" ? "bg-brand-soft text-brand" : "bg-canvas text-ink-secondary", className)}>
    <Icon className="size-4" />
  </span>;
}

interface TransferRowProps {
  kind: TransferKind;
  bloodType: string;
  title: string;
  meta: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  progress?: number;
  footer?: React.ReactNode;
  compact?: boolean;
}

/** One transfer (request, recommendation or shipment): direction, group, what, who/when, one action. */
export function TransferRow({ kind, bloodType, title, meta, badge, actions, progress, footer, compact }: TransferRowProps) {
  return <div className={cn("space-y-2.5", compact ? "py-2.5" : "px-4 py-3.5")}>
    <div className="flex items-center gap-4">
      <TransferIcon kind={kind} />
      {bloodType && <span className="w-10 shrink-0 text-base font-semibold text-ink">{bloodType}</span>}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium text-ink">{title}</p>
        <p className="truncate text-xs text-ink-secondary">{meta}</p>
        {progress !== undefined && <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-hairline">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>}
      </div>
      {badge}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
    {footer && <div className={cn(!compact && "pl-[108px]")}>{footer}</div>}
  </div>;
}

export function LiveShipmentCard({ title, eta, route, progress, delayed, muted }: { title: string; eta: string; route: string; progress: number; delayed?: boolean; muted?: boolean }) {
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
  return <div className={cn("space-y-2.5 rounded-xl border border-hairline px-4 py-3.5", muted ? "bg-canvas" : "bg-white shadow-glass-card")}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-ink">{title}</p>
      <span className={cn("inline-flex items-center gap-1 text-xs", delayed ? "text-elevated" : "text-ink-secondary")}><Clock className="size-3" />{eta}</span>
    </div>
    <p className="text-xs text-ink-secondary">{route}</p>
    <div aria-hidden="true" className="relative h-1.5 rounded-full bg-hairline">
      <div className={cn("h-full rounded-full", delayed ? "bg-elevated" : "bg-brand")} style={{ width: `${percent}%` }} />
      <span className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white", delayed ? "border-elevated" : "border-brand")} style={{ left: `${percent}%` }} />
    </div>
  </div>;
}

export function Divided({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-hairline">{children}</div>;
}
