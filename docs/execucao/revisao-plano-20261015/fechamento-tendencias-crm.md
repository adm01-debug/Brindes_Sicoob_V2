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
- Vendedores e agentes consultam clientes de orçamento por uma operação dedicada `quote_directory`, com DTO e projeções fixas; a operação retorna somente empresas clientes ativas e contatos pertencentes à empresa selecionada.
- A consulta dedicada elimina enumeração de fornecedores, IDOR/BOLA entre empresas, projeções relacionais arbitrárias e o padrão N+1 de telefones/e-mails. Logs do bridge não registram filtros, payloads ou mensagens com PII.
- O seletor de cliente informa indisponibilidade e oferece nova tentativa sem apagar resultados locais válidos; a busca cobre razão social, nome fantasia e CNPJ.
- O construtor de orçamento restaura e salva todo o rascunho (cliente, contato, validade, margem, pagamento, entrega, frete, itens, observações e tags), bloqueia controles por teclado em modo somente leitura e não confunde `client_id` com `contact_id`.
- Tendências preservam o último snapshot autorizado durante atualização em segundo plano ou falha transitória. Risco de produto preserva fontes disponíveis e expõe nova tentativa quando uma fonte parcial falha.
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
| `20261015235500` | Compatibilidade segura de inserções legadas | `715570bc8424a073e6fb8d78bf7e4f364bb89c46f354241d2ef359fa91e5b3a4` |
| `20261016000000` | Certificação executável do contrato de telemetria | `1fe51b07889b172928733519a16c773f7e999ed079e4c389dc82168fbcb4f3bb` |

A inspeção remota confirmou PostgreSQL 17.6, RLS ativa, duas policies totais (inserção própria e leitura autorizada), cinco índices novos, zero `results_count` nulo, nenhuma permissão de `anon` e ausência de `UPDATE`/`DELETE` para `authenticated`. A migration de certificação verificou no próprio banco os atributos do trigger, `SECURITY INVOKER`, `search_path`, dependências das policies e ACL exata. Uma transação de prova confirmou leitura da própria linha, normalização de clientes legados, substituição de autoria forjada por `auth.uid()` e rejeição de anônimo; todas as linhas de prova foram revertidas.

O repositório possui **590 migrations**. O aplicador restrito confirmou todas as migrations autorizadas no ledger remoto e retornou `pending: []` após a aplicação.

O advisor de performance deixou de apontar `search_analytics` após a consolidação. Permanece um aviso anterior em `pa_budgets`, fora das tabelas alteradas neste lote. O advisor de segurança reporta 146 avisos históricos: 145 funções `SECURITY DEFINER` executáveis por papéis públicos/autenticados e a proteção de senhas vazadas desativada. Esses avisos exigem auditoria individual dos contratos das funções e alteração de configuração do Auth; não foram ocultados nem tratados como prova de falha desta entrega.

## Evidências executadas

- Suíte Vitest integral: **512 arquivos aprovados**, 4 ignorados; **6.116 testes aprovados**, 68 ignorados.
- Testes focados de banco, segurança, paginação, tendências e UX: **76 aprovados**.
- Testes Deno unitários alterados: **14 aprovados**; `deno check` das Edge Functions alteradas: aprovado.
- Simulação descartável em PostgreSQL 17: **13 invariantes aprovadas**, incluindo detecção de drift de trigger, função, policies e ACL.
- Teste E2E do guard de `/tendencias`: aprovado sem sessão autenticada.
- TypeScript: zero diagnósticos.
- ESLint por baseline: zero erros e nenhuma regressão.
- Build de produção: aprovado.
- Gate de dependências (`npm audit`), escopo de vendedor, rotas e orçamento de skips críticos: aprovado.
- Validação de hashes da allowlist: aprovada.
- `git diff --check`: aprovado.

## Edge Functions publicadas

O deploy individual evitou o limite do endpoint em lote sem criar funções novas. O ambiente remoto confirmou `ACTIVE` para `crm-db-bridge` v13, `expert-chat` v11 e `trends-insights` v8. O smoke test retornou HTTP 200 no ping agregado do CRM. A nova operação `quote_directory` recusou uma chamada sem sessão com HTTP 403, sem expor dados.

## Condições externas

O merge continua sujeito à aprovação humana obrigatória definida na proteção da branch `main`. Não havia usuário de teste autenticado no ambiente local para um smoke remoto completo do `quote_directory`; o contrato autenticado foi validado por testes automatizados e a barreira anônima foi confirmada no ambiente remoto. A disponibilidade de dados do CRM continua dependendo das credenciais do serviço externo configuradas no ambiente Supabase.
