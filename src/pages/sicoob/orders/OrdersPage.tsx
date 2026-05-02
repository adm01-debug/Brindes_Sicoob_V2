import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  LayoutGrid,
  Search,
  Filter,
  ArrowRight,
  X,
  CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

// Mock data for initial UI
const MOCK_ORDERS = [
  { id: '1', pa: 'PA Centro', singular: 'Sicoob Credicitrus', status: 'draft', total: 1250.50, items: 4, date: '2024-05-01' },
  { id: '2', pa: 'PA Sul', singular: 'Sicoob Coopercredi', status: 'pending_approval', total: 3400.00, items: 12, date: '2024-05-02' },
  { id: '3', pa: 'PA Norte', singular: 'Sicoob Credicitrus', status: 'approved', total: 850.00, items: 2, date: '2024-04-30' },
  { id: '4', pa: 'PA Leste', singular: 'Sicoob Coopercredi', status: 'rejected', total: 540.00, items: 3, date: '2024-04-25' },
  { id: '5', pa: 'PA Centro', singular: 'Sicoob Credicitrus', status: 'in_funnel', total: 2100.00, items: 7, date: '2024-04-20' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-slate-500/10 text-slate-500' },
  pending_approval: { label: 'Aguardando Aprovação', color: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-500' },
  in_funnel: { label: 'No Funil', color: 'bg-blue-500/10 text-blue-500' },
};

const FUNNEL_STATUSES = Object.keys(STATUS_MAP);

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paFilter, setPaFilter] = useState<string>("all");
  const [singularFilter, setSingularFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const paOptions = useMemo(
    () => Array.from(new Set(MOCK_ORDERS.map((o) => o.pa))),
    [],
  );
  const singularOptions = useMemo(
    () => Array.from(new Set(MOCK_ORDERS.map((o) => o.singular))),
    [],
  );

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return MOCK_ORDERS.filter((order) => {
      if (term) {
        const haystack = `${order.id} ${order.pa} ${order.singular}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (paFilter !== "all" && order.pa !== paFilter) return false;
      if (singularFilter !== "all" && order.singular !== singularFilter) return false;
      if (dateRange?.from) {
        const orderDate = parseISO(order.date);
        const to = dateRange.to ?? dateRange.from;
        if (!isWithinInterval(orderDate, { start: dateRange.from, end: to })) {
          return false;
        }
      }
      return true;
    });
  }, [searchTerm, statusFilter, paFilter, singularFilter, dateRange]);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (paFilter !== "all" ? 1 : 0) +
    (singularFilter !== "all" ? 1 : 0) +
    (dateRange?.from ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setPaFilter("all");
    setSingularFilter("all");
    setDateRange(undefined);
  };

  return (
    <MainLayout>
      <PageSEO title="Pedidos Sicoob" description="Gerenciamento de pedidos do ecossistema Sicoob." path="/sicoob/pedidos" noIndex />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pedidos Sicoob</h1>
            <p className="text-muted-foreground">
              Acompanhe e gerencie as solicitações de compra dos PAs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/sicoob/pedidos/kanban")}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button onClick={() => navigate("/sicoob/pedidos/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por PA, Singular ou ID do pedido..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros avançados</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Status do funil</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {FUNNEL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_MAP[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">PA</Label>
                <Select value={paFilter} onValueChange={setPaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {paOptions.map((pa) => (
                      <SelectItem key={pa} value={pa}>
                        {pa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Singular</Label>
                <Select value={singularFilter} onValueChange={setSingularFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {singularOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecionar período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      locale={ptBR}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtros ativos:</span>
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {STATUS_MAP[statusFilter]?.label}
                <button onClick={() => setStatusFilter("all")} aria-label="Remover filtro de status">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {paFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {paFilter}
                <button onClick={() => setPaFilter("all")} aria-label="Remover filtro de PA">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {singularFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {singularFilter}
                <button onClick={() => setSingularFilter("all")} aria-label="Remover filtro de Singular">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {dateRange?.from && (
              <Badge variant="secondary" className="gap-1">
                {format(dateRange.from, "dd/MM/yy", { locale: ptBR })}
                {dateRange.to && ` - ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`}
                <button onClick={() => setDateRange(undefined)} aria-label="Remover filtro de período">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {filteredOrders.length} {filteredOrders.length === 1 ? "pedido encontrado" : "pedidos encontrados"}
        </div>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum pedido corresponde aos filtros selecionados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/sicoob/pedidos/${order.id}`)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pedido #{order.id}
                  </CardTitle>
                  <Badge variant="outline" className={STATUS_MAP[order.status]?.color}>
                    {STATUS_MAP[order.status]?.label}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground">
                    {order.pa} • {order.singular} • {order.items} itens
                  </p>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground pt-0">
                  Criado em {format(parseISO(order.date), "dd/MM/yyyy", { locale: ptBR })}
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
