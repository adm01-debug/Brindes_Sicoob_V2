# Proteção da branch `main`

## Estado histórico observado em 22/09/2026

A regra remota exige uma revisão, mas não possui status checks obrigatórios e
permite bypass administrativo. PRs recentes foram mesclados com jobs em falha
porque o orçamento do GitHub Actions impediu a inicialização. Portanto, a
proteção atual não comprova qualidade nem segurança do conteúdo mesclado.

## Estado remoto confirmado em 29/10/2026

A regra de `main` foi atualizada e lida novamente pela API do GitHub. A branch
agora exige os dez checks abaixo, com atualização estrita da branch, uma
aprovação que é invalidada por novo commit, aprovação do último push, resolução
de conversas e aplicação também a administradores. Histórico linear permanece
obrigatório; force push e exclusão continuam desativados.

| Check obrigatório | Origem |
|---|---|
| `Gitleaks — Secret Scan` | Security Scan |
| `npm audit — CVE Scan` | Security Scan |
| `Analyze (javascript-typescript)` | CodeQL |
| `Segurança, contratos e build` | CI de segurança/contratos |
| `e2e` | E2E (Playwright) |
| `bundle-stats` | Bundle Size Check |
| `lighthouse` | Lighthouse Performance Audit |
| `Verba e aprovação transacionais` | Portal Sicoob |
| `Entrada e demonstração responsivas` | Portal Sicoob |
| `Validar origem confiável` | E2E (Playwright) |

**Evidência:** API de branch protection consultada antes e depois da alteração;
os dez contextos retornaram com `app_id=15368` (GitHub Actions), `strict=true`,
`enforce_admins=true` e `required_conversation_resolution=true`. O PR #157
permanece aberto e bloqueado, coerente com a regra nova; a `main` não foi
alterada e não houve deploy.

**Limite da validação:** a configuração foi comprovada pela API e o bloqueio
atual de PR foi observado. Não foi tentado bypass administrativo, exclusão ou
force push, pois esses testes seriam destrutivos. Os checks ainda falhos ou em
execução não autorizam merge; ver `PENDENCIAS.md` e `RELATORIO_CI.md`.

## Configuração ativa e lacunas

Configuração ativa em
<https://github.com/adm01-debug/Brindes_Sicoob_V2/settings/branches>:

- pull request com pelo menos uma aprovação;
- descarte de aprovação após novo commit;
- resolução de todas as conversas;
- branch atualizada antes do merge;
- os dez checks listados acima para qualidade, Sicoob, segurança, E2E e UX;
- aplicação da regra também a administradores;
- force push e exclusão desativados.

Os contextos foram conferidos nos `check_runs` reais dos PRs. Alguns checks
continuam falhando ou aguardando execução; sua exigência impede o merge enquanto
isso não for resolvido. O `branch-protection-sentinel.yml` fornece auditoria
complementar; ele não substitui a regra do GitHub.

`Migration ledger drift` não é um check de PR: o workflow roda por agenda ou
despacho manual no environment `construction` e usa `SUPABASE_ACCESS_TOKEN`, uma
credencial administrativa. Não é seguro expor esse token ao código ainda não
revisado de um PR público. Antes de integrar alterações de migrations, um
responsável deve executar o preflight do workflow contra o SHA candidato e
registrar a execução bem-sucedida; essa lacuna de integração contínua permanece
aberta.

## Testes de configuração ainda pendentes

1. O PR #157 sem todos os checks aprovados está bloqueado; isso já confirma o gate de checks, mas não testa cada regra isoladamente.
2. Ainda não foi feita uma tentativa de bypass administrativo.
3. Não foram tentados force push ou exclusão da `main`, pois seriam ações destrutivas.
4. Falta registrar executor/revisor nominal e evidência de release com a configuração capturada.

Hotfixes seguem PR, revisão e checks. Exceções precisam de incidente registrado
e revisão posterior; não devem permanecer como bypass permanente.
