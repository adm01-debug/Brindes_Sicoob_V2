import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { NavLink, type Location, useLocation } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { isNavItemActive } from '@/lib/navigation/active-match';
import { isAdminOnlyPath, isDevOnlyPath } from '@/lib/navigation/restricted-routes';
import { canAccessSicoobPath } from '@/lib/access/role-policy';
import { getPrefetchHandlers } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/types/users';

export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  tourId?: string;
  adminOnly?: boolean;
  allowedRoles?: readonly AppRole[];
  devOnly?: boolean;
  requiredPermission?: { action: string; resource: string };
  badge?: string | number;
  exact?: boolean;
  children?: NavItem[];
  shortcut?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
  adminOnly?: boolean;
  devOnly?: boolean;
}

interface SidebarNavGroupProps {
  group: NavGroup;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: (next: boolean) => void;
  onMobileClose: () => void;
  isMobileSidebarOpen: boolean;
}

type HasPermission = ReturnType<typeof useRBAC>['hasPermission'];
const NAV_ICON_CLASS = 'h-4 w-4 shrink-0 transition-colors';
const ACTIVE_ICON_CLASS = 'text-orange';
const HOVER_ICON_CLASS = 'group-hover:text-orange/70';

interface NavAccess {
  isAdmin: boolean;
  isDev: boolean;
  roles: AppRole[];
  hasPermission: HasPermission;
}

interface NavItemContext extends NavAccess {
  location: Location;
  collapsed: boolean;
  mobileOpen: boolean;
  openSubMenus: Record<string, boolean>;
  onToggleSubMenu: (label: string) => void;
  onMobileClose: () => void;
}

function itemMatchesLocation(location: Location, item: NavItem): boolean {
  if (!item.href.includes('?')) return isNavItemActive(location.pathname, item.href, item.exact);
  const [path, search] = item.href.split('?');
  return location.pathname === path && location.search === `?${search}`;
}

function hasDeclaredAccess(item: NavItem, access: NavAccess): boolean {
  if (item.devOnly && !access.isDev) return false;
  if (item.adminOnly && !access.isAdmin) return false;
  if (item.allowedRoles && !access.roles.some((role) => item.allowedRoles?.includes(role)))
    return false;
  return true;
}

function hasRouteAccess(item: NavItem, access: NavAccess): boolean {
  if (item.href && isDevOnlyPath(item.href) && !access.isDev) return false;
  if (item.href && isAdminOnlyPath(item.href) && !access.isAdmin) return false;
  return !item.href || canAccessSicoobPath(item.href, access.roles);
}

function canRenderItem(item: NavItem, access: NavAccess): boolean {
  if (!hasDeclaredAccess(item, access) || !hasRouteAccess(item, access)) return false;
  const permission = item.requiredPermission;
  return !permission || access.hasPermission(permission.action, permission.resource);
}

function ItemBadge({ badge }: { badge?: string | number }) {
  if (badge === null || badge === undefined) return null;
  return (
    <span className="ml-auto min-w-[20px] rounded-full bg-orange/15 px-1.5 py-0.5 text-center text-[10px] font-semibold text-orange">
      {badge}
    </span>
  );
}

function NavItemDetails({ item }: { item: NavItem }) {
  return (
    <>
      <span className="flex-1 truncate text-sm">{item.label}</span>
      {item.shortcut && (
        <kbd className="ml-auto hidden rounded bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-muted-foreground/40 lg:inline-block">
          {item.shortcut}
        </kbd>
      )}
      <ItemBadge badge={item.badge} />
    </>
  );
}

function navItemTestId(href: string): string {
  const path = href.split('?')[0] ?? '';
  const segments = path.split('/').filter(Boolean);
  const slug = segments[segments.length - 1] ?? 'inicio';
  return `sidebar-link-${slug}`;
}

function CollapsedTooltip({ item, children }: { item: NavItem; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div>{children}</div>
      </TooltipTrigger>
      <TooltipContent side="right" className="z-[100] border-border bg-card">
        <div className="flex items-center gap-2">
          <span>{item.label}</span>
          {item.shortcut && (
            <kbd className="rounded bg-muted/50 px-1 py-0.5 font-mono text-[9px] text-muted-foreground/60">
              {item.shortcut}
            </kbd>
          )}
          <ItemBadge badge={item.badge} />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function LeafNavItem({ item, context }: { item: NavItem; context: NavItemContext }) {
  const active = itemMatchesLocation(context.location, item);
  const Icon = item.icon;
  const prefetch = getPrefetchHandlers(item.href);
  const content = (
    <NavLink
      to={item.href}
      data-tour={item.tourId}
      data-testid={navItemTestId(item.href)}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200',
        'hover:bg-sidebar-accent/50',
        active
          ? 'bg-orange/10 font-medium text-orange before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-orange'
          : 'text-sidebar-foreground/60 before:absolute before:left-0 before:top-1/2 before:h-0 before:w-[2px] before:-translate-y-1/2 before:rounded-r-full before:bg-orange/50 before:transition-all before:duration-200 hover:text-sidebar-foreground hover:before:h-4',
      )}
      onClick={() => {
        if (context.mobileOpen) context.onMobileClose();
      }}
      onMouseEnter={prefetch.onMouseEnter}
      onTouchStart={prefetch.onTouchStart}
    >
      <Icon className={cn(NAV_ICON_CLASS, active ? ACTIVE_ICON_CLASS : HOVER_ICON_CLASS)} />
      {!context.collapsed && <NavItemDetails item={item} />}
    </NavLink>
  );
  return context.collapsed ? (
    <CollapsedTooltip item={item}>{content}</CollapsedTooltip>
  ) : (
    <div>{content}</div>
  );
}

