# Progresso de execução do plano — 31/10/2026

## Escopo e referência

Esta rodada começou com uma worktree limpa da `origin/main`, SHA `e9d59026793b84fabeaeec9da890a068f64d49c3`, na branch `fix/hermes-61031-plan-lote`. A base local anterior estava 84 commits atrás e continha mudanças não revisadas; ela foi preservada e não foi usada como origem do trabalho.

O plano vigente é o [encerramento em 100 etapas e 1.000 subetapas](../plano-implementacao/plano-encerramento-100-etapas-20261001/plano.md). A [auditoria funcional de 11/10](./lacunas-funcionalidades-2026-10-11.md) é um snapshot anterior ao SHA desta rodada; suas contagens não são apresentadas como medição atual. Não há aceite formal do plano nesta rodada.

## Baseline reproduzido antes das alterações

Ambiente: Node `v24.19.0`, npm `11.17.0`, dependências instaladas com `npm ci`.

| Verificação | Resultado |
|---|---|
| Build | Passou; Vite emitiu avisos de variáveis de build ausentes, PostCSS/importação e chunks grandes. |
| Lint | Exit 0; 0 erros e 873 avisos no escopo `src`. |
| Typecheck | Passou nos projetos app e node. |
| Suíte Vitest completa | 452 arquivos passaram, 4 ignorados; 5.839 testes passaram, 68 ignorados. |
| `npm audit` antes do lote | 17 advisories: 15 moderados, 2 altos (`undici` e `zod`). |

## Lote implementado

### Histórico do orçamento: erro separado de resultado vazio

Em `src/components/quotes/QuoteHistoryTimeline.tsx`, a falha de consulta de `quote_history` ou `profiles` agora mostra mensagem de indisponibilidade e ação de retry. A mensagem “Nenhum evento registrado” fica reservada à resposta válida sem eventos. Em `tests/components/QuoteHistoryTimeline.test.tsx`, foram adicionados cenários de lista vazia, falha inicial e recuperação por retry.

O teste focal passou: 1 arquivo, 3 testes. Build, lint, typecheck e suíte completa foram repetidos após a alteração, conforme a comparação abaixo. Não foram alterados contratos de API, migrations, esquema, dados ou funções remotas.

## Revisões especializadas e lacunas confirmadas

Foram coordenados cinco pareceres somente leitura (E2E, CI/workflows, banco/migrations, frontend/UX, segurança/dependências). Os resultados convergem nos pontos abaixo:

1. **Jornada A19 de orçamento continua sem prova ponta a ponta.** O E2E aceita catálogo vazio e não submete nem verifica ID/persistência. O próximo teste deve usar fixtures controladas, afirmar chamadas e payload, resposta e detalhe, além de um cenário 4xx. Uma execução autenticada real ainda depende de homologação dedicada.
2. **Autorização por cooperativa/papel carece de cobertura adversarial completa.** O teste de rota verifica sessão ausente, não todos os casos de usuário autenticado fora do escopo.
3. **Banco e Edge Functions seguem bloqueados para reconciliação operacional.** Os relatórios anteriores registram migrations divergentes e falta de acesso de publicação. Este lote não acessou banco, não aplicou migration e não publicou função.
4. **CI tem falhas em execução recente na `main`.** A mais nova é Migration ledger drift, run [41175713780](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41175713780): “Verificação indisponível (Error); nenhum resultado aprovado”. A mensagem não revela causa raiz; o próximo passo é adicionar diagnóstico seguro e redigido e reproduzir. Permanecem falhas observadas em publicação Sicoob, Security Scan, Qualidade contínua, CodeQL e Copilot. Inventário e evidências estão em [`RELATORIO_CI.md`](../../RELATORIO_CI.md) e [`PENDENCIAS.md`](../../PENDENCIAS.md).
5. **Dependências vulneráveis:** o ajuste não-forçado atualizou `undici` 8.10.2→8.12.3 dentro da faixa principal já usada e baixou o audit de 17 para 14 (13 moderados, 1 alto). Zod 4.6.7 foi testado e descartado: typecheck aponta incompatibilidades na API de enums/errors e o resolver 3.10.0 lança em validação inválida. O alto de Zod segue pendente de migração explicitamente testada.
6. **Documentação:** `docs/README.md` agora identifica a proveniência do índice legado e aponta para a auditoria funcional e o plano vigente, sem apagar o histórico importado.

## Validação final desta rodada, antes do commit

| Verificação | Baseline (`e9d590267`) | Após alterações | Resultado |
|---|---:|---:|---|
| Build | Passou, 51,91 s | Passou, 53,75 s | Sem regressão; avisos existentes de configuração/chunks permanecem. |
| Lint | 0 erros, 873 avisos | 0 erros, 873 avisos | Sem regressão no escopo total `src`. |
| Typecheck | Passou | Passou | Sem regressão. |
| Vitest | 5.839 passaram, 68 ignorados | 5.841 passaram, 68 ignorados | +2 testes, nenhum teste adicional ignorado; 452 arquivos passaram e 4 foram ignorados em ambos. |
| Teste focal da timeline | — | 3 passaram | Inclui falha, retry com recuperação e resposta vazia. |
| Lint focal | — | Passou | Os arquivos alterados passaram ESLint; mantida a formatação existente para evitar churn não relacionado. |
| `npm audit` | 17 advisories, 2 altos | 14 advisories, 1 alto | `undici` corrigido dentro da major; a migração major de Zod foi rejeitada por regressão reproduzida. |

`git diff --check` também foi executado após a correção de whitespace e não reportou problema. A comparação não certifica homologação autenticada nem corrige os advisories do baseline.

## Próximos lotes

1. Registrar os resultados pós-alteração e revisar o diff completo.
2. Diagnosticar a falha do ledger com logging redigido e teste de sanitização, sem alterar os dados remotos.
3. Corrigir as causas confirmadas de dependências/CodeQL/publicação com um commit por causa raiz e revalidar todos os checks.
4. Fortalecer o E2E A19 e validar papéis entre cooperativas em QA isolado.
5. Triar migrations por semântica e dependências; qualquer operação remota exige backup restaurável, ambiente e autorização específicos. Não executar `db push`, repair ou deploy em lote.
6. Prosseguir nas etapas restantes do plano, registrando evidência local/remota e aceite formal para cada subetapa. O plano permanece incompleto.
