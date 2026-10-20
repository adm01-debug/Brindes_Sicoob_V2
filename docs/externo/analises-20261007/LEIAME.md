# Lote 2 — análises 2026-10-07 (`analises/Brindes_Sicoob_V2`)

Importação de `~/projetos/analises/Brindes_Sicoob_V2/2026-10-07-1791404511/` para
`docs/externo/analises-20261007/`, em 20/10/2026. São os artefatos da rodada de
análise e verificações de 07/10 (achados, decisões, contratos, logs, evidências
visuais). Estrutura de subpastas (`visual/`) preservada. Nomes de arquivo
originais mantidos — inclusive os 4 `.log`, adicionados com `git add -f`
exceção consciente: o `.gitignore` do repo ignora `*.log` (logs de build),
mas aqui são documentos externos arquivados, não artefatos gerados.

`secret-names.json` contém **só nomes** de variáveis (sem valores) — verificado
na importação. Pré-scan de segredos nos 20 arquivos de texto: 0 ocorrências
(padrões de chaves/tokens/URLs com credencial).

## Arquivos deste lote (24, ~2 MB; texto somado ≈ 77 KB)

| Arquivo                             | Tamanho       | SHA-256 (12) |
| ----------------------------------- | ------------- | ------------ |
| achados.json                        | 5437 bytes    | c9bea9f14738 |
| analise-e-decisoes.html             | 23455 bytes   | 5885d56c79c2 |
| analise-e-decisoes.pdf              | 116917 bytes  | beb741917d52 |
| connections.json                    | 981 bytes     | b0875e4bbfa5 |
| consultas-github-vs-implantado.json | 1060 bytes    | 730f6a9f07f9 |
| contrato-catalogo.json              | 934 bytes     | d8c839ec3a9e |
| db-operacional.json                 | 8764 bytes    | 844a0c1c1a3c |
| decisoes.json                       | 12801 bytes   | 8f5b200c1155 |
| edge-contract-diff.json             | 2072 bytes    | fb58eb6caf25 |
| http-worker-status.json             | 226 bytes     | 97506ad4e63c |
| npm-audit.json                      | 8171 bytes    | 3b45ef2eabf4 |
| resumo-verificacoes.json            | 929 bytes     | aae6bf146911 |
| rotinas-confirmadas.json            | 376 bytes     | da7d96197c73 |
| secret-names.json                   | 517 bytes     | 56e05334ced8 |
| sql-governanca.log                  | 5179 bytes    | e47cf056db00 |
| sql-identidade-formato.log          | 1001 bytes    | 78074ce86cfc |
| sql-identidade.log                  | 926 bytes     | c6afb93a0833 |
| types.log                           | 206 bytes     | c79d8b5f8aff |
| visual-metrics.json                 | 159 bytes     | 3d4da60a5fa3 |
| visual/demo-resultado.json          | 2452 bytes    | 89e2258ced14 |
| visual/login-390.png                | 42397 bytes   | 97e92aa3f16f |
| visual/loja-1440.png                | 1242673 bytes | 5f5a302fb2f9 |
| visual/loja-390.png                 | 554857 bytes  | 632a722d7828 |
| visual/resultado.json               | 1585 bytes    | 8081d9bb18e2 |

## Fica para o lote 2b (mesma origem, ~78 KB de texto)

- `build.log` (60383 bytes)
- `scenarios.log` (17835 bytes)

Fatiado para respeitar o teto de 90 mil caracteres de texto por entrega.
