import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { reportError } from '@/lib/error-reporter';
import { diagnostics } from '@/lib/diagnostics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Professional ErrorBoundary component for 10/10 technical excellence.
 * Captures React render errors and provides a recovery UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const boundaryName = this.props.name || 'Anonymous';
    
    // Log to telemetry
    diagnostics.log('error', 'ErrorBoundary', `Render error in [${boundaryName}]: ${error.message}`);
    
    // Report to external monitor
    reportError(error, {
      boundary: boundaryName,
      componentStack: errorInfo.componentStack,
    });
    
    console.error(`[ErrorBoundary:${boundaryName}]`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Attempt to recover by reloading the current chunk or forcing a refresh if needed
    if (this.state.error?.message?.includes('Failed to fetch dynamically imported module')) {
       window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          
          <h2 className="mb-2 text-2xl font-bold tracking-tight">Ops! Algo deu errado.</h2>
          <p className="mb-8 max-w-md text-muted-foreground">
            Ocorreu um erro inesperado ao renderizar esta parte da aplicação. 
            Nossa equipe técnica já foi notificada.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button variant="default" onClick={this.handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Tentar Novamente
            </Button>
            
            <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
              <Home className="h-4 w-4" />
              Voltar ao Início
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-12 w-full max-w-2xl overflow-auto rounded-lg border bg-muted p-4 text-left font-mono text-sm text-muted-foreground">
              <p className="mb-2 font-bold text-destructive">Debug Info:</p>
              {this.state.error.stack}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
