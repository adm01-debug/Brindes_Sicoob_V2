# Fluxos de negócio Sicoob (cooperativa → Singular → PA): planejado × executado em HEAD `dc08200`

Fatia SIC. Leitura estática do repositório em 11/10/2026, sem consulta ao banco `cfmzkthhgliqelozlmwu` nem chamada a funções remotas. Quando um achado depende do estado real do banco, o texto diz "pelas migrations versionadas" e indica o que confirmar.

## Resumo

### Contagem por status (82 itens)

| Status | Qtde |
|---|---:|
| NAO_INICIADA | 16 |
| PARCIAL | 43 |
| STUB/MOCK | 7 |
| ORFA | 9 |
| BLOQUEADA_EXTERNA | 7 |
| **Total** | **82** |

### Os 10 achados mais graves

1. **SIC-040 (P0): a conversão de orçamento em pedido deve falhar.** `convert_quote_to_sicoob_order` grava `status='converted'` sem `app.quote_governance_write`, e o trigger `aaa_guard_quote_governance_write`, criado depois, recusa essa escrita. Nenhum teste combina as duas migrations.
2. **SIC-060 (P0): a aprovação pelo link público deve falhar pelo mesmo motivo.** `apply_local_quote_approval_response` altera `quotes.status` sem a flag. O E2E só testa token inválido.
3. **SIC-041 (P0): um orçamento aprovado pela Singular ainda pode ser alterado antes de virar pedido.** A RLS `FOR ALL` em `quote_items` e `quote_item_personalizations`, somada ao `UPDATE` de totais em `quotes`, permite mudar itens e valores depois da aprovação.
4. **SIC-021 (P0): a RLS de `pa_budgets` deixa a verba vulnerável.** O `gerente_pa` pode alterar a própria verba, o consumo e a alçada. As políticas `pa_budgets_select/insert/update` usam `is_gestor_compras()` sem escopo de cooperativa, então um gestor de uma cooperativa lê e altera verba de outra.
5. **SIC-100 (P1, bloqueada): o scanner de malware não está configurado.** Sem `SICOOB_MALWARE_SCANNER_URL/TOKEN`, a ingestão responde 503 e nenhuma NF nem comprovante de entrega entra no fluxo.
6. **SIC-010 (P1): a aba "Vínculos" de `/admin/sicoob` não concede acesso.** Ela grava em `profiles.role` os papéis `gestor_singular` e `gestor_pa`, que não existem em `app_role`, e não toca `user_roles`.
7. **SIC-042 (P1): `/gestor/compras` mostra números inventados.** Exibe "12 pendentes", "85% SLA", "R$ 450.000 orçado" e "R$ 380.000 aprovado" fixos, e o botão "Aprovação em Lote" não faz nada.
8. **SIC-024 (P1): o PA não consegue pedir aumento de verba.** A RLS de `limit_increase_requests` exige o papel inexistente `gestor_pa` e não há tela nem RPC de decisão.
9. **SIC-020/SIC-022 (P1): a verba é checada só no navegador na etapa de orçamento.** O servidor não valida nem reserva verba no envio ou na aprovação pela Singular. Também não há fechamento de competência, e um estorno pode reescrever mês fechado.
10. **SIC-053 (P1): o servidor aceita os preços enviados pelo navegador.** `unit_price`, `unit_cost` e `personalizations.total_cost` vêm do cliente, `total_cost` não é conferido com `setup + unit×qtd`, e não há referência ao catálogo.

### Pendências P1 de 01/10 (revisao-do-plano-2026-10-01.md) conferidas em HEAD

O PR #98 é saneamento técnico (TS, ESLint, CI, RLS genérica, favoritos) e não altera essas RPCs. As correções vieram do PR #87 (`aec946a`) e do PR #88 (`5fd5b70`).

| Pendência P1 de 01/10 | Estado em HEAD | Evidência | Item |
|---|---|---|---|
| Autorização de status por escopo, inclusive retry com o mesmo status | **Corrigida no SQL.** O escopo é verificado antes do retorno idempotente; `assert_quote_transition` perdeu o EXECUTE de `authenticated`. Ainda falta a versão observada pela tela. | `20260928182000:46-59,141-142`; `src/services/quoteStatusTransition.ts:34-46` | SIC-050 |
| Idempotência do salvamento | **Parcial.** O ledger aceita apenas SELECT/INSERT do ator, o hash é SHA-256 e cobre o histórico. A chave de criação fica só em `useRef`, a edição não usa chave e o INSERT direto no ledger continua permitido. | `20260928173500:12-35,106-107`; `useQuoteBuilderState.ts:283,394,603`; `QuoteService.ts:223` | SIC-051 |
| Verba por PA e competência, com estorno e fechamento | **Parcial.** O editor usa `profile.pa_id`, ano e mês e falha fechado; o serviço filtra por competência. Faltam validação no servidor na etapa de orçamento, reserva, fechamento de competência e livro de eventos. `updateBudget` continua gravando consumo absoluto pelo cliente. | `useQuoteBuilderState.ts:191-212`; `budgetService.ts:41-66`; `20260911143000:34-90` | SIC-020, SIC-022, SIC-023 |
| Preservação dos IDs de itens com arte ou pedido vinculados | **Corrigida para `quote_items`.** Faz upsert reconciliado por id e recusa ids desconhecidos. Personalizações ainda são recriadas, a arte não se liga ao item e excluir item não deixa trilha. | `20261002160000:200-231,295-332,336-345,370-382` | SIC-052, SIC-070 |
| Validação de preços no servidor | **Parcial.** Os totais são recalculados, mas os preços de entrada vêm do cliente e a escrita direta via RLS continua aberta. A auditoria de 02/10 trata o preço como negociado, uma decisão de negócio pendente. | `20261002160000:82-113`; `20260426101255:35-49`; `docs/execucao/auditoria-tecnica-2026-10-02.md` (dimensão 11) | SIC-053, SIC-041 |

## Mapa dos fluxos de ponta a ponta

Legenda: ✅ existe e está ligado · ⚠️ existe com lacuna · ❌ ausente.

| Fluxo | UI | Hook | Serviço | Edge/RPC | Tabela | RLS | Teste |
|---|---|---|---|---|---|---|---|
| 1. Hierarquia Central→Singular→PA | ⚠️ `/admin/sicoob` tem abas de Singulares e PAs; a tela de Centrais está órfã | ⚠️ consultas inline | ⚠️ `commonService` só lista | — | ⚠️ `sicoob_centrais`/`cooperativas`/`postos_atendimento`; a view faz INNER JOIN na Central | ⚠️ não há papel de Central | ❌ |
| 2. Usuários, papéis e convites | ⚠️ `/gestor/convites` ✅; a aba Vínculos grava papéis inválidos | ⚠️ | ❌ `sicoobUserService` órfão e com papéis legados | ✅ `issue/accept/revoke_sicoob_invitation` | ✅ `sicoob_invitations` | ✅ | ⚠️ só acessibilidade e `simular-convites-sicoob.py` |
| 3. Verba por PA e competência | ⚠️ `/pa/verba`, `/admin/verbas` (só supervisor) | ⚠️ `usePaBudget` sempre no mês corrente | ⚠️ `budgetService`; `updateBudget` perigoso | ⚠️ trigger `validate_sicoob_order_budget` (consumo e estorno na confirmação); nada na etapa de orçamento | ⚠️ `pa_budgets` sem reserva nem fechamento; `cooperativa_budgets` órfã | ❌ sem escopo de cooperativa; gerente_pa altera a própria verba | ⚠️ `sicoobBudgetService.test`, `simular-verba-atomica.py` isolado |
| 4. Catálogo da cooperativa | ⚠️ catálogo genérico; loja Sicoob só em demo | ✅ | ✅ ponte somente leitura | ✅ | catálogo externo | n/a | ⚠️ não há curadoria por cooperativa |
| 5. Carrinho → orçamento | ⚠️ MiniCart mostra alçada, não saldo | ✅ `useQuoteBuilderState` | ✅ `QuoteService.create/update` | ⚠️ `save_quote_atomic(_idempotent)` confia nos preços | ✅ | ⚠️ `FOR ALL` em itens sem filtro de status | ✅ unitários e simuladores isolados |
| 6. Envio à Singular e aprovação do orçamento | ⚠️ ações só para `gestor_compras` | ✅ | ✅ `quoteStatusTransition` | ⚠️ `bulk_update_quote_status_atomic` sem verba; o PA pode pular a Singular | ✅ | ✅ escopo corrigido | ⚠️ sem E2E com persona PA |
| 7. Aprovação pública por link | ✅ `/proposta/:token` e equivalentes | ✅ | ✅ | ❌ deve ser barrada pelo guard (SIC-060) | ✅ | ✅ | ⚠️ E2E só com token inválido; o simulador não aplica o guard |
| 8. Conversão em pedido Sicoob | ✅ `QuoteConvertToOrder` | ✅ | ✅ | ❌ deve ser barrada pelo guard (SIC-040) | ✅ | ✅ | ⚠️ `simular-conversao-pedido-sicoob.py` aplica só a migration da conversão |
| 9. Aprovação do pedido (alçada, escalonamento, delegação) | ⚠️ `/gestor/aprovacoes` ✅; `/gestor/compras` com números falsos; delegação só em `/admin` | ✅ | ✅ `approvalService` | ✅ approve/reject/confirm/request e delegação | ⚠️ política sem alçadas | ✅ RLS cruzada de 27/09 | ⚠️ simuladores isolados |
| 10. Arte | ✅ aba Piloto/Arte | ✅ `useOrderPilotApprovals` | — | ⚠️ `sicoob-artwork-register` sem scanner; decisão pela mesma autoridade da despesa | ⚠️ arte por pedido, não por item | ✅ | ✅ edge e aba |
| 11. Recompra | ✅ `OneClickReorder` e banner de validade | ✅ | ✅ intenção persistida | ✅ `sicoob-reorder` | ✅ | ✅ | ✅ edge e serviço |
| 12. Kit-quote | ✅ `/kit-builder` | ✅ | ✅ | ⚠️ `sicoob-kit-quote` sem validação física da embalagem | ✅ | ✅ | ✅ |
| 13. Documentos, NF e pagamentos | ✅ abas NF, Pagamentos e Logística | ✅ | ✅ `documentIngestService` | ❌ scanner não configurado (503) | ✅ `sicoob_document_registry` | ✅ | ✅ unitários |
| 14. Notificações | ⚠️ in-app | — | — | ⚠️ outbox de alçada ✅, mas o link aponta para `/admin/sicoob`; desconto e comentários gravados pelo navegador; decisão da Singular não notifica | ✅ | ✅ | ⚠️ |
| 15. Relatórios e dashboards | ⚠️ `/gestor`, `/dashboard-pa`, `/relatorios/sicoob`, `/kpis/sicoob` | ✅ | ⚠️ sem paginação nos pedidos do período | — | ✅ | ✅ | ⚠️ |
| 16. Logística, consolidação e recebimento | ⚠️ `/gestor/agregados`, `/sicoob/logistica` | ✅ | ✅ | ⚠️ uma remessa por pedido; recebimento só em consolidação | ✅ | ✅ | ⚠️ |
| 17. Segunda cooperativa | ❌ política sem tela; tema por cooperativa não aplicado | — | — | ⚠️ política versionada | ✅ | ⚠️ `pa_budgets` vaza entre cooperativas | ❌ script RLS stub e seeds com uma cooperativa |

