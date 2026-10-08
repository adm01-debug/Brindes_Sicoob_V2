import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { PageSEO } from '@/components/seo/PageSEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InvitationPreview {
  invitation_id: string;
  masked_email: string;
  cooperative_name: string;
  pa_name: string | null;
  pa_code: string | null;
  invited_role: string;
  invitation_status: string;
  invitation_expires_at: string;
}

const ROLE_CONTENT: Record<string, { label: string; responsibility: string }> = {
  vendedor: {
    label: 'Vendedor',
    responsibility: 'Atender a carteira e acompanhar pedidos autorizados.',
  },
  gerente_pa: {
    label: 'Gerente de PA',
    responsibility: 'Acompanhar solicitações e recebimentos do PA indicado.',
  },
  comprador_pac: {
    label: 'Comprador de PA',
    responsibility: 'Solicitar e acompanhar compras dentro do PA indicado.',
  },
  gestor_compras: {
    label: 'Gestor de compras',
    responsibility: 'Consolidar e governar compras da Singular.',
  },
  comprador_singular: {
    label: 'Comprador da Singular',
    responsibility: 'Operar compras no escopo da Singular.',
  },
  supervisor: {
    label: 'Supervisor',
    responsibility: 'Supervisionar a operação comercial autorizada.',
  },
};

const STATUS_MESSAGES: Record<string, string> = {
  expired: 'Este convite expirou. Solicite um novo link ao gestor.',
  revoked: 'Este convite foi revogado pelo gestor.',
  superseded: 'Este link foi substituído por um convite mais recente.',
  accepted: 'Este convite já foi aceito.',
};

async function fetchInvitation(token: string) {
  const { data, error } = await supabase.rpc(
    'get_sicoob_invitation' as never,
    { p_token: token } as never,
  );
  if (error) throw error;
  return (data as unknown as InvitationPreview[] | null)?.[0] ?? null;
}

