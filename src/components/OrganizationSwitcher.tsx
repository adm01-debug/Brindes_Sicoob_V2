import React from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizationSwitcherProps {
  isCollapsed?: boolean;
}

export function OrganizationSwitcher({ isCollapsed = false }: OrganizationSwitcherProps) {
  const { organizations, currentOrg, switchOrganization, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className={cn("px-4 mb-2", isCollapsed && "px-2")}>
        <div className="h-10 w-full animate-pulse rounded-lg bg-sidebar-accent/50" />
      </div>
    );
  }

  // Se o usuário não tem organizações, não mostra o switcher
  if (organizations.length === 0) return null;

  return (
    <div className={cn("px-4 mb-4", isCollapsed && "px-2")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2 px-2 hover:bg-sidebar-accent/50 transition-colors",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? currentOrg?.name : undefined}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
              {currentOrg?.logo_url ? (
                <img
                  src={currentOrg.logo_url}
                  alt={currentOrg.name}
                  className="h-4 w-4 rounded-sm object-cover"
                />
              ) : (
                <Building className="h-4 w-4" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="flex-1 truncate text-left text-xs font-medium text-sidebar-foreground">
                  {currentOrg?.name || "Selecionar Org"}
                </span>
                <ChevronsUpDown className="h-3 w-3 shrink-0 text-sidebar-foreground/30" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side={isCollapsed ? "right" : "bottom"}
          className="w-56 bg-sidebar border-sidebar-border"
        >
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
            Minhas Organizações
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-sidebar-border/50" />
          <div className="max-h-[300px] overflow-y-auto">
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrganization(org.id)}
                className="flex items-center gap-2 cursor-pointer focus:bg-sidebar-accent"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                  {org.name.substring(0, 1)}
                </div>
                <span className={cn(
                  "flex-1 truncate text-xs",
                  currentOrg?.id === org.id ? "font-bold text-primary" : "text-sidebar-foreground"
                )}>
                  {org.name}
                </span>
                {currentOrg?.id === org.id && (
                  <Check className="h-3 w-3 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator className="bg-sidebar-border/50" />
          <DropdownMenuItem className="flex items-center gap-2 cursor-pointer focus:bg-sidebar-accent text-primary">
            <Plus className="h-3 w-3" />
            <span className="text-xs font-medium">Nova Organização</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
