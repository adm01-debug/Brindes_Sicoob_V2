# E023 — Mecanismo de Consentimento

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Status:** Rascunho — aguarda aprovação de Joaquim

---

## 1. Modelo de Consentimento Recomendado

O Sussurro utiliza um modelo de **consentimento informado por aviso**, compatível com a base legal de **legítimo interesse** (LGPD art. 7º, IX), complementado por **opt-out simples e imediato**.

Não é necessário consentimento explícito clicado (opt-in) porque:
- A análise é feita internamente, não gera mensagens automáticas
- O benefício ao titular (melhor atendimento) é compatível com suas expectativas
- O opt-out é oferecido ativamente e honrado imediatamente

### Duas camadas de aviso

**Camada 1 — Perfil do WhatsApp Business (permanente)**

Texto a incluir na descrição do perfil da conta WhatsApp Business:

> "Seu atendimento pode ser assistido por IA para melhorar as sugestões ao vendedor. Responda PARAR para não."

**Camada 2 — Mensagem automática na primeira interação**

Enviada automaticamente pelo vendedor (ou via template aprovado pela Meta) na primeira vez que um número entra em contato:

> "Olá! Sou [Nome do vendedor] da Promo Brindes. Para te atender melhor, usamos ferramentas de IA que analisam nossa conversa e sugerem respostas ao vendedor — a IA nunca envia mensagens por conta própria. Se preferir não participar, responda **PARAR** a qualquer momento."

---

## 2. Texto Exato para o WhatsApp Business Profile

```
Promo Brindes — Brindes e Produtos Personalizados
Atendimento assistido por IA. Responda PARAR para não participar.
Site: promobrindes.com.br | LGPD: dpo@promobrindes.com.br
```

> **Nota:** o WhatsApp Business Profile permite até 256 caracteres na descrição. O texto acima tem ~145 caracteres.

---

## 3. Fluxo de Opt-Out

### 3.1 Como o cooperado solicita opt-out

O cooperado envia qualquer uma das seguintes palavras-chave na conversa:
- `PARAR`
- `PARE`
- `NÃO QUERO`
- `CANCELAR`
- `STOP` (inglês, por compatibilidade)

A detecção é **case-insensitive** e **ignora acentos** (ex: "nao quero" também funciona).

### 3.2 O que o vendedor deve fazer ao receber opt-out

O painel do Sussurro exibe automaticamente:

```
⚠️ SOLICITAÇÃO DE OPT-OUT DETECTADA
O cooperado enviou: "PARAR"

Ação necessária:
[✓ Confirmar opt-out e parar análise]
[Ignorar (apenas se for engano evidente)]
```

Ao confirmar, o sistema:
1. Atualiza `copilot_contacts.copilot_opted_out = true`
2. Para imediatamente de processar mensagens dessa conversa
3. Registra o evento em `copilot_events`
4. Exibe badge "⚠️ Opt-out ativo" permanentemente no cabeçalho da conversa

### 3.3 O que o Sussurro faz com conversa em opt-out

```typescript
// src/copilot/message-processor.ts
async function processIncomingMessage(message: Message): Promise<void> {
  const contact = await getContact(message.from);
  
  if (contact?.copilot_opted_out) {
    // HARD BLOCK: não processa, não envia ao LLM, não gera sugestão
    await logEvent({
      type: 'message_skipped_opted_out',
      contact_id: contact.id,
      conversation_id: message.conversation_id,
    });
    return; // saída imediata
  }
  
  // ...processamento normal
}
```

### 3.4 Resposta ao cooperado após opt-out

O vendedor deve enviar (manualmente ou via template):

> "Entendido! A análise de IA foi desativada para sua conversa. Continuarei te atendendo normalmente."

---

## 4. Registro de Consentimento e Opt-Out

### Tabela responsável: `copilot_contacts`

```sql
-- Campo relevante (migração)
ALTER TABLE copilot_contacts 
ADD COLUMN IF NOT EXISTS copilot_opted_out boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS opted_out_at timestamptz,
ADD COLUMN IF NOT EXISTS opted_out_reason text; -- 'keyword_PARAR', 'keyword_STOP', etc.
```

### Tabela de auditoria: `copilot_events`

Cada opt-out gera um registro auditável:

```sql
INSERT INTO copilot_events (
  contact_id,
  event_type,       -- 'opt_out_registered'
  event_data,       -- {"trigger": "PARAR", "confirmed_by": "vendedor_id"}
  created_at,
  channel           -- 'whatsapp'
) VALUES (...);
```

---

## 5. Renovação de Consentimento (re-opt-in)

Se o cooperado desejar voltar a ter atendimento assistido por IA:
- Envia `ATIVAR`, `QUERO` ou `SIM` na conversa
- O vendedor confirma no painel
- `copilot_opted_out` volta para `false`
- Evento registrado em `copilot_events` com tipo `opt_in_restored`

---

## Referências

- LGPD art. 7º (bases legais), art. 8º (consentimento), art. 18 (direitos)
- E022 — RIPD Simplificado
- E027 — Fluxo de Opt-Out (diagrama detalhado)
- E028 — Trilha de Auditoria
