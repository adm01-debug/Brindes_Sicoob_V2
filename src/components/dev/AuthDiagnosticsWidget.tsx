import React, { useState, useEffect, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, X, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDevGate } from "@/hooks/useDevGate";

interface DebugLog {
  ts: string;
  scope: string;
  message: string;
  data: any;
  type: 'info' | 'error';
}

export const AuthDiagnosticsWidget = forwardRef<HTMLDivElement>((_props, ref) => {
  const { isAllowed } = useDevGate();
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isAllowed) return;

    const checkDev = () => {
      // O useDevGate já cuida do papel, aqui apenas decidimos abrir automaticamente
      setIsOpen(true);
    };
    
    checkDev();
    
    const loadLogs = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('auth_debug_history') || '[]');
        setLogs(stored.reverse());
      } catch (e) {
        setLogs([]);
      }
    };

    loadLogs();
    window.addEventListener('auth_debug_update', loadLogs);
    window.addEventListener('storage', loadLogs);
    
    return () => {
      window.removeEventListener('auth_debug_update', loadLogs);
      window.removeEventListener('storage', loadLogs);
    };
  }, [isAllowed]);

  if (!isAllowed || !isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-md w-full animate-in slide-in-from-right-4">
      <Card className="border-primary/40 bg-background/95 backdrop-blur-md shadow-2xl ring-1 ring-primary/20">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              Diagnóstico de Autenticação
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/30 text-primary">Live</Badge>
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-muted-foreground hover:text-destructive" 
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        {!isMinimized && (
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] w-full bg-black/5 dark:bg-black/20">
              <div className="p-3 space-y-3">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                    <Terminal className="h-8 w-8 opacity-20" />
                    <p className="text-xs font-mono">Nenhum evento capturado...</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <Badge 
                            variant={log.type === 'error' ? 'destructive' : 'secondary'} 
                            className="text-[9px] h-3.5 px-1 font-mono uppercase shrink-0"
                          >
                            {log.scope}
                          </Badge>
                          <span className="text-[10px] font-mono text-foreground truncate font-semibold">
                            {log.message}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0 tabular-nums">
                          {new Date(log.ts).toLocaleTimeString()}
                        </span>
                      </div>
                      {log.data && (
                        <pre className="text-[9px] bg-black/40 p-1.5 rounded-md text-primary-foreground/80 overflow-auto max-h-32 font-mono scrollbar-none border border-white/5">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border/40 bg-muted/30 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground font-mono">
                {logs.length} eventos registrados
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 text-[9px] px-2 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  localStorage.removeItem('auth_debug_history');
                  setLogs([]);
                }}
              >
                Limpar Logs
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
