# Reconciliação do Realtime de negócio

**Data:** 16/10/2026  
**Projeto canônico:** `cfmzkthhgliqelozlmwu`  
**Ambiente:** construção  
**Estado:** implementação e simulação aprovadas; aplicação remota aguarda integração na `main`

## Diagnóstico

O inventário remoto mostrou que as 12 tabelas assinadas pelo frontend estavam fora da publicação `supabase_realtime`. Todas já possuíam RLS, mas `login_attempts` oferecia leitura apenas administrativa, enquanto a interface consulta as tentativas do usuário autenticado.

As tabelas reconciliadas são: `custom_kits`, `device_login_notifications`, `discount_approval_requests`, `integration_credentials`, `kit_comments`, `login_attempts`, `notifications`, `orders`, `product_views`, `quotes`, `search_analytics` e `sicoob_orders`.

## Implementação

- A migration `20261016190000_enable_scoped_business_realtime.sql` valida publicação seletiva, RLS e política de leitura antes de adicionar cada tabela.
- `login_attempts` ganhou política `SELECT` limitada a `user_id = auth.uid()`.
- As sete assinaturas com eventos de atualização/remoção usam `REPLICA IDENTITY FULL`; assinaturas somente de inserção mantêm a identidade padrão para limitar WAL.
- O monitor `notify_hardening_regression()` passou a verificar RLS e política de leitura nas tabelas publicadas.
- Cada montagem do Kanban cria um canal Realtime exclusivo, evitando colisão entre consumidores simultâneos.
- O executor administrativo inclui a migration por SHA-256 e recusa um estado remoto que não satisfaça o contrato.

## Evidência

Em PostgreSQL `public.ecr.aws/supabase/postgres:17.6.1.063`, a simulação comprovou:

1. recusa de publicação quando uma tabela está sem RLS;
2. reaplicação idempotente da migration;
3. publicação seletiva de exatamente 12 tabelas;
4. leitura de tentativas de login restrita ao próprio usuário;
5. sete tabelas com identidade de réplica completa;
6. monitor de hardening preservado em 5/5.

Também passaram:

- 236/236 cenários Node;
- 6/6 contratos direcionados de Realtime e runtime Edge;
- TypeScript sem diagnóstico;
- lint direcionado sem erro;
- validação dos hashes autorizados.

Na consulta de 16/10/2026, o ledger remoto já continha `20261015102000`; permaneciam pendentes `20261016180000` e `20261016190000`. Elas não foram aplicadas fora da ordem de integração, pois o banco canônico deve corresponder ao código aprovado na `main`.

## Publicação segura

Depois do merge e do CI obrigatório, executar o aplicador allowlisted e exigir a pós-condição:

```bash
node scripts/db/apply-sicoob-migrations.mjs --apply
node scripts/db/apply-sicoob-migrations.mjs --require-applied
```

O aceite remoto exige publicação seletiva, inventário completo, política de `login_attempts` e monitor de hardening válidos. A ausência de qualquer condição encerra o processo com erro.
