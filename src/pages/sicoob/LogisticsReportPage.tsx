import React, { useMemo, useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Camera, CheckCircle2, Clock, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { listSicoobLogisticsTracking } from "@/services/sicoob/logisticsReportService";

function formatDate(value: string | null): string {
  if (!value) return "A confirmar";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default function LogisticsReportPage() {
  const [search, setSearch] = useState("");
  const { data: tracking = [], isLoading, isError } = useQuery({
    queryKey: ["sicoob-logistics"],
    queryFn: listSicoobLogisticsTracking,
  });
  const filteredTracking = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) return tracking;
    return tracking.filter((item) => [item.orderNumber, item.destination, item.carrierName]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase("pt-BR").includes(normalizedSearch)));
  }, [search, tracking]);
  const inTransitCount = tracking.filter((item) => item.status === "in_transit").length;
  const deliveredCount = tracking.filter((item) => item.status === "delivered").length;
  const proofCount = tracking.filter((item) => item.hasDeliveryProof).length;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Operações & Logística</h1>
            <p className="text-muted-foreground italic">Rastreamento de pedidos e prova de entrega (POD) para todos os PAs.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido, PA ou transportadora..." className="pl-9" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-[1.5px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{tracking.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Pedidos no fluxo logístico</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Em Trânsito</CardTitle>
                    <Clock className="h-4 w-4 text-status-production" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-status-production">{inTransitCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Pedidos com rastreio ativo</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Entregas concluídas</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{deliveredCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Com confirmação de entrega</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px] bg-sicoob-green/5 border-sicoob-green/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-sicoob-green-dark">Comprovantes (POD)</CardTitle>
                    <Camera className="h-4 w-4 text-sicoob-green" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-sicoob-green-dark">{proofCount}</div>
                    <p className="text-xs text-sicoob-green/70 mt-1">Com comprovante anexado</p>
                </CardContent>
            </Card>
        </div>

        <Card className="border-[1.5px]">
          <CardHeader>
            <CardTitle className="text-sicoob-green-dark font-bold">Rastreamento em Tempo Real</CardTitle>
            <CardDescription className="italic">Acompanhe o status e a localização exata de cada remessa SICOOB.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Destinatário (PA)</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Carregando rastreamento…</TableCell></TableRow>}
                {isError && <TableRow><TableCell colSpan={6} className="py-10 text-center text-destructive">Não foi possível carregar o rastreamento. Tente novamente.</TableCell></TableRow>}
                {!isLoading && !isError && filteredTracking.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum pedido logístico encontrado.</TableCell></TableRow>}
                {filteredTracking.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">{item.orderNumber}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {item.destination}
                        </div>
                    </TableCell>
                    <TableCell>{item.carrierName ?? "A confirmar"}</TableCell>
                    <TableCell>{formatDate(item.estimatedDelivery)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'delivered' ? 'secondary' : (item.status === 'in_transit' ? 'default' : 'outline')} className="gap-1">
                        {item.status === 'delivered' ? 'Entregue' : (item.status === 'in_transit' ? 'Em Trânsito' : 'Em separação')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.hasDeliveryProof && <span className="inline-flex items-center gap-1 text-xs text-success"><Camera className="h-4 w-4" /> Comprovante</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
