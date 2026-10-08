import { supabase } from "@/integrations/supabase/client";

export interface CartCompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo: string | null;
  logo_url: string | null;
}

function locationLabel(kind: string, city: string | null, state: string | null): string {
  const location = [city, state].filter(Boolean).join("/");
  return location ? `${kind} • ${location}` : kind;
}

/**
 * Opções canônicas do portal Sicoob. Carrinhos não dependem do CRM genérico:
 * cooperativas e PAs pertencem ao próprio domínio e respeitam sua RLS.
 */
export async function fetchCartCompanyOptions(): Promise<CartCompanyOption[]> {
  const [cooperativesResult, branchesResult] = await Promise.all([
    supabase
      .from("cooperativas")
      .select("id, nome, cidade, uf")
      .eq("is_active", true)
      .order("nome")
      .limit(500),
    supabase
      .from("postos_atendimento")
      .select("id, nome, cidade, uf")
      .eq("is_active", true)
      .order("nome")
      .limit(500),
  ]);

  if (cooperativesResult.error) throw cooperativesResult.error;
  if (branchesResult.error) throw branchesResult.error;

  const cooperatives = (cooperativesResult.data ?? []).map((cooperative) => ({
    id: cooperative.id,
    name: cooperative.nome,
    razao_social: cooperative.nome,
    nome_fantasia: null,
    ramo: locationLabel("Cooperativa", cooperative.cidade, cooperative.uf),
    logo_url: null,
  }));
  const branches = (branchesResult.data ?? []).map((branch) => ({
    id: branch.id,
    name: branch.nome,
    razao_social: branch.nome,
    nome_fantasia: null,
    ramo: locationLabel("Posto de atendimento", branch.cidade, branch.uf),
    logo_url: null,
  }));

  return [...cooperatives, ...branches];
}
