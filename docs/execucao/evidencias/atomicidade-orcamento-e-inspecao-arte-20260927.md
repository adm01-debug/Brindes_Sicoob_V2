# Evidência — atomicidade do orçamento e inspeção de arte

Data: 27/09/2026  
Ambiente: construção; dados sintéticos; nenhuma compra real.

## Riscos fechados

- O cabeçalho, os itens, as personalizações e o histórico do orçamento passam
  pela RPC `save_quote_atomic` em uma única transação.
- O banco recalcula subtotal, markup, desconto, frete, total e custo; valores
  derivados enviados pelo navegador não são aceitos quando divergem.
- `row_version`, RLS, organização e estado editável são verificados sob lock.
- Um orçamento enviado para decisão não pode ser sobrescrito silenciosamente.
- O registro de arte inspeciona os bytes reais de PDF, PNG, JPEG ou WebP antes
  de calcular o hash e criar a fotografia imutável.
- PDF truncado, PDF com ação ativa e arquivo cuja assinatura diverge da
  extensão ou do MIME declarado são recusados no servidor.

## Simulações executadas

| Cenário | Resultado |
|---|---|
| Falha provocada no segundo item após inserção do cabeçalho | Toda a criação foi revertida |
| Falha provocada durante substituição dos itens | Cabeçalho, versão e itens anteriores foram preservados |
| Atualização com `row_version` obsoleto | Recusada sem alteração parcial |
| Organização fora do escopo do ator | Recusada |
| Tentativa de editar orçamento já enviado | Recusada; exige nova versão |
| Totais manipulados pelo cliente | Recusados |
| Arquivo `.pdf` com bytes de texto ou PNG | Recusado |
| PDF truncado ou com `/OpenAction` | Recusado |
| Nova versão de arte após aprovação | Versão anterior preservada e produção bloqueada até novo aceite |

## Evidências reproduzíveis

- `python3 scripts/qa/simular-salvamento-orcamento-atomico.py`
- `python3 scripts/qa/simular-financeiro-arte-sicoob.py`
- `deno check supabase/functions/sicoob-artwork-register/index.ts`
- `npm test -- --run`: 391 arquivos aprovados, 8 ignorados; 5.526 testes
  aprovados, 112 ignorados.
- `npm run build`: concluído, 5.809 módulos transformados.
- `npm run lint:baseline`: nenhuma regressão; três erros anteriores eliminados.
- Compilação e criação de orçamento como `authenticated` em transação
  revertida no banco canônico: aprovadas; `anon` sem `EXECUTE` e histórico
  gravado somente pela RPC endurecida `append_quote_history_note`.

O resultado estruturado da simulação transacional está em
`salvamento-orcamento-atomico.json`.

## Aplicação canônica

- PR [#47](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/47)
  mesclado em `main` no commit `658e6368b708a7e78e732238b41b58bb7af2d290`.
- Migration `20260927190000_atomic_quote_save` aplicada e registrada em
  `supabase_migrations.schema_migrations` no projeto
  `cfmzkthhgliqelozlmwu`.
- Verificação pós-aplicação: função presente; `authenticated` com `EXECUTE`;
  `anon` sem `EXECUTE`.
- `sicoob-artwork-register` publicada como `ACTIVE`, versão 1, com
  `verify_jwt=true`; o código foi baixado novamente pela API e conferido.
- Smoke negativo remoto sem JWT: HTTP 401
  (`UNAUTHORIZED_NO_AUTH_HEADER`).

O projeto já usava as 100 posições de Edge Functions. Para publicar o controle
de arte, a função de diagnóstico `e2e-auth-test` foi retirada do ambiente de
construção: ela é exclusiva de `dev`, não possui chamada em aplicação, CI ou
cron, e seu fonte permanece versionado para recuperação. A troca manteve 100
funções remotas e priorizou o fluxo operacional de arte.
