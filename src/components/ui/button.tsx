import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Haptics } from "@/utils/haptics";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation active:scale-[0.98] focus-within:ring-2",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-foreground hover:bg-brand/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-brand underline-offset-4 hover:underline",
        orange: "bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 shadow-md hover:shadow-glow-warning",
        sicoob: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary-active shadow-sm",
        sicoobSecondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80 shadow-sm",
        sicoobAccent: "bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 shadow-sm",
        // Nova variante premium com gradiente brand-teal
        premium: "bg-gradient-to-r from-brand via-brand to-brand-hover text-brand-foreground shadow-lg hover:shadow-xl hover:shadow-brand/25 active:shadow-md",
        // Variante success para ações de confirmação
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-9 rounded-md px-3 min-h-[36px]",
        lg: "h-12 rounded-md px-8 min-h-[48px] text-base",
        xl: "h-14 rounded-lg px-10 min-h-[56px] text-lg font-semibold",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant !== "ghost" && variant !== "link") {
        Haptics.impactLight();
      }
      onClick?.(e);
    };

    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
