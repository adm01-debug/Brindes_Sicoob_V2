import { type FormEvent, type ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, TrendingUp, Trophy, Calendar, Sparkles } from "lucide-react";
import { useSalesGoals, type CreateGoalInput } from "@/hooks/useSalesGoals";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type SalesGoal = NonNullable<ReturnType<typeof useSalesGoals>["activeGoal"]>;
const INITIAL_GOAL: CreateGoalInput = { goal_type: "monthly", target_value: 50000, target_quotes: 20, target_conversions: 10 };
const GOAL_TYPE_LABELS = { weekly: "Semanal", monthly: "Mensal", quarterly: "Trimestral" };
const formatGoalCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function GoalDialog({ open, onOpenChange, formData, setFormData, onSubmit, isCreating }: { open: boolean; onOpenChange: (open: boolean) => void; formData: CreateGoalInput; setFormData: (data: CreateGoalInput) => void; onSubmit: (event: FormEvent) => void; isCreating: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Criar Meta</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Nova Meta de Vendas</DialogTitle></DialogHeader><form onSubmit={onSubmit} className="space-y-4 mt-4">
    <div className="space-y-2"><Label>Período</Label><Select value={formData.goal_type} onValueChange={(value) => setFormData({ ...formData, goal_type: value as CreateGoalInput["goal_type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label>Meta de Valor (R$)</Label><Input type="number" value={formData.target_value} onChange={(event) => setFormData({ ...formData, target_value: Number(event.target.value) })} placeholder="50000" min={0} /></div>
    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Meta de Orçamentos</Label><Input type="number" value={formData.target_quotes} onChange={(event) => setFormData({ ...formData, target_quotes: Number(event.target.value) })} placeholder="20" min={0} /></div><div className="space-y-2"><Label>Meta de Conversões</Label><Input type="number" value={formData.target_conversions} onChange={(event) => setFormData({ ...formData, target_conversions: Number(event.target.value) })} placeholder="10" min={0} /></div></div>
    <Button type="submit" className="w-full" disabled={isCreating}>{isCreating ? "Criando..." : "Criar Meta"}</Button>
  </form></DialogContent></Dialog>;
}

function EmptyGoal({ dialog }: { dialog: ReactNode }) {
  return <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-dashed"><CardContent className="flex flex-col items-center justify-center py-8 text-center"><div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Target className="h-7 w-7 text-primary" /></div><h3 className="font-display font-semibold text-foreground mb-1">Defina sua Meta</h3><p className="text-sm text-muted-foreground mb-4 max-w-xs">Crie uma meta de vendas para acompanhar seu progresso!</p>{dialog}</CardContent></Card>;
}

function GoalMetric({ icon, label, current, target, progress }: { icon: ReactNode; label: string; current: number; target: number; progress: number }) {
  if (target <= 0) return null;
  return <div className="p-3 rounded-lg bg-background/50"><div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div><p className="font-semibold">{current}/{target}</p><Progress value={progress} className="h-1.5 mt-1" /></div>;
}

function DaysRemaining({ goal }: { goal: SalesGoal }) {
  const days = differenceInDays(new Date(goal.end_date), new Date());
  let label = <span className="text-muted-foreground">Período encerrado</span>;
  if (days > 0) label = <><span className="font-medium text-foreground">{days}</span> dias restantes</>;
  else if (days === 0) label = <span className="text-warning font-medium">Último dia!</span>;
  return <div className="flex items-center gap-2 pt-2 border-t border-border/50"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">{label}</span><span className="ml-auto text-xs text-muted-foreground">até {format(new Date(goal.end_date), "dd/MM", { locale: ptBR })}</span></div>;
}

function ActiveGoal({ goal, progress, progressColor }: { goal: SalesGoal; progress: number; progressColor: string }) {
  const cardClass = goal.is_achieved ? "bg-gradient-to-br from-success/10 to-success/5 border-success/30" : "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20";
  const quotesProgress = goal.target_quotes ? (goal.current_quotes / goal.target_quotes) * 100 : 0;
  const conversionsProgress = goal.target_conversions ? (goal.current_conversions / goal.target_conversions) * 100 : 0;
  return <Card className={cn("relative overflow-hidden transition-all", cardClass)}>{goal.is_achieved ? <div className="absolute top-2 right-2"><Badge variant="default" className="bg-success gap-1"><Trophy className="h-3 w-3" />Atingida!</Badge></div> : null}<CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><div className={cn("p-2 rounded-lg", goal.is_achieved ? "bg-success/20" : "bg-primary/20")}><Target className={cn("h-5 w-5", goal.is_achieved ? "text-success" : "text-primary")} /></div>Meta {GOAL_TYPE_LABELS[goal.goal_type]}</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="space-y-2"><div className="flex items-end justify-between"><div><p className="text-sm text-muted-foreground">Faturamento</p><p className="text-2xl font-bold text-foreground">{formatGoalCurrency(goal.current_value)}</p></div><p className="text-sm text-muted-foreground">de {formatGoalCurrency(goal.target_value)}</p></div><Progress value={progress} className={cn("h-3", progressColor === "success" && "[&>div]:bg-success", progressColor === "warning" && "[&>div]:bg-warning", progressColor === "destructive" && "[&>div]:bg-destructive")} /><p className="text-xs text-muted-foreground text-right">{progress.toFixed(1)}%</p></div>
    <div className="grid grid-cols-2 gap-3"><GoalMetric icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} label="Orçamentos" current={goal.current_quotes} target={goal.target_quotes} progress={quotesProgress} /><GoalMetric icon={<Sparkles className="h-4 w-4 text-muted-foreground" />} label="Conversões" current={goal.current_conversions} target={goal.target_conversions} progress={conversionsProgress} /></div><DaysRemaining goal={goal} />
  </CardContent></Card>;
}

export function SalesGoalsCard() {
  const {
    activeGoal,
    isLoading,
    createGoal,
    getProgress,
    getProgressColor,
    isCreating,
  } = useSalesGoals();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateGoalInput>(INITIAL_GOAL);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await createGoal(formData);
    setIsDialogOpen(false);
    setFormData(INITIAL_GOAL);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!activeGoal) {
    const dialog = <GoalDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} isCreating={isCreating} />;
    return <EmptyGoal dialog={dialog} />;
  }

  const progress = getProgress(activeGoal);
  const progressColor = getProgressColor(progress);
  return <ActiveGoal goal={activeGoal} progress={progress} progressColor={progressColor} />;
}
