import type { ComponentProps } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme, actualTheme } = useTheme();
  const sonnerTheme = theme === "auto" ? "system" : actualTheme;

  return (
    <div role="region" aria-live="polite" aria-label="Notificações">
      <Sonner
        theme={sonnerTheme as ToasterProps["theme"]}
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground min-h-[44px]",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground min-h-[44px]",
          },
        }}
        {...props}
      />
    </div>
  );
};

export { Toaster, toast };
