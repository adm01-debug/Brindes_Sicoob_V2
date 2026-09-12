# Auditoria documental B — portal de compras Sicoob

Data: 11/09/2026. Base de trabalho: commit `d75459d28`, registrado no inventário, em worktree isolado. Escopo: os 81 arquivos de `analise-local/documentos-repo-2.json`, precedidos da leitura de `README.md` e `docs/SCOPE_ALIGNMENT.md`, com conferência seletiva do código que sustenta os achados. Não houve alteração de código, git ou dados de produção neste lote.

A base existente contém componentes reutilizáveis e uma quantidade relevante de documentação, mas os próprios documentos misturam produto de vendas Promo Brindes, plano de portal Sicoob e declarações de conclusão sem comprovação. As maiores prioridades são autorização de aprovação, restrição do catálogo a somente consulta e coerência do domínio cooperativa/PA/verba. Os relatórios antigos de nota máxima não servem como critério de aceite.

## Método e limites de cobertura

Foram processados quatro lotes lógicos de 22, 22, 22 e 15 arquivos. Todos os textos foram lidos, PDFs tiveram extração integral com `pdftotext -layout`, e versões quase iguais foram verificadas por comparação integral do texto normalizado e leitura das diferenças. Linhas tabulares idênticas foram agrupadas durante a leitura sem descartar nomes de tabelas ou diferenças. Duplicatas binárias foram confirmadas por SHA-256. Os dois PNGs são idênticos e tiveram uma inspeção visual representativa; o SVG foi lido e renderizado para inspeção visual. PDF não é contado como ensaio independente apenas por ter uma apresentação exportada.

O inventário `cobertura-b.json` registra caminho absoluto, hash, número de linhas extraídas, método e avaliação individual. `semantica-repo-b.json` contém um nó documental para cada arquivo, conceitos e relações com proveniência. O grafo distingue extração de afirmações do documento de inferências sobre dependências; não certifica que a afirmação documental seja verdadeira em produção. Não houve medição de tokens por arquivo; zeros de formato nos fragmentos não representam medida de uso.

Esta revisão não consultou bancos, executou RPCs, iniciou pedidos, enviou mensagens nem rodou testes de integração. Uma migração no repositório comprova a configuração declarada; não comprova que esteja implantada. A ausência de algo no conjunto pesquisado significa ausência de evidência encontrada, não impossibilidade absoluta de existir em outro sistema.

A auditoria operacional registrou uma chamada POST com operação de leitura ao bridge no ambiente atual: HTTP 200, `_unconfigured: true`, `count: 0`. Isso é consistente com o caminho de fallback do código e impede tratar a resposta como catálogo efetivamente conectado. Também informou que o CI remoto não iniciou por orçamento do GitHub Actions; esse evento não deve ser atribuído a defeito de código. Resultados de build, typecheck e inspeção live pertencem ao relatório principal.

## Achados prioritários com evidência

### D01 — P0: aprovação privilegiada sem autorização de negócio no corpo da RPC

**Evidência no repositório.** `supabase/migrations/20260503220418_7d0d76d8-3b54-4554-aaea-6750ed654c77.sql:61` define `approve_sicoob_order(p_request_id, p_order_id, p_manager_id)` e, nas linhas 69–83, atualiza requisição e pedido separadamente pelos IDs recebidos. O aprovador também vem do parâmetro. A linha 98 declara `SECURITY DEFINER`. A função de rejeição repete o padrão nas linhas 101–138. Não há validação interna de `auth.uid()`, papel, cooperativa, PA, vínculo requisição/pedido, estado anterior ou saldo. A migração `20260503220434_8a8e4aab-5194-480c-a47a-a1d0ddf67871.sql:2` somente fixa `search_path`.

`supabase/migrations/20260504135425_5d8d01fd-8d33-42a5-9b11-c14d5326f1e7.sql:34` inclui ambas na lista de funções destinadas a `authenticated`; a linha 49 declara o `GRANT EXECUTE`. A busca por esses nomes não encontrou substituição posterior do corpo que acrescente as verificações. `src/services/sicoob/approvalService.ts:25` passa o ID do usuário do cliente, mas isso não impede outro chamador de fornecer parâmetros diferentes.

**Implicação.** Se esses corpos e privilégios estiverem implantados, a autenticação isolada é insuficiente para limitar quem aprova, de qual cooperativa é o pedido e quem consta no log. O uso de transação é positivo, porém atomicidade não é autorização. É um risco estático prioritário, não relato de exploração executada.

**Contradição documental.** `docs/security/RLS_MATRIX.md`, seção de cenários de permissão, e `docs/audits/DOSSIA_AUDITORIA_ENTERPRISE_V5.md`, matriz RLS, não cobrem essa lógica privilegiada com duas cooperativas. Testar apenas se RLS está habilitado nas tabelas não testa a função `SECURITY DEFINER`.

**Critério para corrigir depois.** Derivar ator de `auth.uid()` no servidor; comprovar vínculo ativo e poder de aprovação na organização; carregar a requisição e obter dela o pedido; validar transição e versão; tratar verba com bloqueio/transação e idempotência; registrar auditoria no mesmo commit. Ensaiar negativa entre duas cooperativas, dois PAs, usuário sem alçada, identidade de aprovador forjada, requisição e pedido incompatíveis e repetição concorrente. Conferir definições e ACLs realmente implantadas antes de declarar o risco removido.

### D02 — P0: o bridge externo permite escrita em produtos, contrariando somente consulta

**Evidência.** `supabase/functions/_shared/external-db-config.ts:20` descreve produtos como CRUD completo. `PRODUCT_TABLES`, linhas 21–78, inclui produtos, categorias, fornecedores, imagens, tabelas de preço e movimentos de estoque. `PERMISSIONS.products`, linhas 141–145, permite `select`, `insert`, `update`, `delete`, `upsert` e `batch_insert`; empresas e views são somente leitura. As RPCs permitidas nas linhas 8–18 incluem nomes de vínculo e preenchimento de áreas de impressão, cujo efeito real remoto não foi inspecionado.

