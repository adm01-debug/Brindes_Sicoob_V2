import { useMemo, useState } from "react";
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
import { useCrmCompanies } from "@/hooks/useCrmCompanies";
import { ClientCard } from "@/components/clients/ClientCard";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

type ClientSortMode = "name" | "created" | "city";

function filterAndSortClients(clients: CrmCompany[], search: string, sortMode: ClientSortMode) {
  const query = search.trim().toLocaleLowerCase("pt-BR");
  return clients
    .filter((client) => !query || [getCompanyDisplayName(client), client.cnpj, client.cidade]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(query)))
    .sort((left, right) => {
      if (sortMode === "created") {
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }
      if (sortMode === "city") {
        return (left.cidade ?? "").localeCompare(right.cidade ?? "", "pt-BR");
      }
      return getCompanyDisplayName(left).localeCompare(getCompanyDisplayName(right), "pt-BR");
    });
}

interface ClientResultsProps {
  clients: CrmCompany[];
  search: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onClientClick: (id: string) => void;
}

function ClientResults({ clients, search, isLoading, isError, onRetry, onClientClick }: ClientResultsProps) {
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
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => <ClientCard key={client.id} client={client} onClick={() => onClientClick(client.id)} />)}
    </div>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<ClientSortMode>("name");
  const { data: clients = [], isLoading, isError, refetch } = useCrmCompanies({ is_customer: true });

  const filtered = useMemo(
    () => filterAndSortClients(clients, search, sortMode),
    [clients, search, sortMode],
  );

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const kpis = [
    { label: "Total Clientes", value: clients.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Novos no mês", value: clients.filter((client) => new Date(client.created_at) >= startOfMonth).length, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Com localização", value: clients.filter((client) => Boolean(client.cidade && client.estado)).length, icon: MapPin, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Com CNPJ", value: clients.filter((client) => Boolean(client.cnpj)).length, icon: BadgeCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const sortLabel = sortMode === "created" ? "Mais recentes" : sortMode === "city" ? "Cidade" : "Nome";

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
        {!isError && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-md transition-all duration-300">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color} transition-transform group-hover:scale-110 duration-300`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-bold font-display text-foreground">{isLoading ? "..." : kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search and List Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nome, CNPJ ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    Ordenar por: <span className="font-semibold text-foreground">{sortLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Critério</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setSortMode("name")}>Nome (A-Z)</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortMode("created")}>Mais recentes</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortMode("city")}>Cidade</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ClientResults
            clients={filtered}
            search={search}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            onClientClick={(id) => navigate(`/clientes/${id}`)}
          />
        </div>
      </div>
    </>
  );
}
