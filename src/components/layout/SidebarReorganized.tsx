/**
 * SidebarReorganized — Hierarchical navigation system
 * Refactored for Portal Sicoob 10/10
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  Filter,
  Heart,
  GitCompare,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calculator,
  Sparkles,
  FileText,
  ShoppingCart,
  Wrench,
  Zap,
  RefreshCw,
  DollarSign,
  Plus,
  Activity,
  Gauge,
  Truck,
  Landmark,
  Palette,
  Brain,
  Workflow,
  Layers,
  SlidersHorizontal,
  Boxes,
  ImagePlus,
  BarChart3,
  Crosshair,
  Plug,
  X,
  LayoutGrid,
  Bell,
  ClipboardCheck,
  Building,
  Megaphone,
  Mail,
  Wallet,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarBrandHeader } from './sidebar/SidebarBrandHeader';
import { OrganizationSwitcher } from '@/components/navigation/OrganizationSwitcher';

import { SidebarNavGroup, type NavGroup } from './sidebar/SidebarNavGroup';
import { SidebarFooterHealth } from './sidebar/SidebarFooterHealth';
import { RestrictedRouteNotice } from './sidebar/RestrictedRouteNotice';

import { isDevOnlyPath, isAdminOnlyPath } from '@/lib/navigation/restricted-routes';
import { canAccessSicoobPath } from '@/lib/access/role-policy';
import { isNavItemActive } from '@/lib/navigation/active-match';
import type { AppRole } from '@/types/users';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const OVERFLOW_VISIBLE_CLASS = 'overflow-visible';

export const navGroups: NavGroup[] = [
  {
    id: 'sicoob-portal',
    label: 'Portal SICOOB',
    icon: Landmark,
    defaultOpen: true,
    items: [
      {
        icon: Gauge,
        label: 'Painel Gestor',
        href: '/gestor',
        allowedRoles: ['dev', 'supervisor', 'gestor_compras', 'comprador_singular'],
      },
      {
        icon: Mail,
        label: 'Convites institucionais',
        href: '/gestor/convites',
        allowedRoles: ['dev', 'supervisor', 'gestor_compras', 'comprador_singular'],
      },
      {
        icon: ShieldCheck,
        label: 'Delegações de aprovação',
        href: '/gestor/delegacoes',
        allowedRoles: ['dev', 'supervisor', 'gestor_compras', 'comprador_singular'],
      },
      { icon: Building, label: 'Painel PA', href: '/dashboard-pa' },
      { icon: Users, label: 'Minha Carteira', href: '/vendedor/dashboard' },
    ],
  },
  {
    id: 'sicoob-logistics',
    label: 'Operações',
    icon: Truck,
    defaultOpen: true,
    items: [
      { icon: Package, label: 'Pedidos', href: '/sicoob/pedidos' },
      { icon: LayoutGrid, label: 'Acompanhamento', href: '/sicoob/pedidos/kanban' },
      { icon: Truck, label: 'Logística & POD', href: '/sicoob/logistica' },
      {
        icon: Layers,
        label: 'Agregados e recebimentos',
        href: '/gestor/agregados',
        allowedRoles: [
          'dev',
          'supervisor',
          'gestor_compras',
          'comprador_singular',
          'gerente_pa',
          'comprador_pac',
        ],
      },
    ],
  },
  {
    id: 'quotes',
    label: 'Orçamentos',
    icon: FileText,
    defaultOpen: false,
    items: [
      { icon: Plus, label: 'Novo Orçamento', href: '/orcamentos/novo', shortcut: 'Alt+N' },
      {
        icon: FileText,
        label: 'Meus Orçamentos',
        href: '/meus-orcamentos',
        tourId: 'quotes',
        exact: true,
        shortcut: 'Alt+O',
      },
      {
        icon: ClipboardCheck,
        label: 'Gestão Singular',
        href: '/gestor/orcamentos',
        allowedRoles: ['dev', 'supervisor', 'gestor_compras', 'comprador_singular'],
      },
      {
        icon: ClipboardCheck,
        label: 'Aprovações',
        href: '/gestor/aprovacoes',
        allowedRoles: [
          'dev',
          'supervisor',
          'gestor_compras',
          'comprador_singular',
          'gerente_pa',
          'comprador_pac',
        ],
      },
      { icon: ShoppingCart, label: 'Carrinhos', href: '/carrinhos', shortcut: 'Alt+R' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    icon: Package,
    defaultOpen: false,
    items: [
      { icon: Package, label: 'Produtos', href: '/', tourId: 'products', shortcut: 'Alt+P' },
      { icon: SlidersHorizontal, label: 'Super Filtro', href: '/filtros', shortcut: 'Alt+F' },
      { icon: Zap, label: 'Novidades', href: '/novidades' },
      { icon: RefreshCw, label: 'Reposição', href: '/reposicao' },
      { icon: FolderOpen, label: 'Coleções', href: '/colecoes' },
      { icon: Layers, label: 'Estoque', href: '/estoque' },
      { icon: Heart, label: 'Favoritos', href: '/favoritos' },
      { icon: GitCompare, label: 'Comparar', href: '/comparar' },
    ],
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    icon: Wrench,
    defaultOpen: false,
    items: [
      { icon: ImagePlus, label: 'Mockup', href: '/mockup-generator', shortcut: 'Alt+M' },
      { icon: Sparkles, label: 'Magic Up', href: '/magic-up' },
      { icon: Crosshair, label: 'Match', href: '/match' },
      { icon: Boxes, label: 'Kit Maker', href: '/montar-kit' },
      { icon: Calculator, label: 'Simulador', href: '/simulador', shortcut: 'Alt+S' },
      { icon: BarChart3, label: 'Preços por Tiragem', href: '/simulador-precos' },
      { icon: DollarSign, label: 'Busca por Preço', href: '/busca-preco' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Insights',
    icon: Brain,
    defaultOpen: false,
    items: [
      { icon: Brain, label: 'Inteligência de Mercado', href: '/inteligencia-comercial' },
      { icon: Sparkles, label: 'Business Analytic', href: '/ferramentas/bi' },
      { icon: Activity, label: 'Tendências', href: '/tendencias' },
      { icon: BarChart3, label: 'Relatórios SICOOB', href: '/relatorios/sicoob' },
      { icon: Gauge, label: 'Analytics SICOOB', href: '/kpis/sicoob' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    adminOnly: true,
    defaultOpen: false,
    items: [
      {
        icon: Users,
        label: 'Usuários',
        href: '/admin/usuarios',
        adminOnly: true,
        children: [
          {
            icon: Users,
            label: 'Lista de usuários',
            href: '/admin/usuarios',
            adminOnly: true,
          },
          {
            icon: ClipboardCheck,
            label: 'Aprovações de desconto',
            href: '/admin/usuarios?tab=discounts',
            adminOnly: true,
          },
        ],
      },
      { icon: Landmark, label: 'Gestão SICOOB', href: '/admin/sicoob', adminOnly: true },
      {
        icon: Bell,
        label: 'Reconciliação SICOOB',
        href: '/admin/sicoob/notificacoes',
        adminOnly: true,
      },
      {
        icon: FolderOpen,
        label: 'Cadastros',
        href: '/admin/cadastros',
        adminOnly: true,
        children: [
          { icon: Package, label: 'Produtos', href: '/admin/cadastros?tab=products' },
          { icon: Truck, label: 'Fornecedores', href: '/admin/cadastros?tab=suppliers' },
          { icon: Palette, label: 'Gravação', href: '/admin/cadastros?tab=personalizacao' },
          { icon: Filter, label: 'Categorias', href: '/admin/categories' },
        ],
      },
      {
        icon: Landmark,
        label: 'Estrutura SICOOB',
        href: '',
        adminOnly: true,
        children: [
          { icon: Landmark, label: 'Singulares', href: '/admin/singulares' },
          { icon: Building, label: 'Postos de Atendimento', href: '/admin/pas' },
          { icon: Users, label: 'Parceiros', href: '/admin/cooperativas' },
        ],
      },
      {
        icon: Megaphone,
        label: 'Marketing',
        href: '',
        adminOnly: true,
        children: [
          { icon: Mail, label: 'Newsletter', href: '/admin/newsletter' },
          { icon: Megaphone, label: 'Campanhas', href: '/admin/campanhas' },
          { icon: LayoutGrid, label: 'CMS', href: '/admin/cms' },
        ],
      },
      {
        icon: DollarSign,
        label: 'Financeiro',
        href: '',
        adminOnly: true,
        children: [{ icon: Wallet, label: 'Verbas', href: '/admin/verbas' }],
      },
      { icon: Activity, label: 'Telemetria', href: '/admin/telemetria', devOnly: true },
      { icon: ShieldCheck, label: 'Segurança', href: '/admin/seguranca', devOnly: true },
      { icon: ShieldCheck, label: 'Acesso & Bots', href: '/admin/seguranca-acesso', devOnly: true },
      { icon: Plug, label: 'Conexões', href: '/admin/conexoes', devOnly: true },
      { icon: Sparkles, label: 'Prompts IA', href: '/admin/prompts-ia', devOnly: true },
      { icon: Workflow, label: 'Workflows IA', href: '/admin/workflows', devOnly: true },
      { icon: ShieldCheck, label: 'Auditoria RBAC', href: '/admin/rbac-rotas', devOnly: true },
      { icon: ShieldAlert, label: 'QA Pré-flight', href: '/admin/qa/preflight', devOnly: true },
      {
        icon: FileText,
        label: 'Evidências QA',
        href: '/admin/qa/release-evidences',
        devOnly: true,
      },
      { icon: ShieldCheck, label: 'Auditoria RLS', href: '/admin/seguranca/rls', devOnly: true },
    ],
  },
];

function hasDeclaredAccess(
  item: NavGroup['items'][number],
  isDev: boolean,
  isSupervisor: boolean,
  roles: AppRole[],
): boolean {
  if (item.devOnly && !isDev) return false;
  if (item.adminOnly && !isSupervisor) return false;
  return !item.allowedRoles || roles.some((role) => item.allowedRoles?.includes(role));
}

function hasRouteAccess(
  href: string,
  isDev: boolean,
  isSupervisor: boolean,
  roles: AppRole[],
): boolean {
  if (href && isDevOnlyPath(href) && !isDev) return false;
  if (href && isAdminOnlyPath(href) && !isSupervisor) return false;
  return !href || canAccessSicoobPath(href, roles);
}

function SidebarOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

function SidebarControls({
  collapsed,
  hasOpenGroup,
  onCollapseAll,
  onToggleCollapse,
}: {
  collapsed: boolean;
  hasOpenGroup: boolean;
  onCollapseAll: () => void;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="mb-1 hidden items-center justify-between px-2 lg:flex">
      {!collapsed && hasOpenGroup && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 border-sidebar-border/50 text-[10px] text-sidebar-foreground/40 hover:border-brand/30 hover:bg-brand/10 hover:text-brand"
          onClick={onCollapseAll}
        >
          <X className="h-3 w-3" />
          Fechar
        </Button>
      )}
      {!collapsed && !hasOpenGroup && <div />}
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto h-7 w-7 text-sidebar-foreground/30 hover:bg-sidebar-accent/50 hover:text-brand"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

function NavigationGroups({
  groups,
  openGroups,
  collapsed,
  mobileOpen,
  onToggleGroup,
  onMobileClose,
}: {
  groups: NavGroup[];
  openGroups: Record<string, boolean>;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleGroup: (id: string, open: boolean) => void;
  onMobileClose: () => void;
}) {
  return (
    <nav
      className={cn(
        'scrollbar-thin min-h-0 flex-1 px-2',
        collapsed ? OVERFLOW_VISIBLE_CLASS : 'overflow-y-auto',
        collapsed ? 'space-y-0' : 'space-y-0.5',
      )}
    >
      {groups.map((group, index) => (
        <div key={group.id}>
          {index > 0 && (
            <div
              className={
                collapsed
                  ? 'mx-auto my-1.5 h-px w-4 bg-sidebar-border/30'
                  : 'mx-2 my-2.5 h-px bg-sidebar-border/40'
              }
            />
          )}
          <SidebarNavGroup
            group={group}
            isOpen={openGroups[group.id] ?? false}
            isCollapsed={collapsed}
            onToggle={(next) => onToggleGroup(group.id, next)}
            onMobileClose={onMobileClose}
            isMobileSidebarOpen={mobileOpen}
          />
        </div>
      ))}
    </nav>
  );
}

interface SidebarViewProps {
  forwardedRef: React.ForwardedRef<HTMLElement>;
  isOpen: boolean;
  onToggle: () => void;
  collapsed: boolean;
  openGroups: Record<string, boolean>;
  groups: NavGroup[];
  onToggleCollapse: () => void;
  onCollapseAll: () => void;
  onToggleGroup: (id: string, open: boolean) => void;
}

function SidebarFrame({
  forwardedRef,
  isOpen,
  onToggle,
  collapsed,
  openGroups,
  groups,
  onToggleCollapse,
  onCollapseAll,
  onToggleGroup,
}: SidebarViewProps) {
  return (
    <aside
      ref={forwardedRef}
      data-tour="sidebar"
      role="navigation"
      aria-label="Menu principal"
      className={cn(
        'fixed left-0 top-0 z-50 h-full border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-out',
        collapsed ? OVERFLOW_VISIBLE_CLASS : 'overflow-hidden',
        'lg:sticky lg:top-0 lg:z-auto lg:h-screen',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex h-full min-h-0 flex-col pt-16 lg:pt-0',
          collapsed && OVERFLOW_VISIBLE_CLASS,
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          openGroups={openGroups}
          groups={groups}
          isOpen={isOpen}
          onToggle={onToggle}
          onToggleCollapse={onToggleCollapse}
          onCollapseAll={onCollapseAll}
          onToggleGroup={onToggleGroup}
        />
      </div>
    </aside>
  );
}

function SidebarBody(props: Omit<SidebarViewProps, 'forwardedRef'>) {
  return (
    <>
      <SidebarBrandHeader isCollapsed={props.collapsed} />
      <OrganizationSwitcher isCollapsed={props.collapsed} />
      <SidebarControls
        collapsed={props.collapsed}
        hasOpenGroup={Object.values(props.openGroups).some(Boolean)}
        onCollapseAll={props.onCollapseAll}
        onToggleCollapse={props.onToggleCollapse}
      />
      <RestrictedRouteNotice isCollapsed={props.collapsed} />
      <NavigationGroups
        groups={props.groups}
        openGroups={props.openGroups}
        collapsed={props.collapsed}
        mobileOpen={props.isOpen}
        onToggleGroup={props.onToggleGroup}
        onMobileClose={props.onToggle}
      />
      <SidebarFooterHealth isCollapsed={props.collapsed} />
    </>
  );
}

function SidebarView(props: SidebarViewProps) {
  return (
    <>
      <SidebarOverlay visible={props.isOpen} onClose={props.onToggle} />
      <SidebarFrame {...props} />
    </>
  );
}

function getAutoOpenGroups(pathname: string) {
  const next: Record<string, boolean> = {};
  navGroups.forEach((group) => {
    const hasActive = group.items.some((item) => isNavItemActive(pathname, item.href, item.exact));
    next[group.id] = hasActive || (group.defaultOpen ?? false);
  });
  return next;
}

function useSidebarOpenGroups(pathname: string) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    getAutoOpenGroups(pathname),
  );
  useEffect(() => {
    setOpenGroups(getAutoOpenGroups(pathname));
  }, [pathname]);
  const toggleGroup = (groupId: string, next: boolean) => {
    setOpenGroups((current) =>
      current[groupId] === next ? current : { ...current, [groupId]: next },
    );
  };
  const collapseAll = () => {
    setOpenGroups((current) => Object.fromEntries(Object.keys(current).map((key) => [key, false])));
  };
  return { openGroups, toggleGroup, collapseAll };
}

function usePendingSidebarBadges() {
  const auth = useAuth();
  const approvals = useQuery({
    queryKey: ['pending-discount-approvals-count'],
    queryFn: async () => {
      const { count } = await supabase
        // rls-allow: badge de supervisor; RLS limita a fila autorizada
        .from('discount_approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: auth.isSupervisorOrAbove,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const pacRequests = useQuery({
    queryKey: ['pending-pac-requests-count'],
    queryFn: async () => {
      const { count } = await supabase
        // rls-allow: badge de aprovação singular; RLS limita a hierarquia
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_singular_approval');
      return count || 0;
    },
    enabled: auth.isGestorCompras || auth.isCompradorSingular || auth.isDev,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  return { auth, approvals: approvals.data, pacRequests: pacRequests.data };
}

export function withItemBadge(group: NavGroup, href: string, badge?: number): NavGroup {
  if (!badge) return group;
  const addBadge = (item: NavGroup['items'][number]): NavGroup['items'][number] => ({
    ...item,
    ...(item.href === href ? { badge } : {}),
    children: item.children?.map(addBadge),
  });
  return {
    ...group,
    items: group.items.map(addBadge),
  };
}

function enrichNavigationGroups(
  approvals: number | undefined,
  pacRequests: number | undefined,
  auth: ReturnType<typeof useAuth>,
) {
  return navGroups.map((group) => {
    if (group.id === 'admin' && auth.isSupervisorOrAbove) {
      return withItemBadge(group, '/admin/usuarios?tab=discounts', approvals);
    }
    const canApprovePac = auth.isGestorCompras || auth.isCompradorSingular || auth.isDev;
    if (group.id === 'quotes' && canApprovePac) {
      return withItemBadge(group, '/gestor/orcamentos', pacRequests);
    }
    return group;
  });
}

function useVisibleSidebarGroups() {
  const { auth, approvals, pacRequests } = usePendingSidebarBadges();
  const enriched = useMemo(
    () => enrichNavigationGroups(approvals, pacRequests, auth),
    [approvals, pacRequests, auth],
  );
  const isVisible = useCallback(
    (item: NavGroup['items'][number]) =>
      hasDeclaredAccess(item, auth.isDev, auth.isSupervisorOrAbove, auth.roles) &&
      hasRouteAccess(item.href ?? '', auth.isDev, auth.isSupervisorOrAbove, auth.roles),
    [auth.isDev, auth.isSupervisorOrAbove, auth.roles],
  );
  return useMemo(
    () =>
      enriched
        .filter(
          (group) =>
            (!group.adminOnly || auth.isSupervisorOrAbove) && (!group.devOnly || auth.isDev),
        )
        .map((group) => ({
          ...group,
          items: group.items
            .filter(isVisible)
            .map((item) => ({ ...item, children: item.children?.filter(isVisible) })),
        }))
        .filter((group) => group.items.length > 0),
    [auth.isDev, auth.isSupervisorOrAbove, enriched, isVisible],
  );
}

const NAV_SHORTCUTS = Object.fromEntries(
  navGroups.flatMap((group) =>
    group.items
      .filter((item) => item.shortcut)
      .map((item) => [item.shortcut?.replace('Alt+', '').toLowerCase(), item.href]),
  ),
);

function useNavigationShortcuts(navigate: ReturnType<typeof useNavigate>) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      const href = NAV_SHORTCUTS[event.key.toLowerCase()];
      if (!href) return;
      event.preventDefault();
      navigate(href);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}

export const SidebarReorganized = React.forwardRef<HTMLElement, SidebarProps>(
  function SidebarReorganized({ isOpen, onToggle }, ref) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const groups = useVisibleSidebarGroups();
    const groupState = useSidebarOpenGroups(location.pathname);
    useNavigationShortcuts(navigate);
    return (
      <SidebarView
        forwardedRef={ref}
        isOpen={isOpen}
        onToggle={onToggle}
        collapsed={isCollapsed}
        openGroups={groupState.openGroups}
        groups={groups}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
        onCollapseAll={groupState.collapseAll}
        onToggleGroup={groupState.toggleGroup}
      />
    );
  },
);
