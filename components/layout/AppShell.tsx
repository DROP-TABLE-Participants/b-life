"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#04070f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.2),transparent_32%),linear-gradient(180deg,#04070f_0%,#02040c_100%)]" />
      <header className="relative border-b border-white/10 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">{APP_NAME}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-300/80">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm transition hover:border-cyan-300/70 hover:text-cyan-200"
            >
              Switch Account
            </Link>
            {actions}
          </div>
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
