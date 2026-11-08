# scripts/graphify

Instala e configura o [graphify](https://pypi.org/project/graphifyy/) neste clone: grafo de código em
`graphify-out/` (fora do Git — ver `.gitignore`), usado antes de buscar por texto.

- `npm run graph:setup` → `setup.sh`: instala o graphify (via `uv` ou `pipx`), registra os hooks
  `post-commit`/`post-checkout` do graphify em `.husky/` e gera o grafo.
- `npm run graph:update` → `graphify update .` (só AST, sem custo de API).
- Versão fixada em `GRAPHIFY_VERSION` dentro de `setup.sh` (hoje `0.9.73`, a mesma de
  `.devin/skills/graphify/.graphify_version`). O hook de sessão da nuvem
  (`.claude/hooks/session-start.sh`) lê essa linha — ao trocar a versão, troque só ali.
- Secrets: nenhum.
