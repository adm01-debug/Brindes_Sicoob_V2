import { forwardRef, useMemo } from "react";
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

interface BreadcrumbItemData {
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
  "/gestor/convites": "Convites institucionais",
};

interface PersistentBreadcrumbsProps {
  className?: string;
  showHome?: boolean;
  showBackButton?: boolean;
  customItems?: BreadcrumbItemData[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRouteId(value: string | undefined) {
  return value !== undefined && (UUID_PATTERN.test(value) || /^\d+$/.test(value));
}

function hidesFollowingId(part: string, nextPart: string | undefined) {
  return isRouteId(nextPart) && ["produto", "produtos", "orcamentos"].includes(part);
}

function canShowBreadcrumb(path: string, isDev: boolean) {
  return isDev || !isDevOnlyPath(path);
}

function breadcrumbForPart(parts: string[], index: number, currentPath: string, permissions: { isDev: boolean; isAdmin: boolean }): BreadcrumbItemData | null {
  const part = parts[index];
  if (!part) return null;
  if (isRouteId(part)) {
    const previousPart = parts[index - 1];
    if (["produto", "produtos", "orcamentos"].includes(previousPart ?? "")) return null;
    return { label: `#${part.slice(0, 8)}...` };
  }
  if (!canShowBreadcrumb(currentPath, permissions.isDev)) return null;
  const label = routeLabels[currentPath] ?? part.charAt(0).toUpperCase() + part.slice(1);
  const isLast = index >= parts.length - 1 || hidesFollowingId(part, parts[index + 1]);
  const navigable = canNavigateTo(currentPath, permissions);
  return isLast || !navigable ? { label } : { label, href: currentPath };
}

function buildBreadcrumbs(pathname: string, showHome: boolean, customItems: BreadcrumbItemData[] | undefined, permissions: { isDev: boolean; isAdmin: boolean }) {
  if (customItems) return customItems;
  if (pathname === "/") return showHome ? [{ label: "Catálogo de Produtos", icon: Home }] : [];
  const items: BreadcrumbItemData[] = showHome ? [{ label: "Início", href: "/", icon: Home }] : [];
  const parts = pathname.split("/").filter(Boolean);
  parts.forEach((_, index) => {
    const currentPath = `/${parts.slice(0, index + 1).join("/")}`;
    const item = breadcrumbForPart(parts, index, currentPath, permissions);
    if (item) items.push(item);
  });
  return items;
}

export const PersistentBreadcrumbs = forwardRef<HTMLElement, PersistentBreadcrumbsProps>(function PersistentBreadcrumbs({ 
  className, 
  showHome = true,
  showBackButton = false,
  customItems 
}, ref) {
  const location = useLocation();
  const { isDev, isAdmin } = useAuth();
  
  const breadcrumbs = useMemo(() => buildBreadcrumbs(location.pathname, showHome, customItems, { isDev, isAdmin }), [location.pathname, showHome, customItems, isDev, isAdmin]);

  if (breadcrumbs.length === 0) return null;

  const isNotHome = location.pathname !== "/";
  const firstBreadcrumb = breadcrumbs[0];
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  
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
        {breadcrumbs.length > 3 && firstBreadcrumb && lastBreadcrumb ? (
          <>
            {/* First Item */}
            <BreadcrumbItem item={firstBreadcrumb} index={0} />
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
            
            {/* Dropdown for middle items */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Mostrar itens intermediários" className="h-6 w-8 flex items-center justify-center hover:bg-muted/50 rounded-md transition-colors">
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
              item={lastBreadcrumb}
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

function BreadcrumbItem({ item, isLast }: { item: BreadcrumbItemData, index: number, isLast?: boolean }) {
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
