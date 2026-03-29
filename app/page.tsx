"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/constants";
import { useInitializeAppState } from "@/hooks/useInitializeAppState";
import { useAppStore } from "@/store/useAppStore";
import Image from "next/image";

import logo from "@/public/b.life-logo.png";

export default function LandingPage() {
  useInitializeAppState();

  const router = useRouter();
  const hospitals = useAppStore((state) => state.hospitals);
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);

  const selectedHospitalId = session.hospitalId ?? hospitals[0]?.id ?? "";

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
    <>
      <style jsx global>{`
        body {
          background: var(--background) !important;
        }
      `}</style>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-6 sm:px-4 sm:py-8">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src="/background-login.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-white to-white/0 sm:h-[35vh]" />

        <Card className="relative z-10 w-full max-w-[450px]">
          <CardHeader className="items-center justify-center pb-2">
            <Image src={logo} alt={`${APP_NAME} logo`} width={56} height={56} className="h-14 w-14 object-contain" />
          </CardHeader>
          <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-1 flex-col gap-4">
                <div className="space-y-2">
                  <Label className="text-[rgb(60,66,87)]">Hospital</Label>
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
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="bg-[#e85a39] py-5 hover:bg-[#e85a39]/90"
                  onClick={enterHospital}
                >
                  Sign in
                </Button>
              </div>

              <Separator />

              <Button type="button" variant="outline" size="lg" onClick={enterControlTower}>
                Admin View Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
