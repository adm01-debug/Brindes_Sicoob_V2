import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";

/**
 * ARIA Live Regions for dynamic content announcements
 * WCAG 2.2 AA: 4.1.3 Status Messages
 */

interface AriaLiveContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
  announceStatus: (message: string) => void;
  announceAlert: (message: string) => void;
  announceProgress: (current: number, total: number, label?: string) => void;
}

const AriaLiveContext = createContext<AriaLiveContextType | null>(null);

export function useAriaLive() {
  const context = useContext(AriaLiveContext);
  if (!context) {
    throw new Error("useAriaLive must be used within an AriaLiveProvider");
  }
  return context;
}

import { forwardRef } from 'react';

export const AriaLiveProvider = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [progressMessage, setProgressMessage] = useState("");

  // Clear messages after announcement
  useEffect(() => {
    if (politeMessage) {
      const timer = setTimeout(() => setPoliteMessage(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [politeMessage]);

  useEffect(() => {
    if (assertiveMessage) {
      const timer = setTimeout(() => setAssertiveMessage(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [assertiveMessage]);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (priority === "assertive") {
      setAssertiveMessage(message);
    } else {
      setPoliteMessage(message);
    }
  }, []);

  const announceStatus = useCallback((message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 1000);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const { message, priority = 'polite' } = e.detail || {};
      if (message) announce(message, priority);
    };
    window.addEventListener('a11y-announce', handler);
    return () => window.removeEventListener('a11y-announce', handler);
  }, [announce]);

  const announceAlert = (message: string) => {
    setAssertiveMessage(message);
  };

  const announceProgress = (current: number, total: number, label = "Progresso") => {
    const percentage = Math.round((current / total) * 100);
    setProgressMessage(`${label}: ${percentage}% completo, ${current} de ${total}`);
    setTimeout(() => setProgressMessage(""), 1500);
  };

  return (
    <AriaLiveContext.Provider
      value={{
        announce,
        announceStatus,
        announceAlert,
        announceProgress,
      }}
    >
      <div ref={ref}>
        {children}

        {/* Polite announcements - non-interruptive */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {politeMessage}
        </div>

        {/* Assertive announcements - interruptive */}
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        >
          {assertiveMessage}
        </div>

        {/* Status messages */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {statusMessage}
        </div>

        {/* Progress announcements */}
        <div
          role="progressbar"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {progressMessage}
        </div>
      </div>
    </AriaLiveContext.Provider>
  );
});

AriaLiveProvider.displayName = 'AriaLiveProvider';

/**
 * Component to announce page navigation
 */
export const RouteAnnouncer = forwardRef<HTMLDivElement, { title: string }>(({ title }, _ref) => {
  const { announce } = useAriaLive();

  useEffect(() => {
    announce(`Navegou para ${title}`);
  }, [title, announce]);

  return null;
});

RouteAnnouncer.displayName = 'RouteAnnouncer';

/**
 * Component for announcing loading states
 */
interface LoadingAnnouncerProps {
  isLoading: boolean;
  loadingMessage?: string;
  loadedMessage?: string;
}

export const LoadingStateAnnouncer = forwardRef<HTMLDivElement, LoadingAnnouncerProps>(({
  isLoading,
  loadingMessage = "Carregando conteúdo",
  loadedMessage = "Conteúdo carregado"
}, _ref) => {
  const { announce } = useAriaLive();

  useEffect(() => {
    if (isLoading) {
      announce(loadingMessage);
    } else {
      announce(loadedMessage);
    }
  }, [isLoading, loadingMessage, loadedMessage, announce]);

  return null;
});

LoadingStateAnnouncer.displayName = 'LoadingStateAnnouncer';

/**
 * Component for announcing form errors
 */
interface FormErrorAnnouncerProps {
  errors: string[];
}

export const FormErrorAnnouncer = forwardRef<HTMLDivElement, FormErrorAnnouncerProps>(({ errors }, _ref) => {
  const { announceAlert } = useAriaLive();

  useEffect(() => {
    if (errors.length > 0) {
      const message = errors.length === 1
        ? `Erro: ${errors[0]}`
        : `${errors.length} erros encontrados. ${errors.join(". ")}`;
      announceAlert(message);
    }
  }, [errors, announceAlert]);

  return null;
});

FormErrorAnnouncer.displayName = 'FormErrorAnnouncer';

/**
 * Component for announcing action results
 */
interface ActionResultAnnouncerProps {
  result: { type: "success" | "error"; message: string } | null;
}

export const ActionResultAnnouncer = forwardRef<HTMLDivElement, ActionResultAnnouncerProps>(({ result }, _ref) => {
  const { announce, announceAlert } = useAriaLive();

  useEffect(() => {
    if (result) {
      if (result.type === "error") {
        announceAlert(result.message);
      } else {
        announce(result.message);
      }
    }
  }, [result, announce, announceAlert]);

  return null;
});

ActionResultAnnouncer.displayName = 'ActionResultAnnouncer';

/**
 * Component for announcing list/table updates
 */
interface ListUpdateAnnouncerProps {
  count: number;
  itemName?: string;
  action?: "loaded" | "filtered" | "sorted" | "updated";
}

export const ListUpdateAnnouncer = forwardRef<HTMLDivElement, ListUpdateAnnouncerProps>(({ 
  count, 
  itemName = "item",
  action = "loaded" 
}, _ref) => {
  const { announceStatus } = useAriaLive();

  useEffect(() => {
    const actionMessages = {
      loaded: "carregados",
      filtered: "filtrados",
      sorted: "ordenados",
      updated: "atualizados"
    };
    
    const itemLabel = count === 1 ? itemName : `${itemName}s`;
    announceStatus(`${count} ${itemLabel} ${actionMessages[action]}`);
  }, [count, itemName, action, announceStatus]);

  return null;
});

ListUpdateAnnouncer.displayName = 'ListUpdateAnnouncer';
