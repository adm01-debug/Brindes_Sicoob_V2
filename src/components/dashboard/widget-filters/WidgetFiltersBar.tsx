/**
 * WidgetFiltersBar — barra compacta de filtros usada nos widgets do dashboard
 * (Minhas Propostas, Meus Pedidos, Solicitações de Desconto).
 *
 * Provê: busca textual, seleção de status (multi via Select com "Todos") e
 * intervalo de datas (DateRange popover). Tudo controlado pelo pai.
 */
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Search, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface WidgetFiltersValue {
  search: string;
  status: string; // "all" ou um valor da lista
  dateRange?: DateRange;
}

export interface WidgetStatusOption {
  value: string;
  label: string;
}

interface Props {
  value: WidgetFiltersValue;
  onChange: (next: WidgetFiltersValue) => void;
  statusOptions: WidgetStatusOption[];
  searchPlaceholder?: string;
  /** Texto exibido como item "Todos" no Select de status. */
  allStatusLabel?: string;
  /** Quando false, oculta o seletor de intervalo de datas. Default: true. */
  showDateRange?: boolean;
}

export const EMPTY_FILTERS: WidgetFiltersValue = {
  search: "",
  status: "all",
  dateRange: undefined,
};

function dateRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return "Período";
  if (range.to) return `${format(range.from, "dd/MM")} – ${format(range.to, "dd/MM")}`;
  return format(range.from, "dd/MM/yyyy");
}

function DateRangeFilter({ range, onChange }: { range: DateRange | undefined; onChange: (range: DateRange | undefined) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("h-8 px-2 text-xs gap-1.5 font-normal", !range?.from && "text-muted-foreground")}><CalendarIcon className="h-3.5 w-3.5" />{dateRangeLabel(range)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar mode="range" numberOfMonths={2} selected={range} onSelect={onChange} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} /></PopoverContent></Popover>;
}

function SearchFilter({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return <div className="relative flex-1 min-w-[140px]"><Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" /><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-8 pl-7 text-xs" /></div>;
}

function StatusFilter({ value, options, allLabel, onChange }: { value: string; options: WidgetStatusOption[]; allLabel: string; onChange: (value: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="h-8 w-auto min-w-[110px] text-xs"><SelectValue placeholder={allLabel} /></SelectTrigger><SelectContent><SelectItem value="all">{allLabel}</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

export function WidgetFiltersBar({
  value,
  onChange,
  statusOptions,
  searchPlaceholder = "Buscar…",
  allStatusLabel = "Todos os status",
  showDateRange = true,
}: Props) {
  const hasAnyFilter =
    value.search.trim().length > 0 ||
    value.status !== "all" ||
    !!value.dateRange?.from;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <SearchFilter value={value.search} placeholder={searchPlaceholder} onChange={(search) => onChange({ ...value, search })} />
      <StatusFilter value={value.status} options={statusOptions} allLabel={allStatusLabel} onChange={(status) => onChange({ ...value, status })} />

      {showDateRange ? <DateRangeFilter range={value.dateRange} onChange={(dateRange) => onChange({ ...value, dateRange })} /> : null}

      {hasAnyFilter && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => onChange(EMPTY_FILTERS)}
          title="Limpar filtros"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/**
 * Helpers compartilhados para aplicar filtros sobre listas em memória.
 */
export function withinDateRange(iso: string | null | undefined, range?: DateRange): boolean {
  if (!range?.from) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const from = new Date(range.from).setHours(0, 0, 0, 0);
  const to = range.to
    ? new Date(range.to).setHours(23, 59, 59, 999)
    : new Date(range.from).setHours(23, 59, 59, 999);
  return t >= from && t <= to;
}

export function matchesSearch(haystacks: Array<string | null | undefined>, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => (h ?? "").toLowerCase().includes(q));
}
