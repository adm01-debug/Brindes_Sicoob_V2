import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DelegationRow = Database['public']['Tables']['sicoob_approval_delegations']['Row'];

export type ApprovalDelegation = DelegationRow & {
  delegate: { full_name: string | null; email: string | null } | null;
  delegator: { full_name: string | null; email: string | null } | null;
  cooperative: { nome: string } | null;
  pa: { nome: string } | null;
};

export type DelegationCandidate = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  cooperativa_id: string | null;
  pa_id: string | null;
};

const profileByUserId = async (userIds: string[]) => {
  if (userIds.length === 0)
    return new Map<string, { full_name: string | null; email: string | null }>();

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', userIds);
  if (error) throw error;

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]));
};

export const sicoobApprovalDelegationService = {
  async list(): Promise<ApprovalDelegation[]> {
    const { data, error } = await supabase
      .from('sicoob_approval_delegations')
      .select('*, cooperative:cooperativas(nome), pa:postos_atendimento(nome)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const ids = Array.from(new Set(rows.flatMap((row) => [row.delegator_id, row.delegate_id])));
    const profiles = await profileByUserId(ids);
    return rows.map((row) => ({
      ...row,
      delegator: profiles.get(row.delegator_id) ?? null,
      delegate: profiles.get(row.delegate_id) ?? null,
    }));
  },

  async listCandidates(): Promise<DelegationCandidate[]> {
    const { data, error } = await supabase.rpc('list_sicoob_approval_delegate_candidates');
    if (error) throw error;
    return data ?? [];
  },

  async create(input: {
    delegateId: string;
    competencies: string[];
    startsAt: string;
    endsAt: string;
    reason: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('create_sicoob_approval_delegation', {
      p_delegate_id: input.delegateId,
      p_competencies: input.competencies,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_reason: input.reason,
    });
    if (error) throw error;
    return data;
  },

  async revoke(delegationId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_sicoob_approval_delegation', {
      p_delegation_id: delegationId,
      p_reason: reason,
    });
    if (error) throw error;
  },
};
