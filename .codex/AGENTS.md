# Codex CLI neste repositório

Suplemento ao `AGENTS.md` da raiz (fonte das regras). Aqui só o baseline local do Codex.

## Skill do repo

- Skill voltada ao Codex: `.agents/skills/brindes-sicoob-v2/SKILL.md`
- Skill equivalente para o Claude Code: `.claude/skills/brindes-sicoob-v2/SKILL.md`
- Credenciais e MCPs privados ficam em `~/.codex/config.toml`, nunca neste repo.

## Baseline de MCP

`.codex/config.toml` é o baseline padrão para trabalho neste repositório: GitHub, Context7, Exa,
Memory, Playwright e Sequential Thinking.

## Multi-agente

- Explorer: levantamento de evidência, somente leitura
- Reviewer: correção, segurança e regressão
- Docs researcher: verificação de API e release notes

## Ordem de leitura

1. `AGENTS.md` (raiz) — regras do dono.
2. `docs/agentes/<tema>.md` — detalhe de banco, GitHub/CI, mapa do repo, serviços e regras de domínio.
3. Skill do repo (acima) — convenções de código e commit.
