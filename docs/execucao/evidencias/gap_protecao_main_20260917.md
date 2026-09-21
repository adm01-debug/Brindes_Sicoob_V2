# Investigação: gap de branch protection — commits sem PR (17/09/2026)

## Pergunta

Por que os commits `e3db49229`, `824cfa3bf`, `1fd123847` e `d6974924f` — com schema
real já aplicado em produção (ACL/falsificação de identidade, `security_invoker`,
revogação de TRUNCATE, tabelas `password_reset_requests`/`audit_log`) — estão no
GitHub sem nenhuma PR cobrindo, mesmo com a proteção de `main` (Etapa 2 do plano
principal) já aplicada em 16/09/2026?

## Evidência coletada

**Config atual de proteção de `main`** (`gh api repos/adm01-debug/Brindes_Sicoob_V2/branches/main/protection`):
`required_pull_request_reviews` (1 aprovação, dismiss stale), `required_linear_history=true`,
`allow_force_pushes=false`, `allow_deletions=false`, `enforce_admins=false`. Nenhum
`required_status_checks` configurado (ausente na resposta) — já documentado como
decisão deliberada na Etapa 2 do plano principal ("deixados de fora até a Etapa 46,
CI ainda vermelho").

**PR #10** (`gh pr view 10 --json mergedAt,mergeCommit,commits`): mesclada em
`2026-09-16T16:02:48Z`, com **exatamente 1 commit** (`6f6a34776`, sha do merge
`fb8d1fcad`).

**Os 4 commits em questão**: todos no branch remoto `origin/execucao/sicoob-reconciliacao-20260916`
(`git branch -r --contains e3db49229`) — **nunca em `main`**.

## Causa raiz

**Não é bug nem gap na proteção.** Proteção de branch no GitHub restringe o que
pode ser **mesclado EM** `main` — não restringe (e não tem como restringir) commits
feitos em qualquer outra branch. Os 4 commits existem porque a branch de trabalho
`execucao/sicoob-reconciliacao-20260916` seguiu recebendo commits novos depois que
a PR #10 (que cobria só o primeiro commit da série) já tinha sido mesclada — e
ninguém abriu uma segunda PR pra trazer o resto. A proteção está funcionando
exatamente como configurada; o que falta é um passo de processo (abrir a PR),
não uma correção de configuração.

## Mitigação

Não há nada pra "corrigir" na configuração de branch protection. A mitigação é
abrir a PR retroativa cobrindo os 4 commits — já é a Etapa 2/3 da Fase A deste
mesmo plano de correções (`plano-correcoes-auditoria-50-etapas-20260917.md`),
ainda pendente de execução por decisão do usuário (ação que afeta estado
compartilhado, não é pra ser feita sem confirmação explícita).

Item separado, não relacionado a este gap, mas notado aqui por completude: a
ausência de `required_status_checks` é uma lacuna conhecida e já rastreada na
Etapa 46 do plano principal — não é nova, não precisa de ação aqui.

## Veredito

Causa raiz identificada com evidência direta da API do GitHub. **Aceite: sem
mitigação de configuração necessária — comportamento esperado.** A ação
pendente (abrir/mesclar a PR) já está rastreada em outra etapa deste plano.
