# Validação de CI, skips críticos e observabilidade — 16/10/2026

## Escopo e limite

Este lote validou os gates locais de CI, a dívida de testes ignorados e os
contratos estáticos de observabilidade. O sistema continua em construção. As
evidências abaixo não representam produção, tráfego real, aceite humano nem uma
execução completa do GitHub Actions.

O documento histórico
[`plano-workflows-github-100-etapas-20260927.md`](../plano-implementacao/plano-workflows-github-100-etapas-20260927.md)
contém cem ações propostas, mas não possui estado executado por etapa e declara
no próprio cabeçalho “plano, nada executado”. Portanto, a existência desse
arquivo não certifica as cem etapas. A conclusão de itens externos depende de
evidência do GitHub, Supabase, provedor de deploy ou responsável humano.

## Correções realizadas

1. O gate de skips críticos deixou de comparar apenas a quantidade e passou a
   comparar um inventário versionado por arquivo, tipo e título. A troca de um
   skip antigo por outro novo, mantendo a mesma contagem, agora falha.
2. O teste de default de markup do adaptador de preço foi reativado porque o
   comportamento já existe no código.
3. O cenário P0 de recuperação de senha foi reativado com a API de solicitação
   interceptada. Ele não grava no banco e verifica o link, a tela, a confirmação
   genérica e a ausência de enumeração de email.
4. O dado sintético desse cenário deixou de conter a palavra “inexistente”, que
   causava falso positivo no seletor anti-enumeração.
5. O capturador global de warnings de ref foi ligado ao `vitest.config.ts`.
   Antes, o arquivo existia, mas não era carregado pela suíte.
6. O capturador passou a lançar uma falha no hook do Vitest. Apenas alterar
   `process.exitCode` era revertido pelo runner e deixava a suíte verde.
7. `ci.yml` agora ativa o gate estrito durante a suíte com cobertura, consolida
   o snapshot de console e publica o artifact por 14 dias.
8. `ci.yml` passou a executar o gate de propagação de `X-Request-Id` e a
   validação de consistência documental.
9. A documentação de observabilidade passou a distinguir contratos locais de
   alertas externos ainda sem comprovação operacional.

## Evidências executadas

| Verificação                       | Resultado observado                                                          |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Inventário de skips críticos      | `26/26`, uma redução validada sobre o baseline anterior de 27                |
| Cenários do inventário            | 2/2 aprovados, incluindo substituição com contagem constante                 |
| Cenários dos quality gates        | 7/7 aprovados                                                                |
| Suíte completa de cenários Node   | 230/230 aprovados                                                            |
| Adaptador de preços               | 13/13 testes aprovados; o teste reativado passou                             |
| Playwright anti-enumeração        | 1/1 aprovado, um worker, zero retry e API interceptada                       |
| Prova negativa do gate de ref     | warning controlado reprovou a suíte com status 1                             |
| Prova normal do gate de ref       | 13/13 aprovados, 5 warnings comuns e zero warning de ref                     |
| Logging estruturado Edge          | 106 funções inventariadas: 29 instrumentadas, 76 legadas e 1 inerte revisada |
| Propagação de request id          | 9/9 Edge Functions críticas aprovadas                                        |
| Consistência documental           | aprovada                                                                     |
| Sintaxe YAML do workflow          | carregada com sucesso                                                        |
| Formatação dos arquivos alterados | aprovada pelo Prettier                                                       |

Os testes usaram dependências já instaladas em um worktree com o mesmo
`package-lock.json` (SHA-256
`af53b67c26fe9515ed181f63c9993a1a26f6788cf7a5dc7cd685d962197f5d02`).

## Pendências e bloqueios que permanecem

- Existem 26 skips críticos inventariados. Dezesseis são cenários P0
  explicitamente desativados, seis dependem de credenciais/SDK remoto e quatro
  são suítes condicionais de RLS ou segurança.
- O gate de logging aceita 76 Edge Functions legadas por allowlist. Ele impede
  crescimento, mas não transforma essas funções em instrumentadas.
- O gate de correlação cobre nove funções críticas inventariadas. A cobertura
  não deve ser interpretada como prova de todas as 106 funções.
- A ativação de regras do Sentry, canais Slack/PagerDuty e cron de métricas não
  foi comprovada no provedor.
- A suíte integral com cobertura, as simulações PostgreSQL, o build e os três
  shards E2E precisam rodar no SHA final depois da integração dos demais lotes.
- O workflow alterado só fica certificado depois de uma execução verde no
  GitHub Actions. Este lote não altera branch protection, billing, secrets,
  environments, revisores nem configurações externas de deploy.
