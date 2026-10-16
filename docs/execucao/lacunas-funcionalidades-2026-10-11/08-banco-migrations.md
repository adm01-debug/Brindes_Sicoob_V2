# Fatia 08 — Banco de dados e migrations (análise estática do repositório)

> Escopo: `supabase/migrations/**` (577 arquivos ativos), `supabase/migrations_archive/**` (20 SQL), `supabase/preflight/**`, `supabase/cron/cron-config.sql`, `src/integrations/supabase/types.ts`, `scripts/db/**` (incl. `migration-ledger-baseline.json` e `.inventory-cache.json`), `sicoob_rls_validation.sql` e documentação de schema. HEAD `dc08200` (08/10/2026). Análise feita em 11/10/2026, **sem conexão a banco**.
>
> **Referência de "banco vivo" usada aqui:** o snapshot versionado `scripts/db/.inventory-cache.json` (coletado em 2026-10-08T08:26Z do projeto `cfmzkthhgliqelozlmwu`: 222 relações, 237 funções expostas, 14 buckets). O próprio fechamento técnico afirma que o inventário vivo bate com esse snapshot (`docs/execucao/fechamento-tecnico-2026-10-08.md:35`). Limite: o snapshot é o contrato da Data API — funções `RETURNS trigger`, partições e `cron.job` não aparecem nele; para esses casos a conclusão é marcada como "não verificável estaticamente".
>
> **Método:** scripts Node em `<scripts-da-auditoria>/` (`extract.mjs`, `ledger.mjs`, `cols.mjs`, `addcols.mjs`, `rpcargs.mjs`) extraíram: todos os `.from()`, `.rpc()` (incl. wrappers `xxxRpc`, `untypedFrom`), `.storage.from()` e assinaturas `postgres_changes` de `src/` e `supabase/functions/` (190 tabelas, 133 RPCs, 8 buckets, 10 tabelas realtime); das migrations, todo `CREATE TABLE/VIEW/MATERIALIZED VIEW/FUNCTION/TYPE … AS ENUM`, `ALTER TYPE … ADD VALUE`, `DROP`, `RENAME`, inserts em `storage.buckets`, `cron.schedule/unschedule`, `CREATE TRIGGER` e `ALTER PUBLICATION supabase_realtime`, respeitando a ordem dentro de cada arquivo. O cruzamento foi feito contra `types.ts` (236 tabelas + 4 views, 237 funções, 7 enums — idêntico ao snapshot) e contra o inventário vivo. `graphify` não está instalado no ambiente (`command -v graphify` vazio; `graphify-out/` inexistente na raiz), por isso a navegação foi feita por grep/AST simples.

## Resumo

**Contagem por status (43 itens; atualização em 16/10/2026):**

| Status | Qtde | IDs |
|---|---:|---|
| CONCLUIDA | 1 | DB-43 |
| PARCIAL | 17 | DB-01, DB-04, DB-08, DB-10, DB-12, DB-13, DB-16, DB-19, DB-22, DB-25, DB-27, DB-29, DB-31, DB-35, DB-38, DB-40, DB-41 |
| NAO_INICIADA | 10 | DB-03, DB-07, DB-11, DB-15, DB-17, DB-23, DB-26, DB-36, DB-37, DB-39 |
| ORFA | 7 | DB-05, DB-06, DB-09, DB-14, DB-18, DB-21, DB-24 |
| STUB/MOCK | 7 | DB-02, DB-20, DB-28, DB-30, DB-32, DB-33, DB-34 |
| BLOQUEADA_EXTERNA | 1 | DB-42 |

**Números de apoio:** 491 divergências históricas de ledger (110 versões no ledger remoto × 592 arquivos locais em 07/10); 35 migrations ativas sem ledger cujos objetos **não existem** no banco (31 tabelas de negócio, 2 views, 10 funções); 33 tabelas/views vivas genuinamente órfãs (+16 tabelas internas acessadas só por RPC, que não são lacuna); 36 funções SQL sem nenhum chamador (26 vivas, 10 nunca aplicadas); 24 jobs `pg_cron` agendados no repositório; ≥ 12 rotinas documentadas como "cron" sem agendamento.

**Os 10 achados mais graves:**

1. **DB-40 (P1)** — Rotinas planejadas como agendadas nunca rodam: relatórios agendados (a tela `ScheduledReportsManager` deixa o usuário agendar), lembretes de follow-up de orçamento, alertas de queda de preço, digest e relatório mensal não têm `cron.schedule` em nenhuma migration; o plano registra a Etapa 43 como "parcial".
2. **DB-22 (P1)** — O pipeline de notificações omnichannel nunca é acionado: nenhum código invoca `send-notification`. Por isso as preferências de "Não perturbe", resumo e canais não têm efeito. `scheduled_notifications` e `notification_digests` não têm consumidor, e o envio "push" é só um log fixo.
3. **DB-19 (P1)** — Verba Sicoob incompleta: `cooperativa_budgets` (verba por cooperativa) e `check_budget_availability` estão órfãs. A view de conciliação "verba registrada × pedidos" (`sicoob_budget_audit`) não tem tela, embora a conciliação financeira seja marco de go-live.
4. **DB-01 (P1)** — Passivo de 491 divergências de ledger, das quais 462 são arquivos locais sem registro no banco. O repositório não reproduz o banco real, e um `db push` tentaria aplicar centenas de migrations, 51 delas destrutivas.
5. **DB-35 (P2)** — O README promete "multi-tenancy via `organization_id` com isolamento completo", mas só 4 tabelas têm a coluna, e ela é anulável. Os helpers e as policies descritos em `docs/04_EXPLICACAO_DAS_POLICIES.md` não existem.
6. **DB-05 (P2)** — Os alertas de queda de preço de favoritos e de coleções consultam a tabela `products` no banco canônico, onde ela não existe. Resultado: nunca detectam queda.
7. **DB-06 (P2)** — A busca visual por imagem chama `search_products_semantic` com parâmetros inexistentes (`search_query`, `max_results`) e cai num fallback sobre `products` local, também inexistente. A funcionalidade sempre falha.
8. **DB-16 (P2)** — A política de aprovação versionada por cooperativa (`sicoob_approval_policies`) não tem tela, seed nem escrita no código. A UI mostra "Política aplicada: Não registrada".
9. **DB-32 (P2)** — Os checks de hardening (card, snapshot diário e alerta) exigem o job `cleanup-security-logs-daily`, que nunca foi agendado com esse nome, e somam ponto fixo de "MFA assumido true". Resultado: o painel de segurança mostra falha permanente e uma nota inflada.
10. **DB-26 / DB-09 (P2)** — As trilhas de auditoria prontas no schema e nunca ligadas são `sensitive_access_logs` (acesso a dado sensível, LGPD) e `quote_audit_logs` + `log_quote_action` (quem viu, baixou ou assinou a proposta).

## Itens

### Ledger e governança de schema

### DB-01  Passivo de 491 divergências de ledger (repositório × banco)
- Status: PARCIAL
- Origem: `docs/execucao/fechamento-tecnico-2026-10-08.md:39`; `supabase/migrations_archive/README.md:19-30` ("Etapa 9 do plano permanece parcial")
- Evidência: `scripts/db/migration-ledger-baseline.json:1-14` (`captured_at` 2026-10-07, `ledger_count` 110, `local_count` 592, `finding_count` 491, `status_counts`: 462 `local_sem_ledger`, 19 `conteudo_nao_verificado`, 9 `nome_divergente`, 1 `conteudo_divergente`). A baseline guarda só *fingerprints* SHA-256, que eu decodifiquei recalculando com `collectLocalMigrations()` de `scripts/db/check-migration-ledger-drift.mjs:25-58,118-127`: as 462 `local_sem_ledger` vão de `004_*`/`005_*` a `20260529193319` (todas da era Lovable: 53 de 2025-12, 15 de 2026-01, 22 de 2026-02, 65 de 2026-03, 176 de 2026-04 e 126 de 2026-05). As 19 `conteudo_nao_verificado` estão no ledger sem `statements`; são o núcleo Sicoob de set/2026: `20260911143000`, `20260912090000`/`110000`/`120000`/`140000`/`160000`/`170000`/`180000`/`190000`/`200000`, `20260913120002..05`, `20260916100000`/`110000`/`120000`/`130000` e `20260927190000`. As 10 com nome ou conteúdo divergente são: `20251220181321`, `20260912100000`, `20260912130000`, `20260912150000`, `20260913120001`, `20260922153000`/`154000`/`155000`/`160000` e `20260927171216`. A triagem de 22/09 (`docs/execucao/evidencias/retomada-mcp-20260922/migration-backlog-classification.json`) classificou 468 pendentes: 51 "bloquear aplicação automática" (destrutivas), 192 "revisão manual prioritária", 143 "candidata dry-run", 72 "possivelmente aplicada fora do ledger" e 10 "bloqueada por dependência ausente". O gate só bloqueia diferença **nova**: `check-migration-ledger-drift.mjs:146-167`.
- O que falta: classificar individualmente os ~460 arquivos; mover para `migrations_archive/` os superados/nunca aplicáveis (ver DB-02 e DB-03); registrar no ledger, por `migration repair` auditado, os que comprovadamente já têm efeito no banco; reconciliar as 10 divergências de nome/conteúdo e gravar `statements` das 19 não verificadas; gerar um `schema.sql` de baseline que reproduza o banco.
- Impacto no negócio: se for preciso recriar o banco (desastre, novo ambiente, nova cooperativa), o repositório não reconstrói o que está em produção.
- Esforço: G
- Prioridade: P1

### DB-02  Migrations-esqueleto de dez/2025 (10 tabelas placeholder)
- Status: STUB/MOCK
- Origem: `supabase/migrations/20251228100003_analytics_events.sql` … `20251228100012_websocket_sessions.sql` (10 arquivos de 19 linhas cada)
- Evidência: os 10 arquivos são idênticos a menos do nome. Cada tabela só tem `id`, `created_at` e `updated_at` (ex.: `20251228100006_feature_flags.sql:5-9`), cobrindo `analytics_events`, `audit_trail`, `cache_entries`, `feature_flags`, `optimization_logs`, `rate_limits`, `redis_config`, `template_versions`, `two_factor_secrets` e `websocket_sessions`. Nenhuma existe no snapshot vivo nem em `types.ts`, e todas estão sem ledger. A única menção em código é a lista estática `supabase/functions/_shared/external-db-config.ts:123-124`.
- O que falta: decidir se feature flags, analytics, cache, sessões WebSocket e versionamento de template ainda são planos. Se forem, desenhar o schema real; se não, arquivar os 10 arquivos.
- Impacto no negócio: funcionalidades anunciadas no plano de dez/2025 (feature flags, analytics próprio, sessões em tempo real) nunca saíram do papel; os arquivos só confundem quem audita.
- Esforço: P
- Prioridade: P3

### DB-03  35 migrations ativas sem ledger cujo efeito não existe no banco
- Status: NAO_INICIADA
- Origem: arquivos listados no Apêndice A.2 (ex.: `20250102000000_gifts_production.sql:4,16,32`; `20251214201605_…sql:2,12`; `20251215113936_…sql:2,16,32`; `20251227170236_…sql:2,19`; `20251231023800_…sql:3`; `20251231024837_…sql:2,14`; `20251231130817_…sql:2,27`; `20260108014732_…sql:7,74,115,128,140`; `20260109125132_…sql:7,20,35,255,276`; `20260109154430_…sql:3,39,193`; `20260219133353_…sql:11`; `20260503000000_sicoob_rbac_infrastructure.sql:50`; `20260503000001_sicoob_profile_hierarchy.sql:18`; `20251227100004_audit_log_universal.sql:136`; `20260102_20260102205635_add_soft_delete_support.sql:66,94,122`)
- Evidência: as 31 tabelas e 2 views (`v_color_hierarchy`, `v_product_novelties`) estão ausentes de `.inventory-cache.json` e de `types.ts`. As 10 funções não-trigger também estão ausentes: `get_record_history`, `soft_delete_record`, `restore_record`, `permanent_delete_record`, `get_color_filters`, `add_product_novelty`, `get_active_novelties`, `get_novelties_stats`, `cleanup_expired_novelties` e `pa_belongs_to_user_singular`. Faltam ainda 13 colunas planejadas (`addcols.mjs`): `quote_approval_tokens.{ip_address,user_agent,attempts,used_at,is_used}` (`20251227100002_secure_approval_tokens.sql:6-11`), `profiles.role_id`, `profiles.signature_url`, `orders.deleted_at`, `collections.deleted_at` e `quote_items.personalization_{type,colors,price,notes}` (`20260107141013_…sql`). A maior parte foi **substituída** por outro desenho: catálogo/CRM externos (ADR 0001/0007), `city_whitelist`/`ip_access_control` no lugar de `geo_allowed_countries`/`user_allowed_ips`, MFA nativo no lugar de `user_2fa_settings`, `saved_filters` no lugar de `user_filter_presets`, `quote_item_personalizations`, `sicoob_order_history`. Gamificação, loja de recompensas (`store_rewards`/`user_rewards`), versionamento genérico (`entity_versions`, `get_record_history`) e `sync_jobs` foram abandonados sem registro. `decisoes_pendentes.md:37-38` mantém `roles`, `user_2fa_settings` e `personalization_techniques` como decisão pendente.
- O que falta: registrar formalmente "superada/abandonada" por arquivo e mover para `migrations_archive/` (como foi feito com o cluster `20250103_*`), além de remover os nomes da lista estática `external-db-config.ts:123-124`.
- Impacto no negócio: risco de alguém "aplicar pendências" e recriar tabelas locais de produtos, clientes e cores que conflitam com os sistemas oficiais.
- Esforço: M
- Prioridade: P2

