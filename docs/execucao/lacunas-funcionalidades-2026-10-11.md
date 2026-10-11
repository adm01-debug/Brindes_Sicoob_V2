# Funcionalidades planejadas e não executadas — auditoria exaustiva de 11/10/2026

> **Referência:** `main` em `dc08200` (merge do PR #98, 08/10/2026). É o mesmo commit publicado em produção na Vercel (`brindes-sicoob-v2`, deploy `dpl_HyKTMmPS6FNk3A1swWBWnWYzQW6q`, estado `READY`).
> **Escopo:** todo o repositório (4.026 arquivos versionados): código (`src/`, `supabase/functions/`, `supabase/migrations/`), testes, CI, scripts, infraestrutura, os ~450 documentos de `docs/` e as memórias `.lovable/`. Também foram consultados o GitHub e a produção, apenas para leitura.
> **Pergunta respondida:** o que foi **planejado** para o sistema — em planos, roadmaps, README, ADRs, inventários, memórias, rotas, menus, tipos, flags, TODOs e schemas — e **não foi executado**: nem iniciado, executado só em parte, simulado ou pronto mas desligado.
> **Anexos:** 10 relatórios detalhados (um por frente de auditoria) em [`lacunas-funcionalidades-2026-10-11/`](lacunas-funcionalidades-2026-10-11/) e o índice completo em planilha [`indice-lacunas.csv`](lacunas-funcionalidades-2026-10-11/indice-lacunas.csv) (682 registros; separador `;`, abre direto no Excel).

---

## Sumário

1. [Conclusão em uma página](#1-conclusão-em-uma-página)
2. [Método, legenda e limites](#2-método-legenda-e-limites)
3. [Estado do ambiente em 11/10/2026](#3-estado-do-ambiente-em-11102026)
4. [Lacunas críticas (P0)](#4-lacunas-críticas-p0)
5. [Lacunas graves (P1), consolidadas por tema](#5-lacunas-graves-p1-consolidadas-por-tema)
6. [Mapa por módulo e funcionalidade](#6-mapa-por-módulo-e-funcionalidade)
7. [Situação de cada plano do repositório](#7-situação-de-cada-plano-do-repositório)
8. [Decisões de negócio que só a diretoria destrava](#8-decisões-de-negócio-que-só-a-diretoria-destrava)
9. [Código pronto e desligado (órfão)](#9-código-pronto-e-desligado-órfão)
10. [Documentação que afirma o que o código não faz](#10-documentação-que-afirma-o-que-o-código-não-faz)
11. [Backlog recomendado em ondas](#11-backlog-recomendado-em-ondas)
12. [Confirmações pendentes no banco ao vivo](#12-confirmações-pendentes-no-banco-ao-vivo)
13. [Índice dos anexos](#13-índice-dos-anexos)

---

## 1. Conclusão em uma página

**O portal não está pronto para operar uma compra real de ponta a ponta.** O saneamento de 08/10 deixou o código tecnicamente limpo: TypeScript com 0 diagnósticos, ESLint com 0 erros, 5.705 testes aprovados e build verde. Funcionalmente, porém, o que foi planejado ainda tem lacunas em todas as camadas. As mais graves ficam justamente na jornada que gera receita: **orçamento → aprovação → pedido → arte/documentos → entrega → conciliação**.

O que isso significa para o negócio, em ordem de gravidade:

1. **A conversão de orçamento em pedido Sicoob e a aprovação pelo link público devem falhar no banco.** Uma trava de segurança criada em 27/09 bloqueia a mudança de status do orçamento, e as duas funções criadas antes dela não sabem liberar essa trava. Conferido na leitura das migrations; falta reproduzir no banco ao vivo (ver §12). → [C-01, C-02](#4-lacunas-críticas-p0)
2. **A verba de um PA pode ser lida e alterada por gestores de outras cooperativas**, e o gerente do PA consegue alterar a própria verba. → [C-03](#4-lacunas-críticas-p0)
3. **O vendedor não chega ao PDF da proposta nem ao link de aprovação.** A tela completa existe, mas nenhum botão leva até ela. O "Copiar link" e o "WhatsApp" mandam ao cliente um endereço interno que exige login. → [C-05](#4-lacunas-críticas-p0)
4. **Nota fiscal, comprovante de entrega e arte não entram no sistema.** O antivírus obrigatório nunca foi contratado nem configurado, então todo envio é recusado (HTTP 503). → [C-06](#4-lacunas-críticas-p0)
5. **Várias telas mostram números inventados como se fossem reais:**
   - BI do cliente (LTV, saúde da conta, risco de churn);
   - "Tendências", que abre em modo demonstração para todos;
   - "Gestão de Compras" (12 pendentes, 85% de SLA, R$ 450 mil);
   - selos de "Best-Seller";
   - verba presumida de R$ 50 mil;
   - prazo de entrega "1–3 dias".
   → [C-07](#4-lacunas-críticas-p0)
6. **Nenhum e-mail transacional sai.** A função de e-mail responde "não implementado" (501), as notificações multicanal só gravam log e 12 rotinas "agendadas" nunca foram agendadas: relatórios, lembretes, alertas de preço e monitor de erros. → [G-01, G-02](#5-lacunas-graves-p1-consolidadas-por-tema)
7. **As telas de cadastro de produtos, fornecedores e gravação não salvam nada.** Todas recebem "catálogo somente leitura" (403). A gestão completa de catálogo, com cerca de 19 mil linhas, está desligada do menu. → [G-03](#5-lacunas-graves-p1-consolidadas-por-tema)
8. **O controle financeiro da verba não existe além de "total" e "consumido":** não há reserva, fechamento de mês nem conciliação, e o pedido de aumento de limite nunca chega a ninguém. → [G-04](#5-lacunas-graves-p1-consolidadas-por-tema)
9. **Código entra em produção sem nenhum portão.** A `main` não exige checks; o CI nem chegou a iniciar no merge do PR #98 (`startup_failure`); o E2E passou 2 vezes em 677 execuções; a Vercel publica direto. → [C-08](#4-lacunas-críticas-p0)
10. **A operação está "cega" e sem rede de segurança:** Sentry inativo, nenhum alerta ligado, backup nunca testado, sem ambiente de homologação, e o E2E roda contra o banco de produção. → [G-10, G-11](#5-lacunas-graves-p1-consolidadas-por-tema)

### Números da auditoria

| Medida | Valor |
|---|---:|
| Registros de lacuna levantados (10 frentes) | **682** |
| Lacunas críticas consolidadas (P0) | **9** temas, 20 registros |
| Lacunas graves (P1) | 152 registros, consolidados em **17** temas |
| Lacunas médias e baixas (P2/P3) | 314 + 196 registros |
| Planos formais auditados | 9 planos/roteiros + 6 revisões |
| Etapas do plano mais recente (encerramento, 100 etapas) concluídas tecnicamente | **8 de 100**, nenhuma com aceite formal |
| Arquivos de `src/` inalcançáveis a partir de `main.tsx` | **365** (cerca de 27,5 mil linhas só no admin) |
| Rotas sem nenhum ponto de entrada na navegação | **35** de 126 |
| Links internos para rotas que não existem | **18** |
| Edge Functions sem nenhum chamador | **26** de 106 fontes; projeto no limite de 100 publicadas |
| Tabelas/views do banco sem nenhum uso no código | **33** (mais 36 funções SQL sem chamador) |
| Migrations no repositório que nunca chegaram ao banco | **35** com efeito ausente (31 tabelas); 491 divergências de ledger no total |

**Por status (682 registros):**

| Status | Registros | O que significa |
|---|---:|---|
| PARCIAL | 266 | Parte existe; falta uma camada (tela, servidor, regra, teste ou ligação) |
| NAO_INICIADA | 124 | Planejado sem nenhum código correspondente |
| ORFA | 115 | Código pronto, mas desligado: sem rota, sem import, sem chamador ou com flag sem efeito |
| BLOQUEADA_EXTERNA | 81 | Depende de credencial, contrato, decisão de negócio ou operação real |
| STUB/MOCK | 80 | Existe na tela, mas com dado falso, valor fixo, "em breve" ou botão sem ação |
| DOC_DIVERGENTE | 16 | O documento afirma algo pronto que o código não sustenta |

**Por prioridade e esforço:**

| | P0 | P1 | P2 | P3 | Total |
|---|---:|---:|---:|---:|---:|
| Registros | 20 | 152 | 314 | 196 | 682 |

| Esforço | P (< 1 dia) | M (1–5 dias) | G (> 5 dias) |
|---|---:|---:|---:|
| Registros | 339 | 277 | 66 |

> **Leitura correta dos números:** 682 é o número de **registros**, não de problemas distintos. Cada frente auditou uma fatia do repositório, e o mesmo problema pode aparecer em mais de uma frente. O cadastro de catálogo que não salva, por exemplo, aparece em 6 anexos. As seções 4 e 5 consolidam os registros em temas únicos. Metade dos registros (339) tem esforço pequeno: muita coisa é ligação, link ou rota que falta, não funcionalidade a construir do zero.

---

## 2. Método, legenda e limites

### Como foi feito

A auditoria foi dividida em 10 frentes paralelas. Cada uma leu sua fatia inteira e conferiu **cada promessa contra o código atual** (`dc08200`), sem aceitar o status registrado nos documentos antigos. Cada registro traz a origem do plano (arquivo:linha), a evidência no código (arquivo:linha ou busca sem resultado), o que falta, o impacto, o esforço e a prioridade.

| # | Frente | Fatia | Registros |
|---|---|---|---:|
| 01 | Plano de encerramento | `plano-encerramento-100-etapas-20261001/`, matriz-150, workflows-100, fechamento de 08/10, auditoria de 02/10, decisões pendentes | 107 |
| 02 | Plano original e pesquisa | `plano-100-etapas.md` (1.000 subetapas), revisões de 11–12/09, dossiê, benchmark Promo Gifts V4 (32 melhorias), backlog (42 itens) | 63 |
| 03 | Planos intermediários | melhorias-50, reconciliação-50, correções-50, workflows-100, roadmap 05, auditorias e revisões de setembro | 65 |
| 04 | Documentação funcional | README, inventários de funcionalidades, ROUTES, API, notificações, observabilidade, SLO, DR, go-live, segurança, ADRs, runbooks, `.lovable/memory` | 64 |
| 05 | Frontend núcleo | rotas, páginas, catálogo, produto, busca, carrinho, orçamento, pedidos, kits, simulador, auth, PWA | 80 |
| 06 | Admin, BI e IA | `components/admin` (295 arquivos), `pages/admin` (72), BI, inteligência, Magic Up, mockup, Flow, voz | 57 |
| 07 | Edge Functions e integrações | 106 funções, segredos, webhooks, Bitrix, n8n, e-mail, IA | 56 |
| 08 | Banco e migrations | 577 migrations, tipos gerados, ledger, cron, RLS, tabelas e RPCs órfãs | 42 |
| 09 | Fluxos de negócio Sicoob | hierarquia, papéis, verba, aprovação, arte, documentos, logística, 17 fluxos camada a camada | 82 |
| 10 | Testes, CI e infraestrutura | testes, E2E, 13 workflows, scripts, infra, branch protection, DR | 66 |

O orquestrador conferiu pessoalmente os achados P0 e os de maior risco, marcados com ✔ nas tabelas. Também consultou a produção (Vercel), os checks do GitHub no commit `dc08200` e a publicação de cada Edge Function, por pré-requisição `OPTIONS`, sem executar nenhuma.

### Legenda

- **Status:** `NAO_INICIADA` · `PARCIAL` · `STUB/MOCK` · `ORFA` · `BLOQUEADA_EXTERNA` · `DOC_DIVERGENTE` (definições na tabela da §1).
- **Prioridade:**
  - **P0:** bloqueia venda, operação ou segurança.
  - **P1:** compromete uma jornada principal ou a confiança no dado.
  - **P2:** funcionalidade planejada relevante.
  - **P3:** acabamento ou dívida.
- **Esforço:** **P**, menos de 1 dia · **M**, 1 a 5 dias · **G**, mais de 5 dias, sempre para quem conhece o código.
- **IDs:** o prefixo indica o anexo: `PLA` (01), `PLB` (02), `PLC` (03), `DOC` (04), `FE` (05), `ADM` (06), `EDG` (07), `DB` (08), `SIC` (09), `QA` (10).

### Limites

1. **Banco ao vivo inacessível.** O conector administrativo do Supabase `cfmzkthhgliqelozlmwu` respondeu `401 Invalid access token` durante toda a sessão, o mesmo bloqueio registrado em 01/10.
   - A análise do banco usou as migrations versionadas e o snapshot de inventário de 08/10 (`scripts/db/.inventory-cache.json`, que o fechamento técnico declara idêntico ao banco).
   - Ficaram sem conferência ao vivo: cron jobs (`cron.job`), segredos das Edge Functions, publicação realtime, triggers e o efeito real das funções.
   - Os pontos que dependem dessa conferência estão listados na §12.
2. **"Concluído" significa código existente e ligado no repositório,** não aceite formal nem uso real. Nenhuma etapa dos planos tem responsável nominal, revisor ou data de aceite.
3. As APIs de proteção de branch e de segredos do GitHub responderam 403 em parte das consultas. Quando houve dados, eles foram usados (rulesets `[]`, `enforcement_level=off`).

---

## 3. Estado do ambiente em 11/10/2026

| Item | Situação | Evidência |
|---|---|---|
| Frontend em produção | ✔ Commit `dc08200` publicado em `https://brindes-sicoob-v2.vercel.app` ("Brindes SICOOB", aponta para `cfmzkthhgliqelozlmwu`) | Vercel, deploy `dpl_HyKTMmPS6FNk3A1swWBWnWYzQW6q` |
| URL de produção nos documentos | ✔ README e DEPLOYMENT citam `criar-together-now.lovable.app`, que hoje serve outro produto ("Promo Gifts") | `curl` na URL; PLC-03 |
| CI no merge do PR #98 | ✔ **Não executou.** O push na `main` terminou em `startup_failure` (run 37775844412). Nenhum check de `ci.yml`, `sicoob-ci.yml`, `codeql.yml` ou `security.yml` rodou no commit em produção | API de check-runs do commit; QA-38, PLC-01 |
| Integração Supabase × GitHub | ✔ Falhou no `dc08200`: `cannot change return type of existing function cleanup_old_notifications` (migration antiga `004_notification_functions.sql` reaplicada). Dois checks seguem "em andamento" desde 08/10 | Check "Supabase Preview" |
| SonarCloud | ✔ Análise falhou (cancelada) no `dc08200` | Check "SonarCloud Code Analysis" |
| Rotinas agendadas do GitHub | Executam: "Migration ledger drift" diário (sucesso) e "Enterprise Compliance" (sucesso) | Runs agendados |
| Edge Functions publicadas | ✔ **98 publicadas** (97 respondem 200 e 1 responde 204 na pré-requisição). **6 não publicadas** por decisão: `e2e-auth-test`, `error-monitor`, `generate-mockup-nanobanana`, `migrate-helper`, `qa-block-monitor`, `sicoob-seed-debug`. **2 publicadas e desativadas** (410): `cleanup-novelties`, `product-webhook` | `OPTIONS` em `/functions/v1/<nome>` |
| Proteção da `main` | Sem status check obrigatório (`enforcement_level=off`), `enforce_admins=false`, nenhum ruleset, CODEOWNER único | QA-56, QA-57, PLA-T019 |
| Cabeçalhos de segurança | A raiz `/` é servida sem CSP e sem `nosniff`; só `/login` e `/index.html` recebem a CSP | PLC-39, PLA-T095 |
| Sentry | O chunk publicado `sentry-*.js` tem 78 bytes de funções vazias: inativo | PLC-34 |
| Issues abertas | Nenhuma. PRs abertos: #94, #97, #99, #100, #101 | GitHub |

---

## 4. Lacunas críticas (P0)

Nove temas consolidam os 20 registros P0. Os marcados com ✔ foram reconferidos pelo orquestrador no código.

| # | Lacuna | Efeito no negócio | Evidência principal | Registros | Esforço |
|---|---|---|---|---|---|
| **C-01** | ✔ **Conversão de orçamento em pedido Sicoob barrada pela trava de governança** | O orçamento aprovado não vira pedido; a venda trava no último passo | `convert_quote_to_sicoob_order` (`20260922224500_convert_quote_to_sicoob_order.sql:250-251`) faz `UPDATE quotes SET status='converted'` sem `set_config('app.quote_governance_write','true')`. O trigger `aaa_guard_quote_governance_write` (`20260927171216_quote_approval_security_hardening.sql:88-131`), criado depois, recusa com 42501 qualquer mudança de status sem essa liberação. Nenhuma migration posterior redefine a conversão. Chamada por `src/services/OrderService.ts` | SIC-040 | P |
| **C-02** | ✔ **Resposta do cliente pelo link público barrada pela mesma trava** | O cliente clica em "aprovar" e recebe erro; a assinatura é perdida | `apply_local_quote_approval_response` (`20260922225000_secure_public_quote_approval.sql:260-262`) altera `quotes.status` sem a liberação. O E2E só testa token inválido, e o simulador SQL não aplica o guard. Além disso, a observação do cliente é descartada (EDG-29) | SIC-060, EDG-29 | P |
| **C-03** | ✔ **Verba do PA exposta entre cooperativas e alterável pelo próprio PA** | Um gestor de compras de uma cooperativa lê e altera a verba de todas; o gerente do PA aumenta a própria verba e alçada | `pa_budgets_select/insert/update` usam `is_gestor_compras()` sem filtro de cooperativa (`20260502143127_….sql:192-198`). `pa_budgets_gerente_update` libera UPDATE de todas as colunas ao gerente do próprio PA (`20260502143725_….sql:82-88`). A consolidação de 07/10 (`20261007233000`) declara "sem ampliar o acesso" e preserva a união (OR) das policies permissivas, inclusive essas. Nenhum `DROP POLICY` posterior | SIC-021, SIC-140 | P |
| **C-04** | **Orçamento aprovado não congela itens nem valores, e o servidor aceita preços do navegador** | Depois da aprovação da Singular, itens e valores podem mudar antes da conversão; preço unitário e custo de personalização vêm do cliente | RLS `FOR ALL` em `quote_items` e personalizações sem filtro de status (`20260426101255:35-49`); `save_quote_atomic` usa `unit_price`, `unit_cost` e `personalizations.total_cost` recebidos (`20261002160000:82-113`); `total_cost` não é conferido com `setup + unitário × qtd` | SIC-041, SIC-053, PLA-T037 | M |
| **C-05** | ✔ **O vendedor não chega ao PDF, ao link de aprovação nem às versões** | A proposta não sai para o cliente pelo caminho natural; o cliente recebe um link que pede login | `/orcamentos/:id` usa `QuoteDetailPage` (reduzida); a página completa `QuoteViewPage` está em `/orcamentos/:id/visualizar` (`src/routes/config/quotes.ts:38-48`), e nenhum link aponta para ela. Lista e Kanban mandam "gerar o PDF no detalhe". "Copiar link" e "WhatsApp" montam `${origin}/orcamentos/${id}`, a URL interna (`QuoteRowQuickActions.tsx:33-43`) | FE-001, DOC-01, DOC-02 | P |
| **C-06** | **Antivírus de documentos nunca configurado: NF, comprovante e arte não entram** | O fluxo financeiro e logístico do pedido Sicoob não fecha; pedido sem arte aprovada não vai para produção | `sicoob-document-ingest` recusa tudo com 503 sem `SICOOB_MALWARE_SCANNER_URL/TOKEN` (`scanner.ts:24-26`). O parecer do scanner não é correlacionado ao hash do arquivo (`:52-59`). A arte é enviada direto ao armazenamento, sem quarentena (SIC-072). `secure-upload` não varre de fato (EDG-34) | PLA-T075, PLC-40, EDG-28, SIC-100, SIC-072, ADM-23, EDG-34 | M (+ contrato) |
| **C-07** | ✔ **Números inventados apresentados como reais** | Decisões comerciais e de compra tomadas sobre dados falsos; perda de credibilidade com a cooperativa | ✔ Tendências com demo ligada por padrão (`src/pages/trends/is-demo-mode.ts`: "Demo ligado por padrão"). Os demais casos estão na lista logo abaixo | ADM-34, ADM-43, FE-140, FE-030, SIC-042, FE-095, FE-100, PLB-34, PLB-04, ADM-35, FE-090, FE-081 | M |
| **C-08** | ✔ **Nada impede código quebrado de ir para produção** | Qualquer merge publica direto; o commit hoje em produção não passou por CI | `main` sem checks obrigatórios e sem ruleset; CI com `startup_failure` no `dc08200`; E2E com 2 execuções verdes em 677 (a última em 12/09); a Vercel publica a `main` sem gate | PLC-01, PLC-02, PLC-03, QA-38, QA-56, QA-57, QA-11, PLA-T019, DOC-38 | P (configuração) + M |
| **C-09** | **Piloto, compra real e regras institucionais sem decisão** | O sistema não pode operar com cooperativa real | Faltam: políticas por cooperativa (alçada, cotação, arte, cancelamento, calendário); dados comerciais (SLA, origem de preço, estoque e prazo, tributo, frete, pagamento); credencial somente leitura certificada no catálogo mestre; homologação, piloto, primeira compra e segunda cooperativa | PLA-T098, PLB-56, PLB-58, PLB-59, PLB-60 | Decisão |

Casos de números inventados reunidos em C-07:
- BI 360 calcula LTV, Health Score, churn, briefing e respostas do Copilot sobre `MOCK_CLIENT_STATS` quando o cliente não tem pedidos ou uma RPC falha; só 1 de cerca de 8 painéis avisa (`src/hooks/bi/useClientBI.ts:52-82,124`).
- `/gestor/compras` exibe 12 pendentes, 85% de SLA, R$ 450 mil orçado e R$ 380 mil aprovado fixos, e o botão "Aprovação em Lote" não faz nada.
- Selos "Best-Seller" e "Últimas Unidades" saem de dados mock quando as materialized views estão vazias.
- A verba presumida é de R$ 50.000 quando a PA não tem verba configurada.
- O prazo "1–3 dias / 5–10 dias" do comparador é calculado a partir do status de estoque.
- A notificação de "pico sazonal" é gerada por sazonalidade simulada.
- O painel financeiro do pedido usa margem fixa de 32%, e o limite de desconto aparece fixo em 10%.

---

## 5. Lacunas graves (P1), consolidadas por tema

Os 152 registros P1 se agrupam nos 17 temas abaixo (alguns têm registros P2/P3 associados).

### G-01 — E-mails e notificações: nada sai do portal além do aviso de alçada

| Lacuna | Status | Registros |
|---|---|---|
| `send-transactional-email` responde **501 "ainda não implementado"**. O cliente não recebe e-mail de orçamento enviado, aprovado ou recusado, nem de pedido criado ou mudança de status. O `OrderService` engole o erro | STUB/MOCK | EDG-20, FE-086, DOC-28 |
| `send-notification` (multicanal) não envia e-mail, SMS, WhatsApp nem push. Grava log falso de "push success" e não tem nenhum chamador. Com "Não perturbe" ou "Resumo" ligados, a notificação vai para tabelas sem consumidor e se perde | STUB/MOCK / ORFA | DOC-27, DB-22, ADM-27, EDG-22, EDG-23, DB-23, DB-24, ADM-28 |
| Preferências de notificação do usuário (canais, Não Perturbe, resumo) sem efeito | ORFA | ADM-27 |
| Envio real pelo Resend (aprovações Sicoob e código do step-up) e pelo Slack nunca homologado. `RESEND_API_KEY` e `NOTIFICATION_FROM_EMAIL` estão "não verificados" | BLOQUEADA_EXTERNA | EDG-21, SIC-112, PLC-41, PLA-T048, PLA-T050 |
| O link do e-mail ou Slack de alçada leva o aprovador a `/admin/sicoob`, tela proibida ao gestor | PARCIAL | SIC-111 |
| A decisão da Singular não notifica o PA; eventos de arte, documento, remessa e avaria não notificam ninguém; notificações de desconto e comentário são gravadas pelo navegador | PARCIAL / NAO_INICIADA | SIC-110, SIC-113, SIC-114, PLB-50 |
| Web Push, SMS, WhatsApp Business (envio do link de aprovação) | NAO_INICIADA | DOC-23, FE-150, QA-28, PLC-44, DB-23 |
| Convite institucional sem e-mail: depende de conta criada pelo admin | PARCIAL | SIC-016 |

### G-02 — Rotinas "agendadas" que nunca foram agendadas

13 funções classificadas como rotina de servidor no manifesto (`_shared/edge-authz-manifest.ts:92-115`, quase todas rotuladas "pg_cron") **não têm `cron.schedule` em nenhuma migration nem chamador**. Só 3 têm cron versionado: `connections-auto-test`, `process-batch-export` e `sicoob-approval-notifications`.

| Rotina planejada | Consequência | Registros |
|---|---|---|
| Relatórios agendados (`ScheduledReportsManager` deixa o usuário agendar) | O usuário agenda e nada chega. Sem Resend, a função só registra "Would send" | EDG-24, DB-40, FE-151, PLC-29 |
| Lembrete de follow-up de orçamento parado | Marca "enviado" sem enviar | EDG-25, DB-40 |
| Alertas de queda de preço (favoritos e coleções) | Nunca disparam. Além disso, consultam a tabela `products`, que não existe no banco canônico | DB-05, FE-061, EDG-07 |
| Resumo (digest) de notificações | Nunca enviado | EDG-22 |
| Relatório mensal de performance e alertas por SMS | Inexistentes | DOC-34 |
| Saúde de conexões, incidentes de conectores, auditoria de órfãos (`ownership-audit`) | O botão "Executar auditoria agora" sempre falha: exige segredo interno que o navegador não tem | DOC-30, EDG-42 |
| Monitor de erros (`error-monitor`) | Não publicado nem agendado; sem substituto | QA-62, EDG-43 |
| Job `cleanup-security-logs-daily` exigido pelos checks de hardening | Foi agendado com outro nome (`cleanup-security-logs`). O painel de segurança mostra falha permanente e dispara alerta diário | DB-32 |
| Limpeza diária do cache de inteligência de mercado | Não agendada | DOC-25, DB-37 |

### G-03 — Cadastro de catálogo no admin: nada salva, e a gestão completa está desligada

| Lacuna | Status | Registros |
|---|---|---|
| Cadastro de produto (individual e em massa), fornecedores, mídia, variantes, kits, técnicas e gravação gravam no catálogo externo. A ponte recusa toda escrita com `CATALOG_READ_ONLY` (403). São cerca de 75 a 81 pontos de escrita | STUB/MOCK | ADM-02, PLC-47, EDG-05, DOC-20, PLA-X01 |
| O menu "Cadastros › Produtos/Fornecedores/Gravação" abre o formulário simples `ProductRegistrationPage`, que ignora `?tab=`. A gestão completa (`AdminCadastrosPage` + 112 arquivos, cerca de 19 mil linhas) está órfã | ORFA | ADM-01, FE-005 |
| Falta a **decisão** de onde o catálogo é mantido: no sistema de origem, com a tela removida, ou por um canal de escrita autorizado | BLOQUEADA_EXTERNA | PLC-46, PLB-59, SIC-033 |

### G-04 — Verba, alçada e ciclo financeiro incompletos

| Lacuna | Status | Registros |
|---|---|---|
| A verba só é checada no navegador na etapa de orçamento. O servidor só cobra na confirmação do pedido, então a Singular pode aprovar acima do saldo do PA | PARCIAL | SIC-020, PLA-T056 |
| Sem estados planejado, reservado e comprometido; sem fechamento de competência; sem livro de eventos. Um estorno pode reescrever mês fechado | NAO_INICIADA / PARCIAL | SIC-022, PLB-32, PLA-T087, PLA-T088 |
| Sem conciliação proposta × entrega × NF × pagamento. A view `sicoob_budget_audit` não tem tela | NAO_INICIADA | PLB-43, DB-19, SIC-029, PLC-51, ADM-09 |
| Pedido de aumento de limite: o PA grava em `limit_increase_requests`, a RLS exige o papel inexistente `gestor_pa`, e nenhuma tela ou RPC decide. O PA nunca recebe resposta | ORFA | PLB-33, SIC-024 |
| Alçadas configuráveis na tela que o servidor ignora; alçada de "Diretoria" sem papel próprio; flag "Validação de Verbas (PAC)" sem leitor | PARCIAL / ORFA | SIC-026, SIC-062, PLA-X04, FE-092, ADM-19 |
| Verba por cooperativa (`cooperativa_budgets`) e `check_budget_availability` órfãs; remanejamento entre PAs não existe; centro de custo e rateio não existem | ORFA / NAO_INICIADA | SIC-025, DB-19, SIC-027, PLB-29 |
| `budgetService.updateBudget` ainda grava consumo absoluto pelo navegador (órfão, mas exposto) | ORFA | SIC-023, PLA-X03 |
| Indicadores de verba com competência errada e valor fixo | STUB/MOCK | SIC-028 |

### G-05 — Papéis, vínculos e acesso no portal Sicoob

| Lacuna | Status | Registros |
|---|---|---|
| A aba "Vínculos" de `/admin/sicoob` grava em `profiles.role` os papéis `gestor_singular` e `gestor_pa`, que não existem em `app_role`, e não toca `user_roles`: **não concede acesso** | STUB/MOCK | SIC-010 |
| Duas fontes de verdade para papel; vocabulário legado em código e RLS; seed e login de teste com papéis inexistentes | PARCIAL | SIC-011, SIC-012, SIC-013, DOC-55 |
| O gestor da Singular não acessa verba, delegação e alertas do próprio escopo (restritos a supervisor) | PARCIAL | SIC-017, SIC-063 |
| Papel e visão da Central (consolidado das Singulares) não existem; as telas de Centrais, Singulares e PAs estão órfãs | NAO_INICIADA / ORFA | SIC-001, SIC-002, ADM-05, FE-006 |
| A sidebar ignora o RBAC Sicoob (itens levam a 403; o gestor não vê o próprio painel); admin e supervisor caem em "acesso negado" logo após o login (`/admin/telemetria` é rota de dev) | PARCIAL | FE-010, FE-012 |
| Múltiplos vínculos e contexto ativo (cooperativa/PA) visível | NAO_INICIADA | SIC-015, PLB-47 |
| Comprador vê ferramentas de vendedor e simulação de margem | PARCIAL | PLB-48 |

### G-06 — Navegação quebrada: links e menus para páginas que não existem

| Destino quebrado | Onde aparece | Registros |
|---|---|---|
| ✔ `/kit-builder` (a rota real é `/montar-kit`) | Selo "Monte seu Kit" em **todo card de produto**, quick view e detalhe | FE-002 |
| ✔ `/catalogo` e `/catalogo?busca=` | "Explorar Catálogo" em `/pedidos`, palette ⌘K, cards de Inteligência, painel do PA, Kanban, painel do vendedor | FE-003, ADM-15 |
| `/ajuda` (Central de Ajuda), item "Ajuda" do menu do usuário | Menu e rodapé | FE-008, PLB-49, DOC-52 |
| `/instalar` ("Instalar App") | PWA | DOC-51, FE-170 |
| `/admin/newsletter`, `/admin/campanhas`, `/admin/qa/release-evidences`, `/admin/seguranca/rls` | Sidebar do admin (as páginas existem e não estão roteadas) | FE-004, ADM-03, ADM-04, PLB-14 |
| `/admin/descontos`, `/bi`, `/admin` pós-MFA, "Promover Agente" | Widgets e busca global | ADM-15, ADM-06 |
| Resultado "Cliente" da busca global; link de carrinho compartilhado; `/carrinhos/novo` | Busca e carrinho | FE-041, FE-015 |
| 35 rotas sem nenhum ponto de entrada; 20+ páginas prontas sem rota | — | FE-009, FE-016, ADM-11, DOC-50, PLC-49 |

### G-07 — Fluxos que perdem dados entre telas

| Lacuna | Registros |
|---|---|
| Coleção → Orçamento, Simulador → Orçamento, Tendências → Orçamento e BI "Criar orçamento com sugestões" abrem o construtor **vazio**: o `state`, o `?produto=`, o `clientId` e os `productIds` não são lidos | FE-060, FE-087, ADM-38 |
| Filtros Técnica, Destaques, Novidades, Com personalização, Tags e Tamanhos aparecem e contam como ativos, mas **não filtram** em `/filtros`. Em `/` também são ignorados Público-alvo, Datas, Endomarketing, Ramo e Kit | FE-020, FE-022, FE-021 |
| ✔ Salvar kit completo grava `status: 'complete'` (`useCustomKitPersistence.ts:63`), que o trigger recusa (aceita `draft`, `ready`, `shared`, `archived`). O ciclo pronto/compartilhado/arquivado nunca é produzido | FE-110 |
| "Visualizar com Logo" não pré-seleciona o produto no gerador de mockup | FE-131 |
| Simulador, aba "Por Tiragem": preço do produto e seleção ignorados | FE-120 |
| Aviso de "preço estimado" do simulador (`SimulationPriceSourceBadge`) não aparece em nenhuma tela: o vendedor pode fechar orçamento com preço heurístico | DOC-24 |

### G-08 — Segurança de borda e de acesso

| Lacuna | Status | Registros |
|---|---|---|
| A raiz `/` é servida sem CSP e sem `nosniff` (a regra de `vercel.json:11` não cobre `/`); `script-src` com `'unsafe-inline'` | PARCIAL | PLC-39, PLA-T095 |
| Limitação de taxa em só 23 de 108 funções (19 via `bot-protection`, 7 via `rate-limiter`, com sobreposição; os anexos 01 e 03 usam critérios diferentes e citam 7 e 21); RPCs públicas do PostgREST sem limite | PARCIAL | PLC-38, PLA-T095 |
| ✔ `verify-email` é publicada, pública e sem chamador: confirma o e-mail de **qualquer conta** sabendo só o UUID (`supabase/functions/verify-email/index.ts:41-53`) | ORFA | EDG-32 |
| Quatro funções de IA sem validação de JWT no handler (`bi-copilot`, `comparison-ai-advisor`, `kit-ai-builder`, `kit-identity-suggest`) | PARCIAL | EDG-03 |
| A restrição por IP/geolocalização roda no navegador, depois do login, e libera o acesso quando falha | PARCIAL | DOC-05, FE-195 |
| Webhooks de saída nunca entregues (trigger e cron chamam `webhook-dispatcher` sem `x-sicoob-internal-secret`); segredos HMAC cadastrados na UI não chegam às funções (saída sem assinatura, entrada sempre 401) | PARCIAL | EDG-15, EDG-16, EDG-19 |
| Configuração do Auth sem prova versionada (cadastro público desligado, HIBP no servidor, verificação de e-mail); `AuthContext` expõe `signUp` | BLOQUEADA_EXTERNA | DOC-06 |
| Pós-incidente `migrate-helper` (service role exposta): rotação de chaves e revisão de logs sem evidência | BLOQUEADA_EXTERNA | DOC-42, PLC-33, QA-37 |
| Trilhas de auditoria prontas e nunca ligadas: acesso a dado sensível (LGPD, `sensitive_access_logs`) e ações do orçamento (`quote_audit_logs`/`log_quote_action`) | NAO_INICIADA / ORFA | DB-26, DB-09 |
| Atendimento a titular (LGPD), retenção e descarte de anexos | BLOQUEADA_EXTERNA / NAO_INICIADA | PLB-63, SIC-101, PLA-T076, DB-41 |
| Criptografia de PII no cliente órfã, com segredo público | ORFA | FE-182 |
| Login por passkey exposto na UI, mas desativado (hook com retorno fixo, sem `webauthn-challenge`) | STUB/MOCK | PLC-48, DOC-13, ADM-20, EDG-33, DB-30 |

### G-09 — Inteligência artificial e voz dependem de credenciais não confirmadas

| Lacuna | Status | Registros |
|---|---|---|
| As 17 funções de IA (Flow, mockup, Magic Up, busca semântica e visual, Copilot do BI) dependem de `LOVABLE_API_KEY`; a voz depende de `ELEVENLABS_API_KEY`. As duas aparecem como "preencher" em `docs/secrets.md` | BLOQUEADA_EXTERNA | EDG-01, ADM-54, EDG-51 |
| O "assistente IA" do Gerador de Mockup devolve frases aleatórias com `setTimeout`; o chat real (`AIChat`, ligado ao `expert-chat`) está órfão | STUB/MOCK | FE-130, DOC-17 |
| A busca por imagem chama `search_products_semantic` com parâmetros inexistentes e cai num fallback sobre `products`, que não existe: **sempre falha** | ORFA | DB-06, FE-042 |
| Flow em "modo CRM" (análise do cliente) inalcançável; BI depende de CRM externo sem credencial | ORFA / BLOQUEADA_EXTERNA | DOC-03, ADM-42 |
| Erros de crédito/limite de IA não traduzidos (Mockup, Magic Up); lote engole falhas; consumo e cota de IA não cobrem todas as funções | PARCIAL | ADM-51, ADM-30 |
| Templates de mockup, anexo de arte vetorial, colaboração no Magic Up | ORFA / NAO_INICIADA | ADM-49, ADM-50, ADM-53, DOC-18, PLA-T078, DB-36 |
| "Workflows IA" (canvas só em memória), fila de otimização que não otimiza, respostas fixas quando a IA falha | STUB/MOCK | ADM-31, ADM-29, EDG-02 |

### G-10 — Banco de dados, ambientes e recuperação

| Lacuna | Status | Registros |
|---|---|---|
| 491 divergências de ledger: 110 versões no banco contra 592 arquivos locais (462 sem registro, 19 não verificados, 10 divergentes). O repositório não reconstrói o banco real; um `db push` tentaria aplicar centenas de migrations, 51 delas destrutivas | PARCIAL | DB-01, PLC-24, PLA-T021, PLA-T022 |
| 35 migrations ativas sem ledger cujos objetos **não existem** no banco (31 tabelas, 2 views, 10 funções) | NAO_INICIADA | DB-03 |
| ✔ Migrations antigas fora do padrão (`004_notification_functions.sql` etc.) quebram a integração Supabase × GitHub | PARCIAL | §3 |
| Sem ambiente de homologação nem preview de banco por PR; o E2E e as correções rodam no banco canônico | NAO_INICIADA | PLC-26, QA-17, PLA-T005 |
| Backup lógico e restauração nunca ensaiados; PITR de `docs/DR.md` sem verificação; sem runbook `RESTORE_PITR.md` | NAO_INICIADA | PLA-T008, PLC-27, QA-65, QA-66, DOC-35 |
| Acesso administrativo ao banco não reproduzível (401 em 01/10 e 11/10) | BLOQUEADA_EXTERNA | PLA-T006 |
| Multi-tenancy "com isolamento completo via `organization_id`" prometida no README: só 4 tabelas têm a coluna, e ela aceita nulo | DOC_DIVERGENTE / PARCIAL | DB-35, DOC-07 |

### G-11 — Observabilidade e alertas inexistentes

| Lacuna | Registros |
|---|---|
| Sentry inativo na produção (chunk vazio); DSN e regras de alerta (Slack/PagerDuty) existem só no documento | PLC-34, DOC-32, QA-61, FE-181 |
| Nenhum alerta operacional ligado: `health-check` não notifica, `error-monitor` não publicado, sem monitor externo de disponibilidade | PLC-35, QA-62, EDG-45, DOC-41, QA-64 |
| SLO/SLI sem medição; checklist de go-live sem nenhum item evidenciado | DOC-33, DOC-36 |
| Logging estruturado ausente em 77 Edge Functions legadas | PLC-36 |
| Falhas de CI e de rotinas agendadas não geram notificação nem issue | QA-43, PLC-10 |

### G-12 — Testes que não protegem o negócio

| Lacuna | Registros |
|---|---|
| Nenhum E2E percorre a jornada que gera receita (orçamento → envio → aprovação com token válido → pedido). Por isso C-01 e C-02 passaram despercebidos | QA-14, PLA-T096 |
| Portal Sicoob sem E2E executável: 13 rotas sem spec, e os 4 specs de `e2e/routes/sicoob/` não pertencem a nenhum projeto do Playwright | QA-15, QA-12 |
| O "gate de cobertura de 80%" vale para 9 de cerca de 1.898 arquivos; cerca de 40 arquivos e 1.150 casos copiam a lógica para dentro do teste e nunca importam o código real | QA-01, QA-02, PLC-15 |
| Testes de RLS "estáticos" comparam uma fixture com ela mesma | QA-03 |
| 16 cenários P0 de resiliência com `test.skip` permanente porque a tela de degradação não existe (Bitrix/CRM fora do ar, rollback de checkout, logout global) | QA-13 |
| 25 de 26 testes Deno das Edge Functions nunca executam; 5 simulações PostgreSQL prontas fora do CI | QA-09, QA-51 |
| Personas por papel Sicoob não provisionadas para CI | QA-16 |
| O inventário de runtime usado pelo `ci.yml` **expira em 07/11/2026**: depois disso todo PR fica vermelho | QA-44 |

### G-13 — Logística, distribuição e pós-venda

| Lacuna | Status | Registros |
|---|---|---|
| Avaria ou falta registrada no recebimento deixa o pedido parado em `logistic` **para sempre**: não há protocolo, reposição, crédito nem reabertura. A própria migration admite: "permanece em logística até que a divergência seja resolvida pelo fluxo operacional" | PARCIAL | PLB-27, SIC-133, PLA-T085 |
| O comprador não divide quantidades entre destinos: 100% de cada item vai para a PA do pedido; sem data por destino; sem importação por planilha | PARCIAL / NAO_INICIADA | PLB-23, SIC-132, PLA-T082, PLC-61 |
| Expedição parcial por item e destino, estado "parcialmente entregue", rastreio com previsão | PARCIAL | PLB-24, PLB-25, PLB-26, SIC-130, SIC-134 |
| Frete por tabela fixa por peso (referência: SP capital); tributos não explicitados: o "custo total" não é total | STUB/MOCK / NAO_INICIADA | PLB-09, PLB-10, DOC-08, FE-111 |
| Cancelamento parcial, revisão pós-aprovação, passagem formal ao fornecedor, produção e controle de qualidade | NAO_INICIADA | PLB-39, PLB-41, PLB-42, SIC-045 |
| Reconfirmação de disponibilidade antes da expedição | BLOQUEADA_EXTERNA | PLB-44, SIC-136 |
| SLA de pedido inerte (o prazo nunca é preenchido desde que o trigger foi removido) | ORFA | SIC-043 |

### G-14 — Compras institucionais: campanha, propostas comparáveis e arte

| Lacuna | Status | Registros |
|---|---|---|
| Campanha institucional (briefing, data do evento, destinos, centro de custo, marcos regressivos, modelos por cooperativa) | NAO_INICIADA | PLB-13, PLB-15, SIC-031, PLC-62, PLA-T086 |
| Propostas institucionais comparáveis (2–3 fornecedores) e justificativa de fornecedor único | NAO_INICIADA | PLA-T054, PLA-T055, PLB-30, SIC-064, PLC-60 |
| A arte é aprovada por quem tem alçada financeira: não há papel de marketing ou marca nem fila de artes | NAO_INICIADA | PLB-19, SIC-071 |
| A arte se liga ao pedido, não ao item, à técnica, à posição ou à dimensão; não é invalidada por mudança comercial | PARCIAL | PLB-18, SIC-070, PLA-T072, PLA-T073 |
| Biblioteca institucional de marca por cooperativa; aceite formal da marca Sicoob | PARCIAL / BLOQUEADA_EXTERNA | PLB-16, SIC-073, PLB-57, SIC-074, PLA-T071 |
| Capacidade física da embalagem do kit não validada (cotação não confere se os itens cabem na caixa) | NAO_INICIADA | PLA-T063, PLA-T064, PLB-20, SIC-090, PLC-57 |

### G-15 — Material publicado com métricas fabricadas

| Lacuna | Registros |
|---|---|
| 14 relatórios de "auditoria enterprise" ficam em `public/` e, por isso, são **servidos na URL de produção**. Trazem métricas fabricadas ("Cobertura 98,2%", "100% das tabelas validadas") e o inventário completo de tabelas do banco | QA-33 |
| Dossiê "Enterprise Compliance" com alegações fixas e resultados descartados | QA-32 |
| Painéis internos "Auditoria Enterprise", "Evidências" e "Saúde dos Testes & CI" com números fixos | ADM-08, FE-191, PLA-X02 |
| Simuladores locais herdam `producao_verificada=true` de execuções antigas: um teste local pode ser apresentado como verificado em produção | PLA-T009 |

### G-16 — Edge Functions: capacidade esgotada e funções mortas no ar

| Lacuna | Registros |
|---|---|
| Plano Supabase no limite de 100 funções publicadas para 106 fontes. Sem liberar vagas, não dá para publicar `webauthn-challenge`, `error-monitor` nem novos monitores | EDG-55, PLC-32 |
| 26 funções sem nenhum chamador; 4 chamadas só por código morto; endpoints legados no ar (`quote-sync` sem autenticação; `bitrix-sync` com `create_deal`/`update_deal` aceitos e não implementados); 2 inertes (410) ocupando vaga | EDG-08, EDG-10, EDG-11, EDG-37, EDG-49 |
| O pipeline de publicação cobre 7 de 100 funções; o comparador "publicado × repositório" não está ligado | EDG-30, PLC-05, PLC-06 |
| `EDGE_FUNCTIONS.md` não documenta 59 funções; o relatório de drift está obsoleto; 9 segredos lidos pelo código não constam em `docs/secrets.md` | EDG-52, EDG-53, EDG-54 |

### G-17 — Governança do próprio plano

| Lacuna | Registros |
|---|---|
| As 100 etapas do plano de encerramento estão "Planejada", com 0 de 1.000 checkboxes e 0 responsáveis ou revisores nominais | PLA-T004, PLB-55, PLC-55 |
| `decisoes_pendentes.md` está parado em 22/09; as decisões transversais não têm registro (custos, alçadas, fornecedor único, retenção, publicador Vercel × Lovable) | PLA-D14, §8 |
| Checklist de go-live sem nenhum item cumprido | DOC-36 |

---

## 6. Mapa por módulo e funcionalidade

Visão por módulo, do ponto de vista de quem usa. "Funciona" significa código ligado e coerente no repositório (sem prova de uso real). Os IDs remetem aos anexos.

### 6.1 Catálogo, busca e filtros

- **Funciona:**
  - três layouts (grade, lista e tabela) com grade virtualizada;
  - deep link de gênero, tamanhos e cores;
  - histórico de busca por usuário;
  - faixas de orçamento;
  - catálogo externo somente leitura com dados de custo e margem ocultos.
- **Falta:**
  - filtros exibidos sem efeito (FE-020/021/022);
  - links para `/catalogo` (FE-003);
  - busca global que só procura produtos e clientes (FE-040);
  - busca visual quebrada (DB-06/FE-042);
  - correção sugerida e sinônimos (PLB-03);
  - catálogo, curadoria e preço contratado por cooperativa (SIC-030, PLB-08);
  - horário da consulta de estoque e reconfirmação (PLB-02);
  - estoque futuro com nível de confiança (PLB-07, DB-07);
  - modo de visualização fora do deep link (DOC-09);
  - análise manual quando o catálogo não tem dado (PLB-12);
  - campos fiscais e de material incompletos no mapeamento (PLC-65).

### 6.2 Página de produto, comparador, favoritos e coleções

- **Funciona:** cor e estoque por variante no card, vistos recentemente, favoritos e coleções (lixeira, reações, exportação), comparador básico.
- **Falta:**
  - selos de mercado com dado fictício (FE-030);
  - histórico de preço não exibido (FE-031, DOC-19);
  - "comprados juntos" pronto e não exibido (FE-050);
  - prazo inventado no comparador (PLB-04);
  - "Onda C6" do comparador quase toda órfã (FE-070);
  - componentes de favoritos e coleções não ligados (FE-062);
  - listas por campanha e colaboração por cooperativa (PLB-05);
  - alertas de queda de preço quebrados (DB-05).

### 6.3 Simulador de preços e personalização

- **Funciona:** wizard de 4 etapas com rascunho no banco e cálculo de personalização.
- **Falta:**
  - aviso de preço estimado órfão (DOC-24);
  - aba "Por Tiragem" ignora preço e seleção (FE-120);
  - pré-carga no orçamento (FE-087);
  - cenários A×B, nicho e upsell do simulador antigo desligados (FE-121);
  - calculadora didática sem rota (FE-122);
  - camada service/repository sem uso (FE-123);
  - múltiplo de compra e mínimo uniforme (PLB-01);
  - prazo decomposto em análise, arte, produção e transporte (PLB-11);
  - markup padrão para preço sem markup, com teste desligado (QA-08).

### 6.4 Orçamentos

- **Funciona:**
  - salvamento atômico com versão e idempotência;
  - preservação de IDs de itens (PR #88);
  - autorização de status por escopo (`20260928182000`);
  - autosave com estado explícito;
  - comparador de versões;
  - comentários e versionamento no detalhe.
- **Falta:**
  - PDF, link e versões inacessíveis (C-05);
  - itens e valores não congelados após aprovação, e preço vindo do navegador (C-04);
  - idempotência incompleta: chave só em memória, edição sem chave, INSERT direto no ledger permitido (SIC-051, PLA-T035, PLA-T044);
  - versão observada pela tela na transição de status (SIC-050, PLA-T033);
  - personalizações recriadas e exclusão de item sem trilha (SIC-052, PLA-T036);
  - Kanban cobre 5 de 13 status (FE-080);
  - desconto fixo em 10% (FE-081);
  - insight de margem órfão (FE-082);
  - "Editar" item sem ação (FE-085);
  - PDF com "Versão {status}" e selo de autenticidade sem verificação (PLB-31);
  - expiração automática (SIC-056);
  - rascunhos sem controle entre abas e mantidos após o logout (PLC-59, SIC-055, PLA-T042/T043);
  - numeração anual à prova de concorrência (DB-10);
  - assinatura do vendedor no PDF (DB-11);
  - trilha "quem viu/baixou/assinou" (DB-09);
  - Bitrix no orçamento (FE-084).

### 6.5 Aprovação pública pelo cliente

- **Funciona:** página pública com assinatura e evidência HMAC, expiração e revogação do link.
- **Falta:**
  - resposta barrada pela trava de governança (C-02);
  - observação do cliente descartada (EDG-29);
  - verificação e rotação da chave de evidência sem uso (DB-12);
  - E2E com token válido (QA-14).

### 6.6 Pedidos (genérico e Sicoob)

- **Funciona:**
  - Kanban de pedidos Sicoob;
  - eventos de status imutáveis;
  - abas de NF, Pagamentos, Logística e Piloto/Arte;
  - recompra com nova consulta de preço e estoque;
  - trava de produção sem arte aprovada.
- **Falta:**
  - conversão barrada (C-01);
  - dois domínios de pedido, com comentários do pedido Sicoob gravados na tabela legada (`order_comments` → FK `orders`) (PLB-40);
  - painel financeiro com margem fixa (FE-090);
  - botão "Aplicar" do filtro sem ação (FE-091);
  - módulo genérico sem pagamento, rastreio, modelos e entrega parcial (DB-13);
  - enums de status sem coluna (DB-14);
  - dossiê e linha do tempo única do pedido (PLB-38);
  - menções em comentários fictícias (SIC-115);
  - Realtime do Kanban com canal fixo (SIC-048);
  - pós-venda (G-13).

### 6.7 Portal Sicoob: hierarquia, papéis, convites e painéis

- **Funciona:** convites institucionais (emitir, aceitar e revogar), delegação temporária, RLS cruzada dos pedidos (27/09), painel do PA e do gestor.
- **Falta:**
  - G-05 inteiro;
  - números fixos no `/gestor/compras` (C-07);
  - tema por cooperativa cadastrado e nunca aplicado (SIC-005);
  - modelo duplo de tenant (`organizations` × `cooperativas`) e onboarding manual por SQL (SIC-007);
  - tabelas de hierarquia duplicadas (SIC-006, DB-21);
  - parâmetros operacionais por cooperativa (SIC-141);
  - política de aprovação versionada sem tela, carga inicial ou gravação; o pedido mostra "Política aplicada: Não registrada" (SIC-061, DB-16, PLA-T052);
  - relatório Sicoob sem paginação nem os recortes planejados (SIC-120);
  - painel do vendedor sem meta (SIC-121);
  - indicadores de eficiência da jornada (SIC-123, PLB-51);
  - loja com identidade Sicoob só em demonstração (SIC-032);
  - **prova de isolamento entre cooperativas:** `sicoob_rls_validation.sql` roda como superusuário sem verificar nada, e os seeds têm uma cooperativa só (SIC-140).

### 6.8 Verba e alçadas

Ver C-03 e G-04.

### 6.9 Arte, documentos, NF e pagamentos

- **Funciona:** registro de documentos privados com quarentena e URL assinada, notas e parcelas no domínio Sicoob, versões de arte por pedido.
- **Falta:**
  - antivírus (C-06);
  - arte por item e aprovador de marca (G-14);
  - finalidades de documento restritas (SIC-102);
  - retenção, revogação, descarte e órfãos no storage (SIC-101, PLA-T076);
  - homologação de arte e documentos no banco canônico (PLA-T080);
  - conciliação financeira (G-04).

### 6.10 Kits

- **Funciona:**
  - montador `/montar-kit` com preview;
  - link público `/kit/:token`;
  - biblioteca e templates;
  - detector de duplicatas;
  - colaboração e realtime;
  - cotação Sicoob de kit validada no servidor (preço, estoque, mínimo).
- **Falta:**
  - "Monte seu Kit" leva a 404 (FE-002);
  - status inválido ao salvar (FE-110);
  - embalagem física (G-14);
  - frete fixo (FE-111);
  - previsão de reposição com margem fixa de 3 dias (PLC-58, SIC-091);
  - modelos por ocasião, público e faixa (PLB-21);
  - métricas de templates sem rota (ADM-16);
  - comparar kits e dados mock do construtor sem uso (FE-112).

### 6.11 Notificações, e-mails e rotinas

Ver G-01 e G-02.

### 6.12 Integrações externas

| Integração | Situação | Registros |
|---|---|---|
| Bitrix24 | `sync-quote-bitrix` ativo com mapa fixo de 7 e-mails de vendedores. Nunca envia a cor do item, descarta itens sem ID no Bitrix e não tem fila nem retry. `bitrix-sync` sem chamador e com ações de deal não implementadas. Recebimento de eventos do Bitrix não existe. Falta decisão de escopo (D01) | EDG-12, EDG-10, EDG-13, DOC-16, PLC-42, PLA-D01, PLA-T079 |
| n8n | Credenciais configuráveis sem consumidor; gatilhos por evento e enriquecimento de pedidos não existem; testes de contrato Pact não existem | ADM-25, EDG-18, PLC-45, DOC-57, QA-23 |
| Webhooks | Saída nunca entregue, HMAC desconectado, entrada registra mas não processa, sem fila durável | EDG-15, EDG-16, EDG-17, EDG-19, DB-38, DOC-31 |
| Gateway de pagamento (Mercado Pago) | Planejado no roadmap; não iniciado | PLC-43 |
| WhatsApp Business | Planejado; não iniciado | PLC-44 |
| ERP/SISBR | Exportação ou integração bloqueada por decisão | PLB-61, SIC-122 |
| Transportadoras (frete real) | Não iniciado; frete por tabela fixa | PLB-09, FE-111 |
| CNPJ (`cnpj-lookup`) e Dropbox | Dependem de chaves não configuradas; o Dropbox não está no menu | EDG-36, EDG-35, FE-190 |
| PostHog (analytics de produto) | Não iniciado | PLC-37 |
| Google OAuth / SSO | O botão existe, mas a tela de login não o usa; o `redirect_uri` aponta para `/auth/callback`, que não existe | DOC-04, FE-160 |
| MCP server | Expõe só 4 ferramentas de leitura | EDG-50 |

### 6.13 Inteligência artificial e voz

Ver G-09.

### 6.14 BI, inteligência comercial, tendências e relatórios

- **Funciona:** dashboards com Recharts, agregados reais quando há histórico e relatórios Sicoob sem metas fictícias.
- **Falta:**
  - BI 360 com mock (ADM-34);
  - Tendências em modo demo (ADM-43/FE-140);
  - gráfico de inteligência de mercado aleatório (ADM-44);
  - risco de produto com dados gerados (ADM-47);
  - dossiê BI em PDF e link público sem acesso (DOC-11, ADM-36, ADM-37, EDG-38);
  - segmentação, top clientes, oportunidades e tendência de receita não ligados (ADM-45, FE-141);
  - exportação de relatórios da Inteligência Comercial (ADM-46);
  - metas de vendas e Dashboard Executivo desligados (DOC-21, FE-143, ADM-10);
  - recomendações por ramo com curadoria fixa (ADM-39);
  - tendência setorial sempre "estável" (ADM-40);
  - "alertas inteligentes" com lista fixa (ADM-41);
  - dashboard pessoal sem entrada na navegação (ADM-57);
  - relatórios agendados sem disparo (G-02).

### 6.15 Administração

- **Falta:**
  - cadastros (G-03);
  - CMS: as abas SEO, Visual e Seções não afetam o site (ADM-26);
  - blog e portfólio sem tela (DB-39);
  - cupons com histórico "em breve" e uso nunca contabilizado (ADM-18);
  - feature flags sem efeito (ADM-19, DOC-37, FE-180);
  - Newsletter e Campanhas com 404 (ADM-03);
  - evidências de QA e auditoria RLS sem rota (ADM-04);
  - trilha de auditoria administrativa sem tela (ADM-07, DB-27);
  - matriz RBAC exibida diverge das rotas reais (ADM-13, FE-014);
  - skins bloqueadas para quem não é admin (ADM-14);
  - central de segurança da própria conta inacessível ao usuário comum (ADM-21);
  - painel "Omnichannel" com métrica fixa (ADM-28);
  - "Qualidade do catálogo" com percentuais inventados (ADM-32);
  - reposições limitadas a 200 registros e com progresso fictício (ADM-48);
  - ramos e segmentos sem tela (FE-194).

### 6.16 Autenticação e conta do usuário

- **Funciona:** login por e-mail e senha, MFA TOTP real e obrigatório no admin, redefinição de senha com aprovação, HIBP no cliente.
- **Falta:**
  - "Minha conta": perfil, avatar e troca de senha pelo próprio usuário (FE-013, DOC-15);
  - Google OAuth (DOC-04, FE-160);
  - passkeys (G-08);
  - CAPTCHA e reautenticação (DOC-14);
  - step-up para promover ou rebaixar dev e para rotacionar ou revogar segredos (DB-31);
  - login rápido de personas de teste órfão e com senha padrão (FE-162).

### 6.17 PWA, mobile, acessibilidade, desempenho e navegação

- **Falta:**
  - PWA não instalável e "Instalar App" com 404 (FE-170, DOC-51);
  - push e sincronização offline (FE-150, QA-28, QA-29);
  - manifest incompleto (QA-30);
  - navegação mobile sem as áreas Sicoob (FE-173);
  - tour de onboarding apontando para elementos inexistentes (FE-172);
  - atalhos de teclado anunciados que não funcionam (FE-171);
  - contadores de pendência da sidebar que nunca aparecem (FE-011);
  - jornada completa por teclado, zoom e leitor de tela (PLB-53, PLA-T093);
  - WCAG 2.1 AA sem gate nas páginas autenticadas (QA-24);
  - Lighthouse só em `/login` (QA-25);
  - Core Web Vitals por jornada (PLB-52, PLA-T094);
  - "início orientado às pendências" (PLB-46).

---

## 7. Situação de cada plano do repositório

| Plano / documento | Data | Tamanho | Situação em `dc08200` | Anexo |
|---|---|---|---|---|
| `plano-100-etapas.md` (original) | 11/09 | 100 etapas × 10 subetapas = 1.000 | A revisão de 12/09 apontava 88 com evidência, 622 parciais, 145 não demonstradas e 145 externas. **25 capacidades** antes ausentes hoje existem e estão ligadas. Restam 63 lacunas agrupadas de produto, além da governança | 02 |
| Benchmark Promo Gifts V4 | 11/09 | 32 melhorias | **12 concluídas**, 14 parciais, 1 com dado inventado (B15), 1 não iniciada (B28, modelos de campanha), 4 bloqueadas | 02 |
| Backlog da pesquisa | 11/09 | 42 itens | ~16 concluídos, 17 parciais, 2 não iniciados, 7 bloqueados | 02 |
| `plano-melhorias-50-etapas.md` | 09/2026 | 50 | **29 concluídas**, 21 abertas | 03 |
| `plano-reconciliacao-50-etapas.md` | 09/2026 | 50 | **23 concluídas**, 27 abertas | 03 |
| `plano-correcoes-auditoria-50-etapas` | 17/09 | 50 | **28 concluídas**, 22 abertas | 03 |
| `plano-workflows-github-100-etapas` | 27/09 | 100 | **~30 concluídas** (7 com premissa superada). Das 47 "não localizadas" em 01/10, **44 continuam** não localizadas | 01, 03 |
| `plano-150-etapas` (correções) | 27/09 | 150 etapas / 900 itens | Matriz de 01/10: 19 implementadas, 92 parciais, 10 não localizadas, 25 sem validação, 4 operação futura. As 10 não localizadas (P005, P056, P087, P088, P095, P096, P113, P122, P123, P127) **continuam** não localizadas. Dos P1, foram resolvidos `sent→sent` fora do escopo, identidade dos itens, chave de recompra e TS/ESLint; continuam parciais ou abertos idempotência, verba, preço no servidor, checks obrigatórios e scanner | 01 |
| `plano-encerramento-100-etapas` (vigente) | 01/10 | 100 etapas / 1.000 itens | **8 concluídas tecnicamente** (T025, T027, T029, T031, T032, T034, T062, T068), 63 parciais, 19 não iniciadas, 10 bloqueadas. Nos arquivos de acompanhamento: 100/100 "Planejada", 0/1.000 checkboxes, 0 responsáveis | 01 |
| `05_ROADMAP_PROXIMOS_PASSOS.md` | — | 7 fases + próximas | Fases 1–7 majoritariamente feitas. Não iniciados: gateway de pagamento, WhatsApp Business, PostHog, workflows n8n | 03 |
| `decisoes_pendentes.md` | 22/09 | 13 itens | 2 resolvidos (D02, D12); os demais seguem abertos e sem data; as decisões transversais exigidas pela T004 nem foram registradas (ver §8) | 01 |

**Etapas do plano vigente ainda não iniciadas (19):**

| Etapa | Tema |
|---|---|
| T004 | Responsáveis e decisões |
| T008 | Backup e restauração |
| T019 | Proteger merge e publicação |
| T045 | Homologar edição resiliente |
| T050 | Homologar notificações |
| T054 | Propostas comparáveis |
| T055 | Fornecedor único |
| T057 | Governança entre cooperativas |
| T063 | Modelo de embalagem do kit |
| T064 | Validação de embalagem no servidor |
| T070 | Homologar catálogo, kits e recompra |
| T076 | Retenção de anexos |
| T078 | Colaboração no Magic Up |
| T080 | Homologar arte e documentos |
| T082 | Importação de destinos |
| T085 | Avarias e devoluções |
| T088 | Fechamento de competência |
| T090 | Homologar campanha distribuída |
| T096 | Compra sintética integral |

---

## 8. Decisões de negócio que só a diretoria destrava

São 81 registros `BLOQUEADA_EXTERNA`. Abaixo, as decisões que destravam a maior parte deles.

| # | Decisão | O que destrava | Quem decide | Registros |
|---|---|---|---|---|
| 1 | **Contratar e configurar o antivírus de documentos** (provedor, custo, URL e token) | NF, comprovante e arte (C-06) | Diretoria + TI | PLA-T075, PLC-40, SIC-100 |
| 2 | **Autoridade do preço:** o preço do orçamento é negociado pelo vendedor ou vem do catálogo com tolerância? | C-04, PLA-T037, SIC-053 | Diretoria comercial | auditoria de 02/10 (dimensão 11) |
| 3 | **Onde o catálogo é mantido** (sistema de origem × telas do portal) | G-03: remover as telas ou abrir um canal de escrita | Diretoria + TI | PLC-46, PLB-59, ADM-02 |
| 4 | **Políticas institucionais por cooperativa:** alçadas, cotação mínima, aprovação de arte, cancelamento, calendário | Alçadas no servidor, campanha, propostas comparáveis, piloto | Cooperativa + Promo Brindes | PLB-56, SIC-061, PLA-T052 |
| 5 | **Dados comerciais:** SLA, origem de preço, estoque e prazo, regra de tributo, frete e pagamento | Custo total real, prazo prometido, comparador | Diretoria comercial | PLB-58, PLB-09, PLB-10, PLB-11 |
| 6 | **Provedores de notificação:** Resend (domínio e remetente), Slack, WhatsApp Business | G-01 | Diretoria + TI | EDG-21, SIC-112, PLC-44 |
| 7 | **Credenciais de IA e voz** (Lovable AI Gateway, ElevenLabs) e orçamento de consumo | G-09 | Diretoria | EDG-01, ADM-54 |
| 8 | **Ambiente de homologação** (segundo projeto Supabase: custo) e plano Supabase acima de 100 funções | Testes fora da produção; publicar monitores | Diretoria | PLC-26, QA-17, PLC-32, EDG-55 |
| 9 | **Bitrix24:** sincronização ativa ou abandonada (D01) | EDG-10/12/13 | Diretoria comercial | PLA-D01, PLC-42 |
| 10 | **Publicador oficial** (Vercel × Lovable) e "quem é produção" | URL oficial, gate de publicação | TI | PLC-03, PLA-D14 |
| 11 | **Telemetria de erros:** ativar o Sentry com DSN (D04) | G-11 | TI | PLA-D04, DOC-32 |
| 12 | Módulo white-label (`companies`), Magic Up colaborativo (D09), objetos candidatos à remoção (D07/D08) | Limpeza de código e banco órfãos | TI | PLA-D06–D09, PLC-53/54 |
| 13 | **Views de auditoria em tela** (D10) | `sicoob_budget_audit`, `v_full_scope_grants` | Compliance | PLA-D10, ADM-09 |
| 14 | **Marca Sicoob:** guia vigente, logo, tipografia e contraste aprovados | Identidade da loja | Sicoob | PLB-57, SIC-074, PLA-T071 |
| 15 | **Responsáveis nominais** pelas 100 etapas e cerimônia de aceite | Fechar formalmente qualquer etapa | Diretoria | PLA-T004, PLB-55 |
| 16 | **Piloto:** cooperativa, data, primeira compra real, segunda cooperativa, 30 dias de estabilidade | Go-live | Diretoria + Sicoob | PLA-T098–T100, PLB-60, SIC-142 |
| 17 | **Rotação das credenciais** expostas no incidente `migrate-helper` | Encerrar o incidente | TI | DOC-42, PLC-33 |
| 18 | **LGPD:** canal do titular, retenção e descarte | Conformidade | Jurídico | PLB-63, DB-41 |

---

## 9. Código pronto e desligado (órfão)

O repositório tem um volume grande de funcionalidade **já escrita e não ligada**. É o ponto de partida mais barato: ligar, ou decidir remover.

| Medida | Valor | Fonte |
|---|---:|---|
| Arquivos de `src/` inalcançáveis a partir de `src/main.tsx` | 365 de ~1.900 | 05 |
| Desses, no admin/BI/IA | 154 arquivos, ~27,5 mil linhas | 06 |
| Desses, a gestão de catálogo do admin | 112 arquivos, ~19 mil linhas | 06 |
| Rotas registradas sem nenhum link de entrada | 35 | 05 |
| Itens de menu do admin que levam a 404 ou à página errada | 6 | 06 |
| Exports sem nenhum uso | 298 | 05 |
| Edge Functions sem chamador | 26 (+4 chamadas só por código morto) | 07 |
| Tabelas e views sem uso em código | 33 | 08 |
| Funções SQL sem chamador | 36 (26 no banco, 10 nunca aplicadas) | 08 |
| Feature flags gravadas e nunca lidas | registro inteiro (`system_settings`, `featureFlags`) | ADM-19, FE-180, DOC-37 |

**Páginas prontas sem rota:** `AdminNewsletterPage`, `AdminCampanhasPage`, `AdminCadastrosPage`, `ProductForm`, `ReleaseEvidencesPage`, `RLSAuditPage`, `KitTemplatesMetricsPage`, telas de Centrais, Singulares, PAs e Cooperativas, página antiga de aprovações do gestor, histórico de aprovações Sicoob, `AuditEvidenceDashboard` e a página de exemplos de MFA. Lista completa: FE-016, ADM-11, PLC-49, SIC-001.

**Componentes prontos e não exibidos:**
- histórico de preço;
- "comprados juntos";
- insight de margem;
- alçada de diretoria;
- metas de vendas;
- Dashboard Executivo;
- dossiê BI em PDF;
- chat `AIChat`;
- templates de mockup e anexo vetorial;
- mini-carrinho com cupom;
- busca avançada;
- comparador "Onda C6";
- recursos do simulador antigo;
- calculadora de personalização;
- login social.

Lista completa nos apêndices dos anexos 05 e 06.

**Tabelas e RPCs sem tela:**
- `cooperativa_budgets` e `check_budget_availability`;
- `sicoob_budget_audit` e `v_full_scope_grants`;
- `sicoob_approval_policies`;
- `sensitive_access_logs`;
- `quote_audit_logs` e `log_quote_action`;
- `scheduled_notifications` e `notification_digests`;
- `limit_increase_requests`, só com escrita;
- tabelas de blog e portfólio;
- hierarquia legada (`singulares`, `pontos_atendimento`, `pa_singularidades`).

Lista completa nos apêndices A/B/C do anexo 08.

---

## 10. Documentação que afirma o que o código não faz

| Documento | Afirmação | Realidade | Registro |
|---|---|---|---|
| README | Multi-tenancy "com isolamento completo via `organization_id`" | 4 tabelas com a coluna, anulável | DOC-07, DB-35 |
| README / DEPLOYMENT | Produção em `criar-together-now.lovable.app` | Serve outro produto; a produção real é `brindes-sicoob-v2.vercel.app` | PLC-03 |
| README | "Restrição por IP/geolocalização", "Google OAuth", "frete SEDEX/PAC", "exportação de relatórios do BI" | Fail-open no cliente / órfão / tabela fixa / parcial | DOC-05, DOC-04, DOC-08, ADM-46 |
| `FUNCIONALIDADES_E_FERRAMENTAS.md` / `INVENTARIO_FUNCIONALIDADES_v2.md` | Inventário de funcionalidades | 78 caminhos citados não existem; 39 arquivos órfãos; rotas e perfis inexistentes | DOC-26, DOC-53 |
| `ROUTES.md` | Mapa de rotas | Desatualizado; mais de 20 páginas sem rota | DOC-50 |
| `EDGE_FUNCTIONS.md` / `EDGE_FUNCTIONS_DRIFT.md` | Inventário de funções | 59 não documentadas; drift obsoleto (faltam 17) | EDG-52, EDG-53 |
| ADR 0003 | "100% das Edge Functions com Zod" | Não cumprido | DOC-43 |
| `order-workflow.md` | Testes e status do workflow | Testes citados não existem; status divergem | DOC-54, SIC-049 |
| `SICOOB_TESTING.md` | Papéis de teste `sicoob_pa`, `sicoob_singular`… | Não existem no RBAC | DOC-55 |
| `docs/04_EXPLICACAO_DAS_POLICIES.md` | Helpers e policies de organização | Só nas migrations arquivadas | DB-35 |
| Auditorias "enterprise" em `docs/audits/` e `public/reports/` | Criptografia em repouso, "cold storage", cobertura de 98,2% | Não sustentado; servido publicamente | DOC-49, QA-33 |
| `SECURITY_RUNBOOK.md` | Security Center "somente admins" | A rota exige `dev` | DOC-64 |
| `HOOKS_USAGE_GUIDE.md` | `useCRUD` | Não existe | DOC-60 |
| `DR.md` | PITR de 7 dias, versionamento de buckets, replicação | Sem verificação | QA-66 |
| `.lovable/memory/*` | Memórias de funcionalidades e decisões | Várias referenciam documentos e rotinas inexistentes | DOC-62, DOC-29 |

---

## 11. Backlog recomendado em ondas

Ordem sugerida por impacto no negócio e custo. Cada onda pode ser executada em PRs pequenos e independentes.

### Onda 0 — destravar a venda e fechar riscos graves (≈ 1 semana, quase tudo esforço P)

1. **C-01 e C-02:** liberar a trava de governança dentro de `convert_quote_to_sicoob_order` e `apply_local_quote_approval_response`, e criar uma regressão SQL que aplique as duas migrations juntas. Antes, reproduzir no banco (§12).
2. **C-03:** reescrever as policies de `pa_budgets` com escopo de cooperativa e restringir o UPDATE do gerente do PA às colunas permitidas.
3. **C-05:** apontar `/orcamentos/:id` (ou um botão) para `QuoteViewPage` e trocar "Copiar link" e "WhatsApp" pelo link público de aprovação.
4. **G-06:** corrigir os 18 links quebrados (`/kit-builder` → `/montar-kit`, redirect `/catalogo` → `/filtros`) e rotear ou remover os itens de menu com 404.
5. **C-07:** desligar o modo demo por padrão em Tendências e retirar ou rotular os números fixos (BI 360, `/gestor/compras`, verba de R$ 50 mil, prazo do comparador, margem de 32%).
6. **G-07:** corrigir o status `complete` do kit e a pré-carga do construtor de orçamento.
7. **G-08:** desativar ou proteger `verify-email`, aplicar CSP na raiz e validar JWT nas 4 funções de IA.
8. **C-08:** corrigir o `startup_failure` do CI, ligar os checks obrigatórios na `main` e tirar os relatórios fabricados de `public/` (QA-33).

### Onda 1 — comunicação, rotinas e verba (≈ 2–3 semanas)

1. Implementar `send-transactional-email` com Resend (após a decisão 6) e ligar os eventos de orçamento e pedido (G-01).
2. Agendar as 13 rotinas e corrigir as que leem `products` inexistente (G-02).
3. Corrigir os webhooks: cabeçalho interno e leitura dos segredos HMAC (EDG-15/16).
4. Verba no servidor na etapa de orçamento, fluxo de aumento de limite, alçadas lidas pelo servidor e correção da aba Vínculos (G-04, G-05).
5. Congelar itens após a aprovação e definir a autoridade do preço (C-04, após a decisão 2).
6. Decidir e executar o destino das telas de cadastro de catálogo (G-03, após a decisão 3).
7. Configurar o antivírus (C-06, após a decisão 1).

### Onda 2 — compra institucional completa (≈ 4–6 semanas)

1. Pós-venda: avaria, falta, devolução, cancelamento parcial e expedição parcial (G-13).
2. Distribuição por destino com importação por planilha; frete real e tributos explícitos.
3. Ciclo financeiro da verba: reserva, compromisso, fechamento de competência e conciliação (G-04).
4. Arte por item, aprovador de marca e fila de artes; embalagem física do kit (G-14).
5. Campanha institucional e propostas comparáveis com fornecedor único justificado (G-14).

### Onda 3 — operação confiável (contínua)

1. Ambiente de homologação, backup lógico e teste de restauração (G-10).
2. Sentry ativo, alertas, monitor de disponibilidade e `error-monitor` (G-11).
3. E2E da jornada transacional e do portal Sicoob; cobertura real; testes Deno e simulações SQL no CI (G-12).
4. Renovar o inventário de runtime antes de **07/11/2026** (QA-44).
5. Saneamento do ledger: baseline versionada e congelamento do caminho de escrita (G-10).
6. Liberar vagas de Edge Functions removendo as inertes e órfãs (G-16).
7. Atualizar a documentação divergente (§10).

---

## 12. Confirmações pendentes no banco ao vivo

O acesso administrativo ao banco `cfmzkthhgliqelozlmwu` precisa ser restabelecido (token da Management API inválido) para confirmar:

| # | Conferência | Por quê |
|---|---|---|
| 1 | Conversão sintética de um orçamento aprovado em pedido Sicoob, dentro de transação com `ROLLBACK` | Confirmar C-01 |
| 2 | `apply_local_quote_approval_response` com token válido, dentro de transação com `ROLLBACK` | Confirmar C-02 |
| 3 | `SELECT * FROM pg_policies WHERE tablename='pa_budgets'` | Confirmar C-03 no estado vivo |
| 4 | `SELECT jobname, schedule FROM cron.job` | Confirmar G-02 (rotinas sem agendamento) e DB-32 (nome do job) |
| 5 | Presença dos segredos `LOVABLE_API_KEY`, `ELEVENLABS_API_KEY`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, `SICOOB_MALWARE_SCANNER_URL/TOKEN`, `WEBHOOK_DISPATCHER_SECRET` | G-01, G-09, C-06 |
| 6 | Publicação realtime (`pg_publication_tables`) | DB-25 |
| 7 | Ledger `supabase_migrations.schema_migrations` × 592 arquivos | DB-01, DB-03 |
| 8 | Configuração do Auth (signup, HIBP, confirmação de e-mail) | DOC-06 |
| 9 | Contagem de linhas nas tabelas de negócio (pedidos, orçamentos, verba, convites) | Separar o que nunca foi usado em produção do que é usado |

---

## 13. Índice dos anexos

| Anexo | Frente | Registros | P0 | P1 | P2 | P3 |
|---|---|---:|---:|---:|---:|---:|
| [01-plano-encerramento.md](lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md) | Plano de encerramento (T001–T100), matriz-150, workflows-100, decisões | 107 | 2 | 29 | 58 | 18 |
| [02-plano-original-benchmark.md](lacunas-funcionalidades-2026-10-11/02-plano-original-benchmark.md) | Plano original de 1.000 subetapas, benchmark (32), backlog (42) | 63 | 4 | 17 | 30 | 12 |
| [03-planos-melhorias-correcoes.md](lacunas-funcionalidades-2026-10-11/03-planos-melhorias-correcoes.md) | Melhorias-50, reconciliação-50, correções-50, workflows-100, roadmap | 65 | 3 | 13 | 30 | 19 |
| [04-docs-funcionais.md](lacunas-funcionalidades-2026-10-11/04-docs-funcionais.md) | README, inventários, ADRs, runbooks, memórias | 64 | 1 | 11 | 28 | 24 |
| [05-frontend-nucleo.md](lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md) | Rotas, catálogo, orçamento, pedidos, kits, simulador, auth, PWA + lista de órfãos | 80 | 1 | 17 | 35 | 27 |
| [06-frontend-admin-bi-ia.md](lacunas-funcionalidades-2026-10-11/06-frontend-admin-bi-ia.md) | Admin, BI, inteligência, IA, voz + lista de órfãos | 57 | 1 | 10 | 25 | 21 |
| [07-edge-functions-integracoes.md](lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md) | Matriz das 106 funções, segredos, webhooks, integrações | 56 | 1 | 10 | 30 | 15 |
| [08-banco-migrations.md](lacunas-funcionalidades-2026-10-11/08-banco-migrations.md) | Ledger, migrations, tabelas, RPCs, cron, RLS (apêndices A/B/C) | 42 | 0 | 4 | 17 | 21 |
| [09-fluxos-sicoob.md](lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md) | 17 fluxos Sicoob camada a camada | 82 | 4 | 19 | 41 | 18 |
| [10-testes-ci-infra.md](lacunas-funcionalidades-2026-10-11/10-testes-ci-infra.md) | Testes, E2E, workflows, scripts, infra, DR (apêndice de testes pulados) | 66 | 3 | 22 | 20 | 21 |
| [indice-lacunas.csv](lacunas-funcionalidades-2026-10-11/indice-lacunas.csv) | Todos os 682 registros (id, frente, grupo, funcionalidade, status, prioridade, esforço, impacto, o que falta), ordenados por prioridade | 682 | 20 | 152 | 314 | 196 |

> Os scripts de análise estática usados pelas frentes (grafo de imports, mapa de chamadas de funções, extração de schema) não foram versionados. Nos anexos, aparecem como `<scripts-da-auditoria>/`.
