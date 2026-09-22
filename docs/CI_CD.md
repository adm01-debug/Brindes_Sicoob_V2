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
