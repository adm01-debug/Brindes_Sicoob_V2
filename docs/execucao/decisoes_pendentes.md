# Decisões pendentes — reconciliação Sicoob (atualizado em 22/09/2026)

O projeto está em construção. Há escolhas de produto, implementação pendente e
dependências de acesso administrativo; não são todas decisões de arquitetura.
O [relatório de execução](correcoes-reconciliacao-20260922.md) distingue correções
locais testadas, aplicação remota e aceite funcional ainda abertos.

## 1. `bitrix_clients`/`bitrix_deals`/`bitrix_sync_logs` — a sync com Bitrix24 ainda é ativa?
**Pergunta:** a integração `bitrix-sync` (edge function, webhook real com Bitrix24) ainda é usada? Se sim, ela precisa de tabelas de sync-cache próprias — mas **não** deve ressuscitar `bitrix_clients` como fonte de cliente do resto do app, porque 2 migrations (`20260213151101`, `20260301143055`) já documentam a migração pra `companies`/CRM externo.
**Se "sim, ainda ativa":** desenhar as 3 tabelas do zero (RLS correta, não o `USING(true)` original) e corrigir `QuotesKanbanPage.tsx`/`personalization_simulations` pra não depender delas como cliente genérico.
**Se "não, abandonada":** remover a edge function `bitrix-sync` e o código morto associado; fechar como código morto.
**Evidência:** `docs/execucao/evidencias/auditoria_tripla_20260917.md` §3.

## 2. RPCs `check_rls_enabled`/`get_enum_values` — implementadas localmente
Helpers restritos ao servidor na migration `20260922151000`; health-check exige
dev e não aprova resultado com erro/RLS desligado. Simulações SQL e testes passaram.
**Pendente:** aplicar a migration e publicar/testar a função no banco de construção.

## 3. `set_config` em `mcp-keys-revoke` — chamada morta removida
Uma RPC separada com `SET LOCAL` não propaga o ator para a transação de UPDATE.
Foi preservado o registro explícito de ator em `writeAuditEntry`. **Pendente:**
publicação remota e eventual garantia atômica entre revogação e trilha.

## 4. `error_logs` — substituída por telemetria existente
`error-reporter` agora grava em `telemetry_events`, mantém Sentry e remove tokens
de query/fragmento da URL enviada. Teste de envio passou. **Pendente:** verificar
entrega real e configuração remota de Sentry; nenhuma configuração foi presumida.

## 5. `sicoob_budgets` — referência corrigida em trabalho anterior
A base desta execução já usa `cooperativa_budgets`/`pa_budgets`, sem criar tabela
homônima. **Pendente:** homologação de verba por período; ausência no verificador
de nomes não comprova as regras financeiras.

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
`sicoob_budget_audit` e `v_full_scope_grants` têm proposta de UI para
`AuditEvidenceDashboard.tsx`. A view de concessões falhou na leitura real por
depender de `auth.users`; a migration `20260922150000` corrige a dependência e o
join com profiles, com simulação RLS. Aplicação remota e aceite da tela pendem.

## 11. Rastreabilidade dos commits e regras de branch
A cobertura de commits históricos por PR precisa ser reconciliada. A auditoria
de 22/09 identificou bypass administrativo e ausência de checks obrigatórios.
O lote atual será enviado por branch/PR próprio; isso não revisa retroativamente
DDL anterior nem comprova que os checks foram executados.

## 12. Aplicação no banco de construção da RPC `create_quote_version_atomic`
Pacote existente: `docs/execucao/evidencias/pacote_aplicacao_quote_versioning_20260920.md`.
A RPC não apareceu na API de 22/09. Nesta sessão falta acesso administrativo ao
projeto para validar dependências, simular/aplicar e conferir ledger. Chave da
Data API não substitui esse acesso. A aplicação não foi executada nem certificada.

## 13. Novas referências encontradas por AST
O relatório de execução lista grupos/componentes/locais de personalização,
`user_passkeys`, `color_nuances` e dois usos de `products` em mockups. Não basta
criar tabelas vazias para aprovar o verificador: autenticação exige validação
no servidor, e mockups precisam preservar as referências externas sem violar FKs.