### DB-04  Documentação de schema desatualizada em relação ao banco
- Status: PARCIAL
- Origem: `docs/DATA_DICTIONARY.md:4,17,77`; `docs/architecture/ER_DIAGRAM.md:9,21-22,36-38`; `docs/04_EXPLICACAO_DAS_POLICIES.md:41-106` e seções 108-720; `README.md:178,235,251-252`; `docs/05_ROADMAP_PROXIMOS_PASSOS.md:14,17`
- Evidência: o dicionário diz "Tabelas locais: 63 · Última atualização: 2026-04-17" e cita 33 tabelas. O snapshot vivo tem 222 relações, e 189 não estão documentadas, incluindo todo o domínio `sicoob_*`, verbas, convites, consolidação e outbox. `user_roles` aparece com 3 papéis, contra 9 no enum `app_role` (`types.ts:12969-12978`). O ER liga `PA_BUDGETS` e `SINGULARES` a `PONTOS_ATENDIMENTO`, mas a FK real é para `postos_atendimento` (`20260502143127_…sql:70`); `pontos_atendimento` e `singulares` são órfãs (DB-21). O ER também liga `ORGANIZATIONS → PROFILES`, e `profiles` não tem `organization_id`. `04_EXPLICACAO_DAS_POLICIES.md` descreve helpers (`user_is_org_member`, `is_org_admin`, `is_org_owner_or_admin`) e tabelas (`payments`, `mockup_generation_jobs`, `product_reviews`, `product_comparisons`, `user_favorites`, `user_filter_presets`, `push_subscriptions`, `product_price_history`) que só existem em `migrations_archive/2025` ou em nenhum lugar. O README fala em "534 migrations" e "35+ tabelas"; são 577 e 222. O roadmap diz "✅ Módulo de Payments completo", mas não existe tabela `payments` e `order_payments` é órfã (DB-13). `docs/AUDIT_FRONTEND_DATABASE.md:171-190` afirma que `products`, `roles`, `user_passkeys` e `personalization_techniques` "todas existem no banco", e o sumário (`docs/AUDIT_FRONTEND_DATABASE_summary.md:15`) dá como "Concluído" o RLS de `products`, `categories` e `suppliers`. Nenhuma dessas tabelas existe no banco canônico; aquela auditoria foi feita "sem acesso ao banco, baseada em 356 migrations locais" (`summary.md:27`).
- O que falta: regenerar o dicionário a partir do schema vivo, corrigir o ER, arquivar ou reescrever `04_EXPLICACAO_DAS_POLICIES.md`, `05_ROADMAP` e `AUDIT_FRONTEND_DATABASE*.md` como históricos, e atualizar o README.
- Impacto no negócio: novos desenvolvedores e auditores trabalham sobre um mapa errado do banco, com retrabalho e risco de decisões de segurança equivocadas.
- Esforço: M
- Prioridade: P3

### Catálogo

### DB-05  Alertas de queda de preço (favoritos e coleções) leem tabela inexistente
- Status: ORFA
- Origem: `supabase/functions/favorites-watcher/index.ts:3` ("cron diário que detecta quedas de preço em favoritos"); `supabase/functions/collections-watcher/index.ts:3`
- Evidência: as duas funções criam o cliente interno (`SUPABASE_URL` + service role, `favorites-watcher/index.ts:44-46`, `collections-watcher/index.ts:44-47`) e fazem `.from("products")` (`favorites-watcher/index.ts:63-68`, com o comentário "usa products table sincronizada", e `collections-watcher/index.ts:71-75`). A tabela `products` não existe no banco canônico: está ausente do snapshot e de `types.ts`, e a migration que a criaria (`20250102000000_gifts_production.sql:32`) nunca foi aplicada (`docs/execucao/evidencias/supabase-canonico-resumo-20261001.json`, `relacoes_ausentes`). O erro é descartado, o `priceMap` fica vazio e nunca há alerta. Além disso, nenhuma das duas está agendada (DB-40).
- O que falta: ler preço atual pelo catálogo externo (`external-db-bridge` ou cliente somente leitura), ou criar de fato o cache sincronizado de preços; agendar as rotinas.
- Impacto no negócio: o vendedor nunca é avisado quando um produto que ele favoritou ou colocou em coleção fica mais barato, e perde argumento de venda.
- Esforço: M
- Prioridade: P2

### DB-06  Busca visual por imagem chama RPC com assinatura inexistente
- Status: ORFA
- Origem: `supabase/functions/visual-search/index.ts:153-185`
- Evidência: a chamada `.rpc("search_products_semantic", { search_query, max_results })` (`:165-169`) não bate com a assinatura real `Args: { _limit?, _products, _query }` (`src/integrations/supabase/types.ts:12731-12732`; definição em `20261008043000_fix_anon_rls_and_semantic_ranking.sql:97`). O PostgREST responde "função não encontrada" e a função lança erro (`:171-174`). O fallback também consulta `products` no cliente local (`:180-185`), tabela que não existe. A varredura de argumentos de todas as RPCs (`rpcargs.mjs`) achou só este caso.
- O que falta: passar os candidatos do catálogo externo em `_products` (como faz `supabase/functions/semantic-search/index.ts:32`) e remover o fallback local.
- Impacto no negócio: a busca de produto por foto, recurso de diferenciação comercial, nunca devolve resultado.
- Esforço: P
- Prioridade: P2

### DB-07  Previsão de estoque futuro (reposição)
- Status: NAO_INICIADA
- Origem: `supabase/migrations/20260201155941_b988554d-1888-42e4-badc-ae2300cabd1c.sql:1-25` ("Previsão de reposição de estoque por variação/cor"); `docs/ANALISE_109_TABELAS_BANCO_EXTERNO.md:398-402` ("⬜ Previsão de reposição", "⬜ Filtro por estoque futuro")
- Evidência: `future_stock_entries` está ausente do banco vivo e de `types.ts`, sem ledger, e não tem nenhuma referência em `src/` nem em `supabase/functions/`.
- O que falta: definir a fonte (pedido de compra ou fornecedor), criar a tabela ou ler do catálogo externo, e montar a UI de filtro e prazo.
- Impacto no negócio: sem estoque, o vendedor não consegue prometer data de reposição e perde a venda.
- Esforço: M
- Prioridade: P2

### DB-08  Objetos do catálogo externo documentados e não ligados à interface
- Status: PARCIAL
- Origem: `docs/ANALISE_109_TABELAS_BANCO_EXTERNO.md:380-402` (Fases 1-4, quase todas "⬜")
- Evidência: pelo cruzamento de nomes do documento com o código (`docnames.mjs`), estes objetos só aparecem nas listas de permissão `src/lib/external-db/tables.ts` e `supabase/functions/_shared/external-db-config.ts`, sem consumo por tela: `stock_movements`, `v_products_with_stock`, `price_lists`, `v_products_min_price`, `v_variant_pricing_complete`, `v_customization_price_summary`, `v_techniques_stricker_mapping`, `v_product_print_areas_complete`, `mv_product_compositions`, as views de qualidade (`v_products_without_images`/`_videos`/`_missing_primary_image`), `v_media_stats`, as views de sync n8n e `v_kit_with_components`/`v_kit_component_print_areas`. Estes têm **zero** menções: `category_relationships`, `material_equivalences`, `product_comparisons`, `product_personalization_options`, `product_technique_pricing_tiers`, `mockup_generation_jobs`, `mockup_approval_links`, `price_change_history` e `product_price_history`. `variant_stocks` só aparece em `supabase/functions/external-db-inspect/index.ts`.
- O que falta: decidir quais filtros e painéis (estoque em tempo real, alertas de baixo estoque, histórico de preço, qualidade de catálogo) entram no escopo e ligá-los. Pode haver sobreposição com a fatia "catálogo".
- Impacto no negócio: o vendedor não tem filtro de estoque, histórico de preço nem painel de qualidade do catálogo que o documento prometia.
- Esforço: G
- Prioridade: P3

### DB-39  Blog e portfólio (CMS) sem tela
- Status: NAO_INICIADA
- Origem: `supabase/migrations/20260504190214_5806e636-…sql:2-15` (`blog_posts`); `20260504190237_f7e4591a-…sql:2-14` (`portfolio_items`)
- Evidência: as tabelas foram recriadas 20 min depois de serem dropadas por `20260504182837_…sql:2-3`. Existem no banco vivo, sem `.from()`, rota ou componente (`docs/execucao/evidencias/etapa23_blog_posts_20260917.md`), e entram como "candidatas a remoção" em `decisoes_pendentes.md:40-44`.
- O que falta: decisão de produto (publicar blog/cases no portal) e então UI e rota; caso contrário, remover.
- Impacto no negócio: conteúdo de marketing (cases e notícias) planejado para o portal não existe.
- Esforço: M
- Prioridade: P3

### Orçamentos

### DB-09  Trilha de auditoria de ações do orçamento não ligada
- Status: ORFA
- Origem: `supabase/migrations/20260509175720_8b74bfb2-…sql:6-16` (`quote_audit_logs`: 'view', 'download', 'sign', 'update') e `:38` (`log_quote_action`)
- Evidência: a tabela e a RPC existem no banco vivo, mas nenhum `.rpc('log_quote_action')` nem `.from('quote_audit_logs')` aparece em `src/` ou `supabase/functions/`. Já estava apontado em `docs/execucao/evidencias/etapa25_rpcs_sicoob_nao_ligadas_20260917.md`.
- O que falta: chamar `log_quote_action` ao abrir, baixar o PDF e assinar a proposta, e criar uma aba de "Acessos" no orçamento.
- Impacto no negócio: não se sabe se o cliente abriu ou baixou a proposta, nem quem alterou o quê, e falta prova em disputa comercial.
- Esforço: M
- Prioridade: P2

### DB-10  Numeração anual de orçamento à prova de concorrência
- Status: PARCIAL
- Origem: `supabase/migrations/20260219133353_4495e564-…sql:10-45` (contador `quote_number_counters` por ano, com `UPDATE … RETURNING`)
- Evidência: `quote_number_counters` está ausente do banco vivo (sem ledger). A versão vigente de `generate_quote_number()` (`20260320171208_…sql:165-195`) calcula `MAX(split_part(quote_number,'/',1))+1` sem trava, e duas gravações simultâneas leem o mesmo máximo. A `UNIQUE` original de `quote_number` (`20251214194907_…sql:22`) está num arquivo sem ledger, então não dá para confirmar estaticamente se ela existe.
- O que falta: sequência ou contador com trava (a tabela já desenhada) e teste de concorrência.
- Impacto no negócio: em pico de uso, dois orçamentos podem receber o mesmo número, ou a gravação falha para o vendedor.
- Esforço: P
- Prioridade: P2

### DB-11  Assinatura digitalizada do vendedor nos PDFs
- Status: NAO_INICIADA
- Origem: `supabase/migrations/20260220174735_fba5ec23-…sql:1-7` (`profiles.signature_url` + bucket público `signatures`, "needed for PDF generation")
- Evidência: o bucket `signatures` não está entre os 14 vivos (`.inventory-cache.json`, `buckets`), `profiles` não tem `signature_url` em `types.ts`, e não há upload no código.
- O que falta: aplicar coluna e bucket (avaliando se o bucket deve mesmo ser público) e criar a tela de cadastro da assinatura e a inserção no PDF.
- Impacto no negócio: a proposta sai sem a assinatura do vendedor, um detalhe de formalidade comercial que foi planejado.
- Esforço: P
- Prioridade: P3

