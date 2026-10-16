# E021 — Mapeamento de Políticas do WhatsApp

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Status:** Rascunho — aguarda revisão G1

---

## 1. Regra da Meta de 15/01/2026

Em 15 de janeiro de 2026, a Meta atualizou a **WhatsApp Business Platform Policy** (anteriormente Business Solution Policy) com as seguintes mudanças relevantes:

- **Proibição de chatbots de uso geral:** contas que utilizem automação para responder mensagens sem intervenção humana significativa estão sujeitas a banimento permanente.
- **Exigência de consentimento ativo:** o usuário final deve ter consentido explicitamente em receber mensagens automatizadas.
- **Regra de "human-in-the-loop":** sistemas de IA devem ter um humano responsável pela decisão final de envio de cada mensagem.
- **Opt-out obrigatório:** qualquer conta comercial deve honrar pedidos de "PARE" ou equivalente em até 24 horas.

Referências:
- https://www.whatsapp.com/legal/business-solution-provider-notice (vigente)
- https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in

---

## 2. Por que o Sussurro é CONFORME

O Sussurro opera no modelo **"IA como copiloto, humano como piloto"**:

| Aspecto | Comportamento do Sussurro | Conformidade |
|---------|--------------------------|----------------|
| Envio de mensagens | **Nunca** — o Sussurro apenas sugere | ✅ Conforme |
| Decisão de resposta | Exclusivamente do vendedor humano | ✅ Conforme |
| Análise da conversa | Em segundo plano, sem acesso ao WhatsApp | ✅ Conforme |
| Apresentação das sugestões | Somente no painel interno do vendedor | ✅ Conforme |

**Fluxo crítico:**

```
Cooperado envia mensagem
        ↓
Evolution API recebe → webhook → Sussurro analisa
        ↓
Sugestão aparece no painel do VENDEDOR
        ↓
Vendedor decide, digita (ou copia) e ENVIA manualmente
        ↓
Evolution API envia a mensagem ENVIADA PELO HUMANO
```

A IA nunca toca no botão de envio. Isso é o que diferencia o Sussurro de um chatbot e o mantém dentro da política da Meta.

---

## 3. Risco Residual — Evolution API (Baileys Unofficial)

A instância `wpp2` usa **Evolution API com Baileys**, que é um cliente não-oficial do WhatsApp. Riscos:

| Risco | Probabilidade | Impacto | Nível |
|-------|-------------|---------|-------|
| Ban do número por automação detectada | Médio | Alto | 🔴 Alto |
| Bloqueio por volume incomum de mensagens | Baixo | Alto | 🟡 Médio |
| Mudança de protocolo pela Meta que quebre a integração | Alto | Alto | 🔴 Alto |
| Suspensão da conta Business pelo uso de API não-oficial | Médio | Crítico | 🔴 Alto |

### Sinais de ban iminente que devem ser monitorados

1. `status: 403` ou `status: 401` persistente nas requisições à Evolution API
2. Mensagens que saem do backend mas não chegam ao destinatário
3. QR Code expirando com frequência incomum (< 24h)
4. Aumento de erros `LinkingError` ou `DisconnectReason.loggedOut`
5. Número sendo listado como "inativo" em verificações externas

---

## 4. Estratégia de Mitigação — ChannelAdapter

Para reduzir o risco de dependência da Evolution API, o Sussurro usa a abstração `ChannelAdapter`:

```typescript
// Contrato da interface — nunca muda
interface ChannelAdapter {
  onMessageReceived(handler: MessageHandler): void;
  sendMessage(to: string, content: MessageContent): Promise<SendResult>;
  getConnectionStatus(): ConnectionStatus;
}

// Implementação atual (arriscada, mas funcional)
class EvolutionAPIAdapter implements ChannelAdapter { ... }

// Implementação futura (sem risco de ban)
class MetaCloudAPIAdapter implements ChannelAdapter { ... }
```

**Benefício:** migrar de Evolution API para Meta Cloud API oficial requer apenas:
1. Implementar `MetaCloudAPIAdapter`
2. Trocar a injeção de dependência na configuração
3. Manter todas as lógicas de sugestão, LGPD e auditoria intactas

A migração para Cloud API é a meta de médio prazo e elimina o risco residual de ban.

---

## 5. Regras de Conteúdo — O que a IA Nunca Pode Sugerir

O sistema de geração de sugestões deve filtrar ativamente os seguintes tipos de conteúdo:

| Categoria | Exemplos | Ação |
|-----------|---------|------|
| SPAM | Mensagens promocionais não solicitadas | Bloquear + logar |
| Enganoso | Promessas de taxa ou prazo falsos | Bloquear + alertar |
| Opt-out ignorado | Qualquer sugestão após o cooperado pedir PARAR | Bloquear hard |
| Pressão indevida | Urgência falsa ("só hoje", "última chance") | Bloquear + logar |
| PII exposta | Mostrar CPF, CNPJ, dados bancários na sugestão | Sanitizar antes |
| Conteúdo sensível | Saúde, política, religião | Bloquear + logar |

### Implementação do filtro

```typescript
// src/copilot/content-filter.ts
export function filterSuggestion(suggestion: string, contact: Contact): FilterResult {
  if (contact.copilot_opted_out) {
    return { allowed: false, reason: 'OPT_OUT_ACTIVE' };
  }
  if (SPAM_PATTERNS.some(p => p.test(suggestion))) {
    return { allowed: false, reason: 'SPAM_DETECTED' };
  }
  // ...demais regras
  return { allowed: true };
}
```

---

## 6. Monitoramento — Detecção de Sinais de Ban Iminente

### Alertas automáticos (implementar no E029)

```sql
-- Exemplo: detectar taxa de falha de envio > 10% na última hora
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) FILTER (WHERE status = 'failed') as falhas,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / COUNT(*), 2) as pct_falha
FROM copilot_events
WHERE event_type = 'message_sent'
  AND created_at > NOW() - INTERVAL '2 hours'
GROUP BY 1
HAVING ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / COUNT(*), 2) > 10;
```

### Plano de resposta a ban

1. **Detecção** (< 5 min): alerta Slack via webhook
2. **Contenção** (< 30 min): ativar número reserva; Sussurro redireciona `wpp2` → `wpp_backup`
3. **Comunicação** (< 2h): notificar vendedores e Joaquim
4. **Recuperação** (< 48h): abrir chamado com a Meta; avaliar antecipação da migração para Cloud API
5. **Post-mortem** (< 7 dias): documentar causa raiz

---

## Referências

- [WhatsApp Business Platform Policy](https://www.whatsapp.com/legal/business-solution-provider-notice)
- [Evolution API Documentation](https://doc.evolution-api.com)
- [Meta Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- E027 — Fluxo de Opt-Out
- E029 — Controles de Segurança Técnica
