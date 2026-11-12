# Correção do monitor do worker de aprovações — 15/10/2026

## Evidência do banco canônico

O cron `sicoob-approval-outbox-worker` falhava com `duplicate key value violates unique constraint "sicoob_approval_worker_dispatches_request_id_key"`. A consulta ao banco confirmou 19.933 disparos históricos e a constraint global `UNIQUE(request_id)`, embora o `pg_net` tenha reutilizado IDs em chamadas posteriores. O job de monitoramento também usa o ID para relacionar respostas, então apenas remover a constraint deixaria a correlação ambígua.

No intervalo observado, o ledger registrava colisões de `request_id` em execuções do worker. `job startup timeout` também ocorria em outros jobs cron, indicando uma falha separada do scheduler que não é corrigida por esta migration.

## Correção

A migration `20261015102000_fix_pg_net_recycled_request_ids.sql` remove a unicidade histórica global, cria um índice para os disparos pendentes e associa a primeira resposta posterior ao disparo pendente mais recente com o mesmo ID. Quando esse disparo termina, os disparos mais antigos com o mesmo ID são marcados como `timed_out` com a causa de ambiguidade, evitando que a mesma resposta seja reutilizada em uma execução seguinte do monitor. Disparos sem resposta continuam encerrados pelo timeout existente de dois minutos.

## Critérios de validação

- Ledger de migrations contém a versão `20261015102000` e o arquivo mantém o SHA-256 allowlisted.
- A constraint global deixa de existir e o índice parcial de filas pendentes existe.
- O monitor conclui sem erro e o worker registra execuções novas mesmo que um ID antigo reapareça.
- Se houver mais de uma resposta com o mesmo ID, somente a primeira resposta posterior ao disparo é associada.
- Uma segunda execução do monitor não reutiliza a mesma resposta para concluir um disparo antigo.
- Disparos sem resposta são marcados como `timed_out` após dois minutos.
- Respostas 2xx, respostas HTTP de erro e timeouts continuam mapeados para os estados correspondentes.
