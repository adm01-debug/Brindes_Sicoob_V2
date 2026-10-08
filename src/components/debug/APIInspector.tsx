import { useState, useEffect } from "react";
import { diagnostics, type DiagnosticLog } from "@/lib/diagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Activity, X, ChevronRight, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDevGate } from "@/hooks/useDevGate";

export function APIInspector() {
  const { isAllowed } = useDevGate();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    if (!isAllowed) return;
    const unsubscribe = diagnostics.subscribe((log) => {
      setLogs(prev => [log, ...prev].slice(0, 50));
    });
    setLogs(diagnostics.getLogs().slice(0, 50));
    return unsubscribe;
  }, [isAllowed]);

  // Restrito a usuários com papel `dev` (via SSOT DevInfraGate)
  if (!isAllowed) return null;

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="fixed bottom-4 right-4 z-[9999] shadow-lg gap-2 border border-primary/20 bg-background/80 backdrop-blur-sm"
        onClick={() => setIsOpen(true)}
      >
        <Database className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">API Inspector</span>
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 z-[9999] shadow-2xl border-primary/20 w-80 flex flex-col transition-all duration-300 bg-background/95 backdrop-blur-md overflow-hidden",
      isMinimized ? "h-12" : "h-[400px]"
    )}>
      <CardHeader className="p-3 flex flex-row items-center justify-between border-b space-y-0 shrink-0">
        <div 
          className="flex items-center gap-2 cursor-pointer flex-1" 
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider">Live API Traffic</CardTitle>
          {isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  No requests captured yet...
                </div>
              ) : (
                logs.map((log, i) => {
                  const isRpc = log.message.includes('/rpc/');
                  const tableName = log.message.split('/').pop()?.split('?')[0] || '';
                  
                  return (
                    <div key={i} className="text-[10px] border rounded p-2 bg-muted/30 font-mono overflow-hidden">
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant={log.type === 'error' ? 'destructive' : 'outline'} className="text-[8px] h-4 px-1 uppercase">
                          {log.type}
                        </Badge>
                        <span className="text-muted-foreground scale-90 origin-right">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="break-all font-bold text-primary/80 mb-1">
                        {log.message}
                      </div>
                      {isRpc && (
                        <div className="text-accent font-bold">
                          RPC: {log.message.split('/rpc/')[1]?.split('?')[0]}
                        </div>
                      )}
                      {!isRpc && tableName && (
                        <div className="text-brand font-bold">
                          Table: {tableName}
                        </div>
                      )}
                      {log.data !== null && log.data !== undefined && (
                        <pre className="mt-1 text-[8px] text-muted-foreground max-h-20 overflow-auto bg-black/5 p-1 rounded">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
