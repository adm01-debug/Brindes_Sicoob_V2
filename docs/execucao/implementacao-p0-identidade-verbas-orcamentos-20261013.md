# Implementação P0 — identidade, verbas e governança de orçamentos

Data da execução: 13/10/2026.

## Resultado do lote

Este lote corrige quatro falhas críticas localizadas na auditoria de 11/10 e na revalidação conectada de 13/10:

1. `verify-email` não aceita mais UUID e não confirma contas por credencial administrativa. A função agora responde `410 Gone`, exige JWT no gateway e orienta o uso do fluxo padrão do Supabase Auth.
2. `pa_budgets` passa a falhar fechado para perfis inativos, restringe gestores à própria cooperativa, impede gerente de PA de alterar verba ou alçada e retira do cliente as colunas de consumo.
3. Conversão de orçamento e aprovação pública recebem um contexto de governança limitado ao wrapper autorizado; os núcleos internos não são executáveis pelos papéis externos.
4. Cabeçalho comercial, itens e personalizações ficam imutáveis depois do envio ou decisão. Alterações continuam permitidas apenas em `draft`, `revision`, `rejected` e `rejected_singular` da versão vigente.

## Simulações executadas

| Prova | Resultado |
|---|---:|
| Autoridade de verbas em PostgreSQL 17 isolado | 14/14 asserções em 7 grupos aprovadas |
| Conversão orçamento → pedido em PostgreSQL 16 isolado | 26/26 cenários aprovados |
| Aprovação pública, HMAC, locks e rollback | 49/49 cenários aprovados |
| Testes Vitest focados | 13/13 testes aprovados |
| Contratos estáticos das Edge Functions | 106/106 declarados e válidos |
| TypeScript contra baseline | 0 regressões |
| ESLint contra baseline | 0 regressões |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| Migration de verbas contra o esquema canônico | aplicada em transação e revertida |
| Migration de governança contra o esquema canônico | aplicada em transação e revertida |
| Auditoria `SECURITY DEFINER` do banco canônico | 0 violações antes do deploy |

As provas detalhadas estão em [autoridade-verbas-sicoob.json](evidencias/autoridade-verbas-sicoob.json) e [governanca-orcamento-p0-20261013.json](evidencias/governanca-orcamento-p0-20261013.json).

## Estado operacional

O código e as migrations estão prontos para revisão. A aplicação persistente das migrations, o deploy de `verify-email` e a criação do segredo HMAC no Vault serão feitos somente depois de CI e merge, conforme o fluxo obrigatório do repositório. Até este ponto, as verificações conectadas usaram transações com `ROLLBACK` e não alteraram o banco canônico.
