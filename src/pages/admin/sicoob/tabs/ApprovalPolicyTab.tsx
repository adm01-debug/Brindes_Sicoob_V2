import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, FileSignature, Plus, ShieldCheck, ShieldOff, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BASELINE_POLICY,
  pickPolicyInForce,
  sicoobApprovalPolicyService,
  type ApprovalPolicy,
  type PolicyScope,
} from "@/services/sicoob/approvalPolicyService";

const POLICIES_QUERY_KEY = "sicoob-approval-policies";
const SCOPES_QUERY_KEY = "sicoob-approval-policy-scopes";

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
};

const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function PolicyRuleBadges({ policy }: { policy: ApprovalPolicy | null }) {
  const forbidSelfApproval = policy ? policy.forbid_self_approval : BASELINE_POLICY.forbidSelfApproval;
  const requireActiveMembership = policy
    ? policy.require_active_membership
    : BASELINE_POLICY.requireActiveMembership;

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={forbidSelfApproval ? "default" : "secondary"} className="gap-1">
        {forbidSelfApproval ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
        {forbidSelfApproval ? "Bloqueia autoaprovação" : "Permite autoaprovação"}
      </Badge>
      <Badge variant={requireActiveMembership ? "default" : "secondary"} className="gap-1">
        <UserCheck className="h-3 w-3" />
        {requireActiveMembership ? "Exige vínculo ativo" : "Dispensa vínculo ativo"}
      </Badge>
    </div>
  );
}

function CurrentPolicyCell({
  policy,
  baselineLabel = "Padrão do sistema",
}: {
  policy: ApprovalPolicy | null;
  baselineLabel?: string;
}) {
  if (!policy) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{BASELINE_POLICY.version}</span>
          <Badge variant="outline">{baselineLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Nenhuma versão publicada: o servidor aplica as regras padrão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs">{policy.version}</span>
        <Badge variant="default">Vigente</Badge>
      </div>
      <p className="text-xs text-muted-foreground">Desde {formatDateTime(policy.effective_from)}</p>
    </div>
  );
}

