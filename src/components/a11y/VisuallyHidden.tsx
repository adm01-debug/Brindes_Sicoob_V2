import React, { type ReactNode, forwardRef } from "react";

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 * Use for descriptive text that provides context for assistive technologies.
 */
export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(({ children, as: component = "span" }, ref) => {
  const Component = component;
  return (
    <Component ref={ref as any} className="sr-only">
      {children}
    </Component>
  );
});

VisuallyHidden.displayName = 'VisuallyHidden';

/**
 * Announces content to screen readers using ARIA live regions.
 * Use for dynamic content updates that should be announced.
 */
interface LiveRegionProps {
  children: ReactNode;
  politeness?: "polite" | "assertive" | "off";
  atomic?: boolean;
}

export const LiveRegion = forwardRef<HTMLDivElement, LiveRegionProps>(({ 
  children, 
  politeness = "polite", 
  atomic = true 
}, ref) => {
  return (
    <div 
      ref={ref}
      role="status" 
      aria-live={politeness} 
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
});

LiveRegion.displayName = 'LiveRegion';

/**
 * Provides accessible loading announcements.
 */
interface LoadingAnnouncerProps {
  isLoading: boolean;
  loadingMessage?: string;
  loadedMessage?: string;
}

export const LoadingAnnouncer = forwardRef<HTMLDivElement, LoadingAnnouncerProps>(({ 
  isLoading, 
  loadingMessage = "Carregando...",
  loadedMessage = "Conteúdo carregado"
}, ref) => {
  return (
    <LiveRegion ref={ref} politeness="polite">
      {isLoading ? loadingMessage : loadedMessage}
    </LiveRegion>
  );
});

LoadingAnnouncer.displayName = 'LoadingAnnouncer';
