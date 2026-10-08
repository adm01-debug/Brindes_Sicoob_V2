import { type MutableRefObject, type ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionTab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface ProductSectionNavProps {
  tabs: SectionTab[];
  className?: string;
}

function SectionTabButton({ tab, active, onClick }: { tab: SectionTab; active: boolean; onClick: (id: string) => void }) {
  return <button data-tab={tab.id} onClick={() => onClick(tab.id)} className={cn("relative whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full transition-colors shrink-0", active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}>{tab.icon && <span className="mr-1.5">{tab.icon}</span>}{tab.label}{active && <motion.div layoutId="section-nav-indicator" className="absolute inset-0 bg-secondary rounded-full -z-10" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}</button>;
}

function useSectionObserver(tabs: SectionTab[], isClickScrolling: MutableRefObject<boolean>, setActiveId: (id: string) => void) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (isClickScrolling.current) return;
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 });
    tabs.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [isClickScrolling, setActiveId, tabs]);
}

/**
 * Scroll-spy tab navigation for product detail sections.
 * Highlights the active section as user scrolls.
 */
export function ProductSectionNav({ tabs, className }: ProductSectionNavProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id || "");
  const navRef = useRef<HTMLDivElement>(null);
  const isClickScrolling = useRef(false);

  useSectionObserver(tabs, isClickScrolling, setActiveId);

  const handleClick = useCallback((id: string) => {
    setActiveId(id);
    isClickScrolling.current = true;
    
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Reset flag after scroll animation
      setTimeout(() => { isClickScrolling.current = false; }, 800);
    }
  }, []);

  // Scroll active tab into view within the nav bar
  useEffect(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector(`[data-tab="${activeId}"]`);
    if (activeBtn) {
      (activeBtn as HTMLElement).scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  if (tabs.length < 2) return null;

  return (
    <div
      ref={navRef}
      className={cn(
        "sticky top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))] z-40 flex gap-1 overflow-x-auto scrollbar-hide",
        "bg-background/95 backdrop-blur-md border-b border-border",
        "-mx-4 px-4 md:-mx-0 md:px-0 py-1.5",
        className
      )}
    >
      {tabs.map((tab) => <SectionTabButton key={tab.id} tab={tab} active={activeId === tab.id} onClick={handleClick} />)}
    </div>
  );
}
