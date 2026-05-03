import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Layers, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/utils/formatters";

export default function GestorConsolidatedOrdersPage() {
  const { data: consolidations } = useQuery({
    queryKey: ["sicoob-consolidations"],
    queryFn: async () => {
      // Mock data representing the consolidation logic
      return [
        { id: "1", vendedor: "José Vendedor", orders: 12, value: 45000, status: "pending_seller", date: "2026-05-01" },
        { id: "2", vendedor: "Maria Consultora", orders: 8, value: 28400, status: "in_production", date: "2026-04-28" },
      ];
    }
  });

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Agregados da Singular</h1>
            <p className="text-muted-foreground italic">Consolidação estratégica de pedidos para otimização logística.</p>
          </div>
          <Button className="gap-2">
            <Layers className="h-4 w-4" /> Nova Consolidação
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-[1.5px] bg-sicoob-green/5 border-sicoob-green/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-sicoob-green-dark">Aguardando Vendedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-sicoob-green-dark">R$ 73.400,00</div>
                    <p className="text-xs text-sicoob-green/70 mt-1 font-medium">Total em 2 lotes consolidados</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">R$ 152.000,00</div>
                    <p className="text-xs text-muted-foreground mt-1">4 consolidações em fábrica</p>
                </CardContent>
            </Card>
            <Card className="border-[1.5px]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Entregues (Mês)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">R$ 89.200,00</div>
                    <p className="text-xs text-muted-foreground mt-1">Ciclo finalizado com sucesso</p>
                </CardContent>
            </Card>
        </div>

        <Card className="border-[1.5px]">
          <CardHeader>
            <CardTitle>Histórico de Agregados</CardTitle>
            <CardDescription>Lotes de pedidos enviados para produção por carteira.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote ID</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Qtd. Pedidos</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidations?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                    <TableCell className="font-medium">{item.vendedor}</TableCell>
                    <TableCell>{item.orders} itens</TableCell>
                    <TableCell>{formatCurrency(item.value)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'pending_seller' ? 'outline' : 'secondary'} className="gap-1">
                        {item.status === 'pending_seller' ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {item.status === 'pending_seller' ? 'Pendente' : 'Em Produção'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-2">
                        Detalhes <ArrowRight className="h-4 w-4" />
                      </Button>
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
