# 04 — Plano de correção em etapas

Gerado pela auditoria de QA de 22–23/11/2026 (ver `01-INVENTARIO.md`, `02-CENARIOS.md`, `03-ACHADOS.md`).
Progresso em `05-PROGRESSO.md`.

---

## Instruções para o agente executor

Você vai executar este plano **sem acesso ao agente que o escreveu e sem esta conversa**. Tudo o que
você precisa está neste arquivo e nos outros quatro de `docs/qa/`. Leia estas regras antes da Etapa 001
e volte a elas sempre que uma etapa parecer ambígua.

### Como trabalhar

1. **Uma etapa por vez, na ordem**, respeitando o campo `Depende de`. Cada etapa tem a sua **própria
   branch e a sua própria PR**: `claude/<fix|feat|chore|docs|refactor|ci>-<slug>-<AAMMDD-HHMM>`, a
   partir de `main` atualizado. Nunca commite em `main`; nunca escreva em branch que você não criou
   nesta sessão.
2. **Antes de mudar qualquer coisa, releia a evidência da etapa no código atual.** Abra o arquivo na
   linha citada e confirme que o trecho está lá e diz o que a etapa afirma. Este repositório recebe PRs
   de vários agentes ao mesmo tempo, então o código muda sob o plano. **Se o código já não corresponde:
   pare a etapa, escreva em `05-PROGRESSO.md` o que encontrou (com `arquivo:linha` do estado atual) e
   siga para a próxima etapa independente.** Não adapte a etapa por conta própria.
3. **Antes de abrir PR, liste as PRs abertas** (`github_graphql`). Se houver PR aberta tocando os mesmos
   arquivos, **pare e avise o dono**; não trabalhe nela nem abra outra por cima.
4. **Corrija a causa raiz com a menor mudança possível.** Não refatore, não renomeie, não reorganize,
   não "melhore" e não comente o que a etapa não pede. Diff mínimo, zero churn. Dependência nova ou
   bump major só se indispensável, e avise na PR.
5. **Problema novo encontrado no caminho não é corrigido na hora.** Anote em `05-PROGRESSO.md`, na
   seção "Achados novos", com `arquivo:linha`. Nada de "aproveitei e também…".
6. **Etapa marcada com `Precisa de aprovação humana: sim` fica com a PR aberta, aguardando o dono.**
   Não ative auto-merge nela. As demais seguem o fluxo normal do `AGENTS.md` (CI verde, conversas de
   bot resolvidas, squash-merge, branch apagada).
7. **Uma etapa só é concluída com a verificação executada e a evidência anotada.** Cole no progresso a
   saída do comando, o resultado da consulta ou o corpo da resposta. "Deveria funcionar" não conclui
   etapa. "Pronto" = PR mergeada + deploy confirmado + comportamento verificado.
8. **Não resolva teste vermelho com `skip`.** O orçamento de skip de `tests/p0`, `tests/rls` e
   `tests/security` é catraca de CI (`scripts/check-critical-test-skip-budget.mjs`).
9. **Travou** (sem acesso, MCP com erro, dependência quebrada): reporte o erro exato no progresso e
   pare aquela etapa. Não contorne regra e não pivote.

### O que rodar antes de cada PR

Com `node_modules` instalado (`npm ci`):

```bash
node scripts/tscheck-files.mjs <arquivos tocados>
```

```bash
npx eslint <arquivos tocados>
```

```bash
npx vitest run <caminho de teste correspondente>
```

A dívida de lint e de typecheck do repositório está em **zero** (`.eslint-baseline.json`,
`.typecheck-baseline.json`): não há margem. Só erro introduzido por você conta; erro herdado da `main`
vai para "Achados novos" no progresso.

### Gates de CI específicos deste repositório que o plano assume

| Gate | O que ele exige | Quando morde |
|---|---|---|
| `scripts/check-seller-scope.mjs` | query a `quotes`, `orders` ou `discount_approval_requests` aplica escopo de vendedor em até 40 linhas do `.from` | qualquer etapa que toque consulta dessas três tabelas |
| `scripts/check-edge-authorization.mjs` | toda função em `supabase/functions/<name>/index.ts` está no `edge-authz-manifest.ts` | qualquer etapa que crie, renomeie ou remova edge function |
| `scripts/check-security-definer-acl.mjs` | função `SECURITY DEFINER` com ACL correta | etapas de banco |
| `scripts/check-critical-test-skip-budget.mjs` | número de skips por arquivo não cresce | qualquer etapa que toque `tests/p0`, `tests/rls`, `tests/security` |
| `scripts/check-sicoob-hardcoded-colors.mjs` | sem `text-/bg-/border-` de `emerald`, `amber`, `red`, `blue` em `src/pages/sicoob` e `src/components/sicoob` | etapas de UI Sicoob — use os tokens (`bg-sicoob-green`) |
| `scripts/check-route-error-element.mjs` | rota declarada tem `errorElement` | etapas de rota |
| `scripts/check-agents-md-integrity.mjs` | integridade do `AGENTS.md` e de `docs/agentes/` | etapas que alterem esses documentos |

### Regras de banco que o plano assume

- **DDL nunca é aplicado direto.** O fluxo é: arquivo `.sql` em `supabase/migrations/` → PR → merge →
  entrada na allowlist → `apply-sicoob-migrations.yml` (dispatch com `APLICAR`, environment
  `construction`). `supabase db push` é proibido. Migration já mesclada é **imutável**: corrija com
  migration nova.
- **Toda etapa de DDL é `Precisa de aprovação humana: sim`.**
- Policy nova usa helper semântico (`is_dev`, `is_supervisor_or_above`, `can_view_audit_logs`, …),
  **nunca** `has_role(auth.uid(),'admin')` (`docs/RBAC_HELPERS.md`).
- Helper novo: `STABLE` + `SECURITY DEFINER` + `search_path=public` + `GRANT` a `authenticated, anon`,
  **e** entrada na matriz de `tests/rls/telemetry-logs-connections-access.test.ts`.
- RLS ligada em toda tabela nova. Backup em `_backup_<tabela>_YYYYMMDD` antes de qualquer `DROP`.
- **Diagnóstico em produção é somente leitura.** Teste de banco vai em Postgres descartável
  (`scripts/qa/simular-*.py`).

### Limite de fila

Não abra PR nova enquanto houver **mais de 5 PRs suas abertas**. Esvaziar a fila tem prioridade sobre
aumentá-la. Depois de criar a PR, ative `gh pr merge <n> --auto --squash` (exceto nas etapas que
exigem aprovação humana) e acompanhe até `MERGED`.

### Ondas

As etapas estão agrupadas em ondas. Dentro de cada onda, respeite as dependências; entre ondas, não
comece a seguinte antes de fechar as etapas da anterior que outras dependem.

| Onda | Tema |
|---|---|
| 1 | Segurança e risco de perda de dado |
| 2 | Fluxos principais quebrados |
| 3 | Integridade de dados e regras de negócio |
| 4 | Funcionalidades incompletas |
| 5 | Robustez: erros, estados, concorrência |
| 6 | Performance |
| 7 | Experiência de uso e consistência |
| 8 | Higiene: código morto, CI, observabilidade |

---

## Etapas

<!-- ETAPAS:INICIO -->