## Itens

### 1. Cadastro de cooperativa/organização e hierarquia Central→Singular→PA

### SIC-001  Telas de Centrais/Singulares/PAs/Cooperativas órfãs
- Status: ORFA
- Origem: `supabase/migrations/20260517131757_*.sql:1-40` (Centrais com marca e ligação à Singular); `SICOOB_TESTING.md:55-58` (topologia Central→Singular→PA)
- Evidência no código: `src/pages/admin/AdminCentraisPage.tsx`, `AdminSingularesPage.tsx`, `AdminPAsPage.tsx`, `AdminCooperativasPage.tsx` não têm importadores em `src/` (fora o próprio arquivo); `src/routes/config/admin.ts:29-40` aponta `/admin/singulares`, `/admin/pas` e `/admin/cooperativas` para `SicoobManagementPage`
- O que falta: UI — não há rota nem aba para cadastrar Centrais (CRUD de `sicoob_centrais` só existe na tela órfã). Decidir entre ligar ou remover as quatro telas legadas.
- Impacto no negócio: a Promo não consegue cadastrar uma nova Central pelo sistema, só via banco.
- Esforço: P
- Prioridade: P2

### SIC-002  Papel e escopo da Central (visão consolidada das Singulares)
- Status: NAO_INICIADA
- Origem: `SICOOB_TESTING.md:28-30` ("sicoob_central: visão gerencial de todas as Singulares"); `docs/pesquisa/2026-09-11/dossie.md:77` (Central só com vínculo explícito); `anexos/documentos-fornecidos.md:279` (gestor sistêmico/central)
- Evidência no código: o enum `app_role` não tem papel de Central (`20260503151319_*.sql:5`); `src/lib/access/role-policy.ts:5,24-27` também não; `profiles` não guarda central; RLS e RPCs só escopam por `cooperativa_id`/`pa_id`
- O que falta: tabela de vínculo Central↔usuário com autorização explícita, papel, RLS de leitura agregada, dashboard consolidado e testes de negação.
- Impacto no negócio: a Central não acompanha as compras das suas Singulares; qualquer visão regional depende de um admin da Promo.
- Esforço: G
- Prioridade: P2 (depende de decisão institucional sobre compartilhamento de dados entre cooperativas)

### SIC-003  Rotas /admin/singulares, /admin/pas e /admin/cooperativas não selecionam a aba
- Status: PARCIAL
- Origem: `src/routes/config/admin.ts:29-40`
- Evidência no código: `src/pages/admin/sicoob/SicoobManagementPage.tsx:20` usa `defaultValue="cooperativas"` fixo e ignora a rota
- O que falta: UI — ligar a rota à aba (`/admin/pas` → PAs etc.).
- Impacto no negócio: atalhos e links levam o operador à tela errada.
- Esforço: P
- Prioridade: P3

### SIC-004  Caminho hierárquico incompleto
- Status: PARCIAL
- Origem: `20260517131757_*.sql:12-32` (view `v_sicoob_hierarchy`)
- Evidência no código: a view faz `JOIN` (INNER) com `sicoob_centrais`, então uma Singular sem `central_id` desaparece. `src/pages/sicoob/GestorDashboardPage.tsx:305` usa `HierarchyPath paId={profile?.pa_id}`, mas o gestor da Singular normalmente não tem PA. `sicoob-seed` cria "CENTRAL TESTE" em `cooperativas`, não em `sicoob_centrais` (`supabase/functions/sicoob-seed/index.ts:144-149`).
- O que falta: tabela/view — LEFT JOIN; UI — usar `cooperativa_id` para gestores; seed coerente.
- Impacto no negócio: o gestor não vê a qual Central e Singular está vinculado.
- Esforço: P
- Prioridade: P3

### SIC-005  Tema e identidade por Central/Singular cadastrados mas nunca aplicados
- Status: ORFA
- Origem: `20260517131757_*.sql:1-9` (`logo_url`, `primary_color`, `sicoob_tema_id`)
- Evidência no código: só `src/pages/admin/sicoob/tabs/CooperativasTab.tsx:50-68` e `AdminSingularesPage.tsx:36` leem `sicoob_temas`; `src/components/system/ThemeInitializer.tsx:3-25` aplica apenas o preset local
- O que falta: UI e hook — aplicar o tema e o logo da cooperativa do usuário logado.
- Impacto no negócio: uma segunda cooperativa não vê a própria marca; o cadastro de tema não tem efeito.
- Esforço: M
- Prioridade: P2

### SIC-006  Tabelas de hierarquia duplicadas sem decisão
- Status: ORFA
- Origem: `docs/execucao/decisoes_pendentes.md:40-44` (família `pontos_atendimento`/`singulares`/`pa_singularidades`, com 0 linhas)
- Evidência no código: `20260517124846_*.sql:11-15` cria `central_id` em `pa_singularidades`; o fluxo usa `postos_atendimento`/`cooperativas`
- O que falta: decisão formal de remover e migration de limpeza.
- Impacto no negócio: risco de alguém cadastrar PA na tabela errada.
- Esforço: P
- Prioridade: P3

### SIC-007  Modelo duplo de tenant (organizations × cooperativas) e onboarding manual por SQL
- Status: PARCIAL
- Origem: `docs/01_CRIAR_PRIMEIRA_ORGANIZATION.md:17-110,267-325` (criação de organização e convites por SQL manual)
- Evidência no código: `src/contexts/OrganizationContext.tsx:96-105,196-202` (organizations/organization_members); `quotes` tem tanto `organization_id` quanto `singular_id`/`pa_id`; `can_manage_quote_scope` mistura os dois (`20260927171216:29-80`); não há tela de convite de organização
- O que falta: decidir qual tenant manda para o Sicoob e documentar a relação entre organização e cooperativa; o onboarding não pode depender de SQL manual.
- Impacto no negócio: há dois cadastros de "cliente" para a mesma cooperativa, e o escopo depende de qual deles foi preenchido.
- Esforço: M
- Prioridade: P3

### 2. Usuários e papéis

### SIC-010  A aba "Vínculos" grava papéis inexistentes em profiles.role
- Status: STUB/MOCK
- Origem: `src/pages/admin/sicoob/SicoobManagementPage.tsx:34-37,61-63` (aba Vínculos)
- Evidência no código: `src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx:182-192` oferece `gestor_singular`/`gestor_pa`, e `:94-104` faz `update` só em `profiles` (role, cooperativa, PA, `approval_threshold`). As permissões vêm de `user_roles` (`role-policy.ts:5-27`; `is_gestor_compras` em `20260502143127:111-114`).
- O que falta: UI e RPC — atribuir papéis válidos (`gerente_pa`, `comprador_pac`, `gestor_compras`, `comprador_singular`, `vendedor`) em `user_roles` por RPC auditada, com sincronia ou eliminação de `profiles.role`.
- Impacto no negócio: o admin acha que deu acesso, mas o usuário continua barrado ou fora do escopo certo.
- Esforço: P
- Prioridade: P1

### SIC-011  Vocabulário legado de papéis em código e RLS vivos
- Status: PARCIAL
- Origem: `SICOOB_TESTING.md:60-64`; `docs/pesquisa/2026-09-11/anexos/auditoria-tecnica-a.md:77` ("vocabulário distinto dos guards")
- Evidência no código: `src/services/sicoob/orderService.ts:69-71` filtra por `gestor_pa`/`gestor_singular`, que nunca casam. `src/services/sicoob/userService.ts:27-35` usa os mesmos papéis e é órfão. As RLS de `limit_increase_requests` e `order_audit_events` usam `gestor_pa`/`gestor_singular`/`logistics` com `p.id = auth.uid()` (`20260503195511:23-33,103-132`).
- O que falta: RLS e serviço — trocar pelos papéis do `app_role` e por `user_id`; remover `sicoobUserService`.
- Impacto no negócio: filtros e permissões silenciosamente sem efeito.
- Esforço: M
- Prioridade: P2

