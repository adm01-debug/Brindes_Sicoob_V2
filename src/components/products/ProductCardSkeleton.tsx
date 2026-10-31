import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProductCardSkeletonProps {
  /** Variant of skeleton - matches card content structure */
  variant?: "default" | "compact" | "detailed";
  /** Whether to show the shimmer animation */
  animate?: boolean;
}

function CardImageSkeleton({ detailed }: { detailed: boolean }) {
  return (
    <div className="relative aspect-[4/5] bg-gradient-to-br from-secondary/50 to-muted/30">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,hsl(var(--background)/0.4),transparent)] bg-[length:200%_100%] animate-shimmer" /><div className="absolute top-3 left-3 flex flex-col gap-1.5"><Skeleton className="h-5 w-16 rounded-full" /></div>
      {detailed && <div className="absolute top-3 right-3 flex flex-col gap-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-11 w-11 rounded-full" />)}</div>}
      <div className="absolute bottom-3 left-3 right-3"><div className="flex items-center gap-1.5 bg-muted/40 rounded-full px-3 py-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-5 w-5 rounded-full" />)}<Skeleton className="h-4 w-6 ml-1" /></div></div>
    </div>
  );
}

function CardContentSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-16 rounded-full" /></div>
      <div className="space-y-1.5"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div>
      <div className="flex items-end justify-between pt-1"><div className="space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-24" /></div><div className="flex flex-col items-end gap-1"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-3 w-12" /></div></div>
      {!compact && <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>}
    </div>
  );
}

export function ProductCardSkeleton({ variant = "default", animate = true }: ProductCardSkeletonProps) {
  const baseClass = animate ? "animate-pulse" : "";

  return (
    <div className={cn("rounded-2xl bg-card border border-border/50 overflow-hidden", baseClass)}>
      <CardImageSkeleton detailed={variant === "detailed"} />
      <CardContentSkeleton compact={variant === "compact"} />
    </div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
  variant?: "default" | "compact" | "detailed";
  /** Staggered animation delay */
  stagger?: boolean;
}

export function ProductGridSkeleton({ 
  count = 8, 
  variant = "default",
  stagger = true 
}: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          style={stagger ? { animationDelay: `${i * 75}ms` } : undefined}
          className={stagger ? "animate-fade-in opacity-0" : ""}
        >
          <ProductCardSkeleton variant={variant} />
        </div>
      ))}
    </div>
  );
}

// Inline skeleton for loading states in smaller contexts
export function ProductCardInlineSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
      <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}
