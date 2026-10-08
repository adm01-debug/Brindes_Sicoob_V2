/**
 * Header — Application navigation and user clusters
 * Optimized for performance 10/10
 */
/**
 * Header — Application navigation and user clusters
 * Optimized for performance 10/10
 */
import { useEffect, type CSSProperties, Suspense } from "react";
import { User, Menu, Sun, Moon, Heart, GitCompare, Search, LogOut, HelpCircle, MoreHorizontal, Palette, RotateCcw, Smartphone } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useOnboardingContext } from "@/contexts/OnboardingContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";

import { useIsScrolled } from "@/hooks/useScroll";
import { useCurrentSection } from "@/hooks/useCurrentSection";
import { cn, lazyWithRetry } from "@/lib";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { BackButton } from "@/components/common/BackButton";


// Lazy load non-critical Header sub-components
const StockAlertsIndicator = lazyWithRetry(() => import("@/components/inventory/StockAlertsIndicator").then(m => ({ default: m.StockAlertsIndicator })));
const NotificationBell = lazyWithRetry(() => import("@/components/notifications/NotificationDrawer").then(m => ({ default: m.NotificationBell })));
const DiscountApprovalHeaderBadge = lazyWithRetry(() => import("@/components/admin/DiscountApprovalHeaderBadge").then(m => ({ default: m.DiscountApprovalHeaderBadge })));
const GlobalSearchPalette = lazyWithRetry(() => import("@/components/search/GlobalSearchPalette").then(m => ({ default: m.GlobalSearchPalette })));
const CartHeaderButton = lazyWithRetry(() => import("@/components/cart/CartHeaderButton").then(m => ({ default: m.CartHeaderButton })));



interface HeaderProps {
  onMenuToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function truncateDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length <= 1) return displayName;
  const first = parts[0] ?? "Usuário";
  const lastInitial = parts[parts.length - 1]?.charAt(0) ?? "";
  return `${first} ${lastInitial}.`;
}

function useHeaderModel() {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const favoriteCount = useFavoritesStore(state => state.favoriteCount);
  const compareCount = useComparisonStore(state => state.compareCount);
  const { user, profile, role, isSupervisorOrAbove, signOut, rolesLoaded } = useAuth();
  const { currentOrg } = useOrganization();
  const currentSection = useCurrentSection();
  const { restartTour, hasCompletedTour, isLoading: onboardingLoading } = useOnboardingContext();
  const { isInstallable } = usePWAInstall();
  const isScrolled = useIsScrolled(20);
  const headerHeightPx = isScrolled ? 48 : 56;
  useEffect(() => { document.documentElement.style.setProperty("--header-h", `${headerHeightPx}px`); }, [headerHeightPx]);
  const handleToggleTheme = () => {
    if (theme === "auto") { setTheme(actualTheme === "dark" ? "light" : "dark"); return; }
    toggleTheme();
  };
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Até logo!", description: "Você saiu da sua conta" });
      ['favorites-storage', 'comparison-storage', 'recently-viewed-storage'].forEach(key => localStorage.removeItem(key));
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao sair:", error);
      toast({ variant: "destructive", title: "Erro ao sair", description: "Ocorreu um problema ao tentar encerrar sua sessão." });
    }
  };
  const displayName = currentOrg?.name || profile?.full_name || user?.email?.split("@")[0] || "Minha Cooperativa";
  return { actualTheme, navigate, favoriteCount, compareCount, user, profile, role, isSupervisorOrAbove, rolesLoaded, currentOrg, currentSection, restartTour, hasCompletedTour, onboardingLoading, isInstallable, isScrolled, headerHeightPx, displayName, truncatedName: truncateDisplayName(displayName), handleToggleTheme, handleSignOut };
}

type HeaderModel = ReturnType<typeof useHeaderModel>;