### SIC-012  Seed e login de teste com papéis inexistentes
- Status: STUB/MOCK
- Origem: `SICOOB_TESTING.md:37-69`
- Evidência no código: `supabase/functions/sicoob-seed/index.ts:19-52` grava `sicoob_pa`/`sicoob_singular`/`sicoob_central`/`sicoob_gestor` só em `profiles` (`:165-178`), sem `user_roles`. `src/components/auth/QuickTestLogin.tsx:13-46` não tem importadores. `sicoob-seed-qa/index.ts:15-20` só tem uma cooperativa, sem `comprador_pac`/`comprador_singular`. `docs/execucao/reconciliacao-online-2026-09-28.md:28` registra `SICOOB_QA_USER_PASSWORD` ausente.
- O que falta: seed com papéis reais, duas cooperativas e personas PA/Singular; remover o seed e o QuickTestLogin legados e atualizar a documentação.
- Impacto no negócio: não há massa de teste confiável para homologar com a cooperativa.
- Esforço: P
- Prioridade: P2

### SIC-013  Duas fontes de verdade para papel e vínculo
- Status: PARCIAL
- Origem: `20260503000001_sicoob_profile_hierarchy.sql` (`singular_id`, `carteira_id`)
- Evidência no código: `assert_quote_transition` e `can_manage_quote_scope` usam `profiles.role` (`20260927171216:69-75,317-324`), enquanto `sicoob_actor_can_approve` usa `user_roles` (`20260911143000:168-189`). `profiles.cooperativa_id` e `profiles.singular_id` convivem (`convert_quote_to_sicoob_order` usa `COALESCE`, `20260922224500:114-124`). `src/components/admin/users/SicoobHierarchyTab.tsx:14` edita `pa_id`/`singular_id`/`carteira_id` digitando UUID cru.
- O que falta: tabela de vínculo única (usuário × cooperativa × PA × papel × vigência), migração de dados e UI com seleção.
- Impacto no negócio: a mesma pessoa pode aprovar numa tela e ser barrada em outra.
- Esforço: M
- Prioridade: P2

### SIC-014  Carteira do vendedor sem entidade
- Status: NAO_INICIADA
- Origem: `20260503000001_sicoob_profile_hierarchy.sql:5,10` ("ID da Carteira de Atendimento (Vendedor) SICOOB")
- Evidência no código: não existe tabela de carteiras; `carteira_id` é um texto livre em `SicoobHierarchyTab.tsx:14`; `statsService.ts:46,72-73` deduz a carteira pelos pedidos criados
- O que falta: tabela, RLS por carteira, atribuição de PAs a vendedores e painel.
- Impacto no negócio: o vendedor da Promo não tem carteira formal de PAs para acompanhar.
- Esforço: M
- Prioridade: P3

### SIC-015  Múltiplos vínculos e contexto ativo (cooperativa/PA) visível
- Status: NAO_INICIADA
- Origem: `anexos/documentos-fornecidos.md:314` (DOC-01); `dossie.md:139`; matriz P051/P133 (`docs/execucao/revisao-plano-20261001/matriz-150.md`)
- Evidência no código: `profiles` tem um único `pa_id`/`cooperativa_id`; `src/components/layout/*` não mostra cooperativa/PA ativos; não há seletor de unidade
- O que falta: modelo de vínculos múltiplos, seletor de unidade, cabeçalho com contexto e servidor validando o vínculo ativo.
- Impacto no negócio: quem atende mais de um PA não consegue trabalhar; o usuário não vê em nome de qual unidade está comprando.
- Esforço: M
- Prioridade: P2

### SIC-016  Convite institucional sem e-mail e dependente de conta criada pelo admin
- Status: PARCIAL
- Origem: matriz P081/P082; `docs/pesquisa/2026-09-11/backlog.md` B14
- Evidência no código: `20260927221500_sicoob_invitation_existing_account.sql:4-24` recusa convite sem conta prévia no Auth; `src/pages/sicoob/SicoobInvitationsPage.tsx:231-241` só copia o link; nenhum envio de e-mail
- O que falta: edge ou fluxo de e-mail do convite; o gestor da Singular não cria contas (`/admin/usuarios` exige supervisor), então falta um fluxo self-service ou de pré-cadastro.
- Impacto no negócio: cada novo usuário de cooperativa depende de um admin da Promo e de envio manual do link.
- Esforço: M
- Prioridade: P2

### SIC-017  Gestor da Singular sem acesso às configurações do próprio escopo
- Status: PARCIAL
- Origem: RLS dá ao `gestor_compras` a gestão de verbas (`20260502153425:14-25`) e a delegação da própria autoridade (`20260927203000:122-150`)
- Evidência no código: `src/App.tsx:116-125` protege todo `/admin/*` com `<AdminRoute />`, cujo padrão é `supervisor` (`src/components/layout/AdminRoute.tsx:85`). Verbas (`/admin/verbas`, aba Verbas), Delegações e Alertas ficam só em `/admin/sicoob`. `SICOOB_ROUTE_ACCESS` (`role-policy.ts:29-46`) não tem rota de gestor para isso.
- O que falta: UI — rotas `/gestor/verbas`, `/gestor/delegacoes`, `/gestor/alertas` restritas ao escopo da Singular.
- Impacto no negócio: a Singular não distribui verba entre seus PAs nem delega aprovações sem chamar a Promo.
- Esforço: M
- Prioridade: P1

### 3. Verba/orçamento por PA e competência

### SIC-020  Verba validada só no navegador na etapa de orçamento
- Status: PARCIAL
- Origem: `docs/execucao/revisao-do-plano-2026-10-01.md:41` (P124/P125/P126); `dossie.md:190` (aprovação verifica saldo na mesma transação)
- Evidência no código: corrigido no cliente — `useQuoteBuilderState.ts:191-212` usa `profile.pa_id`, ano e mês e falha fechado; `budgetService.ts:41-52` filtra a competência. No servidor, `assert_quote_transition` (`20260927171216:301-355`) e `bulk_update_quote_status_atomic` (`20260928182000:5-95`) não consultam `pa_budgets`. A verba só é debitada na confirmação do pedido (`20260911143000:34-67`).
- O que falta: RPC — validar (e, se a política pedir, reservar) a verba em `pending_singular_approval` e `approved_singular`; testes de disputa de saldo entre orçamentos.
- Impacto no negócio: a Singular aprova orçamentos que somam mais que a verba do PA e o bloqueio só aparece depois, na confirmação do pedido.
- Esforço: M
- Prioridade: P1

### SIC-021  RLS de pa_budgets permite autoalteração e acesso entre cooperativas
- Status: PARCIAL
- Origem: `dossie.md:186-190`; `anexos/documentos-fornecidos.md:318` (DOC-05)
- Evidência no código: `20260502143127:192-199` — `pa_budgets_select/insert/update` com `is_gestor_compras()` sem escopo (função em `:111-114`). `20260502143725:81-88` — `pa_budgets_gerente_update` deixa o `gerente_pa` alterar a linha inteira do próprio PA (`verba_total`, `verba_consumida`, `limite_alcada`). Nenhuma migration remove essas políticas, e a consolidação `20261007233000:1-7` preserva a semântica. Não há trigger que proteja `verba_consumida`.
- O que falta: RLS — limitar ao escopo da cooperativa, proibir o solicitante de alterar a própria verba ou alçada e fazer ajustes só por RPC com trilha. Confirmar em `pg_policies` no banco.
- Impacto no negócio: um PA pode aumentar a própria verba e um gestor pode mexer na verba de outra cooperativa.
- Esforço: P
- Prioridade: P0

### SIC-022  Ciclo de verba incompleto (reserva, compromisso, consumo), sem fechamento nem livro de eventos
- Status: PARCIAL
- Origem: `dossie.md:190` (separar planejado, reservado, comprometido e consumido); matriz P124/P125; `plano-encerramento-100-etapas-20261001` T087/T088
- Evidência no código: só existe `verba_consumida` (colunas de `pa_budgets` em `src/integrations/supabase/types.ts`). Consumo e estorno usam o `created_at` do pedido (`20260911143000:41-47,68-86`). Um estorno após virar o mês reescreve a competência antiga. Não há flag de fechamento, transferência nem ajuste.
- O que falta: tabela de eventos de verba (reserva, compromisso, consumo, estorno, ajuste), estado de competência fechada, regra de estorno em período fechado e conciliação com `sicoob_budget_audit`. A regra de competência (data do pedido ou da aprovação) depende de decisão financeira.
- Impacto no negócio: não dá para fechar o mês da verba com segurança nem explicar cada centavo consumido.
- Esforço: G
- Prioridade: P1

### SIC-023  budgetService.updateBudget grava consumo absoluto pelo cliente
- Status: ORFA
- Origem: matriz P124 ("updateBudget escreve verba_consumida por pa_id")
- Evidência no código: `src/services/sicoob/budgetService.ts:54-66` não tem chamadores em `src/`, mas a RLS permite a escrita (SIC-021)
- O que falta: remover a função; ajuste de verba só por RPC.
- Impacto no negócio: código pronto para zerar o consumo de verba pelo navegador.
- Esforço: P
- Prioridade: P2

### SIC-024  Pedido de aumento de verba quebrado e sem decisão
- Status: PARCIAL
- Origem: `src/pages/sicoob/PAWalletPage.tsx:315-345` (PA solicita aumento)
- Evidência no código: `approvalService.ts:148-168` insere sem `requested_by`/`current_limit`. A política de INSERT exige `p.role = 'gestor_pa'` e `p.id = auth.uid()` (`20260503195511:122-132`), papel que não existe, então o INSERT é negado. Não há UPDATE nem RPC de decisão, e nada atualiza `pa_budgets`.
- O que falta: RLS, RPC de solicitar/decidir com alçada, aplicação ao `pa_budgets` com trilha, tela de decisão do gestor e notificação.
- Impacto no negócio: o PA não consegue pedir mais verba; o botão existe mas falha.
- Esforço: M
- Prioridade: P1

### SIC-025  Verba da cooperativa (cooperativa_budgets) sem uso
- Status: ORFA
- Origem: `20260502143127_*.sql:51-63,180-189` (tabela e RLS); `docs/execucao/decisoes_pendentes.md:29-32`
- Evidência no código: nenhuma referência em `src/` além dos tipos; a tabela não tem coluna de consumo
- O que falta: decidir se existe teto por Singular; se sim, consumo, tela e soma das verbas de PA ≤ verba da cooperativa.
- Impacto no negócio: a Singular não tem teto consolidado; a soma dos PAs pode passar do orçamento da cooperativa.
- Esforço: M
- Prioridade: P2

