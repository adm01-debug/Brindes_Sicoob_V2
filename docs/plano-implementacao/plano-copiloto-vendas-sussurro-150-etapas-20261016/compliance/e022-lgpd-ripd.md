# E022 — LGPD: Análise de Impacto (RIPD Simplificado)

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Status:** Rascunho — aguarda revisão do Encarregado (DPO)  
**Lei aplicável:** Lei Geral de Proteção de Dados Pessoais — Lei 13.709/2018

---

## 1. Identificação do Tratamento

| Campo | Valor |
|-------|-------|
| Nome do sistema | Copiloto de Vendas Sussurro |
| Controlador | Promo Brindes Ltda. (CNPJ a preencher) |
| Encarregado (DPO) | Joaquim — contato: dpo@promobrindes.com.br |
| Data do RIPD | 2026-10-16 |
| Versão | 1.0 |

---

## 2. Mapeamento de Dados Pessoais

| Dado | Titular | Finalidade | Base Legal (LGPD art. 7º) | Retenção | Risco |
|------|---------|-----------|--------------------------|---------|-------|
| Nome e telefone do cooperado | Cooperado (pessoa física) | Identificação na conversa; personalização da sugestão | Legítimo interesse (art. 7º, IX) / Execução de contrato (art. 7º, V) | 5 anos após último contato | Baixo |
| Conteúdo das mensagens de WhatsApp | Cooperado (pessoa física) | Análise em tempo real pelo LLM para gerar sugestão ao vendedor | Legítimo interesse (art. 7º, IX) | 90 dias (logs raw) | **Alto** — transitam por API externa |
| Insights gerados pela IA | Cooperado (indireto) | Qualificação COOPERA; histórico de interesse | Legítimo interesse (art. 7º, IX) | 180 dias | Médio |
| Histórico de compras | Cooperado | Contexto da sugestão; cross-sell | Execução de contrato (art. 7º, V) | 5 anos | Baixo |
| Score de propensão | Cooperado (derivado) | Priorização de atendimento | Legítimo interesse (art. 7º, IX) | 180 dias | Médio |

---

## 3. Cadeia de Responsabilidade

```
Promo Brindes (CONTROLADOR)
    └── Supabase Cloud / Self-Hosted (OPERADOR — infraestrutura)
    └── Lovable Gateway (OPERADOR — proxy LLM)
         └── Anthropic Claude API (SUB-OPERADOR — processamento LLM)
         └── OpenAI GPT API (SUB-OPERADOR alternativo)
```

**Obrigações do controlador:**
- Celebrar DPA (Acordo de Processamento de Dados) com todos os operadores
- Garantir que operadores cumpram a LGPD
- Manter registro de operações de tratamento (art. 37)

---

## 4. Análise de Risco Específica — Dados Enviados ao LLM

Este é o risco mais relevante do Sussurro do ponto de vista da LGPD.

### O que acontece

1. Cooperado envia mensagem no WhatsApp
2. Evolution API captura via webhook
3. Sussurro monta um `prompt` com histórico da conversa
4. **Esse prompt é enviado à API do provedor de IA (Anthropic/OpenAI)**
5. O LLM retorna uma sugestão
6. A sugestão aparece no painel do vendedor

### Riscos identificados

| Risco | Descrição | Probabilidade | Impacto |
|-------|-----------|-------------|--------|
| R1 | Conteúdo sensível do cooperado exposto ao provedor de IA | Alta (por design) | Alto |
| R2 | Provedor de IA usa dados para retreinar modelo | Baixa (contrato proíbe) | Crítico |
| R3 | Vazamento de dados no provedor de IA | Baixa | Alto |
| R4 | Conteúdo com dados de terceiros (ex: o cooperado cita outra pessoa) | Média | Médio |
| R5 | Transferência internacional sem adequação | Média (EUA sem adequação) | Alto |

### Mitigações obrigatórias

| Mitigação | Descrição | Responsável |
|-----------|-----------|-------------|
| M1 — Pseudonimização | Substituir nome real por "COOPERADO" antes de enviar ao LLM | Backend Sussurro |
| M2 — Sem CPF/CNPJ | Filtrar ativamente CPF, CNPJ, dados bancários do prompt | Backend Sussurro |
| M3 — Minimização | Enviar apenas as últimas N mensagens necessárias | Backend Sussurro |
| M4 — DPA assinado | Formalizar contrato de processamento com Anthropic/OpenAI | Joaquim / Jurídico |
| M5 — Cláusulas contratuais padrão | Embasar transferência internacional em CCPs (LGPD art. 33, VIII) | Joaquim / Jurídico |

---

## 5. Direitos dos Titulares

Os cooperados têm os seguintes direitos conforme LGPD art. 18:

| Direito | Como exercer | Prazo de resposta |
|---------|-------------|------------------|
| Acesso | E-mail para dpo@promobrindes.com.br | 15 dias |
| Correção | Idem | 15 dias |
| Exclusão | Idem ou responder PARAR no WhatsApp | 15 dias |
| Portabilidade | E-mail para DPO | 15 dias |
| Revogação do consentimento | Responder PARAR no WhatsApp | Imediato (processamento cessa em até 24h) |
| Informação sobre compartilhamento | E-mail para DPO | 15 dias |

---

## 6. Conclusão e Recomendações

**Nível de risco geral:** Médio-Alto (principalmente pelo envio de mensagens ao LLM externo)

**Recomendações para antes do G1:**

1. ✅ Implementar pseudonimização (M1) — ver E029
2. ✅ Implementar filtro de PII (M2) — ver E029
3. ⚠️ Formalizar DPA com Anthropic — ver E026
4. ⚠️ Revisar e aprovar aviso de privacidade — ver E025
5. ⚠️ Implementar opt-out funcional — ver E027

---

## Histórico de Revisões

| Versão | Data | Autor | Alteração |
|--------|------|-------|----------|
| 1.0 | 2026-10-16 | Claude Code (Sussurro) | Versão inicial |
