# E026 — DPA dos Fornecedores de IA

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Status:** Rascunho — links de DPA a verificar por Joaquim

---

## 1. Contexto

O Sussurro envia trechos de conversas de WhatsApp para provedores de IA via Lovable Gateway. Isso configura uma transferência internacional de dados pessoais (LGPD art. 33), exigindo garantias adequadas.

---

## 2. Comparativo dos Acordos de Processamento de Dados (DPA)

| Item | Anthropic Claude | OpenAI GPT-4 | Google Gemini |
|------|----------------|-------------|---------------|
| **DPA disponível** | Sim | Sim | Sim |
| **Usa dados para treinar modelo?** | **Não** (API comercial) | **Não** (API comercial) | **Não** (API comercial) |
| **Localização dos servidores** | EUA (AWS us-east-1, us-west-2) | EUA (Microsoft Azure) | Multi-região (EUA + EU opcional) |
| **Subprocessadores listados** | Sim | Sim | Sim |
| **Cláusulas Contratuais Padrão (CCP)** | Sim — incorporadas ao DPA | Sim — disponíveis no DPA | Sim — disponíveis no DPA |
| **Prazo de retenção dos dados de input** | Não retém após processamento | Não retém (opção ZDR disponível) | Não retém após processamento |
| **Adequação à LGPD** | Via CCP (LGPD art. 33, II) | Via CCP (LGPD art. 33, II) | Via CCP (LGPD art. 33, II) |
| **Notificação de incidente** | 72h após ciência | 72h após ciência | 72h após ciência |
| **Recomendação Sussurro** | ⭐ **Preferido** — política mais clara | Alternativa viável | Alternativa viável |

---

## 3. Análise por Fornecedor

### 3.1 Anthropic Claude (Preferido)

- Política de privacidade da API mais direta: prompts não são usados para treinar
- Subprocessadores limitados e listados publicamente
- DPA aceito digitalmente via dashboard (sem assinatura manual para Pay-as-you-go)

**Como aceitar:**
1. Acessar console.anthropic.com
2. Settings → Legal → Data Processing Addendum
3. Aceitar digitalmente (registra timestamp + e-mail do gestor)

### 3.2 OpenAI GPT-4

- DPA disponível e bem estruturado
- Zero Data Retention disponível com contrato Enterprise

### 3.3 Google Gemini (via Vertex AI)

- Melhor opção para multi-região
- DPA mais complexo (ecossistema Google Cloud)

---

## 4. Embasamento Legal para Transferência Internacional

**Base legal:** LGPD art. 33, II — garantias via **Cláusulas Contratuais Padrão (CCP)**.

As CCPs da ANPD estão em elaboração. Enquanto isso, utilizar os modelos da UE (GDPR SCCs) é a prática de mercado aceita pelos especialistas em LGPD.

---

## 5. Ação Obrigatória antes do G1

| Ação | Responsável | Status |
|------|-------------|--------|
| Aceitar DPA da Anthropic digitalmente | Joaquim | ⏳ Pendente |
| Registrar evidência do aceite (screenshot + data) | Joaquim | ⏳ Pendente |
| Guardar cópia do DPA aceito em pasta legal | Joaquim | ⏳ Pendente |

---

## 6. Conclusão

1. **Usar Anthropic como provedor primário** — DPA mais claro, política de retenção zero
2. **Pseudonimizar dados antes de enviar** — ver E029
3. **Nunca enviar CPF, CNPJ, dados bancários** no contexto do LLM
4. **Formalizar o DPA antes de ir a produção** — condição do G1

---

## Referências

- LGPD art. 33 — Transferência Internacional
- E022 — RIPD Simplificado
- E029 — Controles de Segurança Técnica (pseudonimização)
