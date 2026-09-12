import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";
import { useOrderPayments } from "@/hooks/orders/extensions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OrderPaymentsTabProps {
  orderId: string;
}

export function OrderPaymentsTab({ orderId }: OrderPaymentsTabProps) {
  const { isSupervisorOrAbove } = useAuth();
  const { payments, isLoading, error, recordPayment } = useOrderPayments(orderId);
  const [installmentNumber, setInstallmentNumber] = useState(1);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [externalReference, setExternalReference] = useState('');

  const handleRecord = async () => {
    const numericAmount = Number(amount.replace(',', '.'));
    if (!Number.isInteger(installmentNumber) || installmentNumber <= 0 || !Number.isFinite(numericAmount) || numericAmount <= 0 || !dueDate) {
      toast.error('Informe parcela, valor e vencimento válidos.');
      return;
    }
    try {
      await recordPayment.mutateAsync({
        installmentNumber,
        amount: numericAmount,
        dueDate,
        status,
        paymentMethod: paymentMethod.trim() || null,
        externalReference: externalReference.trim() || null,
      });
      setAmount('');
      setDueDate('');
      setPaymentMethod('');
      setExternalReference('');
      setInstallmentNumber(Math.max(installmentNumber, ...(payments ?? []).map(payment => payment.installment_number)) + 1);
      setStatus('pending');
    } catch {
      // O mutation já exibe a mensagem normalizada e mantém o formulário.
    }
  };

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
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Estornado';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 w-32 bg-muted rounded" />
                <div className="h-4 w-40 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-sm text-destructive">
        <AlertCircle className="h-5 w-5" /> Não foi possível carregar os pagamentos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isSupervisorOrAbove && (
        <Card className="border-[1.5px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" /> Registrar parcela
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="payment-installment">Parcela</Label>
                <Input id="payment-installment" type="number" min={1} step={1} value={installmentNumber} onChange={event => setInstallmentNumber(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Valor</Label>
                <Input id="payment-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={event => setAmount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-due-date">Vencimento</Label>
                <Input id="payment-due-date" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Situação</Label>
                <Select value={status} onValueChange={(value: 'pending' | 'paid') => setStatus(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Meio de pagamento</Label>
                <Input id="payment-method" placeholder="Ex.: boleto, PIX" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-reference">Referência externa</Label>
                <Input id="payment-reference" placeholder="ID da conciliação" value={externalReference} onChange={event => setExternalReference(event.target.value)} />
              </div>
            </div>
            <Button type="button" onClick={handleRecord} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Registrando…' : 'Registrar parcela'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payments?.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/30 text-center animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/80">Nenhum pagamento registrado</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Este pedido ainda não possui registros de parcelas ou pagamentos efetuados.
            </p>
          </div>
        ) : (
          payments?.map((payment) => (
            <Card key={payment.id} className="transition-all hover:shadow-md border-border/60 hover:border-border overflow-hidden">
              <div className={cn(
                "h-1 w-full",
                payment.status === 'paid' ? "bg-success" : payment.status === 'overdue' ? "bg-destructive" : "bg-warning"
              )} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Parcela #{payment.installment_number || 1}
                  </CardTitle>
                  <Badge variant={payment.status === 'paid' ? 'success' : 'warning'} className="gap-1">
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
