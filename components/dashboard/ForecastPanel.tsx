"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BLOOD_TYPES, type BloodType, type Forecast, type Hospital } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";

export function ForecastPanel({ hospitals, forecasts }: { hospitals: Hospital[]; forecasts: Forecast[] }) {
  const [facilityId, setFacilityId] = useState(hospitals[0]?.id ?? "");
  const [bloodType, setBloodType] = useState<BloodType | "all">("all");
  const facility = hospitals.find((item) => item.id === facilityId) ?? hospitals[0];
  const selected = forecasts.filter((item) => item.hospitalId === facility?.id && (bloodType === "all" || item.bloodType === bloodType));
  const total = (key: "currentUnits" | "predictedDemand24h" | "predictedDemand48h") => selected.reduce((sum, item) => sum + item[key], 0);
  const chartData = [{ label: "Наличност", value: total("currentUnits") }, { label: "24 ч.", value: total("predictedDemand24h") }, { label: "48 ч.", value: total("predictedDemand48h") }];
  return <Card className={cn(surfaceStyles.dashboardCardSurface, "overflow-hidden")}>
    <CardHeader className="p-4 pb-0"><CardTitle>Прогнозна потребност от кръв</CardTitle></CardHeader>
    <CardContent className="space-y-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm">Прогноза за
          <select className="h-10 w-full rounded-md border bg-white px-3" value={facility?.id ?? ""} onChange={(event) => setFacilityId(event.target.value)}>
            {hospitals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">Кръвна група
          <select className="h-10 w-full rounded-md border bg-white px-3" value={bloodType} onChange={(event) => setBloodType(event.target.value as BloodType | "all")}>
            <option value="all">Всички</option>{BLOOD_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
      </div>
      <div className="h-[300px] min-w-0">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip />
          <Line type="monotone" dataKey="value" name="Единици" stroke="#e85a39" strokeWidth={2} />
        </LineChart></ResponsiveContainer>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="pb-2 text-left text-muted-foreground">{facility?.name} · прогнозна потребност в единици</caption>
        <thead><tr><th className="py-2">Кръвна група</th><th>Наличност</th><th>Потребност за 24 ч.</th><th>Потребност за 48 ч.</th></tr></thead>
        <tbody>{selected.map((item) => <tr key={item.bloodType} className="border-t"><td className="py-3 font-medium">{item.bloodType}</td><td>{item.currentUnits}</td><td>{item.predictedDemand24h}</td><td>{item.predictedDemand48h}</td></tr>)}</tbody>
      </table></div>
    </CardContent>
  </Card>;
}
