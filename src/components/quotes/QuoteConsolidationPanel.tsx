import React, { useMemo, useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatters";
import { Quote, QuoteItem } from "@/hooks/quotes/quoteTypes";
import { Package, Hash, Layers, PieChart, FileText, Search, Filter, ChevronDown, ChevronRight, ArrowUpDown, Download, History, Share2, Save, X, Calendar, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SavedView {
  id: string;
  name: string;
  searchTerm: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
}

interface ChangeLogEntry {
  id: string;
  date: string;
  user: string;
  type: 'price' | 'quantity' | 'status' | 'personalization';
  sku?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
}
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatters";
import { Quote, QuoteItem } from "@/hooks/quotes/quoteTypes";
import { Package, Hash, Layers, PieChart, FileText, Search, Filter } from "lucide-react";

interface QuoteConsolidationPanelProps {
  quotes: Quote[];
  title?: string;
  description?: string;
}

export function QuoteConsolidationPanel({ 
  quotes, 
  title = "Consolidação de Orçamentos", 
  description = "Visão unificada de múltiplos orçamentos para análise de compra."
}: QuoteConsolidationPanelProps) {
  const [searchTerm, setSearchTerm] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q_search') || localStorage.getItem('quote_consolidation_search') || "";
  });
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSort = urlParams.get('q_sort');
    if (urlSort) {
      try { return JSON.parse(atob(urlSort)); } catch (e) { console.error(e); }
    }
    
    const saved = localStorage.getItem('quote_consolidation_sort');
    return saved ? JSON.parse(saved) : { key: 'total_value', direction: 'desc' };
  });

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const saved = localStorage.getItem('quote_consolidation_views');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('quote_consolidation_search', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('quote_consolidation_sort', JSON.stringify(sortConfig));
  }, [sortConfig]);

  const saveCurrentView = () => {
    const name = prompt("Nome para esta visão:");
    if (!name) return;

    const newView: SavedView = {
      id: crypto.randomUUID(),
      name,
      searchTerm,
      sortConfig
    };

    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem('quote_consolidation_views', JSON.stringify(updated));
    toast.success("Visão salva!");
  };

  const loadView = (view: SavedView) => {
    setSearchTerm(view.searchTerm);
    setSortConfig(view.sortConfig);
    toast.info(`Visão "${view.name}" carregada`);
  };

  const deleteView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedViews.filter(v => v.id !== id);
    setSavedViews(updated);
    localStorage.setItem('quote_consolidation_views', JSON.stringify(updated));
    toast.success("Visão removida");
  };

  const generateShareLink = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('q_search', searchTerm);
    if (sortConfig) params.set('q_sort', btoa(JSON.stringify(sortConfig)));
    
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de compartilhamento copiado!", {
      description: "Os filtros e ordenação atuais foram codificados na URL."
    });
  };

  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');
  const [historyFilter, setHistoryFilter] = useState<{ type?: string; sku?: string }>({ type: undefined, sku: undefined });

  // Simulação de log de mudanças para demonstração (em prod viria do quote_history filtrado)
  const mockHistory: ChangeLogEntry[] = useMemo(() => {
    const entries: ChangeLogEntry[] = [];
    quotes.forEach(q => {
      if (q.created_at) {
        entries.push({
          id: `created-${q.id}`,
          date: q.created_at,
          user: q.seller_id || "Sistema",
          type: 'status',
          description: `Orçamento #${q.quote_number} criado.`
        });
      }
      q.items?.forEach(item => {
        if (q.updated_at) {
          entries.push({
            id: `qty-${q.id}-${item.product_sku}`,
            date: q.updated_at,
            user: q.seller_id || "Sistema",
            type: 'quantity',
            sku: item.product_sku,
            description: `Alteração de quantidade no item ${item.product_name}.`,
            oldValue: "-",
            newValue: `${item.quantity} un`
          });
        }
      });
    });
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotes]);

  const filteredHistory = useMemo(() => {
    return mockHistory.filter(entry => {
      const matchesType = !historyFilter.type || entry.type === historyFilter.type;
      const matchesSku = !historyFilter.sku || entry.sku?.toLowerCase().includes(historyFilter.sku.toLowerCase());
      return matchesType && matchesSku;
    });
  }, [mockHistory, historyFilter]);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const exportToCSV = () => {
    if (!consolidatedData) return;
    
    const headers = ["Produto", "SKU", "Qtd Total", "Preço Médio", "Total", "Nº Orçamentos"];
    const rows = consolidatedData.items.map(item => [
      item.product_name,
      item.product_sku || "",
      item.total_quantity,
      item.average_price.toFixed(2),
      item.total_value.toFixed(2),
      item.sources.length
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `consolidacao_compras_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportação concluída!");
  };

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const consolidatedData = useMemo(() => {
    if (!quotes || quotes.length === 0) return null;

    const itemsMap = new Map<string, {
      product_name: string;
      product_sku: string | undefined;
      total_quantity: number;
      average_price: number;
      total_value: number;
      quotes_count: number;
      sources: string[];
    }>();

    let totalGlobal = 0;
    let totalItems = 0;

    quotes.forEach(quote => {
      quote.items?.forEach((item: QuoteItem) => {
        const matchesSearch = 
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (item.product_sku && item.product_sku.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return;

        const key = item.product_sku || item.product_id || item.product_name;
        const existing = itemsMap.get(key);
        
        const quantity = item.quantity || 0;
        const unitPrice = item.unit_price || 0;
        const subtotal = quantity * unitPrice;

        if (existing) {
          existing.total_quantity += quantity;
          existing.total_value += subtotal;
          existing.average_price = existing.total_value / existing.total_quantity;
          existing.quotes_count += 1;
          if (quote.quote_number && !existing.sources.includes(quote.quote_number)) {
            existing.sources.push(quote.quote_number);
          }
        } else {
          itemsMap.set(key, {
            product_name: item.product_name,
            product_sku: item.product_sku,
            total_quantity: quantity,
            average_price: unitPrice,
            total_value: subtotal,
            quotes_count: 1,
            sources: quote.quote_number ? [quote.quote_number] : []
          });
        }

        totalGlobal += subtotal;
        totalItems += quantity;
      });
    });

    const items = Array.from(itemsMap.values()).filter(item => {
      return item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             (item.product_sku && item.product_sku.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    if (sortConfig) {
      items.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return {
      items,
      totalGlobal,
      totalItems,
      quotesCount: quotes.length
    };
  }, [quotes, searchTerm, sortConfig]);

  if (!consolidatedData || quotes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Nenhum orçamento selecionado para consolidação.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <PieChart className="h-3.5 w-3.5 text-primary" />
              Total Consolidado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(consolidatedData.totalGlobal)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              Total de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consolidatedData.totalItems.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consolidatedData.quotesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Hash className="h-3.5 w-3.5" />
              SKUs Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consolidatedData.items.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 mb-2 p-1 bg-muted/30 w-fit rounded-lg border border-border/40">
        <Button variant={activeTab === 'items' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('items')} className="h-8 gap-2">
          <Layers className="h-4 w-4" /> Itens Consolidados
        </Button>
        <Button variant={activeTab === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('history')} className="h-8 gap-2">
          <History className="h-4 w-4" /> Log de Mudanças
        </Button>
      </div>

      {activeTab === 'items' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchTerm("");
                setSortConfig({ key: 'total_value', direction: 'desc' });
                toast.info("Filtros redefinidos");
              }}
              title="Redefinir filtros"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filtrar por Produto ou SKU..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <Save className="h-4 w-4" />
                    Visões Salvas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minhas Visões</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {savedViews.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs italic">Nenhuma visão salva</DropdownMenuItem>
                  ) : (
                    savedViews.map(view => (
                      <DropdownMenuItem key={view.id} onClick={() => loadView(view)} className="flex items-center justify-between">
                        <span className="truncate">{view.name}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={(e) => deleteView(view.id, e)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={saveCurrentView} className="text-primary font-medium">
                    <Save className="h-3.5 w-3.5 mr-2" />
                    Salvar Atual como...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" className="gap-2 h-9" onClick={generateShareLink} title="Gerar link de compartilhamento">
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>

              <Button variant="outline" size="sm" className="gap-2 h-9" onClick={exportToCSV}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('product_name')}>
                      <div className="flex items-center gap-2">Produto / SKU <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('total_quantity')}>
                      <div className="flex items-center justify-center gap-2">Qtd Total <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('average_price')}>
                      <div className="flex items-center justify-center gap-2">Preço Médio <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('total_value')}>
                      <div className="flex items-center justify-center gap-2">Total <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="text-right">Origens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consolidatedData.items.map((item) => {
                    const key = item.product_sku || item.product_name;
                    const isExpanded = expandedItems.includes(key);
                    
                    const itemSources = quotes.filter(q => 
                      q.items?.some(i => (i.product_sku || i.product_name) === key)
                    ).map(q => ({
                      number: q.quote_number,
                      qty: q.items?.find(i => (i.product_sku || i.product_name) === key)?.quantity || 0,
                      price: q.items?.find(i => (i.product_sku || i.product_name) === key)?.unit_price || 0,
                      client: q.client_name || q.client_company
                    }));

                    return (
                      <React.Fragment key={key}>
                        <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => toggleExpand(key)}>
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{item.product_name}</span>
                              {item.product_sku && (
                                <span className="text-[10px] font-mono text-muted-foreground">SKU: {item.product_sku}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {item.total_quantity}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {formatCurrency(item.average_price)}
                          </TableCell>
                          <TableCell className="text-center font-bold text-primary">
                            {formatCurrency(item.total_value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              {item.sources.length} orçamentos
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/10 border-l-2 border-l-primary/50">
                            <TableCell colSpan={6} className="p-0">
                              <div className="p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-2">Detalhamento por Origem</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {itemSources.map((source, sIdx) => (
                                    <div key={sIdx} className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border/40">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-primary">#{source.number}</span>
                                        <span className="text-[10px] text-muted-foreground">{source.client}</span>
                                      </div>
                                      <div className="flex gap-6 text-[11px]">
                                        <span>Qtd: <strong>{source.qty}</strong></span>
                                        <span>Preço: <strong>{formatCurrency(source.price)}</strong></span>
                                        <span>Total: <strong>{formatCurrency(source.qty * source.price)}</strong></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold">Rastreabilidade de Mudanças</CardTitle>
              <CardDescription>Auditoria detalhada de alterações por item e SKU.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por SKU..." 
                  value={historyFilter.sku || ""}
                  onChange={(e) => setHistoryFilter(prev => ({ ...prev, sku: e.target.value }))}
                  className="pl-8 h-8 text-xs font-mono"
                />
              </div>
              <Select value={historyFilter.type || "all"} onValueChange={(v) => setHistoryFilter(prev => ({ ...prev, type: v === 'all' ? undefined : v }))}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Tipo de Alteração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="price">Preço</SelectItem>
                  <SelectItem value="quantity">Quantidade</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground italic">Nenhuma alteração encontrada nos filtros atuais.</div>
              ) : (
                <div className="relative space-y-0 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
                  {filteredHistory.map((entry) => (
                    <div key={entry.id} className="relative flex items-center justify-between p-4 group transition-all duration-300">
                      <div className="flex items-center w-full">
                        <div className="absolute left-5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background bg-primary z-10 shadow-[0_0_8px_rgba(var(--primary),0.4)] group-hover:scale-125 transition-transform" />
                        <div className="ml-10 space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR })}
                              <Clock className="h-3 w-3 ml-1" />
                              {format(new Date(entry.date), "HH:mm")}
                            </span>
                            <Badge variant="outline" className="text-[9px] h-4 font-mono uppercase tracking-widest">{entry.type}</Badge>
                            {entry.sku && <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20 font-mono">SKU: {entry.sku}</Badge>}
                          </div>
                          <p className="text-sm font-medium leading-relaxed">{entry.description}</p>
                          {(entry.oldValue || entry.newValue) && (
                            <div className="flex items-center gap-3 text-xs pt-1">
                              {entry.oldValue && <span className="text-muted-foreground line-through decoration-destructive/50">{entry.oldValue}</span>}
                              <span className="text-muted-foreground">→</span>
                              {entry.newValue && <span className="font-bold text-primary">{entry.newValue}</span>}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-medium text-muted-foreground block uppercase">Alterado por</span>
                          <span className="text-xs font-semibold">{entry.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
