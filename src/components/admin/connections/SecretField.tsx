import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, RotateCw, Save, ShieldAlert, Sparkles, ArrowDownToLine } from "lucide-react";
import { validateSecret, getMinLength, MIN_SUFFIX_LENGTH } from "./secretValidators";
import { formatMaskedSuffix, normalizeMaskedSuffix } from "@/lib/masked-suffix";
import { MaskedSuffixBadge } from "./MaskedSuffixBadge";
import { normalizeSecret } from "./secretNormalizers";
import { validateSecretName } from "./secretWhitelist";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useSecretsManager,
  type SecretStatus,
  type SecretMutationResult,
} from "@/hooks/useSecretsManager";
import { JustSavedFlash } from "./JustSavedFlash";
import { RotationHistoryRow } from "./RotationHistoryRow";
import { CredentialSourceBadge } from "./CredentialSourceBadge";
import { SecretImpactTooltip } from "./SecretImpactTooltip";
import { useCredentialsSourceFilter } from "./CredentialsSourceFilterContext";
import { RotateSecretConfirmDialog } from "./RotateSecretConfirmDialog";
import { SaveSecretConfirmDialog } from "./SaveSecretConfirmDialog";
import { withRetryBackoff, CancelledError } from "./secretRetry";
import { normalizeSecretError, type NormalizedSecretError } from "./secretErrors";
import { SecretErrorAlert } from "./SecretErrorAlert";
import { ErrorDetailsDialog } from "./ErrorDetailsDialog";
import { useConnectionTestDetails } from "@/hooks/useConnectionTestDetails";
import type { ConnectionType } from "@/hooks/useConnectionTester";

/**
 * Mapeia o `connectionId` (curto, usado nas abas) para a `ConnectionType`
 * + `env_key` que o backend de testes entende. Retorna `null` quando não há
 * mapeamento conhecido — nesse caso o link "Ver detalhes" não é exibido.
 */
function mapConnectionToTester(
  connectionId: string | undefined,
): { type: ConnectionType; envKey?: "promobrind" | "crm" } | null {
  if (!connectionId) return null;
  if (connectionId === "n8n") return { type: "n8n" };
  if (connectionId === "bitrix24") return { type: "bitrix24" };
  if (connectionId === "mcp") return { type: "mcp" };
  if (connectionId === "promobrind" || connectionId === "crm") {
    return { type: "supabase", envKey: connectionId };
  }
  return null;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (Number.isNaN(then)) return "";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const d = Math.floor(hr / 24);
  return `há ${d}d`;
}

/**
 * Timestamp completo em PT-BR no padrão "dd/mm/aaaa, HH:MM:SS (GMT-3)".
 * Inclui o offset do fuso para deixar claro qual horário o usuário está vendo.
 */
function formatFullPtBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
  return fmt.format(date);
}

/**
 * Monta o tooltip multi-linha de "última atualização" com autor + timestamp.
 *
 * Regras de fallback do autor (em ordem):
 *  1. `updatedByEmail` resolvido → exibe o e-mail.
 *  2. Existe `updatedById` mas o e-mail não pôde ser resolvido (admin removido,
 *     sem permissão de leitura em `auth.users`, ou e-mail nulo) → "equipe"
 *     com o sufixo curto do UUID para rastreabilidade ("equipe (#a1b2c3d4)").
 *  3. Nenhum `updatedById` (credencial veio só de ENV / sem autor registrado)
 *     → "sistema (sem autor registrado)".
 */
function buildUpdatedTooltip(
  updatedAt: string | null | undefined,
  updatedByEmail: string | null | undefined,
  updatedById?: string | null | undefined,
): string | undefined {
  if (!updatedAt) return undefined;
  let author: string;
  if (updatedByEmail) {
    author = updatedByEmail;
  } else if (updatedById) {
    const shortId = updatedById.slice(0, 8);
    author = `equipe (#${shortId})`;
  } else {
    author = "sistema (sem autor registrado)";
  }
  const lines = [
    `Última atualização: ${formatFullPtBr(updatedAt)}`,
    `Autor: ${author}`,
  ];
  return lines.join("\n");
}

// NOTE: error translation moved to ./secretErrors.ts so that every
// connections component shows the same wording, chip and tone.

interface FlashState {
  masked_suffix: string | null;
  length: number;
  action: "set" | "rotate";
  was_update: boolean;
  was_env_fallback: boolean;
  /** changes whenever a new flash should appear, to remount the component */
  key: number;
}

interface Props {
  label: string;
  secretName: string;
  status?: SecretStatus;
  helperText?: string;
  onSaved?: () => void;
  /**
   * Escopo opcional do rascunho (sessionStorage). Quando informado, o
   * rascunho é isolado por conexão — assim o mesmo `secretName`
   * (ex: BITRIX24_TOKEN) usado em conexões diferentes mantém valores
   * digitados separados ao navegar entre abas/cards. Se omitido, cai no
   * escopo legado global do secret (`_:secretName`).
   */
  connectionId?: string;
}

