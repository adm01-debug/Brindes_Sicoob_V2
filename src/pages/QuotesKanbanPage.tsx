import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { QuoteKanbanBoard } from '@/components/quotes/QuoteKanbanBoard';
import { QuoteBulkActionsToolbar } from '@/components/quotes/QuoteBulkActionsToolbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  List,
  Building2,
  Search,
  X,
  User,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useQuotes } from '@/hooks/quotes/useQuotes';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRBAC } from '@/hooks/useRBAC';
import type { DateRange } from 'react-day-picker';

type QuoteRow = ReturnType<typeof useQuotes>['quotes'][number];

function quoteMatchesSearch(quote: QuoteRow, search: string) {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [quote.quote_number ?? '', quote.client_name ?? '', quote.client_company ?? ''].some(
    (value) => value.toLowerCase().includes(normalized),
  );
}

function quoteMatchesDateRange(quote: QuoteRow, range: DateRange) {
  if (!quote.created_at) return !range.from && !range.to;
  const createdAt = new Date(quote.created_at);
  if (range.from && createdAt < range.from) return false;
  if (range.to && createdAt > range.to) return false;
  return true;
}

function quoteMatchesFilters(
  quote: QuoteRow,
  {
    search,
    clientId,
    sellerId,
    dateRange,
  }: {
    search: string;
    clientId: string;
    sellerId: string;
    dateRange: DateRange;
  },
) {
  if (!quoteMatchesSearch(quote, search)) return false;
  if (clientId !== 'all' && quote.client_id !== clientId) return false;
  if (sellerId !== 'all' && quote.seller_id !== sellerId) return false;
  return quoteMatchesDateRange(quote, dateRange);
}

function getDateRangeLabel(range: DateRange) {
  if (!range.from) return 'Data';
  if (!range.to) return format(range.from, 'dd/MM');
  return `${format(range.from, 'dd/MM')} - ${format(range.to, 'dd/MM')}`;
}