function HeaderLeft({ currentSection, onMenuToggle }: { currentSection: string; onMenuToggle: () => void }) {
  const onSubpage = location.pathname !== "/" && location.pathname !== "/dashboard";
  return <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0"><div className="lg:hidden flex items-center">{onSubpage ? <BackButton variant="ghost" size="icon" showLabel={false} className="h-9 w-9 rounded-full" /> : <div className="ml-1 mr-1 flex h-9 items-center rounded-lg bg-[#003641] px-2.5"><img src="/brand/sicoob-logo.png" alt="Sicoob" className="h-5 w-auto object-contain" /></div>}</div><Button variant="ghost" size="icon" className={cn("hover:bg-brand/10 hover:text-brand h-8 w-8 sm:h-9 sm:w-9 transition-all", onSubpage ? "hidden lg:flex" : "flex lg:hidden")} onClick={onMenuToggle} aria-label="Menu"><Menu className="h-5 w-5" /></Button><div className="hidden lg:flex items-center gap-2 max-w-[200px]"><span className="font-display text-sm font-semibold text-foreground tracking-tight truncate">{currentSection}</span></div></div>;
}

function TransactionCluster() {
  return <div className="flex items-center gap-0.5"><Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted/20 animate-pulse" />}><div className="hidden sm:block"><CartHeaderButton /></div><DiscountApprovalHeaderBadge /><NotificationBell /><div className="hidden md:block"><StockAlertsIndicator /></div></Suspense></div>;
}

function UtilityButton({ label, count, limit, onClick, icon, shortcut }: { label: string; count: number; limit: number; onClick: () => void; icon: typeof Heart; shortcut: string }) {
  const Icon = icon;
  const displayedCount = count > limit ? `${limit}${limit > 9 ? '+' : ''}` : count;
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={label} className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200" onClick={onClick}><Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />{count > 0 && <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] bg-accent text-accent-foreground border-0">{displayedCount}</Badge>}</Button></TooltipTrigger><TooltipContent className="bg-card border-border text-xs">{label} <kbd className="ml-1.5 px-1 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono">{shortcut}</kbd></TooltipContent></Tooltip>;
}

function DesktopUtilities({ model }: { model: HeaderModel }) {
  return <div className="hidden md:flex items-center gap-0.5"><UtilityButton label="Favoritos" count={model.favoriteCount} limit={99} onClick={() => model.navigate('/favoritos')} icon={Heart} shortcut="Alt+F" /><UtilityButton label="Comparar" count={model.compareCount} limit={4} onClick={() => model.navigate('/comparar')} icon={GitCompare} shortcut="Alt+C" /><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={model.handleToggleTheme} className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200" aria-label="Tema claro"><Sun className="h-[17px] w-[17px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.75} /><Moon className="absolute h-[17px] w-[17px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.75} /><span className="sr-only">Alternar tema</span></Button></TooltipTrigger><TooltipContent className="bg-card border-border text-xs">{model.actualTheme === "dark" ? "Modo Claro" : "Modo Escuro"} <kbd className="ml-1.5 px-1 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono">Alt+T</kbd></TooltipContent></Tooltip></div>;
}

