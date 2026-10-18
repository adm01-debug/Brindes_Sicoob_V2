import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AccessibilityProvider, AriaLiveProvider } from '@/components/a11y';
import { ThemeInitializer } from '@/components/system/ThemeInitializer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useGlobalErrorCatcher } from '@/hooks/useErrorHandler';
import { useWebVitals } from '@/hooks/infrastructure/useWebVitals';
import { markBootSuccessful } from '@/lib/chunk-recovery';
import { createQueryClient } from '@/lib/query-config';
import { appRouter } from '@/routes/app-router';
import './App.css';

const queryClient = createQueryClient();

export default function App() {
  useGlobalErrorCatcher();
  useWebVitals({ debug: import.meta.env.DEV });

  useEffect(() => {
    markBootSuccessful();
  }, []);

  return (
    <ErrorBoundary name="Root">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemeInitializer />
          <AccessibilityProvider>
            <AriaLiveProvider>
              <TooltipProvider>
                <RouterProvider router={appRouter} />
              </TooltipProvider>
            </AriaLiveProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
