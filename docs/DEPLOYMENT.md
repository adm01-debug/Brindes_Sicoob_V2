# Publicação e migrations

## Estado e limites

O projeto está em construção. Este guia descreve os fluxos versionados para o
ambiente protegido `construction`; não afirma que o portal esteja em produção
ou que qualquer publicação específica tenha sido executada com sucesso.

O repositório exige Node.js `>=24 <25` (`package.json`). Use Node 24.x e npm.
Não existe script `npm run deploy`. A publicação do frontend depende do
provedor configurado para o projeto e deve ser comprovada pelo respectivo
deploy e smoke test.

## Publicar Edge Functions Sicoob

Use somente o workflow [Publicar funções Sicoob](../.github/workflows/deploy-sicoob-functions.yml):

1. Faça merge da alteração revisada em `main`.
2. Abra **Actions → Publicar funções Sicoob → Run workflow**, selecione `main`
   e digite `PUBLICAR` no campo de confirmação.
3. O workflow exige o ambiente protegido `construction` e valida a versão
   publicada de cada função da allowlist. Consulte a execução e os logs do job
   antes de registrar sucesso.

Não substitua esse fluxo por um deploy manual de uma lista diferente de funções.

## Aplicar migrations autorizadas

Use somente o workflow
[Aplicar migrations Sicoob](../.github/workflows/apply-sicoob-migrations.yml).
Ele aceita execução manual na `main`, exige digitar `APLICAR`, usa o ambiente
protegido `construction` e aplica a allowlist validada pelo script
`scripts/db/apply-sicoob-migrations.mjs` com verificação de ledger e contrato.

**Não execute `supabase db push`, `supabase db push --linked` ou
`--include-all` neste repositório.** O histórico do ledger contém divergências
catalogadas; o nome ou a existência de um arquivo SQL não prova que seu efeito
esteja ausente do banco. Não aplique arquivos fora da allowlist autorizada pelo
workflow nem grave secrets em arquivos versionados.

Detalhes de preflight e de aplicação manual controlada estão em
[RUNBOOKS/MCP_DDL_APPLICATION.md](./RUNBOOKS/MCP_DDL_APPLICATION.md).

## Verificação da publicação

- Confirme conclusão `success` na execução do workflow correspondente.
- Para migrations, confirme no job a verificação das versões aplicadas e dos
  contratos remotos.
- Para funções, confirme que as versões remotas avançaram para cada item da
  allowlist.
- Registre link da execução, SHA da `main`, ambiente e resultado em relatório
  datado. Uma execução local ou o código versionado não comprovam estado remoto.
- Não marque go-live sem completar os critérios de
  [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) e obter os aceites operacionais.
