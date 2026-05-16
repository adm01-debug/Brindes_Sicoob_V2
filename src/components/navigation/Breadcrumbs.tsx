import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { canNavigateTo, isDevOnlyPath } from "@/lib/navigation/restricted-routes";

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

  // Generate breadcrumbs from route if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || generateBreadcrumbs(location.pathname, { isDev, isAdmin });

  if (breadcrumbItems.length === 0) return null;
  
  return (
    <nav 
      aria-label="Navegação de migalhas de pão" 
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <>
            <li>
              <Link
                to="/"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Página inicial"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            {breadcrumbItems.length > 0 && (
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </li>
            )}
          </>
        )}
        
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1.5">
              {isLast ? (
                <span 
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <>
                  <Link
                    to={item.href || "#"}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                  <ChevronRight 
                    className="h-4 w-4 text-muted-foreground/50" 
                    aria-hidden="true" 
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function generateBreadcrumbs(
  pathname: string,
  roles: { isDev: boolean; isAdmin: boolean } = { isDev: false, isAdmin: false },
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return [];

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip UUIDs or numeric IDs in breadcrumbs display
    const isId = /^[0-9a-f-]{36}$/.test(segment) || /^\d+$/.test(segment);

    if (isId) {
      breadcrumbs.push({
        label: `#${segment.slice(0, 8)}...`,
        href: i < segments.length - 1 ? currentPath : undefined,
      });
    } else {
      // Esconde segmentos técnicos para não-dev
      if (!roles.isDev && isDevOnlyPath(currentPath)) {
        continue;
      }
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      const navigable = canNavigateTo(currentPath, roles);
      const isLast = i >= segments.length - 1;
      breadcrumbs.push({
        label,
        href: !isLast && navigable ? currentPath : undefined,
      });
    }
  }

  return breadcrumbs;
}

// Hook for custom breadcrumbs
export function useBreadcrumbs() {
  const location = useLocation();
  const { isDev, isAdmin } = useAuth();
  return generateBreadcrumbs(location.pathname, { isDev, isAdmin });
}
