import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clipboard, Clock, Mail, RefreshCw, ShieldX, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageSEO } from "@/components/seo/PageSEO";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import {
  firstInvitationError,
  type InvitationField,
  type InvitationFormErrors,
  validateInvitationForm,
} from "@/lib/sicoob/invitationForm";

interface CooperativeRow {
  id: string;
  nome: string;
  codigo: string;
  is_active: boolean;
}

interface PaRow {
  id: string;
  cooperativa_id: string;
  nome: string;
  codigo: string;
  is_active: boolean;
}

interface InvitationRow {
  id: string;
  email: string;
  cooperative_id: string;
  pa_id: string | null;
  role: string;
  status: string;
  accepted_by: string | null;
  access_revoked_at: string | null;
  expires_at: string;
  created_at: string;
  cooperativas: { nome: string; codigo: string } | null;
  postos_atendimento: { nome: string; codigo: string } | null;
}

interface IssueResult {
  invitation_id: string;
  invitation_token: string | null;
  invitation_expires_at: string;
  reused: boolean;
}

const ROLE_OPTIONS = [
  { value: "vendedor", label: "Vendedor", requiresPa: false, managerOnly: false },
  { value: "gerente_pa", label: "Gerente de PA", requiresPa: true, managerOnly: false },
  { value: "comprador_pac", label: "Comprador de PA", requiresPa: true, managerOnly: false },
  { value: "gestor_compras", label: "Gestor de compras", requiresPa: false, managerOnly: true },
  { value: "comprador_singular", label: "Comprador da Singular", requiresPa: false, managerOnly: true },
  { value: "supervisor", label: "Supervisor", requiresPa: false, managerOnly: true },
] as const;

function effectiveStatus(invitation: InvitationRow): string {
  if (invitation.access_revoked_at) return "access_revoked";
  return invitation.status === "pending" && new Date(invitation.expires_at).getTime() <= Date.now()
    ? "expired"
    : invitation.status;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  revoked: "Revogado",
  superseded: "Substituído",
  expired: "Expirado",
  access_revoked: "Acesso encerrado",
};

