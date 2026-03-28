import { Card, CardContent } from "@/components/ui/card";

interface GlassCardProps {
  className?: string;
  children: React.ReactNode;
}

export function GlassCard({ className = "", children }: GlassCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
