import { User, Building2, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type OrderRow } from "@/types/orders";

interface OrderClientInfoProps {
  order: OrderRow;
}

export function OrderClientInfo({ order }: OrderClientInfoProps) {
  const hasInfo = order.client_name || order.client_company || order.client_email || order.client_phone;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.client_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{order.client_name}</span>
          </div>
        )}
        {order.client_company && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{order.client_company}</span>
          </div>
        )}
        {order.client_email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{order.client_email}</span>
          </div>
        )}
        {order.client_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{order.client_phone}</span>
          </div>
        )}
        {!hasInfo && (
          <p className="text-sm text-muted-foreground">Sem informações do cliente</p>
        )}
      </CardContent>
    </Card>
  );
}
