import { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PullToRefreshIndicator } from "@/components/mobile/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useLocation } from "react-router-dom";
import { useScrollLockFix } from "@/hooks/useScrollLockFix";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { SkipToContent } from "@/components/common/SkipToContent";
import { BackButton } from "@/components/common/BackButton";

import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy load heavy layout components to reduce MainLayout chunk size
const Header = lazyWithRetry(() => import("./Header").then(m => ({ default: m.Header })));
const SidebarReorganized = lazyWithRetry(() => import("./SidebarReorganized").then(m => ({ default: m.SidebarReorganized })));
const PageTransition = lazyWithRetry(() => import("@/components/effects/PageTransition").then(m => ({ default: m.PageTransition })));

// Context providers must be imported synchronously (consumers render inside them)
import { SellerCartProvider } from "@/contexts/SellerCartContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

// Lazy-loaded non-critical UI components
const OnboardingTour = lazyWithRetry(() => import("@/components/onboarding/OnboardingTour").then(m => ({ default: m.OnboardingTour })));
const ExpertChatButton = lazyWithRetry(() => import("@/components/expert/ExpertChatButton").then(m => ({ default: m.ExpertChatButton })));
const EnhancedSpotlight = lazyWithRetry(() => import("@/components/common/EnhancedSpotlight").then(m => ({ default: m.EnhancedSpotlight })));
const SmartMobileNav = lazyWithRetry(() => import("@/components/mobile/SmartMobileNav").then(m => ({ default: m.SmartMobileNav })));
const QuickQuoteFAB = lazyWithRetry(() => import("@/components/quote/QuickQuoteFAB").then(m => ({ default: m.QuickQuoteFAB })));
const FloatingCompareBar = lazyWithRetry(() => import("@/components/compare/FloatingCompareBar").then(m => ({ default: m.FloatingCompareBar })));
const GlobalCommandBar = lazyWithRetry(() => import("@/components/command/GlobalCommandBar").then(m => ({ default: m.GlobalCommandBar })));
const ScrollToTopButton = lazyWithRetry(() => import("@/components/common/ScrollProgress").then(m => ({ default: m.ScrollToTopButton })));
const ScrollProgressIndicator = lazyWithRetry(() => import("@/components/common/ScrollProgress").then(m => ({ default: m.ScrollProgressIndicator })));
const PersistentBreadcrumbs = lazyWithRetry(() => import("@/components/common/PersistentBreadcrumbs").then(m => ({ default: m.PersistentBreadcrumbs })));

import { cn } from "@/lib/utils";
import { diagnostics } from "@/lib/diagnostics";
import { APIInspector } from "@/components/debug/APIInspector";




interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const isMockupGenerator = location.pathname === "/mockup-generator";
  const isHome = location.pathname === "/";

  useScrollLockFix();
  useGlobalShortcuts();

  useEffect(() => {
    diagnostics.log('event', 'MainLayout', 'MainLayout montado');
  }, []);


  // Propaga --breadcrumb-h ao :root para que stickys filhos (toolbars de
  // página) ancorem corretamente abaixo do Header + Breadcrumb. Em "/" a
  // breadcrumb-bar fica oculta → 0px.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--breadcrumb-h",
      isHome ? "0px" : "40px",
    );
  }, [isHome]);

  // Focus management: move focus to main content on route changes for screen readers
  const mainRef = useRef<HTMLElement>(null);
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      // Delay to allow page transition animation to start
      const timer = setTimeout(() => {
        mainRef.current?.focus({ preventScroll: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const layoutContent = (
    <div className="min-h-screen bg-background ambient-glow print:min-h-0" role="document">
      
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
      
      <div className="flex">
        <div className="print:hidden">
          <Suspense fallback={<div className="hidden lg:block w-64 h-screen flex-shrink-0" />}>
            <SidebarReorganized 
              isOpen={sidebarOpen} 
              onToggle={() => setSidebarOpen(!sidebarOpen)} 
            />
          </Suspense>
        </div>
        
        <div className="flex-1 flex flex-col min-h-screen min-w-0 print:min-h-0 isolate">
          {/* Header global — sem wrapper extra: sticky precisa do container
              flex-col como parent direto para grudar enquanto a página inteira
              estiver rolando. `print:hidden` é aplicado no próprio <header>
              via Suspense fallback abaixo. */}
          <Suspense fallback={<div style={{ height: 56 }} className="print:hidden" />}>
            <Header 
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </Suspense>

          {/* Breadcrumb persistente — sticky logo abaixo do Header.
              Usa --header-h (definido pelo Header) para acompanhar a altura
              dinâmica (compactado/expandido). Hierarquia: Header z-40 >
              Breadcrumb z-30 > conteúdo. Oculto na home "/". */}
          <div
            className={cn(
              "sticky top-[var(--header-h,56px)] z-30 print:hidden",
              "bg-background/85 backdrop-blur-md",
              "border-b border-border/40",
              isHome && "hidden",
            )}
            data-testid="breadcrumb-bar"
          >
            <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-2">
              <Suspense fallback={<div className="h-6" />}>
                <PersistentBreadcrumbs showBackButton />
              </Suspense>
            </div>
          </div>

          <main
            ref={mainRef}
            tabIndex={-1}
            id="main-content" 
            className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 sm:pb-20 lg:pb-6 print:p-0 print:pb-0 outline-none overflow-x-clip" 
            role="main"
            aria-label="Conteúdo principal"
          >
            
            <Suspense fallback={<div>{children}</div>}>
              <PageTransition variant="fade-slide" duration={0.2}>
                {children}
              </PageTransition>
            </Suspense>
          </main>
          
          
          <div className="print:hidden">
            <Suspense fallback={null}>
              <QuickQuoteFAB />
            </Suspense>
          </div>
        </div>
      </div>
      
      <div className="print:hidden">
        <Suspense fallback={null}>
          <ScrollProgressIndicator />
        </Suspense>
      </div>
      
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
      
      {/* Restrito a usuários com papel `dev` (gate interno via useDevGate) */}
      <APIInspector />
    </div>
  );


  return (
    <OnboardingProvider>
      <SellerCartProvider>
        <Suspense fallback={layoutContent}>
          <GlobalCommandBar>
            {layoutContent}
          </GlobalCommandBar>
        </Suspense>
      </SellerCartProvider>
    </OnboardingProvider>
  );
}
