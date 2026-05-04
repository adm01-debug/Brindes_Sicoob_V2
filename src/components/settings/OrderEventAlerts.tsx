import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Loader2,
  Clock,
  CheckCircle2,
  Send,
  Factory,
  PackageCheck,
  Truck,
  PackageOpen,
  CircleCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { OrderStatus } from "@/types/orders";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/constants/orders";

type EventDef = {
  key: OrderStatus;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
};

const EVENT_DEFS: EventDef[] = [
  { key: "enviado_gestor", title: "Pedido enviado ao Gestor", description: "Quando um pedido é enviado para aprovação do gestor", icon: Clock, iconClass: "text-amber-400" },
  { key: "aprovado_gestor", title: "Pedido aprovado pelo Gestor", description: "Quando o gestor aprova um pedido", icon: CheckCircle2, iconClass: "text-primary" },
  { key: "enviado_vendedor", title: "Pedido enviado ao Vendedor", description: "Quando o pedido é encaminhado ao vendedor", icon: Send, iconClass: "text-violet-400" },
  { key: "em_producao", title: "Pedido em produção", description: "Quando o vendedor inicia a produção", icon: Factory, iconClass: "text-orange-400" },
  { key: "em_separacao", title: "Pedido em separação", description: "Quando o pedido está sendo separado", icon: PackageCheck, iconClass: "text-indigo-400" },
  { key: "em_transporte", title: "Pedido em transporte", description: "Quando o pedido sai para entrega", icon: Truck, iconClass: "text-sky-400" },
  { key: "entregue", title: "Pedido entregue", description: "Quando o pedido é entregue no destino", icon: PackageOpen, iconClass: "text-teal-400" },
  { key: "concluido", title: "Pedido concluído", description: "Quando o pedido é finalizado", icon: CircleCheck, iconClass: "text-emerald-400" },
  { key: "cancelado", title: "Pedido cancelado", description: "Quando um pedido é cancelado", icon: XCircle, iconClass: "text-destructive" },
];

// Fallback to keep keys aligned with the canonical status flow.
const ALL_KEYS = EVENT_DEFS.map((e) => e.key);
ORDER_STATUS_FLOW.forEach((s) => {
  if (s !== "rascunho" && !ALL_KEYS.includes(s)) {
    EVENT_DEFS.push({
      key: s,
      title: ORDER_STATUS_LABELS[s],
      description: `Alertas para "${ORDER_STATUS_LABELS[s]}"`,
      icon: Package,
      iconClass: "text-muted-foreground",
    });
  }
});

export function OrderEventAlerts() {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const eventsConfig = (preferences?.events_config ?? {}) as Record<string, boolean>;

  const isEnabled = (key: string) => eventsConfig[key] !== false; // default ON

  const toggle = (key: string, checked: boolean) => {
    updatePreferences({
      events_config: { ...eventsConfig, [key]: checked },
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Alertas por Tipo de Evento
        </CardTitle>
        <CardDescription>
          Escolha quais atualizações de pedido geram notificação
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border/60">
        {EVENT_DEFS.map(({ key, title, description, icon: Icon, iconClass }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3 min-w-0">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true" />
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium leading-none">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={isEnabled(key)}
              onCheckedChange={(checked) => toggle(key, checked)}
              aria-label={title}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
