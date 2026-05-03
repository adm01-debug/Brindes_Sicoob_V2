import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Script de Seed QA para provisionamento de contas e cenários (§0-bis).
 * Executável via console ou gatilho administrativo.
 */

const QA_PASSWORD = "Qa@Test2026";
const QA_ACCOUNTS = [
  { email: "qa+gerente@sicoob.test", role: "gerente_pa" },
  { email: "qa+gestor@sicoob.test", role: "gestor_singular" },
  { email: "qa+vendedor@sicoob.test", role: "vendedor" },
  { email: "qa+admin@sicoob.test", role: "admin" },
];

export async function runQaSeed(scenario?: string) {
  console.log("🚀 Iniciando Seed QA...");
  
  try {
    // 1. Provisionamento de Contas (via Edge Function ou Admin API se disponível)
    // Como estamos no lado do cliente, assumimos que as contas devem ser criadas via Auth Signup 
    // ou gerenciadas por uma Edge Function administrativa.
    
    // 2. Executa Seed de Dados via RPC
    const { data, error } = await supabase.rpc('seed_qa_scenario', { 
      scenario_name: scenario || 'default' 
    });

    if (error) throw error;

    console.log("✅ Seed finalizado:", data);
    return data;
  } catch (err) {
    console.error("❌ Falha no Seed QA:", err);
    throw err;
  }
}
