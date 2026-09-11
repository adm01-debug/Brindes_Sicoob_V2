# Auditoria documental e cruzamento com código — lote A

Data: 11/09/2026. Base local: worktree `chat-sicoob-20260911115127`, HEAD auditado `d75459d28`. Escopo: 81 arquivos do inventário `documentos-repo-1.json`, incluindo oito PDFs com 146 páginas, um PNG e um SVG. Este relatório não consultou nem modificou bancos de produção, não invocou funções publicadas e não demonstra o estado efetivo das políticas no Supabase.

## Conclusão para decisão

Há material aproveitável de catálogo, kits, comparação, simulação, orçamentos, colaboração e operação de pedidos. A documentação descreve principalmente uma ferramenta de vendedores Promo Brindes/Gifts Store, sobre a qual foram adicionados módulos Sicoob. Ela não constitui uma especificação coerente de portal de compras de cooperativas. Os relatórios anteriores de “10/10”, “100% seguro”, cobertura de testes e “produção” não devem ser usados como evidência de prontidão: parte desses valores é emitida estaticamente por scripts.

Três bloqueadores foram confirmados no código: a função `migrate-helper` ainda contém uma resposta que devolve credenciais privilegiadas; a ponte do catálogo ainda oferece gravações no banco externo, incompatíveis com a instrução atual de somente consulta; e as rotas Sicoob combinam uma barreira administrativa que exclui compradores de PA com um componente que consome propriedades inexistentes do contexto de autenticação. A exposição efetiva da função e os privilégios reais da credencial externa precisam ser verificados por metadados e configuração segura, sem solicitar nem imprimir segredos.

## Método e cobertura

Foram lidos README e SCOPE_ALIGNMENT antes dos demais documentos. O corpus foi organizado em quatro lotes de 22, 22, 20 e 17 arquivos. Todos os textos foram processados; as repetições de relatórios foram comparadas integralmente em disco, preservando as diferenças de versão, cobertura e status. As 171 entidades de tabela dos oito PDFs foram conferidas contra o representante Markdown, assim como os 171 resultados `PASSED` por documento. As variantes de PDF foram comparadas por diff integral do texto extraído. O PNG foi inspecionado visualmente; o SVG foi lido e renderizado; a primeira página de um PDF de 20 páginas foi inspecionada para verificar legibilidade e fidelidade.

`cobertura-a.json` registra caminho absoluto, SHA-256, tamanho, método, contagem de páginas/linhas e resumo de cada arquivo. `semantica-repo-a.json` contém 280 nós, 382 arestas e cinco hiperarestas. As relações extraídas descrevem o que o documento diz, não transformam suas afirmações em fatos de produção. Relações inferidas e ambiguidades são marcadas explicitamente. Não houve instrumentação confiável de tokens; zeros de formato nos fragmentos não representam medida de uso.

## Achados críticos e altos

### A01 — Credenciais privilegiadas continuam em resposta de função de migração — P0

**Evidência local:** `supabase/functions/migrate-helper/index.ts:5` define uma chave fixa; linhas 7–9 liberam CORS; linhas 24–29 retornam `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL`. `supabase/config.toml:3` declara a função com `verify_jwt = false` logo abaixo. A chave fixa não é reproduzida aqui.

**Contradição documental:** `.lovable/plan/remoção-da-edge-function-migrate-helper-2026-08-16.md`, seção “Plano”, prescreve excluir código, excluir função publicada, rotacionar credenciais, investigar logs e adicionar gate. O código atual conserva exatamente o comportamento que o plano condena. O gate contém referência ao incidente em `scripts/check-edge-authorization.mjs:129`, mas sua existência não prova execução nem bloqueio de deploy.

**Implicação:** se esta versão estiver publicada, uma chave de aplicação fixa permitiria recuperar segredos com privilégios que contornam RLS. Mesmo sem publicação atual, um deploy futuro do conjunto de funções reintroduziria o risco. A confirmação deve consultar inventário de funções, estado do deploy e registros de rotação. Não foi feita chamada ao endpoint. A ausência de evidência operacional não deve ser interpretada como exposição comprovada nem como resolução comprovada.

