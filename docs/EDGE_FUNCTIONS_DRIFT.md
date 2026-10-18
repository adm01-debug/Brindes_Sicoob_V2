# Estado canônico das Edge Functions

Atualizado em 16/10/2026 no projeto Supabase `cfmzkthhgliqelozlmwu`.

## Inventário verificado

- Funções ativas no Supabase: **100** (limite do projeto).
- Diretórios funcionais no repositório: **106**.
- Funções apenas locais e intencionalmente não implantadas: `e2e-auth-test`,
  `error-monitor`, `generate-mockup-nanobanana`, `migrate-helper`,
  `qa-block-monitor` e `sicoob-seed-debug`.
- Funções remotas sem fonte local: **0**.
- `_shared`, `tests` e `graphify-out` são suporte e não contam como funções.

## Contrato e publicação

O manifesto de autorização passou a declarar também o destino de runtime. O
script `scripts/deploy-edge-functions.mjs` deriva dele as 100 funções
publicáveis, preserva as seis fontes desativadas fora do Supabase e valida o
modo `verify_jwt` das 100 entradas. A publicação manual da branch `main` deixa
de manter uma lista parcial: publica o inventário inteiro, exige avanço de
versão e grava um relatório recuperável em
`artifacts/edge-deployment-report.json`.

O inventário remoto e os modos de gateway correspondem ao contrato versionado.
Isso não elimina, sozinho, a divergência de conteúdo: as fontes corrigidas só
se tornam canônicas no runtime depois do merge com CI aprovada e da execução do
workflow de publicação.

## Publicações deste lote

| Função | Versão remota | `verify_jwt` | Validação |
|---|---:|---:|---|
| `expert-chat` | 12 | `false` | autenticação interna; chamadas sem JWT e com JWT inválido retornam 401 |
| `trends-insights` | 9 | `false` | autenticação interna; chamadas sem JWT e com JWT inválido retornam 401 |

`verify_jwt=false` é deliberado nessas duas funções: ambas validam o token e o
vínculo Sicoob dentro do handler, antes de consultar segredo ou dados.

## Bloqueio externo conhecido

`LOVABLE_API_KEY` não consta nos segredos do ambiente. As funções estão
publicadas e protegidas, mas as jornadas autenticadas de IA responderão 503 até
o segredo ser homologado e cadastrado. O cadastro depende também da validação
jurídica do provedor, DPA, subprocessadores e transferência internacional.