`supabase/functions/external-db-bridge/index.ts:837` consulta essas permissões e as linhas 841–846 admitem escrita para `admin`, `gerente` e `vendedor`, limitando apenas delete para vendedor. Há handlers reais de inserção, atualização, exclusão e upsert nas linhas 1309, 1341, 1387 e 1421; nas linhas 1284 e 1374 há atualização de `products.personalization_areas`. O cliente externo usa credencial `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`, linhas 1616 e 1632–1637. Não foram lidos ou expostos valores de segredos.

O trecho 781–820 permite seleção anônima em tabelas de produto não sensíveis. O seletor leve padrão, linha 1690, inclui `cost_price`, `supplier_reference` e `supplier_id`. A classificação de tabelas sensíveis não inclui produtos. Isso exige decidir quais colunas são comerciais públicas; o caminho estático não prova que esses valores estejam atualmente disponíveis no endpoint vivo. O fallback das linhas 1638–1650 devolve sucesso com lista vazia e `_unconfigured` quando falta configuração, comportamento observado na auditoria operacional.

**Contradição documental.** `docs/adr/0001-ssot-external-db.md` e `docs/adr/0007-three-database-architecture.md` defendem fonte única externa, mas assumem três bancos e CRM; `docs/HOOKS_USAGE_GUIDE.md` e `docs/02_INTEGRACAO_FRONTEND_REACT.md` ensinam criação/edição de produtos. A instrução atual do usuário é mais restrita: catálogo `doufsxqlfjyuvxuezpln` apenas consulta; dados próprios do portal em `cfmzkthhgliqelozlmwu`.

**Reaproveitamento.** Preservar os adaptadores, cache, batching e tratamento de indisponibilidade que forem úteis. Substituir o contrato do portal por leitura explícita com tabelas e colunas permitidas, credencial de privilégio mínimo no servidor e nenhuma RPC mutante. Snapshot de preço e identificação no item de pedido é histórico transacional do portal; não deve se tornar um segundo cadastro mestre de produto. Falta de configuração deve ser observável como indisponibilidade, e não aparecer para comprador como estoque vazio.

### D03 — P1: relatórios automatizados atribuem métricas e validações sem ensaio correspondente

**Evidência reproduzível por leitura.** `scripts/enterprise-dossier-builder.mjs:65` inicia o cálculo de cobertura. A linha 72 define `98.2%` e a 73 marca `isReal=false`; a linha 78 usa `summary.total?.lines?.pct || 98.2`, que inclusive transforma valor zero em 98,2. Contar componentes e arquivos de teste não mede cobertura.

Nas linhas 112–119, `relrowsecurity` vira `PASSED` e `Row Isolation`; a migração associada é simplesmente o primeiro arquivo encontrado com `ENABLE ROW LEVEL SECURITY`, sem vínculo por tabela. Nas linhas 122–137, estados como mitigado, implementado e validado são valores fixos. A linha 182 sempre escreve integridade RLS de 100%, inclusive sem demonstrar testes comportamentais. Na linha 199, um hash Git vira “Último Deploy”; na 201, “Verified by Lovable SHA-256” é texto fixo. O repositório de fallback na linha 8 é `promo-gifts/app`.

`public/reports/AUDIT_REPORT_892fa9f31.md:26` explicita “Métricas Reais: ❌”, mas a linha 27 conserva 98,2%, a 30 declara RLS 100% e as linhas 37–40 marcam validado com links inválidos. As linhas 48–218 repetem a mesma referência de migração para 171 tabelas; a seção posterior registra os erros 404. Várias versões só alteram metadados e contagens. `public/AUDIT_ENTERPRISE_FINAL.pdf` é binariamente idêntico ao PDF `20a6b98b1`.

`docs/audits/AUDITORIA_ENTERPRISE_FINAL.md:5` atribui 10/10; a linha 10 usa segurança de nível bancário, enquanto MFA, blockchain e internacionalização aparecem concluídos no fechamento. `docs/audits/FINAL_ENTERPRISE_AUDIT_REPORT.md`, checklist de governança, ainda deixa blockchain pendente. `docs/AUTH_PASSKEYS.md:7` registra validação de servidor ausente; `docs/CONFIGURACAO_LOCALE_PT_BR.md` diz pt-BR/BRL exclusivos. Os PDFs não constituem certificado independente.

**Ação documental necessária.** Tratar relatórios como registros históricos de autoavaliação, retirar seu uso como selo de segurança e exigir artefato de execução, comando, commit, ambiente, timestamp, denominador e limitações para cada número. Diferenciar “controle descrito”, “implementação localizada”, “teste passou” e “funcionando com tráfego”. Não usar o mesmo gerador para atestar a correção dele próprio sem revisão dos resultados.

### D04 — P1: a carteira de PA usa contratos de dados incompatíveis

`src/services/sicoob/budgetService.ts:5` consulta `sicoob_budgets`; a busca em migrações e tipos gerados não encontrou definição dessa tabela. Nas linhas 19–24 o filtro é por `pa_id`, sem competência explícita. O serviço usa `used_amount`, enquanto `src/pages/sicoob/PAWalletPage.tsx:76` usa `verba_consumida`/`verba_total`, e as linhas 100 e 111 usam `monthly_limit`/`current_spent`. A linha 89 fixa “Maio, 2026”. A mesma tela atravessa contratos distintos e não destaca erro da consulta na desestruturação do hook.