### A02 — Ponte externa não respeita o requisito de somente leitura — P0

**Evidência local:** `supabase/functions/external-db-bridge/index.ts:402` aceita `insert`, `update`, `delete`, `upsert` e `batch_insert`; `_shared/external-db-config.ts:142` permite todas essas operações para produtos. As linhas 841–847 do bridge autorizam gravações para papéis legados `admin`, `gerente` e `vendedor`, vedando ao vendedor apenas exclusão. Linhas 1310, 1341 e 1387 executam escrita/exclusão no cliente externo. Linhas 1635–1636 resolvem credencial `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`.

**Contradição:** o usuário determinou que `doufsxqlfjyuvxuezpln` será apenas fonte de consulta de produtos, estoque e valores. O inventário de conectores reconhece o catálogo como fonte oficial externa, mas a aplicação herdou funções de gestão desse catálogo. Não há bloqueio global de somente leitura nesses dois arquivos.

**Decisão recomendada:** preservar o consumidor de leitura e a experiência de busca; retirar gravações dessa integração no portal, restringindo também a identidade de banco ou API a leitura. Uma tela oculta não é controle suficiente. RPCs devem ter lista de permissões separada para consultas, pois o nome `rpc` não garante ausência de efeitos. Não se comprovou que a credencial atualmente configurada permita gravações, pois o banco não foi acessado.

### A03 — Compradores de PA e vendedores não alcançam corretamente o módulo Sicoob — P0

**Evidência local:** `src/App.tsx:147` coloca o conjunto administrativo e Sicoob sob `AdminRoute`; linhas 152–155 acrescentam `SicoobRoute`. `AuthContext.tsx:327–331` define `canManage` por dev, supervisor, gestor_compras ou comprador_singular, sem gerente_pa/comprador_pac e vendedor. `SicoobRoute.tsx:15` tenta ler `userRoles` e `loading`, mas o contexto expõe `roles` e `isLoading` (`AuthContext.tsx:340–341`). A chamada `userRoles.some` em `SicoobRoute.tsx:31` recebe valor ausente quando esse componente é alcançado.

**Consequência:** os perfis centrais da compra descentralizada podem ser barrados antes da tela; os perfis que passam pela barreira encontram incompatibilidade de contrato. Não é apenas divergência de documentação. Também há consumo de `isVendedorRole` e `isAdmin` em `OrdersPage.tsx:83`, cuja compatibilidade deve ser tratada com a mesma matriz de autorização.

**Aceite mínimo:** uma sessão real de cada papel deve navegar ao painel correto, consultar apenas seu escopo e executar apenas as transições autorizadas. Testes unitários de wrappers isolados não cobrem automaticamente a composição de rotas.

### A04 — Auditorias emitem resultados positivos sem medições correspondentes — P1

**Evidências reproduzíveis por leitura:**

- `scripts/enterprise-dossier-builder.mjs:72` inicializa cobertura como `98.2%`; linha 78 usa `summary.total?.lines?.pct || 98.2`, substituindo inclusive um resultado real zero pelo valor de fallback.
- No laço RLS, linha 114 procura a primeira migration com `ENABLE ROW LEVEL SECURITY`, sem filtrar a tabela. Isso explica a mesma migration `001_notification_system.sql` e a mesma data para 171 tabelas.
- O status `PASSED` deriva de `relrowsecurity`, que indica habilitação de RLS, sem testar isolamento entre duas organizações.
- A frase “100% das tabelas validadas” é literal do template, assim como parte dos estados de conformidade; a função de obtenção de tabelas retorna lista vazia em falha.
- A seção “Último Deploy” recebe `git rev-parse --short HEAD`; não consulta serviço de implantação. “Verified by Lovable SHA-256” é texto do relatório, sem cálculo ou verificação criptográfica equivalente neste gerador.
- `scripts/generate-audit-dossier.mjs` declara “10/10 Compliance Verified”, RLS, fallback IA e WCAG conformes no template, mesmo com ausência de resultados da RPC.