function MobileOverflow({ model }: { model: HeaderModel }) {
  const themeLabel = model.actualTheme === "dark" ? "Modo Claro" : "Modo Escuro";
  return <div className="md:hidden"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" aria-label="Mais opções"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 bg-card border-border"><DropdownMenuItem onClick={() => model.navigate('/favoritos')} className="cursor-pointer"><Heart className="h-4 w-4 mr-2" />Favoritos{model.favoriteCount > 0 && <Badge className="ml-auto h-5 min-w-5 px-1.5 text-[10px] bg-accent text-accent-foreground border-0">{model.favoriteCount}</Badge>}</DropdownMenuItem><DropdownMenuItem onClick={() => model.navigate('/comparar')} className="cursor-pointer"><GitCompare className="h-4 w-4 mr-2" />Comparar{model.compareCount > 0 && <Badge className="ml-auto h-5 min-w-5 px-1.5 text-[10px] bg-accent text-accent-foreground border-0">{model.compareCount}</Badge>}</DropdownMenuItem><DropdownMenuSeparator className="bg-border" /><DropdownMenuItem onClick={model.handleToggleTheme} className="cursor-pointer">{model.actualTheme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}{themeLabel}</DropdownMenuItem>{model.isInstallable && <DropdownMenuItem onClick={() => model.navigate('/instalar')} className="cursor-pointer text-primary font-bold"><Smartphone className="h-4 w-4 mr-2" />Instalar App</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div>;
}

function UserAvatar({ model }: { model: HeaderModel }) {
  let avatar = <User className="h-4 w-4 text-primary-foreground" />;
  if (model.currentOrg?.logo_url) avatar = <img src={model.currentOrg.logo_url} alt={model.currentOrg.name} className="w-8 h-8 rounded-full object-cover" loading="lazy" />;
  else if (model.profile?.avatar_url) avatar = <img src={model.profile.avatar_url} alt={model.displayName} className="w-8 h-8 rounded-full object-cover" loading="lazy" />;
  return <div className="relative"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center ring-2 ring-background shadow-md">{avatar}</div><span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-background" /></div>;
}

function UserMenu({ model }: { model: HeaderModel }) {
  const roleDisplay = model.rolesLoaded ? <RoleBadge role={model.role} className="h-4 px-1.5 text-[9px] leading-none" /> : <span aria-hidden="true" className="h-4 w-12 rounded bg-muted/40 animate-pulse" />;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="flex items-center gap-2 h-9 px-1.5 sm:px-2 hover:bg-primary/10 rounded-lg" title="Minha Cooperativa"><UserAvatar model={model} /><div className="hidden lg:flex flex-col items-start"><span className="text-sm font-medium text-foreground leading-tight truncate max-w-[120px]">{model.truncatedName}</span>{roleDisplay}</div></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56 bg-card border-border"><DropdownMenuLabel><div className="flex flex-col gap-1"><span className="font-medium">{model.displayName}</span><span className="text-xs text-muted-foreground">{model.user?.email}</span>{model.rolesLoaded ? <RoleBadge role={model.role} className="self-start mt-1" /> : <span aria-hidden="true" className="self-start mt-1 h-5 w-16 rounded bg-muted/40 animate-pulse" />}</div></DropdownMenuLabel><DropdownMenuSeparator className="bg-border" />{model.isSupervisorOrAbove && <DropdownMenuItem onClick={() => model.navigate('/admin/temas')} className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"><Palette className="h-4 w-4 mr-2" />Skins</DropdownMenuItem>}<DropdownMenuItem className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"><HelpCircle className="h-4 w-4 mr-2" />Ajuda</DropdownMenuItem>{!model.onboardingLoading && model.hasCompletedTour && <DropdownMenuItem onClick={() => model.restartTour()} className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"><RotateCcw className="h-4 w-4 mr-2" />Reiniciar Tour</DropdownMenuItem>}<DropdownMenuSeparator className="bg-border" /><DropdownMenuItem className="text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer" onClick={() => { void model.handleSignOut(); }}><LogOut className="h-4 w-4 mr-2" />Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function HeaderActions({ model }: { model: HeaderModel }) {
  const openSearch = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  return <div className="flex items-center gap-0.5 sm:gap-0.5"><Button variant="ghost" size="icon" aria-label="Abrir busca global" className="md:hidden h-8 w-8 hover:bg-brand/10 hover:text-brand" onClick={openSearch}><Search className="h-4 w-4" aria-hidden="true" /></Button><TransactionCluster /><div className="h-5 w-px bg-border/60 mx-1.5 hidden md:block" /><DesktopUtilities model={model} /><MobileOverflow model={model} /><div className="h-5 w-px bg-border/60 mx-1.5 hidden sm:block" /><UserMenu model={model} /></div>;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const model = useHeaderModel();
  return (
    <header data-testid="app-header" style={{ "--header-h": `${model.headerHeightPx}px` } as CSSProperties} className={cn("border-b transition-all duration-300 print:hidden bg-background/80 backdrop-blur-xl border-border/50 h-[var(--header-h,56px)] sticky top-0 z-50 will-change-transform", model.isScrolled && "bg-background/95 backdrop-blur-2xl shadow-sm border-brand/20")}>
      <div className="flex items-center justify-between h-full px-2 sm:px-4 lg:px-6">
        <HeaderLeft currentSection={model.currentSection} onMenuToggle={onMenuToggle} />
        <div className="flex-1 max-w-lg mx-4 hidden md:block" data-tour="search"><Suspense fallback={<div data-route-pending="lazy" className="h-10 w-full bg-muted/20 animate-pulse rounded-lg" />}><GlobalSearchPalette /></Suspense></div>
        <HeaderActions model={model} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-brand to-primary/40 opacity-40" />
    </header>
  );
}