Há `cooperativa_budgets` e `pa_budgets` na migração `20260502143127_cebe731a-273c-4205-8836-c8819504e437.sql:21`, outra definição de `pa_budgets` em `20260503000000_sicoob_rbac_infrastructure.sql`, `singulares` em `20260503172408_b6bcb7cb-1200-49a2-b9b0-dc21b8b22cce.sql:16` e `pontos_atendimento` em `20260503175512_115f0a9c-0f07-4475-8cb2-753fe80adc2e.sql:44`, enquanto serviços usam `postos_atendimento`. `docs/architecture/ER_DIAGRAM.md:22` representa orçamento de PA em relação um-para-um, insuficiente para múltiplas competências históricas, e usa nomenclatura distinta.

Isso não prova ausência da tabela em produção; demonstra que serviço, tela e esquema versionado não estabelecem um contrato verificável. A decisão necessária é um único domínio de organização, PA, orçamento por competência, reservas, consumo, estorno e trilha. Valores de tela devem vir desse contrato, com tratamento de erro e concorrência; não se deve tentar reconciliar nomes apenas por substituição textual.

### D05 — P1: papéis e estados não formam um fluxo Sicoob único

`docs/02_INTEGRACAO_FRONTEND_REACT.md` usa owner/admin/member; `docs/security/RLS_MATRIX.md` usa vendedor, admin e supervisor; `docs/SCOPE_ALIGNMENT.md` propõe admin, gestor_compras, gerente_pa e vendedor; `docs/architecture/ER_DIAGRAM.md` descreve outros papéis. `src/services/sicoob/orderService.ts:51` testa `gestor_pa` e a linha 53 testa `gestor_singular`, sem correspondência uniforme com a taxonomia restante. O contexto `AuthContext` tem `roles` e `isLoading`; o principal identificou consumo de `userRoles` e `loading` em `SicoobRoute`. Essa divergência é concreta, não apenas uma questão de nomenclatura editorial.

`docs/CASOS_TESTE_E2E_POR_PAPEL.md`, GP02 e GC01, espera `enviado_gestor` e aprovação em massa para `aprovado_gestor`; o documento contém “... mais casos”. `src/pages/sicoob/GestorApprovalsPage.tsx:26` e `:40` executa aprovação/rejeição individual e usa confirm/prompt. A função `bulkApproveOrders` em `src/services/sicoob/orderService.ts:200` chama atualização para `confirmed`, enquanto as RPCs usam `approved`. A auditoria das linhas 137–150 do serviço é melhor esforço no cliente e não substitui a transação do servidor.

A matriz RLS declara criação de `orders` por vendedor, mas `tests/rls/README.md` descreve bloqueio por trigger. Os dois documentos podem estar descrevendo fases distintas; não há justificativa de versão que reconcilie a diferença. Antes de ampliar telas, consolidar permissões e transições, distinguindo requisição, aprovação de verba, aprovação de arte, pedido ao fornecedor, produção, expedição e recebimento. Validar isolamento entre cooperativas mesmo quando os usuários possuem o mesmo papel.

### D06 — P1: passkey anuncia autenticação sem concluir sessão verificável

`docs/AUTH_PASSKEYS.md:7` admite ausência de verificação no servidor. `src/hooks/useWebAuthn.ts:42` gera challenge no cliente, a partir da linha 147 cria credencial e na 162 grava dados. No login, linhas 226–265, obtém credencial do navegador, procura seu ID, incrementa contador e retorna sucesso sem verificação de assinatura/challenge em backend nem criação de sessão Supabase. `src/components/auth/PasskeyLogin.tsx:25` aciona esse fluxo. `src/pages/Auth.tsx:425` ignora o ID recebido, apresenta “Autenticado com sucesso via passkey!” na linha 428 e navega à raiz.

A constatação é de autenticação incompleta e mensagem falsa de sucesso. Não foi demonstrado contorno de RLS ou sessão Supabase autenticada por esse caminho. O escopo Sicoob já exclui WebAuthn; retirar a promessa da jornada até implementar verificação real é uma decisão coerente com o documento. Existe fluxo de MFA em `AdminRoute.tsx:56`; por isso não se afirma que todo MFA esteja ausente apenas porque relatórios antigos divergem.

### D07 — P1: documentação de segurança não delimita organização, exposição e operação

RLS habilitado, validação Zod e filtro `organization_id` no React são controles diferentes. Nenhum isoladamente comprova isolamento entre cooperativas. Os testes documentados cobrem essencialmente anônimo, vendedor e administrador, sem adversários em duas cooperativas, acesso cruzado a anexos/links públicos ou execução das RPCs privilegiadas. URLs públicas de storage para bucket privado, mencionadas em `.lovable/memory/security/production-hardening-baseline.md`, não tornam o objeto público por si só; podem simplesmente resultar em mídia quebrada. A autorização do bucket precisa de prova própria.

`docs/AUDIT_FRONTEND_DATABASE.md` é útil por admitir acesso MCP negado e análise baseada em migrações, mas identifica outro projeto Supabase (`nmojwpihnslkssljowjh`). Não é um laudo do `cfm…`. Alguns achados antigos envelheceram: a policy aberta em `order_items` é explicitamente removida nas migrações `20260306013723_8ea96e6d-f69b-4bc3-80bc-109377e45a2d.sql:23` e `20260513171226_af89fa27-f5a5-4845-aa17-6924cde069a2.sql:2`. A existência histórica de uma policy permissiva não prova presença atual; também não se pode declarar todas as demais corrigidas sem rastrear a política implantada.

Há compromissos operacionais conflitantes: `docs/RUNBOOK.md`, rotina de logs, menciona exclusão após 90 dias; o baseline menciona 365 dias e relatórios propõem 24 meses em armazenamento frio. `docs/SECURITY.md` menciona rotação em 90 dias; `docs/SECURITY_PLAN.md` fala em seis meses. Prazos de comunicação de vulnerabilidades, resposta a incidentes e SLO são conceitos distintos e não devem ser fundidos. LGPD requer mapeamento de dados, finalidade e responsabilidades; uma referência genérica a GDPR não estabelece conformidade jurídica.

