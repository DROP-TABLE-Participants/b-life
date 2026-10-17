import { RISK_LABELS, SHIPMENT_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import type { RiskLevel, ShipmentStatus } from "@/types/domain";

interface StatusBadgeProps {
  status: ShipmentStatus | RiskLevel;
  className?: string;
}

// Only exceptions carry colour: normal states stay neutral.
const shipmentVariant: Record<ShipmentStatus, "default" | "elevated" | "critical"> = {
  planned: "default", approved: "default", in_transit: "default", delivered: "default",
  delayed: "elevated", cancelled: "default",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status in SHIPMENT_STATUS_LABELS) {
    const variant = shipmentVariant[status as ShipmentStatus];
    return <Badge variant={variant} dot={variant !== "default"} className={className}>{SHIPMENT_STATUS_LABELS[status as ShipmentStatus]}</Badge>;
  }
  return <Badge variant={status as RiskLevel} dot className={className}>{RISK_LABELS[status as RiskLevel]}</Badge>;
}
