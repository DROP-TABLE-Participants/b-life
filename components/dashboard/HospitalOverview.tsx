import { HospitalBloodInventoryCards } from "@/components/dashboard/HospitalBloodInventoryCards";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatHospitalLabel } from "@/lib/utils";
import type { Forecast, Hospital, Shipment, TransferRecommendation } from "@/types/domain";

interface HospitalOverviewProps {
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  currentHospitalId: string;
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
  onDispatchShipment: (shipmentId: string) => void;
  onReceiveShipment: (shipmentId: string) => void;
}

export function HospitalOverview({
  hospital,
  hospitals,
  shipments,
  forecasts,
  recommendations,
  currentHospitalId,
  onApproveRecommendation,
  onDispatchRecommendation,
  onDispatchShipment,
  onReceiveShipment,
}: HospitalOverviewProps) {
  const hospitalForecasts = forecasts.filter((forecast) => forecast.hospitalId === hospital.id);
  const activeShipments = shipments.filter(
    (shipment) =>
      (shipment.fromHospitalId === hospital.id || shipment.toHospitalId === hospital.id) &&
      shipment.status !== "delivered" &&
      shipment.status !== "cancelled",
  );
  const myRecommendations = recommendations.filter(
    (recommendation) => recommendation.toHospitalId === hospital.id || recommendation.fromHospitalId === hospital.id,
  );

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{hospital.name}</h2>
            <p className="text-sm text-slate-300">{hospital.city}</p>
          </div>
          <StatusBadge status={hospital.status === "critical" ? "critical" : hospital.status === "strained" ? "high" : "safe"} />
        </div>
      </GlassCard>

      <HospitalBloodInventoryCards hospital={hospital} forecasts={hospitalForecasts} />

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">My Active Shipments</h3>
          <div className="mt-3 space-y-2">
            {activeShipments.slice(0, 6).map((shipment) => {
              const fromHospital = hospitals.find((item) => item.id === shipment.fromHospitalId);
              const toHospital = hospitals.find((item) => item.id === shipment.toHospitalId);

              return (
                <div key={shipment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-[11px] text-slate-500">
                    From {formatHospitalLabel(fromHospital)} to {formatHospitalLabel(toHospital)}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {shipment.bloodType} · {shipment.quantity}u
                    </p>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {shipment.fromHospitalId === hospital.id ? "Outgoing" : "Incoming"} · ETA {Math.round(shipment.etaMinutes)}m
                  </p>
                  {(shipment.status === "approved" || shipment.status === "planned") && shipment.fromHospitalId === currentHospitalId && (
                    <Button type="button" variant="cyan" size="sm" className="mt-2" onClick={() => onDispatchShipment(shipment.id)}>
                      Dispatch Shipment
                    </Button>
                  )}
                  {shipment.status !== "delivered" && shipment.toHospitalId === hospital.id && (
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onReceiveShipment(shipment.id)}>
                      Mark Received
                    </Button>
                  )}
                </div>
              );
            })}
            {activeShipments.length === 0 && <p className="text-sm text-slate-300">No active shipments.</p>}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Recommended Transfers</h3>
          <div className="mt-3 space-y-2">
            {myRecommendations.slice(0, 6).map((recommendation) => (
              <div key={recommendation.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {recommendation.bloodType} · {recommendation.suggestedQuantity}u
                  </p>
                  <StatusBadge status={recommendation.urgency === "critical" ? "critical" : recommendation.urgency === "high" ? "high" : "elevated"} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{recommendation.reason}</p>
                <div className="mt-2 flex gap-2">
                  {recommendation.fromHospitalId === currentHospitalId && recommendation.status === "pending_approval" && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => onApproveRecommendation(recommendation.id)}>
                      Approve
                    </Button>
                  )}
                  {recommendation.fromHospitalId === currentHospitalId && recommendation.status === "approved" && (
                    <Button type="button" variant="premium" size="sm" onClick={() => onDispatchRecommendation(recommendation.id)}>
                      Dispatch
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {myRecommendations.length === 0 && <p className="text-sm text-slate-300">No recommendations at this time.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