### D08 — P2: identidade e acessibilidade são parcialmente documentadas, não validadas

Os PNGs `public/images/promo-brindes-logo-v2.png` e `src/assets/logo-promobrindes.png` são idênticos: marca manuscrita Promo Brindes com desenho de presente. São marca do fornecedor, não evidência de identidade Sicoob. `public/placeholder.svg` é um fallback cinza genérico, visto após renderização. O sistema de tokens e tema Sicoob existente é uma base aproveitável; a escolha final de cores, versões de logo e usos exige a documentação oficial que a pesquisa principal analisa.

`docs/DARK_MODE.md`, `docs/MOBILE.md` e `docs/SKINS_INVENTORY.md` usam expressões de cobertura completa sem anexar resultados suficientes. `docs/ACCESSIBILITY.md` é um bom guia de critérios WCAG, não uma certificação. Na página de aprovações, botões de ícone nas linhas 149 e 157 não apresentam rótulos acessíveis explícitos no trecho inspecionado; confirm/prompt também limita orientação e contexto. Tamanho de toque, foco, contraste, tabela mobile e leitura de estado precisam ser avaliados na jornada completa, não presumidos a partir de biblioteca de componentes.

### D09 — P1: notificações registram sucesso de canal sem entrega

`docs/NOTIFICATION_SYSTEM.md` afirma núcleo 100% e apresenta canais in-app, email, push, SMS e WhatsApp, misturando implementação e estrutura futura. Em `supabase/functions/send-notification/index.ts:29`, o cliente é criado com service role. O corpo lido da função não autentica o chamador nem deriva dele o `user_id` recebido. A exposição efetiva depende da configuração de JWT implantada; o exemplo do documento recomenda deploy com `--no-verify-jwt`, que não é prova de que tenha ocorrido.

As linhas 100–114 inserem `workspace_notifications`. As linhas 118–124 gravam `channel: 'push'`, `status: 'success'`, `execution_time_ms: 0`, sem chamada de entrega push. Há estruturas de agendamento e digest, mas isso não comprova envio externo. O horário de silêncio usa hora do servidor sem fuso do usuário explicitado. Já `src/services/sicoob/orderService.ts:158` endereça email ao ator atual, e a linha 175 grava na tabela `notifications`, uma segunda representação. É necessário especificar destinatário de cada evento e evitar sucesso fictício: criado, enfileirado, enviado, entregue e falhou são estados diferentes.

### D10 — P2: duas visões de produto competem pela mesma fonte de verdade

O README vende plataforma de produtividade comercial Promo Brindes, CRM Bitrix, papéis de vendedor e notas de segurança. `docs/SCOPE_ALIGNMENT.md` diz Sicoob greenfield, exclui Bitrix/109 tabelas externas/gamificação/IP/WebAuthn, prevê hierarquia e logística, mas termina falando em experiência do vendedor. Os ADRs de três bancos e o inventário dual continuam defendendo dependências excluídas. A instrução atual do usuário fixa comprador de cooperativa como público e dois bancos com catálogo somente consulta; ela é o ponto de decisão, sem apagar automaticamente ativos reutilizáveis.

O produto deveria documentar um vocabulário canônico, a decisão de arquitetura vigente, mapa de jornadas e matriz de comprovação por funcionalidade. Inventários legados ficam preservados como referências históricas datadas. Convém separar marca do portal e marca do fornecedor, histórico de implementação e estado operacional, orçamento comercial e verba institucional. Há também contradições de processo: `CONTRIBUTING.md:13` instrui branch por checkout direto, enquanto `AGENTS.md` exige worktree. Nesta revisão foi respeitado o worktree isolado de análise.

### D11 — P2: a existência de testes e automações é confundida com cobertura real

`.github/workflows/ci.yml` tem typecheck por baseline e instalação Bun sem fixação equivalente a prova reprodutível por si só. Os workflows de auditoria de desempenho, Lighthouse e Gitleaks são bases úteis. O sentinela de branch atua após push e verifica padrões de mensagem; não demonstra proteção preventiva remota. O orçamento do GitHub Actions bloqueando execução, registrado na auditoria operacional, é uma condição operacional distinta dos resultados de compilação local.

`e2e/README.md` informa skips sem credenciais e que orçamento abre o construtor sem criar pedido; `e2e/routes/README.md` usa mocks de rede. `docs/E2E_SMOKE_COVERAGE.md` apresenta 85% sem denominador rastreável. `docs/CASOS_TESTE_E2E_POR_PAPEL.md` e `docs/FIXTURES_E2E_POR_PAPEL.md` têm placeholders. `docs/testing/CONTRACT_TESTS_PACT.md` é roteiro futuro, e `infra/README.md` descreve migração futura para Terraform. São materiais úteis, mas não demonstram pedido atravessando produção e logística.

`docs/PERFORMANCE_AUDIT.md` não anexa execução suficiente para os percentis apresentados; `docs/SLO.md` define metas, não resultados. Contar status HTTP abaixo de 500 pode considerar uma compra bloqueada por autorização como operação saudável. Além de latência e disponibilidade, medir sucesso de consulta do catálogo, submissão de requisição, decisão de aprovação, atualização de verba e rastreio de entrega com correlação entre etapas.

### D12 — oportunidade: preservar fundamentos úteis, reduzir contexto legado

Coleções, favoritos, variantes, galeria, especificação de personalização, filtros, componentes de tabela, layout responsivo, exportação, cache e o adaptador de banco externo podem encurtar o caminho. `.lovable/memory/features/collections-public-share-system.md` oferece colaboração por link e feedback, hipótese relevante para marketing. A validade do token e seus campos precisam ser verificados antes de compartilhar preço, custo ou dados de organização. `.lovable/memory/features/quote-system-master-spec.md` ajuda a modelar composição de itens, mas sua sincronização Bitrix e métricas de conversão são do fluxo comercial anterior.

