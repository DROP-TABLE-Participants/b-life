import { GlassCard } from "@/components/ui/GlassCard";
import { SIMULATION_BOUNDS } from "@/lib/constants";

interface SimulationControlPanelProps {
  currentDate: string;
  demandMultiplier: number;
  shipmentSpeed: number;
  onDateChange: (isoDate: string) => void;
  onDemandChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
}

export function SimulationControlPanel({
  currentDate,
  demandMultiplier,
  shipmentSpeed,
  onDateChange,
  onDemandChange,
  onSpeedChange,
}: SimulationControlPanelProps) {
  const dateInputValue = currentDate.slice(0, 16);

  return (
    <GlassCard className="bg-gradient-to-br from-slate-900/80 via-slate-900/65 to-cyan-950/40">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Simulation Date</p>
          <input
            type="datetime-local"
            value={dateInputValue}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              onDateChange(new Date(value).toISOString());
            }}
            className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300"
          />
          <p className="mt-2 text-xs text-slate-400">Holiday periods are modeled automatically from this date.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Demand Pressure ×{demandMultiplier.toFixed(2)}</p>
          <input
            type="range"
            min={SIMULATION_BOUNDS.demandMultiplier.min}
            max={SIMULATION_BOUNDS.demandMultiplier.max}
            step={SIMULATION_BOUNDS.demandMultiplier.step}
            value={demandMultiplier}
            onChange={(event) => onDemandChange(Number(event.target.value))}
            className="mt-3 w-full accent-rose-400"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Truck Speed ×{shipmentSpeed.toFixed(2)}</p>
          <input
            type="range"
            min={SIMULATION_BOUNDS.shipmentSpeed.min}
            max={SIMULATION_BOUNDS.shipmentSpeed.max}
            step={SIMULATION_BOUNDS.shipmentSpeed.step}
            value={shipmentSpeed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            className="mt-3 w-full accent-cyan-400"
          />
        </div>
      </div>
    </GlassCard>
  );
}
