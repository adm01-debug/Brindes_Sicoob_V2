import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatVariant = "default" | "success" | "warning" | "danger" | "info" | "orange";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: StatVariant;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<StatVariant, { bg: string; icon: string; glow: string }> = {
  default: {
    bg: "bg-muted/50",
    icon: "text-foreground",
    glow: "",
  },
  success: {
    bg: "bg-success/15",
    icon: "text-success",
    glow: "shadow-[0_0_20px_hsl(var(--success)/0.3)]",
  },
  warning: {
    bg: "bg-warning/15",
    icon: "text-warning",
    glow: "shadow-[0_0_20px_hsl(var(--warning)/0.3)]",
  },
  danger: {
    bg: "bg-destructive/15",
    icon: "text-destructive",
    glow: "shadow-[0_0_20px_hsl(var(--destructive)/0.3)]",
  },
  info: {
    bg: "bg-info/15",
    icon: "text-info",
    glow: "shadow-[0_0_20px_hsl(var(--info)/0.3)]",
  },
  orange: {
    bg: "bg-orange/15",
    icon: "text-orange",
    glow: "shadow-[0_0_20px_hsl(var(--orange)/0.3)]",
  },
};

function Trend({ trend }: { trend?: StatCardProps["trend"] }) {
  if (!trend) return null;
  const positive = trend.value >= 0;
  return (
    <div className="flex items-center gap-1 pt-1">
      <span className={cn("text-xs font-medium", positive ? "text-success" : "text-destructive")}>{positive ? "+" : ""}{trend.value}%</span>
      {trend.label && <span className="text-xs text-muted-foreground">{trend.label}</span>}
    </div>
  );
}

function variantGlowClass(variant: StatVariant) {
  if (variant === "success") return "bg-success";
  if (variant === "warning") return "bg-warning";
  if (variant === "danger") return "bg-destructive";
  if (variant === "info") return "bg-info";
  if (variant === "orange") return "bg-orange";
  return undefined;
}

function StatIcon({ icon, styles }: { icon: LucideIcon; styles: (typeof variantStyles)[StatVariant] }) {
  const IconComponent = icon;
  return <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300", styles.bg, styles.glow)}><IconComponent className={cn("h-6 w-6", styles.icon)} /></div>;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  trend,
  className,
  onClick,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300",
        "hover:border-border/80 hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          <Trend trend={trend} />
        </div>

        {/* Icon container with colored background */}
        <StatIcon icon={icon} styles={styles} />
      </div>

      {/* Subtle gradient overlay */}
      <div
        className={cn(
          "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl",
          variantGlowClass(variant)
        )}
      />
    </div>
  );
}

// Mini stat card for compact displays
interface MiniStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: StatVariant;
  className?: string;
}

export function MiniStatCard({
  title,
  value,
  icon,
  variant = "default",
  className,
}: MiniStatCardProps) {
  const styles = variantStyles[variant];
  const IconComponent = icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-200",
        "hover:border-border/80",
        className
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          styles.bg
        )}
      >
        <IconComponent className={cn("h-4 w-4", styles.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