function SubmenuNavItem({ item, context }: { item: NavItem; context: NavItemContext }) {
  const children = item.children ?? [];
  const activeChild = children.some((child) => itemMatchesLocation(context.location, child));
  const submenuOpen = context.openSubMenus[item.label] ?? activeChild;
  const Icon = item.icon;
  return (
    <div>
      <button
        aria-expanded={submenuOpen}
        aria-label={`Expandir ${item.label}`}
        onClick={() => context.onToggleSubMenu(item.label)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200',
          'hover:bg-sidebar-accent/50',
          activeChild
            ? 'font-medium text-orange'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground',
        )}
      >
        <Icon className={cn(NAV_ICON_CLASS, activeChild ? ACTIVE_ICON_CLASS : HOVER_ICON_CLASS)} />
        {!context.collapsed && (
          <>
            <span className="flex-1 truncate text-left text-sm">{item.label}</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200',
                submenuOpen && 'rotate-180',
              )}
            />
          </>
        )}
      </button>
      {submenuOpen && !context.collapsed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mt-0.5 space-y-0.5 pl-4">
            {children.map((child) => (
              <SidebarNavItem key={child.href || child.label} item={child} context={context} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SidebarNavItem({ item, context }: { item: NavItem; context: NavItemContext }) {
  if (!canRenderItem(item, context)) return null;
  if (item.children?.length) return <SubmenuNavItem item={item} context={context} />;
  return <LeafNavItem item={item} context={context} />;
}

function useOpenSubMenus(group: NavGroup, location: Location) {
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const toggleSubMenu = useCallback(
    (label: string) => setOpenSubMenus((current) => ({ ...current, [label]: !current[label] })),
    [],
  );
  useEffect(() => {
    const activeLabels = group.items
      .filter((item) => item.children?.some((child) => itemMatchesLocation(location, child)))
      .map((item) => item.label);
    if (activeLabels.length === 0) return;
    setOpenSubMenus((current) => {
      const next = { ...current };
      activeLabels.forEach((label) => {
        next[label] = true;
      });
      return next;
    });
  }, [group.items, location]);
  return { openSubMenus, toggleSubMenu };
}

function useNavItemContext(props: SidebarNavGroupProps) {
  const location = useLocation();
  const { isAdmin, isDev, roles } = useAuth();
  const { hasPermission } = useRBAC();
  const { openSubMenus, toggleSubMenu } = useOpenSubMenus(props.group, location);
  const context: NavItemContext = {
    location,
    collapsed: props.isCollapsed,
    mobileOpen: props.isMobileSidebarOpen,
    openSubMenus,
    onToggleSubMenu: toggleSubMenu,
    onMobileClose: props.onMobileClose,
    isAdmin,
    isDev,
    roles,
    hasPermission,
  };
  return context;
}

function GroupItems({ group, context }: { group: NavGroup; context: NavItemContext }) {
  return (
    <div className="space-y-0.5 py-1">
      {group.items.map((item) => (
        <SidebarNavItem key={item.href || item.label} item={item} context={context} />
      ))}
    </div>
  );
}

function ExpandedGroup({
  group,
  isOpen,
  onToggle,
  context,
}: Pick<SidebarNavGroupProps, 'group' | 'isOpen' | 'onToggle'> & { context: NavItemContext }) {
  const GroupIcon = group.icon;
  const hasActiveItem = group.items.some((item) => itemMatchesLocation(context.location, item));
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Recolher' : 'Expandir'} grupo ${group.label}`}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200',
            'text-sidebar-foreground/50 hover:bg-sidebar-accent/40',
            hasActiveItem && 'bg-orange/8 border border-orange/15 text-orange',
          )}
        >
          <GroupIcon
            className={cn(
              NAV_ICON_CLASS,
              hasActiveItem ? 'text-orange' : 'text-sidebar-foreground/40',
            )}
          />
          <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider">
            {group.label}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-sidebar-foreground/30 transition-transform duration-300',
              isOpen && 'rotate-180',
            )}
          />
        </button>
      </CollapsibleTrigger>
      {isOpen ? <ExpandedGroupItems group={group} context={context} /> : null}
    </Collapsible>
  );
}

function ExpandedGroupItems({ group, context }: { group: NavGroup; context: NavItemContext }) {
  return (
    <CollapsibleContent forceMount>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        <div className="mt-1 space-y-0.5 pb-1 pl-3">
          {group.items.map((item) => (
            <SidebarNavItem key={item.href || item.label} item={item} context={context} />
          ))}
        </div>
      </motion.div>
    </CollapsibleContent>
  );
}

export const SidebarNavGroup = forwardRef<HTMLDivElement, SidebarNavGroupProps>(
  function SidebarNavGroup(props, _ref) {
    const context = useNavItemContext(props);
    if (props.isCollapsed) return <GroupItems group={props.group} context={context} />;
    return (
      <ExpandedGroup
        group={props.group}
        isOpen={props.isOpen}
        onToggle={props.onToggle}
        context={context}
      />
    );
  },
);

SidebarNavGroup.displayName = 'SidebarNavGroup';