### SIC-026  Alçadas configuráveis que o servidor ignora
- Status: PARCIAL
- Origem: `20260504153856_*.sql:1-41` (alçada superior por cooperativa); `20260504211811_*.sql:1-9` (alçada por categoria)
- Evidência no código: o trigger que usava `cooperativas.alcada_superior_threshold` foi removido (`20260912120000:340`), mas a UI segue editando o campo (`CooperativasTab.tsx:142`). `profiles.approval_threshold` (`UserAssignmentTab.tsx:99`) e `pa_category_thresholds` só valem no cliente (`src/hooks/admin/useApprovalThreshold.ts:47-90`). A regra fixa "150% ou R$ 50 mil" em `src/hooks/usePaBudget.ts:51-55` não é usada. O servidor só usa `pa_budgets.limite_alcada` (`20260911143000:235-243`).
- O que falta: RPC — aplicar escalonamento por valor da cooperativa, alçada por categoria e alçada individual; ou remover os campos.
- Impacto no negócio: regras de alçada configuradas na tela não valem de verdade.
- Esforço: M
- Prioridade: P1

### SIC-027  Remanejamento de verba entre PAs
- Status: NAO_INICIADA
- Origem: `src/components/sicoob/orders/OrderBudgetIntelligence.tsx:84-86` ("Será necessária aprovação da Singular ou remanejamento")
- Evidência no código: não há RPC, tabela nem tela de transferência; o trigger recusa a confirmação com saldo insuficiente (`20260911143000:55-59`)
- O que falta: RPC de transferência entre PAs da mesma Singular, com alçada e trilha.
- Impacto no negócio: um PA sem saldo trava o pedido mesmo que outro PA tenha sobra.
- Esforço: M
- Prioridade: P2

### SIC-028  Indicadores de verba com competência errada e valor fixo
- Status: STUB/MOCK
- Origem: matriz P128
- Evidência no código: `src/pages/sicoob/orders/OrderDetailPage.tsx:252` usa `verba_total || 50000` como fallback. `usePaBudget` (`:22-33`) usa o mês corrente, não a competência do pedido. `OrderBudgetIntelligence.tsx:61` mostra "Uso da Verba Trimestral" sobre dado mensal. `statsService.ts:12-13` pega a última competência cadastrada, que pode ser futura.
- O que falta: UI e hook — competência do pedido, estado "verba não configurada" sem número inventado e rótulo correto.
- Impacto no negócio: o gestor decide olhando um saldo que pode ser fictício.
- Esforço: P
- Prioridade: P2

### SIC-029  Auditoria de verba e concessões sem tela
- Status: ORFA
- Origem: `docs/execucao/decisoes_pendentes.md:49-53`; matriz P127
- Evidência no código: as views `sicoob_budget_audit` e `v_full_scope_grants` (`20260916140000:21-27`) não têm consumidor; `src/pages/admin/AuditEvidenceDashboard.tsx` não tem importadores
- O que falta: ligar a tela à rota e consumir as views com escopo.
- Impacto no negócio: divergências entre verba registrada e pedidos ficam invisíveis.
- Esforço: P
- Prioridade: P2

### 4. Catálogo da cooperativa

### SIC-030  Catálogo, curadoria e preço contratado por cooperativa
- Status: NAO_INICIADA
- Origem: `anexos/documentos-fornecidos.md:297-303,325,329` (SAPORE p.4; DOC-14, DOC-16, DOC-18); `backlog.md` B18/B19
- Evidência no código: não há tabela de sortimento, lista de preço ou visibilidade por cooperativa (busca por `contract_price|price_list|catalog` em `src/` e migrations só acha a área de gravação)
- O que falta: tabelas de curadoria e preço contratado por cooperativa e vigência, filtro no catálogo e RLS.
- Impacto no negócio: toda cooperativa vê o mesmo catálogo sem preço negociado nem seleção própria.
- Esforço: G
- Prioridade: P2

### SIC-031  Campanha institucional ligada a verba, arte, destinos e data do evento
- Status: NAO_INICIADA
- Origem: `anexos/documentos-fornecidos.md:13,321` (DOC-08, prazo ligado ao evento), `:328` (DOC-15); `dossie.md:145-153`; matriz P121/P122
- Evidência no código: não há `event_date` nem `campaign_id` em `quotes`/`sicoob_orders`. `campaigns` é genérica e `src/pages/admin/AdminCampanhasPage.tsx` não tem importadores. `magic_up_campaigns` é briefing criativo, sem vínculo de compra; as tabelas de colaboração Magic Up não têm consumidor (`decisoes_pendentes.md:46-47`).
- O que falta: entidade de campanha (objetivo, público, data do evento, destinos, verba), cronograma regressivo (arte → produção → transporte) com alerta de inviabilidade e vínculo com orçamento e pedido.
- Impacto no negócio: o portal não garante que o brinde chegue antes da assembleia ou do evento, que é o diferencial pretendido.
- Esforço: G
- Prioridade: P1

### SIC-032  Loja com identidade Sicoob só em demonstração
- Status: STUB/MOCK
- Origem: matriz P133/P134; `fechamento-tecnico-2026-10-08.md:207-209`
- Evidência no código: `src/pages/sicoob/StorefrontDemoPage.tsx:28,53-99,191` e `DemoPortalPage.tsx:71-80` têm dados fictícios e rota só com `__ENABLE_DEMO_PAGES__` (`src/routes/config/public.ts:83-92`)
- O que falta: aplicar o layout de loja ao catálogo real autenticado.
- Impacto no negócio: a experiência mostrada ao cliente em demonstração não é a que o usuário real recebe.
- Esforço: M
- Prioridade: P3

### SIC-033  Certificação do catálogo mestre somente leitura na origem
- Status: BLOQUEADA_EXTERNA
- Origem: matriz P091; plano T058
- Evidência no código: o gate de aplicação existe (`supabase/functions/_shared/external-read-only.ts`), mas falta prova de ACL da credencial no projeto `doufsxqlfjyuvxuezpln`
- O que falta: comprovação administrativa da credencial de leitura, que depende do dono do catálogo externo.
- Impacto no negócio: sem essa prova não se pode afirmar que o portal nunca altera preço ou estoque do fornecedor.
- Esforço: P
- Prioridade: P2

### 5. Carrinho/pedido

### SIC-040  Conversão de orçamento em pedido barrada pelo guard de governança
- Status: PARCIAL
- Origem: `docs/order-workflow.md:21-26`; matriz P049
- Evidência no código: `20260922224500_convert_quote_to_sicoob_order.sql:250-252` faz `UPDATE public.quotes SET status='converted'` sem `set_config('app.quote_governance_write','true',true)`. O trigger `aaa_guard_quote_governance_write` (`20260927171216:88-133`, com a checagem de status em `:112-121`) é posterior e não foi redefinido. As únicas funções que setam a flag estão em `20260927171216:479,557,627,686`, `20260927210000:568` e `20260928182000:66`. `scripts/qa/simular-conversao-pedido-sicoob.py:10-11` aplica só a migration da conversão.
- O que falta: RPC — setar a flag (ou permitir explicitamente `approved*→converted`) e incluir na simulação toda a cadeia de triggers. Confirmar no banco com conversão sintética.
- Impacto no negócio: nenhum orçamento aprovado vira pedido, então a compra para no meio.
- Esforço: P
- Prioridade: P0

### SIC-041  Orçamento aprovado não congela itens nem valores
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:319` (DOC-06, mudança cria revisão); `backlog.md` B20; `dossie.md:182`
- Evidência no código: `20260426101255:35-38,46-49` dá ao vendedor dono `FOR ALL` em `quote_items` e `quote_item_personalizations` sem filtro de status. `:19-31` faz o mesmo em `quotes`, e o guard (`20260927171216:112-121`) não protege subtotal, total, desconto e itens. `save_quote_atomic` só permite edição em draft/revision/rejected (`20261002160000:192-194`), mas é SECURITY INVOKER e a escrita direta contorna essa trava. `convert_quote_to_sicoob_order` só confere coerência interna dos totais (`20260922224500:180-185`).
- O que falta: RLS e trigger — negar escrita direta em itens, personalizações e campos comerciais fora de draft/revision, ou fazê-la só por RPC; snapshot imutável da versão aprovada pela Singular.
- Impacto no negócio: valores podem ser trocados depois que a Singular aprovou, e o pedido sai diferente do que foi autorizado.
- Esforço: M
- Prioridade: P0

### SIC-042  /gestor/compras com indicadores fixos e botão sem ação
- Status: STUB/MOCK
- Origem: `src/routes/config/sicoob-rbac.ts:14` (rota de MANAGERS); PR #59 "remove indicadores fictícios" (não alcançou esta tela)
- Evidência no código: `src/pages/GestorCompras.tsx:54` ("12"), `:58` ("85%"), `:83-85` ("Aprovação em Lote", R$ 5.000,00, `<button>` sem `onClick`), `:94` (R$ 450.000,00), `:98` (R$ 380.000,00), `:101` (`w-[84%]`)
- O que falta: UI — números reais (reaproveitar `loadGestorStats` de `GestorDashboardPage.tsx:79-104`) e aprovação em lote real ou remoção do botão.
- Impacto no negócio: o gestor vê pendências e verba inventadas e clica num botão que não faz nada.
- Esforço: P
- Prioridade: P1

### SIC-043  SLA de pedido inerte
- Status: ORFA
- Origem: `20260503204301_*.sql:3-4,32-34`; `20260504153856:26-30` (48 h)
- Evidência no código: o único lugar que preenchia `sla_deadline` (trigger `trigger_sicoob_order_flow_intelligence`) foi removido em `20260912120000:340`, e não há cron. A UI continua exibindo SLA (`src/components/sicoob/orders/SLABadge.tsx:41-96`; `OrdersPage.tsx:242,293`), e a notificação de "SLA crítico" (`20260912110000:151-176`) nunca dispara.
- O que falta: RPC ou cron — definir o prazo na entrada em aprovação, recalcular `sla_status` e decidir o SLA por cooperativa.
- Impacto no negócio: "Todos SLAs em conformidade" aparece sempre, mesmo com pedido parado há dias.
- Esforço: M
- Prioridade: P2

### SIC-044  Carrinho mostra alçada mas não saldo de verba; alçada por categoria com tipo incompatível
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:298` (verba no carrinho, SAPORE p.5-7)
- Evidência no código: `src/components/cart/MiniCart.tsx:28-55` usa só `useApprovalThreshold`. O `category_id` vem do metadata como string (`:46`), mas `pa_category_thresholds.category_id` é INTEGER (`20260504211811:5`).
- O que falta: UI e hook — saldo da competência no carrinho; normalizar o tipo da categoria.
- Impacto no negócio: o PA só descobre a falta de verba ao enviar o orçamento.
- Esforço: P
- Prioridade: P2

