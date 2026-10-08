/**
 * Cell renderer and helpers extracted from QuotesConfigurableList
 */
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDeliveryTime } from "@/components/pdf/ProposalHtmlTemplate";
import { QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";
import type { Quote } from "@/hooks/quotes/useQuotes";
import type { ReactNode } from "react";

const statusConfig = Object.fromEntries(
  Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => [k, { label: v.label, className: v.badgeClassName }])
) as Record<Quote["status"], { label: string; className?: string }>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

type CellRenderer = (quote: Quote, navigate: (path: string) => void) => ReactNode;

const quoteNumberCell: CellRenderer = quote => <span className="text-xs text-muted-foreground truncate font-mono">{quote.quote_number}</span>;

const clientCell: CellRenderer = (quote, navigate) => {
  const hasClient = Boolean(quote.client_name || quote.client_company);
  if (!hasClient) return <button className="text-xs text-primary/70 hover:text-primary flex items-center gap-1" onClick={event => { event.stopPropagation(); navigate(`/orcamentos/${quote.id}/editar`); }}><UserPlus className="h-3 w-3" /> Vincular cliente</button>;
  return <div className="flex flex-col min-w-0"><span className="text-sm font-semibold text-foreground truncate">{quote.client_company || quote.client_name}</span>{quote.client_cnpj && <span className="text-[10px] text-muted-foreground/70 font-mono truncate">{quote.client_cnpj}</span>}</div>;
};

const contactCell: CellRenderer = quote => quote.client_name && quote.client_company ? <span className="text-[0.975rem] text-muted-foreground truncate">{quote.client_name}</span> : <span className="text-xs text-muted-foreground/50">—</span>;

const statusCell: CellRenderer = quote => <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${statusConfig[quote.status]?.className || ""}`}>{quote.status === "pending" && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-info" /></span>}{statusConfig[quote.status]?.label}</Badge>;

const valueCell: CellRenderer = quote => <div className="flex items-center justify-end gap-2"><span className="text-sm font-bold text-foreground">{formatCurrency(quote.total || 0)}</span></div>;

const dateCell: CellRenderer = quote => <div className="space-y-0.5"><span className="text-sm text-foreground block">{quote.created_at ? format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</span><span className="text-[11px] text-muted-foreground block">{quote.created_at ? format(new Date(quote.created_at), "HH:mm", { locale: ptBR }) : ""}</span></div>;

const deliveryCell: CellRenderer = quote => {
  const full = quote.delivery_time ? formatDeliveryTime(quote.delivery_time) : "—";
  let compact = "—";
  if (quote.delivery_time?.startsWith("date:")) compact = full;
  else if (quote.delivery_time) compact = full.replace(/\s*dias?\s*após\s*aprovação/i, "d").replace(/\s*dias?\s*úteis/i, "d");
  return <Tooltip><TooltipTrigger asChild><span className="text-xs text-muted-foreground truncate block cursor-default">{compact}</span></TooltipTrigger><TooltipContent side="top" className="text-xs">{full}</TooltipContent></Tooltip>;
};

const CELL_RENDERERS: Partial<Record<string, CellRenderer>> = {
  quote_number: quoteNumberCell,
  client: clientCell,
  contact: contactCell,
  status: statusCell,
  value: valueCell,
  date: dateCell,
  delivery: deliveryCell,
};

export function renderQuoteCell(quote: Quote, columnId: string, navigate: (path: string) => void) {
  const renderer = CELL_RENDERERS[columnId];
  return renderer ? renderer(quote, navigate) : null;
}
