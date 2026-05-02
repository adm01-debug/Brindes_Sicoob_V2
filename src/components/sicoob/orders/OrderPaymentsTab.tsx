import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useOrderPayments } from "@/hooks/useOrderExtensions";
import { Badge } from "@/components/ui/badge";

interface OrderPaymentsTabProps {
  orderId: string;
}

export function OrderPaymentsTab({ orderId }: OrderPaymentsTabProps) {
  const { payments, isLoading } = useOrderPayments(orderId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      default: return status;
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando informações de pagamento...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payments?.length === 0 ? (
          <div className="col-span-2 p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground">
            Nenhum registro de pagamento encontrado para este pedido.
          </div>
        ) : (
          payments?.map((payment) => (
            <Card key={payment.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Parcela #{payment.installment_number || 1}
                  </CardTitle>
                  <Badge variant={payment.status === 'paid' ? 'outline' : 'secondary'} className="gap-1">
                    {getStatusIcon(payment.status)}
                    {getStatusLabel(payment.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Vencimento: {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                  </div>
                  {payment.paid_at && (
                    <p className="text-xs text-success font-medium">
                      Pago em: {new Date(payment.paid_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {payment.payment_method && (
                    <p className="text-xs text-muted-foreground uppercase">
                      Método: {payment.payment_method}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
