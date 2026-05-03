import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

export function CriticalErrorOverlay() {
  const [error, setError] = useState<{ message: string; type: string; details?: string } | null>(null);

  const handleCriticalError = useCallback((e: any) => {
    setError({
      message: e.detail?.message || "Ocorreu um erro inesperado.",
      type: e.detail?.type || "unknown",
      details: e.detail?.error?.message || e.detail?.error?.toString()
    });
  }, []);

    window.addEventListener('app-critical-error', handleCriticalError);
    return () => window.removeEventListener('app-critical-error', handleCriticalError);
  }, []);

  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Alert variant="destructive" className="border-2 shadow-2xl bg-destructive/5">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 bg-destructive/10 rounded-full">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 space-y-3">
                <AlertTitle className="text-xl font-bold flex items-center justify-between">
                  Falha Crítica Detectada
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setError(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </AlertTitle>
                <AlertDescription className="text-base">
                  <p className="font-medium text-destructive mb-1">{error.message}</p>
                  {error.details && (
                    <p className="text-[10px] font-mono opacity-60 mb-3 bg-destructive/5 p-1 rounded truncate">
                      {error.details}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    O sistema detectou uma instabilidade que pode afetar a integridade dos dados. 
                    Recomendamos recarregar a aplicação.
                  </p>
                </AlertDescription>
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="destructive" 
                    className="flex-1 gap-2"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Recarregar Agora
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setError(null)}
                  >
                    Ignorar (Não recomendado)
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