A reutilização deve ocorrer por capacidade comprovada e contrato claro. Usar todo o menu de CRM, gamificação, skins e integrações porque já existe aumentaria o custo cognitivo e operacional. A proposta de preservar controles de catálogo e personalização não significa preservar poderes de escrita no banco compartilhado.

### D13 — P2: artefatos rotulados confidenciais são preparados como assets públicos

O gerador grava relatórios e PDFs em `public/`, nas linhas 207–220, e o rodapé os chama de confidenciais. `public/robots.txt` permite rastreio e aponta sitemap de host legado. Texto no rodapé e robots não são controle de acesso; arquivos públicos podem ser servidos pelo build. Não foi feita requisição live desses assets neste lote e não foram encontrados segredos a serem reproduzidos neste relatório. Decidir quais relatórios devem ser públicos e quais exigem área administrativa; não publicar nomes de tabelas, diagnósticos internos e falsas certificações por acidente.

## Jornadas por público: o que a documentação permite concluir

| Público e necessidade | Base reaproveitável encontrada | Lacuna concreta | Critério de aceite recomendado |
|---|---|---|---|
| Comprador da cooperativa: escolher brindes e encaminhar compra | Catálogo, variantes, favoritos, composição de orçamento e itens | Mistura cotação do vendedor, requisição e pedido; leitura do catálogo não configurada no chamada de leitura da auditoria operacional | Catálogo somente leitura com preço e estoque datados; quantidade mínima, personalização, frete e prazo claros; envio vinculado à cooperativa e PA |
| Marketing: criar campanha, manter marca e aprovar arte | Coleções compartilhadas, imagens, áreas de personalização e documentos de piloto/arte no escopo | Não há evidência documental de jornada completa de campanha e aprovação de arte com versão, responsável e registro | Agrupar seleção por campanha, público e prazo; aprovar prova de arte versionada; separar aprovação da marca da autorização de gasto |
| Solicitante/gerente de PA: consultar verba e acompanhar requisição | Tela de carteira, serviço de orçamento, documentos de testes por papel | Contratos de verba incompatíveis, competência fixa e nomes de PA concorrentes | Verba por competência, comprometida e consumida; limites e motivo de bloqueio claros; isolamento entre PAs e cooperativas |
| Gestor de compras: decidir, justificar e distribuir verba | Fila de aprovação, RPCs, trilha e proposta de bulk | RPC sem autorização interna; estados e bulk divergentes; auditoria parcial no cliente | Decisão com alçada no servidor e histórico; motivo obrigatório quando aplicável; ação em massa preserva autorização de cada item |
| Operação do fornecedor: personalizar, produzir e entregar | Fluxos comerciais e integrações do legado; logística prevista em Scope | Não há prova deste subcorpus de conexão integral e operacional com o portal | Ordem aprovada e arte vinculadas; prazo e status confiáveis; entrega por destino e comprovante quando necessário |

Os critérios acima são inferências de desenho apoiadas nas lacunas, não requisitos confirmados em entrevistas com profissionais Sicoob. Perfis, campanhas e materiais oficiais estão documentados no dossiê e no anexo profissional, separadamente desta revisão do repositório. A existência de uma persona de marketing não obriga a criar um papel técnico novo: primeiro definir ações e escopos, depois mapear permissões.

## Decisões para orientar a próxima implementação

1. Fixar o contrato dos dois bancos: fonte externa `doufs…` apenas leitura; identidade, cooperativas/PAs, verbas, requisições, aprovações e pedidos no `cfm…`. Documentar snapshots históricos sem duplicar cadastro mestre e retirar dependência obrigatória de Bitrix.
2. Consolidar a hierarquia e a autorização: cooperativa/PA, vínculo ativo, competência, alçada, permissão e ator derivados no servidor. Resolver `postos_atendimento`/`pontos_atendimento`, `singulares`/`cooperativas` e as representações de orçamento com migração planejada.
3. Definir a máquina de estados e os eventos de negócio antes de ampliar telas: requisição, aprovação financeira, prova de arte, pedido, produção, expedição e recebimento; incluir rejeição, cancelamento e estorno com regras explícitas.
4. Substituir selos e percentuais sem base por uma matriz funcional: descrito, implementado, testado em ambiente identificado e operante em produção. Relatórios antigos devem indicar origem, limitações e supersessão.
5. Aceitar o primeiro fluxo vertical somente com comprador e gestor de teste em duas cooperativas, catálogo conectado sem escrita, verba coerente, negações de acesso verificadas, aprovação transacional e evidência de entrega das notificações prometidas.

Não há razão documental para reescrever o sistema inteiro. Há razão concreta para interromper a multiplicação de nomes, estados e promessas até os contratos centrais estarem consistentes. Prontidão depende de evidência operacional, conforme o próprio AGENTS.md.

## Registro individual dos 81 arquivos

A lista abaixo conecta cada arquivo lido ao valor reaproveitável e ao risco ou limite observado. Hashes, linhas e métodos estão no inventário JSON.

1. **`.github/ISSUE_TEMPLATE/bug_report.yml`** — Formulário útil, mas opções Bitrix, n8n, Evolution e Bling conservam o contexto do vendedor e não cobrem cooperativa, PA, verba e aprovação. Referências: D10.

2. **`.github/ISSUE_TEMPLATE/feature_request.yml`** — Modelo reutilizável; precisa de impacto sobre comprador e cooperativa, não apenas integrações comerciais legadas. Referências: D10.

3. **`.github/dependabot.yml`** — Automação semanal é base aproveitável. A presença da configuração não demonstra atualizações aplicadas nem elimina vulnerabilidades. Referências: D11.

4. **`.github/workflows/branch-protection-sentinel.yml`** — Executa após push e usa heurística de mensagem/autoria. Não demonstra bloqueio preventivo nas regras remotas do GitHub. Referências: D11.

