import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CalendarPlus, CalendarRange, CalendarDays, Building2 } from "lucide-react";
import { useNoveltyStats, type NoveltyStatsDisplay } from "@/hooks/useNovelties";
import { cn } from "@/lib/utils";
import { type ReactNode, useState, useEffect } from "react";

function useCountUp(end: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) { setCount(0); return; }
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(end * easeOutQuart));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  return count;
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  subtitle?: string;
  icon: ReactNode;
  variant: "success" | "warning" | "info" | "default" | "orange";
  delay?: number;
}

const variantStyles = {
  success: { iconBg: "bg-success/15", iconColor: "text-success", glow: "hover:shadow-[0_0_20px_hsl(var(--success)/0.15)]" },
  warning: { iconBg: "bg-warning/15", iconColor: "text-warning", glow: "hover:shadow-[0_0_20px_hsl(var(--warning)/0.15)]" },
  info: { iconBg: "bg-info/15", iconColor: "text-info", glow: "hover:shadow-[0_0_20px_hsl(var(--info)/0.15)]" },
  default: { iconBg: "bg-primary/15", iconColor: "text-primary", glow: "hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]" },
  orange: { iconBg: "bg-orange/15", iconColor: "text-orange", glow: "hover:shadow-[0_0_20px_hsl(var(--orange)/0.15)]" },
};

function StatCard({ label, value, suffix = "", subtitle, icon, variant, delay = 0 }: StatCardProps) {
  const animatedValue = useCountUp(value, 800);
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "border-border/50 hover:border-primary/30 transition-all duration-300",
        styles.glow
      )}
      style={{ animation: `scale-fade-in 0.4s ease-out ${delay}ms backwards` }}
    >
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("shrink-0 p-2 rounded-lg", styles.iconBg)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-xl font-bold tabular-nums truncate leading-tight">
              {animatedValue.toLocaleString('pt-BR')}{suffix}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">
              {label}
            </p>
            {subtitle && (
              <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5 leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingStats() {
  return <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">{Array.from({ length: 5 }).map((_, index) => <Card key={index} className="border-border/50"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-muted/50 flex items-center justify-center"><div className="w-4 h-4 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" /></div><div className="space-y-1.5"><div className="text-lg font-bold tabular-nums text-muted-foreground/40">--</div><div className="text-[10px] text-muted-foreground/30">carregando...</div></div></div></CardContent></Card>)}</div>;
}

interface NoveltyStats {
  arrivedToday: number;
  arrivedThisWeek: number;
  arrivedLast15Days: number;
  topSupplierCount: number;
  topSupplierName: string;
  activeNovelties: number;
  noveltyRate: number;
}

function numeric(value: number | undefined): number { return value ?? 0; }
function supplierName(value: string | null | undefined): string { return value ?? "—"; }

function normalizeStats(stats: NoveltyStatsDisplay | undefined): NoveltyStats {
  return { arrivedToday: numeric(stats?.arrivedToday), arrivedThisWeek: numeric(stats?.arrivedThisWeek), arrivedLast15Days: numeric(stats?.arrivedLast15Days), topSupplierCount: numeric(stats?.topSupplierCount), topSupplierName: supplierName(stats?.topSupplierName), activeNovelties: numeric(stats?.activeNovelties), noveltyRate: numeric(stats?.noveltyRate) };
}

function StatsCards({ stats }: { stats: NoveltyStats }) {
  return <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"><StatCard label="Chegaram Hoje" value={stats.arrivedToday} icon={<CalendarPlus className="h-4 w-4 sm:h-5 sm:w-5" />} variant="orange" /><StatCard label="Últimos 7 Dias" value={stats.arrivedThisWeek} icon={<CalendarRange className="h-4 w-4 sm:h-5 sm:w-5" />} variant="success" delay={100} /><StatCard label="Últimos 15 Dias" value={stats.arrivedLast15Days} icon={<CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />} variant="warning" delay={150} /><StatCard label="Top Fornecedor" value={stats.topSupplierCount} subtitle={stats.topSupplierName} icon={<Building2 className="h-4 w-4 sm:h-5 sm:w-5" />} variant="info" delay={200} /><StatCard label="Novidades Ativas" value={stats.activeNovelties} suffix={stats.noveltyRate ? ` (${stats.noveltyRate}%)` : ""} icon={<Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />} variant="default" delay={300} /></div>;
}

export function NoveltyStatsCards() {
  const { data: stats, isLoading, error } = useNoveltyStats();

  if (isLoading) return <LoadingStats />;

  if (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }

  return <StatsCards stats={normalizeStats(stats)} />;
}
