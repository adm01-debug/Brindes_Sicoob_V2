import React, { useMemo, useState } from "react";
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
import { Package, Hash, Layers, PieChart, FileText, Search, Filter, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'total_value', direction: 'desc' });
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar por Produto ou SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Produto / SKU</TableHead>
                  <TableHead className="text-center">Qtd Total</TableHead>
                  <TableHead className="text-center">Preço Médio</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Origens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidatedData.items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
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
                      <div className="flex flex-wrap justify-end gap-1">
                        {item.sources.map((source, sIdx) => (
                          <Badge key={sIdx} variant="outline" className="text-[9px] h-4 px-1 bg-muted/20">
                            #{source}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
