"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BloodNetworkScene } from "@/components/three/BloodNetworkScene";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { useInitializeAppState } from "@/hooks/useInitializeAppState";
import { useAppStore } from "@/store/useAppStore";

export default function LandingPage() {
  useInitializeAppState();

  const router = useRouter();
  const hospitals = useAppStore((state) => state.hospitals);
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);

  const selectedHospitalId = session.hospitalId ?? hospitals[0]?.id ?? "";

  const selectedHospitalName = useMemo(
    () => hospitals.find((hospital) => hospital.id === selectedHospitalId)?.name,
    [hospitals, selectedHospitalId],
  );

  const enterHospital = () => {
    if (!selectedHospitalId) return;
    setSession({ mode: "hospital", hospitalId: selectedHospitalId });
    router.push(`/hospital/${selectedHospitalId}`);
  };

  const enterControlTower = () => {
    setSession({ mode: "control_tower", hospitalId: null });
    router.push("/control-tower");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="absolute inset-0 p-4 lg:p-10">
        <BloodNetworkScene />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 lg:px-10">
        <motion.div
          className="grid w-full gap-6 lg:grid-cols-[1.2fr_1fr]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <GlassCard className="self-start border-slate-200/90 bg-white/78 p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-700">Regional Logistics Intelligence</p>
            <h1 className="mt-4 text-6xl font-semibold tracking-tight text-slate-950">{APP_NAME}</h1>
            <p className="mt-3 max-w-lg text-lg text-slate-700">{APP_TAGLINE}</p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600">
              Predict shortages, orchestrate blood redistribution, and monitor live shipment routes across your hospital network.
            </p>
          </GlassCard>

          <div className="space-y-4">
            <GlassCard className="space-y-4 border-slate-200/90 bg-white/82">
              <h2 className="text-xl font-semibold">Hospital Login</h2>
              <p className="text-sm text-slate-600">Enter a hospital command view and monitor your local supply chain.</p>
              <Label className="block uppercase tracking-[0.2em] text-cyan-700">Hospital</Label>
              <Select value={selectedHospitalId} onValueChange={(value) => setSession({ mode: "hospital", hospitalId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      {hospital.name} · {hospital.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="default" className="w-full" onClick={enterHospital}>
                Enter {selectedHospitalName ? `(${selectedHospitalName})` : "Hospital"}
              </Button>
            </GlassCard>

            <GlassCard className="space-y-4 border-slate-200/90 bg-white/82">
              <h2 className="text-xl font-semibold">Control Tower Login</h2>
              <p className="text-sm text-slate-600">Monitor all hospitals, active transfers, and decision-engine recommendations.</p>
              <Button type="button" variant="outline" className="w-full" onClick={enterControlTower}>
                Enter Regional Control Tower
              </Button>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