### DB-12  Evidência de aprovação pública: verificação e rotação de chave sem uso
- Status: PARCIAL
- Origem: `supabase/migrations/20260922225000_secure_public_quote_approval.sql:357` (`verify_quote_approval_signature`) e `:382` (`rotate_quote_approval_evidence_key`)
- Evidência: as duas estão no banco vivo, sem `.rpc()` no app nem cron. Só `scripts/qa/simular-aprovacao-publica.py` as usa. A gravação da evidência funciona (`apply_local_quote_approval_response`), mas não existe tela para conferir uma assinatura nem rotina de rotação da chave HMAC no Vault.
- O que falta: tela admin de "verificar evidência de aceite" e procedimento ou cron de rotação.
- Impacto no negócio: em contestação de aceite, a equipe não tem botão para provar que a aprovação é íntegra.
- Esforço: P
- Prioridade: P3

### Pedidos

### DB-13  Módulo de pedido genérico incompleto (pagamento, rastreio, modelos, entrega parcial)
- Status: PARCIAL
- Origem: `supabase/migrations/20260502174252_a88e3c13-…sql:52` (`order_logistics_tracking`), `:136` (`order_payments`), `:242,272` (`order_templates`/`order_template_items`); `20260927200207_duplicate_order_atomic.sql:108-110` (`fulfillment_status` com `partially_fulfilled`)
- Evidência: `order_payments` e `order_logistics_tracking` têm zero uso; os pagamentos reais usam `sicoob_order_payments` (`src/hooks/orders/extensions/useOrderPayments.ts:52,65`). Os modelos de pedido só são listados e excluídos (`src/services/OrderService.ts:334-345`, `src/components/orders/OrderTemplatesSheet.tsx:32-37`), sem criar nem aplicar modelo, e `order_template_items` nunca é escrita. Os valores `unfulfilled` e `partially_fulfilled` têm 0 ocorrências em `src/`.
- O que falta: "salvar pedido como modelo" e "criar pedido a partir de modelo"; decidir se pagamento e rastreio de pedido genérico serão usados ou removidos; tela de entrega parcial.
- Impacto no negócio: o vendedor não consegue reaproveitar pedidos recorrentes nem registrar entrega parcial fora do fluxo Sicoob.
- Esforço: M
- Prioridade: P2

### DB-14  Enums de status de pedido sem coluna
- Status: ORFA
- Origem: `supabase/migrations/20260503151802_66e34da7-…sql:1-17` (`order_status` pt-BR); `20251220141234_12ce9efd-…sql:3-20` (`order_status` inglês com `ready_for_pickup` + `fulfillment_status`)
- Evidência: o enum `order_status` existe (`types.ts:12979-12989`), mas nenhuma coluna o referencia; o `types.ts` só usa os enums `app_role`, `org_role`, `step_up_action` e `role_migration_*`. `orders.status` é texto com CHECK (`20260927200207_duplicate_order_atomic.sql:101-106`). `fulfillment_status` (enum) e `ready_for_pickup` (retirada no local) nunca chegaram ao banco nem ao código (0 ocorrências).
- O que falta: decidir entre enum e CHECK (e remover o enum morto); avaliar se "pronto para retirada" é etapa de negócio.
- Impacto no negócio: baixo; a duplicidade confunde e a etapa "retirada no local" planejada não existe.
- Esforço: P
- Prioridade: P3

### DB-15  Política unificada de soft-delete (lixeira) para entidades de negócio
- Status: NAO_INICIADA
- Origem: `docs/adr/0008-unified-soft-delete-policy.md:3-21` (Status "Proposta": `deleted_at` em orçamentos, pedidos, clientes e produtos, trigger e RLS); `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql:1-30,66,94,122`
- Evidência: a migration nunca foi aplicada (sem ledger, funções ausentes). Só `quotes` (e tabelas auxiliares de catálogo e perfis) têm `deleted_at`; `orders`, `order_items`, `sicoob_orders`, `quote_items` e `custom_kits` não têm (`cols.mjs`). `sync_is_active_with_deleted_at` existe como trigger, mas sem as colunas nas tabelas-alvo.
- O que falta: aplicar o ADR (colunas, trigger, filtros de RLS e de UI, restauração) ou rejeitá-lo formalmente.
- Impacto no negócio: um pedido excluído some de vez, sem lixeira nem trilha para auditoria e LGPD.
- Esforço: M
- Prioridade: P2

### Kits

> Sem lacuna de schema exclusiva de kits (todas as tabelas de kit têm uso). Ver DB-25 (comentários de kit sem realtime) e DB-18.

### Aprovação

### DB-16  Política de aprovação versionada por cooperativa sem gestão
- Status: PARCIAL
- Origem: `supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql:1-18` ("A política por cooperativa é versionada e o pedido preserva a referência usada")
- Evidência: `sicoob_approval_policies` existe no banco vivo e só é lida por `get_sicoob_order_approval_policy` (`20260922161000_repair_sicoob_approval_policy_snapshot.sql:12`). Não há INSERT em nenhuma migration nem em `src/`. A UI do pedido exibe `order.approval_policy_version || "Não registrada"` (`src/pages/sicoob/orders/OrderDetailPage.tsx:225`). A tabela consta como obrigatória no contrato `supabase/preflight/sicoob-reconciliation-contract.sql:15`.
- O que falta: tela da Central para cadastrar e versionar política (vigência, autoaprovação, filiação ativa) e a carga inicial por cooperativa.
- Impacto no negócio: as regras de alçada por cooperativa só mudam por SQL manual, e os pedidos registram "política não registrada" na auditoria.
- Esforço: M
- Prioridade: P2

### DB-17  Alertas de gestor por Slack/e-mail
- Status: NAO_INICIADA
- Origem: `supabase/migrations/20260504211811_2c878015-…sql:11-19` (`manager_notification_config`: `slack_webhook_url`, `email_enabled`, `slack_enabled`)
- Evidência: a tabela existe e tem zero uso em código e SQL (`orfaos_banco_20260917.md:14`).
- O que falta: tela de configuração e disparo no fluxo de aprovação (ou remoção, se `pa_notification_settings` a substitui).
- Impacto no negócio: o gestor não recebe pedidos pendentes no Slack ou e-mail e a aprovação demora.
- Esforço: M
- Prioridade: P3

### Arte

### DB-18  Templates de mockup, mídia de componente e buckets de arte planejados
- Status: ORFA
- Origem: `supabase/migrations/20260216125012_7b8dd710-…sql:3` (`mockup_templates`); `20260325152410_9454cf25-…sql:3,8` (bucket `component-media` + tabela `component_media`); `20260215185444_…sql:3` (bucket `mockup-assets`); `20260208141021_…sql:2` (bucket `art-files`)
- Evidência: `mockup_templates` e `component_media` estão vivas, com zero `.from()`. A UI de mídia de componente usa `kit_component_media` do catálogo externo (`src/components/admin/products/kit-components/api.ts:103-133`). O bucket `component-media` está vivo com 0 objetos e sem upload (`docs/execucao/evidencias/etapa28_buckets_orfaos_20260917.md`). Os buckets `mockup-assets` e `art-files` não existem no banco vivo (renomeados para `mockup-art-files`/`proposals`, ADR 0001).
- O que falta: decidir sobre a biblioteca de templates de mockup e remover os objetos órfãos.
- Impacto no negócio: a reutilização de templates de mockup, planejada, não existe; o designer refaz a arte do zero.
- Esforço: P
- Prioridade: P3

### Verba/Sicoob

### DB-19  Verba por cooperativa, checagem de saldo e conciliação de verba
- Status: PARCIAL
- Origem: `supabase/migrations/20260502143127_cebe731a-…sql:48-62` ("VERBAS por Cooperativa"); `20260503214557_f7ee25b6-…sql:47-63` (`check_budget_availability`) e `:66-80` (view `sicoob_budget_audit`); `docs/execucao/decisoes_pendentes.md:29-32` ("Pendente: homologação de verba por período"); `docs/execucao/evidencias/etapa26_views_auditoria_20260917.md`
- Evidência: `cooperativa_budgets` está viva, sem leitura nem escrita (só menção em `supabase/functions/migration-health-check/index.ts`); a verba usada é apenas `pa_budgets` (`src/hooks/admin/useApprovalThreshold.ts:51`). `check_budget_availability` não é chamada no app; só aparece em `scripts/qa/simular-verba-legada.py`. A view de conciliação (`verba registrada × soma de pedidos confirmed/logistic/completed`, com coluna `discrepancia`) não tem tela, e a proposta de card para `AuditEvidenceDashboard.tsx` nunca foi implementada (`src/pages/admin/AuditEvidenceDashboard.tsx` não referencia a view).
- O que falta: usar ou remover a verba de cooperativa (teto agregado dos PAs), consultar saldo antes de enviar o pedido e criar a tela "Conciliação de verba por PA" com alerta de discrepância.
- Impacto no negócio: a cooperativa não controla teto global de gasto em brindes e o financeiro não enxerga divergência entre verba consumida e pedidos (marco de go-live "conciliação financeira").
- Esforço: M
- Prioridade: P1

### DB-20  Relatório de performance Sicoob (EXPLAIN por papel)
- Status: STUB/MOCK
- Origem: `supabase/migrations/20260502151402_c816c4fa-…sql:1-30` (tabela + função "EXPLAIN ANALYZE")
- Evidência: a versão vigente de `generate_sicoob_performance_report` (`20261008010000_fix_plpgsql_lint_failures.sql:494-509`) só insere `'{"info": "Relatório gerado via auditoria de sistema"}'::jsonb` com `total_time_ms = 0` (`:506`), sem medição. Não tem chamador no app; só `tests/scenarios/operacoes-internas-seguras.mjs`.
- O que falta: medição real (via script externo ou `auto_explain`) e tela, ou remoção.
- Impacto no negócio: não existe relatório de desempenho por perfil Sicoob, embora a tabela sugira que sim.
- Esforço: P
- Prioridade: P3

### DB-21  Hierarquia legada (`singulares`, `pontos_atendimento`, `pa_singularidades`)
- Status: ORFA
- Origem: `supabase/migrations/20260503172408_b6bcb7cb-…sql:16`; `20260503175512_115f0a9c-…sql:24,44`
- Evidência: as tabelas estão vivas, com zero `.from()`. As telas usam `cooperativas`/`postos_atendimento` (`docs/execucao/evidencias/etapa22_pontos_atendimento_20260917.md`), mas o ER oficial (`docs/architecture/ER_DIAGRAM.md:21-22,36-38`) documenta as legadas como entidades principais. Constam como candidatas a remoção em `decisoes_pendentes.md:41`.
- O que falta: aprovar a remoção e corrigir o ER.
- Impacto no negócio: nomes duplicados da hierarquia (PA, singular) levam a cadastros e relatórios na tabela errada.
- Esforço: P
- Prioridade: P3

### Notificações

### DB-22  Pipeline de notificações omnichannel nunca acionado (DND, resumo e canais sem efeito)
- Status: PARCIAL
- Origem: `docs/NOTIFICATION_SYSTEM.md:24,94-105` ("✅ Canais: In-App, Email, Push, SMS, WhatsApp", "✅ Digest Diário"); `supabase/migrations/20260504210817_51f845c9-…sql:11-36` (`notification_digests`, `scheduled_notifications`)
- Evidência: a Edge `send-notification` lê `notification_preferences`, respeita "Não perturbe" agendando em `scheduled_notifications` e agrupa em `notification_digests` (`supabase/functions/send-notification/index.ts:50-99,136-175`). Porém **nenhum** código invoca `send-notification`: a única ocorrência fora da própria função é o manifesto `supabase/functions/_shared/edge-authz-manifest.ts:105`. Nenhum worker ou cron lê `scheduled_notifications` ou `notification_digests` para entregar; só a listagem em `src/hooks/useNotificationOmnichannel.ts:9-54` e a gravação na Edge. O "envio imediato" grava `notification_logs` com `channel: 'push'` e `execution_time_ms: 0` sem enviar push (`send-notification/index.ts:107-134`). As preferências são editáveis na UI (`src/components/settings/NotificationPreferences.tsx:36-64`) e `send-digest` lê `workspace_notifications`, não `notification_digests`.
- O que falta: rotear os eventos de negócio por `send-notification`, criar o worker agendado que despacha `scheduled_notifications` e `notification_digests` vencidos, e registrar o canal real.
- Impacto no negócio: quem configura "Não perturbe" ou "Resumo diário" acha que está protegido, mas a configuração é ignorada e as notificações adiadas nunca chegam.
- Esforço: M
- Prioridade: P1

