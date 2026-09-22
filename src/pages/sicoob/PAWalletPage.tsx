import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, AlertCircle, Calendar, Plus, History, Clock, FileText, CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sicoobBudgetService } from "@/services/sicoob/budgetService";
import { sicoobApprovalService } from "@/services/sicoob/approvalService";
import { formatCurrency } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PAWalletPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);
  const [requestedAmount, setRequestedAmount] = React.useState("");
  const [requestReason, setRequestReason] = React.useState("");
  
  const { data: budget, isLoading } = useQuery({
    queryKey: ["pa-budget", user?.id],
    queryFn: () => {
      if (!profile?.pa_id) return null;
      return sicoobBudgetService.getBudgetByPa(profile.pa_id);
    },
    enabled: !!profile?.pa_id,
  });

  const { data: requests } = useQuery({
    queryKey: ["budget-requests", profile?.pa_id],
    queryFn: () => {
      if (!profile?.pa_id) return [];
      return sicoobApprovalService.listLimitIncreaseRequests(profile.pa_id);
    },
    enabled: !!profile?.pa_id,
  });

  const createRequest = useMutation({
    mutationFn: () => {
      if (!profile?.pa_id) throw new Error("PA não identificado");
      return sicoobApprovalService.createLimitIncreaseRequest(
        profile.pa_id,
        Number(requestedAmount),
        requestReason
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-requests"] });
      setIsRequestDialogOpen(false);
      setRequestedAmount("");
      setRequestReason("");
      toast.success("Solicitação enviada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao enviar solicitação: " + err.message);
    }
  });

  const spentPercent = budget ? (Number(budget.verba_consumida) / Number(budget.verba_total)) * 100 : 0;
  const remaining = budget ? Number(budget.verba_total) - Number(budget.verba_consumida) : 0;
  const currentPeriod = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-display text-sicoob-green-dark">Gestão de Verba</h1>
            <p className="text-sm text-muted-foreground italic">Controle seu saldo e garanta o abastecimento da sua agência.</p>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border/40">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium capitalize">{currentPeriod}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-[1.5px] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verba Mensal</CardTitle>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Number(budget?.verba_total || 0))}</div>
              <p className="text-xs text-muted-foreground mt-1">Limite total aprovado pela Singular</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Consumido</CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(budget?.verba_consumida || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">{spentPercent.toFixed(1)}% do limite utilizado</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] shadow-sm bg-sicoob-green/5 border-sicoob-green/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
              <Wallet className="w-4 h-4 text-sicoob-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sicoob-green-dark">{formatCurrency(remaining)}</div>
              <p className="text-xs text-muted-foreground mt-1 text-sicoob-green-dark/80 font-medium">Disponível para novos pedidos</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="status" className="gap-2">
              <TrendingUp className="h-4 w-4" /> Status da Verba
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <History className="h-4 w-4" /> Solicitações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <Card className="border-[1.5px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Status da Utilização</CardTitle>
                  <CardDescription>Visualização gráfica do consumo de verba em tempo real.</CardDescription>
                </div>
                <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-sicoob-green hover:bg-sicoob-green-dark">
                      <Plus className="h-4 w-4" /> Aumento de Limite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Solicitar Aumento de Verba</DialogTitle>
                      <DialogDescription>
                        Descreva o valor adicional necessário e a justificativa para análise da Singular.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Valor Adicional (R$)</Label>
                        <Input 
                          id="amount" 
                          type="number" 
                          placeholder="Ex: 5000" 
                          value={requestedAmount}
                          onChange={(e) => setRequestedAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reason">Justificativa</Label>
                        <Textarea 
                          id="reason" 
                          placeholder="Descreva o motivo da solicitação..." 
                          className="min-h-[100px]"
                          value={requestReason}
                          onChange={(e) => setRequestReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>Cancelar</Button>
                      <Button 
                        disabled={!requestedAmount || !requestReason || createRequest.isPending}
                        onClick={() => createRequest.mutate()}
                      >
                        {createRequest.isPending ? "Enviando..." : "Enviar Solicitação"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Progresso de Consumo</span>
                    <span className={cn(spentPercent > 90 ? "text-destructive" : "text-sicoob-green")}>{spentPercent.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={spentPercent} 
                    className="h-3" 
                    indicatorClassName={spentPercent > 90 ? "bg-destructive" : "bg-sicoob-green"}
                  />
                </div>

                {spentPercent > 90 && (
                  <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Limite Crítico</AlertTitle>
                    <AlertDescription>
                      Você atingiu mais de 90% da verba mensal. Novos pedidos podem exigir aprovação manual da Singular.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="border-[1.5px]">
              <CardHeader>
                <CardTitle>Histórico de Solicitações</CardTitle>
                <CardDescription>Acompanhe o status dos seus pedidos de aumento de limite.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground italic">
                      Nenhuma solicitação realizada até o momento.
                    </div>
                  ) : (
                    requests?.map((req: any) => (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border",
                            req.status === 'approved' ? "bg-status-delivered/10 border-status-delivered/20 text-status-delivered" : 
                            req.status === 'rejected' ? "bg-destructive/10 border-destructive/20 text-destructive" : 
                            "bg-status-production/10 border-status-production/20 text-status-production"
                          )}>
                            {req.status === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : 
                             req.status === 'rejected' ? <X className="h-5 w-5" /> : 
                             <Clock className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-sm">Aumento de {formatCurrency(req.requested_limit || req.requested_amount)}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">{req.reason}</div>
                            <div className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">
                              {new Date(req.created_at).toLocaleDateString('pt-BR')} • {new Date(req.created_at).toLocaleTimeString('pt-BR')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Badge variant={
                             req.status === 'approved' ? "secondary" : 
                             req.status === 'rejected' ? "destructive" : 
                             "outline"
                           }>
                             {req.status === 'approved' ? "Aprovado" : 
                              req.status === 'rejected' ? "Rejeitado" : 
                              "Pendente"}
                           </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
