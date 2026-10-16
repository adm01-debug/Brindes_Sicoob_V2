# Reconciliação do contrato de Edge Functions — 16/10/2026

## Problema confirmado

O repositório contém 106 funções com `index.ts`, enquanto o projeto Supabase
canônico comporta e mantém 100 funções ativas. Seis fontes estão fora do runtime
por decisão registrada, mas somente quatro possuíam `runtime: "source-only"` no
manifesto. O workflow de publicação cobria nove funções e podia deixar as
demais correções restritas ao GitHub.

## Correção implementada

- `migrate-helper` e `generate-mockup-nanobanana` foram reconciliadas como
  `source-only`, completando as seis fontes desativadas.
- As sete funções que usam `verify_jwt=true` no runtime foram declaradas no
  contrato e no `supabase/config.toml`.
- `scripts/lib/edge-runtime-contract.mjs` deriva o inventário publicável do
  manifesto e falha se uma função estiver sem contrato ou se o limite de 100
  for ultrapassado.
- `scripts/deploy-edge-functions.mjs` valida as 106 fontes, recusa funções
  remotas não gerenciadas, publica exatamente as 100 permitidas, preserva o
  modo JWT, exige avanço de versão e registra progresso parcial e resultado.
- `.github/workflows/deploy-sicoob-functions.yml` usa o contrato integral e
  preserva o relatório como artefato.
- Três regressões automatizadas validam contagem, lista `source-only`, sete
  barreiras JWT e ausência da antiga lista parcial no workflow.

## Evidências executadas

| Verificação | Resultado |
|---|---:|
| Fontes locais cobertas | 106/106 |
| Funções publicáveis | 100 |
| Fontes `source-only` | 6 |
| Funções com gateway JWT | 7 |
| Gate estático de autorização | 106/106 |
| Cenários Node | 233/233 |
| Inventário e gateway do runtime canônico | correspondentes ao contrato |
| `git diff --check` | aprovado |

O teste remoto desta etapa compara presença, estado e `verify_jwt`; ele não
declara igualdade do conteúdo empacotado. A publicação das fontes corrigidas
permanece condicionada ao merge em `main`, conforme o fluxo obrigatório do
repositório. Na coleta de 16/10/2026, o GitHub recusou iniciar os jobs porque o
orçamento do Actions impedia uso adicional. Por isso nenhuma função foi
publicada a partir de uma branch ainda não aprovada.
