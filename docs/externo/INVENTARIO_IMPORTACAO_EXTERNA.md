# Inventário da importação de arquivos externos — Brindes_Sicoob_V2

Varredura exaustiva de `/home/joaquim_ataides` (fora do repositório) em 20/10/2026.
Destino: `docs/externo/`. Arquivos `:Zone.Identifier` (metadado do Windows) ignorados.

## O que foi importado neste lote

`docs/externo/docs-fornecidos-20260911/` — 13 arquivos, 74,5 MB, origem
`~/projetos/Brindes Sicoob V2 - Docs` (manuais do cooperado, cartilhas,
catálogos de brindes, portal de compras). PDFs não entram na contagem de
revisão; único texto contado é o `.xlsx` (~10 KB).

## Fontes mapeadas que ficam para lotes seguintes

Cada lote de texto precisa respeitar o teto de revisão (90 mil caracteres
adicionados por entrega). Estimativas de texto (binários de imagem/PDF já
descontados):

| Fonte | Arquivos | Texto aprox. | Destino proposto |
|---|---|---|---|
| `~/projetos/Brindes Sicoob V2 - Analise` (dossiê, backlog, atas, zips) | 39 | 4,1 MB | `docs/externo/analise-20260911/` (fatiar em ~45 entregas ou pedir via de exceção ao integrador; zips são duplicatas do conteúdo expandido — não importar) |
| `~/projetos/Brindes Sicoob V2 - Plano de Implementacao` (plano 100 etapas) | 22 | 2,7 MB | `docs/externo/plano-20260911/` (fatiar; zip é duplicata — não importar) |
| `~/auditorias/sicoob-2026-10-13` (auditoria completa + reproduções) | 584 | 50,6 MB | `docs/externo/auditoria-20261013/` (fatiar em vários lotes) |
| `~/projetos/analises/Brindes_Sicoob_V2` (logs/jsons 07/10) | 26 | 155 KB | `docs/externo/analises-20261007/` (2 lotes) |
| `~/projetos/Brindes_Sicoob_V2-graphify-docs-20261005/SHA256SUMS` | 1 | 106 KB | `docs/externo/graphify-sha-20261005/` (1 lote próprio, acima do teto sozinho — fatiar ou exceção) |

## Excluídos com motivo (não são do projeto ou são intocáveis)

- `~/hermes-workspaces/Brindes_Sicoob_V2/*` (audit, chat, execucao, validacao) — workspaces de outros chats: intocáveis pela regra um chat = um workspace.
- `~/hermes-workspaces/refazer2-tmp/*`, `zapp-worktrees/*`, `~/auditorias/fase-f/*`, `~/projetos/analises/zapp_*` — projeto Zapp Web V2, não Brindes.
- `~/Downloads/promo-brindes-carnegie` — outro projeto (Promo_Brindes_V1).
- `~/projetos/promo-brindes-claude-skills/sicoob-sicredi-cooperativas/SKILL.md` — skill de outro contexto; não copiar para não duplicar.
- `~/.claude/projects/*Brindes-Sicoob-V2*` — metadados do Claude Code, não arquivos do projeto.
- `*.zip` dentro das pastas Analise/Plano — duplicatas do conteúdo já expandido nas mesmas pastas.
