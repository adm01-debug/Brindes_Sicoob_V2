# CI e entrega — Brindes Sicoob V2

## Estado verificado em 30/10/2026

Há workflows remotos ativos; o orçamento do Actions não está impedindo esta
rodada. A PR #176 continua aberta e sem merge. Na execução atual, os checks de
segurança, CodeQL, Portal, bundle, Lighthouse, origem confiável e transações
passaram. O E2E autenticado falhou antes de iniciar o Playwright porque falta a
configuração do projeto isolado; o Copilot gerenciado também falhou. A Qualidade
contínua ainda estava em execução na última consulta. Os resultados e links são
mantidos em [RELATORIO_CI.md](../RELATORIO_CI.md) e [PENDENCIAS.md](../PENDENCIAS.md).

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

Os workflows que acessam ambiente exigem os secrets inventariados em
[`secrets.md`](./secrets.md), que deve ser reconciliado com cada YAML e com a
última execução. O E2E exige secrets de projeto, URL, chave publicável e contas
de teste do mesmo Supabase isolado. Ausência de credenciais deve falhar fechado;
os testes locais explicitamente opcionais registram `skip`.

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
