import { type ReactNode, useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PullToRefreshIndicator } from '@/components/mobile/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLocation, Outlet } from 'react-router-dom';
import { useScrollLockFix } from '@/hooks/useScrollLockFix';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useScrollDirection } from '@/hooks/useScroll';

import { SkipToContent } from '@/components/common/SkipToContent';
import { BackButton } from '@/components/common/BackButton';
import { FloatingBackButton } from '@/components/common/FloatingBackButton';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { RouteLoadingBar } from '@/components/common/RouteLoadingBar';

import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy load heavy layout components to reduce MainLayout chunk size
const Header = lazyWithRetry(() => import('./Header').then((m) => ({ default: m.Header })));
const SidebarReorganized = lazyWithRetry(() =>
  import('./SidebarReorganized').then((m) => ({ default: m.SidebarReorganized })),
);
const PageTransition = lazyWithRetry(() =>
  import('@/components/effects/PageTransition').then((m) => ({ default: m.PageTransition })),
);

// Context providers must be imported synchronously (consumers render inside them)
import { SellerCartProvider } from '@/contexts/SellerCartContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

// Lazy-loaded non-critical UI components
const OnboardingTour = lazyWithRetry(() =>
  import('@/components/onboarding/OnboardingTour').then((m) => ({ default: m.OnboardingTour })),
);
const EnhancedSpotlight = lazyWithRetry(() =>
  import('@/components/common/EnhancedSpotlight').then((m) => ({ default: m.EnhancedSpotlight })),
);
const SmartMobileNav = lazyWithRetry(() =>
  import('@/components/mobile/SmartMobileNav').then((m) => ({ default: m.SmartMobileNav })),
);
const QuickQuoteFAB = lazyWithRetry(() =>
  import('@/components/quote/QuickQuoteFAB').then((m) => ({ default: m.QuickQuoteFAB })),
);
const FloatingCompareBar = lazyWithRetry(() =>
  import('@/components/compare/FloatingCompareBar').then((m) => ({
    default: m.FloatingCompareBar,
  })),
);
const GlobalCommandBar = lazyWithRetry(() =>
  import('@/components/command/GlobalCommandBar').then((m) => ({ default: m.GlobalCommandBar })),
);
const ScrollToTopButton = lazyWithRetry(() =>
  import('@/components/common/ScrollProgress').then((m) => ({ default: m.ScrollToTopButton })),
);
const ScrollProgressIndicator = lazyWithRetry(() =>
  import('@/components/common/ScrollProgress').then((m) => ({
    default: m.ScrollProgressIndicator,
  })),
);
const PersistentBreadcrumbs = lazyWithRetry(() =>
  import('@/components/common/PersistentBreadcrumbs').then((m) => ({
    default: m.PersistentBreadcrumbs,
  })),
);

import { cn } from '@/lib/utils';
import { diagnostics } from '@/lib/diagnostics';
import { APIInspector } from '@/components/debug/APIInspector';

interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const state = useMainLayoutState();
  const layoutContent = <LayoutContent state={state}>{children}</LayoutContent>;
  return (
    <OnboardingProvider>
      <SellerCartProvider>
        <Suspense fallback={layoutContent}>
          <GlobalCommandBar>{layoutContent}</GlobalCommandBar>
        </Suspense>
      </SellerCartProvider>
    </OnboardingProvider>
  );
}

function useMainLayoutState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [queryClient]);
  const refresh = usePullToRefresh(handleRefresh);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const hideBreadcrumb = useScrollDirection(50) === 'down' && window.scrollY > 200;
  const mainRef = useRef<HTMLElement>(null);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  useScrollLockFix();
  useGlobalShortcuts();
  useSwipeBack(!isHome);
  useMainLayoutEffects(location.pathname, isHome, mainRef);

  return {
    sidebarOpen,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    location,
    isHome,
    hideBreadcrumb,
    mainRef,
    ...refresh,
  };
}

function useMainLayoutEffects(
  pathname: string,
  isHome: boolean,
  mainRef: { current: HTMLElement | null },
) {
  useEffect(() => {
    diagnostics.log('event', 'MainLayout', 'MainLayout montado');
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--breadcrumb-h',
      isHome || pathname === '/dashboard' ? '0px' : '40px',
    );
  }, [isHome, pathname]);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const timer = setTimeout(() => mainRef.current?.focus({ preventScroll: true }), 100);
    return () => clearTimeout(timer);
  }, [pathname, mainRef]);
}

type MainLayoutState = ReturnType<typeof useMainLayoutState>;

function LayoutContent({ state, children }: { state: MainLayoutState; children?: ReactNode }) {
  return (
    <div className="ambient-glow relative min-h-screen bg-background print:min-h-0" role="document">
      <LayoutBootstrap pullDistance={state.pullDistance} isRefreshing={state.isRefreshing} />
      <LayoutColumns state={state}>{children}</LayoutColumns>
      <FloatingLayoutTools />
    </div>
  );
}

