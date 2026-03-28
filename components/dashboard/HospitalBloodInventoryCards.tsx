import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BLOOD_TYPES, type Forecast, type Hospital, type RiskLevel } from "@/types/domain";
import { ArrowUpRight } from "lucide-react";
import surfaceStyles from "./DashboardCardSurface.module.css";
import { MeshGradientBackground } from "./MeshGradientBackground";
import styles from "./HospitalBloodInventoryCards.module.css";

const riskBadgeClassNames: Record<RiskLevel, string> = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-700",
  elevated: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

const riskBadgeLabels: Record<RiskLevel, string> = {
  safe: "safe",
  elevated: "warning",
  high: "risk",
  critical: "risk",
};

const riskMeshColors: Record<
  RiskLevel,
  { colorA: string; colorB: string; colorC: string; accent: string }
> = {
  safe: {
    colorA: "rgba(52, 211, 153, 0.76)",
    colorB: "rgba(45, 212, 191, 0.64)",
    colorC: "rgba(134, 239, 172, 0.52)",
    accent: "rgba(16, 185, 129, 0.58)",
  },
  elevated: {
    colorA: "rgba(250, 204, 21, 0.76)",
    colorB: "rgba(251, 191, 36, 0.68)",
    colorC: "rgba(253, 224, 71, 0.54)",
    accent: "rgba(245, 158, 11, 0.56)",
  },
  high: {
    colorA: "rgba(251, 146, 60, 0.78)",
    colorB: "rgba(249, 115, 22, 0.7)",
    colorC: "rgba(253, 186, 116, 0.56)",
    accent: "rgba(234, 88, 12, 0.58)",
  },
  critical: {
    colorA: "rgba(248, 113, 113, 0.8)",
    colorB: "rgba(244, 63, 94, 0.72)",
    colorC: "rgba(251, 146, 60, 0.5)",
    accent: "rgba(225, 29, 72, 0.62)",
  },
} as const;

interface HospitalBloodInventoryCardsProps {
  hospital: Hospital;
  forecasts: Forecast[];
  onSelectBloodType?: (bloodType: (typeof BLOOD_TYPES)[number]) => void;
}

export function HospitalBloodInventoryCards({ hospital, forecasts, onSelectBloodType }: HospitalBloodInventoryCardsProps) {
  const chartDomainMax = Math.max(
    10,
    ...BLOOD_TYPES.map((bloodType) => hospital.inventoryByBloodType[bloodType] ?? 0),
  );

  return (
    <div className={styles.inventoryGrid}>
      {BLOOD_TYPES.map((bloodType) => {
        const forecast = forecasts.find((item) => item.bloodType === bloodType);
        const risk = forecast?.shortageRiskLevel ?? "safe";
        const units = hospital.inventoryByBloodType[bloodType] ?? 0;

        return (
          <Card
            key={bloodType}
            className={cn(surfaceStyles.dashboardCardSurface, styles.inventoryCard)}
            onClick={() => onSelectBloodType?.(bloodType)}
          >
            <MeshGradientBackground seed={`${hospital.id}-${bloodType}`} {...riskMeshColors[risk]} />
            <CardContent className={styles.inventoryCardContent}>
              <div className={styles.inventoryCardHeaderTopRow}>
                <CardTitle className={styles.inventoryCardGroup}>{bloodType}</CardTitle>
                <Badge className={cn(styles.inventoryCardRisk, riskBadgeClassNames[risk])} variant="outline">
                  {riskBadgeLabels[risk]}
                </Badge>
              </div>
              <div className={styles.inventoryAmountRow}>
                <div className={styles.inventoryAmountValueGroup}>
                  <span className={styles.inventoryAmountValue}>{units}</span>
                  <span className={styles.inventoryAmountDivider}>/</span>
                  <span className={styles.inventoryAmountMax}>{chartDomainMax}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={styles.inventoryExpandButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectBloodType?.(bloodType);
                  }}
                >
                  <ArrowUpRight />
                  <span className="sr-only">Open {bloodType} insights</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
