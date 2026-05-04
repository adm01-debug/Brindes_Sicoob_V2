/**
 * Http412Inspector — overlay flutuante que exibe em tempo real
 * todas as respostas HTTP 412 (e 428) capturadas pelo interceptor
 * em `src/lib/http-412-logger.ts`.
 *
 * Visível em DEV ou quando há entradas (mesmo em PROD do preview),
 * para que a falha de pré-condição apareça diretamente na UI.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Trash2, X } from "lucide-react";
import { http412Logger, type Http412Entry } from "@/lib/http-412-logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function Http412Inspector() {
  const [entries, setEntries] = useState<Http412Entry[]>(() => http412Logger.getEntries());
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setEntries(http412Logger.getEntries());
    return http412Logger.subscribe(setEntries);
  }, []);

  // Auto-abre ao receber primeiro 412
  useEffect(() => {
    if (entries.length > 0 && !open) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  if (entries.length === 0 && !import.meta.env.DEV) return null;

  if (!open) {
    return (
      <Button
        variant="destructive"
        size="sm"
        className="fixed bottom-4 left-4 z-[9999] shadow-lg gap-2"
        onClick={() => setOpen(true)}
        data-testid="http-412-inspector-toggle"
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs font-semibold">HTTP 412 ({entries.length})</span>
      </Button>
    );
  }

  return (
    <Card
      className="fixed bottom-4 left-4 z-[9999] w-[420px] max-h-[500px] flex flex-col shadow-2xl border-destructive/30 bg-background/95 backdrop-blur-md"
      data-testid="http-412-inspector"
    >
      <CardHeader className="p-3 flex flex-row items-center justify-between border-b shrink-0 space-y-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider">
            HTTP 412 Inspector
          </CardTitle>
          <Badge variant="destructive" className="text-[10px] h-5">
            {entries.length}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => http412Logger.clear()}
            title="Limpar logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full max-h-[440px]">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground italic">
              Nenhum erro 412 capturado. Aguardando...
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {entries.map((entry) => {
                const isExpanded = expanded === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="border border-destructive/20 rounded-md bg-destructive/5 text-[11px] overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-start gap-2 p-2 text-left hover:bg-destructive/10 transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 mt-0.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">
                            {entry.status}
                          </Badge>
                          <span className="font-mono font-bold">{entry.method}</span>
                          <span className="text-muted-foreground text-[10px] ml-auto">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] break-all text-foreground/80">
                          {entry.url}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className={cn("p-2 pt-0 space-y-2 border-t border-destructive/20")}>
                        <Section title="Request Headers" data={entry.requestHeaders} />
                        <Section title="Response Headers" data={entry.responseHeaders} />
                        {entry.responseBodyPreview && (
                          <div>
                            <div className="font-bold text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                              Response Body (preview)
                            </div>
                            <pre className="bg-black/5 p-1.5 rounded text-[10px] max-h-32 overflow-auto whitespace-pre-wrap break-all">
                              {entry.responseBodyPreview}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Section({ title, data }: { title: string; data: Record<string, string> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="font-bold text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </div>
      <div className="bg-black/5 rounded p-1.5 font-mono text-[10px] space-y-0.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-primary/80 font-semibold shrink-0">{k}:</span>
            <span className="break-all">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