### DB-23  Web Push, SMS e WhatsApp
- Status: NAO_INICIADA
- Origem: `supabase/migrations/005_push_subscriptions.sql:5`; `20251227100003_push_subscriptions.sql:4`; `20260504210817_…sql:1-9` (`notification_channels`: email/push/whatsapp/sms); `supabase/migrations/003_notification_templates.sql:5,21,43`; `docs/NOTIFICATION_SYSTEM.md:96-98`
- Evidência: `push_subscriptions` não existe no banco vivo (2 migrations sem ledger, "bloqueada por dependência ausente" na triagem de 22/09). `notification_channels`, `notification_templates`, `webhook_configs` e `webhook_logs` estão vivas sem nenhum uso. Não há `PushManager`, VAPID nem Twilio em `src/` ou `supabase/functions/` (grep vazio). `usePushNotifications.tsx` só usa Realtime + Notification API do navegador.
- O que falta: decisão de canais, assinatura Web Push (tabela + service worker), provedores SMS/WhatsApp, templates e remoção das tabelas legadas do pacote 003.
- Impacto no negócio: aprovações e status de pedido não chegam ao celular do gestor ou comprador fora do portal.
- Esforço: G
- Prioridade: P2

### DB-24  RPCs de notificação duplicadas e não usadas
- Status: ORFA
- Origem: `supabase/migrations/004_notification_functions.sql:6,41,54,67`; redefinidas em `20260312110229_71c6cfbf-…sql:56,91,104,117`; `20260503151554_c98e739b-…sql:35` (`send_notification` SQL)
- Evidência: `is_dnd_active`, `mark_notification_read`, `mark_all_notifications_read`, `get_unread_count` e `send_notification` estão vivas e não têm `.rpc()`, chamada por outra função, policy nem cron. A lógica de DND foi reescrita em TypeScript (`send-notification/index.ts:62-76`).
- O que falta: usar as RPCs (contagem de não lidas, marcar como lidas) ou removê-las.
- Impacto no negócio: baixo; manutenção dupla da regra de "Não perturbe".
- Esforço: P
- Prioridade: P3

### DB-25  Assinaturas Realtime sem publicação correspondente
- Status: PARCIAL
- Origem: `src/components/admin/DiscountApprovalHeaderBadge.tsx:20`; `src/hooks/useKitCollaboration.ts:107`; `src/services/sicoob/commonService.ts:17-24`; `src/hooks/useCustomKitsRealtime.ts:21`; `src/components/intelligence/RealtimeBadge.tsx:19,22`; `src/hooks/usePushNotifications.tsx:126,147`
- Evidência: as migrations só adicionam à publicação `supabase_realtime` as tabelas `notifications`, `orders`, `password_reset_requests`, `integration_credentials` e `workspace_notifications` (esta adicionada e removida duas vezes). `discount_approval_requests`, `kit_comments` e `kit_variants` foram removidas explicitamente (`20260419024928_…sql:1-3`), e o check de hardening **exige** que continuem fora (`20261008010000_fix_plpgsql_lint_failures.sql:655-660`). `sicoob_orders`, `custom_kits`, `product_views`, `search_analytics`, `device_login_notifications` e `login_attempts` nunca foram adicionadas por migration. O estado vivo da publicação não está versionado; se mudou pelo painel, a conferência cabe ao orquestrador.
- O que falta: decidir caso a caso entre publicar (com RLS adequada) e trocar por polling, e alinhar o check de hardening com as telas.
- Impacto no negócio: o selo de "aprovação de desconto pendente", os comentários colaborativos de kit e a lista de pedidos Sicoob não atualizam sozinhos; o usuário precisa recarregar.
- Esforço: P
- Prioridade: P2

### Auditoria

### DB-26  Log de acesso a dados sensíveis (LGPD)
- Status: NAO_INICIADA
- Origem: `supabase/migrations/20260503210856_c31b8c3b-…sql:1-18` ("Tabela de Logs de Acesso a Dados Sensíveis (Column-Level Audit)")
- Evidência: `sensitive_access_logs` está viva e não tem escritor nem leitor (nenhuma função, trigger ou código) (`orfaos_banco_20260917.md:23`).
- O que falta: definir quais dados são sensíveis (CPF/CNPJ, contatos), registrar o acesso (RPC ou view com log) e criar a tela para o encarregado (DPO).
- Impacto no negócio: em fiscalização LGPD, não há como responder quem consultou os dados pessoais de um cooperado.
- Esforço: M
- Prioridade: P2

### DB-27  Trilhas de auditoria gravadas sem tela de consulta
- Status: PARCIAL
- Origem: `20260503210523_c20e48ce-…sql:81` (`admin_config_audit`); `20260425214848_66d5769e-…sql:2` (`mcp_access_violations`); `20260927220000_sicoob_institutional_invitations.sql:56` (`sicoob_invitation_events`); `20260912190000_sicoob_consolidation_distribution.sql:48` (`sicoob_delivery_receipt_events`); `20260424213841_…sql:25` (`optimization_queue_runs`); `20260425212807_…sql:81` (view `v_full_scope_grants`)
- Evidência: as tabelas são escritas por trigger ou RPC (`fn_audit_config_change` em `user_roles`, `record_mcp_access_violation`, `issue/accept/revoke_sicoob_invitation`, `record_sicoob_delivery_receipt`, `complete_optimization`), mas não têm nenhum `.from()` de leitura. A view `v_full_scope_grants` tem proposta de card pronta (`etapa26_views_auditoria_20260917.md`) não implementada.
- O que falta: abas de histórico em Convites, Consolidação e Segurança (concessões de escopo total, violações MCP, mudanças de papel).
- Impacto no negócio: a auditoria existe no banco, mas ninguém do negócio consegue consultá-la sem pedir SQL ao desenvolvedor.
- Esforço: M
- Prioridade: P3

### DB-28  Painel de saúde de segurança com status fixo
- Status: STUB/MOCK
- Origem: `supabase/migrations/20260503210523_c20e48ce-…sql:23` (`audit_all_rls_compliance`); `20261008010000_fix_plpgsql_lint_failures.sql:159-178` (`check_security_health`)
- Evidência: `check_security_health` devolve `'system_status', 'SECURE'` fixo (`:175`) e lê `qa_rls_audits`, que só é preenchida por `audit_all_rls_compliance`, uma função sem chamador, sem cron e sem uso em scripts. Por isso `rls_health` sai sempre 0 ou desatualizado. Nenhuma das duas é chamada pelo app.
- O que falta: agendar a auditoria de RLS, calcular o status em vez de fixá-lo e ligar a uma tela, ou remover.
- Impacto no negócio: um relatório de "sistema seguro" que não mede nada pode dar falsa garantia em auditoria.
- Esforço: P
- Prioridade: P3

### Segurança/RBAC

### DB-29  Helpers semânticos de RBAC não adotados e papéis legados não removidos
- Status: PARCIAL
- Origem: `docs/RBAC_HELPERS.md:5-19,24-30` ("Toda nova policy deve usar…", "fonte única de verdade", "* legado — papéis serão removidos do enum em onda futura")
- Evidência: `can_view_audit_logs`, `can_view_telemetry`, `can_view_connections` e `can_manage_connections` são definidas só em `20260426103109_16f8c3dc-…sql:8-67`, e **nenhuma** policy das 577 migrations as usa (grep `can_view_telemetry(` só retorna a definição). Elas aparecem apenas como string em `src/lib/rbac/route-matrix.ts`. O enum ainda tem `admin` e `manager` (`types.ts:12969-12978`), e o README cita "3 papéis: admin, manager, vendedor" (`README.md:235`). Há helpers duplicados sem uso: `is_seller_only`, `get_user_role` (Apêndice B).
- O que falta: migrar as policies de telemetria, conexões e auditoria para os helpers, executar a "onda" de remoção de `admin` e `manager` (já existe infraestrutura `role_migration_batches`) e eliminar os helpers redundantes.
- Impacto no negócio: as regras de acesso continuam espalhadas e dependentes de papéis antigos; mudar um perfil exige revisar dezenas de policies.
- Esforço: M
- Prioridade: P2

### DB-30  Login por passkey (WebAuthn)
- Status: STUB/MOCK
- Origem: `supabase/migrations/20251231124614_527fd53c-…sql:1-30` (`user_passkeys`); `docs/AUTH_PASSKEYS.md:5-8` ("[x] Registro de credenciais no banco `user_passkeys`")
- Evidência: `user_passkeys` não existe no banco vivo (sem ledger; "bloqueada por dependência" na triagem de 22/09). `src/hooks/useWebAuthn.ts:17-31` devolve `indisponivel` (sempre `false`) para registrar, verificar e excluir passkey, mas `PasskeyLogin.tsx` e `PasskeyManager.tsx` continuam no código. O documento marca como feito o que não existe.
- O que falta: tabela, Edge de *challenge*/verificação (`@simplewebauthn/server`) e a correção do documento, ou retirar os componentes.
- Impacto no negócio: login sem senha anunciado não funciona; se a tela aparecer, o usuário vê opção morta.
- Esforço: M
- Prioridade: P3

### DB-31  Step-up para promover/rebaixar dev e rotacionar/revogar segredos
- Status: PARCIAL
- Origem: `supabase/migrations/20260425203103_eec2662c-…sql:7` (enum `step_up_action` com `promote_dev`, `demote_dev`, `secret_rotation`, `secret_revoke`)
- Evidência: esses 4 valores só aparecem na união de tipos (`src/hooks/useStepUpAuth.ts:8-15`, `supabase/functions/step-up-verify/index.ts:22`). Nenhum fluxo solicita step-up com eles; só `mcp_*` é usado (`McpTab.tsx:70`, `IssueMcpKeyForm.tsx:347`, `RotateMcpKeyDialog.tsx:53,64`). `supabase/functions/secrets-manager/index.ts` grava `secret_rotation_log` (`:346`) sem nenhuma verificação de step-up (grep `step` sem resultado relevante).
- O que falta: exigir desafio MFA (step-up) na rotação/revogação de segredos e na promoção/rebaixamento de dev.
- Impacto no negócio: uma sessão sequestrada de administrador pode trocar segredos de integração sem reautenticação.
- Esforço: P
- Prioridade: P2

### DB-32  Checks de hardening dependem de job inexistente e de MFA "assumido"
- Status: STUB/MOCK
- Origem: `supabase/migrations/20260419120255_fabedf0c-…sql:44,84` (`check_hardening_status`); `20261008010000_fix_plpgsql_lint_failures.sql:630,670-677` (`notify_hardening_regression`) e `:1571,1610-1616` (`snapshot_hardening_status`)
- Evidência: as três funções exigem `cron.job` com `jobname = 'cleanup-security-logs-daily'`, mas o job foi agendado como `'cleanup-security-logs'` (`20260916120000_admin_audit_log_operations.sql:94`) e nenhuma migration usa o nome esperado. As três somam 1 ponto fixo: "MFA enforced em app — assumido sempre true" (`:675`, `:1615`). O card (`src/components/admin/security/HardeningHealthCard.tsx:62`), o snapshot diário (`snapshot-hardening-daily`) e o alerta diário aos admins (`hardening-regression-check-daily`) usam essas funções.
- O que falta: alinhar o nome do job (ou consultar pelo comando) e medir MFA de verdade (por exemplo, fatores verificados de admin/dev em `auth.mfa_factors`).
- Impacto no negócio: o painel de segurança mostra falha permanente, o que gera alarme diário a admins e acostuma a ignorar alertas, e ao mesmo tempo dá ponto de MFA sem conferir.
- Esforço: P
- Prioridade: P2

