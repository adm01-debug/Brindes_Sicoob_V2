# AGENTS.md — Brindes_Sicoob_V2

Regras de ouro — Perfil Otimizado (Hermes Agent / multi-agente).
Auto-carregado por agentes compatíveis (Hermes, Claude Code, Codex, OpenCode).

## Idioma

**SEMPRE comunicar em Português do Brasil (pt-BR)** — respostas, comentários de código, mensagens de commit, descrições de PR e qualquer saída de texto em pt-BR. Nunca alternar para inglês.

## Sistema

- **Repo:** adm01-debug/Brindes_Sicoob_V2
- **Visibilidade:** privado
- **Descrição:** —
- **Branch padrão:** main

## Regra de ouro antes de agir

1. **Leia o README.md** (se existir) e qualquer doc em `docs/` antes de qualquer mudança — ele é a fonte de verdade do projeto.
2. **Pronto = ligado em produção com tráfego real.** Código existir não é pronto.
3. **Diagnóstico antes de patch.** Em bug de produção: leia logs/estado real antes de qualquer fix.

## GIT: Isolamento Worktree (OBRIGATÓRIO)

**NUNCA usar `git checkout -b` diretamente.** Sempre criar worktree isolado:

```bash
# 1. Gerar ID único
HERMES_BRANCH_ID="{{ h$(date +%s | tail -c 7) }}"
BRANCH="fix/hermes-${HERMES_BRANCH_ID}-<descricao>"
WORKSPACE="$HOME/hermes-workspaces/chat-${HERMES_BRANCH_ID}"

# 2. Criar worktree
git worktree add "$WORKSPACE" -b "$BRANCH" && cd "$WORKSPACE"

# 3. Verificar isolamento
[ "$(git branch --show-current)" = "$BRANCH" ] || exit 1

# ... trabalhar, commit, push, PR, merge ...

# 4. Cleanup obrigatório
git branch -D "$BRANCH"
git worktree remove "$WORKSPACE" --force
git worktree prune
```

**Por quê:** múltiplos agentes/chats no mesmo repo = colisão de branches.

## PR Flow

branch → commit (--no-verify) → push → PR via GitHub → CI → merge squash → delete branch.
Workers/editores NUNCA mexem em git/branches — só o orquestrador.

## Regras de trabalho

1. **Aja como dev sênior e decida.** Escolha de biblioteca, nome de arquivo, abordagem de fix: decida e siga. Só pergunte se envolver custo, mudança de arquitetura, dado destrutivo em produção ou trade-off real de negócio.
2. **Verdade acima de validação.** Não sabe → diga. Falhou → diga. Nunca "sucesso" fabricado.
3. **Zero churn / diff mínimo.** Não refatore nem reescreva arquivo inteiro para mudar 3 linhas.
4. **Execução end-to-end.** Nunca proponha "copie e cole" — execute inteiro até o artefato funcionar, com evidência real.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
