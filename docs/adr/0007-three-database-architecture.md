# ADR 0007 — Arquitetura Multi-Tenant de 3 Bancos

**Status:** Accepted · **Date:** 13 de maio de 2026

## Contexto
O ecossistema Promo Gifts exige isolamento estrito entre:
1. **SSOT (Local)**: Auth, Orçamentos e configurações específicas da aplicação.
2. **Catálogo Externo**: Milhares de SKUs, imagens e tabelas de preço de fornecedores (Escrita via n8n).
3. **CRM Externo**: Dados de clientes e contatos sincronizados com o Bitrix24.

## Decisão
Formalizar a arquitetura de **Federação de Bancos de Dados** via Edge Functions (`external-db-bridge` e `crm-db-bridge`). O app frontend atua como o integrador, consolidando as respostas dos três backends em uma única UI coesa.

## Consequências
- ✅ **Isolamento de Carga**: Consultas pesadas de busca de produtos não afetam a performance do banco de orçamentos.
- ✅ **Segurança**: Credenciais de serviço dos bancos externos nunca chegam ao cliente frontend.
- ✅ **Escalabilidade**: Cada banco pode ser escalado independentemente conforme a volumetria.
- ⚠️ **Complexidade de Rede**: Exige correlação de requests (`X-Request-Id`) para debug cross-service.
- ⚠️ **Consistência Eventual**: Mudanças no CRM podem demorar segundos para refletir na busca local.

## Alternativas rejeitadas
- **Postgres Foreign Data Wrappers (FDW)**: Descartado devido à latência de rede entre instâncias Supabase e complexidade de manutenção de esquemas remotos.
- **Monolito de Dados**: Rejeitado para preservar a independência do catálogo SSOT que serve múltiplos canais.