### DB-33  Seed e provisionamento de cenários QA fictícios
- Status: STUB/MOCK
- Origem: `supabase/migrations/20260503213627_e07b8683-…sql:49-62`
- Evidência: `provision_qa_accounts()` devolve `{'status':'ready'}` fixo e `seed_qa_scenario(scenario_name)` devolve `{'status':'success'}` fixo, sem gravar nada. `seed_qa_scenario` é chamada pela tela de Preflight (`src/lib/qa-seed.ts:20`, importada em `src/pages/admin/qa/PreflightPage.tsx:19`).
- O que falta: implementar o seed real (ou chamar a Edge `sicoob-seed-qa`) ou remover o botão.
- Impacto no negócio: a equipe de QA vê "cenário criado com sucesso" quando nada foi criado, e os testes rodam sobre dados inexistentes.
- Esforço: P
- Prioridade: P3

### DB-34  Processador de exportação v3 marca job concluído sem gerar arquivo
- Status: STUB/MOCK
- Origem: `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql:724-765` (`process_export_queue_v3`)
- Evidência: a função percorre `export_jobs` pendentes, grava `audit_log` e define `status = 'completed'` (`:759`) sem produzir arquivo. Não tem chamador nem cron; o worker real é `dispatch_sicoob_export_worker` → Edge `process-batch-export` (`20260923111000_schedule_secure_export_worker.sql:78`). Continua `EXECUTE`-ável no banco vivo.
- O que falta: remover a função (ou revogar `EXECUTE`).
- Impacto no negócio: se alguém a chamar por engano, os pedidos de exportação aparecem como prontos e o arquivo nunca existe.
- Esforço: P
- Prioridade: P3

### Multi-tenant

### DB-35  Isolamento multi-tenant por `organization_id` prometido e não implementado
- Status: PARCIAL
- Origem: `README.md:244` ("Multi-tenancy via `organization_id` com isolamento completo"); `docs/03_ARQUITETURA_DO_SISTEMA.md:10,23,134-170,254-275`; `docs/04_EXPLICACAO_DAS_POLICIES.md:41-106`; `docs/05_ROADMAP_PROXIMOS_PASSOS.md:14`
- Evidência: só 4 das 240 relações tipadas têm `organization_id`: `quotes`, `orders` e `order_items` (anulável, `20260404160306_…sql:3,7,11`) e `organization_members` (`cols.mjs`). Os helpers documentados `user_is_org_member`, `is_org_admin` e `is_org_owner_or_admin` e a tabela `user_organizations` só existem em `supabase/migrations_archive/2025/*` (0 ocorrências em `supabase/migrations`). `is_org_member` está viva e órfã (Apêndice B). `organizations` não tem vínculo com `cooperativas` (colunas: `id, name, slug, settings…`). Coleções, kits, mockups, favoritos, carrinhos, notificações e IA (`collections`, `custom_kits`, `generated_mockups`, `favorite_lists`, `seller_carts`, `workspace_notifications`, `expert_conversations`) são isoladas só por usuário. O isolamento Sicoob real é feito por `cooperativa_id`/`pa_id` em ~19 tabelas.
- O que falta: decidir o modelo oficial de tenant (organização × cooperativa), propagar a coluna e as policies às tabelas de negócio ou reescrever a documentação para refletir o isolamento por cooperativa/PA.
- Impacto no negócio: a promessa de "isolamento completo" vendida a uma segunda organização ou cooperativa não é verdade para várias áreas do portal; é risco contratual e de vazamento entre clientes.
- Esforço: G
- Prioridade: P2

### IA

### DB-36  Colaboração no Magic Up (comentários, reações, links públicos)
- Status: NAO_INICIADA
- Origem: `supabase/migrations/20260420185009_19ba5060-…sql:53,63,74`
- Evidência: `magic_up_comments`, `magic_up_reactions` e `magic_up_public_shares` estão vivas com zero uso (`docs/execucao/evidencias/etapa24_magic_up_20260917.md`). A decisão está pendente em `decisoes_pendentes.md:46-47`.
- O que falta: UI de colaboração ou remoção.
- Impacto no negócio: as peças geradas por IA não podem ser comentadas nem aprovadas por link pelo cliente.
- Esforço: M
- Prioridade: P3

### DB-37  Expurgo do cache de insights de IA
- Status: NAO_INICIADA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1266` ("expira em 24h. Limpeza diária via `pg_cron` (`cleanup-ai-insights-cache`, 03:00)")
- Evidência: `ai_insights_cache` foi criada em `20260418131950_ac0f8ad7-…sql:2` e é usada (`supabase/functions/market-intelligence-insights/index.ts:226,363`), mas não existe nenhum `cron.schedule` com esse nome nem `DELETE FROM ai_insights_cache` nas migrations.
- O que falta: função de expurgo e job.
- Impacto no negócio: baixo; a tabela cresce indefinidamente e o documento promete uma rotina inexistente.
- Esforço: P
- Prioridade: P3

### Integrações

### DB-38  Monitoramento de entrega de webhooks com alerta
- Status: PARCIAL
- Origem: `docs/OBSERVABILITY.md:66-74,124` ("Cron Sentry/cronjob externo pode rodar `get_webhook_delivery_summary(15)`", "Webhook Alerts → Sentry … via cron job"); `supabase/migrations/20260427122230_9848331f-…sql:8,63`
- Evidência: `webhook_delivery_metrics` é alimentada e lida pela tela de saúde via `get_app_health_summary` e `lookup_request_id`, mas `get_webhook_delivery_summary` não tem chamador nem cron, e nenhum job de alerta existe nas migrations.
- O que falta: job de alerta de 5xx (pg_cron → Edge → Sentry/Slack) ou monitor externo documentado.
- Impacto no negócio: falha de integração (Bitrix, n8n) só é percebida quando o cliente reclama.
- Esforço: P
- Prioridade: P3

### Cron/jobs

### DB-40  Rotinas documentadas como agendadas sem `cron.schedule`
- Status: PARCIAL
- Origem: `docs/plano-implementacao/plano-reconciliacao-50-etapas.md:597-606` (Etapa 43 "⏳ parcial": `cleanup-notifications`, `quote-followup-reminders`, `process-scheduled-reports`, `monthly-health-report` "nunca rodam (cron = 0)"); `docs/EDGE_FUNCTIONS.md:20-21,45-46,52` ("Job pg_cron" para `cleanup-notifications`, `cleanup-novelties`, `process-queue`, `process-scheduled-reports`, `send-digest`); cabeçalhos "cron diário" em `favorites-watcher/index.ts:3`, `collections-watcher/index.ts:3`, `comparison-price-watcher/index.ts:4` e `ownership-audit/index.ts:6`; "every 15min" em `connections-health-check/index.ts:3`
- Evidência: os 24 jobs agendados no repositório estão listados na tabela abaixo, e nenhum chama essas Edges. `supabase/cron/cron-config.sql:12-64` agenda `process-notification-queue`, `send-daily-digest` e `cleanup-old-notifications` (Edge), mas **não é migration**. Esse arquivo usa `current_setting('app.supabase_service_role_key')`, padrão já substituído pelo Vault (`dispatch_sicoob_*`), e o nome `cleanup-old-notifications` colide com o job SQL de `20260916120000…sql:92`. Nenhuma dessas Edges é chamada pelo front (grep sem resultado). A tela `src/components/reports/ScheduledReportsManager.tsx` (via `useScheduledReports.ts`) permite criar relatório agendado, e `send-scheduled-reports/index.ts:51-54` só registra "Would send" quando não há `RESEND` configurado. A evidência de 23/09 (`docs/evidencias/aplicacao-migrations-20260923/estado-final.json`) lista apenas `process-export-queue`; a consulta parece filtrada.
- O que falta: criar despachantes via Vault (padrão `dispatch_sicoob_*`) e jobs para `process-scheduled-reports`/`send-scheduled-reports`, `quote-followup-reminders`, watchers de preço (após DB-05), `send-digest` (após DB-22), `monthly-health-report`, `ownership-audit` e `connections-health-check`; remover `supabase/cron/cron-config.sql` e `cleanup-novelties` (410, desativada).
- Impacto no negócio: relatórios agendados pelo gestor nunca chegam, lembretes de follow-up de proposta não disparam e o vendedor perde negócios esquecidos.
- Esforço: M
- Prioridade: P1

Jobs `pg_cron` efetivamente agendados nas migrations (estado final do repositório):

| Job | Agenda | Ação | Migration |
|---|---|---|---|
| hardening-regression-check-daily | `0 4 * * *` | `notify_hardening_regression()` (ver DB-32) | `20260419121414_…sql:102` |
| snapshot-hardening-daily | `5 4 * * *` | `snapshot_hardening_status()` (ver DB-32) | `20260419125044_…sql:206` |
| auto-block-extreme-offenders | `*/15 * * * *` | `auto_block_extreme_offenders()` | `20260419125044_…sql:212` |
| webhook-retry-failed | `*/10 * * * *` | `retry_failed_webhook_deliveries()` | `20260419132122_…sql:144` |
| webhook-logs-cleanup-daily | `30 3 * * *` | `cleanup_webhook_logs()` (**duplicado** com `cleanup-webhook-logs`) | `20260419132122_…sql:159` |
| auto-revoke-orphan-mcp-full-keys | `*/15 * * * *` | `auto_revoke_orphan_full_keys()` | `20260426122751_…sql:160` |
| audit-sicoob-rls | `0 0 * * *` | `audit_sicoob_rls_policies()` | `20260502151242_…sql:78` |
| ensure-admin-audit-log-partitions | `0 3 1 * *` | `ensure_admin_audit_log_partitions()` | `20260916120000_…sql:73` |
| cleanup-rate-limits | `0 * * * *` | `cleanup_rate_limits()` | `20260916120000_…sql:80` |
| cleanup-expired-step-up | `*/15 * * * *` | `cleanup_expired_step_up()` | `:82` |
| cleanup-expired-collection-trash | `0 3 * * *` | `cleanup_expired_collection_trash()` | `:86` |
| cleanup-expired-favorite-trash | `10 3 * * *` | `cleanup_expired_favorite_trash()` | `:88` |
| cleanup-expired-public-comparisons | `20 3 * * *` | `cleanup_expired_public_comparisons()` | `:90` |
| cleanup-old-notifications | `30 3 * * *` | `cleanup_old_notifications()` — limpa `notifications`, **não** `workspace_notifications` | `:92` |
| cleanup-security-logs | `40 3 * * *` | `cleanup_security_logs()` | `:94` |
| cleanup-webhook-logs | `50 3 * * *` | `cleanup_webhook_logs()` | `:96` |
| cleanup-discount-test-data | `10 4 * * *` | `cleanup_discount_test_data()` (limpeza de dado de teste em produção) | `:100` |
| sicoob-approval-outbox-worker | `* * * * *` | `dispatch_sicoob_approval_worker()` | `20260922224300_…sql:58` |
| sicoob-materialize-overdue-payments | `17 * * * *` | `mark_overdue_sicoob_payments()` | `20260922225200_…sql:61` |
| sicoob-approval-outbox-retention | `23 3 * * *` | `archive_sicoob_approval_deliveries()` | `20260922225300_…sql:245` |
| sicoob-approval-outbox-monitor | `*/2 * * * *` | `monitor_sicoob_approval_worker()` | `20260922225500_…sql:99` |
| process-export-queue | `* * * * *` | `dispatch_sicoob_export_worker()` | `20260923111000_…sql:78` |
| external-db-bridge-keepalive | `*/4 * * * *` | `dispatch_sicoob_external_db_keepalive()` | `20260923140000_…sql:111` |
| connections-auto-test | `*/15 * * * *` | `dispatch_sicoob_connections_auto_test()` | `20260923140000_…sql:122` |

Jobs removidos: `archive-old-admin-audit-logs` e `trim-connection-test-history` (`20261007212428_…sql:9-15`), `web-vitals-regression-check-daily` (`20260417171441_…sql:5`). Jobs citados em documentos e inexistentes: `cleanup-security-logs-daily` (DB-32), `cleanup-ai-insights-cache` (DB-37), `process-notification-queue`, `send-daily-digest` (só em `supabase/cron/cron-config.sql`), `audit-partitions` (`plano-reconciliacao-50-etapas.md:572`; existe com outro nome), além das Edges da Etapa 43 acima.

### DB-41  Política de retenção de dados incompleta
- Status: PARCIAL
- Origem: `docs/plano-implementacao/plano-reconciliacao-50-etapas.md:587-596` (Etapa 42: retenção `telemetry_events` 90d, `login_attempts` 180d, `query_telemetry` 30d, `rls_denial_log` 180d, `bot_detection_log` 90d, `request_rate_limits` 7d, `public_token_failures` 90d; função `purge_expired_rows()` em lotes)
- Evidência: `purge_expired_rows` não existe em nenhuma migration. As limpezas existentes cobrem `request_rate_limits`, `bot_detection_log`, `public_token_failures`, `admin_audit_log` (365d), `ip_access_control`, `notifications`, `webhook_deliveries` e `inbound_webhook_events` (`cleanup_security_logs` em `20260419120255_…sql:2`, `cleanup_rate_limits` em `20260416183342_…sql:133`, `cleanup_webhook_logs` em `20260419132122_…sql:96`). Não há expurgo de `telemetry_events` (a maior tabela, segundo o plano), `query_telemetry`, `login_attempts`, `rls_denial_log`, `workspace_notifications` (a caixa de entrada real), `ai_insights_cache`, `ai_usage_logs`, `product_views`, `search_analytics`, `voice_command_logs` e `webhook_delivery_metrics`.
- O que falta: a função de expurgo em lotes e os jobs por tabela, com a política documentada.
- Impacto no negócio: custo de banco crescente, consultas lentas com o tempo e retenção de dado pessoal (logins, IPs) além do necessário pela LGPD.
- Esforço: M
- Prioridade: P2

### DB-42  Decisões de arquitetura pendentes sobre objetos de schema
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/execucao/decisoes_pendentes.md:34-47` (white-label/`companies`, `roles`, `user_2fa_settings`, `personalization_techniques`, remoção de `pontos_atendimento`/`singulares`/`pa_singularidades`/`blog_posts`/buckets, Magic Up colaborativo)
- Evidência: as decisões estão registradas como "pergunta" ou "decisão de alguém aprovar", sem responsável nem data. `scripts/db/.check-runtime-refs-allowlist.json:1-21` continua com entradas de 17/09 já obsoletas: `bitrix_*`, `create_quote_version_atomic`, `check_rls_enabled` e `get_enum_values` existem hoje no banco vivo, e `roles`, `sicoob_budgets`, `user_2fa_settings`, `personalization_techniques`, `error_logs`, `mockup-assets`, `personalization` e `set_config` não são mais referenciados pelo cliente interno. A própria allowlist manda "Remover a entrada daqui assim que a etapa correspondente fechar". A matriz RLS registra lacunas conhecidas sem decisão: admin não enxerga `collections` e `magic_up_campaigns` alheias ("Se for política do produto, manter; senão, adicionar policy", `docs/security/RLS_MATRIX.md:51,80,163`).
- O que falta: dono de produto decidir (manter, construir ou remover), limpar a allowlist e fechar as lacunas da matriz RLS.
- Impacto no negócio: o schema acumula tabelas sem dono, e cada auditoria repete a mesma análise.
- Esforço: P
- Prioridade: P3