**Prova nos documentos:** `public/AUDIT_ENTERPRISE_FINAL.md:26` indica “Métricas Reais: ❌” junto de cobertura 98,2%; contém 171 `PASSED` e 175 links marcados 404. Os arquivos de maio repetem esse padrão. `docs/audits/AUDIT_ENTERPRISE_FINAL.md` e `reports/AUDIT_REPORT_631165be8.md` mantêm mesmo ID, data e commit, mas divergem sobre conclusão de blockchain, segregação de logs e criptografia.

**Decisão:** manter estes arquivos como histórico de geração e hipótese técnica, nunca como atestado para compradores ou compliance. Uma auditoria nova deve declarar desconhecido quando não mede; vincular resultado ao commit, ambiente e execução; distinguir RLS habilitada de RLS testada; e impedir substituição de métricas ausentes por notas positivas.

### A05 — Teste de isolamento não simula corretamente a organização atacante — P1

`scripts/test-rls-compliance.mjs` escolhe dois PAs, mas não garante que pertençam a organizações distintas. Cria um orçamento com service role e depois usa um cliente anônimo, sem sessão autenticada de membro do PA A. O cliente ainda usa fallback para service role se `VITE_SUPABASE_ANON_KEY` faltar. Logo, tanto a alegação “cross-org” quanto algumas interpretações de sucesso/falha são inválidas. Qualquer erro de fetch é tratado como acesso negado esperado; falha de configuração, rede ou schema pode parecer aprovação. O script retorna sem falha em massa insuficiente ou erro de insert. O cleanup não está em `finally`, e chamadas `process.exit` podem deixá-lo sem executar.

O workflow `.github/workflows/security-compliance.yml` fornece service role, mas não configura o nome da variável anon usada nesse teste. Esse script grava e apaga dados no ambiente indicado pelas variáveis; não deve ser executado como teste inofensivo em produção. Não foi executado nesta auditoria.

### A06 — Proteção de PII por criptografia é uma alegação sem integração efetiva — P1

O serviço `src/services/encryption.ts` implementa AES-GCM e PBKDF2, mas os helpers `protectPII`/`revealPII` usam `VITE_APP_ENCRYPTION_KEY` ou segredo fixo nas linhas 85 e 90. Variáveis `VITE_` são destinadas ao cliente; esse desenho não separa a chave dos usuários do navegador. A busca de consumidores em `src` encontrou somente as definições no próprio arquivo, não aplicação aos dados pessoais antes da persistência.

Isso não demonstra ausência de criptografia de infraestrutura do provedor; demonstra que os relatórios que marcam “Criptografia de Dados em Repouso (Camada App) — implementado” não provam proteção de PII da aplicação. É necessário especificar quais campos são sensíveis, quem pode lê-los e onde a chave vive, além de demonstrar fluxo integrado e rotação.

### A07 — Papéis e fronteiras organizacionais têm múltiplas definições — P1

| Fonte | Modelo declarado | Divergência relevante |
|---|---|---|
| README / DATA_DICTIONARY | admin, manager, vendedor | Plataforma comercial de vendedores |
| 01_CRIAR_PRIMEIRA_ORGANIZATION / 03_ARQUITETURA | owner, admin, member; `user_organizations` | Contexto atual consulta `organization_members` |
| SCOPE_ALIGNMENT | admin, gestor_compras, gerente_pa, vendedor | Central não está na hierarquia descrita |
| SICOOB_TESTING | sicoob_pa, sicoob_singular, sicoob_central, sicoob_gestor | Vocabulário distinto dos guards atuais |
| RBAC_HELPERS / ADR0006 | dev, supervisor e aliases legados; admin/dev separados | Helpers de conexões aceitam supervisor+, ADR reserva infraestrutura ao dev |
| AuthContext atual | dev, gestor_compras, gerente_pa, comprador_pac, vendedor, supervisor, agente, comprador_singular | Conversão entre os modelos não documentada de ponta a ponta |

