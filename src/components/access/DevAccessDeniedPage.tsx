import { type ReactNode, useEffect, useRef, useState } from "react";
import { recordDevRouteTelemetry } from "@/lib/access/dev-route-telemetry";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  ShieldAlert,
  Send,
  Copy,
  Check,
  Mail,
  ArrowLeft,
  RotateCw,
  ExternalLink,
  LifeBuoy,
  Users,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  requestDevAccess,
  getThrottleStatus,
  DEV_ACCESS_CONTACT_EMAIL,
} from "@/lib/access/request-dev-access";

export type DevAccessUserRole =
  | "supervisor"
  | "agente"
  | "agent"
  | "vendedor"
  | string
  | null
  | undefined;

interface DevAccessDeniedPageProps {
  user: { id: string; email?: string | null };
  /** Papel atual do usuário, usado para personalizar copy/CTAs. */
  role: DevAccessUserRole;
  /** Caminho bloqueado (apenas pathname, ex: "/admin/telemetria"). */
  blockedPath: string;
  /** Caminho completo (path + search + hash) para "Tentar novamente". */
  blockedFullPath: string;
  /** State original da location para preservar em "Tentar novamente". */
  blockedState?: unknown;
}

interface RoleCopy {
  title: string;
  intro: ReactNode;
  hint: ReactNode;
  /** CTA secundário contextual ao papel (ex.: voltar para área natural). */
  contextualCtaLabel: string;
  contextualCtaPath: string;
  contextualCtaIcon: ReactNode;
  /** Tom semântico — usado em badges/realce sutil. */
  badge: string;
}

const SUPERVISOR_AREAS: ReadonlyArray<{
  label: string;
  path: string;
}> = [
  { label: "Usuários", path: "/admin/usuarios" },
  { label: "Empresas", path: "/admin/empresas" },
  { label: "Configurações", path: "/admin/configuracoes" },
];

function getRoleCopy(role: DevAccessUserRole, blockedPath: string): RoleCopy {
  // Normaliza apelidos comuns ("agent", "vendedor" → "agente").
  const normalized =
    role === "agent" || role === "vendedor" ? "agente" : role ?? "desconhecido";

  if (normalized === "supervisor") {
    return {
      badge: "Supervisor",
      title: "Área técnica restrita à equipe de Desenvolvimento",
      intro: (
        <>
          Como <strong>supervisor</strong>, você administra usuários, empresas e
          regras de negócio — mas <em>ferramentas técnicas</em> (telemetria,
          conexões externas, secrets, MCP, auditoria de baixo nível) ficam
          restritas ao time de Desenvolvimento por motivos de segurança e
          rastreabilidade.
        </>
      ),
      hint: (
        <>
          Se você precisa investigar um incidente, peça acesso temporário ao
          time técnico descrevendo brevemente o motivo abaixo. Você continuará
          com seus poderes de supervisor enquanto isso.
        </>
      ),
      contextualCtaLabel: "Ir para Usuários",
      contextualCtaPath: "/admin/usuarios",
      contextualCtaIcon: <Users className="h-4 w-4 mr-2" />,
    };
  }

  if (normalized === "agente") {
    return {
      badge: "Agente / Vendedor",
      title: "Esta área é exclusiva da equipe técnica",
      intro: (
        <>
          Como <strong>vendedor</strong>, você não precisa acessar páginas
          técnicas para o seu dia a dia: o catálogo, orçamentos, pedidos e o
          CRM já cobrem tudo o que você usa. Se você chegou aqui por um link
          antigo ou pelo histórico do navegador, pode voltar com segurança.
        </>
      ),
      hint: (
        <>
          Se acredita que precisa entrar nesta área, fale primeiro com o seu
          supervisor — em casos raros ele poderá pedir acesso técnico em seu
          nome ao time de Desenvolvimento.
        </>
      ),
      contextualCtaLabel: "Voltar ao Catálogo",
      contextualCtaPath: "/catalogo",
      contextualCtaIcon: <ShoppingCart className="h-4 w-4 mr-2" />,
    };
  }

  // Fallback genérico (ex.: papel não mapeado).
  return {
    badge: "Sem permissão",
    title: "Acesso restrito",
    intro: (
      <>
        A página{" "}
        <code className="font-mono px-1 py-0.5 rounded bg-muted">
          {blockedPath}
        </code>{" "}
        exige o papel <strong>Desenvolvedor</strong>. O seu papel atual não
        possui essa permissão.
      </>
    ),
    hint: (
      <>
        Você pode solicitar acesso ao time técnico abaixo ou voltar para a
        página inicial.
      </>
    ),
    contextualCtaLabel: "Ir para o Início",
    contextualCtaPath: "/",
    contextualCtaIcon: <ArrowLeft className="h-4 w-4 mr-2" />,
  };
}

