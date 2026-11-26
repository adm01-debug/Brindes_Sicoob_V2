/**
 * Teto mensal da cooperativa (`cooperativa_budgets`) e quanto dele ja foi
 * distribuido aos PAs. A RLS de 20261013115605:190-240 limita escrita ao
 * gestor da propria cooperativa; o servico nao amplia esse escopo.
 */
import { supabase } from "@/integrations/supabase/client";

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
  const { data: pas, error: paError } = await supabase
    .from("postos_atendimento")
    .select("id")
    .eq("cooperativa_id", cooperativaId);

  if (paError) throw paError;

  const paIds = (pas ?? []).map((pa) => pa.id);
  if (paIds.length === 0) return 0;

  const { data, error } = await supabase
    .from("pa_budgets")
    .select("verba_total")
    .eq("ano", ano)
    .eq("mes", mes)
    .in("pa_id", paIds);

  if (error) throw error;

  return (data ?? []).reduce((total, row) => total + toNumber(row.verba_total), 0);
}

export interface SaveCeilingInput {
  cooperativaId: string;
  ano: number;
  mes: number;
  verbaTotal: number;
  limiteAlcada?: number | null;
}

export async function saveCeiling(input: SaveCeilingInput): Promise<void> {
  const payload = {
    cooperativa_id: input.cooperativaId,
    ano: input.ano,
    mes: input.mes,
    verba_total: input.verbaTotal,
    ...(input.limiteAlcada === undefined ? {} : { limite_alcada: input.limiteAlcada }),
  };

  const { error } = await supabase
    .from("cooperativa_budgets")
    .upsert(payload, { onConflict: "cooperativa_id,ano,mes" });

  if (error) throw error;
}