### SIC-045  Cancelamento parcial e regra pós-produção
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:324` (DOC-11); matriz P118
- Evidência no código: `20260911143000:109-123` permite `in_production|in_separation|in_transit|delivered → cancelled` com estorno integral (`:68-90`); não há cancelamento por item ou destino
- O que falta: RPC — cancelamento parcial, bloqueio ou alçada após início da produção, compensação com fornecedor e verba proporcional.
- Impacto no negócio: um pedido já produzido pode ser cancelado devolvendo toda a verba, sem tratar o custo já incorrido.
- Esforço: M
- Prioridade: P2

### SIC-046  Consolidação de orçamentos sem desdobramento
- Status: ORFA
- Origem: `src/components/orders/OrderConsolidationPanel.tsx:68-101` ("consolidar várias solicitações de PAC em um único grupo de compra")
- Evidência no código: `consolidate_sicoob_quotes` (`20260922224800:51-60`) cria `quote_consolidations` com status 'pending', que nunca muda. `convert_quote_to_sicoob_order` ignora `consolidation_id`. A consolidação real de pedidos é outra (`create_sicoob_order_consolidation`).
- O que falta: converter a consolidação em pedido único (ou pedidos com destinos) e mudar o status; ou remover a aba de consolidação de orçamentos.
- Impacto no negócio: o gestor "consolida" orçamentos e nada acontece depois.
- Esforço: M
- Prioridade: P2

### SIC-047  Componentes e serviços Sicoob órfãos
- Status: ORFA
- Origem: componentes criados para o fluxo (previsão de recompra, banner de verba estourada, revisão)
- Evidência no código: sem importadores — `src/components/sicoob/orders/AIOrderPredictor.tsx` com `src/hooks/sicoob/useAIOrderPredictor.ts`; `src/components/sicoob/BudgetExceededBanner.tsx` com `src/hooks/sicoob/useSicoobBudget.ts`; `src/services/sicoob/userService.ts`; `src/pages/GestorApprovalsPage.tsx` (legado sobre `orders`/`enviado_gestor`, `:49-58`); `src/components/orders/PilotApprovalPanel.tsx`, `RevisionRequest.tsx`, `OrderTrackingTimeline.tsx`
- O que falta: ligar (o banner de verba e a previsão de recompra fazem sentido no PA) ou remover.
- Impacto no negócio: funcionalidades prontas que o usuário nunca vê.
- Esforço: P
- Prioridade: P3

### SIC-048  Realtime do Kanban de pedidos com canal fixo
- Status: PARCIAL
- Origem: `execucao-plano-2026-10-01.md:110` (colisão de canal corrigida no Kanban de orçamentos)
- Evidência no código: `src/services/sicoob/commonService.ts:16-29` usa o canal fixo `'sicoob-orders-realtime'`, consumido em `OrdersKanbanPage.tsx:269`
- O que falta: hook — canal exclusivo por montagem, como no Kanban de orçamentos.
- Impacto no negócio: risco de o Kanban parar de atualizar com duas abas ou telas abertas.
- Esforço: P
- Prioridade: P3

### SIC-049  Documentação do workflow de pedidos desatualizada
- Status: PARCIAL
- Origem: `docs/order-workflow.md:21-30` (status Sicoob e auditoria via `order_audit_events`)
- Evidência no código: o trigger de `order_audit_events` foi removido (`20260912110000:186-187`) e o histórico vai para `sicoob_order_history` (`:37-50`). Os estados reais incluem `escalated_to_board`, `in_production`, `in_separation`, `in_transit`, `delivered` (`20260911143000:109-123`).
- O que falta: atualizar o documento, a fonte de verdade do workflow.
- Impacto no negócio: quem consulta o doc entende um fluxo que não existe mais.
- Esforço: P
- Prioridade: P3

### 6. Orçamento e versionamento

### SIC-050  Autorização de status por escopo: corrigida no SQL, falta a versão da tela
- Status: PARCIAL
- Origem: `revisao-do-plano-2026-10-01.md:38,52-56` (P034/P036/P037); matriz P033
- Evidência no código: corrigido — `20260928182000:46-59` autoriza antes do `CONTINUE` idempotente, e `:141-142` revoga `assert_quote_transition`. Pendente — `src/services/quoteStatusTransition.ts:34-46` relê `row_version` imediatamente antes da RPC, o que anula o controle de concorrência da tela (P033). A reprodução negativa não está nos testes Vitest (`docs/execucao/revisao-plano-20261001/reproduzir-status-fora-escopo.py` é sonda).
- O que falta: serviço e UI — transportar a versão observada pela tela; teste de regressão negativo no conjunto de CI.
- Impacto no negócio: duas pessoas mudando o status ao mesmo tempo podem sobrescrever a decisão uma da outra.
- Esforço: P
- Prioridade: P2

### SIC-051  Idempotência do salvamento incompleta
- Status: PARCIAL
- Origem: `revisao-do-plano-2026-10-01.md:39` (P042/P048/P058)
- Evidência no código: corrigido — `20260928173500:12-35,106-107` (só SELECT/INSERT, SHA-256 com histórico). Pendente — a chave de criação fica só em `useRef` (`useQuoteBuilderState.ts:283,394,603`) e se perde ao remontar ou recarregar. A edição chama `save_quote_atomic` sem chave (`QuoteService.ts:223`), então um retry após perder a resposta dá 40001. A política INSERT do ledger (`20260928173500:24-35`) deixa o cliente pré-registrar chaves.
- O que falta: persistir a intenção com o rascunho, contrato idempotente para edição e INSERT no ledger só via RPC.
- Impacto no negócio: em rede ruim, o vendedor ou PA pode gerar orçamento duplicado ou ver erro em algo que já salvou.
- Esforço: M
- Prioridade: P1

### SIC-052  Preservação de IDs de itens: resolvida para itens, com resíduos
- Status: PARCIAL
- Origem: `revisao-do-plano-2026-10-01.md:40` (P044); `auditoria-tecnica-2026-10-02.md` (dimensão 6)
- Evidência no código: corrigido — `20261002160000:200-231,295-332,370-382`. Pendente — as personalizações continuam apagadas e recriadas (`:336-345`); excluir item não deixa trilha; nova versão copia itens com ids novos (`20260913120001:162-175`).
- O que falta: trilha de exclusão e identidade das personalizações se a arte passar a referenciá-las (ver SIC-070).
- Impacto no negócio: baixo hoje; vira risco quando arte e produção se ligarem ao item.
- Esforço: M
- Prioridade: P2

### SIC-053  Preços do orçamento sem autoridade no servidor
- Status: PARCIAL
- Origem: `revisao-do-plano-2026-10-01.md:40` (P045); `backlog.md` B19; `dossie.md:180`
- Evidência no código: `20261002160000:82-113` aceita `unit_price`, `unit_cost`, `setup_cost`, `unit_cost` da personalização e soma `total_cost` do payload sem conferir `setup + unit×qtd`. Não há consulta ao catálogo; o editor calcula a gravação no cliente (`src/hooks/useGravacaoPriceV2.ts`). A RPC é SECURITY INVOKER e a RLS deixa escrever direto (SIC-041). O kit calcula no servidor (`supabase/functions/sicoob-kit-quote/catalog.ts:257-263`), o orçamento comum não.
- O que falta: RPC — conferir a parcela da personalização e um piso ou snapshot de preço de catálogo com a origem gravada. A autoridade do preço negociado é decisão comercial pendente (`auditoria-tecnica-2026-10-02.md`, dimensão 11).
- Impacto no negócio: preço e custo do orçamento podem ser manipulados sem trava no servidor.
- Esforço: M
- Prioridade: P1

### SIC-054  Aprovação da Singular imposta só pelo navegador
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:315` (DOC-02); fluxo PA→Singular
- Evidência no código: só o cliente transforma `pending` em `pending_singular_approval` para PA (`useQuoteBuilderState.ts:214-216`). No servidor, qualquer vendedor dono vai de `draft` para `pending`/`sent` (`20260927171216:328-333`) e pode seguir pelo link público até `approved`, que é aceito na conversão (`20260922224500:97-99`). Os botões de decisão só aparecem para `gestor_compras` (`src/components/quotes/QuoteSingularApprovalActions.tsx:109`), embora o servidor aceite `comprador_singular`.
- O que falta: RPC — obrigar orçamentos de PA a passar pela Singular; UI — liberar a ação a `comprador_singular`.
- Impacto no negócio: um PA consegue comprar sem o aval da Singular.
- Esforço: P
- Prioridade: P1

### SIC-055  Rascunhos sem controle entre abas e sem escopo cooperativa/PA
- Status: PARCIAL
- Origem: matriz P051-P057; plano T041/T042
- Evidência no código: `src/hooks/useAutoSave.ts` não tem `BroadcastChannel` nem `storage` listener; a chave do rascunho é só o usuário
- O que falta: hook — controle entre abas, segmentação por unidade e limpeza no logout ou troca de PA.
- Impacto no negócio: edição em duas abas ou troca de PA pode misturar rascunhos.
- Esforço: M
- Prioridade: P3

