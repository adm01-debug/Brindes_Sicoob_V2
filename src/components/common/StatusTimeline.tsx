import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Check, Package, Truck, CheckCircle2, XCircle, FileText, Send, Eye, MessageSquare, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const INFO_BACKGROUND = "bg-info/10";

type TimelineStatus = 
  | "created" 
  | "sent" 
  | "viewed" 
  | "approved" 
  | "rejected"
  | "paid"
  | "production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "comment";

interface TimelineEvent {
  id: string;
  status: TimelineStatus;
  title: string;
  description?: string;
  timestamp: Date | string;
  user?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface StatusTimelineProps {
  events: TimelineEvent[];
  className?: string;
  showConnector?: boolean;
}

const statusConfig: Record<TimelineStatus, { 
  icon: typeof Check; 
  color: string; 
  bgColor: string;
}> = {
  created: {
    icon: FileText,
    color: "text-info",
    bgColor: INFO_BACKGROUND
  },
  sent: {
    icon: Send,
    color: "text-info",
    bgColor: INFO_BACKGROUND
  },
  viewed: {
    icon: Eye,
    color: "text-accent-foreground",
    bgColor: "bg-accent"
  },
  approved: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10"
  },
  rejected: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
  paid: {
    icon: CreditCard,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  production: {
    icon: Package,
    color: "text-warning",
    bgColor: "bg-warning/10"
  },
  shipped: {
    icon: Truck,
    color: "text-info",
    bgColor: INFO_BACKGROUND
  },
  delivered: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10"
  },
  cancelled: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
  comment: {
    icon: MessageSquare,
    color: "text-muted-foreground",
    bgColor: "bg-muted"
  }
};

export function StatusTimeline({ events, className, showConnector = true }: StatusTimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {events.map((event, index) => {
        const config = statusConfig[event.status];
        const Icon = config.icon;
        const isLast = index === events.length - 1;
        const timestamp = typeof event.timestamp === "string" 
          ? new Date(event.timestamp) 
          : event.timestamp;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex gap-4"
          >
            {/* Connector line */}
            {showConnector && !isLast && (
              <div 
                className="absolute left-5 top-10 w-0.5 h-[calc(100%-0.5rem)] bg-border"
                aria-hidden="true"
              />
            )}

            {/* Icon */}
            <div className={cn(
              "relative z-10 flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0",
              config.bgColor
            )}>
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-foreground">
                    {event.title}
                  </h4>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {event.description}
                    </p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(timestamp, "dd MMM, HH:mm", { locale: ptBR })}
                </time>
              </div>

              {/* User */}
              {event.user && (
                <p className="text-xs text-muted-foreground mt-1">
                  por {event.user}
                </p>
              )}

              {/* Metadata */}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-muted/50 text-xs">
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Compact horizontal status bar
interface StatusBarStep {
  status: TimelineStatus;
  label: string;
  completed: boolean;
  current?: boolean;
}

interface HorizontalStatusBarProps {
  steps: StatusBarStep[];
  className?: string;
}

export function HorizontalStatusBar({ steps, className }: HorizontalStatusBarProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const Icon = config.icon;
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex items-center">
            {/* Step */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full",
                  step.completed ? config.bgColor : "bg-muted",
                  step.current && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {step.completed ? (
                  <Icon className={cn("w-4 h-4", config.color)} />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </motion.div>
              <span className={cn(
                "text-xs mt-1 whitespace-nowrap",
                step.completed || step.current ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {!isLast && (
              <div className={cn(
                "w-12 h-0.5 mx-1",
                step.completed ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Current status indicator
interface CurrentStatusProps {
  status: TimelineStatus;
  label: string;
  since?: Date | string;
  className?: string;
}

export function CurrentStatus({ status, label, since, className }: CurrentStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sinceDate = since ? (typeof since === "string" ? new Date(since) : since) : null;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg",
      config.bgColor,
      className
    )}>
      <div className="relative">
        <Icon className={cn("w-5 h-5", config.color)} />
        {status !== "delivered" && status !== "cancelled" && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
        )}
      </div>
      <div>
        <p className={cn("font-medium text-sm", config.color)}>
          {label}
        </p>
        {sinceDate && (
          <p className="text-xs text-muted-foreground">
            desde {format(sinceDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
      </div>
    </div>
  );
}
