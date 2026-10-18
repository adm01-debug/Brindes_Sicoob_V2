# Execução e validação do lote de segurança e concorrência — 18/10/2026

## Resultado

Este lote implementa correções verificáveis identificadas na auditoria do plano: isolamento dos relatórios agendados por proprietário, controle otimista de concorrência nos kits, sincronização monotônica de notificações entre abas, preservação do orçamento durante carregamento de sugestões BI, tratamento de falhas nos filtros de catálogo, remoção de uma projeção sazonal sem base cronológica, hardening dos endpoints públicos de saúde/compartilhamento e restrição de ACLs no log de bloqueios e na view de uso de taxonomia.

O lote não conclui o plano integral de 100 etapas. A ingestão de documentos ainda depende de scanner antimalware real e credenciais dedicadas; a publicação Realtime e os fluxos autenticados continuam pendentes de homologação conectada. Não há evidência para declarar o produto pronto para produção.

## Alterações e evidências

| Frente | Implementação | Verificação |
|---|---|---|
| Relatórios agendados | Queries de orçamento e pedidos agora filtram `seller_id` pelo `user_id` dono do relatório; IDs ausentes e erros de consulta falham explicitamente. | Testes unitários de escopo e `deno check` passaram. |
| Kits | Salvamentos comparam `updated_at`; gravação concorrente retorna conflito em vez de sobrescrever outra aba. A nova versão retornada pelo banco passa a ser a base do próximo salvamento. | 20 testes focados passaram; sem mudança de schema. |
| Notificações | Atualizações de leitura são limitadas ao usuário e a linhas ainda não lidas; `BroadcastChannel` propaga confirmações e consultas antigas preservam leituras confirmadas. | Testes focados de notificações passaram. |
| BI e catálogo | A carga de sugestões não substitui campos que o usuário já editou; falhas relacionais mantêm resultados anteriores e mostram erro; a previsão sazonal deixa de aplicar regressão a agregados mensais sem série temporal. | 21 testes focados passaram; ESLint sem erros nos arquivos tocados. |
| Edge | `health-check` expõe apenas liveness; `bi-share-dossier` exige `BI_SHARE_SECRET` e não usa a chave de serviço como fallback nem devolve detalhes internos. | 3 testes de contrato, `deno check` e cenários de segurança passaram. |
| ACL de banco | Nova migration restringe INSERT de `access_blocked_log` a `service_role` e remove DML de `catalog_marketing_term_usage`, preservando leitura autorizada. | Simulação Supabase PostgreSQL 17 passou em 13 cenários; cenário Node passou em 3 testes. Nenhuma escrita no banco canônico. |

## Validação integrada

- Vitest completo: **6.260 aprovados, 67 ignorados; 542 arquivos aprovados e 4 ignorados**.
- Typecheck: **0 erros e nenhuma regressão** sobre baseline.
- ESLint baseline: **0 erros globais e nenhuma regressão** nos 220 arquivos de aplicação examinados.
- Contratos Node: **32/32 aprovados**.
- Imutabilidade das migrations: aprovada.
- `check-runtime-refs`: 0 referências quebradas fora da allowlist; três objetos previstos continuam ausentes do snapshot remoto por dependerem das migrations pendentes já autorizadas.
- Build Vite concluiu após transformar 6.233 módulos. No build padrão, a verificação equivalente ao workflow confirmou que nem a rota textual nem a imagem demonstrativa entram em `dist`; no build QA com `VITE_ENABLE_DEMO_PAGES=true`, a imagem foi emitida em `demo-assets/produtos-grid-v1.webp`. Typecheck e ESLint dos arquivos desse ajuste passaram; permanecem avisos preexistentes de divisão de chunks e tamanho de função.
- `apply-sicoob-migrations.mjs --check` não executou nesta worktree porque `SUPABASE_DB_URL` não está no ambiente. A consulta MCP de leitura ao banco canônico confirmou cinco migrations autorizadas pendentes: `20261016180000`, `20261016190000`, `20261016193000`, `20261016201500` e `20261018131850`. Nenhuma migration foi aplicada remotamente.
- A jornada E2E autenticada continua sem certificação: faltam credenciais de persona de teste nesta execução.

## Follow-up do CI

O primeiro workflow do GitHub expôs que o Vite emitia a imagem fictícia como ativo órfão mesmo removendo a rota de demonstração do JavaScript. O `vite.config.ts` agora serve/emite esse arquivo apenas em desenvolvimento ou quando `VITE_ENABLE_DEMO_PAGES=true`; a página de demonstração usa a rota dedicada servida pelo plugin. A verificação local do artefato padrão passou e a variante de QA manteve a imagem. No SHA `0a6ae82657bde68471a98e66c430e4ee8962b384`, Segurança, contratos e build, Portal Sicoob, segurança, bundle, Lighthouse, CodeQL e preview da Vercel passaram; o E2E ainda estava em execução. As correções de revisão abaixo precisam de CI próprio no próximo SHA.

