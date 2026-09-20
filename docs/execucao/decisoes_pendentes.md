# Decisões pendentes — reconciliação Sicoob (consolidado em 20/09/2026)

Cada item abaixo já foi investigado a fundo (evidência linkada); nenhum foi resolvido por suposição. O que falta é uma escolha de produto/arquitetura, não trabalho mecânico.

## 1. `bitrix_clients`/`bitrix_deals`/`bitrix_sync_logs` — a sync com Bitrix24 ainda é ativa?
**Pergunta:** a integração `bitrix-sync` (edge function, webhook real com Bitrix24) ainda é usada? Se sim, ela precisa de tabelas de sync-cache próprias — mas **não** deve ressuscitar `bitrix_clients` como fonte de cliente do resto do app, porque 2 migrations (`20260213151101`, `20260301143055`) já documentam a migração pra `companies`/CRM externo.
**Se "sim, ainda ativa":** desenhar as 3 tabelas do zero (RLS correta, não o `USING(true)` original) e corrigir `QuotesKanbanPage.tsx`/`personalization_simulations` pra não depender delas como cliente genérico.
**Se "não, abandonada":** remover a edge function `bitrix-sync` e o código morto associado; fechar como código morto.
**Evidência:** `docs/execucao/evidencias/auditoria_tripla_20260917.md` §3.

## 2. RPCs `check_rls_enabled`/`get_enum_values` — vale reescrever o health-check?
**Pergunta:** `migration-health-check` (ferramenta interna de ops) é usada por alguém? Se sim, as 2 RPCs precisam ser escritas do zero (não existe migration real, premissa anterior estava errada).
**Evidência:** `docs/execucao/evidencias/auditoria_tripla_20260917.md` §3.

## 3. `set_config` em `mcp-keys-revoke` — vale o wrapper?
**Pergunta:** a trilha de auditoria `request.mcp_actor` (quem revogou uma chave MCP) é usada/consultada por alguém? Se sim, precisa de uma função wrapper nova exposta via PostgREST. Se não, remover a tentativa morta e corrigir o comentário enganoso no código.

## 4. `error_logs` — criar tabela ou confiar só no Sentry?
**Pergunta:** `VITE_SENTRY_DSN` está configurado em produção? (não tenho acesso a env vars de produção pra confirmar). Se sim, `error_logs` é redundante — decidir manter como fallback barato ou remover a tentativa de escrita. Se não, o app está sem observabilidade de erro nenhuma — prioridade sobe.

## 5. `sicoob_budgets` — schema genuinamente ausente
**Pergunta:** a hipótese de ser `cooperativa_budgets` sob outro nome foi **refutada** (schemas não batem). Precisa de decisão de arquitetura: criar a tabela do zero, ou o conceito de orçamento por cooperativa deveria usar `cooperativa_budgets` mesmo, exigindo mudança de código em vez de schema?

## 6. `companies` (`whitelabel-comparison.ts`)
**Pergunta:** o módulo de white-label é código morto de verdade (zero importadores hoje) — remover, ou é feature planejada pra reativar? Se reativar, precisa da mesma correção de client da tabela `products`.

## 7. `roles`, `user_2fa_settings`, `personalization_techniques` — sem mudança desde 16/09/2026
Decisões de arquitetura já registradas na Etapa 26 original (`docs/execucao/evidencias/sicoob_referencias_runtime_20260916.md`), continuam pendentes.

## 8. Candidatos a remoção (baixo risco, mas ainda é decisão de alguém aprovar)
- Família `pontos_atendimento`/`singulares`/`pa_singularidades` (0 linhas, nome quase-duplicado de `postos_atendimento`/`cooperativas`, que são as usadas)
- `blog_posts` (0 linhas, zero rota)
- Buckets `order-documents`, `component-media` (0 objetos armazenados)
- **Evidência:** `docs/execucao/evidencias/etapa22_pontos_atendimento_20260917.md`, `etapa23_blog_posts_20260917.md`, `etapa28_buckets_orfaos_20260917.md`

## 9. "Magic Up" colaborativo — terminar ou remover?
3 tabelas (comentários, compartilhamento público, reações) com schema pronto, UI nunca iniciada. **Evidência:** `docs/execucao/evidencias/etapa24_magic_up_20260917.md`

## 10. Views de auditoria prontas pra virar tela
`sicoob_budget_audit` e `v_full_scope_grants` têm proposta de UI documentada pra `AuditEvidenceDashboard.tsx` — só falta aprovar e alguém implementar o frontend. **Evidência:** `docs/execucao/evidencias/etapa26_views_auditoria_20260917.md`

## 11. PR retroativa para os commits sem revisão
`e3db49229`, `824cfa3bf`, `1fd123847`, `d6974924f` (+ trabalho desta sessão) estão no GitHub com schema já em produção, sem PR cobrindo. Ação: abrir e mergear a PR (Etapa 2-3 do plano de correções). Confirmado que não é bug de proteção de branch — é ação pendente mesmo.

## 12. Aplicação em produção da RPC `create_quote_version_atomic`
Única migration do "Nível 2" totalmente validada e pronta. Bloqueada por trava de plataforma do Claude Code (não contornável via settings). Pacote de aplicação manual pronto: `docs/execucao/evidencias/pacote_aplicacao_quote_versioning_20260920.md` — precisa de alguém colar o SQL no SQL Editor do Supabase.
