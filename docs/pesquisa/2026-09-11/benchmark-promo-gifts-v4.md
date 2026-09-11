# Benchmark técnico e de experiência — Promo Gifts V4 → Brindes Sicoob V2

**Data da coleta:** 11/09/2026

**Objetivo:** identificar capacidades comprovadas, fragilidades e padrões transferíveis da Promo Gifts V4 para o portal de compras de brindes do Sicoob.

**Escopo:** site público, repositório, arquitetura, catálogo, orçamento, kits, segurança, qualidade, desempenho, acessibilidade e aderência ao comprador institucional Sicoob.

## Veredito executivo

A Promo Gifts é uma plataforma B2B madura em amplitude funcional. Ela concentra catálogo, consulta de estoque, personalização, comparação, carrinhos por fornecedor, orçamento, kit, mockup, CRM, inteligência comercial e administração. Essa cobertura constitui uma boa biblioteca de padrões e regras de domínio.

O produto, porém, foi desenhado para o trabalho diário de vendedores de brindes. O Sicoob V2 deve servir compradores, profissionais de marketing, gestores e aprovadores de cooperativas. A transferência correta é seletiva:

1. **Reaproveitar a inteligência de catálogo:** busca, filtros, cores, estoque, disponibilidade futura, favoritos, comparação, vistos recentemente e recomendações.
2. **Adaptar o fechamento:** trocar margem, comissão, fornecedor e linguagem comercial por orçamento, verba, centro de custo, unidade, evento, prazo, personalização e aprovação.
3. **Simplificar a experiência:** expor somente a próxima decisão necessária e manter os recursos especializados em camadas progressivas.
4. **Preservar a separação de dados:** catálogo externo apenas para consulta; pedidos, perfis, aprovações e auditoria no banco do portal Sicoob.
5. **Não importar dívida estrutural:** milhares de migrations, arquivos monolíticos, centenas de testes pulados, SEO incompatível com rotas protegidas e dependências vulneráveis.

O Sicoob V2 já contém uma parte relevante da herança funcional da Promo Gifts. A oportunidade não está em copiar mais telas. Está em recompor o que existe em uma loja institucional bonita, rápida e orientada a quatro tarefas: descobrir, configurar, solicitar e acompanhar.

## Método e confiabilidade das evidências

Foram combinadas cinco fontes de evidência:

| Camada | Como foi verificada | Força da evidência | Limite |
|---|---|---:|---|
| Produção pública | Navegação real em desktop, 390 px e 320 px; inspeção de DOM, metadados, rede, headers, sitemap e acessibilidade automatizada | Alta para login e infraestrutura pública | Sem credencial para telas autenticadas |
| Código atual | Leitura direta do checkout local e do commit `ede2e0270` | Alta | O checkout corresponde ao PR 1857, ainda não integrado à `main` |
| Produção GitHub | `main`, PR 1857 e checks consultados pela API do GitHub | Alta | Estado pode mudar depois da coleta |
| Grafo Graphify | Grafo de 29.262 nós, 37.649 relações e 4.726 comunidades; consulta focada em catálogo e B2B | Média | Grafo baseado no commit de 21/08/2026, anterior ao código atual |
| Auditorias internas | Documentos históricos e scripts do próprio projeto | Média | Achados antigos foram tratados como histórico até confirmação no código ou na produção atual |

O grafo cobriu 6.534 arquivos, com 98,2% das relações marcadas como extraídas e custo de modelo igual a zero. A consulta dirigida encontrou 254 nós associados ao catálogo, carrinhos, orçamento, personalização, kits, estoque, favoritos e comparação. Ele foi usado para navegação e descoberta; conclusões atuais foram conferidas nos arquivos presentes.

## Inventário mensurável da Promo Gifts

Os números abaixo foram obtidos por contagem local reproduzível, excluindo `node_modules` quando aplicável.

| Indicador | Valor observado |
|---|---:|
| Arquivos TypeScript/TSX em `src` | 2.574 |
| Arquivos de produção em `src` | 1.949 |
| Arquivos de teste em `src` | 620 |
| Linhas TS/TSX de produção | 459.438 |
| Linhas TS/TSX de testes em `src` | 104.007 |
| Declarações de rota encontradas | 124 |
| Edge Functions | 108 |
| Migrations SQL | 2.982 |
| Workflows GitHub Actions | 111 |
| Specs E2E | 567 |
| Testes/specs no repositório | 1.868 |
| Arquivos TS/TSX com 600 linhas ou mais | 98 |
| Marcadores estáticos de `skip`/`todo` encontrados | 551 |
| URLs no sitemap público | 7.801 |
| Tamanho do sitemap público | 3.192.179 bytes |

