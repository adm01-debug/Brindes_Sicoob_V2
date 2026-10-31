import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarClock, Plus, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  sicoobApprovalDelegationService,
  type ApprovalDelegation,
} from '@/services/sicoob/approvalDelegationService';

const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const initialPeriod = () => {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1_000);
  return { startsAt: toLocalInput(start), endsAt: toLocalInput(end) };
};

const personName = (person: ApprovalDelegation['delegate'], fallback: string) =>
  person?.full_name || person?.email || fallback;

const statusOf = (delegation: ApprovalDelegation) => {
  if (delegation.revoked_at) return { label: 'Revogada', variant: 'destructive' as const };
  const now = Date.now();
  if (new Date(delegation.ends_at).getTime() <= now)
    return { label: 'Expirada', variant: 'secondary' as const };
  if (new Date(delegation.starts_at).getTime() > now)
    return { label: 'Agendada', variant: 'outline' as const };
  return { label: 'Ativa', variant: 'default' as const };
};

const DelegationTableBody = ({
  data,
  isLoading,
  isError,
  onRevoke,
}: {
  data: ApprovalDelegation[];
  isLoading: boolean;
  isError: boolean;
  onRevoke: (delegation: ApprovalDelegation) => void;
}) => {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
          Carregando delegações...
        </TableCell>
      </TableRow>
    );
  }
  if (isError) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="py-10 text-center text-destructive">
          Não foi possível carregar as delegações.
        </TableCell>
      </TableRow>
    );
  }
  if (data.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
          Nenhuma delegação registrada.
        </TableCell>
      </TableRow>
    );
  }

  return data.map((delegation) => {
    const status = statusOf(delegation);
    const active = status.label === 'Ativa' || status.label === 'Agendada';
    return (
      <TableRow key={delegation.id}>
        <TableCell className="font-medium">
          {personName(delegation.delegate, delegation.delegate_id)}
        </TableCell>
        <TableCell>{personName(delegation.delegator, delegation.delegator_id)}</TableCell>
        <TableCell>
          <div>{delegation.cooperative?.nome ?? 'Singular'}</div>
          <div className="text-xs text-muted-foreground">
            {delegation.pa?.nome ?? 'Toda a Singular'}
          </div>
        </TableCell>
        <TableCell className="space-x-1">
          {delegation.competencies.includes('approve_order') && (
            <Badge variant="outline">Aprovar</Badge>
          )}
          {delegation.competencies.includes('reject_order') && (
            <Badge variant="outline">Rejeitar</Badge>
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm">
          <div className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />{' '}
            {format(new Date(delegation.starts_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
          </div>
          <div className="pl-[18px] text-muted-foreground">
            até {format(new Date(delegation.ends_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={status.variant}>{status.label}</Badge>
        </TableCell>
        <TableCell className="text-right">
          {active ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive"
              onClick={() => onRevoke(delegation)}
            >
              <ShieldX className="h-4 w-4" /> Revogar
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Encerrada</span>
          )}
        </TableCell>
      </TableRow>
    );
  });
};

export const ApprovalDelegationsTab = () => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApprovalDelegation | null>(null);
  const [delegateId, setDelegateId] = useState('');
  const [competencies, setCompetencies] = useState(['approve_order', 'reject_order']);
  const [{ startsAt, endsAt }, setPeriod] = useState(initialPeriod);
  const [reason, setReason] = useState('');
  const [revocationReason, setRevocationReason] = useState('');

  const delegations = useQuery({
    queryKey: ['sicoob-approval-delegations'],
    queryFn: sicoobApprovalDelegationService.list,
  });
  const candidates = useQuery({
    queryKey: ['sicoob-approval-delegation-candidates'],
    queryFn: sicoobApprovalDelegationService.listCandidates,
  });

  const resetCreateForm = () => {
    setDelegateId('');
    setCompetencies(['approve_order', 'reject_order']);
    setPeriod(initialPeriod());
    setReason('');
  };

  const createMutation = useMutation({
    mutationFn: () =>
      sicoobApprovalDelegationService.create({
        delegateId,
        competencies,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason: reason.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sicoob-approval-delegations'] });
      setCreateOpen(false);
      resetCreateForm();
      toast.success('Delegação registrada com vigência e escopo definidos.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeMutation = useMutation({
    mutationFn: () => {
      if (!revokeTarget) throw new Error('Selecione uma delegação para revogar.');
      return sicoobApprovalDelegationService.revoke(revokeTarget.id, revocationReason.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sicoob-approval-delegations'] });
      setRevokeTarget(null);
      setRevocationReason('');
      toast.success('Delegação revogada imediatamente.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const formValid = useMemo(
    () =>
      delegateId.length > 0 &&
      competencies.length > 0 &&
      reason.trim().length >= 10 &&
      Boolean(startsAt) &&
      Boolean(endsAt) &&
      new Date(endsAt) > new Date(startsAt),
    [competencies.length, delegateId, endsAt, reason, startsAt],
  );

  const toggleCompetence = (competence: string, checked: boolean) => {
    setCompetencies((current) =>
      checked
        ? Array.from(new Set([...current, competence]))
        : current.filter((item) => item !== competence),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Delegações temporárias de aprovação
            </CardTitle>
            <CardDescription>
              O substituto só decide dentro da unidade, das competências e da vigência registradas.
              A autoridade do titular é conferida novamente em cada decisão.
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" /> Nova delegação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Registrar substituição temporária</DialogTitle>
                <DialogDescription>
                  A unidade e a autoridade máxima serão derivadas do seu vínculo atual e validadas
                  pelo servidor.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="delegation-person">Substituto</Label>
                  <Select value={delegateId} onValueChange={setDelegateId}>
                    <SelectTrigger id="delegation-person">
                      <SelectValue placeholder="Selecione um profissional ativo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(candidates.data ?? []).map((candidate) => (
                        <SelectItem key={candidate.user_id} value={candidate.user_id}>
                          {candidate.full_name || candidate.email || candidate.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-sm font-medium">Competências</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={competencies.includes('approve_order')}
                      onCheckedChange={(checked) =>
                        toggleCompetence('approve_order', checked === true)
                      }
                    />
                    Aprovar solicitações
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={competencies.includes('reject_order')}
                      onCheckedChange={(checked) =>
                        toggleCompetence('reject_order', checked === true)
                      }
                    />
                    Rejeitar solicitações
                  </label>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="delegation-start">Início</Label>
                    <Input
                      id="delegation-start"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(event) =>
                        setPeriod((current) => ({ ...current, startsAt: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="delegation-end">Término</Label>
                    <Input
                      id="delegation-end"
                      type="datetime-local"
                      value={endsAt}
                      onChange={(event) =>
                        setPeriod((current) => ({ ...current, endsAt: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="delegation-reason">Motivo formal</Label>
                  <Textarea
                    id="delegation-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Ex.: férias do titular entre 5 e 12 de outubro"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 10 caracteres; vigência máxima de 90 dias.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!formValid || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? 'Registrando...' : 'Registrar delegação'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Substituto</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Competências</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <DelegationTableBody
                  data={delegations.data ?? []}
                  isLoading={delegations.isLoading}
                  isError={delegations.isError}
                  onRevoke={setRevokeTarget}
                />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar delegação</DialogTitle>
            <DialogDescription>
              A revogação vale imediatamente. O substituto perderá a autoridade antes da próxima
              decisão.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="revocation-reason">Justificativa formal</Label>
            <Textarea
              id="revocation-reason"
              value={revocationReason}
              onChange={(event) => setRevocationReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={revocationReason.trim().length < 10 || revokeMutation.isPending}
              onClick={() => revokeMutation.mutate()}
            >
              {revokeMutation.isPending ? 'Revogando...' : 'Confirmar revogação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
