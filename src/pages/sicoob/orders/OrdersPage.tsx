import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  LayoutGrid, 
  List, 
  Search,
  Filter,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

// Mock data for initial UI
const MOCK_ORDERS = [
  { id: '1', pa: 'PA Centro', status: 'draft', total: 1250.50, items: 4, date: '2024-05-01' },
  { id: '2', pa: 'PA Sul', status: 'pending_approval', total: 3400.00, items: 12, date: '2024-05-02' },
  { id: '3', pa: 'PA Norte', status: 'approved', total: 850.00, items: 2, date: '2024-04-30' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-slate-500/10 text-slate-500' },
  pending_approval: { label: 'Aguardando Aprovação', color: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-500' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

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

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por PA ou ID do pedido..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_ORDERS.map((order) => (
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
                  {order.pa} • {order.items} itens
                </p>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground pt-0">
                Criado em {order.date}
                <ArrowRight className="h-3 w-3 ml-auto" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
