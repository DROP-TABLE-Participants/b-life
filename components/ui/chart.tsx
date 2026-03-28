"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipPayloadEntry } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

const useChart = () => {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used inside <ChartContainer />.");
  }

  return context;
};

export function ChartContainer({
  config,
  className,
  children,
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const style = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(config)
          .filter(([, value]) => value.color)
          .map(([key, value]) => [`--color-${key}`, value.color]),
      ) as React.CSSProperties,
    [config],
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("h-[220px] w-full text-xs", className)} style={style}>
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: readonly TooltipPayloadEntry[];
  className?: string;
  hideLabel?: boolean;
}

export function ChartTooltipContent({
  active,
  payload,
  className,
  hideLabel = false,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={cn("rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 shadow-2xl", className)}>
      {payload.map((item) => {
        const configKey = `${item.dataKey ?? item.name ?? "value"}`;
        const itemConfig = config[configKey];
        const label = itemConfig?.label ?? item.name ?? configKey;
        const indicatorColor = item.color ?? item.fill ?? "currentColor";

        return (
          <div key={configKey} className="flex min-w-[140px] items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: indicatorColor }} />
              <span>{hideLabel ? label : item.payload?.label ?? label}</span>
            </div>
            <span className="font-semibold text-white">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
