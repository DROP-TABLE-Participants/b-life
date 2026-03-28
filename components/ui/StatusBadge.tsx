import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import type { RiskLevel, ShipmentStatus } from "@/types/domain";

interface StatusBadgeProps {
  status: ShipmentStatus | RiskLevel;
}

const riskClass: Record<RiskLevel, string> = {
  safe: "bg-emerald-100 text-emerald-700",
  elevated: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const classes = status in STATUS_COLORS ? STATUS_COLORS[status as ShipmentStatus] : riskClass[status as RiskLevel];

  return (
    <Badge className={classes}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
