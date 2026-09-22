import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { QuoteKanbanBoard } from "@/components/quotes/QuoteKanbanBoard";
import { QuoteBulkActionsToolbar } from "@/components/quotes/QuoteBulkActionsToolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  List,
  BarChart3,
  Building2,
  Search,
  Filter,
  X,
  User,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useQuotes } from "@/hooks/quotes/useQuotes";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRBAC } from "@/hooks/useRBAC";

export default function QuotesKanbanPage() {
  const navigate = useNavigate();
  const { quotes, isLoading, fetchQuotes } = useQuotes();
  const { isSupervisorOrAbove } = useRBAC();
  
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);

  const toggleQuoteSelection = (id: string) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Vendedores são carregados separadamente; clientes vêm dos orçamentos visíveis.
  useEffect(() => {
    const fetchData = async () => {
      if (isSupervisorOrAbove) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .order("full_name");
        setSellers(profilesData?.map(p => ({ id: p.id, name: p.full_name || "Sem Nome" })) || []);
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
    return quotes.filter((q) => {
      // Search filter
      const searchMatch = !search || 
        q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
        q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.client_company?.toLowerCase().includes(search.toLowerCase());
      
      // Client filter
      const clientMatch = selectedClientId === "all" || q.client_id === selectedClientId;
      
      // Seller filter
      const sellerMatch = selectedSellerId === "all" || q.seller_id === selectedSellerId;
      
      // Date filter
      let dateMatch = true;
      if (dateRange.from && q.created_at) {
        dateMatch = new Date(q.created_at) >= dateRange.from;
      }
      if (dateMatch && dateRange.to && q.created_at) {
        dateMatch = new Date(q.created_at) <= dateRange.to;
      }

      return searchMatch && clientMatch && sellerMatch && dateMatch;
    });
  }, [quotes, search, selectedClientId, selectedSellerId, dateRange]);

  const selectedClientName = useMemo(() => {
    if (selectedClientId === "all") return null;
    return quotesClients.find((c) => c.id === selectedClientId)?.name || null;
  }, [selectedClientId, quotesClients]);

  if (isLoading) {
    return (
      <>
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-4 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="min-w-[280px] h-[500px]" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageSEO title="Kanban de Orçamentos" description="Visualize e gerencie orçamentos no formato Kanban." path="/orcamentos/kanban" noIndex />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon" aria-label="Voltar"
              onClick={() => navigate("/orcamentos")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <h1 data-testid="page-title-orcamentos-funil" className="font-display text-2xl font-bold text-foreground">
                Funil de Orçamentos
              </h1>
              <p className="text-muted-foreground text-sm">
                Visualize e gerencie seu pipeline comercial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nº ou Cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Client Filter */}
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[180px] h-9">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {quotesClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Seller Filter (Supervisor Only) */}
            {isSupervisorOrAbove && (
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger className="w-[180px] h-9">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
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

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM")
                    )
                  ) : (
                    "Data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range: any) => setDateRange(range || {})}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <div className="flex bg-muted p-1 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => navigate("/orcamentos")}
              >
                <List className="h-3.5 w-3.5 mr-1" />
                Lista
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs bg-background shadow-sm"
                disabled
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                Kanban
              </Button>
            </div>

            <Button onClick={() => navigate("/orcamentos/novo")} size="sm" className="h-9 shadow-sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>
        </div>

        {/* Active Filters Badges */}
        {(selectedClientId !== "all" || selectedSellerId !== "all" || dateRange.from || search) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium mr-1">Filtros ativos:</span>
            {search && (
              <Badge variant="secondary" className="gap-1 py-1 px-2 text-[10px]">
                Busca: {search}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch("")} />
              </Badge>
            )}
            {selectedClientId !== "all" && (
              <Badge variant="secondary" className="gap-1 py-1 px-2 text-[10px]">
                Cliente: {selectedClientName}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedClientId("all")} />
              </Badge>
            )}
            {selectedSellerId !== "all" && (
              <Badge variant="secondary" className="gap-1 py-1 px-2 text-[10px]">
                Vendedor: {sellers.find(s => s.id === selectedSellerId)?.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSellerId("all")} />
              </Badge>
            )}
            {(dateRange.from || dateRange.to) && (
              <Badge variant="secondary" className="gap-1 py-1 px-2 text-[10px]">
                Período: {dateRange.from ? format(dateRange.from, "dd/MM/yy") : ""} {dateRange.to ? `- ${format(dateRange.to, "dd/MM/yy")}` : ""}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRange({})} />
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={() => {
                setSearch("");
                setSelectedClientId("all");
                setSelectedSellerId("all");
                setDateRange({});
              }}
            >
              Limpar Tudo
            </Button>
          </div>
        )}

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
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-card/50 p-4 rounded-xl border border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted/50 border border-border" />
            <span>Rascunho: Em elaboração pelo vendedor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
            <span>Pendente: Aguardando aprovação ou em processamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" />
            <span>Enviado: Proposta em análise pelo cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
            <span>Aprovado: Pronto para virar pedido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40" />
            <span>Recusado: Necessita ajustes ou cancelado</span>
          </div>
        </div>
      </div>
    </>
  );
}
