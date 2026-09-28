# Reconciliação GitHub × Supabase Sicoob — 28/09/2026

Projeto canônico de construção: `cfmzkthhgliqelozlmwu`. Base GitHub auditada: `main` em `55638f79bd7f233838bbe5f039d3276012cfce6d`. O catálogo externo `doufsxqlfjyuvxuezpln` não foi alterado. [Inventário verificável](evidencias/paridade-online-20260928.json).

## Resultado

| Área | Antes | Depois | Evidência e limite |
|---|---:|---:|---|
| Migrations no ledger | 89 | 97 | Duas migrations de 23/09 aplicadas com registro transacional; seis de 16/09 registradas como estado já existente após inspeção. Todas as migrations de setembro do repositório constam no ledger. |
| Edge Functions | 100/100 vagas | 100/100 vagas | Três funções Sicoob usadas pelo aplicativo publicadas, três funções legadas retiradas, e as 100 funções remanescentes republicadas individualmente. |
| Código remoto das funções | 42 `index.ts` diferentes e três rotas Sicoob ausentes | 142 arquivos baixados, zero diferenças frente ao GitHub | Inclui 100 entradas, dependências compartilhadas e auxiliares. O download foi feito em diretório isolado após a publicação. |
| Migrations antigas sem registro | 470 | 462 | São arquivos até maio de 2026. Ausência no ledger não prova ausência do efeito no schema; não foram executados sem diagnóstico individual. |

## Banco de dados

As migrations `20260923130000_secure_sicoob_documents_and_exports.sql` e `20260923140000_secure_legacy_connection_crons.sql` passaram primeiro em transações revertidas. Foram então executadas no projeto canônico com inserção do SQL e SHA-256 do arquivo no mesmo commit do ledger. A primeira criou `export_jobs.file_path`, quatro RPCs de exportação, a policy privada do bucket `exports` e os controles de leitura de pedidos. A segunda criou wrappers para os crons, lendo os segredos do Vault. A verificação posterior confirmou os dois jobs ativos com comandos que chamam os wrappers, sem segredo literal no comando, e confirmou grants de execução restritos.

As seis versões `20260916140000` a `20260916190000` já tinham os efeitos no banco, embora faltassem no ledger. Antes do registro como `codex_as_built_20260928`, confirmei: três views com `security_invoker=on` e sem leitura anônima; 235 tabelas públicas sem `TRUNCATE` para `anon` ou `authenticated`; 18 partições de auditoria com RLS e sem `TRUNCATE`; bucket `avatars` com limites e policies; tabelas `audit_log` e `password_reset_requests` com RLS, índices e policies previstos. Nenhuma dessas seis migrations foi reexecutada.

O ledger final contém 97 versões, todas com arquivo correspondente no repositório e sem divergência de `idempotency_key` onde ela existe. Quatro SQLs guardados no ledger diferem textualmente do arquivo: três apenas pelo ponto e vírgula final e um por formato de linha; o diff por linhas não mostrou diferença lógica. Em 28 entradas, o ledger não contém um único bloco SQL comparável. As 462 migrations históricas exigem reconciliação por objeto e dependência; reproduzi-las em sequência agora seria arriscado.

## Edge Functions e segredos

O deploy inicial das três funções novas retornou HTTP 402 porque o projeto estava no limite de 100 funções. Os logs consultados em janelas diárias mostraram ausência de invocação recente de `error-monitor`, `qa-block-monitor` e `generate-mockup-nanobanana`; nenhuma tem chamador em `src/` nem cron. As versões remotas dos dois monitores eram anteriores à autorização presente no GitHub, e a função de mockup estava vazia no download remoto. Salvei o código publicado em cópia local temporária antes de retirá-las. As rotas retiradas podem ser republicadas a partir do repositório se voltarem a ser necessárias, desde que exista capacidade.

Foram publicadas `sicoob-kit-quote`, `sicoob-document-ingest` e `sicoob-approval-reconciliation`. O deploy em lote das 42 funções divergentes também retornou HTTP 402 no limite de vagas; a publicação individual de função existente funcionou. Atualizei individualmente essas 42 e as 58 restantes para incluir as versões atuais dos arquivos compartilhados. O último download remoto contém 142 arquivos e todos coincidem byte a byte com a fonte versionada. Não há função publicada sem fonte local. Permanecem intencionalmente fora do projeto três rotas de teste/diagnóstico (`e2e-auth-test`, `migrate-helper`, `sicoob-seed-debug`) e as três rotas legadas retiradas.

O segredo `SICOOB_APPROVAL_WORKER_SECRET` foi criado sem expor o valor, tanto no Vault quanto nos segredos da Edge Function. `SICOOB_MALWARE_SCANNER_URL` e `SICOOB_MALWARE_SCANNER_TOKEN` ainda não existem; a ingestão de documentos está publicada, mas o código recusa o arquivo com HTTP 503 depois da autenticação enquanto o scanner real não for configurado. `SICOOB_QA_USER_PASSWORD` também não existe: o seed QA atualizado falha fechado com HTTP 503 após autenticar um desenvolvedor. Esses valores não podem ser inventados como integração real.

## Testes e limites de homologação

- `npm run test -- --reporter=dot`: 5.569 testes aprovados; 112 ignorados.
- `npm run test:scenarios`: 202 cenários aprovados.
- `npm run typecheck:baseline`: 158 diagnósticos atuais contra baseline de 166, sem regressão.
- `npm run lint:baseline`: sem regressão nos arquivos alterados; o legado ainda soma 3.269 erros globais.
- `npm run build`: aprovado após `npm ci` no worktree isolado.
- POST sem sessão nas três funções novas, no worker de aprovações e no exportador: HTTP 401. A aprovação pública respondeu HTTP 400 para payload vazio, sem erro 500.

Esses testes não substituem uma jornada autenticada de compra, exportação ou upload com scanner. Também não transformam registros comerciais do banco em arquivos Git: dados transacionais pertencem ao banco. A cópia local original permaneceu intacta; sua correção de `secretNormalizers.ts` já estava no `main`. As alterações locais em documentação antiga, o arquivo temporário da CLI e os dois relatórios avulsos de 24/09 não foram publicados porque não representam uma correção nova e, no caso dos relatórios, descrevem um estado superado.
