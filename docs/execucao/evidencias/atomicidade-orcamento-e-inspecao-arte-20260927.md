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
