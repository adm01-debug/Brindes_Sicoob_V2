import { useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Users, Search, TrendingUp, MapPin, BadgeCheck, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useCrmClientsPage, type CrmClientsPageResult, type CrmClientsSortMode } from "@/hooks/useCrmCompanies";
import { useDebounce } from "@/hooks/useDebounce";
import { ClientCard } from "@/components/clients/ClientCard";
import { type CrmCompany } from "@/types/crm";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

interface ClientResultsProps {
  clients: CrmCompany[];
  search: string;
  filteredCount: number;
  pageIndex: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onClientClick: (id: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

function ClientResults({ clients, search, filteredCount, pageIndex, totalPages, isLoading, isError, onRetry, onClientClick, onPreviousPage, onNextPage }: ClientResultsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Card key={index} className="h-[120px] overflow-hidden border-none shadow-sm">
            <CardContent className="p-0 h-full flex items-center px-4 gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2 flex-1"><Skeleton className="h-5 w-[140px]" /><Skeleton className="h-4 w-[100px]" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center" role="alert">
          <AlertTriangle className="mb-3 h-10 w-10 text-destructive" />
          <h3 className="font-display text-lg font-semibold">Não foi possível consultar o CRM</h3>
          <p className="mt-1 text-sm text-muted-foreground">A lista e os indicadores permanecem ocultos para não exibir dados incompletos.</p>
          <Button className="mt-5" variant="outline" onClick={onRetry}>Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }
  if (clients.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 bg-muted/20 rounded-full mb-4"><Users className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">{search ? "Nenhum cliente encontrado" : "Sua base está vazia"}</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            {search ? `Não encontramos resultados para "${search}". Verifique a ortografia ou tente termos mais genéricos.` : "Os clientes cadastrados no CRM integrado aparecerão aqui."}
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Exibindo {clients.length} de {filteredCount} cliente{filteredCount === 1 ? "" : "s"}{search ? " encontrados" : " na lista"}.</p>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => <ClientCard key={client.id} client={client} onClick={() => onClientClick(client.id)} />)}
      </div>
      {totalPages > 1 && <div className="flex items-center justify-center gap-3">
        <Button variant="outline" onClick={onPreviousPage} disabled={pageIndex === 0}>Anterior</Button>
        <span className="text-sm text-muted-foreground">Página {pageIndex + 1} de {totalPages}</span>
        <Button variant="outline" onClick={onNextPage} disabled={pageIndex + 1 >= totalPages}>Próxima</Button>
      </div>}
    </div>
  );
}

function ClientKpiCards({ kpis, isLoading, isError }: { kpis?: CrmClientsPageResult["kpis"]; isLoading: boolean; isError: boolean }) {
  if (isError) return null;
  const cards = [
    { label: "Total Clientes", value: kpis?.totalCount, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Novos no mês", value: kpis?.newThisMonth, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Com localização", value: kpis?.withLocation, icon: MapPin, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Com CNPJ", value: kpis?.withCnpj, icon: BadgeCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {cards.map((card) => <Card key={card.label} className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-md transition-all duration-300">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${card.bg} ${card.color} transition-transform group-hover:scale-110 duration-300`}><card.icon className="h-5 w-5" /></div>
        <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p><p className="text-2xl font-bold font-display text-foreground">{isLoading ? "..." : card.value ?? "—"}</p></div>
      </CardContent>
    </Card>)}
  </div>;
}

function sortLabelFor(mode: CrmClientsSortMode): string {
  const labels: Record<CrmClientsSortMode, string> = {
    name: "Razão social (A-Z)",
    created: "Mais recentes",
    city: "Cidade",
  };
  return labels[mode];
}

function ClientSearchAndSort({
  search,
  sortMode,
  onSearch,
  onSort,
}: {
  search: string;
  sortMode: CrmClientsSortMode;
  onSearch: (value: string) => void;
  onSort: (mode: CrmClientsSortMode) => void;
}) {
  return <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
    <div className="relative w-full sm:max-w-md group">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      <Input
        placeholder="Buscar por nome, CNPJ ou cidade..."
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        className="pl-11 h-11 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary shadow-sm"
      />
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">Ordenar por: <span className="font-semibold text-foreground">{sortLabelFor(sortMode)}</span></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Critério</DropdownMenuLabel><DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onSort("name")}>Razão social (A-Z)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onSort("created")}>Mais recentes</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onSort("city")}>Cidade</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>;
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<CrmClientsSortMode>("name");
  const [pageIndex, setPageIndex] = useState(0);
  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading, isError, refetch } = useCrmClientsPage({ pageIndex, search: debouncedSearch, sortMode });
  const clients = data?.clients ?? [];
  return (
    <>
      <PageSEO
        title="Gestão de Clientes | 10/10 CRM"
        description="Gestão de clientes com visão 360° de pedidos, ticket médio e LTV."
        path="/clientes"
      />
      
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24 md:pb-12 animate-in fade-in duration-500">
        
        {/* Header & Breadcrumb */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Breadcrumb className="mb-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate("/")} className="cursor-pointer">Início</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Clientes</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Users className="h-7 w-7 text-primary" />
              </div>
              Gestão de Clientes
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Gerencie sua base de clientes, analise comportamentos de compra e acompanhe o crescimento do seu ecossistema comercial.
            </p>
          </div>
          
        </div>

        {/* KPIs Section */}
        <ClientKpiCards kpis={data?.kpis} isLoading={isLoading} isError={isError} />

        {/* Search and List Header */}
        <div className="space-y-4">
          <ClientSearchAndSort
            search={search}
            sortMode={sortMode}
            onSearch={(value) => { setSearch(value); setPageIndex(0); }}
            onSort={(mode) => { setSortMode(mode); setPageIndex(0); }}
          />

          <ClientResults
            clients={clients}
            search={debouncedSearch}
            filteredCount={data?.filteredCount ?? 0}
            pageIndex={pageIndex}
            totalPages={data?.totalPages ?? 1}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            onClientClick={(id) => navigate(`/clientes/${id}`)}
            onPreviousPage={() => setPageIndex((page) => Math.max(0, page - 1))}
            onNextPage={() => setPageIndex((page) => Math.min((data?.totalPages ?? 1) - 1, page + 1))}
          />
        </div>
      </div>
    </>
  );
}
