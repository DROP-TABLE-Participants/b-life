import { STATUS_COLORS } from "@/lib/constants";
import type { RiskLevel, ShipmentStatus } from "@/types/domain";

interface StatusBadgeProps {
  status: ShipmentStatus | RiskLevel;
}

const riskClass: Record<RiskLevel, string> = {
  safe: "bg-emerald-500/20 text-emerald-200",
  elevated: "bg-amber-500/20 text-amber-200",
  high: "bg-orange-500/20 text-orange-200",
  critical: "bg-rose-500/20 text-rose-200",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const classes = status in STATUS_COLORS ? STATUS_COLORS[status as ShipmentStatus] : riskClass[status as RiskLevel];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