/**
 * Página dedicada de "Acesso restrito ao Dev".
 *
 * Diferenciação por papel:
 * - **Supervisor**: copy técnica + CTA primário "Solicitar acesso a Dev" +
 *   atalhos para áreas administrativas (Usuários, Empresas, Configurações).
 * - **Agente/Vendedor**: copy curta orientando voltar ao Catálogo; CTA de
 *   solicitação fica secundário e recomenda falar com o supervisor antes.
 * - **Outros**: fallback genérico.
 *
 * Mantém todas as garantias do DevRoute original: throttle, mailto fallback,
 * link copiável, "Tentar novamente" preservando location state, semântica 403.
 */
export function DevAccessDeniedPage({
  user,
  role,
  blockedPath,
  blockedFullPath,
  blockedState,
}: DevAccessDeniedPageProps) {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = getRoleCopy(role, blockedPath);
  const isAgente =
    role === "agente" || role === "agent" || role === "vendedor";
  const isSupervisor = role === "supervisor";

  // ---- Telemetria de UX (sem PII) -----------------------------------------
  // Marca o instante em que a tela apareceu para calcular o tempo até a ação
  // final (back/retry/fallback/request_access/abandon).
  const viewedAtRef = useRef<number>(Date.now());
  const finalizedRef = useRef<boolean>(false);
  const sinceView = () => Date.now() - viewedAtRef.current;
  const emit = (event: Parameters<typeof recordDevRouteTelemetry>[0]["event"]) =>
    void recordDevRouteTelemetry({
      event,
      blockedPath,
      userRole: typeof role === "string" ? role : null,
      durationMs: sinceView(),
    });
  const finalize = (
    event: Parameters<typeof recordDevRouteTelemetry>[0]["event"],
  ) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    emit(event);
  };

  // 1) Registra "view" uma única vez ao montar (sem duration).
  useEffect(() => {
    viewedAtRef.current = Date.now();
    void recordDevRouteTelemetry({
      event: "view",
      blockedPath,
      userRole: typeof role === "string" ? role : null,
      durationMs: null,
    });
  }, [blockedPath, role]);

  // 2) "abandon" via beacon ao desmontar/fechar a aba sem decisão registrada.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && !finalizedRef.current) {
        // Best-effort: a request pode não terminar — coalescing server-side cobre.
        finalize("abandon");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (!finalizedRef.current) finalize("abandon");
    };
  }, []);
  // -------------------------------------------------------------------------

  const handleRequestAccess = async () => {
    const throttle = getThrottleStatus(user.id);
    if (throttle.throttled) {
      toast.warning("Aguarde um instante", {
        id: "dev-access-throttle",
        description: `Tente novamente em ${throttle.retryInSeconds}s.`,
      });
      return;
    }
    setSubmitting(true);
    const result = await requestDevAccess({
      userId: user.id,
      userEmail: user.email,
      blockedPath,
      reason,
    });
    setSubmitting(false);

    if (result.throttled) {
      toast.warning("Aguarde um instante", {
        id: "dev-access-throttle",
        description: `Tente novamente em ${result.retryInSeconds ?? 60}s.`,
      });
      return;
    }
    if (!result.ok) {
      toast.error("Falha ao enviar solicitação", {
        id: "dev-access-error",
        description: result.error ?? "Tente novamente em instantes.",
      });
      return;
    }
    toast.success("Solicitação enviada", {
      id: "dev-access-sent",
      description: `Time técnico avisado (${DEV_ACCESS_CONTACT_EMAIL}).`,
    });
    finalize("request_access");
    if (result.mailtoUrl) {
      window.location.href = result.mailtoUrl;
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${blockedPath}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado", {
        id: "dev-access-link-copied",
        description: "Envie ao time técnico.",
      });
      emit("copy_link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar link", { id: "dev-access-link-error" });
    }
  };

  const requestButton = (
    <Button
      onClick={handleRequestAccess}
      disabled={submitting}
      variant={isAgente ? "outline" : "default"}
      className="w-full"
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      {isAgente ? "Solicitar via Suporte" : "Solicitar acesso a Dev"}
    </Button>
  );

  return (
    <>
      <Helmet>
        <title>403 — Acesso restrito ao Dev</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="x-http-status" content="403" />
      </Helmet>
      <div
        role="alert"
        data-testid="app-access-denied"
        aria-labelledby="dev-access-denied-title"
        data-http-status="403"
        data-blocked-path={blockedPath}
        data-user-role={role ?? "unknown"}
        className="min-h-screen flex items-center justify-center bg-background px-4 py-8"
      >
        <div className="w-full max-w-lg flex flex-col items-center gap-5 text-center">
          <ShieldAlert
            className="h-12 w-12 text-destructive"
            aria-hidden="true"
          />

          <div className="space-y-4 w-full">
            <div className="space-y-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {copy.badge} · 403
              </span>
              <h1
                id="dev-access-denied-title"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                {copy.title}
              </h1>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground px-2">
                {copy.intro}
              </p>
              
              {isSupervisor && (
                <div className="mx-auto max-w-sm p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-left">
                  <p className="font-medium text-foreground mb-1">Nota de Permissão:</p>
                  <p className="text-muted-foreground leading-normal">
                    Seus privilégios administrativos estão configurados para gestão de negócio e usuários. 
                    O acesso a ferramentas de infraestrutura e telemetria é restrito.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/10">
              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest">
                Identificador de Segurança
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-1 bg-muted/30 py-1 px-2 rounded inline-block">
                REQ-{blockedPath.split('/').filter(Boolean).pop()?.toUpperCase() || 'ROOT'}
              </p>
            </div>
          </div>

          {/* Para supervisor: atalhos visuais para áreas administrativas. */}
          {isSupervisor && (
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-2">
                Continuar nas áreas que você administra:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUPERVISOR_AREAS.map((area) => (
                  <Button
                    key={area.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(area.path)}
                  >
                    {area.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="w-full text-left rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{copy.hint}</p>
          </div>

          {/* Bloco de motivo + CTA de solicitação (todos os papéis podem
              pedir, mas o tom muda — ver requestButton). */}
          <div className="w-full text-left space-y-2">
            <label
              htmlFor="dev-access-reason"
              className="text-xs font-medium text-foreground"
            >
              Motivo (opcional)
            </label>
            <Textarea
              id="dev-access-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={
                isAgente
                  ? "Ex.: precisei conferir um log que o supervisor pediu."
                  : "Ex.: investigar lentidão no catálogo após a release de hoje."
              }
              rows={3}
              className="resize-none"
              disabled={submitting}
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {reason.length}/500
            </div>
          </div>

          <div className="flex flex-col w-full gap-2">
            {requestButton}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="w-full"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copiar link
              </Button>
              <Button
                variant="outline"
                asChild
                className="w-full"
                title={`Enviar e-mail para ${DEV_ACCESS_CONTACT_EMAIL}`}
                onClick={() => emit("mail")}
              >
                <a
                  href={`mailto:${DEV_ACCESS_CONTACT_EMAIL}?subject=${encodeURIComponent(
                    `[Brindes Sicoob] Acesso técnico — ${blockedPath}`,
                  )}`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  E-mail
                </a>
              </Button>
            </div>

            {/* Link explícito para "solicitar acesso" / suporte — sempre
                visível, atende explicitamente ao requisito. */}
            <Button
              variant="link"
              size="sm"
              asChild
              className="text-xs"
              onClick={() => emit("mail")}
            >
              <a
                href={`mailto:${DEV_ACCESS_CONTACT_EMAIL}?subject=${encodeURIComponent(
                  `[Brindes Sicoob] Solicitação de acesso técnico — ${blockedPath}`,
                )}&body=${encodeURIComponent(
                  `Olá, equipe técnica.\n\nGostaria de solicitar acesso à página: ${window.location.origin}${blockedPath}\n\nMotivo: ${reason || "(não informado)"}\n\nObrigado.`,
                )}`}
              >
                <LifeBuoy className="h-3.5 w-3.5 mr-1.5" />
                Solicitar acesso pelo Suporte
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>

          <div className="flex w-full flex-wrap gap-2 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              onClick={() => {
                finalize("back");
                navigate(-1);
              }}
              className="flex-1 min-w-[8rem]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                finalize("retry");
                navigate(blockedFullPath, {
                  replace: true,
                  state: blockedState,
                });
              }}
              className="flex-1 min-w-[8rem]"
              title={`Reabrir ${blockedFullPath} preservando o contexto original`}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                finalize("fallback");
                navigate(copy.contextualCtaPath, { replace: true });
              }}
              className="flex-1 min-w-[8rem]"
            >
              {copy.contextualCtaIcon}
              {copy.contextualCtaLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
