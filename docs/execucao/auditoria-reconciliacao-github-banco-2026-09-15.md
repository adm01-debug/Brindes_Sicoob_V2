# Auditoria de reconciliação — GitHub, repositório e Supabase

**Data:** 15/09/2026

**Escopo:** repositório `adm01-debug/Brindes_Sicoob_V2`, branch `main`, projeto Supabase `cfmzkthhgliqelozlmwu` e integração de catálogo externa configurada para consulta.
**Método:** consultas somente leitura via GitHub CLI e MCP oficial do Supabase. Nenhum dado pessoal, segredo ou conteúdo de credencial foi copiado para este documento.

## Parecer

O repositório e o GitHub estão sincronizados no commit `74e6904fc8a62774a4e5956c9cdff7a72821bc1a`, mas o Supabase não está reconciliado com o código. O ambiente remoto contém uma parte extensa do schema criada fora do histórico de migrations rastreado, não possui os recursos Sicoob mais recentes e tem funções publicadas a menos que o repositório. **O ambiente não atende ao gate de deploy.**

## Matriz de estado

| Área | Evidência | Estado | Consequência |
|---|---|---:|---|
| Repositório local ↔ GitHub | `main`, `HEAD` e `origin/main` no mesmo commit; árvore limpa antes desta auditoria | Conforme | Fonte de código identificada |
| Migrations | 503 arquivos SQL locais; banco registra somente `001`, `002` e `003` | Crítico | Não há trilha confiável para aplicar ou reverter schema |
| Branch Supabase | Branch padrão `main` em `MIGRATIONS_FAILED` | Crítico | Impede uso seguro de branches e de deploy por migration |
| Tabelas Sicoob recentes | 11 tabelas esperadas não existem no remoto | Crítico | Fluxos de arte, financeiro, entrega, recompras, kits e consolidação não podem operar |
| RPCs recentes | 4 RPCs esperadas não existem no remoto | Crítico | Idempotência e operações atômicas não estão disponíveis |
| Edge Functions | 103 diretórios locais; 99 funções publicadas | Crítico | Quatro funções do código não foram implantadas |
| Tipos TypeScript | 203 tabelas no tipo local; 195 no tipo gerado do remoto | Crítico | O cliente tipa recursos indisponíveis e omite tabelas remotas |
| Referências em execução | 186 tabelas, 8 RPCs e 7 buckets referenciados pelo código | Inconsistente | Chamadas podem falhar em runtime |
| RLS | 3 tabelas sem RLS | Crítico | Dados e operações podem ficar expostos ao anon/authenticated |
| Dados operacionais Sicoob | 0 pedidos, itens, aprovações, orçamentos, itens de orçamento e cooperativas | Bloqueador de operação | Não há evidência de piloto operacional no banco |
| CI e governança | 3 workflows obrigatórios falham; `main` sem proteção | Bloqueador de release | Um push direto pode chegar à branch padrão sem validação completa |

## Banco de dados

### Histórico de migrations

O repositório contém 503 arquivos em `supabase/migrations`; há prefixos de versão duplicados em `20250103`, `20251227` e `20251228`. O banco remoto registra somente as migrations iniciais de notificações. Isso não significa que ele só possui três alterações: ele possui 195 tabelas, evidência de criação manual ou de aplicação fora do ledger de migrations.

Aplicar os 503 arquivos em sequência é inseguro. Há risco de colisão com tabelas, índices, políticas, funções e dados já existentes. A correção precisa começar por um baseline do schema remoto, não por um `db push` direto.

### Recursos Sicoob ausentes

As seguintes tabelas declaradas no repositório não existem no ambiente remoto:

- `order_consolidation_orders`
- `sicoob_approval_policies`
- `sicoob_delivery_allocations`
- `sicoob_delivery_destinations`
- `sicoob_delivery_receipt_events`
- `sicoob_kit_quote_requests`
- `sicoob_order_artwork_versions`
- `sicoob_order_invoices`
- `sicoob_order_payments`
- `sicoob_order_shipments`
- `sicoob_reorder_requests`

Também não existem as RPCs `create_sicoob_kit_quote`, `get_sicoob_kit_quote_idempotency`, `get_sicoob_reorder_idempotency` e `reorder_sicoob_order_as_quote`.

Entre as referências do frontend e das funções, 37 tabelas não existem no banco remoto. As chamadas ativas mais relevantes são:

- `order_consolidations` em `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx`;
- `sicoob_budgets` em `src/services/sicoob/budgetService.ts`;
- `sicoob_order_artwork_versions`, `sicoob_order_invoices` e `sicoob_order_payments` nos hooks de pedido;
- `v_sicoob_hierarchy` em `src/components/sicoob/HierarchyPath.tsx`.

Das 8 RPCs referenciadas, `get_sicoob_consolidation_sellers` não está publicada. Dos 7 buckets referenciados, não existem `art-files`, `avatars` e `sicoob-order-documents`; o remoto usa nomes diferentes, como `order-documents`.

### Tipos gerados

O arquivo `src/integrations/supabase/types.ts` declara 11 tabelas que não existem no banco, incluindo as tabelas de políticas, entregas, consolidação e financeiro Sicoob. Em sentido inverso, o remoto expõe `notification_templates`, `webhook_configs` e `webhook_logs`, ausentes do tipo local. Os tipos não devem ser gerados novamente antes da reconciliação do schema, pois isso somente esconderia a divergência.

### Dados e integridade

A consulta agregada encontrou 5 usuários em `auth.users` e 2 em `public.profiles`; 3 usuários não possuem perfil correspondente. O domínio Sicoob contém 6 centrais e 4 temas, mas não possui cooperativas, pedidos, itens, aprovações, orçamentos ou itens de orçamento. O Storage não possui objetos e não há foreign tables configuradas.

