import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, AlertCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

export const BudgetsTab = () => {
  const { isSupervisorOrAbove } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();


  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ["pa_budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pa_budgets")
        .select(`
          *,
          pa:postos_atendimento(
            nome,
            codigo,
            cooperativa:cooperativas(nome, codigo)
          )
        `)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pas } = useQuery({
    queryKey: ["postos_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postos_atendimento")
        .select("*, cooperativa:cooperativas(nome, codigo)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newBudget: any) => {
      const { data, error } = await supabase
        .from("pa_budgets")
        .insert([newBudget])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa_budgets"] });
      toast.success("Verba definida com sucesso");
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const alcada = parseFloat(formData.get("alcada") as string);
    const year = parseInt(formData.get("year") as string);
    const month = parseInt(formData.get("month") as string);

    if (amount <= 0) {
      setValidationError("O valor da verba deve ser maior que zero");
      return;
    }

    if (alcada < 0) {
      setValidationError("O limite de alçada não pode ser negativo");
      return;
    }

    if (alcada > amount) {
      setValidationError("O limite de alçada não pode ser maior que a verba total");
      return;
    }

    if (year < 2000 || year > 2100) {
      setValidationError("Ano inválido (deve ser entre 2000 e 2100)");
      return;
    }

    createMutation.mutate({
      pa_id: formData.get("pa_id"),
      mes: month,
      ano: year,
      verba_total: amount,
      verba_consumida: 0,
      limite_alcada: alcada || 0,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) setValidationError(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Alocar Verba
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Alocar Verba para PA</DialogTitle>
                <DialogDescription>
                  Defina o limite de compras mensal para um Posto de Atendimento.
                </DialogDescription>
              </DialogHeader>

              {validationError && (
                <Alert variant="destructive" className="my-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro de Validação</AlertTitle>
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label>Posto de Atendimento (PA)</label>
                  <Select name="pa_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o PA" />
                    </SelectTrigger>
                    <SelectContent>
                      {pas?.map((pa: any) => (
                        <SelectItem key={pa.id} value={pa.id}>
                          {pa.cooperativa?.codigo} - {pa.nome} ({pa.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label>Mês</label>
                    <Select name="month" defaultValue={new Date().getMonth() + 1 + ""}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={i + 1 + ""}>
                            {new Date(0, i).toLocaleString("pt-BR", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label>Ano</label>
                    <Input
                      name="year"
                      type="number"
                      defaultValue={new Date().getFullYear()}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label>Valor da Verba (R$)</label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label>Limite de Alçada p/ Pedido (R$)</label>
                  <Input
                    name="alcada"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                  />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Alocando..." : "Confirmar Alocação"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Singular / PA</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Alocado</TableHead>
              <TableHead>Utilizado</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgetsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : budgets?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhuma verba definida.
                </TableCell>
              </TableRow>
            ) : (
              budgets?.map((b: any) => {
                const balance = b.verba_total - b.verba_consumida;
                const percentage = (b.verba_consumida / b.verba_total) * 100;
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {b.pa?.cooperativa?.nome}
                      </div>
                      <div className="font-medium">{b.pa?.nome}</div>
                    </TableCell>
                    <TableCell>
                      {new Date(0, b.mes - 1).toLocaleString("pt-BR", {
                        month: "short",
                      })}{" "}
                      / {b.ano}
                    </TableCell>
                    <TableCell>{formatCurrency(b.verba_total)}</TableCell>
                    <TableCell className="text-destructive">
                      {formatCurrency(b.verba_consumida)}
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(balance)}
                    </TableCell>
                    <TableCell>
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            percentage > 90
                              ? "bg-destructive"
                              : percentage > 70
                              ? "bg-warning"
                              : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