type NameValidation = ReturnType<typeof validateSecretName>;
type ValueValidation = ReturnType<typeof validateSecret>;

function SecretFieldHeader({
  label, secretName, status, editing, suspicious, minLength,
}: {
  label: string;
  secretName: string;
  status?: SecretStatus;
  editing: boolean;
  suspicious: boolean;
  minLength: number | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <SecretImpactTooltip secretName={secretName} isMissing={!status?.has_value}>
          <Label className="text-sm font-medium cursor-help">{label}</Label>
        </SecretImpactTooltip>
        <CredentialSourceBadge status={status} />
        {status?.env_fallback_active && !editing && (
          <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning animate-in fade-in duration-300" title="Este valor está vindo da variável de ambiente do deploy, não do banco. Salve um valor aqui para sobrescrever e tornar editável.">
            <AlertCircle className="h-3 w-3" />Usando ENV
          </span>
        )}
      </div>
      {status?.has_value && !editing && (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 flex-wrap">
          <Check className="h-3 w-3 text-success" />
          <MaskedSuffixBadge suffix={status.masked_suffix} secretName={secretName} length={status.length} />
          <span>({status.length} chars)</span>
          {status.updated_at && <span className="opacity-70" title={buildUpdatedTooltip(status.updated_at, status.updated_by_email, status.updated_by)}>· atualizado {formatRelative(status.updated_at)}</span>}
          {suspicious && (
            <span className="text-warning inline-flex items-center gap-1" title={`Comprimento abaixo do esperado (${status.length} chars, mínimo ${minLength}). Pode estar truncado — re-salve para garantir.`}>
              <AlertCircle className="h-3 w-3" /> comprimento suspeito
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function NameValidationAlert({ validation }: { validation: NameValidation }) {
  if (validation.ok) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">Nome de credencial não permitido</p>
        <p className="break-words">{validation.message}</p>
        {validation.hint && <p className="text-muted-foreground break-words">{validation.hint}</p>}
      </div>
    </div>
  );
}

function SaveButtonLabel({ saving, mode }: { saving: boolean; mode: "set" | "rotate" }) {
  if (saving) return <>{mode === "rotate" ? "Rotacionando…" : "Salvando…"}</>;
  return <>{mode === "rotate" ? "Rotacionar" : "Salvar"}</>;
}

function inputClass(valuePresent: boolean, valid: boolean): string {
  return cn(
    "pr-16",
    valuePresent && valid && "border-success focus-visible:border-success focus-visible:ring-success/20",
    valuePresent && !valid && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
  );
}

function SecretValidityIcon({ visible, valid }: { visible: boolean; valid: boolean }) {
  if (!visible) return null;
  return <span className="absolute right-9 top-1/2 -translate-y-1/2 pointer-events-none">{valid ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-destructive" />}</span>;
}

function VisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />;
}

function SaveStateIcon({ saving }: { saving: boolean }) {
  return saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />;
}

function SecretInputRow(props: {
  secretName: string;
  mode: "set" | "rotate";
  value: string;
  show: boolean;
  saving: boolean;
  validation: ValueValidation;
  canSave: boolean;
  disabledReason: string | null;
  onChange: (value: string) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onToggleShow: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const valuePresent = props.value.length > 0;
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type={props.show ? "text" : "password"}
          value={props.value}
          onChange={event => props.onChange(event.target.value)}
          onPaste={props.onPaste}
          onBlur={props.onBlur}
          placeholder={props.mode === "rotate" ? `Novo valor para ${props.secretName}…` : `Cole o valor de ${props.secretName}…`}
          autoFocus
          disabled={props.saving}
          className={inputClass(valuePresent, props.validation.ok)}
          aria-invalid={valuePresent && !props.validation.ok}
        />
        <SecretValidityIcon visible={valuePresent} valid={props.validation.ok} />
        <button type="button" onClick={props.onToggleShow} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label={props.show ? "Ocultar" : "Mostrar"} disabled={props.saving}>
          <VisibilityIcon visible={props.show} />
        </button>
      </div>
      <Button size="sm" onClick={props.onSave} disabled={!props.canSave} title={props.disabledReason ?? undefined}>
        <SaveStateIcon saving={props.saving} />
        <SaveButtonLabel saving={props.saving} mode={props.mode} />
      </Button>
      <Button size="sm" variant="ghost" onClick={props.onCancel} disabled={props.saving}>Cancelar</Button>
    </div>
  );
}

function SecretTransitionPreview({ value, mode, status }: { value: string; mode: "set" | "rotate"; status?: SecretStatus }) {
  const newSuffix = value.slice(-4).padStart(4, "•");
  const actionLabel = mode === "rotate" ? "Após rotacionar" : status?.has_value ? "Após atualizar" : "Após salvar";
  const showTransition = mode === "rotate" || Boolean(status?.has_value);
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-2.5 py-1.5 text-xs animate-in fade-in duration-200" aria-live="polite">
      <span className="text-muted-foreground shrink-0">{actionLabel}:</span>
      {showTransition && status?.masked_suffix && <><span className="font-mono text-muted-foreground line-through opacity-70">••••{status.masked_suffix}</span><span className="text-muted-foreground">→</span></>}
      <span className="font-mono font-medium text-success">••••{newSuffix}</span>
      <span className="text-muted-foreground">({value.length} {value.length === 1 ? "char" : "chars"})</span>
    </div>
  );
}

function NormalizationNotice({ changes }: { changes: string[] | null }) {
  if (!changes || changes.length === 0) return null;
  return <div className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success animate-in fade-in duration-200" role="status"><Sparkles className="h-3 w-3" />Valor ajustado: {changes.join(", ")}</div>;
}

function InvalidSuffixNotice({ length }: { length: number }) {
  if (length === 0 || length >= MIN_SUFFIX_LENGTH) return null;
  const unit = length === 1 ? "caractere" : "caracteres";
  return (
    <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="suffix-invalid-banner" tabIndex={-1} className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2">
      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-0.5"><p className="font-medium">Sufixo inválido — mínimo {MIN_SUFFIX_LENGTH} caracteres</p><p className="break-words text-destructive/80">O valor tem apenas {length} {unit}. O sufixo mascarado exibido na UI (••••XXXX) precisa de pelo menos {MIN_SUFFIX_LENGTH} caracteres para identificar a credencial sem expor o segredo. Salvamento bloqueado.</p></div>
    </div>
  );
}

function EditingErrorNotice(props: {
  error: NormalizedSecretError | null;
  saving: boolean;
  valueLength: number;
  canSave: boolean;
  onRetry: () => void;
  onViewDetails?: () => void;
  httpStatus: number | null;
  latencyMs: number | null;
}) {
  if (!props.error || props.saving || props.valueLength < MIN_SUFFIX_LENGTH) return null;
  return <SecretErrorAlert error={props.error} onRetry={props.onRetry} retryDisabled={!props.canSave} onViewDetails={props.onViewDetails} httpStatus={props.httpStatus} latencyMs={props.latencyMs} />;
}

function ValidationNotice({ value, validation }: { value: string; validation: ValueValidation }) {
  if (value.length >= MIN_SUFFIX_LENGTH && !validation.ok && validation.message) {
    return <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validation.message}</p>;
  }
  if (value.length === 0 && validation.hint) return <p className="text-xs text-muted-foreground">{validation.hint}</p>;
  if (value.length > 0 && validation.ok && validation.hint) return <p className="text-xs text-success">Formato válido</p>;
  return null;
}

function ValidTransition({ value, validation, mode, status }: { value: string; validation: ValueValidation; mode: "set" | "rotate"; status?: SecretStatus }) {
  if (value.length === 0 || !validation.ok) return null;
  return <SecretTransitionPreview value={value} mode={mode} status={status} />;
}

function EditingFeedback(props: {
  value: string;
  saving: boolean;
  validation: ValueValidation;
  normalization: string[] | null;
  error: NormalizedSecretError | null;
  canSave: boolean;
  mode: "set" | "rotate";
  status?: SecretStatus;
  onRetry: () => void;
  onViewDetails?: () => void;
  httpStatus: number | null;
  latencyMs: number | null;
}) {
  const { value, validation } = props;
  return (
    <>
      <NormalizationNotice changes={props.normalization} />
      <InvalidSuffixNotice length={value.length} />
      <EditingErrorNotice error={props.error} saving={props.saving} valueLength={value.length} canSave={props.canSave} onRetry={props.onRetry} onViewDetails={props.onViewDetails} httpStatus={props.httpStatus} latencyMs={props.latencyMs} />
      <ValidationNotice value={value} validation={validation} />
      <ValidTransition value={value} validation={validation} mode={props.mode} status={props.status} />
    </>
  );
}

interface ReadOnlyPanelProps {
  secretName: string;
  status?: SecretStatus;
  validation: NameValidation;
  lastError: NormalizedSecretError | null;
  onStartEdit: (mode: "set" | "rotate") => void;
  onRetry: () => void;
  onViewDetails?: () => void;
  httpStatus: number | null;
  latencyMs: number | null;
}

function MigrateSecretButton(props: Pick<ReadOnlyPanelProps, "status" | "validation" | "onStartEdit">) {
  if (props.status?.source !== "env") return null;
  return <Button size="sm" variant="outline" onClick={() => props.onStartEdit("set")} disabled={!props.validation.ok} title="Migrar este valor da variável de ambiente para o banco. Você precisa colar o valor novamente — o frontend nunca lê plaintext de env por segurança." className="border-warning/40 bg-warning/5 text-warning hover:bg-warning/10 hover:text-warning"><ArrowDownToLine className="h-4 w-4 mr-1" /> Migrar para o banco</Button>;
}

function ReadOnlyActions(props: Pick<ReadOnlyPanelProps, "status" | "validation" | "onStartEdit">) {
  const { status, validation } = props;
  return (
    <div className="flex gap-2">
      <Input value={status?.has_value ? "•••••••••••••••••" : ""} placeholder="Não configurado" readOnly />
      <Button size="sm" variant="outline" onClick={() => props.onStartEdit("set")} disabled={!validation.ok} title={!validation.ok ? validation.message : undefined}><RefreshCw className="h-4 w-4 mr-1" />{status?.has_value ? "Atualizar" : "Configurar"}</Button>
      {status?.has_value && <Button size="sm" variant="outline" onClick={() => props.onStartEdit("rotate")} disabled={!validation.ok} title={!validation.ok ? validation.message : "Rotacionar (registra no log)"}><RotateCw className="h-4 w-4 mr-1" /> Rotacionar</Button>}
      <MigrateSecretButton status={status} validation={validation} onStartEdit={props.onStartEdit} />
    </div>
  );
}

function EnvSourceNotice({ status }: { status?: SecretStatus }) {
  if (status?.source !== "env") return null;
  return <p className="text-[11px] text-warning/90 flex items-start gap-1"><AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />Valor herdado de variável de ambiente. Cole novamente em "Migrar para o banco" para habilitar rotação e auditoria.</p>;
}

function StoredSecretSummary({ secretName, status }: { secretName: string; status?: SecretStatus }) {
  if (!status?.has_value) return null;
  const unit = status.length === 1 ? "char" : "chars";
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs animate-in fade-in duration-200" aria-live="polite">
      <div className="flex items-center gap-2 min-w-0 flex-wrap"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" /><MaskedSuffixBadge suffix={status.masked_suffix} secretName={secretName} length={status.length} showWhenValid /><span className="text-muted-foreground">({status.length ?? 0} {unit})</span></div>
      {status.updated_at && <span className="text-muted-foreground inline-flex items-center gap-1 shrink-0" title={buildUpdatedTooltip(status.updated_at, status.updated_by_email, status.updated_by)}>Atualizado {formatRelative(status.updated_at)}</span>}
    </div>
  );
}

function ReadOnlyError(props: Pick<ReadOnlyPanelProps, "lastError" | "onRetry" | "onViewDetails" | "httpStatus" | "latencyMs">) {
  if (!props.lastError?.retryable) return null;
  return <SecretErrorAlert error={props.lastError} retryLabel="Tentar novamente" onRetry={props.onRetry} onViewDetails={props.onViewDetails} httpStatus={props.httpStatus} latencyMs={props.latencyMs} />;
}

function ReadOnlySecretPanel(props: ReadOnlyPanelProps) {
  return (
    <>
      <ReadOnlyActions status={props.status} validation={props.validation} onStartEdit={props.onStartEdit} />
      <EnvSourceNotice status={props.status} />
      <StoredSecretSummary secretName={props.secretName} status={props.status} />
      <ReadOnlyError lastError={props.lastError} onRetry={props.onRetry} onViewDetails={props.onViewDetails} httpStatus={props.httpStatus} latencyMs={props.latencyMs} />
    </>
  );
}

function SecretStatePanels(props: {
  editing: boolean;
  secretName: string;
  mode: "set" | "rotate";
  value: string;
  show: boolean;
  saving: boolean;
  valueValidation: ValueValidation;
  nameValidation: NameValidation;
  canSave: boolean;
  disabledReason: string | null;
  normalization: string[] | null;
  error: NormalizedSecretError | null;
  status?: SecretStatus;
  onValueChange: (value: string) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onToggleShow: () => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: (mode: "set" | "rotate") => void;
  onRetryReadOnly: () => void;
  onViewDetails?: () => void;
  httpStatus: number | null;
  latencyMs: number | null;
}) {
  if (!props.editing) {
    return <ReadOnlySecretPanel secretName={props.secretName} status={props.status} validation={props.nameValidation} lastError={props.error} onStartEdit={props.onStartEdit} onRetry={props.onRetryReadOnly} onViewDetails={props.onViewDetails} httpStatus={props.httpStatus} latencyMs={props.latencyMs} />;
  }
  return (
    <>
      <SecretInputRow secretName={props.secretName} mode={props.mode} value={props.value} show={props.show} saving={props.saving} validation={props.valueValidation} canSave={props.canSave} disabledReason={props.disabledReason} onChange={props.onValueChange} onPaste={props.onPaste} onBlur={props.onBlur} onToggleShow={props.onToggleShow} onSave={props.onSave} onCancel={props.onCancel} />
      <EditingFeedback value={props.value} saving={props.saving} validation={props.valueValidation} normalization={props.normalization} error={props.error} canSave={props.canSave} mode={props.mode} status={props.status} onRetry={props.onSave} onViewDetails={props.onViewDetails} httpStatus={props.httpStatus} latencyMs={props.latencyMs} />
    </>
  );
}

function SecretFooter(props: {
  secretName: string;
  status?: SecretStatus;
  helperText?: string;
  flash: FlashState | null;
  rotationRefreshKey: number;
}) {
  return (
    <>
      {props.flash && <JustSavedFlash key={props.flash.key} masked_suffix={props.flash.masked_suffix} length={props.flash.length} action={props.flash.action} was_update={props.flash.was_update} was_env_fallback={props.flash.was_env_fallback} />}
      {props.status?.has_value && <RotationHistoryRow secretName={props.secretName} refreshKey={props.rotationRefreshKey} />}
      {props.helperText && <p className="text-xs text-muted-foreground">{props.helperText}</p>}
    </>
  );
}

function SecretConfirmationDialogs(props: {
  secretName: string;
  status?: SecretStatus;
  value: string;
  saving: boolean;
  rotateOpen: boolean;
  rotateError: string | null;
  saveOpen: boolean;
  saveError: string | null;
  onRotateOpenChange: (open: boolean) => void;
  onSaveOpenChange: (open: boolean) => void;
  onConfirmRotate: (notes?: string) => Promise<void>;
  onConfirmSave: () => Promise<void>;
}) {
  return (
    <>
      <RotateSecretConfirmDialog open={props.rotateOpen} onOpenChange={props.onRotateOpenChange} secretName={props.secretName} currentSuffix={props.status?.masked_suffix ?? null} currentLength={props.status?.length ?? null} newSuffix={props.value.slice(-4)} newLength={props.value.length} loading={props.saving} errorMessage={props.rotateError} onConfirm={props.onConfirmRotate} />
      <SaveSecretConfirmDialog open={props.saveOpen} onOpenChange={props.onSaveOpenChange} secretName={props.secretName} isUpdate={Boolean(props.status?.has_value)} currentSuffix={props.status?.masked_suffix ?? null} currentLength={props.status?.length ?? null} newSuffix={props.value.slice(-4)} newLength={props.value.length} loading={props.saving} errorMessage={props.saveError} onConfirm={props.onConfirmSave} />
    </>
  );
}

function SecretDetails(props: {
  available: boolean;
  error: NormalizedSecretError | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ReturnType<typeof useConnectionTestDetails>["details"];
  loading: boolean;
}) {
  if (!props.available || !props.error) return null;
  return <ErrorDetailsDialog open={props.open} onOpenChange={props.onOpenChange} error={props.error} details={props.details} loading={props.loading} />;
}

type TestDetails = ReturnType<typeof useConnectionTestDetails>["details"];

function draftScopeFor(connectionId: string | undefined): string {
  return connectionId ?? "_";
}

function testDetailsInput(tester: ReturnType<typeof mapConnectionToTester>, open: boolean, connectionId: string | undefined) {
  return {
    open: open && Boolean(tester),
    type: tester?.type ?? "n8n" as ConnectionType,
    envKey: tester?.envKey,
    connectionId,
  };
}

function detailsStatus(details: TestDetails): number | null {
  return details?.response.status ?? null;
}

function detailsLatency(details: TestDetails): number | null {
  return details?.timing.latency_ms ?? null;
}

function canSaveSecret(saving: boolean, nameValidation: NameValidation, value: string, validation: ValueValidation): boolean {
  return !saving && nameValidation.ok && value.length >= MIN_SUFFIX_LENGTH && validation.ok;
}

function disabledSaveReason(saving: boolean, nameValidation: NameValidation, value: string, validation: ValueValidation): string | null {
  if (saving) return null;
  if (!nameValidation.ok) return nameValidation.message ?? "Nome de credencial não permitido";
  if (value.length === 0) return "Cole um valor antes de salvar";
  if (value.length < MIN_SUFFIX_LENGTH) return `Sufixo inválido — mínimo ${MIN_SUFFIX_LENGTH} caracteres (tem ${value.length})`;
  if (!validation.ok) return validation.message ?? "Corrija o formato antes de salvar";
  return null;
}

function storedValueLooksSuspicious(editing: boolean, status: SecretStatus | undefined, minLength: number | undefined): boolean {
  if (editing || !status?.has_value || !minLength) return false;
  return (status.length ?? 0) < minLength;
}

interface StoredDraft {
  value: string;
  mode: "set" | "rotate";
}

function readStoredDraft(draftKey: string, legacyDraftKey: string): StoredDraft | null {
  try {
    const scopedRaw = sessionStorage.getItem(draftKey);
    const raw = scopedRaw ?? sessionStorage.getItem(legacyDraftKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: string; mode?: "set" | "rotate" };
    if (!parsed.value || typeof parsed.value !== "string") return null;
    if (!scopedRaw) {
      sessionStorage.setItem(draftKey, raw);
      sessionStorage.removeItem(legacyDraftKey);
    }
    return { value: parsed.value, mode: parsed.mode === "rotate" ? "rotate" : "set" };
  } catch {
    return null;
  }
}

function abortCurrent(controllerRef: { current: AbortController | null }): void {
  controllerRef.current?.abort();
  controllerRef.current = null;
}

function clearCurrentTimer(timerRef: { current: ReturnType<typeof setTimeout> | null }): void {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = null;
}

type SaveMode = "set" | "rotate";
type SaveAttemptResult =
  | { ok: true; cancelled: false }
  | { ok: false; errorDescription: string; cancelled: boolean };

function retryDescription(attempt: number, nextDelayMs: number | null): string {
  if (!nextDelayMs) return `Tentativa ${attempt}/3…`;
  const seconds = Math.max(1, Math.round(nextDelayMs / 1000));
  return `Rede instável — nova tentativa em ${seconds}s (tentativa ${attempt}/3)`;
}

function createRetryNotifier(baseLabel: string, toastId: string, cancelAction: { label: string; onClick: () => void }) {
  return (attempt: number, nextDelayMs: number | null) => {
    if (attempt <= 1 && nextDelayMs === null) return;
    toast.loading(`${baseLabel}…`, { id: toastId, description: retryDescription(attempt, nextDelayMs), action: cancelAction });
  };
}

async function executeSecretMutation(input: {
  mode: SaveMode;
  secretName: string;
  value: string;
  notes?: string;
  signal: AbortSignal;
  baseLabel: string;
  toastId: string;
  cancelAction: { label: string; onClick: () => void };
  setSecret: (name: string, value: string) => Promise<SecretMutationResult>;
  rotateSecret: (name: string, value: string, notes?: string) => Promise<SecretMutationResult>;
}): Promise<{ cancelled: true } | { cancelled: false; result: SecretMutationResult }> {
  try {
    const result = await withRetryBackoff(
      () => input.mode === "rotate"
        ? input.rotateSecret(input.secretName, input.value, input.notes)
        : input.setSecret(input.secretName, input.value),
      {
        signal: input.signal,
        onAttempt: createRetryNotifier(input.baseLabel, input.toastId, input.cancelAction),
      },
    );
    return { cancelled: false, result };
  } catch (error) {
    if (error instanceof CancelledError) return { cancelled: true };
    return {
      cancelled: false,
      result: { ok: false, error: { code: "unexpected", message: error instanceof Error ? error.message : "Erro inesperado" } },
    };
  }
}

interface MutationFailureInput {
  result: SecretMutationResult;
  secretName: string;
  mode: SaveMode;
  toastId: string;
  onError: (error: NormalizedSecretError) => void;
  onRetry: () => void;
}

function mutationFailureResult({ result, secretName, mode, toastId, onError, onRetry }: MutationFailureInput): SaveAttemptResult {
  const error = result.error ?? { code: "unexpected", message: "Erro desconhecido" };
  const normalized = normalizeSecretError(error, secretName, { action: mode === "rotate" ? "rotate" : "save" });
  onError(normalized);
  const description = normalized.hint ? `${normalized.description} ${normalized.hint}` : normalized.description;
  toast.error(normalized.title, {
    id: toastId,
    description,
    duration: 7000,
    action: normalized.retryable ? { label: "Tentar novamente", onClick: onRetry } : undefined,
  });
  return { ok: false, errorDescription: description, cancelled: false };
}

interface MutationSuccessInput {
  mode: SaveMode;
  secretName: string;
  result: SecretMutationResult;
  suffix: string | null;
  length: number;
  toastId: string;
}

function showMutationSuccess({ mode, secretName, result, suffix, length, toastId }: MutationSuccessInput): void {
  if (mode === "rotate") {
    toast.success("Rotação concluída", { id: toastId, description: `${secretName}: ${formatMaskedSuffix(result.previous_suffix)} → ${formatMaskedSuffix(suffix)} (${length} chars · registrado no log)`, duration: 5000 });
    return;
  }
  const title = result.was_update ? "Credencial atualizada" : "Credencial salva";
  toast.success(title, { id: toastId, description: `${secretName} agora termina em ${formatMaskedSuffix(suffix)} (${length} chars)`, duration: 5000 });
}

export function SecretField({ label, secretName, status, helperText, onSaved, connectionId }: Props) {
  const { setSecret, rotateSecret } = useSecretsManager();
  const draftScope = draftScopeFor(connectionId);
  const draftKey = `secret-draft:${draftScope}:${secretName}`;
  // Chaves legadas (versões anteriores escreviam sem escopo de conexão).
  // Lidas como fallback para não perder rascunhos já em andamento.
  const legacyDraftKey = `secret-draft:${secretName}`;
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"set" | "rotate">("set");
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [rotationRefreshKey, setRotationRefreshKey] = useState(0);
  const [lastError, setLastError] = useState<NormalizedSecretError | null>(null);
  const flashCounter = useRef(0);
  const [lastNormalization, setLastNormalization] = useState<string[] | null>(null);
  const normTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Confirmation modals (declared early so the secretName-swap effect below
  // can close them when the prop changes mid-flow)
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const [rotateConfirmError, setRotateConfirmError] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saveConfirmError, setSaveConfirmError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Cancellation for in-flight retries (declared early for the same reason)
  const abortRef = useRef<AbortController | null>(null);

  const testerMap = useMemo(() => mapConnectionToTester(connectionId), [connectionId]);
  const testDetailsState = useConnectionTestDetails(testDetailsInput(testerMap, detailsOpen, connectionId));
  const detailsAvailable = Boolean(testerMap);
  const handleViewDetails = detailsAvailable ? () => setDetailsOpen(true) : undefined;


  const showNormalization = (changes: string[]) => {
    if (changes.length === 0) return;
    setLastNormalization(changes);
    if (normTimerRef.current) clearTimeout(normTimerRef.current);
    normTimerRef.current = setTimeout(() => setLastNormalization(null), 4000);
    toast.info("Valor normalizado", {
      id: `paste-norm-${secretName}`,
      description: changes.join(", "),
      duration: 3500,
    });
  };

  useEffect(() => {
    return () => {
      if (normTimerRef.current) clearTimeout(normTimerRef.current);
    };
  }, []);

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text");
    if (!raw) return;
    e.preventDefault();
    const { value: normalized, changes } = normalizeSecret(secretName, raw);
    setValue(normalized);
    if (lastError) setLastError(null);
    showNormalization(changes);
  };

  const handleBlur = () => {
    if (!value) return;
    const { value: normalized, changes } = normalizeSecret(secretName, value);
    if (normalized !== value) {
      setValue(normalized);
      showNormalization(changes);
    }
  };

  // Reset transient state and re-hydrate the draft whenever the secretName
  // OR connectionId changes — guarantees validation, button-enabled state,
  // error/normalization banners and stored draft all match the NEW
  // (secret, connection) tuple instead of leaking from the previous one.
  const prevScopeKeyRef = useRef<string>(`${draftScope}:${secretName}`);
  useEffect(() => {
    const scopeKey = `${draftScope}:${secretName}`;
    const prev = prevScopeKeyRef.current;
    if (prev !== scopeKey) {
      abortCurrent(abortRef);
      setValue("");
      setEditing(false);
      setMode("set");
      setShow(false);
      setSaving(false);
      setLastError(null);
      setLastNormalization(null);
      clearCurrentTimer(normTimerRef);
      setRotateConfirmOpen(false);
      setRotateConfirmError(null);
      setSaveConfirmOpen(false);
      setSaveConfirmError(null);
      // flash is suffix-bound to the previous secret — drop it
      setFlash(null);
      prevScopeKeyRef.current = scopeKey;
    }
    const draft = readStoredDraft(draftKey, legacyDraftKey);
    if (!draft) return;
    setValue(draft.value);
    setMode(draft.mode);
    setEditing(true);
  }, [secretName, draftKey, legacyDraftKey, draftScope]);

  // Persist draft whenever editing with a non-empty value; clear on success/cancel
  useEffect(() => {
    if (editing && value.length > 0) {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ value, mode })); } catch { /* ignore quota */ }
    } else {
      try { sessionStorage.removeItem(draftKey); } catch { /* ignore */ }
    }
  }, [editing, value, mode, draftKey]);




  const performSave = async (currentMode: SaveMode, currentValue: string, notes?: string): Promise<SaveAttemptResult> => {
    const wasEnvFallback = Boolean(status?.env_fallback_active);
    const toastId = `secret-${secretName}-${Date.now()}`;
    const controller = new AbortController();
    abortRef.current = controller;
    const baseLabel = currentMode === "rotate" ? `Rotacionando ${secretName}` : `Salvando ${secretName}`;
    const cancelAction = { label: "Cancelar", onClick: () => controller.abort() };
    const slowTimer = setTimeout(() => {
      toast.loading(`${baseLabel}…`, { id: toastId, action: cancelAction });
    }, 800);

    const outcome = await executeSecretMutation({
      mode: currentMode,
      secretName,
      value: currentValue,
      notes,
      signal: controller.signal,
      baseLabel,
      toastId,
      cancelAction,
      setSecret,
      rotateSecret,
    });
    clearTimeout(slowTimer);
    abortRef.current = null;
    if (outcome.cancelled) {
      toast(`${baseLabel} cancelado`, { id: toastId, duration: 3000 });
      return { ok: false, errorDescription: "Cancelado pelo usuário", cancelled: true };
    }

    const { result } = outcome;
    if (!result.ok || !result.secret) {
      return mutationFailureResult({
        result, secretName, mode: currentMode, toastId, onError: setLastError,
        onRetry: () => { setMode(currentMode); setValue(currentValue); setEditing(true); },
      });
    }

    setLastError(null);
    const suffix = normalizeMaskedSuffix(result.secret.masked_suffix);
    const length = result.secret.length ?? currentValue.length;
    showMutationSuccess({ mode: currentMode, secretName, result, suffix, length, toastId });

    flashCounter.current += 1;
    setFlash({
      masked_suffix: suffix,
      length,
      action: currentMode,
      was_update: Boolean(result.was_update),
      was_env_fallback: wasEnvFallback,
      key: flashCounter.current,
    });
    if (currentMode === "rotate") setRotationRefreshKey(current => current + 1);
    setValue("");
    setEditing(false);
    setMode("set");
    onSaved?.();
    return { ok: true, cancelled: false };
  };
  const nameValidation = useMemo(() => validateSecretName(secretName), [secretName]);
  const validation = useMemo(() => validateSecret(secretName, value), [secretName, value]);
  const canSave = canSaveSecret(saving, nameValidation, value, validation);
  const saveDisabledReason = disabledSaveReason(saving, nameValidation, value, validation);

  const minLen = getMinLength(secretName);
  const storedLooksSuspicious = storedValueLooksSuspicious(editing, status, minLen);

  const handleSave = async () => {
    if (!canSave) return;

    // Both modes now require modal confirmation before touching the backend
    if (mode === "rotate") {
      setRotateConfirmError(null);
      setRotateConfirmOpen(true);
      return;
    }
    setSaveConfirmError(null);
    setSaveConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveConfirmError(null);
    const res = await performSave("set", value);
    setSaving(false);
    if (res.ok) {
      setSaveConfirmOpen(false);
    } else if (!res.cancelled) {
      setSaveConfirmError(res.errorDescription);
    }
  };

  const handleConfirmedRotate = async (notes?: string) => {
    if (!value || !validation.ok || !nameValidation.ok) return;
    setSaving(true);
    setRotateConfirmError(null);
    const res = await performSave("rotate", value, notes);
    setSaving(false);
    if (res.ok) {
      setRotateConfirmOpen(false);
    } else if (!res.cancelled) {
      setRotateConfirmError(res.errorDescription);
    }
  };

  const startEdit = (m: "set" | "rotate") => { setMode(m); setEditing(true); };
  const updateValue = (nextValue: string) => { setValue(nextValue); if (lastError) setLastError(null); };
  const toggleVisibility = () => setShow(current => !current);
  const cancelEditing = () => { setEditing(false); setValue(""); setMode("set"); setLastError(null); };
  const retryReadOnly = () => { setMode(current => current); setEditing(true); };
  const changeRotateDialog = (open: boolean) => {
    if (saving) return;
    setRotateConfirmOpen(open);
    if (!open) setRotateConfirmError(null);
  };
  const changeSaveDialog = (open: boolean) => {
    if (saving) return;
    setSaveConfirmOpen(open);
    if (!open) setSaveConfirmError(null);
  };

  const { matchesFilter, filter } = useCredentialsSourceFilter();
  const fadeOut = !matchesFilter(status);

  return (
    <div
      className={cn(
        "space-y-1.5 transition-opacity duration-200",
        (fadeOut && "opacity-40 pointer-events-none"),
      )}
      aria-hidden={(fadeOut || undefined)}
      data-source-filter={filter}
    >
      <SecretFieldHeader label={label} secretName={secretName} status={status} editing={editing} suspicious={storedLooksSuspicious} minLength={minLen} />
      <NameValidationAlert validation={nameValidation} />
      <SecretStatePanels
        editing={editing}
        secretName={secretName}
        mode={mode}
        value={value}
        show={show}
        saving={saving}
        valueValidation={validation}
        nameValidation={nameValidation}
        canSave={canSave}
        disabledReason={saveDisabledReason}
        normalization={lastNormalization}
        error={lastError}
        status={status}
        onValueChange={updateValue}
        onPaste={handlePaste}
        onBlur={handleBlur}
        onToggleShow={toggleVisibility}
        onSave={handleSave}
        onCancel={cancelEditing}
        onStartEdit={startEdit}
        onRetryReadOnly={retryReadOnly}
        onViewDetails={handleViewDetails}
        httpStatus={detailsStatus(testDetailsState.details)}
        latencyMs={detailsLatency(testDetailsState.details)}
      />
      <SecretFooter secretName={secretName} status={status} helperText={helperText} flash={flash} rotationRefreshKey={rotationRefreshKey} />
      <SecretConfirmationDialogs
        secretName={secretName}
        status={status}
        value={value}
        saving={saving}
        rotateOpen={rotateConfirmOpen}
        rotateError={rotateConfirmError}
        saveOpen={saveConfirmOpen}
        saveError={saveConfirmError}
        onRotateOpenChange={changeRotateDialog}
        onSaveOpenChange={changeSaveDialog}
        onConfirmRotate={handleConfirmedRotate}
        onConfirmSave={handleConfirmedSave}
      />
      <SecretDetails
        available={detailsAvailable}
        error={lastError}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        details={testDetailsState.details}
        loading={testDetailsState.loading}
      />
    </div>
  );
}
