# CI e entrega — Brindes Sicoob V2

## Estado comprovado em 22/09/2026

O repositório possui validação contínua, mas ainda não possui uma entrega em
produção comprovada. O orçamento do GitHub Actions está bloqueando a execução
remota dos jobs; por isso, resultado local não deve ser apresentado como CI
verde.

| Workflow | Responsabilidade |
|---|---|
| `ci.yml` | Typecheck/lint por baseline, imutabilidade de migrations, referências de runtime, cenários, suíte Vitest integral com cobertura, Deno, simulações PostgreSQL e build |
| `sicoob-ci.yml` | Fluxos transacionais Sicoob, experiência responsiva e PWA |
| `security.yml` | Gitleaks e verificações de segurança do repositório |
| `security-compliance.yml` | RLS remoto, ACL `SECURITY DEFINER` e isolamento entre personas |
| `migration-ledger-drift.yml` | Divergência entre migrations locais e ledger remoto |
| `e2e.yml` | Jornadas autenticadas com personas dedicadas |
| `codeql.yml` | Análise estática CodeQL |
| `bundle-check.yml` e `lighthouse.yml` | Orçamento de bundle e auditoria de experiência |
| `db-performance-audit.yml` | Auditoria programada do banco |

Os workflows que acessam o ambiente exigem os secrets inventariados em
[`secrets.md`](./secrets.md). Ausência de credenciais em gates remotos deve
falhar fechado; os testes locais explicitamente opcionais registram `skip`.

## Fluxo de mudança

1. Criar branch/worktree isolado.
2. Implementar migrations cumulativas; não editar migration já presente na `main`.
3. Executar gates locais equivalentes ao CI.
4. Abrir PR e aguardar revisão e checks obrigatórios.
5. Aplicar migrations e publicar Edge Functions primeiro no ambiente de construção.
6. Executar smoke autenticado, conferir o ledger e registrar evidências.
7. Liberar ambiente superior somente depois dos gates verdes.

Não há automação de Semantic Release, changelog ou rollback por migration
reversa comprovada neste repositório. Rollback de banco segue estratégia
forward-only com migration corretiva e o runbook de incidente.


## Atualização de estado — PR #178, SHA `145773579` (30/10/2026)

O cabeçalho acima é um retrato histórico de 22/09/2026. Na PR #178, Security Scan, CodeQL, Lighthouse, Bundle Size Check, Portal Sicoob e Qualidade contínua passaram no SHA `145773579dc978606d671750e3797ab1f1c0581b`; o último confirmou os dois simuladores PostgreSQL usando a imagem GHCR oficial presa ao digest. A correção do rate limit ECR está, portanto, confirmada no runner do GitHub.

O E2E [falhou na tentativa 2](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41139832427), no gate `header-sticky`: smoke autenticado 39/39 passou, mas 4 casos expiraram em `e2e/helpers/nav.ts` esperando o marcador de permissões antes de avaliar o header. A medição sticky não foi alcançada nesses casos, logo a execução não comprova regressão CSS. O trace teve respostas HTTP 200/204 rápidas para sessão, papéis e perfil, sem evidência de quota/segredo externo. Uma correção candidata faz o gate de header aguardar o carregamento lazy e a visibilidade do shell, separando o estado de navegação das asserções sticky; precisa de nova validação local e CI. Consulte [`RELATORIO_CI.md`](../RELATORIO_CI.md) e [`PENDENCIAS.md`](../PENDENCIAS.md) para runs, baseline e evidências.
