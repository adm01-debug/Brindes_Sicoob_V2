import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useOrdersList } from '@/hooks/useOrders';

export function OrderStatsBar() {
  const { data: orders } = useOrdersList();
  
  const stats = {
    total: orders?.length || 0,
    completed: orders?.filter(o => o.status === 'concluido').length || 0,
    pending: orders?.filter(o => o.status === 'enviado_gestor').length || 0,
    production: orders?.filter(o => o.status === 'em_producao').length || 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total de Pedidos</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Concluídos</p>
            <p className="text-xl font-bold">{stats.completed}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
            <p className="text-xl font-bold">{stats.pending}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Em Produção</p>
            <p className="text-xl font-bold">{stats.production}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
