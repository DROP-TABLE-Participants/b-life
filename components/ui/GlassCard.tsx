interface GlassCardProps {
  className?: string;
  children: React.ReactNode;
}

export function GlassCard({ className = "", children }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl ${className}`.trim()}
    >
      {children}
    </div>
  );
}
