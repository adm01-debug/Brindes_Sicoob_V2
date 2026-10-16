# E029 — Controles de Segurança Técnica

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Status:** Rascunho — implementação pendente (pré-requisito do G1)

---

## 1. Visão Geral dos Controles

| # | Controle | Tipo | Prioridade | Status |
|---|---------|------|-----------|--------|
| C1 | RLS em todas as tabelas copilot_* | Preventivo | P0 — Crítico | Pendente |
| C2 | Pseudonimização antes do LLM | Preventivo | P0 — Crítico | Pendente |
| C3 | Sem PII no prompt do LLM | Preventivo | P0 — Crítico | Pendente |
| C4 | Criptografia em repouso | Preventivo | P1 — Alto | Supabase por padrão |
| C5 | TLS em trânsito | Preventivo | P1 — Alto | HTTPS obrigatório |
| C6 | Rate limiting de chamadas LLM | Limitador | P1 — Alto | Pendente |
| C7 | Logging de acesso a copilot_messages | Detective | P1 — Alto | Pendente |

---

## 2. C1 — RLS: Row Level Security

```sql
ALTER TABLE copilot_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_insights      ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_suggestions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_contacts      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedor_ve_proprias_conversas" ON copilot_conversations
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "vendedor_ve_proprias_mensagens" ON copilot_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM copilot_conversations WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "gestor_ve_tudo_conversas" ON copilot_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "gestor_ve_tudo_mensagens" ON copilot_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('manager', 'admin')
    )
  );
```

---

## 3. C2 — Pseudonimização antes do LLM

```typescript
// src/copilot/pseudonymizer.ts
const CONTACT_PLACEHOLDER = 'COOPERADO';
const SELLER_PLACEHOLDER = 'VENDEDOR';

export function pseudonymizeConversation(
  messages: ConversationMessage[],
  contact: Contact,
  seller: Seller
): { pseudonymized: ConversationMessage[] } {
  const pseudonymized = messages.map(msg => ({
    ...msg,
    senderName: msg.from === 'contact' ? CONTACT_PLACEHOLDER : SELLER_PLACEHOLDER,
    content: msg.content
      .replace(new RegExp(escapeRegex(contact.name), 'gi'), CONTACT_PLACEHOLDER)
      .replace(new RegExp(escapeRegex(seller.name), 'gi'), SELLER_PLACEHOLDER),
  }));
  return { pseudonymized };
}
```

---

## 4. C3 — Filtro de PII no Prompt

```typescript
// src/copilot/pii-filter.ts
const PII_PATTERNS = [
  { name: 'CPF',     regex: /\b\d{3}[\.\ s]?\d{3}[\.\ s]?\d{3}[-\.\s]?\d{2}\b/g,            replacement: '[CPF_REMOVIDO]' },
  { name: 'CNPJ',    regex: /\b\d{2}[\.\ s]?\d{3}[\.\ s]?\d{3}[\/\s]?\d{4}[-\.\s]?\d{2}\b/g, replacement: '[CNPJ_REMOVIDO]' },
  { name: 'Cartao',  regex: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,                                   replacement: '[CARTAO_REMOVIDO]' },
  { name: 'Tel BR',  regex: /\b(?:\+55\s?)?(?:\(?\d{2}\)?[\s\-]?)(?:9\s?)?\d{4}[\s\-]?\d{4}\b/g, replacement: '[TELEFONE_REMOVIDO]' },
  { name: 'Email',   regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,          replacement: '[EMAIL_REMOVIDO]' },
];

export function sanitizeForLLM(text: string): { sanitized: string; removedCount: number } {
  let sanitized = text;
  let removedCount = 0;
  for (const p of PII_PATTERNS) {
    const matches = sanitized.match(p.regex);
    if (matches) { removedCount += matches.length; sanitized = sanitized.replace(p.regex, p.replacement); }
  }
  return { sanitized, removedCount };
}
```

### Pipeline completo antes de chamar o LLM

```typescript
export async function buildLLMPrompt(conversation, contact, seller) {
  const recentMessages = conversation.messages.slice(-20);
  const { pseudonymized } = pseudonymizeConversation(recentMessages, contact, seller);
  let rawText = pseudonymized.map(m => `${m.senderName}: ${m.content}`).join('\n');
  const { sanitized } = sanitizeForLLM(rawText);
  return `Analise esta conversa e sugira resposta para o VENDEDOR:\n\n${sanitized}`;
}
```

---

## 5. C4 — Criptografia em Repouso

Supabase Cloud usa AES-256 por padrão. Nenhuma configuração adicional necessária.

---

## 6. C5 — TLS em Trânsito

```bash
openssl s_client -connect <projeto>.supabase.co:443 -tls1_2 < /dev/null 2>&1 | grep "Cipher\|Protocol"
```

Forçar HTTPS via Strict-Transport-Security header em todos os endpoints.

---

## 7. C6 — Rate Limiting de Chamadas LLM

```typescript
// Máximo 10 chamadas LLM por minuto por conversa ativa
const MAX_LLM_CALLS_PER_MINUTE = 10;

export async function checkRateLimit(conversationId: string): Promise<boolean> {
  const key = `llm:ratelimit:${conversationId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count <= MAX_LLM_CALLS_PER_MINUTE;
}
```

---

## 8. C7 — Logging de Acesso a `copilot_messages`

```sql
CREATE OR REPLACE FUNCTION get_messages_with_audit(p_conversation_id UUID)
RETURNS SETOF copilot_messages AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO copilot_events (actor_id, conversation_id, event_type, event_data, created_at)
  VALUES (v_user_id, p_conversation_id, 'messages_accessed',
          jsonb_build_object('accessed_by', v_user_id), NOW());
  RETURN QUERY SELECT * FROM copilot_messages
    WHERE conversation_id = p_conversation_id ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Referências

- E022 — RIPD (identificação dos riscos)
- E028 — Trilha de Auditoria
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- LGPD art. 46 — medidas de segurança