### DB-43  IDs reciclados do `pg_net` colidem com a constraint global da outbox
- Status: CONCLUIDA — migration aplicada e validada no banco canônico em 15/10/2026; este merge incorpora ao repositório a correção já ativa.
- Evidência em runtime: a consulta administrativa ao banco canônico em 15/10 confirmou execuções do cron `sicoob-approval-outbox-worker` falhando com `duplicate key value violates unique constraint "sicoob_approval_worker_dispatches_request_id_key"`. A tabela continha 19.933 disparos, com `UNIQUE(request_id)` global, embora o `pg_net` tenha reutilizado IDs. Após a correção, 38/38 migrations allowlisted constam no ledger, o índice parcial é usado pelo plano e as 12 execuções mais recentes de worker/monitor terminaram com sucesso, sem disparos pendentes há mais de três minutos.
- Causa: IDs de transporte não são identificadores históricos estáveis. Ao reutilizar um ID, o `INSERT` do worker falha; remover a constraint sem mudar a associação do monitor também poderia ligar a resposta ao disparo histórico errado.
- Correção preparada: `supabase/migrations/20261015102000_fix_pg_net_recycled_request_ids.sql` remove a unicidade global e correlaciona a primeira resposta com o disparo pendente mais recente cujo horário antecede a resposta. Depois, marca disparos pendentes mais antigos com o mesmo ID como `timed_out`, para a resposta já consumida não ser reutilizada em outro ciclo; os demais sem resposta mantêm o timeout de dois minutos.
- Limite observado: `job startup timeout` também apareceu em outros crons no mesmo intervalo e é tratado como falha separada do scheduler, não como efeito desta constraint.
- Referência de execução: [Correção do monitor do worker de aprovações — 15/10/2026](../correcao-worker-aprovacoes-pgnet-2026-10-15.md).
- Impacto: execuções do cron abortadas e associação de respostas ambígua quando o transporte recicla IDs.
- Esforço: M
- Prioridade: P1

## Apêndice A: tabelas/views criadas e não usadas (nome | migration | usos encontrados)

Critério: "uso" = `.from('x')`, `untypedFrom('x')` ou `postgres_changes` com `table: 'x'` em `src/**` ou `supabase/functions/**`, excluídos testes e `types.ts`. "Menção textual" = o nome aparece em string ou comentário sem chamada. Tabelas acessadas apenas por RPC `SECURITY DEFINER` foram marcadas como **internas** (não são lacuna). Partições `admin_audit_log_y*`/`_default` foram omitidas (acesso via tabela-mãe). Resumo: 49 vivas sem uso direto (33 órfãs e 16 internas) e 46 criadas em migration e ausentes do banco.

### A.1 — Existem no banco vivo (snapshot 08/10/2026) e não têm `.from()`/realtime em `src/` nem `supabase/functions/`

| Nome | Migration de criação | Usos encontrados | Classificação |
|---|---|---|---|
| `notification_templates` | `003_notification_templates.sql:5` | menção textual: supabase/functions/_shared/external-db-config.ts | ÓRFÃ — Legado do pacote 003 (omnichannel); sem leitor/escritor |
| `webhook_configs` | `003_notification_templates.sql:21` | nenhum | ÓRFÃ — Legado 003; substituída por outbound_webhooks |
| `webhook_logs` | `003_notification_templates.sql:43` | nenhum | ÓRFÃ — Legado 003; só limpeza; substituída por webhook_deliveries |
| `mockup_templates` | `20260216125012_7b8dd710-0052-45ad-958d-c05507520f35.sql:3` | nenhum | ÓRFÃ — Templates de mockup nunca ligados à UI |
| `component_media` | `20260325152410_9454cf25-f255-46f5-8756-000d4bfb17ef.sql:8` | nenhum | ÓRFÃ — UI usa kit_component_media do catálogo externo (kit-components/api.ts:103) |
| `magic_up_comments` | `20260420185009_19ba5060-cb2d-4030-82d6-dc64b8365cee.sql:53` | nenhum | ÓRFÃ — Colaboração Magic Up nunca iniciada |
| `magic_up_reactions` | `20260420185009_19ba5060-cb2d-4030-82d6-dc64b8365cee.sql:63` | nenhum | ÓRFÃ — idem |
| `magic_up_public_shares` | `20260420185009_19ba5060-cb2d-4030-82d6-dc64b8365cee.sql:74` | nenhum | ÓRFÃ — idem |
| `optimization_queue_runs` | `20260424213841_362def7e-d8f7-4853-8e49-b6195611d178.sql:25` | SQL: fn:complete_optimization | ÓRFÃ — Escrita por complete_optimization; sem tela de histórico |
| `mcp_full_grantors` | `20260425201131_83f9ad4a-ea3e-4bed-ac5e-5bdbd1af3316.sql:2` | SQL: fn:can_grant_mcp_full; menção textual: src/components/admin/connections/IssueMcpKeyForm.tsx, src/components/admin/security/keys/useCanGrantMcpFull.ts | interna (não é lacuna) — Lida só via RPC can_grant_mcp_full (interna) |
| `mcp_access_violations` | `20260425214848_66d5769e-6e89-4d0d-b49b-c44d1dd2285b.sql:2` | SQL: fn:check_mcp_abuse_threshold, fn:record_mcp_access_violation, fn:audit_ownership_orphans | ÓRFÃ — Escrita por record_mcp_access_violation; sem tela |
| `e2e_cleanup_rate_limit` | `20260426200011_1f6f92f7-035d-49de-a218-78241e85c1ba.sql:36` | SQL: fn:e2e_cleanup_check_rate_limit | interna (não é lacuna) — Interna (rate limit do e2e-cleanup via RPC) |
| `webhook_delivery_metrics` | `20260427122230_9848331f-fc90-4721-bf9e-caf78ba9cbfd.sql:8` | SQL: fn:get_webhook_delivery_summary, fn:get_app_health_summary, fn:lookup_request_id; menção textual: src/pages/admin/telemetry/useAppHealth.ts | interna (não é lacuna) — Lida via RPCs get_app_health_summary/lookup_request_id (ok); get_webhook_delivery_summary órfã |
| `cooperativa_budgets` | `20260502143127_cebe731a-273c-4205-8836-c8819504e437.sql:51` | menção textual: supabase/functions/migration-health-check/index.ts | ÓRFÃ — Verba por cooperativa nunca usada (só pa_budgets) |
| `sicoob_performance_reports` | `20260502151402_c816c4fa-276c-4f9d-a7b7-67de502541b7.sql:2` | SQL: fn:generate_sicoob_performance_report | ÓRFÃ — Só escrita por função-stub sem chamador |
| `order_logistics_tracking` | `20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql:52` | nenhum | ÓRFÃ — Rastreio de pedido genérico nunca ligado |
| `order_payments` | `20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql:136` | nenhum | ÓRFÃ — Pagamentos de pedido genérico nunca ligados |
| `order_template_items` | `20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql:272` | menção textual: src/services/OrderService.ts | ÓRFÃ — Só embed de leitura em OrderService.ts:337; nunca escrita |
| `quote_consolidations` | `20260503151802_66e34da7-26a1-48ad-9049-b6917090d394.sql:21` | SQL: fn:consolidate_sicoob_quotes | interna (não é lacuna) — Interna da RPC consolidate_sicoob_quotes; sem listagem |
| `singulares` | `20260503172408_b6bcb7cb-1200-49a2-b9b0-dc21b8b22cce.sql:16` | menção textual: src/components/auth/QuickTestLogin.tsx, src/components/layout/SidebarReorganized.tsx | ÓRFÃ — Família legada (usa-se cooperativas/postos_atendimento) |
| `telemetry_logs` | `20260503172408_b6bcb7cb-1200-49a2-b9b0-dc21b8b22cce.sql:113` | nenhum | ÓRFÃ — Redundante com telemetry_events |
| `pa_singularidades` | `20260503175512_115f0a9c-0f07-4475-8cb2-753fe80adc2e.sql:24` | nenhum | ÓRFÃ — idem |
| `pontos_atendimento` | `20260503175512_115f0a9c-0f07-4475-8cb2-753fe80adc2e.sql:44` | nenhum | ÓRFÃ — idem |
| `qa_rls_audits` | `20260503210523_c20e48ce-121f-47b6-b504-857d41593aa1.sql:2` | SQL: fn:audit_all_rls_compliance, fn:check_security_health | ÓRFÃ — Só escrita por audit_all_rls_compliance (sem chamador) |
| `admin_config_audit` | `20260503210523_c20e48ce-121f-47b6-b504-857d41593aa1.sql:81` | SQL: fn:fn_audit_config_change, fn:check_security_health | ÓRFÃ — Escrita por trigger em user_roles; sem tela |
| `sensitive_access_logs` | `20260503210856_c31b8c3b-7810-4295-b4ec-89988b27b0b4.sql:2` | nenhum | ÓRFÃ — Auditoria LGPD de acesso nunca escrita |
| `blog_posts` | `20260504190214_5806e636-cde8-4736-baba-e52cd3770c3c.sql:2` | nenhum | ÓRFÃ — CMS blog sem rota/tela |
| `portfolio_items` | `20260504190237_f7e4591a-7424-4b8e-ad8d-e981c79605c0.sql:2` | nenhum | ÓRFÃ — CMS portfólio sem rota/tela |
| `notification_channels` | `20260504210817_51f845c9-9fdc-4ed2-892a-4a1bd1607dff.sql:2` | nenhum | ÓRFÃ — Canais omnichannel nunca configurados |
| `manager_notification_config` | `20260504211811_2c878015-23d1-40c7-8b0b-2a442cf2411e.sql:12` | nenhum | ÓRFÃ — Slack/e-mail de gestor nunca implementado |
| `quote_audit_logs` | `20260509175720_8b74bfb2-932d-477a-a121-c2a7d4914abf.sql:6` | SQL: fn:log_quote_action | ÓRFÃ — Par de log_quote_action (órfã) |
| `test_suites_runs` | `20260529193319_9305cf9b-52cf-477a-9ce2-8281a1450de9.sql:2` | nenhum | ÓRFÃ — Sem escritor/leitor |
| `sicoob_approval_policies` | `20260912120000_sicoob_approval_policy_guards.sql:5` | SQL: fn:get_sicoob_order_approval_policy | ÓRFÃ — Lida só por get_sicoob_order_approval_policy; sem tela/seed |
| `sicoob_reorder_requests` | `20260912170000_sicoob_reorder_atomic.sql:20` | SQL: fn:reorder_sicoob_order_as_quote, fn:get_sicoob_reorder_idempotency, fn:reorder_sicoob_order_as_quote_legacy_20260927 | interna (não é lacuna) — Interna (idempotência via RPC) |
| `order_consolidation_orders` | `20260912190000_sicoob_consolidation_distribution.sql:17` | SQL: fn:create_sicoob_order_consolidation, fn:allocate_sicoob_consolidation_by_order_pa, fn:dispatch_sicoob_order_consolidation; menção textual: src/pages/sicoob/GestorConsolidatedOrdersPage.tsx | interna (não é lacuna) — Interna das RPCs de consolidação |
| `sicoob_delivery_destinations` | `20260912190000_sicoob_consolidation_distribution.sql:25` | SQL: fn:sicoob_actor_can_receive_consolidation, fn:sicoob_actor_can_receive_destination, fn:allocate_sicoob_consolidation_by_order_pa; menção textual: src/pages/sicoob/GestorConsolidatedOrdersPage.tsx | interna (não é lacuna) — Interna das RPCs de consolidação |
| `sicoob_delivery_allocations` | `20260912190000_sicoob_consolidation_distribution.sql:35` | SQL: fn:allocate_sicoob_consolidation_by_order_pa, fn:dispatch_sicoob_order_consolidation, fn:record_sicoob_delivery_receipt; menção textual: src/pages/sicoob/GestorConsolidatedOrdersPage.tsx | interna (não é lacuna) — Interna das RPCs de consolidação |
| `sicoob_delivery_receipt_events` | `20260912190000_sicoob_consolidation_distribution.sql:48` | SQL: fn:protect_sicoob_consolidation_records, fn:record_sicoob_delivery_receipt | ÓRFÃ — Trilha escrita por RPC; sem tela |
| `sicoob_kit_quote_requests` | `20260912200000_sicoob_kit_quote_atomic.sql:11` | SQL: fn:create_sicoob_kit_quote, fn:get_sicoob_kit_quote_idempotency | interna (não é lacuna) — Interna (idempotência) |
| `quote_approval_evidence_keys` | `20260922225000_secure_public_quote_approval.sql:3` | SQL: fn:apply_local_quote_approval_response, fn:verify_quote_approval_signature, fn:rotate_quote_approval_evidence_key | interna (não é lacuna) — Interna (HMAC); rotação sem chamador |
| `sicoob_approval_delivery_archive` | `20260922225300_sicoob_approval_outbox_reconciliation.sql:7` | SQL: fn:archive_sicoob_approval_deliveries | interna (não é lacuna) — Interna (retenção via cron) |
| `sicoob_approval_worker_dispatches` | `20260922225500_monitor_sicoob_approval_worker.sql:3` | SQL: fn:dispatch_sicoob_approval_worker, fn:monitor_sicoob_approval_worker | interna (não é lacuna) — Interna (monitor via cron) |
| `sicoob_document_registry` | `20260922225600_sicoob_document_quarantine_gate.sql:7` | SQL: fn:validate_sicoob_order_document, fn:register_sicoob_clean_document | interna (não é lacuna) — Interna (quarentena via RPC) |
| `order_duplicate_requests` | `20260927200207_duplicate_order_atomic.sql:228` | SQL: fn:duplicate_order_atomic | interna (não é lacuna) — Interna (idempotência) |
| `sicoob_quote_reorder_requests` | `20260927210000_sicoob_reorder_catalog_validity.sql:59` | SQL: fn:get_sicoob_quote_reorder_idempotency, fn:reorder_sicoob_quote_as_quote | interna (não é lacuna) — Interna (idempotência via RPC) |
| `sicoob_invitation_events` | `20260927220000_sicoob_institutional_invitations.sql:56` | SQL: fn:issue_sicoob_invitation, fn:accept_sicoob_invitation, fn:revoke_sicoob_invitation | ÓRFÃ — Trilha escrita por RPC; sem tela |
| `quote_save_idempotency` | `20260928162048_quote_save_idempotency.sql:4` | SQL: fn:save_quote_atomic_idempotent | interna (não é lacuna) — Interna (idempotência) |
| `v_full_scope_grants` (view) | `20260425212807_54b0bb33-1b1f-47d7-a5d3-4409ca43bf80.sql:81` | nenhum | ÓRFÃ — View de auditoria proposta para AuditEvidenceDashboard; não ligada |
| `sicoob_budget_audit` (view) | `20260503214557_f7ee25b6-d301-487d-9004-564116dc4100.sql:67` | nenhum | ÓRFÃ — View de conciliação de verba; não ligada |

