import { forwardRef } from "react";
import { Gift } from "lucide-react";

interface SidebarBrandHeaderProps {
  isCollapsed: boolean;
}

export const SidebarBrandHeader = forwardRef<HTMLDivElement, SidebarBrandHeaderProps>(
  ({ isCollapsed }, ref) => {
    if (isCollapsed) {
      return (
        <div ref={ref} className="flex items-center justify-center px-2 py-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <span className="text-[10px] font-bold text-primary-foreground tracking-tight">SICOOB</span>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-4 py-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-md">
            <span className="text-[8px] font-bold text-primary-foreground">SICOOB</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              Portal Sicoob
            </span>
            <span className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">
              Portal de Compras
            </span>
          </div>
        </div>
      </div>
    );
  }
);

SidebarBrandHeader.displayName = "SidebarBrandHeader";
