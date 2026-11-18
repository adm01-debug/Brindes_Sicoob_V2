# E028 — Trilha de Auditoria

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Status:** Rascunho

---

## 1. Objetivo

Garantir evidências rastreáveis para fiscalização da ANPD ou auditoria interna:
- Quando e como o consentimento/opt-out foi registrado
- Quais dados foram enviados ao LLM (hash do prompt, nunca o conteúdo)
- Quando dados foram deletados por política de retenção
- Quem acessou conversas de outros vendedores

---

## 2. Tabela de Eventos a Registrar

| Evento | `event_type` | Campos obrigatórios | Retenção |
|--------|-------------|---------------------|----------|
| Opt-out solicitado | `opt_out_detected` | `contact_id`, `conversation_id`, `channel`, `trigger_keyword` | **5 anos** |
| Opt-out confirmado | `opt_out_confirmed` | `contact_id`, `actor_id`, `timestamp` | **5 anos** |
| Re-opt-in | `opt_in_restored` | `contact_id`, `actor_id`, `timestamp` | **5 anos** |
| LLM chamado | `llm_called` | `conversation_id`, `provider`, `model`, `prompt_hash`, `timestamp` | 90 dias |
| Dado deletado por retenção | `retention_job_executed` | `table_name`, `record_count`, `deleted_at` | 90 dias |
| Gestor acessa conversa de outro vendedor | `cross_seller_access` | `viewer_id`, `owner_id`, `conversation_id`, `timestamp` | **2 anos** |
| Exportação de dados (portabilidade) | `data_export_requested` | `contact_id`, `requested_by`, `timestamp` | **5 anos** |
| Exclusão por solicitação (apagamento) | `data_deletion_requested` | `contact_id`, `requested_by`, `timestamp`, `status` | **5 anos** |

---

## 3. Schema da Tabela `copilot_events`

```sql
CREATE TABLE IF NOT EXISTS copilot_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        UUID REFERENCES copilot_contacts(id) ON DELETE SET NULL,
  conversation_id   UUID REFERENCES copilot_conversations(id) ON DELETE SET NULL,
  actor_id          UUID,
  event_type        TEXT NOT NULL,
  event_data        JSONB DEFAULT '{}',
  channel           TEXT,
  ip_hash           TEXT,
  user_agent_hash   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retain_until      TIMESTAMPTZ,
  checksum          TEXT
);

CREATE INDEX idx_copilot_events_contact_id  ON copilot_events(contact_id);
CREATE INDEX idx_copilot_events_event_type  ON copilot_events(event_type);
CREATE INDEX idx_copilot_events_created_at  ON copilot_events(created_at DESC);
CREATE INDEX idx_copilot_events_actor_id    ON copilot_events(actor_id);

ALTER TABLE copilot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedor_le_proprios_eventos" ON copilot_events
  FOR SELECT
  USING (
    actor_id = auth.uid()
    OR conversation_id IN (
      SELECT id FROM copilot_conversations WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "service_role_insere_eventos" ON copilot_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

---

## 4. Logging de Chamadas ao LLM (nunca o conteúdo, apenas hash)

```typescript
// src/copilot/llm-logger.ts
import { createHash } from 'crypto';

export async function logLLMCall(params: {
  conversationId: string;
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  promptText: string;
}): Promise<void> {
  const promptHash = createHash('sha256').update(params.promptText).digest('hex');
  
  await supabase.from('copilot_events').insert({
    conversation_id: params.conversationId,
    event_type: 'llm_called',
    event_data: {
      provider: params.provider,
      model: params.model,
      prompt_hash: promptHash,
      prompt_length: params.promptText.length,
      // NUNCA incluir: prompt_text, mensagens, nome do cooperado
    },
    channel: 'api',
  });
}
```

---

## 5. Relatório de Auditoria para a ANPD

```sql
-- Histórico completo de um cooperado. O relatório é para a ANPD e para o
-- próprio titular (art. 18 LGPD): mascarar aqui NÃO é o mesmo mascaramento
-- que entra no prompt do LLM, mas o nome da coluna não pode prometer
-- anonimização que não faz — "contato_anonimizado" devolvendo o
-- whatsapp_number inteiro faria quem consome o relatório tratá-lo como
-- seguro para compartilhar.
SELECT ce.event_type, ce.event_data, ce.channel, ce.created_at,
       '***' || RIGHT(cc.whatsapp_number, 4) AS contato_mascarado, au.email AS ator
FROM copilot_events ce
LEFT JOIN copilot_contacts cc ON cc.id = ce.contact_id
LEFT JOIN auth.users au ON au.id = ce.actor_id
WHERE ce.contact_id = '<uuid-do-contato>'
ORDER BY ce.created_at ASC;

-- Todos os opt-outs nos últimos 6 meses
SELECT ce.created_at, ce.event_type,
       ce.event_data->>'trigger_keyword' AS palavra_usada
FROM copilot_events ce
WHERE ce.event_type IN ('opt_out_detected', 'opt_out_confirmed', 'opt_in_restored')
  AND ce.created_at > NOW() - INTERVAL '6 months'
ORDER BY ce.created_at DESC;
```

---

## 6. Integridade — Proteção Contra Adulteração

```typescript
function computeChecksum(event: CopilotEvent): string {
  const payload = `${event.id}|${event.event_type}|${JSON.stringify(event.event_data)}|${event.created_at.toISOString()}`;
  return createHash('sha256').update(payload).digest('hex');
}
```

A coluna `checksum` é calculada na inserção e nunca atualizada.

---

## Referências

- LGPD art. 37 (registro de operações)
- LGPD art. 48 (notificação de incidentes)
- E023 — Mecanismo de Consentimento
- E024 — Política de Retenção
- E029 — Controles de Segurança (RLS)