`src/services/sicoob/orderService.ts:49` ainda obtém `profiles.role` para decidir filtro, contrariando o ADR0002 que define `user_roles` como fonte. Isso não prova vazamento por si só, pois RLS pode restringir a consulta, mas impede tratar a autorização como coerente ou testada.

**Especificação necessária:** distinguir papel funcional de posição organizacional. Uma profissional de marketing pode trabalhar na Singular, e um aprovador de orçamento pode estar no mesmo PA ou acima dele; cargo não deve determinar sozinho o escopo de dados. A matriz precisa registrar entidade, leitura, criação, aprovação, cancelamento, alteração de preço, concessão de acesso e auditoria, incluindo delegação temporária e múltiplas vinculações quando necessárias.

### A08 — A documentação não acompanha a mudança de vendedor para comprador — P1

README abre definindo “plataforma B2B para vendedores”. O C4 coloca usuário vendedor/admin e cliente final apenas como aprovador externo. SCOPE_ALIGNMENT exclui Bitrix, gamificação e grande parte do legado, mas termina focado na “experiência do vendedor”. DATA_DICTIONARY chama multi-tenant de “preparado, pouco usado”; a arquitetura antiga promete isolamento completo e produtos próprios por organização.

Não há neste lote uma jornada completa de comprador de cooperativa ou marketing: campanha/objetivo, público, quantidade, limite disponível, prazo do evento, endereço ou distribuição por PA, simulação final, arte aprovada, alçada, contratação, faturamento, entrega e prestação de contas. Recursos de marca e campanha do Magic Up são úteis, mas não substituem o fluxo de aprovação de identidade da cooperativa.

**Aproveitamento:** preservar componentes comprovados; reorientar navegação e linguagem para comprador. “Meu saldo”, “Minhas solicitações”, “Aprovações pendentes”, “Campanhas e artes” e “Entregas por PA” devem nascer de regras reais, não apenas de renomear uma interface de venda.

### A09 — Verbas, pedidos e alçadas não têm um contrato canônico documentado — P1

SCOPE_ALIGNMENT fala em Singular > PA > Verbas. API_DEPENDENCY_MAP menciona `pa_budgets`; DATA_DICTIONARY privilegia descontos do vendedor. O serviço atual `src/services/sicoob/budgetService.ts:5` usa `sicoob_budgets`, e `getBudgetByPa` consulta apenas `pa_id` sem período. `updateBudget` faz leitura seguida de substituição de `used_amount`, também por PA, sem condição de versão no cliente. Isso não confirma ausência de proteção por trigger ou RPC em outra camada; exige verificar o contrato real antes de qualquer decisão financeira.

As regras que faltam explicitar incluem saldo reservado versus comprometido versus consumido; mês/exercício; centro de custo; orçamento da Singular e subalocação de PA; reversão ao cancelar; aprovação acima da verba; edição depois de aprovar; duas compras concorrentes; pedido dividido; impostos/frete/personalização no limite; e trilha de decisão. São lacunas de especificação e evidência, não proposta de alterar o modelo unilateralmente.

### A10 — Indicadores simulados podem parecer inteligência real para o comprador — P1

A memória de BI é relativamente explícita: sem amostra suficiente usa dados simulados e badge. Isso é preferível a ocultar a origem, mas não produz informação comercial real. `src/hooks/bi/useClientBI.ts` também contém fallback mock.

Já `src/hooks/sicoob/useAIOrderPredictor.ts:16` usa `setTimeout` e devolve três previsões fixas com probabilidades 94%, 87% e 82%, incluindo “baseado em 12 PAs similares”. Não há consulta, modelo ou cálculo nesse hook. `OrdersPage.tsx:432` apresenta texto fixo “Atualizado em tempo real • Confiança de 92%”. Essas frases são inadequadas como evidência de recomendação baseada no histórico da cooperativa. O portal deve separar demonstração, regra determinística e inferência estatística, exibir origem e período e omitir confiança não calculada.

## Achados complementares

### A11 — Gatilhos e testes locais não asseguram passagem em produção

