import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

async function fetchQaRun(id: string | undefined) {
  if (!id) return null;
  const { data, error } = await supabase.from('qa_runs').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function fetchQaSteps(id: string | undefined) {
  if (!id) return [];
  const { data, error } = await supabase
    .from('qa_run_steps')
    .select('*')
    .eq('run_id', id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function saveStepStatus({ stepId, status }: { stepId: string; status: string }) {
  const { error } = await supabase.from('qa_run_steps').update({ status }).eq('id', stepId);
  if (error) throw error;
}

async function createQaStep(id: string | undefined, name: string) {
  const { error } = await supabase
    .from('qa_run_steps')
    .insert({ run_id: id, step_name: name, status: 'pass' });
  if (error) throw error;
}

type QaRun = NonNullable<Awaited<ReturnType<typeof fetchQaRun>>>;
type QaStep = Awaited<ReturnType<typeof fetchQaSteps>>[number];

function runMetrics(steps: QaStep[]) {
  const passCount = steps.filter((step) => step.status === 'pass').length;
  const failCount = steps.filter((step) => step.status === 'fail').length;
  const total = steps.length;
  return { passCount, failCount, total, progress: total > 0 ? (passCount / total) * 100 : 0 };
}

function RunHeader({
  id,
  run,
  onBack,
}: {
  id: string | undefined;
  run: QaRun | null | undefined;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-2xl font-bold text-sicoob-green-dark">
          Execução de Testes #{id?.slice(0, 8)}
        </h1>
        <div className="mt-1 flex gap-2">
          <Badge variant="outline">{run?.persona}</Badge>
          <Badge variant="outline">{run?.scenario}</Badge>
        </div>
      </div>
    </div>
  );
}

function RunMetricsCard({ steps }: { steps: QaStep[] }) {
  const metrics = runMetrics(steps);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Métricas de Sucesso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="text-4xl font-bold text-success">{metrics.progress.toFixed(0)}%</div>
          <div className="text-sm text-muted-foreground">
            {metrics.passCount} PASS / {metrics.failCount} FAIL / {metrics.total} TOTAL
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StepActions({
  step,
  onStatus,
}: {
  step: QaStep;
  onStatus: (stepId: string, status: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={step.status === 'pass' ? 'default' : 'outline'}
        className={step.status === 'pass' ? 'bg-success hover:bg-success/90' : ''}
        onClick={() => onStatus(step.id, 'pass')}
      >
        <CheckCircle2 className="mr-1 h-4 w-4" /> PASS
      </Button>
      <Button
        size="sm"
        variant={step.status === 'fail' ? 'destructive' : 'outline'}
        onClick={() => onStatus(step.id, 'fail')}
      >
        <XCircle className="mr-1 h-4 w-4" /> FAIL
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={
          step.status === 'blocked'
            ? 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/20'
            : ''
        }
        onClick={() => onStatus(step.id, 'blocked')}
      >
        <AlertCircle className="mr-1 h-4 w-4" /> BLOCKED
      </Button>
    </div>
  );
}

function RunChecklist({
  steps,
  newStepName,
  onNameChange,
  onAdd,
  onStatus,
}: {
  steps: QaStep[];
  newStepName: string;
  onNameChange: (name: string) => void;
  onAdd: () => void;
  onStatus: (stepId: string, status: string) => void;
}) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Checklist de Validação</span>
          <div className="flex gap-2">
            <Input
              placeholder="Novo passo..."
              className="h-8 w-48 text-xs"
              value={newStepName}
              onChange={(event) => onNameChange(event.target.value)}
            />
            <Button size="sm" className="h-8" onClick={onAdd} disabled={!newStepName}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
            >
              <span className="font-medium">{step.step_name}</span>
              <StepActions step={step} onStatus={onStatus} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function useQaRunDetail(id: string | undefined) {
  const queryClient = useQueryClient();
  const [newStepName, setNewStepName] = useState('');
  const runQuery = useQuery({
    queryKey: ['qa_run', id],
    enabled: Boolean(id),
    queryFn: () => fetchQaRun(id),
  });
  const stepsQuery = useQuery({
    queryKey: ['qa_run_steps', id],
    enabled: Boolean(id),
    queryFn: () => fetchQaSteps(id),
  });
  const invalidateSteps = () => queryClient.invalidateQueries({ queryKey: ['qa_run_steps', id] });
  const updateStepStatus = useMutation({
    mutationFn: saveStepStatus,
    onSuccess: () => {
      void invalidateSteps();
      toast.success('Status atualizado!');
    },
  });
  const addStep = useMutation({
    mutationFn: (name: string) => createQaStep(id, name),
    onSuccess: () => {
      void invalidateSteps();
      setNewStepName('');
      toast.success('Passo de teste adicionado!');
    },
  });
  return {
    run: runQuery.data,
    loadingRun: runQuery.isLoading,
    steps: stepsQuery.data ?? [],
    newStepName,
    setNewStepName,
    updateStepStatus,
    addStep,
  };
}

export default function QARunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { run, loadingRun, steps, newStepName, setNewStepName, updateStepStatus, addStep } =
    useQaRunDetail(id);

  if (loadingRun)
    return (
      <>
        <div className="p-8 text-center">Carregando execução...</div>
      </>
    );

  return (
    <>
      <PageSEO
        title={`QA Run #${id?.slice(0, 8)} - Sicoob`}
        description="Resumo da execução de testes."
        path={`/admin/qa/run/${id}`}
      />

      <div className="space-y-6">
        <RunHeader id={id} run={run} onBack={() => navigate('/admin/qa/preflight')} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <RunMetricsCard steps={steps} />
          <RunChecklist
            steps={steps}
            newStepName={newStepName}
            onNameChange={setNewStepName}
            onAdd={() => addStep.mutate(newStepName)}
            onStatus={(stepId, status) => updateStepStatus.mutate({ stepId, status })}
          />
        </div>
      </div>
    </>
  );
}