5. **`.github/workflows/ci.yml`** — Pipeline existente é aproveitável; baseline de typecheck e ferramentas configuradas não provam execução bem-sucedida. Falha remota por orçamento Actions foi verificada na auditoria operacional. Referências: D11.

6. **`.github/workflows/db-performance-audit.yml`** — Agendamento mensal e uso de secrets declarados. Nenhuma execução ou medição do banco vivo foi feita nesta auditoria documental. Referências: D11.

7. **`.github/workflows/lighthouse.yml`** — Workflow existe; a configuração não comprova notas de acessibilidade, desempenho ou aprovação de jornadas autenticadas. Referências: D11.

8. **`.github/workflows/security.yml`** — Workflow de Gitleaks agrega valor, mas não equivale a uma auditoria completa de autenticação, autorização e isolamento. Referências: D11.

9. **`.hermes.md`** — Registra projeto privado e regras de trabalho; não é especificação de produto nem prova operacional. Referências: D10.

10. **`.lovable/memory/features/collections-public-share-system.md`** — Token público com validade de 30 dias e limitação de reações. Boa hipótese para colaboração de marketing; revisão de escopo e dados do token continua necessária. Referências: D12.

11. **`.lovable/memory/features/favorites-roadmap.md`** — Listas, desfazer, variantes e exportação são reutilizáveis. Notas 10/10 e tamanhos de toque divergentes não substituem teste de uso. Referências: D08,D12.

12. **`.lovable/memory/features/quote-system-master-spec.md`** — Fluxo em quatro etapas e conversão em pedido, com dependências Bitrix. Precisa ser separado da requisição interna, aprovação de verba e arte da cooperativa. Referências: D05,D10,D12.

13. **`.lovable/memory/infrastructure/hardening-roadmap.md`** — Declara ondas completas e nota 10/10; o baseline de produção ainda registra lacunas. Tratar como histórico de intenção, não certificação. Referências: D03,D07.

14. **`.lovable/memory/security/production-hardening-baseline.md`** — Admite rate limit incompleto, pendências em backend e referências públicas para buckets privados. Retenção de logs diverge do runbook. Referências: D03,D07,D10.

15. **`AGENTS.md`** — Exige worktree, diagnóstico e prontidão com tráfego real. É a regra operacional aplicável; contradiz o checkout direto do guia de contribuição. Referências: D10.

16. **`CONTRIBUTING.md`** — Fluxo e revisão são úteis; instrução git checkout -b nas linhas 13–18 conflita com AGENTS.md. Não foi executada. Referências: D10.

17. **`SECURITY.md`** — Política de comunicação e prazos é útil. Não comprova correção dentro desses prazos nem cobertura do portal Sicoob. Referências: D07.

18. **`audit_report.pdf`** — Quatro páginas de autoavaliação com nota máxima e alegações de segurança bancária. Não apresenta ensaios reproduzíveis que sustentem a certificação declarada. Referências: D03.

19. **`docs/02_INTEGRACAO_FRONTEND_REACT.md`** — Exemplos de OrganizationContext, owner/admin/member, filtros e CRUD. Trechos imperativos mostram tutorial; não comprovam implementação nem autorização no servidor. Referências: D01,D02,D05.

20. **`docs/04_EXPLICACAO_DAS_POLICIES.md`** — Mistura escopo por usuário e organização com dados acessíveis a todos autenticados. Deve ser confrontada com SQL implantado, não usada como prova de isolamento. Referências: D01,D05,D07.

21. **`docs/ACCESSIBILITY.md`** — Boas orientações de semântica, teclado e WCAG 2.1 AA; são critérios, não evidência de conformidade de todas as telas. Referências: D08.

22. **`docs/API.md`** — Referências de 2025 e integrações legadas, cotas e exigência global de JWT. Diverge de rotas públicas e pendências de rate limit. Referências: D02,D07,D10.

23. **`docs/AUDIT_FRONTEND_DATABASE.md`** — O próprio texto registra projeto nmojwpihnslkssljowjh, falha de acesso MCP e análise de migrações. Achados não se transferem automaticamente ao cfm atual. Referências: D03,D07.

24. **`docs/AUTH_PASSKEYS.md`** — Documento admite ausência de validação do servidor e integração nativa. A interface atual ainda anuncia sucesso sem criar sessão Supabase. Referências: D06.

25. **`docs/CASOS_TESTE_E2E_POR_PAPEL.md`** — Casos de PA e gestor são direção útil, porém há placeholders e estados divergentes. Aprovação em massa documentada não corresponde à tela atual. Referências: D04,D05,D11.

26. **`docs/CONFIGURACAO_LOCALE_PT_BR.md`** — Define pt-BR e BRL exclusivos; contradiz relatórios que afirmam internacionalização concluída. Contém instruções de implementação. Referências: D03,D08,D10.

27. **`docs/DARK_MODE.md`** — Documenta tokens e práticas reutilizáveis, mas afirma 100% sem resultados. A paleta legada não estabelece conformidade com identidade Sicoob. Referências: D08.

28. **`docs/DEPLOYMENT.md`** — Receita genérica de PostgreSQL, Redis e comando de deploy; precisa ser reconciliada com Supabase e Lovable efetivamente usados. Referências: D10,D11.

29. **`docs/E2E_SMOKE_COVERAGE.md`** — Percentual de 85% sem denominador e evidência executável vinculada. Smoke de navegação não demonstra compra e aprovação completas. Referências: D11.

30. **`docs/EDGE_FUNCTIONS_DRIFT.md`** — Contagens declaradas 89 e 92 coexistem com nenhuma ausência; não fornecem uma reconciliação por função e projeto atual. Referências: D10,D11.

31. **`docs/FIXTURES_E2E_POR_PAPEL.md`** — Seeds e usuários de teste de PA e gestor contêm exemplos incompletos. Não são evidência de execução nem prontidão de dados. Referências: D04,D05,D11.

