# Progresso de execução do plano — 30/10/2026

## Referência

- Branch de trabalho: `fix/ci-workflows-h369570`.
- SHA de referência antes deste lote: `a6df966588cbd284a8026bb8584f5b9549c3916a`.
- Plano relacionado: `PLA-T081` — paginação e distribuição logística, descrita em `docs/execucao/lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md`.
- Escopo deste registro: lote incremental de leitura do relatório logístico. Este documento não representa fechamento do plano de 100 etapas ou dos 1.000 subitens.

## Alteração candidata

`src/services/sicoob/logisticsReportService.ts` consultava todas as remessas de uma vez, usando a lista completa de IDs de pedidos no filtro `.in('order_id', orderIds)`. Agora divide essa lista em lotes de até 100 IDs e consulta cada lote sequencialmente. Erros de qualquer lote continuam sendo propagados para que a tela apresente falha em vez de um relatório incompleto. A autorização permanece nas policies RLS existentes; nenhuma consulta usa credencial privilegiada.

O teste `tests/services/sicoobLogisticsReportService.test.ts` cobre 401 pedidos e comprova cinco lotes de remessas (`100 + 100 + 100 + 100 + 1`), além das páginas de pedidos.

Também foi endurecido parcialmente o item **PLA-T075**: o scanner só emite parecer aceito quando a resposta contém o SHA-256 correspondente ao arquivo enviado. O hash confirmado é incluído na evidência de inspeção. Testes locais cobrem parecer ausente, divergente e correspondente (com comparação hexadecimal sem distinção entre maiúsculas/minúsculas).

## Revisão da evidência do lote

A contagem do teste foi reconciliada com o código atual: são **401 pedidos**, paginados em três consultas de pedidos (`200 + 200 + 1`), e cinco consultas de remessas (`100 + 100 + 100 + 100 + 1`). O documento inicial deste lote citava 201 pedidos; esse número estava desatualizado. O cenário prova a divisão em lotes e a ausência de duplicação de pedidos, mas não comprova >1.000 remessas, ordenação/paginação estável de remessas, concorrência, alocação por item/destino nem aceite operacional.

No CI da PR #176, o run [41094675064](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41094675064) confirma que `E2E_SUPABASE_PROJECT_ID` chegou vazio e que a validação encerrou antes de executar a jornada autenticada. O resumo secundário também falhou porque o Playwright não produziu `playwright-report/results.json`; o workflow foi ajustado para só chamar o gerador quando esse arquivo existir. Isso remove a falha redundante, sem alterar o gate que continua reprovando projeto/credenciais ausentes.

## Critério de conclusão parcial

| Critério de `PLA-T081` | Estado nesta revisão |
|---|---|
| Remessas particionadas para não exceder uma única consulta | Implementado no candidato local; teste cobre 401 pedidos em cinco lotes; falta CI remoto no SHA deste lote. |
| Parecer antimalware correlacionado ao conteúdo | Verificação do hash implementada e testada localmente; ainda falta configurar/homologar um provedor real. |
| Erros de consulta preservados | Coberto por teste unitário existente. |
| Alocação de quantidades por destino e expedição parcial | Não implementado por este lote. |
| Jornada autenticada em ambiente isolado | Não validada; `E2E_SUPABASE_PROJECT_ID` permanece ausente na PR #176. |
| Aceite de logística/negócio | Não solicitado nem registrado. |

**Conclusão:** avanço parcial na subparte de escala do relatório. Não marcar `PLA-T081`, T081 ou seus aceites como concluídos com base neste lote.

## Validação local

- Testes direcionados: `tests/services/sicoobLogisticsReportService.test.ts` (4 testes) e `tests/unit/sicoob-document-scanner.test.ts` (3 testes); resultados completos serão atualizados após os gates deste lote.
- Testes direcionados após a última edição: 7 aprovados.
- Typecheck completo: aprovado.
- `deno check supabase/functions/sicoob-document-ingest/index.ts`: aprovado; o CLI reporta warning ao interpretar um override npm legado do `package.json`.
- Suíte completa: 5.854 aprovados, 68 ignorados, 0 falhas (457 arquivos aprovados, 4 ignorados).
- Lint: 0 erros e 874 avisos (dívida já existente fora do escopo deste lote).
- Build: aprovado; mantém avisos existentes de variáveis públicas Supabase ausentes no ambiente local, PostCSS e chunks acima de 600 KiB.
- `npm audit --audit-level=high --offline`: 0 vulnerabilidades no lockfile da branch.
- `git diff --check`: aprovado.

## Limites e dependências restantes

- CI remoto precisa rodar sobre o SHA final publicado.
- E2E autenticado exige projeto Supabase de homologação isolado, URL/chave pública e personas de teste configuradas no GitHub Actions.
- O scanner continua bloqueando uploads quando não há URL/token do provedor ou quando o provedor não responde no novo contrato com o hash escaneado. Ainda falta testar EICAR sintético e timeout contra o provedor homologado.
- Nenhuma migration, função, dado ou configuração do Supabase remoto foi alterada.
- O inventário de 682 lacunas de 11/10/2026 é histórico (`dc08200`) e precisa ser revalidado contra o SHA atual antes de servir como estado completo do backlog.
