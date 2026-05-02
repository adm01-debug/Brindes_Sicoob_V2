import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import { SicoobOrderItemLog } from "@/types/sicoob/orders";

interface OrderItemsHistoryProps {
  logs?: SicoobOrderItemLog[];
}

export const OrderItemsHistory = ({ logs }: OrderItemsHistoryProps) => {
  if (!logs || logs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Log de Alterações de Itens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="text-sm border-l-2 border-muted pl-4 py-1">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">
                  {log.action === 'INSERT' ? 'Item Adicionado' : 
                   log.action === 'DELETE' ? 'Item Removido' : 'Item Alterado'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Por: {log.user?.display_name || 'Sistema'}
              </p>
              <div className="mt-1 text-xs">
                {log.action === 'INSERT' && (
                  <span>Produto: {log.new_data?.product_name} (Qtd: {log.new_data?.quantity})</span>
                )}
                {log.action === 'DELETE' && (
                  <span>Produto: {log.old_data?.product_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
