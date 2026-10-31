/**
 * RLS denial logger — cliente para registrar tentativas negadas pelo Postgres
 * (códigos 42501 / "row-level security"). Usado como interceptor em hooks
 * que tocam tabelas sensíveis (quotes, orders, discount_approval_requests, etc).
 *
 * Uso:
 *   const { error } = await supabase.from("quotes").update(...).eq("id", id);
 *   if (error) await logRlsDenialIfApplicable(error, { table: "quotes", op: "UPDATE", endpoint: "useQuotes.update", targetId: id });
 */
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

export type RlsOperation = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

export interface LogRlsDenialContext {
  table: string;
  op: RlsOperation;
  endpoint?: string;
  querySummary?: string;
  targetId?: string | null;
  targetSellerId?: string | null;
  policyHint?: string;
}

/**
 * Heurística para identificar erro de RLS. Cobre os formatos mais comuns
 * retornados pelo PostgREST/Supabase:
 *  - code "42501" (insufficient_privilege)
 *  - code "PGRST116" quando RLS filtra resultado em .single()
 *  - mensagem contendo "row-level security" / "violates row-level"
 */
export function isRlsDenialError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  const msg = (error.message || "").toLowerCase();
  return /row[- ]level security|violates row-level|new row violates/.test(msg);
}

function currentEndpoint(): string | undefined {
  return typeof window === "undefined" ? undefined : window.location.pathname;
}

function currentUserAgent(): string | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.userAgent;
}

function rlsLogParams(error: PostgrestError, context: LogRlsDenialContext) {
  return {
    p_table_name: context.table,
    p_operation: context.op,
    p_endpoint: context.endpoint ?? currentEndpoint(),
    p_query_summary: context.querySummary ?? undefined,
    p_target_id: context.targetId ?? undefined,
    p_target_seller_id: context.targetSellerId ?? undefined,
    p_policy_hint: context.policyHint ?? undefined,
    p_error_code: error.code ?? undefined,
    p_error_message: error.message ?? undefined,
    p_user_agent: currentUserAgent(),
  };
}

/**
 * Registra a negação de forma "fire-and-forget" (não bloqueia UI, não relança).
 * Usa a RPC `log_rls_denial` que é SECURITY DEFINER e enriquece com user/email/role.
 */
export async function logRlsDenial(
  error: PostgrestError | null | undefined,
  ctx: LogRlsDenialContext,
): Promise<void> {
  if (!error || !isRlsDenialError(error)) return;
  try {
    await supabase.rpc("log_rls_denial", rlsLogParams(error, ctx));
  } catch {
    // Logging nunca deve quebrar o fluxo do usuário.
  }
}

/**
 * Helper de conveniência para usar dentro de mutações:
 *   const r = await supabase.from("quotes").update(...).eq("id", id);
 *   await logRlsDenialIfApplicable(r.error, {...});
 */
export const logRlsDenialIfApplicable = logRlsDenial;
