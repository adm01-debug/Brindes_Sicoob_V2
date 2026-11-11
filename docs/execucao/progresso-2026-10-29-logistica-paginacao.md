# Progresso — paginação das remessas logísticas (29/10/2026)

## Referência

Avanço parcial de **PLA-T081** do plano de encerramento. A auditoria de 11/10
identificou paginação dos pedidos e uma única consulta `.in('order_id', ids)`
para todas as remessas.

## Correção feita

- A busca das remessas agora particiona os IDs dos pedidos em lotes de até 200.
- A consulta continua usando a sessão autenticada e as policies RLS existentes.
- Erros em qualquer lote continuam sendo propagados para o estado de erro da tela.
- A restrição `UNIQUE (order_id)` da tabela mantém no máximo uma remessa por pedido;
  assim, cada lote de 200 IDs também permanece abaixo do limite de linhas da API.

## Validação

- Baseline focal antes da alteração: `tests/services/sicoobLogisticsReportService.test.ts`,
  4 testes aprovados.
- Regressão adicionada: 401 pedidos em três páginas e três consultas de remessas
  com tamanhos `[200, 200, 1]`, preservando o último pedido.
- Suíte focal após a alteração: 5/5 testes aprovados.
- Suíte completa: 452 arquivos aprovados, 4 ignorados; 5.840 testes aprovados,
  68 ignorados. Baseline anterior: 5.839 aprovados e 68 ignorados.
- Typecheck: 0 erros (baseline 0); ESLint: 0 erros e 873 avisos, sem regressão
  no arquivo alterado.
- Build de produção: aprovado. O Vite reportou as variáveis locais
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` ausentes e aviso de
  chunks maiores que 600 KB; nenhum deles impediu a compilação.

## O que continua pendente em PLA-T081

O fluxo ainda representa uma remessa por pedido. Alocações/expedições por destino
e reconciliação de entrega entre cooperativas continuam sem modelo e exigem uma
implementação própria; este patch não declara a etapa concluída.
