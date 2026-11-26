/**
 * Teto mensal da cooperativa (`cooperativa_budgets`) e quanto dele ja foi
 * distribuido aos PAs. A RLS de 20261013115605:190-240 limita escrita ao
 * gestor da propria cooperativa; o servico nao amplia esse escopo.
 *
 * Duas restricoes do banco moldam este arquivo:
 *   1. `authenticated` tem UPDATE apenas em `verba_total, limite_alcada,
 *      observacoes` (20261013115605). Upsert do PostgREST inclui as colunas da
 *      chave no `ON CONFLICT DO UPDATE SET` e seria recusado por permissao, por
 *      isso a gravacao e update-primeiro / insert-depois.
 *   2. A policy de leitura de `postos_atendimento` esconde PAs inativos
 *      (20260502145232:41-46), enquanto o gatilho do teto soma todas as verbas.
 *      Somar pelo cliente daria um total menor que o cobrado; o total vem da
 *      RPC `cooperativa_verba_distribuida`.
 */
import { supabase } from "@/integrations/supabase/client";

export const COOPERATIVA_CEILING_QUERY_KEY = "cooperativa-ceiling";

/** Familia de cache do teto: invalide esta chave onde verbas forem alocadas. */
export function cooperativaCeilingQueryKey(cooperativaId?: string) {
  return cooperativaId
    ? [COOPERATIVA_CEILING_QUERY_KEY, cooperativaId]
    : [COOPERATIVA_CEILING_QUERY_KEY];
}

export interface CooperativaCeiling {
  verbaTotal: number;
  limiteAlcada: number | null;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadCeiling(
  cooperativaId: string,
  ano: number,
  mes: number,
): Promise<CooperativaCeiling | null> {
  const { data, error } = await supabase
    .from("cooperativa_budgets")
    .select("verba_total, limite_alcada")
    .eq("cooperativa_id", cooperativaId)
    .eq("ano", ano)
    .eq("mes", mes)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    verbaTotal: toNumber(data.verba_total),
    limiteAlcada: data.limite_alcada === null ? null : toNumber(data.limite_alcada),
  };
}

export async function loadDistributedTotal(
  cooperativaId: string,
  ano: number,
  mes: number,
): Promise<number> {
  const { data, error } = await supabase.rpc("cooperativa_verba_distribuida", {
    p_cooperativa_id: cooperativaId,
    p_ano: ano,
    p_mes: mes,
  });

  if (error) throw error;

  return toNumber(data);
}

export interface SaveCeilingInput {
  cooperativaId: string;
  ano: number;
  mes: number;
  verbaTotal: number;
  limiteAlcada?: number | null;
}

const UNIQUE_VIOLATION = "23505";

export async function saveCeiling(input: SaveCeilingInput): Promise<void> {
  const changes = {
    verba_total: input.verbaTotal,
    ...(input.limiteAlcada === undefined ? {} : { limite_alcada: input.limiteAlcada }),
  };

  const updateExisting = async (): Promise<boolean> => {
    const { data, error } = await supabase
      .from("cooperativa_budgets")
      .update(changes)
      .eq("cooperativa_id", input.cooperativaId)
      .eq("ano", input.ano)
      .eq("mes", input.mes)
      .select("id");

    if (error) throw error;
    return (data ?? []).length > 0;
  };

  if (await updateExisting()) return;

  const { error } = await supabase.from("cooperativa_budgets").insert({
    cooperativa_id: input.cooperativaId,
    ano: input.ano,
    mes: input.mes,
    ...changes,
  });

  if (!error) return;

  // Outra sessao criou a linha entre o update e o insert.
  if (error.code === UNIQUE_VIOLATION && (await updateExisting())) return;

  throw error;
}
