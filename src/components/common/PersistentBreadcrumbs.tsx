import { forwardRef, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { canNavigateTo, isDevOnlyPath } from "@/lib/navigation/restricted-routes";
import { BackButton } from "./BackButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: typeof Home;
}

const routeLabels: Record<string, string> = {
  "/": "Início",
  "/produtos": "Produtos",
  "/produto": "Detalhe do Produto",
  "/filtros": "Super Filtro",
  "/novidades": "Novidades",
  "/colecoes": "Coleções",
  "/orcamentos": "Orçamentos",
  "/pedidos": "Pedidos",
  "/simulador": "Simulador",
  "/simulador-precos": "Preços por Tiragem",
  "/mockup-generator": "Gerador de Mockups",
  "/magic-up": "Magic Up",
  "/favoritos": "Favoritos",
  "/comparar": "Comparar",
  "/configuracoes": "Configurações",
  "/admin": "Administração",
  "/seguranca": "Segurança",
  "/estoque": "Dashboard de Estoque",
  "/admin/temas": "Skins",
  "/carrinhos": "Carrinhos",
  "/gestor/compras": "Gestor de Compras",
  "/gestor/aprovacoes": "Aprovações",
};

interface PersistentBreadcrumbsProps {
  className?: string;
  showHome?: boolean;
  showBackButton?: boolean;
  customItems?: BreadcrumbItem[];
}

export const PersistentBreadcrumbs = forwardRef<HTMLElement, PersistentBreadcrumbsProps>(function PersistentBreadcrumbs({ 
  className, 
  showHome = true,
  showBackButton = false,
  customItems 
}, ref) {
  const location = useLocation();
  const { isDev, isAdmin } = useAuth();
  
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (customItems) return customItems;
    
    const items: BreadcrumbItem[] = [];
    const pathParts = location.pathname.split("/").filter(Boolean);
    
    if (location.pathname === "/" && showHome) {
      return [{ label: "Catálogo de Produtos", icon: Home }];
    }
    
    if (showHome && location.pathname !== "/") {
      items.push({ label: "Início", href: "/", icon: Home });
    }
    
    let currentPath = "";
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
      const isNumericId = /^\d+$/.test(part);
      
      if (isUuid || isNumericId) {
        const prevPart = pathParts[index - 1];
        if (prevPart === "produto" || prevPart === "produtos" || prevPart === "orcamentos") {
          return;
        }
        items.push({ label: `#${part.slice(0, 8)}...` });
      } else {
        if (!isDev && isDevOnlyPath(currentPath)) {
          return;
        }

        const label = routeLabels[currentPath] || part.charAt(0).toUpperCase() + part.slice(1);
        const nextPart = pathParts[index + 1];
        const nextIsSkippedId = nextPart && (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextPart) ||
          /^\d+$/.test(nextPart)
        ) && (part === "produto" || part === "produtos" || part === "orcamentos");

        const navigable = canNavigateTo(currentPath, { isDev, isAdmin });
        const isLastVisible = index >= pathParts.length - 1 || nextIsSkippedId;
        items.push(isLastVisible || !navigable ? { label } : { label, href: currentPath });
      }
    });
    
    return items;
  }, [location.pathname, showHome, customItems, isDev, isAdmin]);

  if (breadcrumbs.length === 0) return null;

  const isNotHome = location.pathname !== "/";
  
  return (
    <nav 
      ref={ref}
      data-testid="breadcrumb"
      aria-label="Breadcrumb" 
      className={cn(
        "flex items-center text-sm overflow-hidden",
        "max-w-full gap-3 py-1",
        className
      )}
    >
      {showBackButton && isNotHome && (
        <div className="flex-shrink-0 border-r border-border/30 pr-3 mr-1">
          <BackButton 
            useChevron 
            showLabel={false} 
            className="h-8 w-8 rounded-full bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all duration-200 border-none shadow-none" 
            variant="ghost" 
          />
        </div>
      )}
      
      <ol className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
        {breadcrumbs.length > 3 ? (
          <>
            {/* First Item */}
            <BreadcrumbItem item={breadcrumbs[0]!} index={0} />
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
            
            {/* Dropdown for middle items */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-6 w-8 flex items-center justify-center hover:bg-muted/50 rounded-md transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {breadcrumbs.slice(1, -1).map((item, i) => (
                  <DropdownMenuItem key={i} asChild>
                    <Link to={item.href || "#"} className="flex items-center gap-2">
                      {item.icon && <item.icon className="h-3.5 w-3.5" />}
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
            
            {/* Last Item */}
            <BreadcrumbItem 
              item={breadcrumbs[breadcrumbs.length - 1]!}
              index={breadcrumbs.length - 1} 
              isLast 
            />
          </>
        ) : (
          breadcrumbs.map((item, index) => (
            <li key={`${item.href ?? item.label}-${index}`} className="flex items-center gap-1.5 flex-shrink-0">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
              )}
              <BreadcrumbItem item={item} index={index} isLast={index === breadcrumbs.length - 1} />
            </li>
          ))
        )}
      </ol>
    </nav>
  );
});

function BreadcrumbItem({ item, index, isLast }: { item: BreadcrumbItem, index: number, isLast?: boolean }) {
  const Icon = item.icon;
  
  if (item.href && !isLast) {
    return (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200",
          "hover:bg-muted/50 px-2 py-0.5 rounded-md -mx-1"
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="truncate max-w-[120px] sm:max-w-[200px]">{item.label}</span>
      </Link>
    );
  }

  return (
    <span 
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-md -mx-1",
        isLast ? "text-foreground font-semibold" : "text-muted-foreground"
      )}
      aria-current={isLast ? "page" : undefined}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span className="truncate max-w-[120px] sm:max-w-[200px]">{item.label}</span>
    </span>
  );
}
