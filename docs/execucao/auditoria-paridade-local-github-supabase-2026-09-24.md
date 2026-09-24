# Auditoria de paridade — local, GitHub e Supabase Sicoob

Data: 2026-09-24. Ambiente: projeto de construção `cfmzkthhgliqelozlmwu`.
Referência GitHub: `adm01-debug/Brindes_Sicoob_V2`, `main` em `d389b4be788c4ab11f5d6b31731c54ba04dbe939`.
A auditoria usou operações de leitura; não alterou banco, Storage nem funções remotas. Chaves, conteúdo de tabelas e arquivos privados não foram copiados para esta evidência.

## Resultado verificável

**Não há paridade completa.** O código local não coincide com o `main` remoto; os tipos TypeScript omitem relações, rotinas e colunas que a API real expõe; seis Edge Functions versionadas não estão implantadas; e a configuração pública versionada contém duas chaves que a API rejeita. A chave administrativa permite executar RPCs de auditoria no projeto correto; elas verificaram cobertura RLS e uma classe de ACLs. A paridade das migrations com o ledger, dos demais objetos SQL, dos dados e dos segredos ainda não pode ser atestada.

| Superfície | Evidência atual | Situação |
|---|---|---|
| Git local × GitHub `main` | HEAD local `6b71bdc09a454d8f8160166d45c9a670aa8b66e5`; remoto `d389b4be788c4ab11f5d6b31731c54ba04dbe939`; local atrás por 1 commit, 39 caminhos diferentes | Divergente |
| Alterações locais não publicadas | `docs/correcoes-validacao-2026-09-14.md`, `src/components/admin/connections/secretNormalizers.ts`, `supabase/.temp/cli-latest` modificados; nenhum arquivo não ignorado sem rastreamento | Divergente; não sobrescrever |
| Código versionado no GitHub | 3.688 arquivos no `main`, 534 migrations `.sql`, 106 diretórios de Edge Functions com `index.ts` | Inventariado |
| Relações `public` da API × tipos | 216 relações expostas no OpenAPI; 215 `Tables` e 4 `Views` tipadas; 208 nomes em comum | Divergente |
| Rotinas `public` da API × tipos | 200 rotinas RPC expostas; 180 tipadas; 20 remotas sem tipo | Divergente |
| Colunas das relações comuns | 11 colunas remotas ausentes dos tipos, concentradas em 4 relações; nenhuma coluna tipada extra nas 208 relações comuns | Divergente |
| Edge Functions do GitHub × gateway remoto | 106 sondagens `OPTIONS`: 98 HTTP 200, 1 HTTP 204, 6 HTTP 404, 1 timeout | Divergente |
| Storage | 14 buckets listados pelo serviço; os dois buckets Sicoob de documentos são privados | Parcialmente verificado |
| RLS e ACL por RPCs de auditoria | 230 tabelas/partições públicas com RLS habilitado; 8 sem policies; auditoria de ACL `SECURITY DEFINER` sem achados | Parcialmente verificado |
| Migrations, triggers, cron, Vault, demais grants/objetos SQL | Sem conexão SQL/ledger administrativo com o projeto-alvo; as RPCs disponíveis não expõem o ledger nem o catálogo completo | Não verificável nesta sessão |
| Dados de negócio e arquivos Storage | Não há expectativa de versionar registros de clientes/pedidos no GitHub; conteúdo e integridade não auditados | Não verificável nesta sessão |

### Diferenças de Git

O commit remoto acrescenta quatro migrations finais (`20260923100000`, `20260923110000`, `20260923111000`, `20260923112000`), a função `external-connections-sync`, autenticação interna compartilhada, testes e atualizações de documentação/código. O diretório principal do operador permanece no commit anterior e possui três edições próprias. Este relatório foi criado em worktree isolado a partir de `origin/main`; nenhuma dessas edições foi modificada.

Há 96.609 caminhos ignorados no diretório principal, dos quais 95.924 são `node_modules` e 652 `dist`. Esses artefatos locais não devem ser tratados como conteúdo esperado do GitHub. A pasta externa `Brindes Sicoob V2 - Docs` contém 13 documentos reais (75 MB no total da pasta, incluindo metadados `Zone.Identifier`); nenhum dos 13 possui cópia de conteúdo SHA-256 idêntico entre os arquivos rastreados pelo repositório. Ela não integra este repositório e seu eventual compartilhamento exige classificação documental.

### Diferenças de esquema exposto

Relações presentes na API e ausentes de `src/integrations/supabase/types.ts`:

- `bitrix_clients`, `bitrix_deals`, `bitrix_sync_logs`;
- `product_component_location_techniques`, `product_group_components`, `product_group_location_techniques`, `product_group_locations`;
- `sicoob_document_registry`.