`.github/workflows/sicoob-ci.yml` termina com sucesso nos testes de banco quando `SUPABASE_DB_URL` está ausente; seus filtros de caminhos ignoram mudanças em migrations e nos arquivos de rotas/SicoobRoute. `.github/workflows/e2e.yml:64` e `:75` usam o mesmo identificador `e2e_smoke`, problema estático a corrigir. Os READMEs P0 reconhecem esqueletos pulados, e buscas confirmam `it.skip`/`test.skip` nos cenários de resiliência e integridade. Existem testes mais novos no diretório; portanto não se deve afirmar que absolutamente todos os testes P0 atuais estejam desabilitados.

A auditoria operacional consultou separadamente o estado remoto e informou que um job não iniciou por orçamento do GitHub Actions. Este relatório não atribui esse bloqueio observado ao YAML. Sintaxe, configuração e bloqueio de orçamento são fatos distintos. Sem execução e artefatos, workflow versionado não equivale a controle ativo.

### A12 — Produção, recuperação e SLA são declarados sem evidência operacional

README aponta `criar-together-now.lovable.app`; CI_CD aponta domínios Promo Gifts e deploy por tag; `index.html` usa `vamos-build-awesome.lovable.app`. O runbook de rotação cita ainda outro projeto Supabase legado. DR declara PITR, versionamento e réplica de arquivos; SLA_REVIEW afirma SMS e envio mensal automático; OBSERVABILITY pede configurar regras de alerta e termina em placeholder. Não foram encontrados neste lote comprovantes de restauração, período de medição, contrato SLA ou execução de alertas.

A auditoria operacional registrou que a última tentativa de implantação GitHub de 05/09 falhou na Vercel. Não se deve substituir esse dado por “produção” escrito em relatório de maio. A referência canônica de ambiente deve registrar domínio, commit implantado, projeto Supabase, consumidores do catálogo, responsável e última validação de saúde — sem incluir segredos.

### A13 — Onboarding SQL não valida RLS nem atende ao contrato externo de leitura

`docs/01_CRIAR_PRIMEIRA_ORGANIZATION.md` orienta executar SQL no editor Supabase e conclui que um insert bem-sucedido prova RLS. Uma sessão administrativa/privilegiada pode contornar as policies. É necessário testar como usuário autenticado do papel em questão e incluir caso negado de outra cooperativa. O guia também orienta atualizar todas as categorias sem organização e cadastrar produtos reais; ele é legado e não deve ser aplicado automaticamente ao banco externo indicado pelo usuário.

### A14 — Aprovação de orçamento, piloto e alçada aparecem como fluxos diferentes

SCOPE_ALIGNMENT mapeia `mockup_approval_links` para `order_pilot_approvals`; order-workflow diferencia `orders` de `sicoob_orders`; DATA_DICTIONARY mistura aprovação pública, assinatura e desconto do vendedor. O reaproveitamento exige deixar explícito quem aprova preço/verba, quem aprova aplicação da marca e quem libera produção. A aprovação de arte não implica aprovação de despesa. Histórico deve guardar a versão exata de arte, item, quantidade, preço e prazo aprovada e invalidar/reabrir o aceite quando esses elementos mudarem.

### A15 — Rota de callback social não comprova SSO corporativo Sicoob

SCOPE_ALIGNMENT promete email/SSO Sicoob. `src/pages/SSOCallbackPage.tsx` implementa callback OAuth via broker Lovable, PKCE ou fluxo implícito; `Auth.tsx` menciona Google. A busca de `signInWithSSO`, SAML e OIDC em `src` e funções não encontrou integração corporativa equivalente. Pode existir configuração externa não versionada, mas ela não foi comprovada. O requisito deve ser marcado como dependente do provedor de identidade e do acordo de acesso da cooperativa, evitando apresentar Google como SSO Sicoob.

### A16 — Identidade visual contém herança e metadados conflitantes

