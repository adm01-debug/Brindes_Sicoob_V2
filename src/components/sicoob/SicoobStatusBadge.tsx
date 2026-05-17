import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusConfig, type SicoobFulfillmentStatus } from "@/lib/sicoob-status-config";

interface SicoobStatusBadgeProps {
  status: SicoobFulfillmentStatus | string | null | undefined;
  showIcon?: boolean;
  className?: string;
  variant?: "solid" | "soft" | "outline";
  showLabel?: boolean;
}

export function SicoobStatusBadge({ 
  status, 
  showIcon = true, 
  showLabel = true,
  className,
  variant = "soft"
}: SicoobStatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  if (variant === "soft") {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
        config.bgClass,
        config.colorClass,
        `border-${config.colorClass.replace('text-', 'status-')}/20`,
        className
      )}>
        {showIcon && <Icon className="h-3.5 w-3.5" />}
        {showLabel && <span>{config.label}</span>}
      </div>
    );
  }

  return (
    <Badge 
      variant={config.badgeVariant as any} 
      className={cn("gap-1.5", className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {showLabel && config.label}
    </Badge>
  );
}