function LayoutBootstrap({
  pullDistance,
  isRefreshing,
}: Pick<MainLayoutState, 'pullDistance' | 'isRefreshing'>) {
  return (
    <>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <RouteLoadingBar />
      <div className="print:hidden">
        <Suspense fallback={null}>
          <ScrollProgressIndicator color="primary" height={3} />
        </Suspense>
      </div>
      <div className="print:hidden">
        <SkipToContent />
      </div>
      <div className="print:hidden">
        <Suspense fallback={null}>
          <EnhancedSpotlight />
        </Suspense>
      </div>
      <div className="print:hidden">
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      </div>
    </>
  );
}

function LayoutColumns({ state, children }: { state: MainLayoutState; children?: ReactNode }) {
  return (
    <div className="flex">
      <div className="print:hidden">
        <Suspense fallback={<div className="hidden h-screen w-64 flex-shrink-0 lg:block" />}>
          <SidebarReorganized isOpen={state.sidebarOpen} onToggle={state.toggleSidebar} />
        </Suspense>
      </div>
      <MainLayoutColumn state={state}>{children}</MainLayoutColumn>
    </div>
  );
}

function MainLayoutColumn({ state, children }: { state: MainLayoutState; children?: ReactNode }) {
  return (
    <div className="isolate flex min-h-screen min-w-0 flex-1 flex-col print:min-h-0">
      <GlobalHeader state={state} />
      <BreadcrumbBar state={state} />
      <MainPageContent mainRef={state.mainRef}>{children}</MainPageContent>
      <div className="print:hidden">
        <Suspense fallback={null}>
          <QuickQuoteFAB />
        </Suspense>
      </div>
    </div>
  );
}

function GlobalHeader({ state }: { state: MainLayoutState }) {
  const fallback = (
    <div
      data-testid="app-header"
      style={{ height: 56, position: 'sticky', top: 0, zIndex: 50 }}
      className="print:hidden"
    />
  );
  return (
    <Suspense fallback={fallback}>
      <Header
        onMenuToggle={state.toggleSidebar}
        searchQuery={state.searchQuery}
        onSearchChange={state.setSearchQuery}
      />
    </Suspense>
  );
}

function BreadcrumbBar({ state }: { state: MainLayoutState }) {
  const hidden = state.isHome || state.location.pathname === '/dashboard';
  return (
    <div
      className={cn(
        'sticky top-[var(--header-h,56px)] z-30 print:hidden',
        'bg-background/70 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60',
        'shadow-sm/5 border-b border-border/30 transition-all duration-300',
        'will-change-transform',
        hidden && 'pointer-events-none h-0 overflow-hidden border-none opacity-0',
        state.hideBreadcrumb &&
          !state.isHome &&
          'pointer-events-none translate-y-[-100%] opacity-0',
      )}
      style={{ contain: 'layout style' }}
      data-testid="breadcrumb-bar"
    >
      <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-3 py-2 sm:px-4 lg:px-6">
        <Suspense fallback={<div className="h-6" />}>
          <BackButton
            useChevron
            showLabel={false}
            className="h-8 w-8 rounded-full border-none bg-muted/20 text-muted-foreground shadow-none transition-all duration-200 hover:bg-muted/40 hover:text-foreground sm:hidden"
            variant="ghost"
          />
          <PersistentBreadcrumbs showBackButton className="flex-1 py-0.5" />
        </Suspense>
      </div>
    </div>
  );
}

function MainPageContent({
  mainRef,
  children,
}: {
  mainRef: { current: HTMLElement | null };
  children?: ReactNode;
}) {
  const routeContent = children || <Outlet />;
  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      id="main-content"
      className="flex-1 overflow-x-clip p-3 pb-24 outline-none sm:p-4 sm:pb-20 lg:p-6 lg:pb-6 print:p-0 print:pb-0"
      role="main"
      aria-label="Conteúdo principal"
    >
      <Suspense fallback={<div>{routeContent}</div>}>
        <PageTransition variant="morph" duration={0.4} className="min-h-[calc(100vh-140px)]">
          {routeContent}
        </PageTransition>
      </Suspense>
    </main>
  );
}

function FloatingLayoutTools() {
  return (
    <>
      <div className="print:hidden">
        <Suspense fallback={null}>
          <ScrollToTopButton threshold={150} />
        </Suspense>
      </div>
      <div className="print:hidden">
        <Suspense fallback={null}>
          <FloatingCompareBar />
        </Suspense>
      </div>
      <div className="print:hidden">
        <Suspense fallback={null}>
          <SmartMobileNav />
        </Suspense>
      </div>
      <FloatingBackButton />
      <APIInspector />
    </>
  );
}