`index.html` identifica Sicoob, mas define autor/publisher Promo Brindes, verde `#006B3F`, imagens antigas hospedadas em R2 e canonical Lovable. `public/favicon.svg` é um presente branco em azul `#3B82F6`; `public/images/promo-brindes-logo.png` mostra a assinatura preta Promo Brindes. O HTML usa `/favicon.png`, portanto o SVG legado, isoladamente, não prova que esse seja o favicon exibido. O uso efetivo de cada ativo deve ser rastreado antes de trocar arquivos.

A página inicial também contém elementos `div` do splash dentro do `head` e fechamento excedente (`index.html:58–61`), markup a corrigir após diagnóstico visual. O lote não contém manual oficial de marca suficiente para validar cores, usos e área de proteção; essa validação depende dos documentos catalogados fora do repositório e das fontes públicas do dossiê.

### A17 — Retenção e exclusão ainda não são política implantada demonstrada

ADR0008 está em “Proposta”. `service_map.txt` registra exclusões físicas de kits, coleções, mockups, pedidos/orçamentos e cadastros. A existência de um ADR não significa que todas as entidades tenham `deleted_at` e recuperação. Para compras, documentos fiscais, pedidos aprovados, versões de arte, notas e trilhas precisam de critérios de retenção e arquivamento coerentes com a operação. Não se deve prescrever um prazo legal genérico usando o exemplo “5 anos” do ADR como se fosse regra validada.

### A18 — Relatórios confidenciais estão no diretório de ativos públicos

`public/AUDIT_ENTERPRISE_FINAL.md` e `public/reports/` contêm esquema, nomes de tabelas, detalhes de papéis e alegações de conformidade. Em uma distribuição Vite normal, esses arquivos são servidos como ativos estáticos; o rótulo “Confidencial” e o login da SPA não os protegem. A publicação concreta não foi testada. O conteúdo deve ficar em artefato privado de auditoria se não tiver finalidade pública deliberada.

### A19 — Acessibilidade e desempenho são extrapolados de controles parciais

MAGIC_UP_ONDA5_A11Y descreve testes de classes, foco e axe de componentes específicos. STRICT_REF_WARNING_GATE testa avisos React. Nenhum dos dois, isoladamente, sustenta “WCAG Compliance” global do portal Sicoob. PERFORMANCE mistura metas com soluções como Redis, sem medição anexada. É necessário verificar teclado, leitor de tela, erros de formulário, tabelas densas, modais de aprovação e mobile nos fluxos reais do comprador; desempenho precisa medir catálogo e checkout com rede e volume representativos.

### A20 — A própria documentação apresenta estados mutuamente incompatíveis

- ROADMAP marca várias fases concluídas e depois as mesmas funcionalidades pendentes no MoSCoW.
- Auditoria 14/05 marca multinacionalidade planejada; `docs/audits/audit_report.md` marca concluída; POLITICA_IDIOMA_PT_BR proíbe esse escopo.
- AUDIT_INVENTORY_DETAILED recomenda otimizar um componente que o mesmo relatório diz já otimizado.
- API_DEPENDENCY_MAP chama OrdersPage Sicoob de mock; a implementação atual chama `sicoobOrderService.listOrders` e tem assinatura realtime. A nota deve ser atualizada, preservando separadamente os elementos ainda simulados.
- EDGE_FUNCTIONS descreve categories/materials como CRUD; seus schemas atuais aceitam ações de consulta. Não confundir esse desvio documental com o bridge genérico que efetivamente escreve.
- README referencia `./audit_report.md`, ausente na raiz desta cópia; CI_CD depende de `quality.yml`, também ausente. Há outros workflows reais, que não devem ser chamados de inexistentes por extensão.
- MODULES aponta recursos `mem://` que não são materializados nesse índice. Eles não podem ser fonte exclusiva de requisitos essenciais quando outro agente ou desenvolvedor clona o projeto.

## O que preservar e o que reespecificar