### SIC-056  Expiração automática de orçamento
- Status: NAO_INICIADA
- Origem: estado `expired` no enum e na transição (`20260927171216:328-330`); `dossie.md:219` (cenário "orçamento expirado")
- Evidência no código: nenhuma função ou cron muda `quotes.status` para `expired` (a única ocorrência é para tokens, `20260419025022:82-90`); `QuoteValidityBanner` é só visual
- O que falta: cron ou RPC de expiração por `valid_until`, com notificação.
- Impacto no negócio: orçamentos vencidos continuam aprováveis e convertíveis.
- Esforço: P
- Prioridade: P3

### 7. Aprovação (interna e link público)

### SIC-060  Resposta pelo link público barrada pelo guard
- Status: PARCIAL
- Origem: `docs/execucao/backend-aprovacao-publica-20260922.md:35-55` (fluxo público transacional)
- Evidência no código: `20260922225000_secure_public_quote_approval.sql:260-262` muda `quotes.status` sem a flag de governança. O guard posterior (`20260927171216:112-121`) recusa. `scripts/qa/simular-aprovacao-publica.py:35-108` não aplica o guard. `e2e/quote-approval.spec.ts:11-94` só testa token inválido e roteamento. Também pendentes no próprio documento (`:52-54,99-125`): publicação e comparação da edge `quote-approval`, rate limit nas RPCs públicas e assinatura opcional.
- O que falta: RPC — setar a flag; simulação com toda a cadeia; E2E com token válido.
- Impacto no negócio: o cliente ou a cooperativa clica em "aprovar" e recebe erro.
- Esforço: P
- Prioridade: P0

### SIC-061  Política de aprovação por cooperativa sem regras de alçada e sem tela
- Status: PARCIAL
- Origem: `dossie.md:79-90` (2 ou 3 cotações, janelas, responsáveis por categoria); matriz P083; `anexos/documentos-fornecidos.md:326` (DOC-13)
- Evidência no código: `sicoob_approval_policies` só tem `forbid_self_approval` e `require_active_membership` (`20260912120000:5-18`). Só admin, dev ou supervisor administram (`:29-52`). Não há tela (busca por `sicoob_approval_policies` em `src/` só acha tipos). Sem política cadastrada, vale a "baseline-tecnica-v1" (`:121-131`).
- O que falta: atributos de alçada por valor e categoria, nº mínimo de propostas, janelas e responsáveis, e tela de cadastro e versão. Os valores reais dependem das cooperativas.
- Impacto no negócio: cada cooperativa não consegue configurar suas regras; todas operam com a mesma regra técnica.
- Esforço: G
- Prioridade: P1

### SIC-062  Alçada superior ("Diretoria") sem papel próprio e com regra divergente
- Status: PARCIAL
- Origem: `src/types/sicoob/orders.ts:14` ("Alçada Superior (Diretoria)")
- Evidência no código: no servidor, `board_only` só exclui o `gerente_pa`, e o `gestor_compras` aprova o escalonado (`20260911143000:150-191`). O cliente exige admin ou supervisor (`src/hooks/useSicoobApprovals.ts:133-142`). A notificação de escalonamento vai só para admin, dev e supervisor (`20260912110000:113-116`). Escalonar é manual, sem limite (`orderService.ts:91-104`, `p_threshold: 0`).
- O que falta: papel ou vínculo de diretoria por cooperativa, regra automática por valor e mesma regra no cliente e no servidor.
- Impacto no negócio: "escalar para a Diretoria" não envolve diretoria nenhuma da cooperativa.
- Esforço: M
- Prioridade: P2

### SIC-063  Delegação de aprovação inacessível ao titular pela UI
- Status: PARCIAL
- Origem: matriz P085/P086
- Evidência no código: a RPC usa o próprio ator como delegante (`20260927203000:122-150`), mas a tela fica em `/admin/sicoob` (`SicoobManagementPage.tsx:42-45,69-71`), restrita a supervisor (SIC-017)
- O que falta: UI — expor a delegação ao `gestor_compras`/`comprador_singular` no escopo `/gestor`.
- Impacto no negócio: um gestor de férias não consegue delegar e as aprovações param.
- Esforço: P
- Prioridade: P2

### SIC-064  Propostas institucionais comparáveis e escolha de fornecedor
- Status: NAO_INICIADA
- Origem: `dossie.md:83-90,147`; matriz P087/P088; plano T054/T055
- Evidência no código: nenhuma tabela, RPC ou tela de proposta de fornecedor, comparação ou justificativa de fornecedor único (busca por `supplier_quote|proposta_institucional|sole_source` vazia)
- O que falta: tudo — cadastro de propostas com anexos, comparação, seleção com justificativa e reabertura por mudança material.
- Impacto no negócio: cooperativas cuja política exige 2 ou 3 cotações não conseguem cumprir a regra no portal.
- Esforço: G
- Prioridade: P2

### 8. Arte/artwork

### SIC-070  Arte ligada ao pedido, não ao item, sem invalidação por mudança comercial
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:320` (DOC-07); matriz P102/P103/P104
- Evidência no código: `sicoob_order_artwork_versions` só tem `order_id` (sem item, variante, posição ou técnica; colunas em `types.ts`). `identity_snapshot` descreve o arquivo (`supabase/functions/sicoob-artwork-register/index.ts:64-70`). A produção exige arte aprovada por pedido (`20260922224500:263-283`).
- O que falta: tabela e RPC — vínculo arte↔item, variante, especificação; invalidar a aprovação quando item, quantidade ou técnica mudam; prova técnica com posição, dimensões e cores.
- Impacto no negócio: em pedido com vários itens não se sabe qual arte foi aprovada para qual brinde.
- Esforço: M
- Prioridade: P2

### SIC-071  Aprovação de arte sem papel de marketing/marca separado da despesa
- Status: NAO_INICIADA
- Origem: `anexos/documentos-fornecidos.md:320` (DOC-07); `backlog.md` B22/B23; `dossie.md:107-111`
- Evidência no código: `decide_sicoob_order_artwork` usa `assert_sicoob_approval_actor`, a mesma autoridade de despesa (`20260912180000:413`); `app_role` não tem papel de marketing
- O que falta: papel ou competência de marca por cooperativa, RPC de decisão de arte separada da alçada financeira e regra de liberação de produção exigindo os dois aceites.
- Impacto no negócio: quem aprova o gasto também aprova a marca da cooperativa, sem o marketing.
- Esforço: M
- Prioridade: P1

### SIC-072  Upload de arte sem quarentena nem scanner
- Status: PARCIAL
- Origem: matriz P105-P107; plano T074
- Evidência no código: `src/hooks/orders/extensions/useOrderPilotApprovals.ts:85-101` faz upload direto em `sicoob-order-documents` e registra. A edge só inspeciona bytes e hash (`sicoob-artwork-register/index.ts:54-79`). O gate de quarentena cobre só NF e comprovante (`20260922225600:117-150`).
- O que falta: edge — passar a arte pela ingestão com scanner (finalidade `artwork`).
- Impacto no negócio: um arquivo malicioso enviado como arte chega a quem aprova e ao fornecedor.
- Esforço: P
- Prioridade: P1

### SIC-073  Biblioteca institucional de marca por cooperativa
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:328` (DOC-15); matriz P101
- Evidência no código: o BrandKit genérico guarda logos e cores por cliente (matriz P101), sem titular, vigência, direitos nem vínculo com cooperativa ou Central (`sicoob_centrais.logo_url` não é consumido, SIC-005)
- O que falta: metadados de titularidade e vigência por cooperativa e reutilização homologada na arte do pedido.
- Impacto no negócio: cada pedido reenvia o logo e não há garantia de usar a versão oficial.
- Esforço: M
- Prioridade: P2

### SIC-074  Aceite formal de marca e ativos Sicoob
- Status: BLOQUEADA_EXTERNA
- Origem: `dossie.md:196-207`; matriz P132; plano T071/T092
- Evidência no código: os ativos estão aplicados (`public/brand/sicoob-logo.png`, cores `sicoob-green`), sem aceite registrado
- O que falta: homologação pelo responsável de marca da cooperativa ou do Sicoob.
- Impacto no negócio: risco de uso indevido da marca Sicoob em produção.
- Esforço: P
- Prioridade: P2

### 9. Recompra/reorder

### SIC-080  Intenção de recompra persistida, com resíduos de validação
- Status: PARCIAL
- Origem: `revisao-do-plano-2026-10-01.md:39` (P077/P099); `anexos/documentos-fornecidos.md:331` (DOC-18: "arte antiga requer validade de uso")
- Evidência no código: corrigido — `src/services/sicoob/reorderIdempotency.ts:27-59`, usado em `QuoteService.ts:248-287` e `orderService.ts:272-283`. Pendente — a chave vive no `sessionStorage` da aba (fechar a aba gera nova intenção). A revalidação cobre preço e estoque (`sicoob-reorder`), mas não arte nem embalagem.
- O que falta: revalidar a arte e a embalagem do pedido original antes de criar o novo compromisso.
- Impacto no negócio: a recompra pode reaproveitar uma arte desatualizada.
- Esforço: P
- Prioridade: P2

### 10. Kit-quote

### SIC-090  Capacidade física da embalagem do kit
- Status: NAO_INICIADA
- Origem: matriz P095/P096; plano T063/T064
- Evidência no código: `supabase/functions/sicoob-kit-quote/catalog.ts:122-133` só exige uma embalagem; dimensões usadas apenas na área de personalização (`:257-263`); não há peso, volume nem capacidade
- O que falta: modelo físico (dimensões e peso), validação no servidor e revisão técnica quando o dado faltar.
- Impacto no negócio: kit cotado e aprovado pode não caber na caixa.
- Esforço: M
- Prioridade: P2