function ScopeRow({
  scope,
  policy,
  onPublish,
  onClose,
  isClosing,
}: {
  scope: PolicyScope;
  policy: ApprovalPolicy | null;
  onPublish: (scope: PolicyScope) => void;
  onClose: (scope: PolicyScope) => void;
  isClosing: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{scope.cooperativeName}</TableCell>
      <TableCell>
        <CurrentPolicyCell policy={policy} />
      </TableCell>
      <TableCell>
        <PolicyRuleBadges policy={policy} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onPublish(scope)}>
            <Plus className="h-3.5 w-3.5" /> Publicar versão
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-destructive"
            disabled={!policy || isClosing}
            onClick={() => onClose(scope)}
          >
            <ShieldOff className="h-3.5 w-3.5" /> Encerrar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PolicyHistoryTable({ policies }: { policies: ApprovalPolicy[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Escopo</TableHead>
          <TableHead>Versão</TableHead>
          <TableHead>Regras</TableHead>
          <TableHead>Início</TableHead>
          <TableHead>Término</TableHead>
          <TableHead>Situação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {policies.map((policy) => (
          <TableRow key={policy.id}>
            <TableCell>{policy.cooperative?.nome ?? "Global"}</TableCell>
            <TableCell className="font-mono text-xs">{policy.version}</TableCell>
            <TableCell>
              <PolicyRuleBadges policy={policy} />
            </TableCell>
            <TableCell>{formatDateTime(policy.effective_from)}</TableCell>
            <TableCell>{formatDateTime(policy.effective_until)}</TableCell>
            <TableCell>
              {policy.is_active ? (
                <Badge variant="default">Ativa</Badge>
              ) : (
                <Badge variant="secondary">Encerrada</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ScopesTableBody({
  scopes,
  policies,
  onPublish,
  onClose,
  isClosing,
}: {
  scopes: PolicyScope[];
  policies: ApprovalPolicy[];
  onPublish: (scope: PolicyScope) => void;
  onClose: (scope: PolicyScope) => void;
  isClosing: boolean;
}) {
  return (
    <TableBody>
      {scopes.map((scope) => (
        <ScopeRow
          key={scope.cooperativeId ?? "global"}
          scope={scope}
          policy={pickPolicyInForce(policies, scope.cooperativeId)}
          onPublish={onPublish}
          onClose={onClose}
          isClosing={isClosing}
        />
      ))}
    </TableBody>
  );
}

function resolveDefaults(policies: ApprovalPolicy[], cooperativeId: string | null) {
  const current = pickPolicyInForce(policies, cooperativeId);
  return {
    forbidSelfApproval: current?.forbid_self_approval ?? BASELINE_POLICY.forbidSelfApproval,
    requireActiveMembership:
      current?.require_active_membership ?? BASELINE_POLICY.requireActiveMembership,
  };
}

function FlagCheckbox({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm" htmlFor={id}>
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span>
        {label}
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function PublishPolicyDialog({
  scope,
  policies,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  scope: PolicyScope | null;
  policies: ApprovalPolicy[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    version: string;
    effectiveFrom: string;
    forbidSelfApproval: boolean;
    requireActiveMembership: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [version, setVersion] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => toLocalInput(new Date()));
  const [forbidSelfApproval, setForbidSelfApproval] = useState(true);
  const [requireActiveMembership, setRequireActiveMembership] = useState(true);
  const [preparedFor, setPreparedFor] = useState<string | null>(null);

  const scopeKey = scope ? scope.cooperativeId ?? "global" : null;
  if (scope && scopeKey !== preparedFor) {
    const defaults = resolveDefaults(policies, scope.cooperativeId);
    setPreparedFor(scopeKey);
    setVersion(sicoobApprovalPolicyService.suggestVersion(policies, scope.cooperativeId));
    setForbidSelfApproval(defaults.forbidSelfApproval);
    setRequireActiveMembership(defaults.requireActiveMembership);
    setEffectiveFrom(toLocalInput(new Date()));
  }

  return (
    <Dialog open={scope !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar nova versão da política</DialogTitle>
          <DialogDescription>
            Escopo: {scope?.cooperativeName ?? "—"}. Versão publicada não pode ser editada: a nova
            versão encerra a anterior e passa a valer para os próximos pedidos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="policy-version">Versão</Label>
            <Input
              id="policy-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="v2"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="policy-effective-from">Início da vigência</Label>
            <Input
              id="policy-effective-from"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </div>
          <FlagCheckbox
            id="policy-forbid-self-approval"
            label="Bloquear autoaprovação"
            hint="Quem solicitou o pedido não pode aprová-lo nem por delegação."
            checked={forbidSelfApproval}
            onCheckedChange={setForbidSelfApproval}
          />
          <FlagCheckbox
            id="policy-require-active-membership"
            label="Exigir vínculo ativo na aprovação"
            hint="Aprovador precisa estar ativo e vinculado à Singular do pedido."
            checked={requireActiveMembership}
            onCheckedChange={setRequireActiveMembership}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || version.trim().length === 0 || effectiveFrom.length === 0}
            onClick={() =>
              onSubmit({
                version: version.trim(),
                effectiveFrom: new Date(effectiveFrom).toISOString(),
                forbidSelfApproval,
                requireActiveMembership,
              })
            }
          >
            Publicar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ApprovalPolicyTab = () => {
  const queryClient = useQueryClient();
  const [publishScope, setPublishScope] = useState<PolicyScope | null>(null);
  const [closeScope, setCloseScope] = useState<PolicyScope | null>(null);

  const policies = useQuery({
    queryKey: [POLICIES_QUERY_KEY],
    queryFn: sicoobApprovalPolicyService.list,
  });
  const scopes = useQuery({
    queryKey: [SCOPES_QUERY_KEY],
    queryFn: sicoobApprovalPolicyService.listScopes,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [POLICIES_QUERY_KEY] });
  };

  const publishMutation = useMutation({
    mutationFn: (input: {
      version: string;
      effectiveFrom: string;
      forbidSelfApproval: boolean;
      requireActiveMembership: boolean;
    }) => {
      if (!publishScope) throw new Error("Selecione o escopo da política.");
      return sicoobApprovalPolicyService.publish({
        cooperativeId: publishScope.cooperativeId,
        ...input,
      });
    },
    onSuccess: () => {
      invalidate();
      setPublishScope(null);
      toast.success("Versão publicada e aplicada aos próximos pedidos.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const closeMutation = useMutation({
    mutationFn: (scope: PolicyScope) => sicoobApprovalPolicyService.closeActive(scope.cooperativeId),
    onSuccess: () => {
      invalidate();
      setCloseScope(null);
      toast.success("Política encerrada. O escopo volta para a política global.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const error = (policies.error ?? scopes.error) as Error | null;
  const scopeList = scopes.data ?? [];
  const policyList = policies.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Políticas de aprovação por Singular
          </CardTitle>
          <CardDescription>
            As regras desta tela são obedecidas pelo servidor em cada decisão de pedido e viram
            histórico imutável: mudar uma regra significa publicar uma nova versão. Sem versão
            publicada, vale o padrão do sistema ({BASELINE_POLICY.version}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Não foi possível carregar as políticas</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escopo</TableHead>
                <TableHead>Política vigente</TableHead>
                <TableHead>Regras em vigor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            {policies.isLoading || scopes.isLoading ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Carregando políticas...
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <ScopesTableBody
                scopes={scopeList}
                policies={policyList}
                onPublish={setPublishScope}
                onClose={setCloseScope}
                isClosing={closeMutation.isPending}
              />
            )}
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de versões</CardTitle>
          <CardDescription>
            Cada pedido guarda a versão aplicada no momento da solicitação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policyList.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Nenhuma política publicada</AlertTitle>
              <AlertDescription>
                Todos os pedidos estão sendo avaliados pelo padrão do sistema.
              </AlertDescription>
            </Alert>
          ) : (
            <PolicyHistoryTable policies={policyList} />
          )}
        </CardContent>
      </Card>

      <PublishPolicyDialog
        scope={publishScope}
        policies={policyList}
        onOpenChange={(open) => {
          if (!open) setPublishScope(null);
        }}
        onSubmit={(input) => publishMutation.mutate(input)}
        isPending={publishMutation.isPending}
      />

      <Dialog open={closeScope !== null} onOpenChange={(open) => !open && setCloseScope(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar política vigente</DialogTitle>
            <DialogDescription>
              {closeScope?.cooperativeName ?? "—"} volta a usar a política global e, sem política
              global ativa, o padrão do sistema. O histórico é preservado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseScope(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={closeMutation.isPending}
              onClick={() => closeScope && closeMutation.mutate(closeScope)}
            >
              Encerrar política
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalPolicyTab;