### A.2 — Criadas em migration do repositório e AUSENTES do banco vivo (migration nunca aplicada)

| Nome | Migration | Ledger | Usos no código |
|---|---|---|---|
| `push_subscriptions` | `005_push_subscriptions.sql:5` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `entity_versions` | `20241231000001_entity_versions.sql:2` | sem ledger | nenhum |
| `categories` | `20250102000000_gifts_production.sql:4` | sem ledger | 7 ref(s): supabase/functions/categories-api/index.ts:68, supabase/functions/categories-api/index.ts:91 |
| `suppliers` | `20250102000000_gifts_production.sql:16` | sem ledger | 3 ref(s): supabase/functions/expert-chat/index.ts:900, supabase/functions/expert-chat/index.ts:1033 |
| `products` | `20250102000000_gifts_production.sql:32` | sem ledger | 15 ref(s): src/components/admin/connections/DataSourceDebugTab.tsx:191, supabase/functions/categories-api/index.ts:174 |
| `personalization_techniques` | `20251214194907_a5a0f44d-0504-411d-842a-cb07597b6ed5.sql:5` | sem ledger | só menção: src/components/admin/MockupPromptManager.tsx, src/components/admin/hooks/useGroupPersonalization.ts |
| `personalization_locations` | `20251214201605_1110a792-a1c9-43b9-9832-4cd68610e0ab.sql:2` | sem ledger | nenhum |
| `personalization_sizes` | `20251214201605_1110a792-a1c9-43b9-9832-4cd68610e0ab.sql:12` | sem ledger | nenhum |
| `seller_gamification` | `20251215113936_0e13449e-e4f8-4811-8902-d69704923f5c.sql:2` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `achievements` | `20251215113936_0e13449e-e4f8-4811-8902-d69704923f5c.sql:16` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `seller_achievements` | `20251215113936_0e13449e-e4f8-4811-8902-d69704923f5c.sql:32` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `order_history` | `20251220141234_12ce9efd-dc19-41da-81d7-e7cd50562473.sql:74` | sem ledger | nenhum |
| `sync_jobs` | `20251227100005_sync_jobs.sql:2` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `user_filter_presets` | `20251227100007_user_filter_presets.sql:1` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `store_rewards` | `20251227170236_52049167-ddfd-492a-847c-55c74c36321a.sql:2` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `user_rewards` | `20251227170236_52049167-ddfd-492a-847c-55c74c36321a.sql:19` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `analytics_events` | `20251228100003_analytics_events.sql:5` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `audit_trail` | `20251228100004_audit_trail.sql:5` | sem ledger | nenhum |
| `cache_entries` | `20251228100005_cache_entries.sql:5` | sem ledger | nenhum |
| `feature_flags` | `20251228100006_feature_flags.sql:5` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `optimization_logs` | `20251228100007_optimization_logs.sql:5` | sem ledger | nenhum |
| `rate_limits` | `20251228100008_rate_limits.sql:5` | sem ledger | nenhum |
| `redis_config` | `20251228100009_redis_config.sql:5` | sem ledger | nenhum |
| `template_versions` | `20251228100010_template_versions.sql:5` | sem ledger | nenhum |
| `two_factor_secrets` | `20251228100011_two_factor_secrets.sql:5` | sem ledger | nenhum |
| `websocket_sessions` | `20251228100012_websocket_sessions.sql:5` | sem ledger | nenhum |
| `roles` | `20251231023800_2b909a8a-cd0f-484e-8abf-bc0656fe3b54.sql:3` | sem ledger | só menção: src/components/admin/security/role-migration/RoleMigrationPanel.tsx, src/components/admin/users/types.tsx |
| `user_2fa_settings` | `20251231024837_c924e1c3-b77f-4076-9cdc-195effdf6ea2.sql:2` | sem ledger | nenhum |
| `user_allowed_ips` | `20251231024837_c924e1c3-b77f-4076-9cdc-195effdf6ea2.sql:14` | sem ledger | nenhum |
| `user_passkeys` | `20251231124614_527fd53c-cfd4-4106-b454-fdc2ed3a708e.sql:2` | sem ledger | nenhum |
| `geo_allowed_countries` | `20251231130817_8aeff4f3-66df-41e0-a380-c7ffe3c03f96.sql:2` | sem ledger | só menção: supabase/functions/_shared/external-db-config.ts |
| `security_settings` | `20251231130817_8aeff4f3-66df-41e0-a380-c7ffe3c03f96.sql:27` | sem ledger | nenhum |
| `companies` | `20260108014732_22444765-aa2c-47b2-afb4-f942541d622d.sql:7` | sem ledger | 3 ref(s): supabase/functions/crm-db-bridge/index.ts:105, supabase/functions/expert-chat/index.ts:632 |
| `company_contacts` | `20260108014732_22444765-aa2c-47b2-afb4-f942541d622d.sql:74` | sem ledger | só menção: src/hooks/admin/useAuditLog.ts |
| `contact_phones` | `20260108014732_22444765-aa2c-47b2-afb4-f942541d622d.sql:115` | sem ledger | só menção: src/components/products/share/ShareContactSelector.tsx, src/components/quotes/CompanyContactSelector.tsx |
| `contact_emails` | `20260108014732_22444765-aa2c-47b2-afb4-f942541d622d.sql:128` | sem ledger | só menção: src/components/products/share/ShareContactSelector.tsx, src/components/quotes/CompanyContactSelector.tsx |
| `company_addresses` | `20260108014732_22444765-aa2c-47b2-afb4-f942541d622d.sql:140` | sem ledger | só menção: src/pages/SystemStatusPage.tsx, src/types/crm.ts |
| `color_groups` | `20260109125132_c8eb2ca4-378d-455c-b380-0f1b3b55efd6.sql:7` | sem ledger | só menção: src/components/expert/chat/useExpertChat.ts, src/hooks/useAdvancedFilters.ts |
| `color_variations` | `20260109125132_c8eb2ca4-378d-455c-b380-0f1b3b55efd6.sql:20` | sem ledger | só menção: src/hooks/admin/useAuditLog.ts, src/hooks/useColorEnrichment.ts |
| `color_nuances` | `20260109125132_c8eb2ca4-378d-455c-b380-0f1b3b55efd6.sql:35` | sem ledger | só menção: src/hooks/useColorSystem.ts, src/lib/external-db/tables.ts |
| `product_novelties` | `20260109154430_b2728cb8-f45f-418c-932f-56d27e5e3a44.sql:3` | sem ledger | nenhum |
| `future_stock_entries` | `20260201155941_b988554d-1888-42e4-badc-ae2300cabd1c.sql:6` | sem ledger | nenhum |
| `quote_number_counters` | `20260219133353_4495e564-cec8-44b1-a590-1fb18ca8c91d.sql:11` | sem ledger | nenhum |
| `logistics_tracking` | `20260503000000_sicoob_rbac_infrastructure.sql:50` | sem ledger | nenhum |
| `v_color_hierarchy` (view) | `20260109125132_c8eb2ca4-378d-455c-b380-0f1b3b55efd6.sql:255` | sem ledger | nenhum |
| `v_product_novelties` (view) | `20260109154430_b2728cb8-f45f-418c-932f-56d27e5e3a44.sql:39` | sem ledger | nenhum |

## Apêndice B: RPCs/funções SQL criadas e não chamadas

