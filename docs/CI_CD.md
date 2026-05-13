# 🚀 Pipeline de CI/CD — Promo Gifts

Este documento detalha o fluxo automatizado de integração e entrega contínua do projeto.

## 1. Workflows do GitHub Actions

O repositório utiliza múltiplos workflows para garantir qualidade e segurança:

- **quality.yml**: Executa ESLint, Vitest, Playwright E2E e verificações de segurança em cada PR.
- **security-compliance.yml**: Auditoria automatizada de políticas RLS e permissões de Edge Functions.
- **db-performance-audit.yml**: Execução mensal de `EXPLAIN ANALYZE` para tabelas críticas.
- **bundle-check.yml**: Monitoramento de tamanho do bundle frontend para evitar regressões de performance.

## 2. Release Management (Semantic Release)

Adotamos o padrão de **Semantic Versioning** (SemVer) automatizado via GitHub Actions.

### Padrão de Commits
Para que o release automático funcione, os commits devem seguir:
- `fix: ...` → Patch release (v1.0.1)
- `feat: ...` → Minor release (v1.1.0)
- `perf: ...` ou `feat!: ...` → Major release (v2.0.0)

### Automação de Changelog
O arquivo `CHANGELOG.md` é atualizado automaticamente em cada merge na `main` que resulte em um novo binário/tag.

## 3. Ambientes

| Ambiente | URL | Trigger |
|---|---|---|
| **Development** | Lovable Preview | Commit em qualquer branch |
| **Staging** | `staging.promogifts.com.br` | Merge em `develop` |
| **Production** | `app.promogifts.com.br` | Tag de Release (Merge em `main`) |

## 4. Rollback
Em caso de falha crítica:
1. Reverter o PR no GitHub.
2. O workflow de deploy será disparado para a versão estável anterior.
3. Se necessário, executar manualmente a migration de "Down" documentada no PR original.
