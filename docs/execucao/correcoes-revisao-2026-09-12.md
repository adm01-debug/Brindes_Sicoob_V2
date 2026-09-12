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
- **Status e aprovações Sicoob:** a migração
  `20260912110000_sicoob_order_status_events.sql` moveu histórico, comentário
  e notificação in-app para a mesma transação do status. Ela não usa
  `order_audit_events`, cuja relação histórica é do domínio legado. Mudanças
  comuns usam RPC com comparação de estado; solicitações de alçada criam o
  pedido e a solicitação no mesmo commit. A matriz avisa o solicitante quando
  outra pessoa age e inclui responsáveis de PA/cooperativa e Central nas etapas
  de análise. A chamada de e-mail feita pelo navegador foi removida: não havia
  confirmação de entrega e ela endereçava o ator, não o destinatário.
- **Exportação de campanhas:** o parâmetro que sombreava `format` foi renomeado
  e a exportação CSV passou a escapar aspas, vírgulas e quebras de linha, usar
  BOM UTF-8 e liberar a URL temporária após o download.
- **Política de aprovação Sicoob:** criada a migração
  `20260912120000_sicoob_approval_policy_guards.sql`. Ela versiona regras por
  cooperativa, preserva a versão aplicada ao pedido, exige vínculo ativo,
  bloqueia autoaprovação, deriva a alçada do orçamento do PA e impede alterações
  de valor, itens e dados submetidos desde a preparação até a decisão. Transições
  sensíveis deixam de aceitar a RPC genérica; preparação, solicitação,
  escalação, aprovação e rejeição passam por operações específicas e auditáveis.
  A escalação reutiliza a solicitação pendente, sem criar duas filas para o mesmo
  pedido. O gatilho legado de notificação da solicitação foi removido para não
  duplicar a notificação canônica da mudança de status.
- **Cutover de notificações de alçada:** removido também o gatilho legado de
  inserção de solicitação, que possuía referências incompatíveis com o esquema
  atual e podia reverter a transação. Os cenários isolados instalam uma versão
  sentinela desse gatilho antes das migrações e só passam se ele for removido.
- **Famílias de orçamento:** criada a migração
  `20260912130000_quote_versioning_family_roots.sql` para achatar cadeias
  históricas de `parent_quote_id` na raiz canônica, reaplicar a unicidade de
  versão vigente por família e impedir novas cadeias ou ciclos. O ensaio agora
  começa com uma cadeia de três níveis e valida a normalização, uma nova versão
  e uma inserção administrativa.
- **Erros e estados da interface:** erros simples retornados pela RPC de
  versionamento agora são convertidos em `Error`, preservando a mensagem no
  aviso ao usuário. O mapa visual de pedidos passou a incluir `cancelled`, que
  já era uma transição válida no servidor.
- **Entrada:** a verificação visual agora aguarda o carregamento efetivo de ao
  menos uma marca Sicoob antes de medir a tela. Assim, ela não falha por uma
  corrida de carregamento nem aceita uma página sem logo.

## Evidência local

- Testes focados: 29 testes aprovados em 7 arquivos (versionamento, serviços
  Sicoob, autosave, estoque por variante, busca e redaction).
- Checagem de tipos dos arquivos alterados: sem erros.
- `git diff --check`: sem erro de whitespace.
- Ensaio reproduzível em PostgreSQL 16 descartável e sem rede: migração aplicada;
  cópia de item/personalização/auditoria, origem obsoleta, ator fora do escopo,
  rollback por falha intermediária, concorrência e reparentamento inverso foram
  exercitados. Os cenários concorrentes tiveram retornos `0` e `3`: uma
  família com duas versões e apenas uma vigente, e uma tentativa de ciclo sem
  ciclo persistente.
  A evidência está em
  [versionamento-orcamento-atomico.json](evidencias/versionamento-orcamento-atomico.json)
  e o executor em
  [simular-versionamento-orcamento-atomico.py](../../scripts/qa/simular-versionamento-orcamento-atomico.py).
- Ensaio reproduzível para eventos de status em PostgreSQL 16 descartável e sem
  rede: histórico e destinatários, repetição idempotente, solicitação de alçada,
  concorrência, falha de notificação com rollback e autenticação foram
  exercitados. A evidência está em
  [eventos-status-sicoob.json](evidencias/eventos-status-sicoob.json) e o
  executor em
  [simular-eventos-status-sicoob.py](../../scripts/qa/simular-eventos-status-sicoob.py).
- Teste unitário de exportação de campanhas: CSV com vírgula, aspas e quebra de
  linha preservadas, mais caso sem campanhas.
- Ensaio de política de aprovação em PostgreSQL 16 descartável e sem rede:
  confirmação dentro da alçada, alçada obtida do servidor, congelamento de
  valor/itens/solicitação, confirmação atômica iniciada em pendência,
  autoaprovação, vínculo revogado, escalação e bypass de status foram
  exercitados. A evidência está em
  [politica-aprovacao-sicoob.json](evidencias/politica-aprovacao-sicoob.json) e
  o executor em
  [simular-politica-aprovacao-sicoob.py](../../scripts/qa/simular-politica-aprovacao-sicoob.py).
- O ensaio de eventos também valida a matriz completa dos avisos de uma
  solicitação de alçada: destinatários, origem, pedido, estados anterior e
  novo, e ator da transição.
- Teste visual local: login, demonstração e loja em 1440, 390 e 320 px, sem
  rolagem horizontal, erros de execução ou violações automatizadas de WCAG.

## Dependências externas ainda necessárias

- Aplicar as migrações pendentes, inclusive
  `20260912100000_quote_versioning_atomic.sql` e
  `20260912110000_sicoob_order_status_events.sql`,
  `20260912120000_sicoob_approval_policy_guards.sql`,
  `20260912130000_quote_versioning_family_roots.sql` e
  `20260912140000_sicoob_approval_confirmation_followup.sql` e
  `20260912150000_quote_versioning_cycle_lock.sql`, ao projeto Supabase
  `cfmzkthhgliqelozlmwu`, regenerar os tipos do Supabase e executar teste de
  RLS com perfis reais autorizados.
- O `supabase db lint --local` não pôde executar porque o Postgres local em
  `127.0.0.1:54322` não está ativo. Nenhum serviço local foi iniciado para não
  alterar o ambiente compartilhado.
- Validar a recompra contra o catálogo externo com produto, preço e estoque
  reais; o código trata indisponibilidade como bloqueio seguro.
- O lint do repositório continua com dívida anterior fora deste lote: na última
  execução focalizada, a página de detalhe Sicoob e hooks antigos ainda falham
  por complexidade, `any`, imports não usados e uma chamada condicional de hook.
  Os testes focados e a checagem de tipos dos arquivos alterados passaram.
