# ADR 0008: Política Unificada de Soft-Delete

## Status
Proposta

## Contexto
Atualmente, diferentes módulos do sistema utilizam abordagens distintas para exclusão de dados. Alguns utilizam `DELETE` físico (Hard Delete), enquanto outros utilizam flags como `is_active` ou colunas `deleted_at` (Soft Delete). Esta inconsistência dificulta a auditoria, a conformidade com a LGPD e a integridade referencial.

## Decisão
Adotaremos uma política unificada de **Soft-Delete** para todas as entidades principais de negócio (Orçamentos, Pedidos, Clientes, Produtos).

### Padrão Técnico
1. **Coluna**: Todas as tabelas participantes devem ter a coluna `deleted_at TIMESTAMP WITH TIME ZONE`.
2. **Coluna Auxiliar**: Manteremos a coluna `is_active BOOLEAN DEFAULT TRUE` para controle operacional rápido, mas `deleted_at` será a fonte da verdade para exclusão lógica.
3. **Trigger**: Um trigger automático deve ser adicionado para garantir que, ao definir `deleted_at`, `is_active` seja definido como `false`.
4. **Filtragem**: 
   - Queries no frontend devem sempre filtrar `deleted_at IS NULL`.
   - RLS Policies devem ser atualizadas para esconder registros onde `deleted_at IS NOT NULL` por padrão, exceto para perfis de Auditoria/Admin.
5. **Hard Delete**: Permitido apenas para dados temporários, logs rotacionados ou após o período de retenção legal (ex: 5 anos).

## Consequências
- **Integridade**: Maior segurança contra exclusões acidentais.
- **Auditoria**: Histórico completo de quando um registro foi removido.
- **Performance**: Necessidade de índices parciais `WHERE deleted_at IS NULL` para manter a performance de busca.
- **Complexidade**: Necessidade de garantir que o Soft-Delete se propague para filhos (cascade lógico).
