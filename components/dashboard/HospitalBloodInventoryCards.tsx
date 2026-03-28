import { GlassCard } from "@/components/ui/GlassCard";
import { RISK_COLORS } from "@/lib/constants";
import type { Forecast, Hospital, RiskLevel } from "@/types/domain";
import styles from "./HospitalBloodInventoryCards.module.css";

const BLOOD_GROUPS = [
  { group: "O", negative: "O-", positive: "O+" },
  { group: "A", negative: "A-", positive: "A+" },
  { group: "B", negative: "B-", positive: "B+" },
  { group: "AB", negative: "AB-", positive: "AB+" },
] as const;

const riskOrder: Record<RiskLevel, number> = {
  safe: 0,
  elevated: 1,
  high: 2,
  critical: 3,
};

interface HospitalBloodInventoryCardsProps {
  hospital: Hospital;
  forecasts: Forecast[];
}

export function HospitalBloodInventoryCards({ hospital, forecasts }: HospitalBloodInventoryCardsProps) {
  const chartDomainMax = Math.max(
    10,
    ...BLOOD_GROUPS.flatMap(({ negative, positive }) => [
      hospital.inventoryByBloodType[negative] ?? 0,
      hospital.inventoryByBloodType[positive] ?? 0,
    ]),
  );

  return (
    <div className={styles.inventoryGrid}>
      {BLOOD_GROUPS.map(({ group, negative, positive }) => {
        const negativeForecast = forecasts.find((forecast) => forecast.bloodType === negative);
        const positiveForecast = forecasts.find((forecast) => forecast.bloodType === positive);
        const groupRisk = [negativeForecast?.shortageRiskLevel, positiveForecast?.shortageRiskLevel]
          .filter((value): value is RiskLevel => Boolean(value))
          .sort((left, right) => riskOrder[right] - riskOrder[left])[0] ?? "safe";

        const totalUnits = (hospital.inventoryByBloodType[negative] ?? 0) + (hospital.inventoryByBloodType[positive] ?? 0);

        const rows = [
          {
            label: negative,
            units: hospital.inventoryByBloodType[negative] ?? 0,
            fillClassName: `${styles.inventoryFill} ${styles.inventoryFillNegative}`,
          },
          {
            label: positive,
            units: hospital.inventoryByBloodType[positive] ?? 0,
            fillClassName: `${styles.inventoryFill} ${styles.inventoryFillPositive}`,
          },
        ];

        return (
          <GlassCard key={group} className={styles.inventoryCard}>
            <div className={styles.inventoryCardHeader}>
              <div>
                <h3 className={styles.inventoryCardGroup}>{group}</h3>
              </div>
              <div className={styles.inventoryCardTotals}>
                <p className={styles.inventoryCardUnits}>{totalUnits}u</p>
                <p className={`${styles.inventoryCardRisk} ${RISK_COLORS[groupRisk]}`}>
                  {groupRisk} risk
                </p>
              </div>
            </div>

            <div className={styles.inventoryRows}>
              {rows.map((row) => {
                const width = `${Math.max(0, Math.min(100, (row.units / chartDomainMax) * 100))}%`;

                return (
                  <div key={row.label} className={styles.inventoryRow}>
                    <p className={styles.inventoryLabel}>{row.label}</p>
                    <div className={styles.inventoryTrack}>
                      <div className={row.fillClassName} style={{ width }} />
                    </div>
                    <p className={styles.inventoryValue}>
                      {row.units} / {chartDomainMax}
                    </p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