function QuotesKanbanHeader({
  search,
  onSearchChange,
  clients,
  selectedClientId,
  onClientChange,
  sellers,
  selectedSellerId,
  onSellerChange,
  isSupervisor,
  dateRange,
  onDateRangeChange,
  onBack,
  onNew,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  clients: Array<{ id: string; name: string }>;
  selectedClientId: string;
  onClientChange: (value: string) => void;
  sellers: Array<{ id: string; name: string }>;
  selectedSellerId: string;
  onSellerChange: (value: string) => void;
  isSupervisor: boolean;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onBack: () => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1
            data-testid="page-title-orcamentos-funil"
            className="font-display text-2xl font-bold text-foreground"
          >
            Funil de Orçamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize e gerencie seu pipeline comercial
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nº ou Cliente..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 pl-9"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Select value={selectedClientId} onValueChange={onClientChange}>
          <SelectTrigger className="h-9 w-[180px]">
            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSupervisor && (
          <Select value={selectedSellerId} onValueChange={onSellerChange}>
            <SelectTrigger className="h-9 w-[180px]">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  {seller.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {getDateRangeLabel(dateRange)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(range) => onDateRangeChange(range ?? { from: undefined })}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        <div className="flex rounded-lg bg-muted p-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onBack}>
            <List className="mr-1 h-3.5 w-3.5" />
            Lista
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 bg-background px-2 text-xs shadow-sm"
            disabled
          >
            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
            Kanban
          </Button>
        </div>
        <Button onClick={onNew} size="sm" className="h-9 shadow-sm">
          <Plus className="mr-1 h-4 w-4" />
          Novo
        </Button>
      </div>
    </div>
  );
}

function ActiveQuoteFilters({
  search,
  selectedClientId,
  selectedClientName,
  selectedSellerId,
  selectedSellerName,
  dateRange,
  onSearchChange,
  onClientChange,
  onSellerChange,
  onDateRangeChange,
  onClear,
}: {
  search: string;
  selectedClientId: string;
  selectedClientName: string | null;
  selectedSellerId: string;
  selectedSellerName?: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onSellerChange: (value: string) => void;
  onDateRangeChange: (range: DateRange) => void;
  onClear: () => void;
}) {
  const hasFilters = Boolean(
    search ||
    selectedClientId !== 'all' ||
    selectedSellerId !== 'all' ||
    dateRange.from ||
    dateRange.to,
  );
  if (!hasFilters) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-medium text-muted-foreground">Filtros ativos:</span>
      {search && (
        <Badge variant="secondary" className="gap-1 px-2 py-1 text-[10px]">
          Busca: {search}
          <X className="h-3 w-3 cursor-pointer" onClick={() => onSearchChange('')} />
        </Badge>
      )}
      {selectedClientId !== 'all' && (
        <Badge variant="secondary" className="gap-1 px-2 py-1 text-[10px]">
          Cliente: {selectedClientName}
          <X className="h-3 w-3 cursor-pointer" onClick={() => onClientChange('all')} />
        </Badge>
      )}
      {selectedSellerId !== 'all' && (
        <Badge variant="secondary" className="gap-1 px-2 py-1 text-[10px]">
          Vendedor: {selectedSellerName}
          <X className="h-3 w-3 cursor-pointer" onClick={() => onSellerChange('all')} />
        </Badge>
      )}
      {dateRange.from && (
        <Badge variant="secondary" className="gap-1 px-2 py-1 text-[10px]">
          Período: {getDateRangeLabel(dateRange)}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => onDateRangeChange({ from: undefined })}
          />
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
        onClick={onClear}
      >
        Limpar Tudo
      </Button>
    </div>
  );
}

export default function QuotesKanbanPage() {
  const navigate = useNavigate();
  const { quotes, isLoading, fetchQuotes } = useQuotes();
  const { isSupervisorOrAbove } = useRBAC();

  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined });

  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);

  const toggleQuoteSelection = (id: string) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Vendedores são carregados separadamente; clientes vêm dos orçamentos visíveis.
  useEffect(() => {
    const fetchData = async () => {
      if (isSupervisorOrAbove) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name');
        setSellers(profilesData?.map((p) => ({ id: p.id, name: p.full_name || 'Sem Nome' })) || []);
      }
    };
    fetchData();
  }, [isSupervisorOrAbove]);

  // Get unique clients from quotes
  const quotesClients = useMemo(() => {
    const clientMap = new Map<string, string>();
    quotes.forEach((q) => {
      if (q.client_id && q.client_name) {
        clientMap.set(q.client_id, q.client_name);
      }
    });
    return Array.from(clientMap, ([id, name]) => ({ id, name }));
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) =>
      quoteMatchesFilters(quote, {
        search,
        clientId: selectedClientId,
        sellerId: selectedSellerId,
        dateRange,
      }),
    );
  }, [quotes, search, selectedClientId, selectedSellerId, dateRange]);

  const selectedClientName = useMemo(() => {
    if (selectedClientId === 'all') return null;
    return quotesClients.find((c) => c.id === selectedClientId)?.name || null;
  }, [selectedClientId, quotesClients]);

  if (isLoading) {
    return (
      <div
        data-testid="page-title-orcamentos-funil"
        className="mx-auto w-full max-w-[1920px] space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8"
      >
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4 overflow-x-auto">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[500px] min-w-[280px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageSEO
        title="Kanban de Orçamentos"
        description="Visualize e gerencie orçamentos no formato Kanban."
        path="/orcamentos/kanban"
        noIndex
      />
      <div className="space-y-6">
        <QuotesKanbanHeader
          search={search}
          onSearchChange={setSearch}
          clients={quotesClients}
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          sellers={sellers}
          selectedSellerId={selectedSellerId}
          onSellerChange={setSelectedSellerId}
          isSupervisor={isSupervisorOrAbove}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onBack={() => navigate('/orcamentos')}
          onNew={() => navigate('/orcamentos/novo')}
        />

        <ActiveQuoteFilters
          search={search}
          selectedClientId={selectedClientId}
          selectedClientName={selectedClientName}
          selectedSellerId={selectedSellerId}
          selectedSellerName={sellers.find((seller) => seller.id === selectedSellerId)?.name}
          dateRange={dateRange}
          onSearchChange={setSearch}
          onClientChange={setSelectedClientId}
          onSellerChange={setSelectedSellerId}
          onDateRangeChange={setDateRange}
          onClear={() => {
            setSearch('');
            setSelectedClientId('all');
            setSelectedSellerId('all');
            setDateRange({ from: undefined });
          }}
        />

        {/* Kanban Board */}
        <QuoteKanbanBoard
          quotes={filteredQuotes}
          selectedIds={selectedQuoteIds}
          onToggleSelection={toggleQuoteSelection}
        />

        {/* Bulk Actions Toolbar */}
        <QuoteBulkActionsToolbar
          selectedIds={selectedQuoteIds}
          onClearSelection={() => setSelectedQuoteIds([])}
          onActionComplete={fetchQuotes}
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-4 rounded-xl border border-border/40 bg-card/50 p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border border-border bg-muted/50" />
            <span>Rascunho: Em elaboração pelo vendedor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border border-amber-500/40 bg-amber-500/20" />
            <span>Pendente: Aguardando aprovação ou em processamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border border-blue-500/40 bg-blue-500/20" />
            <span>Enviado: Proposta em análise pelo cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border border-emerald-500/40 bg-emerald-500/20" />
            <span>Aprovado: Pronto para virar pedido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border border-destructive/40 bg-destructive/20" />
            <span>Recusado: Necessita ajustes ou cancelado</span>
          </div>
        </div>
      </div>
    </>
  );
}