| Capacidade | Ativo aproveitável | Condição para atender cooperativas |
|---|---|---|
| Catálogo | Inventário externo, filtros, variantes, imagens, categorias e técnicas | Fonte externa somente leitura, SKUs estáveis, preço/estoque com data e origem |
| Orçamento | Simulação por quantidade e badge de preço oficial/estimado | Total com personalização, frete e condições; validade explícita |
| Kits | Biblioteca própria/curada, clonagem, preview e colaboração | Modelos homologados por finalidade e marca; quantidades e embalagem consistentes |
| Marketing | Coleções, artes, Magic Up, compartilhamento e comentários | Aprovação de marca versionada e separada da alçada financeira |
| Solicitação do PA | Telas e serviço de pedido Sicoob | Acesso corrigido, escopo por PA e comprovante de solicitação |
| Aprovação do gestor | Verbas, aprovação, timeline e relatório consolidado | Reserva transacional, delegação, justificativa e auditoria verificável |
| Logística | Tracking, pagamentos, documentos e comprovantes | Prazo do evento, entregas por endereço/PA, responsável e exceções |
| Compra recorrente | Reorder, duplicação, listas e templates | Reconsultar estoque e preço ao repetir; nunca reutilizar valor antigo silenciosamente |
| Administração | Cadastros e papéis existentes | Separar operador do portal, gestor da cooperativa, comprador, marketing e suporte técnico |
| Observabilidade | Logs, request_id e scripts de gates | Configuração real, alertas testados, artefatos vinculados ao deploy |

## Evidências necessárias para sair da análise

1. Estado de publicação e encerramento do incidente `migrate-helper`, com comprovação de rotação sem expor chaves.
2. Contrato da fonte externa: tabelas/views/RPCs permitidas, preços utilizáveis, data de atualização, variantes e identidade de leitura.
3. Dicionário real do banco do portal, migrations aplicadas, papéis e vínculos Central/Singular/PA, obtidos por leitura autorizada no projeto correto.
4. Matriz de permissões por recurso e testes negativos com organizações diferentes, sem fallback para service role.
5. Fluxo demonstrado de uma compra: seleção → orçamento → arte → verba/alçada → pedido → produção → entrega → prestação de contas.
6. Evidência operacional de deploy, build, testes, alertas e recuperação; resultados ausentes devem constar como não verificados.

Estas condições aproveitam o que já existe sem perpetuar as premissas do legado. Nenhum patch, merge, envio de mensagem externa ou mutação de dados foi realizado por este subtrabalho.

## Evidências operacionais complementares

As verificações abaixo pertencem à auditoria operacional e estão detalhadas no anexo de verificação, separadamente da revisão documental:

- No projeto correto `cfmzkthhgliqelozlmwu`, configurações públicas de autenticação indicaram cadastro desativado, email ativo e Google desativado. Isso reforça A15 e a inconsistência de oferecer Google na interface.
- Consulta de leitura de três IDs de produto pelo `external-db-bridge` retornou HTTP 200, `_unconfigured: true` e contagem zero. Nesse momento a ponte estava sem configuração; não se deve interpretar HTTP 200 como catálogo operacional nem contagem zero como ausência de produtos na fonte.
- Consultas anônimas limitadas a IDs em `profiles`, `sicoob_orders`, `cooperativas` e `postos_atendimento` retornaram arrays vazios. Isso não comprova tabela vazia nem isolamento completo; apenas registra ausência de linhas visíveis naquela consulta.
- O build completo npm falhou em gate de segurança com dez achados altos; `vite build` diagnóstico concluiu em 32,43 segundos e produziu chunk administrativo de aproximadamente 1,55 MB. Compilar pelo comando direto não equivale a passar todos os gates.
- O typecheck terminou com 1.259 diagnósticos. Isso contraria a linguagem documental de tipagem integral e ausência de pendências.
- A tela de login do build de produção exibia atalhos de teste corrompidos, ação “Corrigir Agora”, opção Google indisponível no backend, números comerciais fixos e logo quebrado. A ação de reparo não foi acionada.

Essas observações fortalecem a recomendação de estabilizar autenticação, configuração do catálogo e comprovação operacional antes de polir a interface ou acrescentar mais funcionalidades.
