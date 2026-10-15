# Fechamento do lote de tendências, CRM e telemetria — 15/10/2026

## Escopo e método

O lote foi revisado por cinco frentes especializadas: contratos e banco, segurança/RLS, frontend/UX, paginação e release. A implementação foi precedida por simulações de falha de fonte, paginação acima de 1.000 registros, troca de fuso em datas civis, usuário sem papel, vínculo inativo, vendedor tentando acessar PII de cliente e escrita de telemetria em nome de terceiro.

## Implementação concluída

- A telemetria de busca escreve o contrato canônico `user_id` e `search_context`, normaliza o termo e serializa filtros sem quebrar a jornada em valores `bigint` ou objetos cíclicos.
- O banco reconcilia as variantes históricas de `search_analytics` por expansão e backfill, sem apagar as colunas legadas.
- A RLS permite inserir somente em nome do usuário autenticado e consolida leitura própria ou gerencial em uma única policy.
- `anon` não possui privilégios na tabela; `authenticated` possui somente `SELECT` e `INSERT`; os eventos não podem ser alterados nem apagados pelo cliente.
- Os cursores compostos `(created_at DESC, id DESC)` possuem índices globais, por usuário/vendedor e para buscas sem resultado.
- A Edge Function `trends-insights` pagina o período integral, deduplica por ID, rejeita páginas sem avanço e interrompe a narrativa quando uma fonte falha.
- O ranking comercial pagina itens de pedido, catálogo e snapshots externos; remove os cortes silenciosos de 200/5.000 linhas e conta pedidos distintos por categoria.
- Datas de tendências usam dias civis, sem deslocamento visual por UTC, e o botão de atualização renova a janela temporal.
- Rankings, gráficos e sinais distinguem erro, cache anterior, ausência real e carregamento; ações que só apareciam no hover também aparecem por foco.
- O mapa de calor expõe resumo textual equivalente para tecnologia assistiva.
- O CRM valida todos os papéis, vínculo ativo e exclusão lógica antes de resolver credenciais privilegiadas. Leitura fica restrita à gestão e escrita a `dev`/`admin`.
- O ping público do CRM expõe somente saúde agregada; diagnóstico detalhado exige papel `dev`; fragmentos de chave deixaram de ser registrados.
- O `expert-chat` valida vínculo ativo antes do processamento e restringe `clientId` a papéis de supervisão enquanto não houver vínculo canônico vendedor↔empresa.
- As rotas `/clientes` exigem `AdminRoute`. O painel do vendedor deixou de oferecer atalhos que terminavam em acesso negado.

## Estado canônico do banco

As migrations abaixo foram aplicadas atomicamente no projeto `cfmzkthhgliqelozlmwu` e registradas no ledger com o hash da allowlist:

| Versão | Finalidade | SHA-256 |
| --- | --- | --- |
| `20261015230500` | Reconciliação de telemetria, RLS e índices | `df24ac086477a0672a305a7eca6a08603e1594faf870053a25c6ba5271d31f75` |
| `20261015233500` | Remoção de privilégios herdados | `f2f495fca56a53597fa5d9f0aa63c0f47a7ecb05679453b7093abf2ffba99f04` |
| `20261015235000` | Consolidação da policy de leitura | `69848af7469db6e9fd360afea19db08ecf2dfdf45e83c3be10402c04502a5757` |

A inspeção remota confirmou RLS ativa, duas policies totais (inserção própria e leitura autorizada), cinco índices novos, zero `results_count` nulo, nenhuma permissão de `anon` e ausência de `UPDATE`/`DELETE` para `authenticated`. Uma transação de prova confirmou leitura da própria linha e rejeição de inserção atribuída a outro UUID; a transação foi revertida.

O advisor de performance deixou de apontar `search_analytics` após a consolidação. Permanece um aviso anterior em `pa_budgets`, fora das tabelas alteradas neste lote. O advisor de segurança reporta 146 avisos históricos: 145 funções `SECURITY DEFINER` executáveis por papéis públicos/autenticados e a proteção de senhas vazadas desativada. Esses avisos exigem auditoria individual dos contratos das funções e alteração de configuração do Auth; não foram ocultados nem tratados como prova de falha desta entrega.

## Evidências executadas

- Suíte Vitest integral: **508 arquivos aprovados**, 4 ignorados; **6.080 testes aprovados**, 68 ignorados.
- Testes focados de banco, segurança, paginação, tendências e UX: aprovados.
- Teste E2E do guard de `/tendencias`: aprovado sem sessão autenticada.
- TypeScript: zero diagnósticos.
- ESLint por baseline: zero erros e nenhuma regressão.
- Build de produção: aprovado.
- `deno check` das Edge Functions alteradas: aprovado.
- Validação de hashes da allowlist: aprovada.
- `git diff --check`: aprovado.

## Condições externas

O merge continua sujeito à aprovação humana obrigatória definida na proteção da branch `main`. A integração completa do CRM também depende de uma credencial válida do serviço externo no ambiente remoto. Essas condições não podem ser satisfeitas pelo código do repositório.
