import { RISK_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { projectBloodStock } from "@/lib/forecast-planning";
import { cn } from "@/lib/utils";
import { BLOOD_TYPES, type Forecast, type Hospital, type RiskLevel, type Shipment } from "@/types/domain";
import { ArrowUpRight } from "lucide-react";
import { MeshGradientBackground } from "./MeshGradientBackground";
import styles from "./HospitalBloodInventoryCards.module.css";

// Colour and intensity both scale with risk: safe stays faint, critical is strongest.
export const RISK_MESH: Record<RiskLevel, { colors: [string, string, string]; intensity: number }> = {
  safe: { colors: ["#6ee7b7", "#99f6e4", "#d1fae5"], intensity: 0.3 },
  elevated: { colors: ["#fcd34d", "#fef08a", "#fde7c7"], intensity: 0.36 },
  high: { colors: ["#fdba74", "#fed7aa", "#fecaca"], intensity: 0.42 },
  critical: { colors: ["#fb7185", "#fda4af", "#fdba74"], intensity: 0.5 },
};

interface BloodGroupCardProps {
  hospital: Hospital;
  bloodType: (typeof BLOOD_TYPES)[number];
  forecast?: Forecast;
  shipments: Shipment[];
  onSelect?: () => void;
  className?: string;
}

export function BloodGroupCard({ hospital, bloodType, forecast, shipments, onSelect, className }: BloodGroupCardProps) {
  const risk = forecast?.shortageRiskLevel ?? "safe";
  const units = hospital.inventoryByBloodType[bloodType] ?? 0;
  const need = forecast ? Math.ceil(projectBloodStock(hospital, forecast, shipments, 48).demandUnits - 1e-9) : null;

  return (
    <Card className={cn(styles.inventoryCard, onSelect && styles.inventoryCardInteractive, className)} onClick={onSelect}>
      <MeshGradientBackground seed={`${hospital.id}-${bloodType}`} {...RISK_MESH[risk]} />
      <CardContent className={styles.inventoryCardContent}>
        <div className={styles.inventoryCardHeaderTopRow}>
          <CardTitle className={styles.inventoryCardGroup}>{bloodType}</CardTitle>
          <Badge variant={risk} dot>{RISK_LABELS[risk]}</Badge>
        </div>
        <div className={styles.inventoryAmountRow}>
          <div>
            <div className={styles.inventoryAmountValueGroup}>
              <span className={styles.inventoryAmountValue}>{units}</span>
              {need !== null && <span className={styles.inventoryAmountNeed}>/ {need}</span>}
            </div>
          </div>
          {onSelect && <Button type="button" variant="ghost" size="icon-sm" className={styles.inventoryExpandButton}
            onClick={(event) => { event.stopPropagation(); onSelect(); }}>
            <ArrowUpRight />
            <span className="sr-only">Подробности за {bloodType}</span>
          </Button>}
        </div>
      </CardContent>
    </Card>
  );
}

interface HospitalBloodInventoryCardsProps {
  hospital: Hospital;
  forecasts: Forecast[];
  shipments: Shipment[];
  onSelectBloodType?: (bloodType: (typeof BLOOD_TYPES)[number]) => void;
}

export function HospitalBloodInventoryCards({ hospital, forecasts, shipments, onSelectBloodType }: HospitalBloodInventoryCardsProps) {
  return (
    <div className={styles.inventoryGrid}>
      {BLOOD_TYPES.map((bloodType) => (
        <BloodGroupCard key={bloodType} hospital={hospital} bloodType={bloodType} shipments={shipments}
          forecast={forecasts.find((item) => item.bloodType === bloodType)}
          onSelect={onSelectBloodType ? () => onSelectBloodType(bloodType) : undefined} />
      ))}
    </div>
  );
}