Critério: função não-trigger, cuja última definição em migration não foi revertida, sem `.rpc()` (inclui wrappers `xxxRpc`) em `src/`/`supabase/functions/`, sem referência no corpo de outra função, view, policy, trigger ou `cron.schedule`, e sem menção textual no código de produção. São 36 (26 vivas e 10 nunca aplicadas). Outras 71 funções vivas só são chamadas por SQL (policies, outras funções, cron); estão OK e não constam aqui.

| Função | Última definição | No banco vivo | Uso fora do app | Observação / item |
|---|---|---|---|---|
| `is_dnd_active` | `20260312110229_…sql:56` | sim | — | DND reimplementado na Edge (DB-24) |
| `mark_notification_read` | `20260312110229_…sql:91` | sim | — | DB-24 |
| `mark_all_notifications_read` | `20260312110229_…sql:104` | sim | — | DB-24 |
| `get_unread_count` | `20260312110229_…sql:117` | sim | — | DB-24 |
| `send_notification` | `20260503151554_…sql:35` | sim | `tests/scenarios/operacoes-internas-seguras.mjs` | DB-24 |
| `get_user_role` | `20260521103842_…sql:32` | sim | — | helper duplicado (DB-29) |
| `is_seller_only` | `20260426125603_…sql:4` | sim | — | helper duplicado (DB-29) |
| `is_org_member` | `20260317194959_…sql:36` | sim | — | multi-tenant não adotado (DB-35) |
| `is_singular_buyer_for_quote` | `20260503150940_…sql:14` | sim | — | regra de comprador singular não aplicada em policy |
| `check_budget_availability` | `20260503214557_…sql:47` | sim | `scripts/qa/simular-verba-legada.py` | DB-19 |
| `generate_sicoob_performance_report` | `20261008010000_…sql:494` | sim | `tests/scenarios/operacoes-internas-seguras.mjs` | STUB (DB-20) |
| `log_quote_action` | `20260509175720_…sql:38` | sim | — | DB-09 |
| `verify_quote_approval_signature` | `20260922225000_…sql:357` | sim | `scripts/qa/simular-aprovacao-publica.py` | DB-12 |
| `rotate_quote_approval_evidence_key` | `20260922225000_…sql:382` | sim | `scripts/qa/simular-aprovacao-publica.py` | DB-12 |
| `get_webhook_delivery_summary` | `20260427122230_…sql:63` | sim | — | DB-38 |
| `process_export_queue_v3` | `20261008010000_…sql:724` | sim | — | STUB perigoso (DB-34) |
| `audit_all_rls_compliance` | `20260503210523_…sql:23` | sim | — | DB-28 |
| `check_security_health` | `20261008010000_…sql:159` | sim | — | STUB (DB-28) |
| `provision_qa_accounts` | `20260503213627_…sql:50` | sim | — | STUB (DB-33) |
| `search_records_rerank` | `20261008010000_…sql:1470` | sim | — | variante de rerank semântico nunca ligada |
| `seed_discount_test_users` | `20260416190742_…sql:4` | sim | `tests/integration/discountApprovalFlow.test.ts` | ferramenta de teste no banco de produção |
| `audit_security_definer_acl` | `20261007220500_…sql:23` | sim | `scripts/check-security-definer-acl.mjs`, `scripts/qa/*` | ferramenta de ops (ok) |
| `check_sicoob_access_matrix` | `20260922150000_…sql:210` | sim | `scripts/qa/simular-controles-auditoria.py` | ferramenta de ops (ok) |
| `check_tables_rls` | `20260922150000_…sql:199` | sim | `scripts/scan-rls-security.mjs`, `scripts/generate-*.mjs` | ferramenta de ops (ok) |
| `inspect_query_plan` | `20260513165451_…sql:1` | sim | `scripts/db-performance-audit.mjs` | ferramenta de ops (ok) |
| `audit_empty_rls_policies` | `20260922224400_…sql:1` | sim | `scripts/scan-rls-security.mjs`, `tests/rls/no-empty-rls-policies.test.ts` | ferramenta de ops (ok) |
| `get_record_history` | `20251227100004_audit_log_universal.sql:136` | **não** | — | histórico universal nunca aplicado (DB-03) |
| `soft_delete_record` / `restore_record` / `permanent_delete_record` | `20260102_20260102205635_add_soft_delete_support.sql:66,94,122` | **não** | — | DB-15 |
| `get_color_filters` | `20260109125132_…sql:276` | **não** | — | sistema de cores local substituído pelo catálogo externo (DB-03) |
| `add_product_novelty` / `get_active_novelties` / `get_novelties_stats` | `20260109154850_…sql:8,44,87` | **não** | — | novidades hoje calculadas no catálogo externo (`src/hooks/useNovelties.ts:8-18`) |
| `cleanup_expired_novelties` | `20260109154430_…sql:193` | **não** | — | idem; Edge `cleanup-novelties` devolve 410 |
| `pa_belongs_to_user_singular` | `20260503000001_sicoob_profile_hierarchy.sql:18` | **não** | — | lógica incompleta (só testa `singular_id IS NOT NULL`) |

Fora do snapshot (não verificável estaticamente): `check_migration_status()` existe no banco vivo (`.inventory-cache.json`, `types.ts:11646`), mas não há `CREATE FUNCTION` dela em nenhuma migration (só `ALTER FUNCTION … SET search_path` em `20260529192614_…sql:9`), ou seja, foi criada fora do repositório.

## Apêndice C: tabelas/RPCs usadas no código e ausentes do schema

**C.1 — Cliente interno (banco canônico) usando objeto inexistente ou com contrato errado:**

| Referência | Onde | Situação | Item |
|---|---|---|---|
| `.from("products")` | `supabase/functions/favorites-watcher/index.ts:66` | tabela inexistente no canônico | DB-05 |
| `.from("products")` | `supabase/functions/collections-watcher/index.ts:73` | idem | DB-05 |
| `.from("products")` (fallback) | `supabase/functions/visual-search/index.ts:182` (`auth.localServiceClient`) | idem | DB-06 |
| `.rpc("search_products_semantic", {search_query, max_results})` | `supabase/functions/visual-search/index.ts:166` | assinatura inexistente (real: `_query`, `_products`, `_limit` — `types.ts:12732`) | DB-06 |
| realtime `discount_approval_requests` | `src/components/admin/DiscountApprovalHeaderBadge.tsx:20` | removida da publicação (`20260419024928_…sql:1`) | DB-25 |
| realtime `kit_comments` | `src/hooks/useKitCollaboration.ts:107` | removida da publicação (`20260419024928_…sql:2`) | DB-25 |
| realtime `sicoob_orders`, `custom_kits`, `product_views`, `search_analytics`, `device_login_notifications`, `login_attempts` | `src/services/sicoob/commonService.ts:20`, `src/hooks/useCustomKitsRealtime.ts:21`, `src/components/intelligence/RealtimeBadge.tsx:19,22`, `src/hooks/usePushNotifications.tsx:126,147` | nunca adicionadas à publicação por migration | DB-25 |

Falsos positivos descartados: `products` em `src/components/admin/connections/DataSourceDebugTab.tsx:191` (string de exemplo); `my_table` em `src/lib/supabase-untyped.ts:6` (comentário); `fn` em `supabase/functions/_shared/supabase-client-adapter.ts:102` (comentário).

**C.2 — Objetos ausentes do schema canônico, mas acessados por cliente externo (catálogo `doufsxqlfjyuvxuezpln` somente leitura ou CRM). Não são lacuna, por desenho (ADR 0001/0007):** tabelas `categories`, `categories_tree_visual`, `product_category_assignments`, `products`, `suppliers`, `product_variants`, `material_groups`, `material_types`, `product_materials`, `mv_material_group_stats`, `tabela_preco_gravacao_oficial(_faixa)` e `v_commemorative_dates_with_colors` (`supabase/functions/categories-api`, `materials-api`, `commemorative-dates`, `expert-chat`, `external-db-bridge`, `sync-quote-bitrix:107-110`); tabelas do CRM `companies`, `customers` e `contacts` (`crm-db-bridge/index.ts:105`, `expert-chat/index.ts:632-668`, `sync-quote-bitrix/index.ts:90-94`); RPCs externas `get_active_commemorative_dates`, `get_upcoming_commemorative_dates`, `get_variants_for_commemorative_date`, `get_all_material_groups_safe`, `get_all_material_types_safe`, `get_material_types_by_group_slug`, `get_materials_complete_safe`, `get_category_descendants`, `fn_get_product_customization_options` e `fn_get_customization_price`.

**C.3 — Buckets:** todos os 8 buckets usados no código existem no banco vivo (`avatars`, `personalization-images`, `supplier-logos`, `mockup-art-files`, `exports`, `proposals`, `sicoob-order-documents`, `qa-evidences`), além de `product-videos`, `personalization-images-secondary`, `quarantine` e `sicoob-document-quarantine` via constante. Buckets planejados em migration e ausentes: `signatures` (DB-11), `mockup-assets`, `art-files` (DB-18). Buckets vivos sem uso: `component-media`, `order-documents` (políticas removidas em 23/09; vazio).

## Fontes lidas

- `AGENTS.md`; `README.md` (linhas 170-260); `docs/execucao/fechamento-tecnico-2026-10-08.md` (completo); `docs/execucao/decisoes_pendentes.md` (completo); `docs/execucao/aplicacao-migrations-20260923.md`
- `scripts/db/migration-ledger-baseline.json`, `scripts/db/check-migration-ledger-drift.mjs`, `scripts/db/classify-migration-backlog.mjs`, `scripts/db/check-runtime-refs.mjs` (cabeçalho), `scripts/db/.check-runtime-refs-allowlist.json`, `scripts/db/.inventory-cache.json`, `scripts/db/import-api-inventory.mjs`
- `docs/execucao/evidencias/retomada-mcp-20260922/migration-backlog-classification.json`; `docs/execucao/evidencias/supabase-canonico-resumo-20261001.json`; `docs/execucao/evidencias/{funcoes_orfas,orfaos_banco,etapa22_pontos_atendimento,etapa23_blog_posts,etapa24_magic_up,etapa25_rpcs_sicoob_nao_ligadas,etapa26_views_auditoria,etapa28_buckets_orfaos}_20260917.md`
- `docs/evidencias/aplicacao-migrations-20260923/{preflight,estado-final,execucao-cron}.json`
- `supabase/migrations/**` (577 arquivos, varredura completa por script + leitura direta de ~45 arquivos citados), `supabase/migrations_archive/README.md`, `supabase/migrations_archive/2026-09/README.md`, `supabase/preflight/sicoob-reconciliation-contract.sql`, `supabase/cron/cron-config.sql`, `supabase/config.toml`, `sicoob_rls_validation.sql`
- `src/integrations/supabase/types.ts` (Tables/Views/Functions/Enums, varredura completa); `src/**` e `supabase/functions/**` (varredura de `.from/.rpc/.storage/postgres_changes`; leitura de `favorites-watcher`, `collections-watcher`, `visual-search`, `send-notification`, `process-queue`, `send-scheduled-reports`, `cleanup-novelties`, `useWebAuthn.ts`, `qa-seed.ts`, `OrderService.ts`, `useNovelties.ts`, `supabase-untyped.ts`)
- `docs/DATA_DICTIONARY.md`, `docs/ANALISE_109_TABELAS_BANCO_EXTERNO.md`, `docs/04_EXPLICACAO_DAS_POLICIES.md` (índice + helpers), `docs/security/RLS_MATRIX.md`, `docs/RBAC_HELPERS.md`, `docs/architecture/ER_DIAGRAM.md`, `docs/adr/0008-unified-soft-delete-policy.md`, `docs/AUTH_PASSKEYS.md`, `docs/NOTIFICATION_SYSTEM.md`, `docs/OBSERVABILITY.md`, `docs/EDGE_FUNCTIONS.md`, `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1255-1272`, `docs/03_ARQUITETURA_DO_SISTEMA.md` e `docs/05_ROADMAP_PROXIMOS_PASSOS.md` (trechos), `docs/plano-implementacao/plano-reconciliacao-50-etapas.md:560-612`
- `docs/AUDIT_FRONTEND_DATABASE.md` (índice, §2.1-2.3 e linha 513) e `docs/AUDIT_FRONTEND_DATABASE_summary.md`
- Inexistentes: `supabase/seed*` (não há seed no repositório) e `graphify-out/` na raiz (`graphify` não instalado).
