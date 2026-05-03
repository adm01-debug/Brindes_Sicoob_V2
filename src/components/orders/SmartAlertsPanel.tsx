import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, TrendingUp, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SmartAlert {
  id: string;
  type: "warning" | "info" | "success" | "critical";
  title: string;
  message: string;
  timestamp: string;
}

export function SmartAlertsPanel() {
  const { data: alerts } = useQuery({
    queryKey: ["smart-alerts"],
    queryFn: async () => {
      // In a real app, this would call an Edge Function or complex SQL
      // For now, let's mock some logic based on data
      const { data: pending } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("status", "enviado_gestor");
      
      const alerts: SmartAlert[] = [];
      
      if (pending && pending.length > 5) {
        alerts.push({
          id: "high-volume",
          type: "warning",
          title: "Alto volume de aprovações",
          message: `Você tem ${pending.length} pedidos aguardando aprovação.`,
          timestamp: new Date().toISOString()
        });
      }

      // Check for old orders
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const oldOrders = pending?.filter(o => new Date(o.created_at) < yesterday);
      
      if (oldOrders && oldOrders.length > 0) {
        alerts.push({
          id: "stale-orders",
          type: "critical",
          title: "Pedidos atrasados",
          message: `${oldOrders.length} pedidos estão aguardando há mais de 24h.`,
          timestamp: new Date().toISOString()
        });
      }

      return alerts;
    }
  });

  if (!alerts || alerts.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Alertas Inteligentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="flex gap-3 items-start p-2 rounded-lg bg-background/50 border border-border/50">
            {alert.type === 'critical' ? <AlertCircle className="h-4 w-4 text-destructive mt-0.5" /> : <Info className="h-4 w-4 text-primary mt-0.5" />}
            <div>
              <p className="text-xs font-bold">{alert.title}</p>
              <p className="text-[11px] text-muted-foreground">{alert.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
