# Progresso de execução do plano — 30/10/2026

## Referência

- Branch de trabalho: `fix/ci-workflows-h369570`.
- SHA de referência antes deste lote: `a6df966588cbd284a8026bb8584f5b9549c3916a`.
- Plano relacionado: `PLA-T081` — paginação e distribuição logística, descrita em `docs/execucao/lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md`.
- Escopo deste registro: lote incremental de leitura do relatório logístico. Este documento não representa fechamento do plano de 100 etapas ou dos 1.000 subitens.

## Alteração candidata

`src/services/sicoob/logisticsReportService.ts` consultava todas as remessas de uma vez, usando a lista completa de IDs de pedidos no filtro `.in('order_id', orderIds)`. Agora divide essa lista em lotes de até 100 IDs e consulta cada lote sequencialmente. Erros de qualquer lote continuam sendo propagados para que a tela apresente falha em vez de um relatório incompleto. A autorização permanece nas policies RLS existentes; nenhuma consulta usa credencial privilegiada.

O teste `tests/services/sicoobLogisticsReportService.test.ts` cobre 201 pedidos e comprova três lotes de remessas (`100 + 100 + 1`), além das páginas de pedidos.

## Critério de conclusão parcial

| Critério de `PLA-T081` | Estado nesta revisão |
|---|---|
| Remessas particionadas para não exceder uma única consulta | Implementado no candidato local; falta CI remoto no SHA deste lote. |
| Erros de consulta preservados | Coberto por teste unitário existente. |
| Alocação de quantidades por destino e expedição parcial | Não implementado por este lote. |
| Jornada autenticada em ambiente isolado | Não validada; `E2E_SUPABASE_PROJECT_ID` permanece ausente na PR #176. |
| Aceite de logística/negócio | Não solicitado nem registrado. |

**Conclusão:** avanço parcial na subparte de escala do relatório. Não marcar `PLA-T081`, T081 ou seus aceites como concluídos com base neste lote.

## Validação local

- Teste direcionado: `tests/services/sicoobLogisticsReportService.test.ts` — 4 testes aprovados.
- Typecheck completo: aprovado.
- Suíte completa: 5.854 aprovados, 68 ignorados, 0 falhas (457 arquivos aprovados, 4 ignorados).
- Lint: 0 erros e 874 avisos (dívida já existente fora do escopo deste lote).
- Build: aprovado; mantém avisos existentes de variáveis públicas Supabase ausentes no ambiente local, PostCSS/chunks e chunks acima de 600 KiB.
- `git diff --check`: aprovado.

## Limites e dependências restantes

- CI remoto precisa rodar sobre o SHA final publicado.
- E2E autenticado exige projeto Supabase de homologação isolado, URL/chave pública e personas de teste configuradas no GitHub Actions.
- Nenhuma migration, função, dado ou configuração do Supabase remoto foi alterada.
- O inventário de 682 lacunas de 11/10/2026 é histórico (`dc08200`) e precisa ser revalidado contra o SHA atual antes de servir como estado completo do backlog.
