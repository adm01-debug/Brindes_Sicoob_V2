import { isNullish } from "@/components/admin/utils/nullish";
import { useState, type ReactNode } from "react";
import { ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { NormalizedSecretError } from "./secretErrors";
import type { TestDetails } from "@/hooks/useConnectionTestDetails";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: NormalizedSecretError;
  details?: TestDetails | null;
  loading?: boolean;
  /** Optional title override for the dialog. */
  title?: string;
}

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border bg-card">
      <CollapsibleTrigger
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1 text-xs space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono break-all">{v ?? <em className="text-muted-foreground">—</em>}</span>
    </div>
  );
}

function fmtMs(n: number | null | undefined): string {
  if (isNullish(n)) return "—";
  return `${n} ms`;
}

function hasTimingData(details: TestDetails): boolean {
  return [
    details.timing.dns_ms,
    details.timing.tcp_ms,
    details.timing.tls_ms,
    details.timing.ttfb_ms,
    details.timing.download_ms,
    details.timing.latency_ms,
  ].some(value => !isNullish(value));
}

function TimingSection({ details }: { details: TestDetails }) {
  if (!hasTimingData(details)) return null;
  const values = [
    ["DNS", details.timing.dns_ms],
    ["TCP", details.timing.tcp_ms],
    ["TLS", details.timing.tls_ms],
    ["TTFB", details.timing.ttfb_ms],
    ["Download", details.timing.download_ms],
    ["Total", details.timing.latency_ms],
  ] as const;
  return (
    <Section title="Timing detalhado">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {values.map(([label, value]) => (
          <div key={label} className="rounded border bg-muted/30 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="font-mono text-sm">{fmtMs(value)}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function RawResponseSection({ details }: { details: TestDetails }) {
  const headerEntries = Object.entries(details.response.headers ?? {});
  return (
    <Section title="Resposta crua" defaultOpen={false}>
      {headerEntries.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Headers</div>
          <div className="rounded border bg-muted/30 divide-y">
            {headerEntries.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[160px_1fr] gap-2 px-2 py-1">
                <span className="text-muted-foreground font-mono break-all">{key}</span>
                <span className="font-mono break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-muted-foreground">Sem headers registrados.</p>}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Body {details.response.truncated && <span className="text-warning">(truncado)</span>}
        </div>
        {details.response.body ? (
          <pre className="rounded border bg-muted/30 p-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">{details.response.body}</pre>
        ) : <p className="text-muted-foreground">Sem corpo registrado.</p>}
      </div>
    </Section>
  );
}

function TechnicalErrorSection({ details }: { details: TestDetails }) {
  if (!details.error) return null;
  return (
    <Section title="Erro técnico">
      <KV k="Tipo" v={details.error.kind ?? "—"} />
      <KV k="Mensagem" v={details.error.message} />
      {!isNullish(details.error.timeout_ms) && <KV k="Timeout" v={fmtMs(details.error.timeout_ms)} />}
    </Section>
  );
}

function DetailsSections({ details }: { details: TestDetails }) {
  return (
    <>
      <Section title="HTTP">
        <KV k="Método" v={details.request.method} />
        <KV k="URL" v={details.request.url} />
        <KV k="Status" v={details.response.status} />
        <KV k="Latência total" v={fmtMs(details.timing.latency_ms)} />
        <KV k="Testado em" v={new Date(details.tested_at).toLocaleString("pt-BR")} />
        <KV k="Disparo" v={details.triggered_by} />
        {details.triggered_by_user_email && <KV k="Usuário" v={details.triggered_by_user_email} />}
      </Section>
      <TimingSection details={details} />
      <RawResponseSection details={details} />
      <TechnicalErrorSection details={details} />
    </>
  );
}

function DetailsContent({ loading, details }: { loading: boolean | undefined; details: TestDetails | null | undefined }) {
  if (loading) {
    return <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }
  if (!details) {
    return <div className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">Sem registro de teste disponível para esta conexão ainda.</div>;
  }
  return <DetailsSections details={details} />;
}

function DetailsDialogHeader({ error, title, loading, onCopy }: Pick<Props, "error" | "title" | "loading"> & { onCopy: () => void }) {
  return (
    <DialogHeader>
      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="min-w-0">
          <DialogTitle className="flex items-center gap-2 flex-wrap"><Badge variant="outline" className="border-destructive/40 text-destructive text-[10px] uppercase tracking-wide font-semibold">{error.categoryLabel}</Badge><span className="break-words">{title ?? error.title}</span></DialogTitle>
          <DialogDescription className="mt-1">Telemetria completa do último teste registrado para esta credencial.</DialogDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onCopy} disabled={loading} className="shrink-0 h-8"><Copy className="h-3.5 w-3.5 mr-1" />Copiar JSON</Button>
      </div>
    </DialogHeader>
  );
}

function ErrorSummarySection({ error }: Pick<Props, "error">) {
  return <Section title="Resumo" defaultOpen><KV k="Categoria" v={error.categoryLabel} /><KV k="Título" v={error.title} /><KV k="Descrição" v={<span className="font-sans">{error.description}</span>} />{error.hint && <KV k="Sugestão" v={<span className="font-sans">{error.hint}</span>} />}<KV k="Código" v={error.code} /></Section>;
}

export function ErrorDetailsDialog({
  open,
  onOpenChange,
  error,
  details,
  loading,
  title,
}: Props) {
  const handleCopy = async () => {
    try {
      const payload = JSON.stringify({ error, details }, null, 2);
      await navigator.clipboard.writeText(payload);
      toast.success("JSON copiado", { description: "Cole no chamado de suporte." });
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DetailsDialogHeader error={error} title={title} loading={loading} onCopy={handleCopy} />

        <div className="space-y-3">
          <ErrorSummarySection error={error} />

          <DetailsContent loading={loading} details={details} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
