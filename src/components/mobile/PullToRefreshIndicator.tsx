import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing, 
  threshold = 80 
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const percentage = Math.min(100, (pullDistance / threshold) * 100);
  const rotation = (pullDistance / threshold) * 180;

  return (
    <div 
      className="fixed top-0 left-0 w-full flex justify-center z-[100] pointer-events-none transition-all duration-200"
      style={{ 
        transform: `translateY(${Math.min(pullDistance, threshold + 20)}px)`,
        opacity: pullDistance > 10 || isRefreshing ? 1 : 0
      }}
    >
      <div className={cn(
        "bg-background shadow-lg border border-border/50 rounded-full p-2 flex items-center justify-center transition-colors",
        percentage >= 100 ? "text-primary border-primary/30" : "text-muted-foreground"
      )}>
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ArrowDown 
            className="h-5 w-5 transition-transform" 
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
