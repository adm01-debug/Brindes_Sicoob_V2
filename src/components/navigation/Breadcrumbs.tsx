import { ChevronRight, Home, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { canNavigateTo, isDevOnlyPath } from "@/lib/navigation/restricted-routes";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";
import { Button } from "@/components/ui/button";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// Auto-generate breadcrumbs from route if items not provided
const routeLabels: Record<string, string> = {
  "": "Início",
  "produtos": "Produtos",
  "produto": "Produto",
  "clientes": "Clientes",
  "cliente": "Cliente",
  "orcamentos": "Orçamentos",
  "orcamento": "Orçamento",
  "pedidos": "Pedidos",
  "pedido": "Pedido",
  "simulador": "Simulador",
  "mockup-generator": "Mockups",
  "magic-up": "Magic Up",
  "filtros": "Filtros",
  "favoritos": "Favoritos",
  "comparar": "Comparar",
  "colecoes": "Coleções",
  "bi": "Dashboard BI",
  "tendencias": "Tendências",
  "notificacoes": "Notificações",
  "gestor": "Gestão",
  "compras": "Compras",
  "aprovacoes": "Aprovações",
  "carrinhos": "Carrinhos",
  
  "perfil": "Meu Perfil",
  "seguranca": "Segurança",
  "admin": "Administração",
  "personalizacao": "Personalização",
  "permissoes": "Permissões",
  "roles": "Papéis",
  "role-permissoes": "Permissões de Papéis",
  "rate-limit": "Rate Limit",
  "bitrix-sync": "Sincronização Bitrix",
  "status": "Status do Sistema",
  "novo": "Novo",
  "editar": "Editar",
  "dashboard": "Dashboard",
  "kanban": "Kanban",
  "lista": "Lista",
  "templates": "Templates",
};

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const location = useLocation();
  const { isDev, isAdmin } = useAuth();
  const { goBack } = useSmartNavigation();

  // Generate breadcrumbs from route if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || generateBreadcrumbs(location.pathname, { isDev, isAdmin });

  if (breadcrumbItems.length === 0) return null;
  
  const isHome = location.pathname === "/";
  return <nav aria-label="Navegação de migalhas de pão" className={cn("flex items-center text-sm", className)}>{!isHome && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full mr-2 lg:hidden" onClick={() => goBack()} aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>}<BreadcrumbList items={breadcrumbItems} showHome={showHome} /></nav>;
}

function BreadcrumbList({ items, showHome }: { items: BreadcrumbItem[]; showHome: boolean }) {
  return <ol className="flex items-center gap-1.5 flex-wrap">{showHome && <><li><Link to="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Página inicial"><Home className="h-4 w-4" /></Link></li>{items.length > 0 && <li aria-hidden="true"><ChevronRight className="h-4 w-4 text-muted-foreground/50" /></li>}</>}{items.map((item, index) => <BreadcrumbEntry key={`${item.href ?? "current"}-${item.label}-${index}`} item={item} isLast={index === items.length - 1} />)}</ol>;
}

function BreadcrumbEntry({ item, isLast }: { item: BreadcrumbItem; isLast: boolean }) {
  if (isLast) return <li className="flex items-center gap-1.5"><span className="font-medium text-foreground max-w-[150px] sm:max-w-none truncate" aria-current="page">{item.label}</span></li>;
  return <li className="flex items-center gap-1.5"><Link to={item.href || "#"} className="text-muted-foreground hover:text-foreground transition-colors max-w-[120px] sm:max-w-none truncate">{item.label}</Link><ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" /></li>;
}

function labelForSegment(segment: string) {
  return routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

interface BreadcrumbContext {
  segment: string;
  currentPath: string;
  index: number;
  total: number;
  roles: { isDev: boolean; isAdmin: boolean };
}

function createBreadcrumb({ segment, currentPath, index, total, roles }: BreadcrumbContext): BreadcrumbItem | null {
  const isLast = index >= total - 1;
  if (/^[0-9a-f-]{36}$/.test(segment) || /^\d+$/.test(segment)) {
    return { label: `#${segment.slice(0, 8)}...`, href: isLast ? undefined : currentPath };
  }
  if (!roles.isDev && isDevOnlyPath(currentPath)) return null;
  return { label: labelForSegment(segment), href: !isLast && canNavigateTo(currentPath, roles) ? currentPath : undefined };
}

function generateBreadcrumbs(
  pathname: string,
  roles: { isDev: boolean; isAdmin: boolean } = { isDev: false, isAdmin: false },
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return [];

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  for (const [index, segment] of segments.entries()) {
    currentPath += `/${segment}`;
    const breadcrumb = createBreadcrumb({ segment, currentPath, index, total: segments.length, roles });
    if (breadcrumb) breadcrumbs.push(breadcrumb);
  }

  return breadcrumbs;
}

// Hook for custom breadcrumbs
export function useBreadcrumbs() {
  const location = useLocation();
  const { isDev, isAdmin } = useAuth();
  return generateBreadcrumbs(location.pathname, { isDev, isAdmin });
}