## Correções de revisão pendentes de CI — 18/10/2026

A revisão automática da PR #119 apontou oito problemas de comportamento iniciais. Em revisões posteriores surgiram dois P2 de ciclo de vida e um P1 nos seletores do carrinho; as três correções locais seguem para CI no próximo SHA. Nenhuma dessas mudanças equivale a aprovação humana ou checks verdes.

| Achado | Correção | Evidência local |
|---|---|---|
| Compradores `gerente_pa` e `comprador_pac` recebiam 403 no diretório necessário ao orçamento. | O acesso segue negado até existir vínculo verificável por PA/cooperativa: o CRM bridge hoje pode listar qualquer empresa cliente e seus contatos/canais pessoais. Só `vendedor`/`agente` mantêm o DTO fechado; consulta genérica segue negada. | Testes negativos para os dois papéis compradores, testes positivos do contrato fechado para vendedor/agente e inspeção das queries do bridge. |
| Seletor de cliente em favoritos/coleções/comparação ainda usava `selectCrm` e `searchCrm`, bloqueados para vendedor. | O componente agora usa o diretório fechado `quote_directory` para listagem e busca, preservando o bloqueio das consultas genéricas, sem solicitar dados de contato e particionando cache por usuário/papéis. | Teste do seletor verifica a chamada de diretório e garante que as operações genéricas não são usadas. |
| Filtro de embalagem comercial sempre retornava vazio. | Incluído `has_commercial_packaging` nas duas projeções lightweight. | Confirmação read-only da coluna booleana em `public.products` no projeto de catálogo `doufsxqlfjyuvxuezpln`; teste do seletor e mapper. |
| Imagens privadas do catálogo eram enviadas ao navegador como esquema não suportado. | O card assina referências duráveis ou URLs legadas apenas do host canônico; não cria `srcSet` para CDN sem variantes, ignora eventos obsoletos e não faz prefetch de referências privadas. | Testes do card cobrem URL assinada, CDN externa, host hostil, falha, assinatura concorrente, erro obsoleto e prefetch. |
| As duas interfaces de chat podiam exceder o contrato de `expert-chat` (30 mensagens, 30 mil caracteres totais e 5 mil por mensagem). | Um utilitário puro compartilhado poda `AIChat` e `useExpertChat`, preservando a pergunta mais recente dentro do limite. | Testes de limites exatos, UTF-16/emoji, janela longa, total e pergunta atual. |
| Sugestão do BI preenchia `client_id`, mas não os dados comerciais da empresa. | O seletor hidrata `companyInfo` pelo diretório restrito quando a consulta por ID confirma a empresa selecionada. | Teste de hidratação assíncrona sem seleção manual. |
| Salvamento bem-sucedido do orçamento era interceptado pelo guarda de alterações não salvas e aceitava mudanças concorrentes durante `await`. | O estado é marcado limpo antes da navegação; campos e ações ficam bloqueados desde o início da verificação de verba até o salvamento terminar. | Testes da ordem entre limpeza e navegação e da regra de edição durante salvamento. |
| CLI de preflight ainda usava POST e esperava `healthy`, contrato removido do health-check público. | O script usa GET, espera `status: ok`, falha fechado, aplica timeout, aceita `SUPABASE_*` e `VITE_SUPABASE_*` e trata chave como opcional (`apikey`, sem bearer); manifest e `config.toml` declaram `verify_jwt=false`. A Edge declara CORS para GET/HEAD/OPTIONS. | 9 casos de contrato e smoke subprocesso contra servidor HTTP local: `.env`, GET, chamada sem chave, resposta válida, timeout e exit 0. A função confirma liveness pública, não prontidão de banco/autenticação. |
| O autosave da cotação era desativado enquanto a operação de salvar bloqueava os controles. Em falha, reativar o componente podia restaurar um rascunho local antigo sobre os dados atuais. | O componente usa `canPersistDraft`, que continua ligado durante o bloqueio transitório do save, mas respeita status comercial e versão vigente; os controles continuam usando `canEdit`. | Teste cobre que durante `saving` a edição fica bloqueada e a persistência permanece ativa; teste existente mantém a regra de não persistir cotações somente leitura. |
| Cancelamento ou erro de leitura do stream de IA não executava `TransformStream.flush`, deixando a reserva de cota em `pending`. | O wrapper finaliza o log uma só vez em EOF, erro, cancelamento e resposta sem corpo; preserva uso parcial, inicia cancelamento upstream junto à gravação e remove cabeçalhos de transporte incompatíveis com o corpo encapsulado. | 7 testes Deno cobrem extração, EOF, uso parcial no cancelamento, falha upstream, leitura pendente cancelada, resposta sem corpo e finalização única. |
| Seletor do carrinho ainda consultava CRM genérico, bloqueado para vendedores, impedindo criar o primeiro carrinho em `/carrinhos` e nos fluxos de inclusão rápida. | Ambos os pickers consultam `quote_directory` em páginas limitadas pelo contrato do bridge; cache React Query e listas locais de recentes/favoritas são particionados por usuário e papéis. | Teste verifica paginação e IDs preservados pelo DTO restrito; teste de segurança confirma escopo de identidade em cache e storage e ausência de `selectCrm`/`searchCrm`. |

