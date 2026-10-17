"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sessionForFacility } from "@/lib/access";
import { MINISTRY_NAME } from "@/lib/labels";
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
  const initialized = useAppStore((state) => state.initialized);
  const setSession = useAppStore((state) => state.setSession);
  const [selectedAccountId, setSelectedAccountId] = useState("national-center");

  const signIn = () => {
    const facility = hospitals.find((item) => item.id === selectedAccountId);
    if (!facility) return;
    setSession(sessionForFacility(facility));
    router.push(`/hospital/${facility.id}`);
  };

  const signInAdmin = () => {
    setSession({ mode: "control_tower", hospitalId: null });
    router.push("/control-tower");
  };

  if (!initialized) return <AppLoadingScreen />;

  return (
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
            <Image src={logo} alt={`Лого на ${APP_NAME}`} width={56} height={56} className="h-14 w-14 object-contain" />
          </CardHeader>
          <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-1 flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account" className="text-[rgb(60,66,87)]">Акаунт</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger id="account" className="h-auto min-h-10 w-full text-left [&>span]:whitespace-normal">
                      <SelectValue placeholder="Изберете акаунт" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="bg-[#e85a39] py-5 hover:bg-[#e85a39]/90"
                  onClick={signIn}
                >
                  Вход
                </Button>
              </div>

              <Separator />
              <Button type="button" variant="outline" size="lg" className="h-auto min-h-10 whitespace-normal py-3" onClick={signInAdmin}>
                {MINISTRY_NAME} · Вход за администратор
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
  );
}
