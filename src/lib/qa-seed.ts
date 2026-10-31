import { supabase } from "@/integrations/supabase/client";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";

const log = createClientLogger("qa-seed");

/**
 * Script de Seed QA para provisionamento de contas e cenários (§0-bis).
 * Executável via console ou gatilho administrativo.
 */

export async function runQaSeed(scenario?: string) {
  log.info("started", { scenario });
  
  try {
    // 1. Provisionamento de Contas (via Edge Function ou Admin API se disponível)
    // Como estamos no lado do cliente, assumimos que as contas devem ser criadas via Auth Signup 
    // ou gerenciadas por uma Edge Function administrativa.
    
    // 2. Executa Seed de Dados via RPC
    const { data, error } = await supabase.rpc('seed_qa_scenario', { 
      scenario_name: scenario || 'default' 
    });

    if (error) throw error;

    log.info("finished", { data });
    return data;
  } catch (err) {
    log.error("failed", { err });
    throw err;
  }
}