async function activateInvitation(token: string) {
  const { data, error } = await supabase.rpc(
    'accept_sicoob_invitation' as never,
    { p_token: token } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}

function InvitationHeader() {
  return (
    <CardHeader className="space-y-3 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sicoob-green/10 text-sicoob-green">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h1 className="text-sicoob-dark-blue text-2xl font-semibold leading-none tracking-tight">
        Convite institucional
      </h1>
      <CardDescription>
        Confira a entidade, a unidade e as responsabilidades antes de aceitar.
      </CardDescription>
    </CardHeader>
  );
}

function InvitationIdentity({ invitation }: { invitation: InvitationPreview }) {
  const role = ROLE_CONTENT[invitation.invited_role];
  return (
    <>
      <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
        <div className="flex gap-2">
          <Building2 className="mt-0.5 h-4 w-4 text-sicoob-green" />
          <div>
            <p className="text-xs text-muted-foreground">Cooperativa</p>
            <p className="font-medium">{invitation.cooperative_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <UserRound className="mt-0.5 h-4 w-4 text-sicoob-green" />
          <div>
            <p className="text-xs text-muted-foreground">Papel</p>
            <p className="font-medium">{role?.label ?? invitation.invited_role}</p>
          </div>
        </div>
        {invitation.pa_name && (
          <div>
            <p className="text-xs text-muted-foreground">Unidade</p>
            <p className="font-medium">
              {invitation.pa_code} · {invitation.pa_name}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Conta convidada</p>
          <p className="font-medium">{invitation.masked_email}</p>
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Responsabilidade principal</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {role?.responsibility ?? 'Atuar somente no escopo institucional indicado.'}
        </p>
      </div>
    </>
  );
}

function InvitationAction({
  canAccept,
  userPresent,
  redirect,
  isPending,
  error,
  onAccept,
}: {
  canAccept: boolean;
  userPresent: boolean;
  redirect: string;
  isPending: boolean;
  error: boolean;
  onAccept: () => void;
}) {
  if (!canAccept) return null;
  return (
    <>
      {!userPresent && (
        <Button asChild className="w-full">
          <Link to={redirect}>Entrar com o email convidado</Link>
        </Button>
      )}
      {userPresent && (
        <Button
          className="w-full gap-2"
          aria-busy={isPending}
          disabled={isPending}
          onClick={onAccept}
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          )}
          {isPending ? 'Ativando vínculo…' : 'Aceitar vínculo e responsabilidades'}
        </Button>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível aceitar o convite. Confirme a conta e solicite um novo link se
          necessário.
        </p>
      )}
    </>
  );
}

function InvitationDetails({
  invitation,
  userPresent,
  redirect,
  isPending,
  acceptError,
  onAccept,
}: {
  invitation: InvitationPreview;
  userPresent: boolean;
  redirect: string;
  isPending: boolean;
  acceptError: boolean;
  onAccept: () => void;
}) {
  const canAccept = invitation.invitation_status === 'pending';
  return (
    <>
      <InvitationIdentity invitation={invitation} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Badge variant={canAccept ? 'default' : 'secondary'}>
          {canAccept ? 'Pronto para aceite' : invitation.invitation_status}
        </Badge>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" /> Até{' '}
          {new Date(invitation.invitation_expires_at).toLocaleString('pt-BR')}
        </span>
      </div>
      {!canAccept && (
        <p role="alert" className="rounded-lg bg-muted p-4 text-sm">
          {STATUS_MESSAGES[invitation.invitation_status] ??
            'Este convite não pode mais ser aceito.'}
        </p>
      )}
      <InvitationAction
        canAccept={canAccept}
        userPresent={userPresent}
        redirect={redirect}
        isPending={isPending}
        error={acceptError}
        onAccept={onAccept}
      />
    </>
  );
}

interface InvitationContentProps {
  invitation: InvitationPreview | null | undefined;
  isLoading: boolean;
  queryError: boolean;
  userPresent: boolean;
  redirect: string;
  isPending: boolean;
  acceptError: boolean;
  onAccept: () => void;
}

function InvitationContent({
  invitation,
  isLoading,
  queryError,
  userPresent,
  redirect,
  isPending,
  acceptError,
  onAccept,
}: InvitationContentProps) {
  if (isLoading)
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex justify-center gap-2 py-10 text-sm text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin" />
        <span className="sr-only">Validando convite…</span>
      </div>
    );
  if (queryError)
    return (
      <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        Não foi possível validar o convite.
      </p>
    );
  if (!invitation)
    return (
      <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        Convite inválido ou não encontrado.
      </p>
    );
  return (
    <InvitationDetails
      invitation={invitation}
      userPresent={userPresent}
      redirect={redirect}
      isPending={isPending}
      acceptError={acceptError}
      onAccept={onAccept}
    />
  );
}

function useInvitationController(token: string) {
  const navigate = useNavigate();
  const { user, refreshSession } = useAuth();
  const invitationQuery = useQuery({
    queryKey: ['sicoob-invitation-preview', token],
    queryFn: () => fetchInvitation(token),
    retry: false,
    enabled: Boolean(token),
  });
  const acceptInvitation = useMutation({
    mutationFn: () => activateInvitation(token),
    onSuccess: async () => {
      await refreshSession();
      toast.success('Vínculo institucional ativado.');
      navigate('/', { replace: true });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Não foi possível aceitar o convite.'),
  });
  useEffect(() => {
    if (invitationQuery.data?.invitation_status === 'accepted' && user) {
      toast.info('Este convite já foi utilizado.');
    }
  }, [invitationQuery.data?.invitation_status, user]);
  return { user, invitationQuery, acceptInvitation };
}

export default function SicoobInvitationAcceptPage() {
  const { token = '' } = useParams();
  const location = useLocation();
  const { user, invitationQuery, acceptInvitation } = useInvitationController(token);

  const redirect = `/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#003641] via-[#005e66] to-[#00ae9d] p-4">
      <PageSEO
        title="Convite institucional"
        description="Revise e aceite seu vínculo com o Portal de Compras Sicoob."
        path={location.pathname}
        noIndex
      />
      <Card className="w-full max-w-xl border-white/20 shadow-2xl">
        <InvitationHeader />
        <CardContent className="space-y-5">
          <InvitationContent
            invitation={invitationQuery.data}
            isLoading={invitationQuery.isLoading}
            queryError={Boolean(invitationQuery.error)}
            userPresent={Boolean(user)}
            redirect={redirect}
            isPending={acceptInvitation.isPending}
            acceptError={Boolean(acceptInvitation.error)}
            onAccept={() => acceptInvitation.mutate()}
          />
        </CardContent>
      </Card>
    </main>
  );
}
