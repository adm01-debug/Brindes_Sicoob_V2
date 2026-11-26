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
      .select("id")
      .single();

    if (error) throw error;
    const policyId = data?.id ?? null;

    // A versão nova só encerra a anterior quando já passa a valer; agendada
    // para o futuro, a política vigente continua respondendo pelo escopo.
    if (policyId && new Date(input.effectiveFrom) <= new Date()) {
      await this.closeActive(input.cooperativeId, policyId);
    }

    return policyId ?? "";
  },

  /**
   * Encerra apenas as versões já em vigor (`effective_from <= now()`): uma versão
   * agendada para o futuro não pode ser cancelada por engano.
   */
  async closeActive(cooperativeId: string | null, keepPolicyId?: string) {
    let query = supabase
      .from("sicoob_approval_policies")
      .update({ is_active: false, effective_until: new Date().toISOString() })
      .eq("is_active", true)
      .lte("effective_from", new Date().toISOString());

    query = cooperativeId === null
      ? query.is("cooperative_id", null)
      : query.eq("cooperative_id", cooperativeId);

    if (keepPolicyId) query = query.neq("id", keepPolicyId);

    const { error } = await query;
    if (error) throw error;
  },
};
