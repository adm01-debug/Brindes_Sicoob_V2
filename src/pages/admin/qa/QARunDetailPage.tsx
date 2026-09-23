import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function QARunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newStepName, setNewStepName] = useState("");

  const { data: run, isLoading: loadingRun } = useQuery({
    queryKey: ["qa_run", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_runs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: steps, isLoading: loadingSteps } = useQuery({
    queryKey: ["qa_run_steps", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_run_steps")
        .select("*")
        .eq("run_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const updateStepStatus = useMutation({
    mutationFn: async ({ stepId, status }: { stepId: string, status: string }) => {
      const { error } = await supabase
        .from("qa_run_steps")
        .update({ status })
        .eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa_run_steps", id] });
      toast.success("Status atualizado!");
    }
  });

  const addStep = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("qa_run_steps")
        .insert({ run_id: id, step_name: name, status: 'pass' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa_run_steps", id] });
      setNewStepName("");
      toast.success("Passo de teste adicionado!");
    }
  });

  if (loadingRun) return <><div className="p-8 text-center">Carregando execução...</div></>;

  const passCount = steps?.filter(s => s.status === 'pass').length || 0;
  const failCount = steps?.filter(s => s.status === 'fail').length || 0;
  const total = steps?.length || 0;
  const progress = total > 0 ? (passCount / total) * 100 : 0;

  return (
    <>
      <PageSEO title={`QA Run #${id?.slice(0,8)} - Sicoob`} description="Resumo da execução de testes." path={`/admin/qa/run/${id}`} />
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/qa/preflight")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-sicoob-green-dark">Execução de Testes #{id?.slice(0, 8)}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{run?.persona}</Badge>
              <Badge variant="outline">{run?.scenario}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Métricas de Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="text-4xl font-bold text-success">{progress.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">{passCount} PASS / {failCount} FAIL / {total} TOTAL</div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Checklist de Validação</span>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Novo passo..." 
                    className="h-8 w-48 text-xs" 
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                  />
                  <Button size="sm" className="h-8" onClick={() => addStep.mutate(newStepName)} disabled={!newStepName}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps?.map((step) => (
                  <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <span className="font-medium">{step.step_name}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={step.status === 'pass' ? 'default' : 'outline'}
                        className={step.status === 'pass' ? 'bg-success hover:bg-success/90' : ''}
                        onClick={() => updateStepStatus.mutate({ stepId: step.id, status: 'pass' })}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> PASS
                      </Button>
                      <Button 
                        size="sm" 
                        variant={step.status === 'fail' ? 'destructive' : 'outline'}
                        onClick={() => updateStepStatus.mutate({ stepId: step.id, status: 'fail' })}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> FAIL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={step.status === 'blocked' ? 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20' : ''}
                        onClick={() => updateStepStatus.mutate({ stepId: step.id, status: 'blocked' })}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" /> BLOCKED
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
