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
-- organization_id é gravado em copilot_conversations na criação (org do
-- vendedor NAQUELE momento) e nunca mais alterado. Vendedor pertencer a
-- múltiplas organizações não pode fazer a conversa "seguir" o vendedor:
-- sem essa coluna, um gestor da organização B veria conversas que o
-- mesmo vendedor teve enquanto atuava pela organização A, só porque os
-- dois compartilham o mesmo seller_id. organization_id trava a conversa
-- na org em que ela de fato aconteceu.
ALTER TABLE copilot_conversations ADD COLUMN organization_id UUID NOT NULL
  REFERENCES organizations(id);

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

-- "gestor vê tudo" na prática só pode ser dentro da própria organização.
-- Escopo pela organization_id GRAVADA NA CONVERSA (não pelas orgs atuais
-- do vendedor): evita que um vendedor multi-org vaze conversas de uma
-- organização para o gestor de outra.
CREATE POLICY "gestor_ve_conversas_da_organizacao" ON copilot_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'supervisor')
    )
    AND organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

CREATE POLICY "gestor_ve_mensagens_da_organizacao" ON copilot_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM copilot_conversations c
      WHERE c.id = copilot_messages.conversation_id
        AND EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'supervisor')
        )
        AND c.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

-- Mesma regra (dono OU gestor/supervisor da organização da conversa) para
-- as demais tabelas copilot_*, que a v1 deste documento deixou sem policy
-- — RLS habilitada sem nenhuma policy nega todo acesso, não só o indevido.
CREATE POLICY "vendedor_ve_proprios_insights" ON copilot_insights
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM copilot_conversations WHERE seller_id = auth.uid())
  );
CREATE POLICY "gestor_ve_insights_da_organizacao" ON copilot_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM copilot_conversations c
      WHERE c.id = copilot_insights.conversation_id
        AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'supervisor'))
        AND c.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "vendedor_ve_proprias_sugestoes" ON copilot_suggestions
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM copilot_conversations WHERE seller_id = auth.uid())
  );
CREATE POLICY "gestor_ve_sugestoes_da_organizacao" ON copilot_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM copilot_conversations c
      WHERE c.id = copilot_suggestions.conversation_id
        AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'supervisor'))
        AND c.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

-- copilot_feedback é a avaliação que o PRÓPRIO vendedor dá à sugestão
-- (não dado do cooperado): escopo direto por quem avaliou, sem depender
-- da conversa já ter sido anonimizada por E024.
CREATE POLICY "vendedor_ve_proprio_feedback" ON copilot_feedback
  FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "gestor_ve_feedback_da_organizacao" ON copilot_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'supervisor'))
    AND seller_id IN (
      SELECT om.user_id FROM organization_members om
      WHERE om.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "vendedor_ve_proprios_contatos" ON copilot_contacts
  FOR SELECT USING (
    id IN (SELECT contact_id FROM copilot_conversations WHERE seller_id = auth.uid())
  );
CREATE POLICY "gestor_ve_contatos_da_organizacao" ON copilot_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM copilot_conversations c
      WHERE c.contact_id = copilot_contacts.id
        AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin', 'supervisor'))
        AND c.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );
```

---

## 3. C2 — Pseudonimização antes do LLM

```typescript
// src/copilot/pseudonymizer.ts
const CONTACT_PLACEHOLDER = 'COOPERADO';
const SELLER_PLACEHOLDER = 'VENDEDOR';

// Nome vazio geraria uma regex vazia (casa em toda posição, inserindo o
// placeholder entre cada caractere) e substituição sem \b troca "Ana" dentro
// de "semana". nameRegex() cobre os dois casos.
function nameRegex(name: string): RegExp | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return new RegExp(`\\b${escapeRegex(trimmed)}\\b`, 'gi');
}

export function pseudonymizeConversation(
  messages: ConversationMessage[],
  contact: Contact,
  seller: Seller
): { pseudonymized: ConversationMessage[] } {
  const contactRe = nameRegex(contact.name);
  const sellerRe = nameRegex(seller.name);
  const pseudonymized = messages.map(msg => {
    let content = msg.content;
    if (contactRe) content = content.replace(contactRe, CONTACT_PLACEHOLDER);
    if (sellerRe) content = content.replace(sellerRe, SELLER_PLACEHOLDER);
    return {
      ...msg,
      senderName: msg.from === 'contact' ? CONTACT_PLACEHOLDER : SELLER_PLACEHOLDER,
      content,
    };
  });
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
  // `\b` antes de "+" nunca casa (+ não é \w); sem ele, o formato compacto do
  // WhatsApp "+5511912345678" passava intacto para o LLM. Lookbehind
  // negativo no lugar do \b inicial permite casar logo após o "+".
  { name: 'Tel BR',  regex: /(?<![\d+])(?:\+55\s?)?(?:\(?\d{2}\)?[\s\-]?)(?:9\s?)?\d{4}[\s\-]?\d{4}\b/g, replacement: '[TELEFONE_REMOVIDO]' },
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
  // INCR + EXPIRE em dois passos deixa uma janela sem TTL se o processo
  // cair entre as duas chamadas: a partir da 11ª chamada a chave fica
  // bloqueada para sempre. Script Lua garante que os dois passos sejam
  // atômicos.
  const count = await redis.eval(
    `local c = redis.call('INCR', KEYS[1])
     if c == 1 then redis.call('EXPIRE', KEYS[1], 60) end
     return c`,
    1,
    key,
  );
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
  -- SECURITY DEFINER ignora a RLS da tabela por padrão: a função precisa
  -- repetir aqui a MESMA regra das policies de copilot_conversations
  -- (dono OU gestor/supervisor da organização em que a conversa
  -- aconteceu), senão (a) qualquer vendedor lê qualquer conversa alheia
  -- passando o UUID, ou (b) um gestor da organização B lê conversas da
  -- organização A só porque checava o papel sem checar a organização.
  IF NOT EXISTS (
    SELECT 1 FROM copilot_conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.seller_id = v_user_id
        OR (
          EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = v_user_id AND role IN ('manager', 'admin', 'supervisor')
          )
          AND c.organization_id IN (SELECT public.get_user_org_ids(v_user_id))
        )
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Acesso negado a esta conversa.';
  END IF;

  INSERT INTO copilot_events (actor_id, conversation_id, event_type, event_data, created_at)
  VALUES (v_user_id, p_conversation_id, 'messages_accessed',
          jsonb_build_object('accessed_by', v_user_id), NOW());
  RETURN QUERY SELECT * FROM copilot_messages
    WHERE conversation_id = p_conversation_id ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION get_messages_with_audit(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_messages_with_audit(UUID) TO authenticated;
```

---

## Referências

- E022 — RIPD (identificação dos riscos)
- E028 — Trilha de Auditoria
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- LGPD art. 46 — medidas de segurança
