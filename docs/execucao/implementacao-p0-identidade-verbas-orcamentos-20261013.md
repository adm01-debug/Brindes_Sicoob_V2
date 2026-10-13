# Implementação P0 — identidade, verbas e governança de orçamentos

Data da execução: 13/10/2026.

## Resultado do lote

Este lote corrige quatro falhas críticas localizadas na auditoria de 11/10 e na revalidação conectada de 13/10:

1. `verify-email` não aceita mais UUID e não confirma contas por credencial administrativa. A função agora responde `410 Gone`, exige JWT no gateway e orienta o uso do fluxo padrão do Supabase Auth.
2. `pa_budgets` e `cooperativa_budgets` passam a falhar fechado para perfis inativos, restringem gestores à própria cooperativa, impedem gerente de PA de alterar verba ou alçada e retiram do cliente consumo, identidade e exclusão direta.
3. Conversão de orçamento e aprovação pública recebem um contexto de governança limitado ao wrapper autorizado; os núcleos internos não são executáveis pelos papéis externos.
4. Cabeçalho comercial, itens e personalizações ficam imutáveis depois do envio ou decisão. O contexto interno só é aceito quando a escrita parte do proprietário das rotinas autorizadas, e orçamentos enviados, decididos ou convertidos não podem ser excluídos. Alteração e exclusão em cascata continuam permitidas apenas em `draft`, `revision`, `rejected` e `rejected_singular` da versão vigente; a interface usa o mesmo contrato para edição e exclusão individual ou em massa.

## Simulações executadas

| Prova | Resultado |
|---|---:|
| Autoridade de verbas em PostgreSQL 17 isolado | 25/25 asserções em 10 grupos aprovadas |
| Conversão orçamento → pedido em PostgreSQL 16 isolado | 29/29 cenários aprovados |
| Aprovação pública, HMAC, locks e rollback | 54/54 cenários aprovados |
| Testes Vitest focados | 20/20 testes aprovados |
| Suíte Vitest completa com cobertura | 425 arquivos e 5.720 testes aprovados; 94% statements e 86,79% branches |
| Contratos estáticos das Edge Functions | 106/106 declarados e válidos |
| TypeScript contra baseline | 0 regressões |
| ESLint contra baseline | 0 regressões |
| Build de produção com configuração sintética | aprovado |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| Migration de verbas contra o esquema canônico | aplicada em transação e revertida |
| Migration de governança contra o esquema canônico | aplicada em transação e revertida |
| Auditoria `SECURITY DEFINER` do banco canônico | 0 violações antes do deploy |

As provas detalhadas estão em [autoridade-verbas-sicoob.json](evidencias/autoridade-verbas-sicoob.json) e [governanca-orcamento-p0-20261013.json](evidencias/governanca-orcamento-p0-20261013.json).

## Estado operacional

O código e as migrations estão prontos para revisão. A aplicação persistente das migrations, o deploy de `verify-email` e a criação do segredo HMAC no Vault serão feitos somente depois de CI e merge, conforme o fluxo obrigatório do repositório. Até este ponto, as verificações conectadas usaram transações com `ROLLBACK` e não alteraram o banco canônico.