### SIC-091  Previsão de reposição com margem fixa e sem confiança
- Status: PARCIAL
- Origem: matriz P097; plano T065
- Evidência no código: `src/hooks/useKitStockForecast.ts:44,218-220` (`BUFFER_DAYS = 3`)
- O que falta: política de margem, descartar entradas vencidas e indicador de confiança.
- Impacto no negócio: o prazo exibido pode prometer uma reposição que não acontece.
- Esforço: P
- Prioridade: P3

### 11. Ingestão de documentos

### SIC-100  Scanner de malware não configurado
- Status: BLOQUEADA_EXTERNA
- Origem: `revisao-do-plano-2026-10-01.md:45` (P075/P107)
- Evidência no código: `supabase/functions/sicoob-document-ingest/index.ts:34-35` lê `SICOOB_MALWARE_SCANNER_URL/TOKEN`; o scanner falha fechado com 503 (`scanner.ts:10`). `docs/execucao/reconciliacao-online-2026-09-28.md:28` registra os segredos inexistentes, que nem aparecem em `docs/secrets.md`. Consumidores: `OrderLogisticsTab.tsx:71` e `useOrderInvoices.ts:90`.
- O que falta: contratar ou configurar o scanner e homologar com arquivo limpo e com malicioso sintético.
- Impacto no negócio: ninguém anexa NF nem comprovante de entrega, então o ciclo financeiro e de entrega não fecha.
- Esforço: P (engenharia) + espera externa
- Prioridade: P1

### SIC-101  Retenção, revogação, descarte e órfãos no Storage
- Status: NAO_INICIADA
- Origem: matriz P106/P110; plano T076
- Evidência no código: não há política executável nem coleta de órfãos. `useOrderPilotApprovals.ts:98` remove o blob sem checar o resultado. A ingestão tenta apagar os dois blobs na falha sem retomada durável (matriz P106).
- O que falta: regra de retenção com responsável, job de coleta de órfãos e teste de restauração conjunta de metadados e arquivos.
- Impacto no negócio: documentos fiscais e de entrega sem regra de guarda; risco legal e de custo.
- Esforço: M
- Prioridade: P2

### SIC-102  Finalidades de documento restritas
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:323,325` (DOC-10, DOC-12); matriz P117
- Evidência no código: `src/services/sicoob/documentIngestService.ts:3` aceita só `invoice_pdf`, `invoice_xml` e `delivery_proof`; `record_sicoob_delivery_receipt` não recebe comprovante por destino
- O que falta: finalidades para recebimento por destino, avaria (foto) e anexos de proposta e arte.
- Impacto no negócio: o PA registra avaria sem poder anexar prova.
- Esforço: M
- Prioridade: P2

### 12. Notificações

### SIC-110  Decisão da Singular não notifica o PA; destinatários sem filtro de ativo
- Status: PARCIAL
- Origem: matriz P061/P065; plano T046/T047
- Evidência no código: o trigger só notifica quando entra em `pending_singular_approval` (`20260928182000:97-127`), selecionando por `profiles.role` sem `is_active`/`deleted_at` (`:120-123`). Não há aviso para `approved_singular`/`rejected_singular`.
- O que falta: trigger ou outbox — avisar o solicitante da decisão e filtrar destinatários ativos e vigentes.
- Impacto no negócio: o PA não fica sabendo que o orçamento foi aprovado ou recusado; usuários desligados continuam recebendo.
- Esforço: P
- Prioridade: P2

### SIC-111  Link do e-mail/Slack de alçada leva para /admin/sicoob
- Status: PARCIAL
- Origem: `docs/execucao/notificacoes-duraveis-20260922.md`; matriz P064-P068
- Evidência no código: `supabase/functions/_shared/approval-delivery.ts:24` monta a URL fixa `/admin/sicoob`, inacessível ao `gestor_compras` (SIC-017) e sem link para o pedido
- O que falta: edge — link profundo para `/sicoob/pedidos/:id` ou `/gestor/aprovacoes`.
- Impacto no negócio: o aprovador clica no e-mail e cai numa tela proibida (403).
- Esforço: P
- Prioridade: P1

### SIC-112  Provedores de notificação não configurados nem homologados
- Status: BLOQUEADA_EXTERNA
- Origem: matriz P066; plano T048
- Evidência no código: `docs/secrets.md:25-27,41` (`RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` e `SICOOB_APPROVAL_WORKER_SECRET` "ainda não verificada"; `PUBLIC_APP_URL` "preencher"). Sem `PUBLIC_APP_URL` a entrega volta como `retry` (`approval-delivery.ts:23-27`).
- O que falta: configurar segredos, domínio remetente e webhook Slack e homologar com destinatário autorizado.
- Impacto no negócio: nenhuma notificação de aprovação sai por e-mail ou Slack.
- Esforço: P
- Prioridade: P1

### SIC-113  Notificações de desconto e comentários gravadas pelo navegador
- Status: PARCIAL
- Origem: matriz P062/P069
- Evidência no código: `src/hooks/useDiscountApproval.ts:99,191` e `src/hooks/useQuoteComments.ts:172` fazem `insert` em `workspace_notifications` depois do commit da RPC
- O que falta: mover para trigger ou outbox transacional com deduplicação.
- Impacto no negócio: um pedido de desconto pode ficar sem aviso ao aprovador se o navegador falhar.
- Esforço: M
- Prioridade: P2

### SIC-114  Eventos de arte, documento, remessa e avaria sem notificação
- Status: NAO_INICIADA
- Origem: matriz P061 (catálogo único de eventos e destinatários)
- Evidência no código: `decide_sicoob_order_artwork`, `create_sicoob_order_artwork_version`, `upsert_sicoob_order_shipment` e `record_sicoob_delivery_receipt` não inserem notificação (busca por `workspace_notifications` nas migrations Sicoob só acha status de pedido e orçamento)
- O que falta: catálogo de eventos com destinatários e canais e emissão transacional.
- Impacto no negócio: arte aguardando decisão e entrega com avaria passam despercebidas.
- Esforço: M
- Prioridade: P2

### SIC-115  Menções em comentários de pedido fictícias
- Status: STUB/MOCK
- Origem: `src/components/sicoob/orders/OrderCommentsTab.tsx:56` ("Use @ para mencionar gestores")
- Evidência no código: `:63-70` sugere só o texto fixo "@Admin Central"; `addComment` (`src/services/OrderService.ts:~202-229`) não resolve menções nem notifica
- O que falta: autocomplete de usuários do escopo e notificação ao mencionado.
- Impacto no negócio: o usuário acha que avisou alguém, mas ninguém recebe.
- Esforço: P
- Prioridade: P3

### 13. Relatórios/dashboards para cooperativa

### SIC-120  Relatório Sicoob sem paginação e sem os recortes planejados
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:332` (DOC-19: por campanha, PA e período, incluindo cancelados e parciais)
- Evidência no código: `src/pages/sicoob/reports/SicoobReportsPage.tsx:163-182` busca os pedidos do período sem `.range()`, sujeito ao limite do PostgREST. Não há recorte por campanha ou categoria nem conciliação de parciais. O histórico de verba é paginado (`:88-101`).
- O que falta: paginar e exportar em lote; recortes por campanha (SIC-031) e categoria; parciais e cancelados reconciliados.
- Impacto no negócio: relatórios de períodos grandes saem truncados sem aviso.
- Esforço: M
- Prioridade: P2

### SIC-121  Painel do vendedor sem meta nem crescimento
- Status: PARCIAL
- Origem: `src/services/sicoob/statsService.ts:76-78` (`salesGoal`, `grow`)
- Evidência no código: retorna `salesGoal: null` e `grow: null` fixos; não há tabela de metas
- O que falta: cadastro de meta por vendedor e período e cálculo de variação.
- Impacto no negócio: o vendedor não acompanha o atingimento de meta.
- Esforço: P
- Prioridade: P3

### SIC-122  Exportação ERP/SISBR
- Status: BLOQUEADA_EXTERNA
- Origem: `backlog.md` B36; `dossie.md:231`
- Evidência no código: nenhuma referência a SISBR em `src/`, `supabase/functions` ou migrations
- O que falta: especificação e homologação do arquivo com a cooperativa.
- Impacto no negócio: a cooperativa redigita pedidos no seu sistema.
- Esforço: G
- Prioridade: P3

### SIC-123  Indicadores de eficiência da jornada
- Status: NAO_INICIADA
- Origem: `dossie.md:227` (tempo até aprovação de arte e despesa, cumprimento da data, retrabalho); `backlog.md` B38
- Evidência no código: `src/lib/sicoob/operationalMetrics.ts` cobre contagens e recorrência; `SicoobKpiPage.tsx` não mede tempo por etapa nem cumprimento de data (não há data de evento, SIC-031)
- O que falta: eventos com timestamp por etapa e métricas com denominador.
- Impacto no negócio: sem prova de redução de prazo ou retrabalho para vender o portal a outras cooperativas.
- Esforço: M
- Prioridade: P3

### 14. Logística/entrega

