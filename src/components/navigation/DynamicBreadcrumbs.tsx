import { type ReactNode, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { canNavigateTo, isDevOnlyPath } from "@/lib/navigation/restricted-routes";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface DynamicBreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  className?: string;
}

// Route label mappings
const routeLabels: Record<string, string> = {
  "": "Início",
  "dashboard": "Dashboard",
  "catalogo": "Catálogo",
  "produto": "Detalhe do Produto",
  "produtos": "Produtos",
  "orcamentos": "Orçamentos",
  "novo": "Novo",
  "editar": "Editar",
  "detalhes": "Detalhes",
  "pedidos": "Pedidos",
  "clientes": "Clientes",
  "empresas": "Empresas",
  "contatos": "Contatos",
  "simulador": "Simulador",
  "mockup": "Mockup",
  "personalizacao": "Personalização",
  "colecoes": "Coleções",
  "favoritos": "Favoritos",
  "carrinhos": "Carrinhos",
  "configuracoes": "Configurações",
  "perfil": "Perfil",
  "seguranca": "Segurança",
  "relatorios": "Relatórios",
  "analytics": "Analytics",
  
  "admin": "Administração",
  "usuarios": "Usuários",
  "permissoes": "Permissões",
  "tecnicas": "Técnicas",
  "historico": "Histórico",
  "templates": "Templates",
  "aprovar": "Aprovar",
  "login": "Login",
  "registro": "Registro",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRouteId(segment: string | undefined) {
  return segment !== undefined && (UUID_PATTERN.test(segment) || /^\d+$/.test(segment));
}

function dynamicSegmentLabel(segment: string, previousSegment: string | undefined) {
  if (previousSegment === "orcamentos") return `#${segment.slice(0, 8)}...`;
  if (previousSegment === "pedidos") return "Pedido";
  if (["clientes", "empresas"].includes(previousSegment ?? "")) return "Cliente";
  return "Detalhes";
}

function routeIdBreadcrumb(segment: string, previousSegment: string | undefined, currentPath: string): BreadcrumbItem | null {
  if (["produto", "produtos"].includes(previousSegment ?? "")) return null;
  return { label: dynamicSegmentLabel(segment, previousSegment), href: currentPath };
}

function namedBreadcrumb(
  segments: string[],
  index: number,
  currentPath: string,
  permissions: { isDev: boolean; isAdmin: boolean },
): BreadcrumbItem | null {
  const segment = segments[index];
  if (!segment || (!permissions.isDev && isDevOnlyPath(currentPath))) return null;
  const label = routeLabels[segment] ?? `${segment.charAt(0).toUpperCase()}${segment.slice(1).replace(/-/g, " ")}`;
  const hidesNextId = isRouteId(segments[index + 1]) && ["produto", "produtos"].includes(segment);
  const isLastVisible = index >= segments.length - 1 || hidesNextId;
  const navigable = canNavigateTo(currentPath, permissions);
  return { label, href: isLastVisible || !navigable ? undefined : currentPath };
}

function breadcrumbForSegment(
  segments: string[],
  index: number,
  currentPath: string,
  permissions: { isDev: boolean; isAdmin: boolean },
): BreadcrumbItem | null {
  const segment = segments[index];
  if (!segment) return null;
  const previousSegment = segments[index - 1];
  if (isRouteId(segment)) return routeIdBreadcrumb(segment, previousSegment, currentPath);
  return namedBreadcrumb(segments, index, currentPath, permissions);
}

function buildBreadcrumbs(pathname: string, permissions: { isDev: boolean; isAdmin: boolean }) {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: "Início", href: "/", icon: <Home className="h-4 w-4" /> }];
  segments.forEach((_, index) => {
    const currentPath = `/${segments.slice(0, index + 1).join("/")}`;
    const item = breadcrumbForSegment(segments, index, currentPath, permissions);
    if (item) items.push(item);
  });
  return items;
}

export function DynamicBreadcrumbs({ customItems, className }: DynamicBreadcrumbsProps) {
  const location = useLocation();
  const { isDev, isAdmin } = useAuth();

  const breadcrumbs = useMemo(() => {
    if (customItems) return customItems;
    return buildBreadcrumbs(location.pathname, { isDev, isAdmin });
  }, [location.pathname, customItems, isDev, isAdmin]);
  
  // Don't show breadcrumbs on home or login pages
  if (location.pathname === "/" || location.pathname === "/login") {
    return null;
  }
  
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1">
        {breadcrumbs.map((item, index) => (
          <motion.li 
            key={index}
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            
            {item.href ? (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted/50 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50"
                )}
              >
                {item.icon}
                <span className="max-w-[150px] truncate">{item.label}</span>
              </Link>
            ) : (
              <span 
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1",
                  "text-foreground font-medium"
                )}
                aria-current="page"
              >
                {item.icon}
                <span className="max-w-[200px] truncate">{item.label}</span>
              </span>
            )}
          </motion.li>
        ))}
      </ol>
    </nav>
  );
}

// Compact version for mobile
export function CompactBreadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  if (pathSegments.length <= 1) return null;
  
  const parentPath = "/" + pathSegments.slice(0, -1).join("/");
  const parentSegment = pathSegments[pathSegments.length - 2];
  if (!parentSegment) return null;
  const parentLabel = routeLabels[parentSegment] || parentSegment;
  
  return (
    <Link
      to={parentPath}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground",
        "hover:text-foreground transition-colors",
        className
      )}
    >
      <ChevronRight className="h-4 w-4 rotate-180" />
      <span>Voltar para {parentLabel}</span>
    </Link>
  );
}
