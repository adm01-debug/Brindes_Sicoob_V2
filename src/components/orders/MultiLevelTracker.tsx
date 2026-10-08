import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'failed';
}

interface MultiLevelTrackerProps {
  steps: Step[];
  className?: string;
}

export function MultiLevelTracker({ steps, className }: MultiLevelTrackerProps) {
  return (
    <div className={cn("relative flex flex-col gap-4", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div 
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center border-2 z-10 bg-background",
                step.status === 'completed' && "bg-primary border-primary text-primary-foreground",
                step.status === 'current' && "border-primary text-primary",
                step.status === 'pending' && "border-muted text-muted-foreground",
                step.status === 'failed' && "border-destructive text-destructive"
              )}
            >
              {step.status === 'completed' ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="text-[10px] font-bold">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "w-0.5 flex-1 -my-1",
                  step.status === 'completed' ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
          <div className="pb-4">
            <h4 className={cn(
              "text-sm font-semibold",
              step.status === 'pending' && "text-muted-foreground"
            )}>
              {step.label}
            </h4>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
