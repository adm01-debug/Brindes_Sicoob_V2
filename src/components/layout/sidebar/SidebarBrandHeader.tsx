import { forwardRef } from "react";


interface SidebarBrandHeaderProps {
  isCollapsed: boolean;
}

export const SidebarBrandHeader = forwardRef<HTMLDivElement, SidebarBrandHeaderProps>(
  ({ isCollapsed }, ref) => {
    if (isCollapsed) {
      return (
        <div ref={ref} className="flex items-center justify-center px-2 py-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#003641] flex items-center justify-center shadow-sm overflow-hidden p-1.5">
            <img 
              src="/brand/sicoob-logo.png"
              alt="Sicoob" 
              className="h-full w-full object-cover object-left"
            />
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-4 py-4 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#003641] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1.5">
            <img 
              src="/brand/sicoob-logo.png"
              alt="Sicoob" 
              className="h-full w-full object-cover object-left"
            />
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
