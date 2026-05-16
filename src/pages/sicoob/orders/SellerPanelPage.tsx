import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function SellerPanelPage() {
  const { user } = useAuth();

  const STATS = [
    { title: "Meus Pedidos", value: "12", icon: Package, color: "text-info" },
    { title: "Aguardando", value: "3", icon: Clock, color: "text-warning" },
    { title: "Aprovados", value: "8", icon: CheckCircle2, color: "text-success" },
    { title: "Rejeitados", value: "1", icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <>
      <PageSEO title="Painel do Vendedor Sicoob" description="Gestão de vendas e pedidos para vendedores Sicoob." path="/sicoob/vendas" noIndex />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Olá, Vendedor</h1>
            <p className="text-muted-foreground">
              Gerencie seus pedidos e acompanhe suas metas.
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Novo Pedido
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>Seus últimos 5 pedidos realizados.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Pedido #S00{i}</span>
                      <span className="text-xs text-muted-foreground">R$ 450,00 • {i} itens</span>
                    </div>
                    <div className="text-xs font-medium px-2 py-1 rounded bg-warning/10 text-warning border border-warning/20">
                      Pendente
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Minha Meta</CardTitle>
                <CardDescription>Acompanhamento de vendas do mês.</CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Progresso</span>
                  <span>R$ 15.400 / R$ 20.000</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '77%' }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Você está a <b>R$ 4.600</b> de atingir sua meta mensal!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
