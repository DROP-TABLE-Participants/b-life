"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BloodNetworkScene } from "@/components/three/BloodNetworkScene";
import { GlassCard } from "@/components/ui/GlassCard";
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
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
          <GlassCard className="self-start p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/90">Regional Logistics Intelligence</p>
            <h1 className="mt-4 text-6xl font-semibold tracking-tight text-white">{APP_NAME}</h1>
            <p className="mt-3 max-w-lg text-lg text-slate-200/90">{APP_TAGLINE}</p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300">
              Predict shortages, orchestrate blood redistribution, and monitor live shipment routes across your hospital network.
            </p>
          </GlassCard>

          <div className="space-y-4">
            <GlassCard className="space-y-4">
              <h2 className="text-xl font-semibold">Hospital Login</h2>
              <p className="text-sm text-slate-300">Enter a hospital command view and monitor your local supply chain.</p>
              <label className="block text-xs uppercase tracking-[0.2em] text-cyan-200">Hospital</label>
              <select
                className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                value={selectedHospitalId}
                onChange={(event) => setSession({ mode: "hospital", hospitalId: event.target.value })}
              >
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name} · {hospital.city}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(244,63,94,0.35)] transition hover:brightness-110"
                onClick={enterHospital}
              >
                Enter {selectedHospitalName ? `(${selectedHospitalName})` : "Hospital"}
              </button>
            </GlassCard>

            <GlassCard className="space-y-4">
              <h2 className="text-xl font-semibold">Control Tower Login</h2>
              <p className="text-sm text-slate-300">Monitor all hospitals, active transfers, and decision-engine recommendations.</p>
              <button
                type="button"
                className="w-full rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                onClick={enterControlTower}
              >
                Enter Regional Control Tower
              </button>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
