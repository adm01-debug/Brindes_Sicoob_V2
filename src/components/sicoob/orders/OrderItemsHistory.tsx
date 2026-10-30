import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import { type SicoobOrderItemLog } from "@/types/sicoob/orders";
import { type Json } from "@/integrations/supabase/types";

interface OrderItemsHistoryProps {
  logs?: SicoobOrderItemLog[];
}

function itemSnapshot(value: Json | null): Record<string, Json | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
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
          {logs.map((log) => {
            const newItem = itemSnapshot(log.new_data);
            const oldItem = itemSnapshot(log.old_data);

            return (
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
                  <span>Produto: {String(newItem.product_name ?? '')} (Qtd: {String(newItem.quantity ?? '')})</span>
                )}
                {log.action === 'DELETE' && (
                  <span>Produto: {String(oldItem.product_name ?? '')}</span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
