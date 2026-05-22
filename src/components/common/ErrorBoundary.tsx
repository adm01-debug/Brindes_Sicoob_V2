import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Home, Copy, Check } from 'lucide-react';
import { reportError, isTransientEdgeRuntimeError } from '@/lib/error-reporter';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

/**
 * Professional ErrorBoundary component for 10/10 technical excellence.
 * Captures React render errors and provides a recovery UI with structured telemetry.
 */
export class ErrorBoundary extends Component<Props, State> {
  private log = createClientLogger('ui.ErrorBoundary');

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const boundaryName = this.props.name || 'Anonymous';
    
    this.setState({ errorInfo });

    // Log to structured telemetry
    this.log.error('render_crash', {
      boundary: boundaryName,
      message: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 2000),
      url: window.location.href,
      isTransient: isTransientEdgeRuntimeError(error)
    });
    
    // Report to external monitor with high severity if not transient
    reportError(error, {
      type: 'react_error_boundary',
      boundary: boundaryName,
      componentStack: errorInfo.componentStack,
      severity: isTransientEdgeRuntimeError(error) ? 'warning' : 'critical'
    });
  }

  private handleReset = () => {
    this.log.info('recovery_attempt', { method: 'reset_state' });
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Auto-reload on chunk failures (likely stale deployment)
    if (this.state.error?.name === 'ChunkLoadError' || 
        this.state.error?.message?.includes('Failed to fetch dynamically imported module')) {
       this.log.warn('stale_chunk_detected', { action: 'force_reload' });
       window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.log.info('recovery_attempt', { method: 'go_home' });
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const { error, errorInfo } = this.state;
    const details = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      toast.success('Detalhes do erro copiados!');
      setTimeout(() => this.setState({ copied: false }), 3000);
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = this.state.error?.name === 'ChunkLoadError' || 
                          this.state.error?.message?.includes('Failed to fetch dynamically imported module');

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="mb-6 rounded-full bg-destructive/10 p-4 ring-8 ring-destructive/5">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            {isChunkError ? 'Atualização Necessária' : 'Ops! Algo deu errado'}
          </h2>
          
          <p className="mb-8 max-w-md text-muted-foreground leading-relaxed">
            {isChunkError 
              ? 'Uma nova versão do sistema está disponível. Clique abaixo para atualizar sua sessão.'
              : 'Ocorreu um erro inesperado ao renderizar esta parte da aplicação. Nossa equipe técnica já foi notificada e está trabalhando na correção.'}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button 
              variant="default" 
              onClick={this.handleReset} 
              className="gap-2 px-6 shadow-md hover:shadow-lg transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              {isChunkError ? 'Atualizar Agora' : 'Tentar Novamente'}
            </Button>
            
            <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
              <Home className="h-4 w-4" />
              Voltar ao Início
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={this.copyErrorDetails} 
              className="text-xs text-muted-foreground gap-2"
            >
              {this.state.copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {this.state.copied ? 'Copiado' : 'Copiar Detalhes'}
            </Button>
          </div>
          
          {/* Debug view for dev environment only */}
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-12 w-full max-w-3xl overflow-hidden rounded-xl border border-border/50 bg-muted/30 p-0 text-left shadow-sm">
              <div className="bg-muted px-4 py-2 border-b border-border/50 flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Console de Diagnóstico (DEV)</span>
                <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-bold">{this.state.error.name}</span>
              </div>
              <div className="p-4 overflow-auto max-h-[300px] font-mono text-xs text-muted-foreground">
                <p className="mb-2 font-bold text-destructive underline decoration-destructive/30 underline-offset-4">{this.state.error.message}</p>
                <pre className="whitespace-pre-wrap opacity-80">{this.state.error.stack}</pre>
                {this.state.errorInfo && (
                  <>
                    <hr className="my-4 border-border/30" />
                    <p className="mb-2 font-bold text-foreground/70">Component Stack:</p>
                    <pre className="whitespace-pre-wrap opacity-60 text-[10px]">{this.state.errorInfo.componentStack}</pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
