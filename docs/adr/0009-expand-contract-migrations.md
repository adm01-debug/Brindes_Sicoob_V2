# ADR 009: Padrão "Expand & Contract" para Migrações de Banco de Dados

## Status
Proposta

## Contexto
Mudanças destrutivas no banco de dados (renomear colunas, remover tabelas, mudar tipos) frequentemente causam downtime ou quebra de código se o deploy da aplicação não estiver perfeitamente sincronizado com a migração do banco. Em ambientes de deploy contínuo (CD), precisamos garantir que a aplicação possa rodar simultaneamente com a versão antiga e a nova do schema.

## Decisão
Adotaremos o padrão **Expand & Contract** para todas as migrações que alterem estruturas existentes.

### Fases da Migração
1. **Expand (Fase 1)**:
   - Adicionar novas colunas/tabelas.
   - Manter as colunas antigas.
   - Criar triggers no banco para sincronizar dados da coluna antiga para a nova (e vice-versa se necessário).
   - O código da aplicação começa a escrever em ambas, mas lê da antiga.
2. **Migrate (Fase 2)**:
   - Deploy de nova versão do código que lê da coluna nova.
   - Sincronizar dados remanescentes que não foram pegos por triggers.
3. **Contract (Fase 3)**:
   - Remover triggers de sincronização.
   - Remover colunas/tabelas antigas.
   - Limpar o código que fazia a escrita dupla.

### Regras de Ouro
- **NUNCA** usar `RENAME` diretamente em produção sem uma coluna de compatibilidade.
- **NUNCA** mudar o tipo de uma coluna in-place se houver risco de cast falhar.
- Migrações destrutivas devem ser separadas em Pull Requests distintos para cada fase.

## Consequências
- **Segurança**: Zero downtime e rollback imediato do código sem precisar reverter o banco.
- **Esforço**: Maior tempo de desenvolvimento para mudanças estruturais simples.
- **Higiene**: Risco de acumular "dead columns" se a fase de Contract for esquecida (deve ser auditada).