Onze relações tipadas não aparecem no OpenAPI: `admin_audit_log_archive`, `admin_audit_log_default`, `admin_audit_log_old`, `admin_audit_log_y2024`, `admin_audit_log_y2025` e `admin_audit_log_y2026_m01` até `_m06`. São estruturas de auditoria/partições; a ausência na API **não prova exclusão física**. Exige verificação SQL de `pg_class` e privilégios.

As 20 RPCs presentes na API e ausentes dos tipos são: `apply_local_quote_approval_response`, `assert_database_auditor`, `audit_actor_email`, `audit_empty_rls_policies`, `check_rls_enabled`, `claim_sicoob_approval_delivery`, `create_quote_version_atomic`, `dispatch_sicoob_export_worker`, `enqueue_sicoob_approval_event`, `enqueue_sicoob_approval_notifications`, `finish_sicoob_approval_delivery`, `get_enum_values`, `get_sicoob_approval_delivery_summary`, `register_sicoob_clean_document`, `sicoob_current_actor_can_manage_consolidation`, `sicoob_current_actor_can_manage_fulfillment`, `sicoob_current_actor_can_receive_consolidation`, `sicoob_current_actor_can_receive_destination`, `sicoob_current_actor_can_view_all_consolidation`, `sync_external_connections_from_credentials`. Nenhuma das 180 RPCs tipadas estava ausente do OpenAPI.

Colunas remotas omitidas dos tipos:

| Relação | Colunas |
|---|---|
| `sicoob_order_invoices` | `document_id` |
| `sicoob_order_items` | `line_total_amount`, `personalization_amount` |
| `sicoob_order_shipments` | `delivery_document_id` |
| `sicoob_orders` | `commercial_subtotal_amount`, `discount_amount`, `merchandise_amount`, `negotiation_markup_amount`, `personalization_amount`, `pricing_formula_version`, `shipping_amount` |

A comparação acima é de nomes e colunas expostos pelo PostgREST; não valida tipos, nulidade, índices, grants nem equivalência de definição SQL. RLS foi sondado separadamente pelas RPCs de auditoria descritas abaixo.

### Edge, Storage e configuração

As cinco funções operacionais `sicoob-approval-reconciliation`, `sicoob-artwork-register`, `sicoob-document-ingest`, `sicoob-kit-quote` e `sicoob-reorder` responderam `404`; `migrate-helper` também respondeu `404` e é descrita na evidência anterior como stub inerte. `generate-mockup-nanobanana` expirou e permanece inconclusiva. `external-connections-sync` respondeu `204` e `system-healthcheck` respondeu `200`, controles positivos da sondagem. `OPTIONS` confirma roteamento HTTP, não confirma comportamento autenticado ou versão exata do código implantado.

O Storage listou `avatars`, `component-media`, `exports`, `mockup-art-files`, `order-documents`, `personalization-images`, `personalization-images-secondary`, `product-videos`, `proposals`, `qa-evidences`, `quarantine`, `sicoob-document-quarantine`, `sicoob-order-documents` e `supplier-logos`. Os buckets `sicoob-document-quarantine` e `sicoob-order-documents` constam como privados. `avatars`, `personalization-images-secondary` e `qa-evidences` constam como públicos; esta auditoria não determina se isso corresponde à regra de negócio.

`.env.production` aponta para o projeto correto, mas as duas chaves nele (`VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_ANON_KEY`) receberam HTTP `401` do endpoint REST do próprio projeto. Uma chave administrativa fornecida pelo operador permitiu ler o OpenAPI e listar buckets, o que separa falha de credencial pública de indisponibilidade geral do serviço. O GitHub lista os nomes `SUPABASE_ACCESS_TOKEN` e quatro variáveis públicas `VITE_*`; a API do GitHub não revela seus valores, então não há confirmação de equivalência ou validade desses secrets. Não há `SUPABASE_DB_URL` no ambiente local desta sessão nem na lista de secrets do repositório.

### Auditoria RLS e ACL pelo projeto correto

A chave administrativa permitiu chamar, por GET, as RPCs de leitura `check_tables_rls()`, `audit_rls_coverage()`, `audit_empty_rls_policies()`, `audit_rls_matrix()` e `audit_security_definer_acl()`. Elas executam consultas ao catálogo do próprio projeto e ampliam a evidência além do OpenAPI:

- `check_tables_rls()`: 230 tabelas/partições públicas, nenhuma com RLS desabilitado.
- `audit_empty_rls_policies()`: oito tabelas com RLS e sem policies — `bitrix_clients`, `bitrix_deals`, `bitrix_sync_logs`, `quote_approval_evidence_keys`, `sicoob_approval_deliveries`, `sicoob_approval_delivery_archive`, `sicoob_approval_worker_dispatches`, `webhook_configs`. A ausência pode ser intencional para negar acesso direto; conferir o contrato de cada uma antes de alterar.
- `audit_rls_coverage()`: 56 entradas por operações ausentes, sendo duas classificadas como `high` e 54 como `medium`; não significa 56 vulnerabilidades, pois escritas diretas podem ser bloqueadas por desenho.
- `audit_rls_matrix()`: 484 combinações tabela/operação; 304 `ok`, 128 `medium`, 50 `review` e duas `high` (`SELECT` em `access_blocked_log` e `webhook_configs`); nenhuma `critical`. `review` sinaliza predicados diferentes e exige revisão semântica.
- `audit_security_definer_acl()`: zero achados segundo a allowlist e as regras implementadas nessa função. Isso não substitui a inspeção de todos os grants efetivos.

`check_migration_status()` também respondeu, mas retorna papéis e RLS de quatro tabelas; **não** é uma leitura do ledger de migrations. Nenhuma RPC de auditoria foi chamada com método de escrita.

### Histórico e limite da prova

A evidência versionada de 2026-09-23 (`docs/evidencias/reconciliacao-remota-20260923/resumo.json`) registra 18 migrations aplicadas com MD5 exato e ledger até `20260923100000`, quatro constraints validadas e 226 tabelas/263 rotinas públicas por SQL. É **evidência histórica**, não uma nova leitura do ledger em 24/09. As rotinas `dispatch_sicoob_export_worker`, `sync_external_connections_from_credentials` e `ensure_default_favorite_list` aparecem hoje no OpenAPI, compatíveis com objetos das migrations posteriores, mas essa presença isolada não prova aplicação completa, ordem, checksum ou sucesso de todos os passos. As 216 relações do OpenAPI não são diretamente comparáveis às 226 tabelas da consulta SQL histórica, pois a API filtra exposição/permissões e inclui views. A RPC SQL `check_tables_rls()` retornou **230 tabelas/partições públicas em 24/09**, todas com RLS habilitado; a diferença de quatro frente à fotografia histórica requer identificação pelo catálogo/ledger.

O MCP legado informado anteriormente retornou `403`; os MCPs SQL conectados nesta sessão apontam para outros bancos e não contêm `public.sicoob_orders`. O CLI Supabase autenticado não lista o projeto-alvo, e por isso não oferece `db diff`, leitura do ledger nem deploy Edge aqui. Nenhuma conclusão sobre ausência de dados ou migrations foi inferida a partir desses acessos inadequados. A chave do projeto permitiu executar RPCs de auditoria SQL já existentes no banco correto, sem acesso SQL arbitrário.

## Ordem de reconciliação

1. Preservar as três edições locais, atualizar o diretório principal até `origin/main` com integração consciente e resolver seus diffs; não descartar trabalho do operador.
2. Regenerar os tipos a partir do projeto-alvo e revisar o diff de oito relações, vinte RPCs e onze colunas; decidir explicitamente se partições de auditoria pertencem ao contrato público tipado.
3. Corrigir e validar as chaves públicas do build e do GitHub sem versionar credenciais sensíveis. A chave administrativa compartilhada fora de um cofre deve ser rotacionada após encerrar a auditoria.
4. Implantar as cinco Edge Functions operacionais ausentes, verificar configurações e executar smoke tests autenticados de cada fluxo. Decidir se `migrate-helper` deve permanecer ausente; investigar o timeout de `generate-mockup-nanobanana`.
5. Obter conexão SQL **ao projeto-alvo** e comparar `supabase_migrations.schema_migrations` com os 534 arquivos por versão e hash; auditar `pg_class`, `pg_proc`, policies, grants, triggers, índices, cron, Vault por existência de nomes e Storage policies. Não registrar valores de segredos ou dados de clientes.
6. Executar testes de integridade e RLS com personas de construção, além dos cenários de pedidos, aprovações, documentos e catálogo externo; reconciliar divergências só após a fotografia SQL.
7. Classificar os 13 documentos externos e decidir quais devem entrar em repositório privado, armazenamento documental ou apenas índice de referência; não publicá-los automaticamente.
8. Restaurar CI do GitHub e repetir a auditoria após merge/deploy. Os PRs abertos apresentam checks falhos; código em PR não equivale ao `main` nem a banco implantado.

Critério de conclusão: Git limpo e alinhado ao commit de referência; tipos gerados sem divergência não justificada; ledger e objetos SQL comparados por leitura administrativa; todas as Edge Functions operacionais roteadas e testadas; configuração pública válida; evidência de RLS e integridade executada no ambiente correto. Até lá, “paridade total” não está demonstrada.
