import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Step {
  id: string | number;
  label: string;
}

interface FlowProgressBarProps {
  steps: Step[];
  currentStepIndex: number;
  className?: string;
  variant?: "dots" | "lines" | "numbers";
}

export function FlowProgressBar({
  steps,
  currentStepIndex,
  className,
  variant = "lines",
}: FlowProgressBarProps) {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className={cn("w-full space-y-3 py-4", className)}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
        <span>Etapa {currentStepIndex + 1} de {steps.length}</span>
        <span>{steps[currentStepIndex].label}</span>
      </div>

      <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "circOut" }}
        />
      </div>

      <div className="flex justify-between gap-2 px-1">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isCompleted = idx < currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors duration-300",
                isActive ? "bg-primary/40" : isCompleted ? "bg-primary/20" : "bg-muted-foreground/10"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