export default function SicoobInvitationsPage() {
  const { isDev, cooperativaId } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [cooperativeId, setCooperativeId] = useState(cooperativaId ?? "");
  const [paId, setPaId] = useState("");
  const [role, setRole] = useState("vendedor");
  const [expiresInHours, setExpiresInHours] = useState("48");
  const [issuedLink, setIssuedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<InvitationFormErrors>({});

  const roleOptions = useMemo(
    () => ROLE_OPTIONS.filter((option) => isDev || !option.managerOnly),
    [isDev],
  );
  const selectedRole = roleOptions.find((option) => option.value === role) ?? roleOptions[0];

  useEffect(() => {
    if (!isDev && cooperativaId && !cooperativeId) setCooperativeId(cooperativaId);
  }, [cooperativaId, cooperativeId, isDev]);

  const cooperativesQuery = useQuery({
    queryKey: ["sicoob-invitation-cooperatives", cooperativaId, isDev],
    queryFn: async () => {
      let query = untypedFrom<CooperativeRow>("cooperativas")
        .select("id,nome,codigo,is_active")
        .eq("is_active", true)
        .order("nome");
      if (!isDev && cooperativaId) query = query.eq("id", cooperativaId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const pasQuery = useQuery({
    queryKey: ["sicoob-invitation-pas", cooperativeId],
    queryFn: async () => {
      const { data, error } = await untypedFrom<PaRow>("postos_atendimento")
        .select("id,cooperativa_id,nome,codigo,is_active")
        .eq("cooperativa_id", cooperativeId)
        .eq("is_active", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(cooperativeId),
  });

  const invitationsQuery = useQuery({
    queryKey: ["sicoob-invitations"],
    queryFn: async () => {
      const { data, error } = await untypedFrom<InvitationRow>("sicoob_invitations")
        .select("id,email,cooperative_id,pa_id,role,status,accepted_by,access_revoked_at,expires_at,created_at,cooperativas(nome,codigo),postos_atendimento(nome,codigo)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const issueInvitation = useMutation({
    mutationFn: async (input: { email: string; cooperativeId: string; paId: string | null; role: string; hours: number }) => {
      const { data, error } = await supabase.rpc("issue_sicoob_invitation" as never, {
        p_email: input.email,
        p_cooperative_id: input.cooperativeId,
        p_pa_id: input.paId,
        p_role: input.role,
        p_expires_in_hours: input.hours,
        p_idempotency_key: crypto.randomUUID(),
      } as never);
      if (error) throw error;
      const result = (data as unknown as IssueResult[] | null)?.[0];
      if (!result?.invitation_token) throw new Error("O convite já foi criado. Use reenviar para gerar um novo link.");
      return `${window.location.origin}/convite/${result.invitation_token}`;
    },
    onSuccess: async (link) => {
      setIssuedLink(link);
      setCopied(false);
      setEmail("");
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ["sicoob-invitations"] });
      toast.success("Convite emitido. Copie o link e envie pelo canal institucional aprovado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível emitir o convite."),
  });

  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc("revoke_sicoob_invitation" as never, {
        p_invitation_id: invitationId,
        p_reason: "Revogado pelo gestor antes do aceite.",
      } as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sicoob-invitations"] });
      toast.success("Convite revogado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível revogar o convite."),
  });

  const revokeUserAccess = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("revoke_sicoob_user_access" as never, {
        p_user_id: userId,
        p_reason: "Vínculo institucional encerrado pelo gestor responsável.",
      } as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sicoob-invitations"] });
      toast.success("Acesso encerrado e sessões ativas revogadas.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível encerrar o acesso."),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateInvitationForm({
      email,
      cooperativeId,
      role: selectedRole?.value ?? "",
      paId,
      expiresInHours,
      requiresPa: Boolean(selectedRole?.requiresPa),
    });
    setFieldErrors(errors);
    const firstError = firstInvitationError(errors);
    if (firstError) {
      document.getElementById(`invitation-${firstError}`)?.focus();
      toast.error("Revise os campos indicados no formulário.");
      return;
    }
    if (!selectedRole) return;
    const hours = Number(expiresInHours);
    issueInvitation.mutate({
      email: email.trim().toLowerCase(),
      cooperativeId,
      paId: selectedRole.requiresPa ? paId : null,
      role: selectedRole.value,
      hours,
    });
  };

  const clearFieldError = (field: InvitationField) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const copyLink = async () => {
    if (!issuedLink) return;
    try {
      await navigator.clipboard.writeText(issuedLink);
      setCopied(true);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o link acima.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <PageSEO title="Convites institucionais" description="Gerencie vínculos institucionais do portal Sicoob." path="/gestor/convites" noIndex />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-sicoob-dark-blue sm:text-3xl">
          <UserPlus className="h-7 w-7" /> Convites institucionais
        </h1>
        <p className="text-sm text-muted-foreground">
          Conceda somente o papel e a unidade aprovados. O link expira, pode ser revogado e funciona uma única vez.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Novo convite</h2>
            <CardDescription>A conta deve ser criada em Usuários antes do convite e entrar com o mesmo email informado abaixo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-busy={issueInvitation.isPending}>
              <div className="space-y-2">
                <Label htmlFor="invitation-email">Email institucional</Label>
                <Input
                  id="invitation-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); clearFieldError("email"); }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "invitation-email-error" : undefined}
                  required
                />
                {fieldErrors.email && <p id="invitation-email-error" role="alert" className="text-sm text-destructive">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitation-cooperative">Cooperativa</Label>
                <Select value={cooperativeId} onValueChange={(value) => { setCooperativeId(value); setPaId(""); clearFieldError("cooperative"); clearFieldError("pa"); }}>
                  <SelectTrigger id="invitation-cooperative" aria-invalid={Boolean(fieldErrors.cooperative)} aria-describedby={fieldErrors.cooperative ? "invitation-cooperative-error" : undefined}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(cooperativesQuery.data ?? []).map((cooperative) => (
                      <SelectItem key={cooperative.id} value={cooperative.id}>{cooperative.codigo} · {cooperative.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.cooperative && <p id="invitation-cooperative-error" role="alert" className="text-sm text-destructive">{fieldErrors.cooperative}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitation-role">Papel</Label>
                <Select value={role} onValueChange={(value) => { setRole(value); setPaId(""); clearFieldError("role"); clearFieldError("pa"); }}>
                  <SelectTrigger id="invitation-role" aria-invalid={Boolean(fieldErrors.role)} aria-describedby={fieldErrors.role ? "invitation-role-error" : undefined}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldErrors.role && <p id="invitation-role-error" role="alert" className="text-sm text-destructive">{fieldErrors.role}</p>}
              </div>
              {selectedRole?.requiresPa && (
                <div className="space-y-2">
                  <Label htmlFor="invitation-pa">Posto de atendimento</Label>
                  <Select value={paId} onValueChange={(value) => { setPaId(value); clearFieldError("pa"); }}>
                    <SelectTrigger id="invitation-pa" aria-invalid={Boolean(fieldErrors.pa)} aria-describedby={fieldErrors.pa ? "invitation-pa-error" : undefined}><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(pasQuery.data ?? []).map((pa) => <SelectItem key={pa.id} value={pa.id}>{pa.codigo} · {pa.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldErrors.pa && <p id="invitation-pa-error" role="alert" className="text-sm text-destructive">{fieldErrors.pa}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="invitation-expiry">Validade em horas</Label>
                <Input
                  id="invitation-expiry"
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  value={expiresInHours}
                  onChange={(event) => { setExpiresInHours(event.target.value); clearFieldError("expiry"); }}
                  aria-invalid={Boolean(fieldErrors.expiry)}
                  aria-describedby={fieldErrors.expiry ? "invitation-expiry-error" : "invitation-expiry-hint"}
                />
                <p id="invitation-expiry-hint" className="text-xs text-muted-foreground">Entre 1 hora e 7 dias.</p>
                {fieldErrors.expiry && <p id="invitation-expiry-error" role="alert" className="text-sm text-destructive">{fieldErrors.expiry}</p>}
              </div>
              <Button className="w-full gap-2" disabled={issueInvitation.isPending} type="submit">
                {issueInvitation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Emitir convite
              </Button>
            </form>
            {issueInvitation.error && <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível emitir o convite. Revise os dados ou tente novamente.</p>}
            {issuedLink && (
              <div role="status" aria-live="polite" className="mt-5 space-y-2 rounded-lg border border-sicoob-green/30 bg-sicoob-green/5 p-3">
                <p className="text-sm font-medium">Link exibido uma única vez</p>
                <p className="break-all font-mono text-xs text-muted-foreground">{issuedLink}</p>
                <Button size="sm" variant="outline" className="gap-2" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} {copied ? "Copiado" : "Copiar link"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Histórico recente</h2>
            <CardDescription>Reenvie emitindo outro convite para o mesmo escopo; o link anterior será invalidado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitationsQuery.isLoading && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Carregando convites…</p>}
            {invitationsQuery.error && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os convites.</p>}
            {!invitationsQuery.isLoading && !invitationsQuery.error && (invitationsQuery.data?.length ?? 0) === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum convite foi emitido neste escopo.</p>
            )}
            {(invitationsQuery.data ?? []).map((invitation) => {
              const status = effectiveStatus(invitation);
              return (
                <article key={invitation.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {invitation.cooperativas?.codigo} · {invitation.cooperativas?.nome}
                        {invitation.postos_atendimento ? ` · ${invitation.postos_atendimento.codigo} ${invitation.postos_atendimento.nome}` : ""}
                      </p>
                    </div>
                    <Badge variant={status === "pending" ? "default" : "secondary"}>{STATUS_LABELS[status] ?? status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{ROLE_OPTIONS.find((option) => option.value === invitation.role)?.label ?? invitation.role}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Expira em {new Date(invitation.expires_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => issueInvitation.mutate({
                        email: invitation.email,
                        cooperativeId: invitation.cooperative_id,
                        paId: invitation.pa_id,
                        role: invitation.role,
                        hours: 48,
                      })}>
                        <RefreshCw className="h-4 w-4" /> Reenviar
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-2" onClick={() => revokeInvitation.mutate(invitation.id)}>
                        <ShieldX className="h-4 w-4" /> Revogar
                      </Button>
                    </div>
                  )}
                  {status === "accepted" && invitation.accepted_by && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="gap-2">
                          <ShieldX className="h-4 w-4" /> Encerrar acesso
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Encerrar este vínculo institucional?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Os papéis serão removidos e todas as sessões da conta serão revogadas imediatamente. A pessoa precisará de um novo convite para recuperar o acesso.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={revokeUserAccess.isPending}
                            onClick={() => revokeUserAccess.mutate(invitation.accepted_by!)}
                          >
                            Encerrar acesso
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </article>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