32. **`docs/FUNCIONALIDADES_E_FERRAMENTAS.md`** — Mapa extenso do legado é útil para localizar componentes. CRM, gamificação e ferramentas do vendedor excedem o escopo Sicoob. Referências: D10,D12.

33. **`docs/HOOKS_USAGE_GUIDE.md`** — Abstrações CRUD e paginação são aproveitáveis seletivamente; exemplos de criação de produto conflitam com catálogo externo somente consulta. Referências: D02,D12.

34. **`docs/INVENTARIO_FUNCIONALIDADES_v2.md`** — Declara modo dual, três bancos, cache, 80 tabelas e 90 funções. Mistura inventário e alegações 100%; conflita com o recorte de dois bancos. Referências: D02,D03,D10.

35. **`docs/MOBILE.md`** — Critérios de responsividade e toque úteis. Declaração de 100% não vem acompanhada de jornadas, aparelhos ou evidências suficientes. Referências: D08,D11.

36. **`docs/NOTIFICATION_SYSTEM.md`** — Promete núcleo 100% e múltiplos canais; alguns estão apenas estruturados. O emissor inspecionado grava sucesso de push sem envio de push. Referências: D07,D09.

37. **`docs/ONBOARDING.md`** — Ajuda a localizar o legado, mas mantém 50 funções, caminhos antigos e acesso dependente de Lovable. Requer alinhamento com ambiente atual. Referências: D10.

38. **`docs/PERFORMANCE_AUDIT.md`** — Afirma p95 e ganhos sem planos EXPLAIN e registros de execução associados. Paralelismo não prova ausência de N+1. Referências: D03,D11.

39. **`docs/POSTMORTEM_TEMPLATE.md`** — Estrutura reutilizável para incidentes futuros; é modelo, não registro de incidente nem comprovação de processo operante. Referências: D11.

40. **`docs/README.md`** — Índice antigo e referências Promo Brindes; útil como mapa, insuficiente como fonte única atual do Sicoob. Referências: D10.

41. **`docs/RUNBOOK.md`** — Checklist útil, porém backups, PITR e contatos não foram verificados. Exclusão de logs após 90 dias diverge de retenções em outros documentos. Referências: D07,D10,D11.

42. **`docs/RUNBOOK_CONNECTIONS.md`** — Descreve segredos no banco com fallback de ambiente e diagnóstico. Cache em memória e dependências CRM exigem revisão para dois bancos. Referências: D02,D07,D10.

43. **`docs/SECURITY.md`** — Guia genérico em inglês, referências GDPR e rotação de 90 dias. Não mapeia requisitos LGPD nem prova controles implementados. Referências: D07,D10.

44. **`docs/SECURITY_PLAN.md`** — Pentest e monitoramento são planos; rotação semestral diverge de 90 dias. Domínio legado e SLOs precisam de dono e ambiente atuais. Referências: D07,D10,D11.

45. **`docs/SKINS_INVENTORY.md`** — Múltiplas skins, inclusive gamer e neon, não representam identidade Sicoob. Sistema de tokens pode ser reaproveitado após definição oficial. Referências: D08.

46. **`docs/SLO.md`** — Metas 99,9% e latência são objetivos. Contagem de HTTP menor que 500 pode considerar bloqueios de negócio bem-sucedidos. Referências: D11.

47. **`docs/adr/0001-ssot-external-db.md`** — Justifica não duplicar cadastro mestre; princípio aproveitável. Assume produtos e empresas externos e três bancos, extrapolando o pedido atual. Referências: D02,D10.

48. **`docs/adr/0003-zod-edge-functions.md`** — Validação de forma é aproveitável. Alegação 100% de funções não comprova autorização, escopo organizacional ou estado de negócio. Referências: D01,D07.

49. **`docs/adr/0005-resilience-circuit-breaker.md`** — Explicita limitação por instância e parâmetros; documentação de trade-off mais confiável que notas absolutas. Pode preservar adaptador de leitura. Referências: D02,D12.

50. **`docs/adr/0007-three-database-architecture.md`** — ADR aceito em maio mantém Bitrix como terceiro banco, embora SCOPE_ALIGNMENT exclua CRM e usuário determine dois bancos. Referências: D02,D10.

51. **`docs/adr/0009-expand-contract-migrations.md`** — Proposta útil para mudanças seguras. Status proposto não permite afirmar migrações sem indisponibilidade já operantes. Referências: D11.

52. **`docs/architecture/ER_DIAGRAM.md`** — Descreve singulares, pontos de atendimento e verbas, mas diverge de nomes de tabelas e papéis usados no serviço e em migrações concorrentes. Referências: D04,D05.

53. **`docs/audits/AUDITORIA_ENTERPRISE_FINAL.md`** — Nota 10/10, MFA, blockchain e internacionalização declarados concluídos; contradiz checklist de outros relatórios e documentação específica. Referências: D03.

54. **`docs/audits/AUDIT_EXPORT_FILTERED.md`** — Descreve quatro recursos de exportação e cold storage, sem evidência de commit completa. Potencial reutilização depende de validação de acesso. Referências: D03,D07,D12.

55. **`docs/audits/DOSSIA_AUDITORIA_ENTERPRISE_V5.md`** — Tabela RLS marcada integralmente aprovada e vínculos sem evidência específica por tabela. RLS habilitado não equivale a isolamento validado. Referências: D01,D03.

56. **`docs/audits/FINAL_ENTERPRISE_AUDIT_REPORT.md`** — Alega certificação e integridade, mas blockchain permanece pendente no checklist e hash é abreviado. Não constitui certificação independente. Referências: D03.

57. **`docs/deploy-flow.md`** — Revisão, rollback e PR são práticas aproveitáveis. Regras de branch e pipeline remoto precisam ser verificadas no GitHub. Referências: D10,D11.