Esses números mostram investimento forte em cobertura e automação. Também mostram custo operacional alto: mudanças comuns atravessam uma superfície extensa de rotas, workflows, migrations e variações de componentes.

## Arquitetura funcional encontrada

### Catálogo e descoberta

O catálogo reúne recursos valiosos para o Sicoob:

- grade virtualizada para volumes grandes;
- modos de grade, lista e tabela;
- busca textual, busca aproximada e filtros persistidos na URL;
- categorias, materiais, cores, tamanhos, faixas de preço e fornecedor;
- seleção de cor diretamente no card;
- visualização rápida e pré-carregamento de produto;
- status de disponibilidade e estoque futuro;
- histórico de estoque e vendas;
- produtos similares e recomendação assistida;
- favoritos, comparação e vistos recentemente;
- compartilhamento de produto, cor e kit;
- indicadores de novidade, reposição, ponta de estoque e inteligência comercial.

Os componentes modernos de maior interesse são `BaseProductGridCard`, `ProductColorSwatches`, `ProductQuickActionsFAB`, `ProductStatusBadge`, `VirtualizedProductGrid`, `RecentlyViewedBar`, `FutureStockModal` e a linha dedicada para tabela. A árvore atual está visível no [código de produtos da Promo Gifts](https://github.com/adm01-debug/Promo_Gifts_V4/tree/ede2e0270555ef5c3a59e5a40454213d60cc17767/src/components/products).

### Detalhe e personalização do produto

A página de produto agrega galeria, variações, cores, técnicas e áreas de personalização, embalagem, estoque, comparação entre fontes, semelhantes, recomendações e ações móveis. O carregamento secundário é dividido em chunks, uma decisão adequada para reduzir o custo da rota inicial. O código também registra visualizações e alimenta recentemente vistos. Veja a [implementação da página de produto](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/src/pages/products/ProductDetail.tsx).

Para o Sicoob, essa riqueza deve aparecer em ordem de decisão:

1. produto e imagem;
2. preço indicativo e quantidade mínima;
3. disponibilidade por cor;
4. prazo estimado;
5. técnica e posição da marca;
6. quantidade e entrega;
7. adicionar ao orçamento.

Gráficos de vendas, confiança de fornecedor e indicadores de margem pertencem a papéis internos, não à jornada principal do comprador.

### Carrinhos, orçamento e negociação

A Promo Gifts oferece múltiplos carrinhos de vendedor, agrupamento por empresa, restauração, templates, atualização otimista, controle de versão e ações rápidas. O orçamento possui autosave, versões, concorrência, etapas, descontos, margens, personalização, contatos, entrega, PDF, aprovação e histórico.

São padrões transferíveis:

- autosave com estado visível;
- restauração segura após falha;
- guarda de concorrência e versão;
- separação entre item, personalização, entrega e condição;
- resumo fixo em desktop e acessível em mobile;
- validação de quantidade, preço e estoque antes de enviar;
- histórico e trilha de aprovação;
- geração de documento apenas com dados confirmados.

Para o Sicoob, o modelo deve convergir para **um orçamento ativo por solicitação**, com centros de custo e múltiplos destinos quando necessário. Expor vários carrinhos por fornecedor traz a lógica operacional do vendedor para quem apenas quer resolver uma campanha.

### Montador de kits

O trabalho mais recente do PR 1857 criou entrada dedicada do Kit Maker, biblioteca com capas, produtos em destaque, briefing estruturado para assistência de IA e bloqueios de produtos sem preço ou caixas incompatíveis. A persistência atômica foi integrada à `main` no PR anterior; a sequência atual ainda estava bloqueada pela CI no momento da coleta. Consulte o [PR 1857](https://github.com/adm01-debug/Promo_Gifts_V4/pull/1857).

O Sicoob deve aproveitar:

- caminhos “montar do zero” e “usar modelo”;
- modelos por ocasião, público, faixa de orçamento e quantidade;
- orçamento unitário e total sempre visíveis;
- compatibilidade entre itens, embalagem e capacidade da caixa;
- bloqueio de item sem preço consultável;
- capa visual e resumo do kit;
- persistência atômica;
- briefing estruturado antes de qualquer geração assistida.

O Sicoob não deve depender de IA para concluir um kit. A assistência deve produzir sugestões revisáveis; regras de estoque, preço, dimensão e compra permanecem determinísticas.

### Administração e inteligência

A Promo Gifts contém painéis de cadastro, usuários, funções, permissões, limites de desconto, negações RLS, auditoria, conexões, chaves, consumo de IA, telemetria, desempenho, workflows, qualidade e saúde do sistema. Essa abrangência é útil como referência operacional.

No Sicoob V2, o painel deve ser menor e organizado por responsabilidade:

- **Comprador:** catálogo, orçamento, solicitações, recompra e acompanhamento;
- **Marketing:** campanhas, kits, calendário, ativos e aprovação de arte;
- **Gestor:** verba, alçada, aprovação, unidades e indicadores;
- **Operação:** pedidos, arte, produção, entrega e exceções;
- **Administrador:** acesso, políticas, integrações, auditoria e saúde.

## Avaliação da experiência pública

### Pontos fortes do login

- composição de duas colunas clara em desktop;
- contraste visual forte entre proposta de valor e formulário;
- acabamento consistente, ícones coerentes e foco evidente no CTA;
- login por Google e senha;
- sinais de confiança próximos ao formulário;
- adaptação funcional a mobile;
- políticas e propriedade intelectual visíveis;
- headers de segurança sólidos: HSTS, CSP, proteção contra framing, política de referência e política de permissões.

### Gaps observados no login

1. **Posicionamento exagerado:** “universo”, “galáxias”, “decolar” e múltiplas exclamações combinam com um time de vendas; passam pouca sobriedade para compras institucionais.
2. **Provas sem contexto:** `+20.000 produtos` e `+100 fornecedores` não informam atualização, elegibilidade, cobertura ou metodologia.
3. **Hierarquia móvel longa:** o formulário aparece depois de toda a proposta de valor, repetindo a marca e levando a página a aproximadamente 1.676 px de altura.
4. **Acessibilidade:** a auditoria axe encontrou uma violação séria de contraste em dois links do rodapé; outros nós ficaram inconclusivos e precisam de revisão manual.
5. **Sem título principal semântico:** a versão renderizada não apresentou `h1`.
6. **Requisição pública com erro:** toda visita anônima tentou `get-visitor-info` e recebeu HTTP 403. A falha é silenciosa para a pessoa, porém cria ruído, custo e telemetria enganosa.
7. **Privacidade e necessidade:** IP e geolocalização são solicitados no carregamento, antes do envio do login. A finalidade, retenção e base de tratamento precisam estar explícitas e a chamada deveria existir somente se necessária ao controle de acesso.
8. **Carga inicial alta para autenticação:** o login carregou 43 recursos JavaScript; aproximadamente 158 KB transferidos e 487 KB decodificados de scripts, além de cerca de 57 KB transferidos e 397 KB decodificados de CSS. O total observado foi próximo de 505 KB transferidos.

As medições foram feitas em navegação automatizada e servem como perfil diagnóstico, não como métrica de campo. O tempo observado foi bom — TTFB próximo de 41 ms e `load` próximo de 570 ms — mas a quantidade de módulos reduz a margem em redes e aparelhos modestos.

### O que o Sicoob V2 deve fazer

- colocar o formulário e a recuperação de acesso acima da dobra no mobile;
- usar uma proposta curta: catálogo selecionado, orçamento, aprovação e acompanhamento;
- empregar a identidade Sicoob, linguagem cooperativa e evidências verificáveis;
- manter alvos de toque de ao menos 24 × 24 CSS px e, quando possível, 44 × 44 px; o W3C diferencia o mínimo AA de 24 px do critério ampliado de 44 px ([WCAG 2.2 — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced));
- garantir contraste mínimo aplicável e estados de foco identificáveis ([WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance));
- evitar coleta de localização no carregamento sem uma finalidade necessária e transparente;
- carregar o mínimo necessário antes da autenticação.

## Gap crítico de SEO e roteamento público

O sitemap retorna 7.801 URLs e permite explicitamente `/produto/` e `/categoria/` no `robots.txt`. Entretanto, uma URL de produto real apresentou o seguinte comportamento em 11/09/2026:

| Teste | Resultado |
|---|---|
| HTTP direto com navegador | `200`, shell genérico “Catálogo de Produtos”, sem nome do produto |
| HTTP direto com Googlebot | Mesmo HTML genérico, sem nome do produto |
| Execução da SPA | Redirecionamento para `/auth` |
| Canonical após a SPA | `/auth` |
| Robots após a SPA | `index, follow` |
| Conteúdo final | Tela de login |

O código explica o resultado: as rotas de produto estão dentro de `ProtectedRoute`, embora o sitemap as anuncie como públicas. O roteamento está em [AppRoutes](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/src/routes/AppRoutes.tsx), as regras públicas em [robots.txt](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/public/robots.txt) e a geração em [api/sitemap.ts](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/api/sitemap.ts).

Existe um worker para injetar metadados em crawlers. Mesmo quando implantado, ele entrega um documento mínimo com redirecionamento, sem a descrição, especificações e relações do produto que sustentariam a página. A documentação do Google recomenda listar no sitemap as URLs canônicas que se deseja ver nos resultados e tornar o conteúdo essencial disponível ao mecanismo de busca ([Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).

Esse modelo não deve ser levado ao Sicoob V2. O portal já foi configurado como privado, com `noindex, nofollow`, bloqueio no `robots.txt` e sem sitemap de produtos. Se futuramente existir uma vitrine pública, ela precisará de rotas realmente públicas, conteúdo renderizado, preço com política aprovada e separação explícita do portal autenticado.

## Segurança, dados e integrações

### Acertos que merecem ser preservados

- política de segurança de conteúdo sem `unsafe-eval`;
- HSTS e bloqueio de framing;
- manifesto de autorização das Edge Functions;
- testes de contratos, fuzzing, CodeQL e auditorias de configuração;
- RLS e funções transacionais para operações críticas;
- validação com Zod em múltiplas bordas;
- separação conceitual entre banco principal, catálogo externo e CRM;
- rate limiting e proteção de bots em endpoints públicos;
- trilha de auditoria e painéis de negação RLS;
- chaves privilegiadas descritas como segredos de servidor.

### Riscos atuais e recomendações

| Risco | Evidência | Aplicação no Sicoob V2 |
|---|---|---|
| Catálogo externo poder virar uma superfície de escrita | A Promo Gifts possui rotas e ferramentas administrativas de produto | Contrato, método HTTP, RPC, identidade e privilégio do banco precisam ser somente leitura |
| Chaves privilegiadas usadas para consultas amplas | Arquitetura de três Supabases e bridges | A `service_role` nunca deve ir ao cliente; RLS continua obrigatória para tabelas expostas |
| Endpoint anônimo falhando em produção | `get-visitor-info` retornou 403 em toda visita | Retirar dependência desnecessária e observar erros por endpoint |
| Duas vulnerabilidades altas em produção | `npm audit --omit=dev` apontou `image-size`, transitiva de `pptxgenjs` | Não importar a cadeia; isolar geração de documentos e manter gate de auditoria |
| Migrações não reconstruíveis ou divergentes | O próprio README reconhece 332 migrations versus 209 aplicadas em um histórico anterior; o diretório atual contém 2.982 SQLs | Tratar schema publicado como estado a reconciliar; não aplicar lote cego |
| Lógica de acesso dispersa | 124 declarações de rota e grande área administrativa | Usar política central por papel e testes negativos por rota |
| Dados internos em observabilidade | Muitos painéis administrativos e telemetria | Redação de custo, margem, fornecedor e segredos antes de retornar ao comprador |

O Supabase informa que tabelas em schemas expostos devem usar RLS e que chaves secretas ou `service_role` têm acesso elevado e pertencem apenas a componentes controlados pelo desenvolvedor ([RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [API security](https://supabase.com/docs/guides/api/securing-your-api)). A implementação local do Sicoob V2 já adicionou defesa em profundidade na bridge e redação de campos comerciais; a confirmação administrativa dos privilégios da identidade do catálogo continua obrigatória.

## Engenharia, manutenção e qualidade

### Pontos fortes

- arquitetura por domínio e lazy loading de páginas;
- TanStack Query para estado de servidor e Zustand/contextos para estado local;
- virtualização do catálogo;
- testes unitários, componentes, propriedades, fuzzing, contratos, banco e E2E;
- matrizes para navegadores, viewports e condições de falha;
- snapshots visuais e validações de acessibilidade;
- controles de concorrência e operações atômicas em carrinho, orçamento e kits;
- observabilidade de integrações e gates de implantação.

### Dívida e sinais de fragilidade

1. **Superfície muito grande:** 459 mil linhas de produção, 124 declarações de rota, 108 Edge Functions e 111 workflows exigem ownership explícito.
2. **Arquivos monolíticos:** 98 arquivos têm 600 linhas ou mais. Exemplos: tipos gerados com 64 mil linhas, estado do orçamento com 1.345, carrinhos com 1.306, `ProductCard` com 1.128 e estado do catálogo com 1.072.
3. **Componentes paralelos:** card base, card completo, linha, tabela e visualização rápida podem divergir em preço, cor, estoque e ação.
4. **Migrations em escala anormal:** 2.982 arquivos aumentam tempo de análise, risco de replay e dificuldade de distinguir história de schema efetivo.
5. **Automação redundante:** 111 workflows elevam tempo, custo e possibilidade de gates contraditórios.
6. **Testes desligados:** 551 marcadores estáticos de `skip`/`todo` reduzem a confiança no número bruto de testes. A contagem é um indicador para triagem, pois inclui ocorrências que precisam ser classificadas.
7. **Baselines tolerantes:** documentação declara que `lint` e `typecheck` aceitam dívida conhecida; o comando real completo usa outro nome. Essa convenção é fácil de interpretar incorretamente.
8. **PR atual bloqueado:** o PR 1857 estava `MERGEABLE`, porém `BLOCKED`; TypeScript falhou em `KitLibraryPage`, gates de Freight Quest foram pulados após a primeira falha, Deploy Gates terminou em falha e o status Vercel também falhou. Os demais checks não compensam o gate bloqueante ([execução do Deploy Gates](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34631316175), [Freight Quest](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34631317576)).
9. **Build não executado após falha anterior:** no workflow observado, o gate de build foi pulado quando lint/TypeScript falhou. Isso é coerente para economizar tempo, mas significa que “outros checks verdes” não comprovam artefato implantável.
10. **Dependências vulneráveis:** `pptxgenjs` traz `image-size` afetado por loops infinitos em parsers ICNS/JXL/HEIF ([GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)).

### Diretriz para o Sicoob V2

- manter uma única implementação visual por entidade e compor grade/lista/tabela a partir de um modelo de apresentação comum;
- limitar arquivos de regra e componentes, extraindo módulos quando responsabilidades se separam;
- consolidar workflows em gates por risco;
- proibir `skip` em cenários P0 sem ticket, responsável e data;
- distinguir claramente `baseline` de qualidade integral;
- versionar migrations incrementais após reconciliar o schema real;
- executar testes de contrato contra a bridge somente leitura;
- manter geração de PDF/PPTX em processo isolado, com limites de arquivo, tempo e memória.

## Matriz de transferência para o Sicoob V2

| Capacidade Promo Gifts | Decisão | Forma Sicoob |
|---|---|---|
| Busca e filtros avançados | Adotar | Busca por produto, ocasião, cor, material, preço, prazo e sustentabilidade |
| Histórico de busca | Adotar | Sugestões recentes visíveis e limpáveis |
| Grade virtualizada | Adaptar | Rolagem natural e carregamento progressivo; virtualizar apenas se o volume medido exigir |
| Cores no card | Adotar | Mostrar estoque e imagem por cor sem abrir detalhes |
| Vistos recentemente | Adotar | Barra discreta e persistência por usuário |
| Favoritos | Adotar | Coleções pessoais e de campanha |
| Comparação | Adaptar | Comparar preço indicativo, mínimo, prazo, estoque, personalização e atributos sustentáveis |
| Carrinhos por fornecedor | Não expor | Um orçamento do comprador; consolidação interna por operação |
| Orçamento versionado | Adotar | Número, versão, validade, histórico e estado de aprovação |
| Autosave | Adotar | Estado “salvo”, “salvando”, “offline” e restauração |
| Margem/markup | Restringir | Visível apenas a papéis internos autorizados |
| Simulador de preço | Adaptar | Estimativa transparente com ressalva de quantidade, gravação, frete e validade |
| Estoque futuro | Adotar | Data, quantidade, fonte da consulta e incerteza |
| Kit Maker | Adotar | Modelos Sicoob por evento, público e orçamento |
| Assistente de IA | Adaptar | Briefing estruturado, sugestões revisáveis e nenhuma aprovação autônoma |
| Mockup por IA | Adaptar | Prévia declarada como ilustrativa; versão de arte e aprovação registradas |
| Compartilhamento por WhatsApp | Adaptar | Link autenticado ou de prazo curto, sem custo/margem/fornecedor |
| PDF do orçamento | Adotar | Documento acessível, versão, validade e condições confirmadas |
| Inteligência comercial | Restringir | Dashboard por papel, sem métricas fabricadas |
| SEO de produto protegido | Rejeitar | Portal privado com `noindex`; vitrine futura em aplicação pública separada |
| Estética espacial escura | Rejeitar | Identidade Sicoob clara, acolhedora, funcional e sóbria |
| Provas de escala sem fonte | Rejeitar | Somente números medidos, com data e escopo |
| Administração extensa no menu | Rejeitar | Navegação por tarefa e papel |
| Centenas de workflows independentes | Rejeitar | Pipeline consolidado por risco e dependência |

## Jornada-alvo proposta

```mermaid
flowchart LR
    A[Entrar com identidade corporativa] --> B[Escolher objetivo da compra]
    B --> C[Pesquisar e filtrar catálogo]
    C --> D[Comparar e favoritar]
    D --> E[Configurar produto ou kit]
    E --> F[Informar quantidade, entrega e centro de custo]
    F --> G[Revisar estimativa e disponibilidade]
    G --> H[Enviar solicitação de orçamento]
    H --> I[Aprovação de verba e arte]
    I --> J[Pedido e acompanhamento]
    J --> K[Recebimento e recompra]
```

Cada etapa deve mostrar estado, responsável, próximo passo e bloqueio. O comprador não precisa compreender a topologia de fornecedores nem a implementação do banco.

## Backlog priorizado derivado do benchmark

### P0 — antes de homologação

- [ ] Expor histórico de busca com seleção e limpeza. Interface implementada; a revisão encontrou armazenamento global sem isolamento por usuário/cooperativa (A09).
- [x] Permitir entrada por faixa de orçamento no catálogo.
- [x] Compactar atalhos de intenção e orçamento no mobile.
- [x] Manter catálogo externo protegido por contrato somente leitura.
- [ ] Remover custo e margem das respostas ao comprador. A lista local não cobre `setup_cost` e `unit_cost` (A10).
- [ ] Garantir orçamento/pedido atômico com versão e idempotência. Aprovação e verba foram protegidas; criação/versionamento de orçamento ainda não são uma transação integral (A07).
- [x] Bloquear indexação do portal privado e remover sitemap provisório.
- [ ] Confirmar privilégios somente leitura da identidade no banco de catálogo.
- [ ] Executar login, busca, primeiro orçamento e aprovação em homologação real.
- [ ] Validar política de verba, alçada, arte e cancelamento com responsáveis.
- [ ] Revisar toda a jornada real por teclado, zoom 200/400% e leitor de tela.
- [ ] Definir SLA e origem do dado de preço, estoque e prazo mostrados ao comprador.

### P1 — primeira versão operacional

- [ ] Levar seleção de cor ao card com estoque por variante.
- [ ] Criar vistos recentemente por usuário.
- [ ] Ajustar comparação às dimensões de decisão Sicoob.
- [ ] Criar autosave e recuperação do orçamento com estado explícito.
- [ ] Exibir validade do preço e timestamp da consulta de estoque.
- [ ] Implementar modelos de kit por ocasião e faixa de orçamento.
- [ ] Validar capacidade de embalagem, preço e estoque do kit no servidor.
- [ ] Criar resumo fixo desktop e barra de ação mobile sem cobrir conteúdo.
- [ ] Exibir linha do tempo única de orçamento, verba, arte, pedido e entrega.
- [ ] Implementar compartilhamento seguro e expirável para aprovação.
- [ ] Adicionar métricas do funil sem dados fictícios.
- [ ] Medir Core Web Vitals no domínio de homologação.

### P2 — evolução comprovada por uso

- [ ] Recomendações por ocasião, histórico e regras comerciais explicáveis.
- [ ] Estoque futuro com níveis de confiança.
- [ ] Recompra com nova consulta de preço e disponibilidade.
- [ ] Modelos de campanha salvos pela cooperativa.
- [ ] Assistente de briefing para kits e campanhas.
- [ ] Mockup assistido com versionamento de arte.
- [ ] Entrega distribuída entre unidades com reconciliação de quantidades.
- [ ] Personalização do catálogo por cooperativa sem bifurcar código.

## Melhorias já executadas no Sicoob V2 durante esta análise

Três oportunidades de baixo risco e alto valor foram implementadas imediatamente:

1. **Histórico de buscas no cabeçalho:** botão com contagem, popover responsivo, reutilização de termo e limpeza do histórico.
2. **Faixas de orçamento:** atalhos de até R$ 25, R$ 25–50, R$ 50–100 e acima de R$ 100, com aviso de que personalização e quantidade podem alterar o valor.
3. **Navegação móvel compacta:** intenções e faixas viraram trilhos horizontais com snap, reduzindo a altura da loja demonstrativa de aproximadamente 5.228 para 4.615 px em 390 px.

As mudanças foram integradas ao catálogo real e à demonstração. Os testes focados aprovaram 9 de 9 casos, incluindo 3 novos cenários de histórico e orçamento. A auditoria visual passou em seis viewports, sem erro de navegador, violação axe ou overflow horizontal.

## Critérios de aceite para importar qualquer recurso da Promo Gifts

Uma capacidade somente entra no Sicoob V2 quando cumprir todos os itens aplicáveis:

- [ ] resolve uma tarefa observada de comprador, marketing, gestor ou operação;
- [ ] reduz ou mantém o número de decisões da jornada principal;
- [ ] usa linguagem Sicoob validada;
- [ ] respeita catálogo externo somente leitura;
- [ ] não expõe fornecedor, custo, margem ou segredo comercial;
- [ ] tem regra de autorização no servidor;
- [ ] tem estado vazio, carregando, erro, offline e recuperação;
- [ ] funciona em 320 px, teclado, zoom e leitor de tela;
- [ ] tem alvo de toque, foco e contraste verificados;
- [ ] registra eventos mínimos de funil sem dados pessoais desnecessários;
- [ ] possui teste de regra real, não apenas snapshot da implementação;
- [ ] passa typecheck, lint, testes, build e auditoria de dependências;
- [ ] tem owner, documentação operacional e rollback;
- [ ] foi homologada com dados e papéis reais antes de produção.

## Limitações da análise

- Não foi usada credencial da Promo Gifts; as telas protegidas foram analisadas pelo código, testes, documentação e grafo, não por sessão real.
- O grafo Graphify antecede o checkout atual em cerca de três semanas; todas as conclusões críticas foram conferidas em código ou produção.
- A medição de desempenho foi pontual, em navegador automatizado, sem distribuição de rede, dispositivos ou usuários.
- A auditoria axe automatizada não substitui inspeção manual e teste com tecnologia assistiva.
- O banco do catálogo não foi alterado. O banco do portal Sicoob não foi acessado nem migrado nesta análise.
- O estado do PR e da CI representa o instante da coleta e deve ser reconferido antes de qualquer nova transferência.

## Fontes

### Fontes primárias da Promo Gifts

1. [Site público Promo Gifts](https://www.promogifts.com.br/)
2. [Repositório Promo Gifts V4](https://github.com/adm01-debug/Promo_Gifts_V4)
3. [README no commit analisado](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/README.md)
4. [Roteamento protegido](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/src/routes/AppRoutes.tsx)
5. [Rotas de produto](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/src/routes/product-routes.tsx)
6. [Sitemap dinâmico](https://github.com/adm01-debug/Promo_Gifts_V4/blob/ede2e0270555ef5c3a59e5a40454213d60cc17767/api/sitemap.ts)
7. [PR 1857 — Kit Maker](https://github.com/adm01-debug/Promo_Gifts_V4/pull/1857)
8. [Deploy Gates do PR 1857](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34631316175)
9. [Freight Quest Quality Gates do PR 1857](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/34631317576)

### Normas e documentação técnica

10. [W3C — WCAG 2.2: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
11. [W3C — WCAG 2.2: aparência do foco](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)
12. [W3C — WCAG 2.2: tamanho mínimo do alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
13. [W3C — WCAG 2.2: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
14. [Google Search Central — criar e enviar sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
15. [Google Search Central — JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
16. [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
17. [Supabase — API keys](https://supabase.com/docs/guides/getting-started/api-keys)
18. [Supabase — proteção da API](https://supabase.com/docs/guides/api/securing-your-api)
19. [OWASP — Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
20. [GitHub Advisory — `image-size` ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)
21. [GitHub Advisory — `image-size` JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)
