import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Camera, CheckCircle2, Clock, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LogisticsReportPage() {
  const { data: tracking = [] } = useQuery({
    queryKey: ["sicoob-logistics"],
    queryFn: async () => {
      // Simulation of tracking data for SICOOB parity
      return [
        { id: "1", order: "PED-24-001", dest: "PA 01 - Centro", status: "delivered", courier: "TransSicoob", date: "2026-05-02", photo: true },
        { id: "2", order: "PED-24-012", dest: "PA 04 - Industrial", status: "in_transit", courier: "LogB2B", date: "2026-05-03", photo: false },
        { id: "3", order: "PED-24-045", dest: "PA 02 - Norte", status: "pending", courier: "-", date: "-", photo: false },
      ];
    }
  });

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Operações & Logística</h1>
            <p className="text-muted-foreground italic">Rastreamento de pedidos e prova de entrega (POD) para todos os PAs.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar pedido ou PA..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-[1.5px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">142</div>
                    <p className="text-xs text-muted-foreground mt-1">Acumulado do trimestre</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Em Trânsito</CardTitle>
                    <Clock className="h-4 w-4 text-status-production" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-status-production">8</div>
                    <p className="text-xs text-muted-foreground mt-1">Pedidos com tracking ativo</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">99.2%</div>
                    <p className="text-xs text-muted-foreground mt-1">Entregas sem ocorrência</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px] bg-sicoob-green/5 border-sicoob-green/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-sicoob-green-dark">Comprovantes (POD)</CardTitle>
                    <Camera className="h-4 w-4 text-sicoob-green" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-sicoob-green-dark">128</div>
                    <p className="text-xs text-sicoob-green/70 mt-1">Fotos de entrega anexadas</p>
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
                {tracking.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">{item.order}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {item.dest}
                        </div>
                    </TableCell>
                    <TableCell>{item.courier}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'delivered' ? 'secondary' : (item.status === 'in_transit' ? 'default' : 'outline')} className="gap-1">
                        {item.status === 'delivered' ? 'Entregue' : (item.status === 'in_transit' ? 'Em Trânsito' : 'Pendente')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.photo && <Button variant="ghost" size="icon" title="Ver foto da entrega"><Camera className="h-4 w-4" /></Button>}
                        <Button variant="ghost" size="icon" title="Ver no mapa"><MapPin className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
