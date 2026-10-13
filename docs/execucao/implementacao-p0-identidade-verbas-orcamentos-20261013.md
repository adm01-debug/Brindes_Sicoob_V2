# Implementação P0 — identidade, verbas e governança de orçamentos

Data da execução: 13/10/2026.

## Resultado do lote

Este lote corrige quatro falhas críticas localizadas na auditoria de 11/10 e na revalidação conectada de 13/10:

1. `verify-email` não aceita mais UUID e não confirma contas por credencial administrativa. A função agora responde `410 Gone`, exige JWT no gateway e orienta o uso do fluxo padrão do Supabase Auth.
2. `pa_budgets` e `cooperativa_budgets` passam a falhar fechado para perfis inativos, restringem gestores à própria cooperativa, preservam a consulta dos compradores de PA e singular, impedem gerente de PA de alterar verba ou alçada e retiram do cliente consumo, identidade e exclusão direta. Um gate adicional impede que o próprio usuário troque cooperativa, PA, singular, carteira, papel, atividade ou alçada no perfil.
3. Conversão, versionamento, aprovação pública, mudança de status, aprovação com PDF e os dois fluxos de desconto recebem um contexto de governança limitado ao wrapper autorizado; os núcleos internos não são executáveis pelos papéis externos e o contexto é restaurado em sucesso ou erro.
4. Cabeçalho comercial, resposta do cliente, identidade, versão concorrente, timestamps de ciclo de vida, exclusão lógica, itens e personalizações ficam imutáveis depois do envio ou decisão. Versões históricas ficam imutáveis mesmo quando mantêm um status antes editável. O contexto interno só é aceito quando a escrita parte do proprietário das rotinas autorizadas, e orçamentos enviados, decididos, convertidos ou históricos não podem ser excluídos. Alteração e exclusão em cascata continuam permitidas apenas em `draft`, `revision`, `rejected` e `rejected_singular` da versão vigente; a interface usa o mesmo contrato para edição e exclusão individual ou em massa. O bloqueio de linha do orçamento serializa decisão e edição concorrentes de itens.

## Simulações executadas

| Prova | Resultado |
|---|---:|
| Autoridade de verbas em PostgreSQL 17 isolado | 31/31 asserções em 12 grupos aprovadas |
| Conversão orçamento → pedido em PostgreSQL 16 isolado | 31/31 cenários aprovados |
| Aprovação pública, HMAC, locks e rollback | 61/61 cenários aprovados |
| Testes Vitest focados | 15/15 testes aprovados |
| Suíte Vitest completa com cobertura | 425 arquivos e 5.720 testes aprovados; 94% statements e 86,79% branches |
| Contratos estáticos das Edge Functions | 106/106 declarados e válidos |
| TypeScript contra baseline | 0 regressões |
| ESLint contra baseline | 0 regressões |
| Build de produção com configuração sintética | aprovado |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| Migration de verbas contra o esquema canônico | aplicada em transação e revertida; 0 artefatos persistidos |
| Migration de governança contra o esquema canônico | aplicada em transação; RPC real de status levou rascunho sintético a `sent` e restaurou contexto; rollback deixou 0 artefatos e 0 registros |
| Auditoria `SECURITY DEFINER` do banco canônico | 0 violações antes do deploy |

As provas detalhadas estão em [autoridade-verbas-sicoob.json](evidencias/autoridade-verbas-sicoob.json) e [governanca-orcamento-p0-20261013.json](evidencias/governanca-orcamento-p0-20261013.json).

## Estado operacional

O código e as migrations estão prontos para revisão. A aplicação persistente das migrations, o deploy de `verify-email` e a criação do segredo HMAC no Vault serão feitos somente depois de CI e merge, conforme o fluxo obrigatório do repositório. Até este ponto, as verificações conectadas usaram transações com `ROLLBACK` e não alteraram o banco canônico.
