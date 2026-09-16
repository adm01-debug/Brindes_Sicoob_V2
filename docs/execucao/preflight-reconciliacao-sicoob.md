# Preflight de reconciliação Sicoob

O contrato local evoluiu mais rápido que o schema registrado no projeto
operacional. Antes de aplicar qualquer migration, execute
[`sicoob-reconciliation-contract.sql`](../../supabase/preflight/sicoob-reconciliation-contract.sql)
no ambiente de homologação criado a partir de backup restaurável.

O arquivo é somente leitura e confere os recursos usados pelos fluxos Sicoob:
tabelas, colunas, funções, view de hierarquia e buckets privados. O resultado
deve ser anexado ao PR da migration com o resultado de cada cenário autenticado.

## Sequência obrigatória

1. Criar uma branch Supabase de homologação a partir de backup restaurável do
   projeto `cfmzkthhgliqelozlmwu`.
2. Executar o preflight e registrar todos os itens `FALTANTE`.
3. Aplicar somente migrations novas, em ordem, no ambiente isolado.
4. Executar o preflight novamente; itens ainda faltantes exigem correção antes
   do deploy.
5. Validar os fluxos autenticados de orçamento, aprovação, pedido, financeiro,
   arte, consolidação, recebimento e recompra em duas cooperativas.
6. Revisar RLS e permissões das funções com acesso privilegiado. Não habilite
   RLS em massa: cada política deve preservar os acessos legítimos.
7. Testar restauração do backup e documentar o rollback antes da produção.

O catálogo `doufsxqlfjyuvxuezpln` não faz parte desta migração. Ele permanece
fonte externa de consulta de produtos, preços e estoque.
