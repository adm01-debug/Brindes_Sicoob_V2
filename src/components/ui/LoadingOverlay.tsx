import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  blur?: boolean;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg";
  variant?: "default" | "card" | "inline";
}

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

function InlineOverlay({ visible, message, spinnerSize, className }: { visible: boolean; message?: string; spinnerSize: keyof typeof spinnerSizes; className?: string }) {
  if (!visible) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className={cn("animate-spin", spinnerSizes[spinnerSize])} />
      {message && <span className="text-sm">{message}</span>}
    </motion.div>
  );
}

function OverlayMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-sm text-muted-foreground font-medium">
      {message}
    </motion.p>
  );
}

function BlockingOverlay({ visible, message, spinnerSize, className, overlayClass, blur }: {
  visible: boolean;
  message?: string;
  spinnerSize: keyof typeof spinnerSizes;
  className?: string;
  overlayClass: string;
  blur: boolean;
}) {
  if (!visible) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className={cn(overlayClass, blur && "backdrop-blur-sm", "bg-background/80 flex items-center justify-center", className)}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ delay: 0.1, duration: 0.2 }} className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className={cn("absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse", spinnerSizes[spinnerSize])} />
          <Loader2 className={cn("relative animate-spin text-primary", spinnerSizes[spinnerSize])} />
        </div>
        <OverlayMessage message={message} />
      </motion.div>
    </motion.div>
  );
}

/**
 * LoadingOverlay - Overlay de carregamento com diferentes variantes
 * 
 * @example
 * // Full screen loading
 * <LoadingOverlay isLoading={isLoading} fullScreen message="Carregando..." />
 * 
 * // Card overlay
 * <div className="relative">
 *   <CardContent />
 *   <LoadingOverlay isLoading={isSaving} variant="card" />
 * </div>
 */
export function LoadingOverlay({
  isLoading,
  message,
  fullScreen = false,
  blur = true,
  className,
  spinnerSize = "md",
  variant = "default",
}: LoadingOverlayProps) {
  const overlayVariants = {
    card: "absolute inset-0 rounded-lg z-10",
    inline: "inline-flex items-center gap-2",
    default: fullScreen ? "fixed inset-0 z-50" : "absolute inset-0 z-10",
  };

  if (variant === "inline") {
    return (
      <AnimatePresence>
        <InlineOverlay visible={isLoading} message={message} spinnerSize={spinnerSize} className={className} />
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <BlockingOverlay visible={isLoading} message={message} spinnerSize={spinnerSize} className={className} overlayClass={overlayVariants[variant]} blur={blur} />
    </AnimatePresence>
  );
}

/**
 * InlineLoader - Loader inline para botões e textos
 */
export function InlineLoader({ 
  className, 
  size = "sm" 
}: { 
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <Loader2 
      className={cn(
        "animate-spin",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        className
      )} 
    />
  );
}

/**
 * SkeletonPulse - Skeleton simples com animação de pulse
 */
export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )} 
    />
  );
}

export default LoadingOverlay;