O comparador do ledger também foi corrigido: arrays `statements` nulos/vazios/inválidos agora significam `conteudo_nao_verificado`, em vez de calcular o hash do SQL vazio e indicar divergência falsa. O cenário inclui regressões para arrays vazios, strings em branco, valores inválidos e SQL/marcador válidos.

Validação focada anterior: **96 testes aprovados em 12 arquivos**, incluindo regressões para o seletor de clientes em favoritos e para o seletor de produtos durante salvamento; cenários Node **7/7**, gate de autorização Edge **106/106** e lint focado sem erros (avisos de complexidade existentes). A ação de adicionar também consulta uma trava síncrona, cobrindo callbacks já iniciados antes do rerender. Esta continuação acrescentou as duas regressões P2 da tabela e passou a bateria focada abaixo.

Na última consulta, os checks do SHA `0a6ae826…` estavam verdes exceto o E2E ainda em execução. A PR continuava aberta, sem revisão `APPROVED`. Uma consulta posterior encontrou 10 threads abertas (9 atuais e 1 obsoleta): correções aguardam confirmação do CI; o P1 de escopo do diretório permanece intencionalmente aberto. Revalidar checks e revisão na cabeça mais recente; não aplicar as cinco migrations até integração aprovada.

### Revalidação integrada desta continuação

- Vitest completo no código desta continuação: **6.291 aprovados e 67 ignorados; 547 arquivos aprovados e 4 ignorados**.
- Vitest focado para estado da cotação e `QuoteAutoSave`: **9/9**; testes de stream de IA em Deno: **7/7**.
- `npm run typecheck`, `npm run lint:baseline` (0 erros globais e nenhuma regressão em 231 arquivos de aplicação analisados), `git diff --check` e build Vite passaram.
- O build foi concluído com as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` ausentes no ambiente local e avisos existentes de chunk grande/divisão; isso não valida configuração de deploy. `deno fmt --check` passou no novo teste; no módulo preexistente `ai-usage.ts`, o Deno formatter aponta formatação histórica fora do padrão e sua aplicação integral causaria churn não relacionado.
- Revisão paralela confirmou o P1 de escopo do diretório de clientes e os dois novos P2 tratados acima. Permanecem gaps menores de evidência: não há teste que dispare callback antigo de adicionar produto durante um `await` real de salvamento, embora a trava síncrona impeça a mutação; falta um teste dedicado para evento de imagem `load` atrasado (o handler tem a mesma guarda de origem do evento `error`); e a falha de save ainda não é simulada por teste integrado do `QuoteAutoSave` com fake timers.
- A consulta pública ao endpoint segue sem resposta nesta sessão e não existe credencial E2E autenticada local. Não foi executado deploy nem aplicada migration canônica nesta continuação.

A chamada HTTP pública ao health-check canônico não respondeu dentro de 10 segundos nesta sessão; portanto não há evidência de reachability remota nem do estado implantado do gateway. O contrato local está coerente, mas a configuração precisa ser confirmada pelo CI/deploy antes de usar o endpoint como sinal operacional.

O código desta continuação ainda precisa ser commitado e enviado para produzir um novo SHA de CI. Na cabeça remota consultada antes do fix do carrinho, o PR #119 continuava aberto, bloqueado por checks em andamento, sem aprovação humana e com 11 threads abertas (9 atuais e 2 obsoletas). O P1 dos compradores no diretório com dados de contato permanece aberto por decisão de segurança; não aplicar migrations nem fazer merge até obter escopo adequado, revisão e checks exigidos.

## Coordenação

Cinco agentes especializados cobriram as pendências da matriz, ledger/migrations, checks da PR e revisão cruzada das correções de catálogo, chat, preflight e orçamento. O merge continua condicionado aos checks obrigatórios do GitHub, revisão humana requerida e threads resolvidas; não se deve contornar os gates nem aplicar as migrations canônicas antes da integração aprovada.