### SIC-130  Expedição parcial por item e destino
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:323` (DOC-10); matriz P115; `dossie.md:151-157`
- Evidência no código: `sicoob_order_shipments.order_id` é `UNIQUE` (`20260912090000:7`), uma remessa por pedido; `upsert_sicoob_order_shipment` não recebe item, destino ou quantidade
- O que falta: tabela de expedições por item e destino com saldo e chave de intenção.
- Impacto no negócio: um pedido entregue em três PAs em datas diferentes não é representável.
- Esforço: G
- Prioridade: P2

### SIC-131  Recebimento e conferência de pedido avulso
- Status: PARCIAL
- Origem: `anexos/documentos-fornecidos.md:322` (DOC-09, distinguir entregue, recebido com pendência e concluído)
- Evidência no código: `record_sicoob_delivery_receipt` só existe para destinos de consolidação (`GestorConsolidatedOrdersPage.tsx:250-259`); o pedido avulso só muda de status com foto de entrega (`OrderLogisticsTab.tsx:71`)
- O que falta: conferência por item no pedido avulso (recebido, avariado, faltante) com comprovante.
- Impacto no negócio: o PA não registra que recebeu menos do que pediu.
- Esforço: M
- Prioridade: P2

### SIC-132  Importação assistida de distribuição
- Status: NAO_INICIADA
- Origem: matriz P113; plano T082
- Evidência no código: `GestorConsolidatedOrdersPage.tsx` só aloca automaticamente por PA; não há upload CSV/XLSX
- O que falta: modelo, upload, prévia, validação por linha e confirmação atômica.
- Impacto no negócio: distribuir 600 kits por dezenas de PAs vira trabalho manual.
- Esforço: M
- Prioridade: P2

### SIC-133  Ocorrências (avaria, falta, devolução) e atendimento ligado ao pedido
- Status: NAO_INICIADA
- Origem: `anexos/documentos-fornecidos.md:325` (DOC-12); matriz P119; `backlog.md` B26
- Evidência no código: o recebimento conta avaria e falta e encerra como `received_with_issues` (matriz P119); não há chamado com responsável, prazo, reposição ou crédito
- O que falta: tabela e fluxo de ocorrência, crédito ou reposição e reconciliação financeira.
- Impacto no negócio: a avaria registrada não vira reposição nem crédito; fica sem dono.
- Esforço: G
- Prioridade: P2

### SIC-134  Rastreio sem integração nem previsão de entrega
- Status: PARCIAL
- Origem: matriz P116
- Evidência no código: `src/components/sicoob/orders/LogisticsCommandCenter.tsx:105-120` abre um site externo e declara que não há localização em tempo real; não há integração com transportadora no fluxo Sicoob
- O que falta: integração com transportadora (os MCPs Melhor Envio e Rodonaves existem fora do app) e previsão por destino.
- Impacto no negócio: o PA não sabe quando o brinde chega.
- Esforço: M
- Prioridade: P3

### SIC-135  Remessas do relatório logístico sem paginação
- Status: PARCIAL
- Origem: `revisao-do-plano-2026-10-01.md:47` (P111/P120)
- Evidência no código: `src/services/sicoob/logisticsReportService.ts:56-61` usa um único `.in('order_id', orderIds)` sobre todos os pedidos paginados
- O que falta: paginar ou particionar a busca de remessas.
- Impacto no negócio: com volume alto, o relatório perde remessas.
- Esforço: P
- Prioridade: P3

### SIC-136  Reconfirmação de disponibilidade antes da expedição
- Status: BLOQUEADA_EXTERNA
- Origem: matriz P114; `dossie.md:180`; `anexos/documentos-fornecidos.md:343-345`
- Evidência no código: catálogo somente leitura, sem reserva; `upsert_sicoob_order_shipment` não consulta o fornecedor
- O que falta: processo ou serviço do fornecedor para confirmar atendimento, fora do catálogo somente leitura.
- Impacto no negócio: o pedido pode ser aprovado sem estoque real.
- Esforço: M
- Prioridade: P2

### 15. Expansão para segunda cooperativa

### SIC-140  Isolamento entre cooperativas sem prova integrada
- Status: STUB/MOCK
- Origem: `docs/execucao/preflight-reconciliacao-sicoob.md:16-18` ("validar ... em duas cooperativas"); `dossie.md:219`
- Evidência no código: `sicoob_rls_validation.sql:9-80` desliga triggers, roda como superusuário sem `SET ROLE authenticated` (RLS não se aplica) e só imprime `NOTICE`, sem asserção nem `user_roles`. Os simuladores aplicam migrations isoladas (`scripts/qa/simular-*.py`). Os seeds têm uma cooperativa (SIC-012). Não há E2E com persona PA nem com duas cooperativas (busca por `comprador_pac|gerente_pa` em `e2e/` vazia).
- O que falta: teste — suíte SQL com a cadeia completa e `SET ROLE authenticated` com asserções; E2E com duas cooperativas (PA→Singular→pedido→verba→arte→entrega).
- Impacto no negócio: não há garantia de que a cooperativa B não veja nem altere dados da A (ver SIC-021).
- Esforço: M
- Prioridade: P1

### SIC-141  Parâmetros operacionais por cooperativa
- Status: NAO_INICIADA
- Origem: `anexos/documentos-fornecidos.md:12,326` (DOC-13: janelas, prazos de ocorrência e mínimos por organização); `backlog.md` B17
- Evidência no código: SLA fixo de 48 h no código removido (SIC-043); a política só tem dois booleanos (SIC-061); não há tabela de parâmetros por cooperativa
- O que falta: tabela de parâmetros versionada por cooperativa (janelas de pedido, prazo de ocorrência, mínimos, SLA) aplicada nas RPCs.
- Impacto no negócio: a segunda cooperativa com regras diferentes exige mudança de código.
- Esforço: G
- Prioridade: P2

### SIC-142  Piloto, primeira compra real e segunda cooperativa
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/execucao/fechamento-tecnico-2026-10-08.md:219-227`; plano T098/T099; matriz P146-P149
- Evidência no código: não se aplica; dependem de decisão de piloto, responsáveis nomeados, cooperativas piloto e 30 dias de operação
- O que falta: decisão formal da Promo e da cooperativa, com responsáveis e janela de observação.
- Impacto no negócio: o portal segue como candidato técnico, sem receita.
- Esforço: G
- Prioridade: P1

## Fontes lidas

- Planos e execução: `docs/execucao/revisao-do-plano-2026-10-01.md`, `docs/execucao/revisao-plano-20261001/matriz-150.json` (P030-P150), `docs/execucao/decisoes_pendentes.md`, `docs/execucao/preflight-reconciliacao-sicoob.md`, `docs/execucao/execucao-plano-2026-10-01.md`, `docs/execucao/fechamento-tecnico-2026-10-08.md`, `docs/execucao/auditoria-tecnica-2026-10-02.md`, `docs/execucao/backend-aprovacao-publica-20260922.md`, `docs/execucao/reconciliacao-online-2026-09-28.md` (trecho dos segredos), `docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.md` e `etapas.csv` (T031-T100).
- Documentação de negócio: `docs/pesquisa/2026-09-11/README.md`, `dossie.md` (§3-§10), `backlog.md`, `anexos/documentos-fornecidos.md` (§1-§11, DOC-01 a DOC-20), `docs/order-workflow.md`, `docs/01_CRIAR_PRIMEIRA_ORGANIZATION.md`, `SICOOB_TESTING.md`, `sicoob_rls_validation.sql`, `docs/secrets.md` (trecho dos segredos).
- Front: `src/routes/config/{sicoob,sicoob-rbac,admin,public,quotes}.ts`, `src/App.tsx`, `src/components/layout/{SicoobRoute,AdminRoute}.tsx`, `src/lib/access/role-policy.ts`, `src/pages/sicoob/**` (todas as páginas listadas), `src/pages/GestorCompras.tsx`, `src/pages/GestorApprovalsPage.tsx`, `src/pages/admin/sicoob/**`, `src/pages/admin/{AdminVerbasPage,AdminCentraisPage,AdminSingularesPage}.tsx`, `src/components/sicoob/**`, `src/components/orders/{SmartAlertsPanel,OrderConsolidationPanel,ApprovalKanbanBoard,RevisionRequest,PilotApprovalPanel}.tsx`, `src/components/quotes/{QuoteSingularApprovalActions,QuoteConvertToOrder}.tsx`, `src/components/cart/MiniCart.tsx`, `src/components/auth/QuickTestLogin.tsx`, `src/components/admin/users/SicoobHierarchyTab.tsx`, `src/components/system/ThemeInitializer.tsx`, `src/contexts/OrganizationContext.tsx`.
- Hooks e serviços: `src/hooks/sicoob/*`, `src/hooks/useQuoteBuilderState.ts`, `src/hooks/usePaBudget.ts`, `src/hooks/admin/useApprovalThreshold.ts`, `src/hooks/useSicoobApprovals.ts`, `src/hooks/orders/useOrders.ts`, `src/hooks/orders/extensions/{useOrderPilotApprovals,useOrderAudit,useOrderComments}.ts`, `src/hooks/useDiscountApproval.ts`, `src/hooks/useKitStockForecast.ts`, `src/services/sicoob/*`, `src/services/QuoteService.ts`, `src/services/OrderService.ts`, `src/services/quoteStatusTransition.ts`, `src/services/quotes/quoteVersionService.ts`, `src/lib/sicoob/operationalMetrics.ts`.
- Edge functions: `supabase/functions/sicoob-{seed,seed-debug,seed-qa,artwork-register,document-ingest,kit-quote,approval-notifications}/*`, `supabase/functions/_shared/approval-delivery.ts`.
- Migrations: todas as `*sicoob*` (`20260503000000` a `20261008030000`), além de `20260502143127`, `20260502143725`, `20260502145450`, `20260502153425`, `20260503195511`, `20260504153856`, `20260504211811`, `20260517131757`, `20260426101255`, `20260922200000`, `20260922225000`, `20260922224800`, `20260913120001`, `20260927171216`, `20260928162048`, `20260928173500`, `20260928182000`, `20261002120000`, `20261002160000`, `20261007233000` (cabeçalho e lista) e `20261008010000` (lista de funções).
- Preflight e testes: `supabase/preflight/sicoob-reconciliation-contract.sql`, a lista de `tests/sicoob/*` e dos testes que mencionam Sicoob, `e2e/quote-approval.spec.ts`, `e2e/routes/sicoob/*` (lista), `scripts/qa/simular-{conversao-pedido-sicoob,aprovacao-publica,idempotencia-orcamento}.py` (migrations aplicadas).
- Git: `git log` desde 27/09 e `git show --stat` de `dc08200` (PR #98) e `aec946a` (PR #87).
