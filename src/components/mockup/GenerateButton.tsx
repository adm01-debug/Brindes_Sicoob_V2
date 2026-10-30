/**
 * GenerateButton — CTA dedicado para disparar a geração de mockup com IA.
 * Apresenta estados de loading, disabled e pulse de destaque quando pronto.
 */
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  hasAllRequirements?: boolean;
  label?: string;
  className?: string;
}

function ReadyPulse() {
  return (
    <motion.span
      aria-hidden
      className="absolute inset-0 rounded-md bg-primary/40 blur-md"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  );
}

function ButtonContent({ isGenerating, label }: Pick<GenerateButtonProps, "isGenerating" | "label">) {
  if (isGenerating) {
    return (
      <>
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Gerando…
      </>
    );
  }

  return (
    <>
      <Sparkles className="h-5 w-5 mr-2" />
      {label}
    </>
  );
}

function readyMotion(isReady: boolean, scale: number) {
  return isReady ? { scale } : undefined;
}

export function GenerateButton({
  onClick,
  isGenerating,
  disabled = false,
  hasAllRequirements = true,
  label = "Gerar Mockup com IA",
  className,
}: GenerateButtonProps) {
  const isReady = hasAllRequirements && !disabled && !isGenerating;

  return (
    <motion.div
      whileHover={readyMotion(isReady, 1.02)}
      whileTap={readyMotion(isReady, 0.98)}
      className={cn("relative", className)}
    >
      {isReady && <ReadyPulse />}
      <Button
        type="button"
        size="lg"
        onClick={onClick}
        disabled={disabled || isGenerating}
        className={cn(
          "relative w-full font-semibold",
          isReady && "bg-gradient-to-r from-primary to-primary/80 shadow-lg"
        )}
      >
        <ButtonContent isGenerating={isGenerating} label={label} />
      </Button>
    </motion.div>
  );
}
