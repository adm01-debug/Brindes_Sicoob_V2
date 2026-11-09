# Estado real do projeto — inventário gerado

Pasta de **dados gerados por script**, não de relatórios escritos à mão. É a fonte de consulta dos
agentes para "o que existe hoje" no banco e no código — leia antes de planejar, para não medir de
novo o que já está medido. Se um número aqui divergir do que você mediu, **regere o arquivo**
(comandos abaixo) em vez de corrigir à mão.

| Arquivo | Como gerar | O que tem |
|---|---|---|
| `banco.json` | `SUPABASE_ACCESS_TOKEN=... npm run inventario:banco` (Management API, `read_only`, + `GET /functions`) **ou**, sem token, rodar `scripts/inventario/banco.sql` no console/MCP de SQL do projeto oficial, salvar a resposta e `node scripts/inventario/gerar-banco.mjs --entrada <arquivo>` | banco oficial (`cfmzkthhgliqelozlmwu`), só leitura: cada tabela (RLS, policies, triggers, linhas, bytes, se é citada em função/view e quantos `.from()` / `/rest/v1/<tabela>` há em `src/` e `supabase/functions/`), tabelas órfãs, cada cron job (agenda, funções chamadas, falhas e taxa em 24 h/7 d, duração máxima), horas em que o cron ficou parado, tamanho do histórico do cron, filas de entrega/notificação por status, edge functions publicadas × pastas do repo (só com token) e a lista `alertas` |
| `rotas.json` | `npm run inventario:rotas` (`--check` só confere se está em dia) | as 133 rotas de `src/routes/config/*.ts` com as guardas em que o `src/App.tsx` as monta, o item de menu do `SidebarReorganized` (rótulo, grupo, papéis, atalho) e, por rota, os hooks, tabelas, RPCs, buckets e edge functions alcançados pelos imports da página; mais a lista `problemas` |
| `edges.json` | `npm run inventario:repo` (precisa de `rg` no PATH) | as edge functions: linhas, segredos lidos (`Deno.env.get`) e quem invoca cada uma (src, migrations, outras edges, e2e, CI) |
| `tabelas-uso.json` (não versionado) | `node scripts/inventario/gerar-repo.mjs < lista-de-tabelas.txt` | quantos `.from('tabela')` cada tabela tem — isso também sai em `banco.json` → `tabelas[].uso_no_codigo` |

## Como ler `banco.json`

- **`alertas`** é o que um agente precisa saber antes de mexer: `tabela_sem_rls`, `rls_sem_policy`
  (RLS ligado e nenhuma policy = nega tudo para `authenticated`/`anon`), `cron_falhando`
  (taxa ≥ 5 % em 7 dias), `cron_parado` (hora com mais da metade das execuções falhando),
  `cron_sem_execucao` (job ativo que roda todo dia sem nenhuma execução em 24 h — cron 100 % parado
  não grava falha, então só aparece aqui), `historico_cron_sem_limpeza` (> 50 mil linhas com mais de
  7 dias), `cron_nao_consultado` (a credencial não enxergou `cron.job`), `fila_com_falha` (entrega
  travada em status de erro), `edge_sem_deploy` e `edge_publicada_sem_codigo`. Os limiares estão em
  `LIMIARES`, em `scripts/inventario/gerar-banco.mjs`.
- **`tabelas_orfas`**: 0 linhas + não citada em função/view do banco + nenhum `.from()` nem
  `/rest/v1/` no código (`.from(variavel)` não é resolvido). É candidata a limpeza, **não** prova de
  que pode apagar: pode ser usada por RPC com outro nome ou por sistema externo.
- **`linhas`** é `count(*)` exato quando a tabela tem menos de 200 mil linhas (`linhas_exatas:
  true`); acima disso, a estimativa do planner. Não confie em `pg_stat_user_tables.n_live_tup`: zera
  quando o banco reinicia.
- Contagens rodam com o papel da conexão. Com um papel sem `BYPASSRLS`, tabelas com RLS e `cron.job`
  podem vir incompletas (o `cron.job` do Supabase tem policy `username = current_user`).
- **`origem`** registra a conferência: a resposta só é gravada se ≥ 90 % das tabelas de
  `src/integrations/supabase/types.ts` estiverem nela e ≥ 70 % das tabelas da resposta estiverem no
  types.ts. Isso barra resposta colada de outro banco (catálogo externo, CRM, projeto do Lovable).
  O ledger de migrations aparece em `resumo.ledger_*` como **informação**: neste repo ele é menor que
  o repo de propósito (passivo histórico em `scripts/db/migration-ledger-baseline.json`).
- O PR semanal (`inventario-estado-semanal.yml`) só abre quando algo **estrutural** mudou: tabela
  nova/apagada, alerta novo, RLS/policy, contagem real de linhas, rota, menu, edge. `medido_em` e a
  telemetria de janela rolante não abrem PR (`execucoes_24h`, `taxa_falha_7d_pct`,
  `horas_paradas_7d`, `cron.historico.linhas/bytes`, linhas e contagem por status das filas): esses
  números rolam toda semana sem mudança real. Consequência: o valor commitado desses campos pode
  ficar velho por semanas — confie neles só depois de regenerar à mão.

## Como ler `rotas.json`

- `guardas` é a pilha real de componentes que embrulham a rota no `App.tsx` (ex.:
  `ProtectedRoute → AuthenticatedShell → MainLayout → SicoobRoute`). Grupo espalhado dentro de outro
  (`sicoobRbacRoutes` dentro de `sicoobRoutes`) herda as guardas de quem o espalha.
- `problemas`: `grupo_nao_montado` (arquivo de rota que o `App.tsx` não renderiza — rota morta),
  `rota_sem_arquivo` (import que não resolve), `menu_sem_rota` (item de menu que leva a 404),
  `rota_sem_menu` (rota só acessível por URL direta; rota com `:param` não conta) e
  `import_quebrado`.
- `hooks` na rota traz só o nome; o arquivo de cada hook e em quais rotas ele aparece estão no mapa
  `hooks` no fim do arquivo.
- A extração é estática: referência encontrada não prova execução, e ausência não prova que não há
  uso (ex.: `.from(variavel)`).

Quem mantém isto atualizado sozinho: `.github/workflows/inventario-estado-semanal.yml` (segunda,
10:41 UTC) + `scripts/inventario/` (ver o README de lá).
