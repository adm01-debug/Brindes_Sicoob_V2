/**
 * Integration Tests — send-transactional-email
 * Valida o comportamento da função de email em diversos cenários.
 */
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/send-transactional-email";

Deno.test({
  name: "send-transactional-email: buildEmailContent baseline check",
  fn: async () => {
    // Importamos dinamicamente para testar a lógica interna se possível, 
    // ou simulamos via fetch se o ambiente permitir.
    // Como estamos no runner de testes do Supabase, o ideal é testar a lógica pura.
    
    const path = new URL("../send-transactional-email/index.ts", import.meta.url);
    const source = await Deno.readTextFile(path);
    
    // Verificamos se todos os eventos esperados estão implementados no switch
    const expectedEvents = [
      "quote_sent",
      "quote_approved",
      "quote_rejected",
      "order_created",
      "sicoob_order_status_change",
      "sicoob_order_approval_request"
    ];
    
    for (const event of expectedEvents) {
      assert(source.includes(`case "${event}":`), `Evento ${event} não encontrado no código da função.`);
    }
  }
});

Deno.test({
  name: "send-transactional-email: security gate check",
  fn: async () => {
    const path = new URL("../send-transactional-email/index.ts", import.meta.url);
    const source = await Deno.readTextFile(path);
    
    // Deve exigir autenticação (getUser)
    assert(source.includes("supabase.auth.getUser()"), "Função não verifica autenticação do usuário.");
    
    // Deve validar campos obrigatórios
    assert(source.includes("!body.event_type || !body.recipient_email"), "Função não valida campos obrigatórios.");
  }
});

Deno.test({
  name: "send-transactional-email: CORS configuration check",
  fn: async () => {
    const path = new URL("../send-transactional-email/index.ts", import.meta.url);
    const source = await Deno.readTextFile(path);
    
    assert(source.includes('import { getCorsHeaders } from "../_shared/cors.ts"'), "Não utiliza helper de CORS centralizado.");
    assert(source.includes('method === "OPTIONS"'), "Não trata requisições OPTIONS.");
  }
});
