import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PolicyRow = Database["public"]["Tables"]["sicoob_approval_policies"]["Row"];

export type ApprovalPolicy = PolicyRow & {
  cooperative: { nome: string } | null;
};

export type PolicyScope = {
  cooperativeId: string | null;
  cooperativeName: string;
};

export type PublishPolicyInput = {
  cooperativeId: string | null;
  version: string;
  forbidSelfApproval: boolean;
  requireActiveMembership: boolean;
  effectiveFrom: string;
};

export type CloseActiveOptions = {
  keepPolicyId?: string;
  createdUntil?: string;
  handoverAt?: string;
};

/** Versão aplicada pelo servidor quando nenhuma política foi publicada. */
export const BASELINE_POLICY = {
  version: "baseline-tecnica-v1",
  forbidSelfApproval: true,
  requireActiveMembership: true,
} as const;

export function isPolicyInForce(policy: ApprovalPolicy, now = new Date()) {
  if (!policy.is_active) return false;
  if (new Date(policy.effective_from) > now) return false;
  if (policy.effective_until && new Date(policy.effective_until) <= now) return false;
  return true;
}

/** A versão vigente de um escopo é a ativa mais recente que já começou. */
export function pickPolicyInForce(policies: ApprovalPolicy[], cooperativeId: string | null, now = new Date()) {
  return policies
    .filter((policy) => policy.cooperative_id === cooperativeId && isPolicyInForce(policy, now))
    .sort(
      (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime(),
    )[0] ?? null;
}

export type EffectivePolicy = {
  policy: ApprovalPolicy | null;
  /** Sem versão própria vigente, a Singular responde pela política global. */
  inherited: boolean;
};

/**
 * Espelha a ordem do resolvedor do servidor (`get_sicoob_order_approval_policy`):
 * versão própria vigente; senão a versão global vigente; senão o padrão técnico.
 */
export function pickEffectivePolicy(
  policies: ApprovalPolicy[],
  cooperativeId: string | null,
  now = new Date(),
): EffectivePolicy {
  const own = pickPolicyInForce(policies, cooperativeId, now);
  if (own || cooperativeId === null) return { policy: own, inherited: false };
  const global = pickPolicyInForce(policies, null, now);
  return { policy: global, inherited: global !== null };
}

function nextVersionSuggestion(policies: ApprovalPolicy[], cooperativeId: string | null) {
  const total = policies.filter((policy) => policy.cooperative_id === cooperativeId).length;
  return `v${total + 1}`;
}

export const sicoobApprovalPolicyService = {
  async list(): Promise<ApprovalPolicy[]> {
    const { data, error } = await supabase
      .from("sicoob_approval_policies")
      .select("*, cooperative:cooperativas(nome)")
      .order("effective_from", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async listScopes(): Promise<PolicyScope[]> {
    const { data, error } = await supabase
      .from("cooperativas")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) throw error;
    const globalScope: PolicyScope = {
      cooperativeId: null,
      cooperativeName: "Todas as Singulares (política global)",
    };
    const cooperativeScopes: PolicyScope[] = (data ?? []).map((row) => ({
      cooperativeId: row.id,
      cooperativeName: row.nome,
    }));

    return [globalScope, ...cooperativeScopes];
  },

  suggestVersion(policies: ApprovalPolicy[], cooperativeId: string | null) {
    return nextVersionSuggestion(policies, cooperativeId);
  },

  /**
   * Política publicada é imutável (trigger `tr_protect_sicoob_approval_policy_version`):
   * mudança de regra exige uma nova versão, e a anterior é apenas encerrada.
   */
  async publish(input: PublishPolicyInput): Promise<string> {
    const version = input.version.trim();
    if (!version) throw new Error("Informe a versão da política.");

    const { data, error } = await supabase
      .from("sicoob_approval_policies")
      .insert({
        cooperative_id: input.cooperativeId,
        version,
        forbid_self_approval: input.forbidSelfApproval,
        require_active_membership: input.requireActiveMembership,
        effective_from: input.effectiveFrom,
        is_active: true,
      })
      .select("id, created_at")
      .single();

    if (error) throw error;
    const policyId = data?.id ?? null;
    if (!policyId) throw new Error("A versão publicada não retornou identificador.");

    const startsNow = new Date(input.effectiveFrom) <= new Date();
    await this.closeActive(input.cooperativeId, {
      keepPolicyId: policyId,
      // Publicações simultâneas no mesmo escopo: só são substituídas as versões
      // criadas antes desta, para duas gravações não se desativarem mutuamente.
      createdUntil: data?.created_at ?? undefined,
      // Agendada: a versão em vigor continua respondendo até a virada, e o
      // histórico guarda a data real da substituição.
      handoverAt: startsNow ? undefined : input.effectiveFrom,
    });

    return policyId;
  },

  /**
   * Encerra as versões em vigor do escopo (versão publicada é imutável: a nova
   * substitui a anterior). Só atingem versões já iniciadas (`effective_from <= now()`),
   * para uma versão agendada para o futuro não ser cancelada por engano.
   *
   * - `keepPolicyId`: versão recém-publicada, que não encerra a si mesma.
   * - `createdUntil`: substitui apenas versões criadas até este instante, evitando
   *   que duas publicações simultâneas desativem uma à outra.
   * - `handoverAt`: virada de uma versão agendada — a versão atual continua ativa
   *   (e respondendo pelo escopo) até esse instante.
   */
  async closeActive(cooperativeId: string | null, options: CloseActiveOptions = {}) {
    const now = new Date().toISOString();
    const handover = options.handoverAt ?? null;

    let query = supabase
      .from("sicoob_approval_policies")
      .update(
        handover
          ? { effective_until: handover }
          : { is_active: false, effective_until: now },
      )
      .lte("effective_from", now);

    if (handover) {
      // Só versões em vigor hoje: as já encerradas não têm a data reescrita.
      query = query.or(`effective_until.is.null,effective_until.gt.${now}`);
    } else {
      query = query.eq("is_active", true);
    }

    if (options.createdUntil) query = query.lte("created_at", options.createdUntil);

    query = cooperativeId === null
      ? query.is("cooperative_id", null)
      : query.eq("cooperative_id", cooperativeId);

    if (options.keepPolicyId) query = query.neq("id", options.keepPolicyId);

    const { error } = await query;
    if (error) throw error;
  },
};
