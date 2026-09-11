# Checkpoint de execução local — 11/09/2026

Este registro separa o que foi demonstrado e testado localmente do que ainda depende dos ambientes Supabase, de responsáveis do negócio e de uso real. Ele não marca as 1.000 subetapas do plano como concluídas: a regra do projeto exige evidência, responsável, revisão, dependências e aceite específico para cada fechamento.

## Preview disponível

- Loja demonstrativa: `http://localhost:4178/loja-demo`.
- Painel demonstrativo: `http://localhost:4178/demonstracao`.
- Login real: `http://localhost:4178/login`.
- A loja e o painel demonstrativos existem somente em desenvolvimento e usam dados fictícios, declarados na própria interface.
- O build de produção exclui as rotas demonstrativas e o ativo com produtos fictícios. O hero conceitual permanece porque passou a compor a página real do catálogo e está identificado na interface.

## Experiência de loja aplicada ao catálogo real

- Vitrine responsiva com mensagem de valor, imagem conceitual e chamadas para catálogo e jornada de compra.
- Entrada por intenção de compra: boas-vindas, eventos, relacionamento e sustentabilidade.
- Busca principal ampliada para produto, ocasião, cor e faixa de preço.
- Histórico de buscas visível, reutilizável e limpável no cabeçalho do catálogo.
- Atalhos de orçamento unitário em quatro faixas, com ressalva explícita sobre personalização e quantidade.
- Trilhos horizontais com snap para intenção e orçamento no mobile, reduzindo a extensão vertical da vitrine.
- Cabeçalho do catálogo orientado à escolha e com contagem dinâmica de produtos.
- Cards com preço inicial, estoque, cores e ação sempre visível para adicionar ao orçamento.
- Grade com rolagem natural da página e carregamento progressivo por interseção.
- Jornada em quatro passos: escolher, personalizar, validar e acompanhar.
- Um único orçamento no cabeçalho; o segundo carrinho concorrente foi retirado.
- Linguagem visível alinhada a “orçamento”, “cooperativa” e “unidade”.
- Popovers limitados à largura do viewport e controles com nomes acessíveis.

## Identidade, privacidade e conteúdo

- Logo Sicoob servida localmente no login, cabeçalho móvel e barra lateral.
- Paleta principal em verde petróleo, verde Sicoob, verde claro e tons naturais.
- Ativos sintéticos sem marcas, pessoas, texto ou marca-d'água; proveniência em [ativos-imagegen.json](ativos-imagegen.json).
- Alegações de “catálogo oficial” e URLs provisórias removidas das telas alteradas.
- Portal privado com `noindex, nofollow`, `robots.txt` bloqueando rastreadores e sitemap provisório removido.

## Segurança e integridade implementadas localmente

- `migrate-helper` e `cleanup-novelties` desativadas com resposta 410, sem leitura de credenciais.
- Autorização compartilhada recusa papéis desconhecidos e exige papel técnico explícito.
- As 101 Edge Functions possuem categoria e enforcement no manifesto.
- Ponte do catálogo restringe origem, método, lote, operações e RPCs a leitura; custo e margem são removidos da resposta.
- Rotas de comprador, gestor, supervisor e desenvolvimento usam políticas explícitas e estados de carregamento seguros.
- Aprovação, rejeição e confirmação de pedidos usam RPCs transacionais com bloqueio, controle de versão, idempotência e escopo.
- Débito e estorno de verba foram simulados em PostgreSQL 17 descartável, inclusive sob concorrência.

## Evidências atuais

| Verificação | Resultado |
|---|---:|
| Testes críticos de sessão, rotas, pedidos, catálogo e SEO | 91/91 |
| Cenários de arquitetura e segurança | 82/82 |
| Testes focados de catálogo e cards | 35/35 |
| Edge Functions declaradas e verificadas | 101/101 |
| Viewports da demonstração | 6/6 |
| Erros de navegador na demonstração | 0 |
| Violações automatizadas WCAG na demonstração | 0 |
| Overflows horizontais em 1440, 390 e 320 px | 0 |
| Vulnerabilidades conhecidas pelo `npm audit` | 0 |
| Erros nos arquivos TypeScript alterados | 0 |
| Regressões de ESLint nos arquivos alterados | 0; 12 erros herdados removidos |
| Sintaxe dos workflows GitHub Actions | aprovada pelo `actionlint` |
| Maior chunk JavaScript bruto | 680,2 KB; abaixo do limite de 800 KB |
| Build de produção | aprovado |

Os registros detalhados estão em [evidencias](evidencias/), inclusive [resultado visual da loja](evidencias/visual/demo-resultado.json), [resultado visual do login](evidencias/visual/resultado.json), [rotas e permissões](evidencias/rotas-e-permissoes.json), [simulação de verba](evidencias/verba-atomica.json) e [auditoria pública da Promo Gifts](evidencias/promo-gifts-auditoria-publica.json).

## Benchmark Promo Gifts incorporado

A análise do produto concorrente e do repositório de referência está em [benchmark-promo-gifts-v4.md](../pesquisa/2026-09-11/benchmark-promo-gifts-v4.md). Ela combina inspeção pública em três larguras, código, CI, grafo Graphify e documentação primária. Histórico de busca, entrada por orçamento e navegação móvel compacta já foram incorporados; capacidades de maior dependência ficaram priorizadas no backlog P0/P1/P2 do estudo.

## Limites que impedem declarar 10/10 ou produção pronta

- O projeto Supabase do portal `cfmzkthhgliqelozlmwu` não está acessível pela identidade disponível; migrations, RLS, logs e funções ainda não foram confrontados nem aplicados no ambiente real.
- Os privilégios de leitura da identidade usada no catálogo `doufsxqlfjyuvxuezpln` precisam de confirmação administrativa na origem.
- Login, primeira solicitação, aprovação e compra precisam de smoke test com contas e dados de homologação válidos.
- Marca, políticas comerciais, alçadas e textos precisam do aceite dos responsáveis Sicoob e da cooperativa piloto.
- Acessibilidade automatizada não substitui teste por teclado, leitor de tela, zoom e participantes reais.
- Desempenho de laboratório e métricas de uso real ainda precisam ser medidos no domínio definitivo.
- A composição automática por rota eliminou os chunks circulares observados e reduziu o antigo bundle administrativo de 1,55 MB. Permanecem três avisos acima de 500 KB brutos (`icons`, `pdf` e busca por voz), todos abaixo do limite bloqueante de 800 KB; a próxima rodada deve medir e reduzir o efeito deles em aparelhos modestos.
- A varredura ampla do Vitest revelou dívida legada e coleta indevida de specs E2E/Deno no comando genérico. O gate crítico usado pela CI está verde, mas a suíte histórica integral ainda precisa de triagem por domínio antes de poder servir como gate único.

Essas dependências não anulam as correções locais. Elas delimitam com precisão o que ainda precisa de validação externa antes de qualquer publicação ou nota final.