58. **`docs/security/RLS_MATRIX.md`** — 75 cenários de vendedor, admin, supervisor e anônimo; falta matriz entre duas cooperativas e PAs. INSERT de orders diverge do README de testes RLS. Referências: D01,D05,D11.

59. **`docs/testing/CONTRACT_TESTS_PACT.md`** — Documento explicitamente futuro, dependências não instaladas; foco Bitrix não é prioridade do portal de compras Sicoob. Referências: D10,D11.

60. **`e2e/README.md`** — Informa skips sem credenciais e que orçamento apenas abre construtor. Boa honestidade de limite; não demonstra compra completa. Referências: D11.

61. **`e2e/routes/README.md`** — Testes interceptam API e focam oito cenários nominais. Não verificam banco, políticas ou transações reais. Referências: D01,D11.

62. **`infra/README.md`** — README declara migração futura para Terraform. Não demonstra infraestrutura já provisionada por código. Referências: D11.

63. **`public/AUDIT_ENTERPRISE_FINAL.pdf`** — Mesmo binário do PDF 20a6b98b1; contém métricas não reais, checklist positivo e muitos links com erro. Duplicação não amplia evidência. Referências: D03,D13.

64. **`public/images/promo-brindes-logo-v2.png`** — Inspeção visual mostra marca manuscrita Promo Brindes com desenho de presente. Não é identidade Sicoob; duplica src/assets. Referências: D08.

65. **`public/placeholder.svg`** — SVG lido e renderizado: área cinza com ícone genérico de imagem, sem conteúdo de produto nem marca. Recurso de fallback. Referências: D08.

66. **`public/reports/AUDIT_REPORT_20a6b98b1.pdf`** — Duplicata binária exata de public/AUDIT_ENTERPRISE_FINAL.pdf. Foi extraído e confirmado por SHA-256; não é auditoria independente. Referências: D03,D13.

67. **`public/reports/AUDIT_REPORT_37d88d6bf.pdf`** — Versão com 98,2%, 1164 componentes, 196 testes e links inválidos; lacunas de logs e criptografia ainda pendentes. Referências: D03,D13.

68. **`public/reports/AUDIT_REPORT_3b0427aef.pdf`** — Comparado integralmente ao PDF-base normalizado: metadados, contagem e estado de lacunas diferem. Conteúdo repetido não confirma correção. Referências: D03,D13.

69. **`public/reports/AUDIT_REPORT_6a6993b3a.pdf`** — Comparação integral ao PDF-base mostra essencialmente metadados de execução diferentes. Preserva fragilidades de evidência. Referências: D03,D13.

70. **`public/reports/AUDIT_REPORT_892fa9f31.md`** — Métricas Reais marcado negativo, cobertura 98,2%, RLS 100% e validações Sim com links 404. Código do gerador confirma valores padrão. Referências: D03,D13.

71. **`public/reports/AUDIT_REPORT_afc944619.md`** — Comparação integral ao 892fa9f31: diferenças de metadados. Mesmas afirmações e falhas de rastreabilidade. Referências: D03,D13.

72. **`public/reports/AUDIT_REPORT_b342d62cb.md`** — Difere do 892fa9f31 em metadados e cobertura de 88,4%. Não há ensaio anexado que explique ou valide a alteração. Referências: D03,D13.

73. **`public/reports/AUDIT_REPORT_d9912d316.md`** — Muda metadados, componentes para 1168 e lacunas para mitigadas/implementadas; gerador possui essas resoluções fixas. Referências: D03,D13.

74. **`public/reports/AUDIT_REPORT_e3392dc9c.md`** — Versão anterior com a mesma matriz de 171 tabelas e sem seção extensa de falhas. Ausência da seção não prova links válidos. Referências: D03,D13.

75. **`public/reports/AUDIT_REPORT_e6b40b200.md`** — Comparação integral com d9912d316: metadados e contagem de componentes para 1164. Sem novo ensaio demonstrado. Referências: D03,D13.

76. **`public/reports/AUDIT_REPORT_ea7691634.md`** — Comparação integral com d9912d316: metadados. As conclusões não constituem validação independente. Referências: D03,D13.

77. **`public/reports/AUDIT_REPORT_f9c1c233d.md`** — Comparação integral com d9912d316: metadados. Preserva RLS 100% e problemas de prova por tabela. Referências: D03,D13.

78. **`public/robots.txt`** — robots permite rastreio e aponta sitemap em host legado vamos-build-awesome. Não protege relatórios rotulados confidenciais em public/. Referências: D08,D13.

79. **`reports/AUDIT_REPORT_733ce6c62.md`** — Versão mais antiga com matriz repetitiva e declaração de zero lacunas críticas; não pode ser usada para desconsiderar achados atuais. Referências: D03.

80. **`src/assets/logo-promobrindes.png`** — SHA-256 idêntico à imagem de public/images. Inspeção visual equivalente: marca do fornecedor, não do Sicoob. Referências: D08.

81. **`tests/rls/README.md`** — Somente anônimo, vendedor e admin, execução dependente de credenciais. Falta escopo entre cooperativas e PAs; INSERT de orders contradiz a matriz. Referências: D01,D05,D11.

## Verificações específicas adicionais ao corpus

Foram consultados, em modo somente leitura, o gerador de dossiê, configuração e handlers do external-db-bridge, WebAuthn/PasskeyLogin/Auth, AdminRoute/AuthContext, serviços Sicoob de orçamento, pedido e aprovação, páginas de carteira e aprovação, configuração de rotas, send-notification, tipos e migrações relacionados aos achados. A leitura foi orientada por hipóteses documentais; não constitui auditoria de todas as linhas do repositório. O escopo complementar está registrado nos demais anexos.

Nenhuma versão antiga de relatório foi tratada como certificação independente; nenhuma resposta vazia anônima foi tratada como prova de RLS; nenhum script ou migração foi executado contra produção. Os nomes de ambientes aparecem apenas para distinguir escopo; não foram publicados valores de credenciais.