O catálogo externo não está materializado como tabela estrangeira neste projeto. A URL do catálogo aparece somente em documentação, testes e no adaptador de leitura externa. A validação do conteúdo, do estoque e dos preços do projeto `doufsxqlfjyuvxuezpln` requer acesso separado e somente leitura àquele Supabase.

### Segurança

O advisor do Supabase reporta RLS desabilitado em:

- `public.notification_templates`
- `public.webhook_configs`
- `public.webhook_logs`

Essas tabelas ficam acessíveis às roles de cliente enquanto o RLS estiver desligado. A habilitação não foi aplicada nesta auditoria porque políticas corretas precisam ser definidas antes; habilitar RLS sem políticas poderia interromper fluxos existentes.

`access_security_settings` e `device_login_notifications` têm RLS ligado, porém nenhuma policy. Isso pode ser uma negação deliberada ou um bloqueio funcional; precisa ser testado com cada papel autorizado.

Há 99 Edge Functions remotas e 96 estão com `verify_jwt: false`. Esse parâmetro não prova exposição por si só, pois algumas funções podem autenticar dentro do código, mas requer uma revisão individual antes de uso produtivo.

## Edge Functions

As quatro funções presentes localmente e ausentes no remoto são:

- `migrate-helper`
- `sicoob-artwork-register`
- `sicoob-kit-quote`
- `sicoob-reorder`

Elas não devem ser publicadas antes da criação e validação do schema que usam. O deploy de função sem a respectiva tabela, bucket e RPC preservaria o erro de produção.

## GitHub e CI

O repositório privado está ativo, e o `main` remoto corresponde exatamente ao checkout auditado. A proteção de branch do GitHub está desabilitada. O workflow de sentinela confirmou um push direto em `main` e falhou como previsto.

No último commit, Qualidade contínua, CodeQL, Security Scan, Bundle Size Check e Lighthouse passaram. Os seguintes workflows falharam por configuração ausente:

| Workflow | Causa confirmada |
|---|---|
| E2E (Playwright) | Ausência de `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD` |
| Enterprise Compliance & Audit Reporting | Ausência de `SUPABASE_SERVICE_ROLE_KEY` |
| Branch Protection Sentinel | `main` recebeu push fora do padrão de merge de PR e não está protegido |

Os secrets existentes no repositório são somente os quatro valores públicos de URL/projeto/chaves publishable. `LHCI_GITHUB_APP_TOKEN` também é referenciado em workflow, mas o último Lighthouse passou; deve-se verificar se ele tem fallback ou se é fornecido fora de secrets do repositório. `GITHUB_TOKEN` é provido automaticamente pelo GitHub Actions e não deve ser criado manualmente como secret.

## Reconciliação obrigatória antes de deploy

1. **Congelar mudanças de schema e Edge Functions no projeto remoto** até criar uma cópia de segurança lógica de schema, políticas, funções, buckets e dados agregados.
2. **Definir o schema remoto atual como baseline auditável**, exportando inventário de tabelas, colunas, constraints, índices, RLS, policies, triggers e RPCs.
3. **Comparar o baseline contra `main`** e escrever migrations novas, idempotentes e ordenadas para cada diferença necessária. Não reutilizar nem reaplicar os 503 arquivos históricos.
4. **Reparar o ledger de migrations** em uma branch Supabase de desenvolvimento. Só depois de a branch ficar saudável deve-se sincronizar o ambiente principal.
5. **Criar e testar as 11 tabelas e 4 RPCs Sicoob ausentes**, incluindo RLS, policies, constraints, índices e cenários de idempotência.
6. **Resolver nomes de recursos de runtime**: corrigir/remover as 37 referências de tabelas ausentes, a RPC ausente e os três buckets ausentes; preservar a separação de consulta do catálogo externo.
7. **Publicar as quatro Edge Functions faltantes** após o passo 5 e testar autenticação, autorização, Storage e tratamento de erros.
8. **Regerar `types.ts` a partir do schema reconciliado** e executar `typecheck`, testes unitários e cenários de integração autenticados.
9. **Projetar e aplicar políticas RLS** para as três tabelas expostas, com teste por papel; revisar as 96 funções sem verificação automática de JWT.
10. **Corrigir governança de release**: proteger `main`, exigir PR e checks, cadastrar as credenciais E2E de contas dedicadas e fornecer a credencial administrativa somente ao workflow de auditoria.
11. **Conceder acesso temporário somente leitura ao catálogo externo** para validar estrutura, estoque, preço, função bridge e ausência de escrita antes de liberar o fluxo de compras.
12. **Executar uma rodada de homologação** com central, cooperativa, aprovador e administrador, sem dados reais, antes de qualquer produção.

## Evidência estrutural do frontend Sicoob

Foi construído um grafo local focado em `src/pages/sicoob`: 17 arquivos, 78 nós, 64 relações consolidadas e 17 comunidades; não foram encontrados ciclos de importação. O extrator reportou 257 referências sem endpoint resolvido, por isso essa parcela foi descartada como evidência de dependência. A conclusão desta auditoria usa apenas consultas diretas ao código, GitHub e Supabase.

## Conclusão

O código versionado está sincronizado com o GitHub, mas não com o Supabase. O primeiro trabalho de implantação deve ser uma reconciliação controlada do schema e das funções, em ambiente de desenvolvimento, seguida de RLS, tipos e CI. Até esses gates serem concluídos e validados, não há base segura para deploy ou operação do portal Sicoob.
