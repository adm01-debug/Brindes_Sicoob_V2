# Correções verificadas da revisão de implementação — 12/09/2026

Este registro complementa a revisão histórica de 11/09/2026. Ele não altera o
diagnóstico daquele commit e não declara produção, migração remota ou tráfego
real como concluídos.

## Correções implementadas neste lote

- **Logística Sicoob:** criada a migração `20260912090000_sicoob_fulfillment.sql`,
  com `sicoob_order_shipments`, comprovantes em bucket privado, URL assinada e
  RPC que compara o status esperado e grava rastreio/status em uma transação.
  A tela de logística não usa mais `order_logistics` nem `order-documents`, que
  pertencem ao modelo legado.
- **Recompra:** antes de criar o orçamento, cada item consulta o catálogo
  externo; preço, atividade e estoque são revalidados. Falha em qualquer item
  impede a criação. Se a gravação dos itens falhar, o rascunho é removido.
- **Kit builder:** o autosave só mostra êxito após resposta sem erro do
  Supabase, preserva o snapshot pendente e oferece nova tentativa. A validação
  usa o ID da variante escolhida, exige escolha em item substituível e bloqueia
  orçamento quando estoque ainda está consultando, insuficiente ou indisponível.
- **Dados e interface:** custos, margem e fornecedor são removidos recursivamente
  da resposta do bridge. Histórico de busca principal é separado por usuário,
  cooperativa e PA. A troca de organização aplica papel e organização na mesma
  atualização. Projeções, percentuais e presença de usuários simulados foram
  removidos das telas de pedidos.
- **Versionamento de orçamentos:** a migração
  `20260912100000_quote_versioning_atomic.sql` substitui o cálculo de versão no
  navegador por uma RPC transacional. Ela serializa cada família, garante uma
  única versão vigente, cria a cópia de itens e personalizações, registra a
  auditoria no mesmo commit e transforma a nova versão em rascunho, sem carregar
  aprovação, resposta do cliente ou integração da versão anterior. O hook usa
  exclusivamente essa RPC.

## Evidência local

- Testes focados: 29 testes aprovados em 7 arquivos (versionamento, serviços
  Sicoob, autosave, estoque por variante, busca e redaction).
- Checagem de tipos dos arquivos alterados: sem erros.
- `git diff --check`: sem erro de whitespace.
- Ensaio reproduzível em PostgreSQL 16 descartável e sem rede: migração aplicada;
  cópia de item/personalização/auditoria, origem obsoleta, ator fora do escopo,
  rollback por falha intermediária e concorrência foram exercitados. O cenário
  concorrente teve retornos `0` e `3`, com duas versões e apenas uma vigente.
  A evidência está em
  [versionamento-orcamento-atomico.json](evidencias/versionamento-orcamento-atomico.json)
  e o executor em
  [simular-versionamento-orcamento-atomico.py](../../scripts/qa/simular-versionamento-orcamento-atomico.py).

## Dependências externas ainda necessárias

- Aplicar as migrações pendentes, inclusive
  `20260912100000_quote_versioning_atomic.sql`, ao projeto Supabase
  `cfmzkthhgliqelozlmwu`, regenerar os tipos do Supabase e executar teste de
  RLS com perfis reais autorizados.
- O `supabase db lint --local` não pôde executar porque o Postgres local em
  `127.0.0.1:54322` não está ativo. Nenhum serviço local foi iniciado para não
  alterar o ambiente compartilhado.
- Validar a recompra contra o catálogo externo com produto, preço e estoque
  reais; o código trata indisponibilidade como bloqueio seguro.
