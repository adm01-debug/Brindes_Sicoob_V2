
import React, { useState, useEffect, forwardRef } from "react";
import { diagnostics, DiagnosticLog } from "@/lib/diagnostics";
import { 
  Terminal, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  AlertCircle,
  Database,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDevGate } from "@/hooks/useDevGate";

export const DiagnosticOverlay = forwardRef<HTMLDivElement>((_props, ref) => {
  const { isAllowed } = useDevGate();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isAllowed) return;
    setLogs(diagnostics.getLogs());
    return diagnostics.subscribe((log) => {
      setLogs(prev => [log, ...prev].slice(0, 100));
    });
  }, [isAllowed]);

  // Restrito a usuários com papel `dev` (via SSOT DevInfraGate)
  if (!isAllowed) {
    return null;
  }

  const getTypeIcon = (type: DiagnosticLog['type']) => {
    switch (type) {
      case 'request': return <ArrowRight className="h-3 w-3 text-blue-400" />;
      case 'response': return <Database className="h-3 w-3 text-green-400" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-400" />;
      default: return <Activity className="h-3 w-3 text-amber-400" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-mono text-[10px]">
      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOpen(true)}
              className="bg-black/80 text-white border-white/20 hover:bg-black gap-2 shadow-2xl backdrop-blur-md h-8"
            >
              <Terminal className="h-3.5 w-3.5" />
              Diagnóstico {logs.filter(l => l.type === 'error').length > 0 && (
                <Badge variant="destructive" className="h-4 px-1 min-w-[16px] text-[8px]">
                  {logs.filter(l => l.type === 'error').length}
                </Badge>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "bg-black/90 text-zinc-300 border border-white/10 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col transition-all duration-300",
              isMinimized ? "w-64 h-10" : "w-[400px] h-[500px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold text-white uppercase tracking-wider">Console de Diagnóstico</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-1">
                    {logs.length === 0 ? (
                      <div className="text-zinc-600 py-10 text-center italic">
                        Nenhum log capturado ainda...
                      </div>
                    ) : (
                      logs.map((log, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "group p-1.5 rounded border border-transparent transition-colors",
                            log.type === 'error' ? "bg-red-500/10 border-red-500/20" : "hover:bg-white/5"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-zinc-600 flex-shrink-0 mt-0.5">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="flex-shrink-0 mt-0.5">{getTypeIcon(log.type)}</span>
                            <div className="min-w-0 flex-1">
                              <span className="text-primary/70 font-bold mr-2">[{log.source}]</span>
                              <span className={cn(
                                "break-words",
                                log.type === 'error' ? "text-red-400" : "text-zinc-200"
                              )}>
                                {log.message}
                              </span>
                              {log.data && (
                                <div className="mt-1 text-[9px] text-zinc-500 bg-black/40 p-1.5 rounded border border-white/5 overflow-x-auto max-h-32">
                                  <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t border-white/10 flex justify-between bg-black/40">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 text-[9px] hover:bg-white/5"
                    onClick={() => diagnostics.clearLogs()}
                  >
                    Limpar Logs
                  </Button>
                  <span className="text-[9px] text-zinc-600 flex items-center">
                    {logs.length} logs na sessão
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

DiagnosticOverlay.displayName = 'DiagnosticOverlay';
