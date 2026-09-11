# Portal de compras de brindes para cooperativas Sicoob

O projeto tem uma base extensa e aproveitável, mas ainda não oferece evidência suficiente para operar compras reais com segurança, consistência de verba e cumprimento de prazo. A direção recomendada é preservar os componentes úteis e concentrar a evolução na jornada de quem solicita, compra e aprova brindes dentro de uma cooperativa. O principal diferencial a validar é ligar campanha, arte, orçamento e entrega por PA em uma experiência simples e rastreável.

Esta análise considera o código no commit `d75459d28da0c8164c26861cd6358b147930425a`, consultas operacionais de 11 de setembro de 2026, o acervo de 13 documentos fornecidos e fontes públicas institucionais e profissionais. O banco `doufsxqlfjyuvxuezpln` é exclusivamente fonte de consulta de produtos, estoque e valores. O banco `cfmzkthhgliqelozlmwu` pertence ao portal e deve concentrar sua operação. Não houve gravação nos bancos nem implantação de código durante a análise.[^37][^38]

## 1. Decisão recomendada

**Evoluir a base existente, com uma primeira entrega pequena e completa de compra institucional.** A quantidade de telas e arquivos não corresponde à quantidade de capacidades prontas. O portal herdou conceitos de vendedor, CRM e administração de catálogo; sua evolução precisa reorganizar permissões, contratos de dados e linguagem antes de ampliar funcionalidades.

Há quatro condições para considerar o portal pronto para operação: resolver os riscos de credenciais e aprovação; tornar tecnicamente impossível escrever no catálogo externo; demonstrar acesso e isolamento com usuários de cooperativas diferentes; e completar uma compra real controlada, com arte, aprovação, faturamento e recebimento. A liberação depende de evidência desses resultados, além de domínio e ambiente de produção identificados.

As primeiras telas devem responder a perguntas concretas: o que posso comprar para esta campanha, quanto custará entregue, quem precisa aprovar, qual arte será produzida e se chegará antes do evento. Indicadores comerciais, sugestões automáticas e personalização visual só devem aparecer quando houver dados e regras que sustentem a promessa.

## 2. Estado atual do projeto

### 2.1 Escala e possibilidade de reaproveitamento

O inventário local identificou 1.862 arquivos em `src`, 485 migrations SQL e 100 diretórios de funções com `index.ts`. A extração estrutural abrangeu o corpus de código detectado; a revisão semântica documental cobriu 162 entradas do repositório, com duplicatas identificadas. O acervo externo contém 12 PDFs, somando 298 páginas, e uma planilha. Essas contagens descrevem arquivos, não funções publicadas ou funcionalidades aprovadas.

React, TypeScript, Vite, Supabase, componentes de interface e TanStack Query formam uma base que permite evolução incremental. Catálogo, filtros, kits, simulação, orçamentos, pedidos, aprovação de amostras/arte e trilhas operacionais oferecem pontos de partida. Cada módulo precisa passar pelo mesmo critério: contrato de dados consistente, autorização no servidor, comportamento demonstrado e comunicação verdadeira ao comprador.

| Capacidade existente | Aproveitamento recomendado | Condição para liberar |
|---|---|---|
| Componentes de catálogo, busca e comparação | Preservar apresentação e interação úteis | Consultas reais, variantes e preços comerciais corretos |
| Kits, simulação e orçamento | Adaptar para campanha e compra institucional | Total completo, validade e versão da proposta |
| Telas Sicoob de pedidos e aprovações | Preservar componentes, corrigir composição | Papéis coerentes e transições atômicas autorizadas |
| Aprovação de piloto/arte | Evoluir para versão exata de produção | Separação de aprovação financeira e da marca |
| Cooperativas, PAs e verbas | Reconciliar modelos existentes | Um contrato canônico, escopo e período definidos |
| Histórico, notificações e auditoria | Aproveitar infraestrutura após validação | Persistência e entrega comprovadas; erros visíveis |
| CRM, gamificação e funções comerciais legadas | Manter fora da navegação inicial do comprador | Necessidade de negócio demonstrada antes de integrar |
| Auditorias automáticas anteriores | Preservar como histórico | Substituir notas fixas por medições reproduzíveis |

O README ainda descreve uma plataforma de vendedores, enquanto documentos Sicoob e componentes usam vocabulários diferentes para as mesmas responsabilidades. Há referências a três bancos, domínios antigos e serviços que não correspondem ao contrato atual de dois bancos. A documentação deve ser corrigida junto com os módulos afetados, sem uma reescrita indiscriminada do repositório.[^37]

### 2.2 Evidências executadas

| Verificação | Resultado observado | Interpretação correta |
|---|---|---|
| `npm run build` | Falhou no gate de auditoria de dependências | O build oficial não passou |
| `npm audit` | 21 alertas: 10 altos, 10 moderados, um baixo; nenhum crítico | Mistura dependências de desenvolvimento e execução; exige triagem |
| `npx vite build` diagnóstico | Compilou em 32,43 segundos | Confirma empacotamento; não substitui os gates |
| `npm run typecheck` | 1.259 diagnósticos em 456 arquivos | Dívida preexistente; baseline registra 1.261 |
| Recorte de cinco arquivos de testes | 12 testes passaram e cinco falharam | Falhas concentradas no mock de permissões de `ProtectedRoute` |
| GitHub Actions | Execução anterior bloqueada por orçamento; no PR #3, gate de autorização e builds falharam | Evidências de momentos diferentes; detalhes no anexo de CI |
| Último deployment GitHub consultado | Tentativa Vercel de 05/09/2026 com estado de falha | Produção efetiva e tráfego não comprovados |
| Consulta de leitura à ponte externa | HTTP 200 com `_unconfigured: true` e nenhuma linha | A integração não está configurada efetivamente nesse caminho |
| Consultas anônimas limitadas a quatro tabelas do portal | HTTP 200, nenhuma linha visível | Não prova ausência de dados nem isolamento entre cooperativas |

O typecheck não piorou por arquivo em relação ao baseline consultado, mas um baseline permite acompanhar dívida, não elimina os erros. O recorte de testes não representa a suíte completa. Alguns testes chamados de integração constroem uma matriz de permissões em memória e não acessam RLS real. A execução antiga bloqueada por orçamento e as falhas posteriores do PR são eventos distintos; o [anexo de CI](anexos/ci-posterior.md) registra os logs que confirmaram o bloqueio de `migrate-helper` e dos builds.[^36][^37]

A inspeção local de uma compilação de produção mostrou acesso rápido de teste exposto no login, perfis com erro, botão de correção, logo externa sem carregar e botão Google embora o provedor esteja desativado na configuração consultada. O cadastro público também está desativado. A tela móvel de login não apresentou rolagem horizontal na largura de 390 px; isso não equivale a uma auditoria móvel de todas as jornadas.

### 2.3 Bloqueadores técnicos

| Prioridade | Achado | Base da evidência | Ação necessária |
|---|---|---|---|
| P0 | `migrate-helper` pode devolver credenciais privilegiadas | Código e configuração versionados; endpoint não invocado | Verificar publicação e histórico; remover capacidade e tratar credenciais conforme exposição constatada |
| P0 | Bridge permite CRUD no catálogo externo | Lista de operações e autorização no código | Restringir serviço e identidade externa a leitura |
| P0 | RPCs de aprovação/rejeição não validam internamente ator, cooperativa e vínculo pedido/requisição | Migrations com `SECURITY DEFINER` e concessão a `authenticated` | Corrigir autorização e atomicidade; verificar estado efetivamente aplicado |
| P0 | Guards de rotas usam contratos e papéis incompatíveis | `App`, `AdminRoute`, `SicoobRoute` e `AuthContext` | Unificar contrato e validar composição com sessões reais |
| P0 | Consulta do catálogo sem configuração efetiva | Resposta observada do backend | Configurar o destino correto com credencial de leitura e contrato validado |
| P1 | Verba e pedidos usam tabelas/campos e papéis divergentes | Serviços, migrations, tipos e telas | Consolidar modelo, saldo e transações concorrentes |
| P1 | Relatórios geram cobertura e conformidade sem medições correspondentes | Scripts com percentuais e estados fixos | Remover resultados artificiais e vincular evidência à execução |
| P1 | Passkey e push apresentam sucesso incompleto | Fluxos no código | Integrar autenticação/entrega reais ou retirar a opção até funcionar |

Os achados de segurança são defeitos ou riscos confirmados no código. A existência e exploração desses caminhos em produção não foram demonstradas. A correção precisa incluir inventário de funções publicadas, grants e policies reais, sem imprimir segredos e sem executar chamadas destinadas a extraí-los. RLS habilitada e `search_path` definido, isoladamente, não validam a autorização de uma função privilegiada.[^34][^35]

Os anexos técnicos registram caminhos, linhas, contradições e limites por achado. O login também contém alegações como “catálogo oficial”, estoque em tempo real e números de produtos/fornecedores sem comprovação nesta análise. Essas afirmações precisam de origem verificável antes de publicação.

## 3. Contexto Sicoob e implicações de compra

### 3.1 Estrutura e autonomia

A página institucional consultada apresenta 10,2 milhões de cooperados, mais de 4,7 mil pontos de atendimento e 14 centrais. Distingue cooperativas singulares, centrais e Centro Cooperativo Sicoob. Essa estrutura dá escala potencial à distribuição, mas não permite tratar o sistema inteiro como um comprador único. Os contadores são uma fotografia da página, não estimativa de mercado de brindes ou orçamento de marketing.[^1]

O desenho recomendado separa organização contratante, unidades de atendimento, centros de custo e papéis funcionais. Uma pessoa de marketing pode estar na Singular e aprovar a marca sem poder aprovar despesa. Uma Central só deve visualizar dados de Singulares quando houver vínculo e autorização explicitamente configurados. Hierarquia institucional não implica acesso irrestrito automático.

### 3.2 Políticas locais demonstram diferenças relevantes

| Fonte e período | Evidência específica | Consequência para configuração |
|---|---|---|
| Coopemata, fevereiro/2023 | Cita portal BR Supply; normalmente prevê três cotações e fluxo administrativo | Suportar anexos de comparação e exceções justificadas |
| Credesp, janeiro/2023 | Atribui brindes e materiais de divulgação a Marketing; contempla autorização e janelas | Configurar responsáveis por categoria e período de solicitação |
| União Centro-Oeste, junho/2021 | Prevê duas cotações, critérios de seleção e registros no SISBR | Quantidade de propostas e integração não podem ser fixas |
| Sicoob Centro, manual fornecido | Solicita proposta completa e considera fornecedores locais, cooperados e critérios socioambientais | Cadastro e avaliação de fornecedor precisam de evidência e contexto local |

Essas fontes são políticas de entidades específicas, com datas diferentes; não constituem uma regra sistêmica vigente única. A publicação na internet não confirma que não houve revisão posterior. Preferências por fornecedores cooperados ou regionais devem ser parametrizadas e justificadas, sem substituir critérios técnicos e comerciais. Não há base para fixar uma alçada nacional, exigir sempre três propostas ou impor o mesmo calendário a todas as cooperativas.[^2][^3][^4][^5]

O portal deve registrar qual versão da política rege a solicitação. Alterar uma regra hoje não pode reescrever a justificativa de um pedido aprovado ontem. Exceções precisam indicar motivo, aprovador autorizado e anexos, com histórico que o comprador consiga consultar.

### 3.3 Campanhas e sazonalidade

Há exemplos públicos de pré-assembleias com escolha de brinde e retirada em agência, ações com produtos regionais e campanhas sujeitas à disponibilidade. No Integrado, a campanha de março/2026 oferece alternativas de brinde; no Crediauc aparecem itens como kits de chimarrão e caixas térmicas. Esses casos sustentam curadoria por contexto e logística por unidade, sem demonstrar preferência universal de todos os cooperados.[^11][^12][^13]

A taxonomia inicial proposta é: assembleias e relacionamento; ações comerciais autorizadas; inaugurações e presença regional; eventos e feiras; endomarketing; datas comemorativas; e ações sociais ou educacionais. É uma organização de produto a validar, não calendário oficial nacional. Cada campanha deve ter objetivo, público, responsável, data limite, identidade aplicável e distribuição planejada.

## 4. Compradores e profissionais de marketing

O levantamento qualitativo reuniu 15 perfis públicos: sete de compras, suprimentos ou logística; sete de marketing, comunicação ou criação; e um de estratégia e negócios. A amostra é intencional, não representativa. Parte do LinkedIn só estava acessível por conteúdo indexado, e vínculos atuais e alçadas pessoais não foram verificados. O anexo apresenta cada referência e distingue evidência profissional de hipótese de uso.

Compras aparece associada a comparação de propostas, custo total, negociação, fornecedores e acompanhamento documental. Marketing aparece ligada a marca, campanhas, adaptação de peças, eventos e coordenação com unidades. Anúncios institucionais corroboram essas atribuições, mas alguns são históricos ou expirados. Não houve entrevistas, acesso a áreas privadas nem contato com os profissionais.[^14][^15][^16]

| Perfil funcional proposto | Trabalho que precisa concluir | Informação decisiva | Critério inicial de sucesso |
|---|---|---|---|
| Solicitante de PA | Pedir material adequado dentro do prazo e da autorização | Elegibilidade, quantidade, saldo e data de entrega | Solicitação completa sem ajuda externa |
| Compras da cooperativa | Comparar e contratar com justificativa | Total entregue, validade, fornecedor e condições | Menos devoluções por orçamento incompleto |
| Marketing | Garantir adequação da campanha e aplicação da marca | Arte, material, técnica, escala e público | Produção usa exatamente a versão aprovada |
| Aprovador de despesa | Autorizar compromisso dentro da alçada | Saldo, custo total, justificativa e exceções | Decisão rastreável e sem aprovar o próprio pedido quando vedado |
| Operação/financeiro | Conciliar pedido, entregas, documentos e cobrança | Quantidades recebidas, NF e pendências | Divergências identificadas antes do encerramento |

A síntese profissional não autoriza prever personalidade ou comportamento individual. As oportunidades acima são hipóteses de produto a validar com responsáveis reais das cooperativas piloto. O roteiro de entrevistas e teste de tarefas está no anexo de perfis.

## 5. Concorrência e padrão mínimo de mercado

A BR Supply anuncia controles por centro de custo, orçamento, alçadas, destinos, acompanhamento, notificações e relatórios, além de mecanismos para pedidos recorrentes e integração. Isso estabelece um referencial funcional de compra corporativa. Condições comerciais divulgadas são vinculadas ao acordo de fornecimento; não significam gratuidade irrestrita nem preço contratado pelo Sicoob.[^6]

A marca Sicoob aparece entre os clientes divulgados, e o regulamento da Coopemata cita a BR Supply. Isso comprova uma relação documentada, sem demonstrar exclusividade ou contrato uniforme para todo o sistema. Um caso publicado de Sodexo inclui presentes personalizados, portanto personalização, sozinha, não é uma diferenciação inédita.[^2][^7][^8]

| Dimensão | Evidência disponível | Exigência para o portal |
|---|---|---|
| Governança de compra | BR Supply anuncia verba, centro de custo e alçadas | Paridade funcional antes de competir pela experiência |
| Execução e acompanhamento | Manuais fornecidos mostram entrega parcial, documentos e atendimento | Pedido deve continuar útil depois da aprovação |
| Personalização | Caso público BR Supply inclui presentes personalizados | Melhorar clareza, aprovação e previsibilidade; validar vantagem |
| Catálogo segmentado | Pratic Brindes mantém oferta voltada ao Sicoob | Identidade visual e catálogo de brindes são ponto de partida |
| Campanha e distribuição | Exemplos Sicoob mostram contextos e destinos diversos | Integrar campanha, arte, orçamento e unidades numa jornada |
| Recompra | Referencial permite repetição de pedidos | Revalidar preço, disponibilidade, arte e prazo antes de confirmar |

A loja Pratic observada ajuda a comparar categorias e linguagem segmentada; páginas públicas não permitem concluir que faltem alçadas ou funções internas. O endereço Shopcoopera da planilha não pôde ser inspecionado com confiabilidade. Não foram realizados pedidos, login em portais de terceiros ou comparação contratual de SLA.[^9][^38]

Nos documentos fornecidos, UFMA, IFRO, IFSULDEMINAS, SAPORE e Magazine Luiza têm fluxos e calendários próprios. O manual do Almoxarifado Virtual Nacional exclui personalizados de seu escopo. São referências de operação, sem equivaler ao processo de brindes Sicoob. O catálogo de final de ano termina sua validade em outubro/2017 e apresenta conflito entre código e descrição; preços, estoque e identificadores não devem ser importados sem reconciliação.[^38]

## 6. Portal proposto

### 6.1 Navegação e prioridades

A navegação inicial deve oferecer **Início, Catálogo, Campanhas e artes, Solicitações, Aprovações, Pedidos e entregas, Verbas e relatórios**. Cada pessoa vê apenas as entradas compatíveis com sua responsabilidade. Configuração de integrações e administração técnica ficam em área restrita aos operadores autorizados.

No início, mostrar pendências acionáveis: arte aguardando revisão, pedido devolvido, orçamento perto do vencimento, entrega com divergência e saldo do período. Métricas sem origem devem ser omitidas. O nome da cooperativa e a unidade ativa precisam estar visíveis, especialmente para pessoas com múltiplos vínculos.

No catálogo, priorizar busca por finalidade, faixa de valor entregue estimado, quantidade, data necessária, técnica de personalização e disponibilidade. Material, dimensões, cores, embalagem, mínimo, múltiplo e limitações de impressão precisam estar claros. Um selo ambiental requer documento e critério; não deve nascer apenas da palavra “ecológico” na descrição.

### 6.2 Jornada completa

**Campanha ou necessidade → seleção e distribuição → proposta versionada → aprovação da arte e da despesa → liberação de produção → entregas por PA → recebimento e conciliação.**

1. **Definir a necessidade.** Informar campanha, objetivo, público, data do evento, quantidade, verba/centro de custo e destinos. Uma compra simples pode usar um formulário curto; uma campanha com várias unidades expande a distribuição.
2. **Selecionar e simular.** Mostrar preço base, personalização, preparação, embalagem, impostos aplicáveis e frete. Separar estimativa de proposta firme. Não prometer estoque reservado durante consulta.
3. **Formalizar proposta.** Guardar versão, validade, condições, itens e cronograma. Permitir anexar propostas externas quando a política local exigir comparação; registrar justificativa quando não houver alternativas.
4. **Aprovar arte e despesa.** Fluxos distintos, com responsável, data, versão e comentário. A ordem entre eles pode variar por política; produção só é liberada quando todos os pré-requisitos aplicáveis estiverem satisfeitos.
5. **Executar e acompanhar.** Mostrar etapas comprovadas, dependência de arte/pagamento quando contratual, transportadora e previsão por destino. Alterações relevantes reabrem a aprovação correspondente.
6. **Receber e conciliar.** Confirmar quantidade, qualidade, divergência, documentos e resolução. Um pedido com três entregas não pode parecer concluído quando apenas uma chegou.
7. **Recomprar.** Criar nova proposta a partir do histórico, mantendo referência à anterior e exigindo revalidação comercial e técnica.

### 6.3 Exemplo de cenário de aceite

Uma cooperativa planeja 600 kits para um evento, distribuídos em três PAs. O solicitante informa a data, a distribuição e a verba; compras compara propostas completas; marketing aprova a arte na versão 3; o aprovador autoriza o custo final. Se a quantidade ou a arte mudar, o sistema informa qual aceite perdeu validade.

Quando duas entregas chegarem e a terceira estiver atrasada, o pedido permanece parcialmente recebido, com saldo de unidades e ocorrência visíveis. O histórico precisa permitir reconstruir quem aprovou, o que foi contratado e o que efetivamente foi recebido. Quantidades e papéis desse exemplo são dados fictícios de teste, não regra Sicoob.

## 7. Arquitetura e contrato dos dois bancos

### 7.1 Responsabilidades

| Domínio | Fonte de verdade recomendada | Regra |
|---|---|---|
| Produto mestre, variante, estoque e valor de origem | Banco de catálogo `doufsxqlfjyuvxuezpln` | Somente consulta, sem efeitos colaterais |
| Identidade, vínculo e permissões do portal | Banco próprio `cfmzkthhgliqelozlmwu` | Autenticação e autorização verificadas no servidor |
| Cooperativa, PA, centro de custo e política | Banco próprio | Escopo explícito e configuração versionada |
| Campanhas, artes e aprovação | Banco próprio e armazenamento privado do portal | Versões imutáveis quando aprovadas |
| Proposta, pedido, verba e entrega | Banco próprio | Transações, idempotência e trilha de eventos |
| Registro histórico do produto comprado | Snapshot no banco próprio | Preservar especificação e preço aceitos sem alterar o catálogo |

O navegador consulta um serviço do portal; esse serviço lê apenas tabelas/visões e campos autorizados no catálogo. O controle precisa existir tanto na API quanto na credencial do banco ou serviço de origem. Lista de RPCs também exige revisão: uma função chamada por `SELECT` pode gravar dados. Não basta ocultar botões de edição.[^35]

A integração deve distinguir dado indisponível, falha de configuração, falta de permissão e catálogo vazio. Na resposta observada, `_unconfigured: true` não significa ausência de produtos no banco mestre. Cache deve informar horário e expiração; dado vencido pode permitir consulta identificada como tal, mas não confirmação automática de proposta.

### 7.2 Contrato comercial e qualidade de dados

O primeiro contrato precisa mapear identificador estável, variante, unidade, preço de origem, moeda, vigência, disponibilidade, mínimo, múltiplo, fornecedor e última atualização. Deve distinguir custo de aquisição de preço de venda; o campo “valor” não é suficiente para liberar checkout. Personalização, frete e tributos podem exigir regras próprias do portal, com validade e aprovação comercial.

Estoque consultado não é reserva. Como o banco externo permanece somente leitura, o portal não pode prometer baixa ou bloqueio de estoque nele. A primeira operação deve tratar disponibilidade como informação sujeita a reconfirmação por processo autorizado; futura reserva dependerá de serviço e escopo explicitamente definidos, sem inserir escrita disfarçada nessa integração.

Na proposta aprovada, gravar uma fotografia dos itens, descrições, variantes, valores e condições. Uma atualização posterior no catálogo não altera o pedido histórico. Produtos inativos, variantes ausentes ou mudança de preço devem produzir pendência explícita na recompra.

### 7.3 Autorização, verba e eventos

Definir permissões por ação e escopo: consultar, solicitar, editar, aprovar arte, aprovar despesa, cancelar, receber, administrar e auditar. Identidade e cooperativa do ator devem vir da sessão e dos vínculos persistidos, não de um `manager_id` ou `organization_id` arbitrário enviado pelo cliente. Testar negação entre cooperativas é tão necessário quanto testar a jornada permitida.[^34]

Verba precisa separar planejado, reservado, comprometido e consumido, por período e centro de custo. A transição que aprova uma compra deve verificar saldo e registrar o compromisso na mesma transação. Duas aprovações simultâneas, reenvio da mesma solicitação e cancelamento devem produzir resultado consistente, sem duplicidade nem saldo negativo indevido.

Cada evento relevante deve carregar identificador, ator, entidade, versão, data e resultado. Auditoria de decisões pertence ao fluxo transacional. Notificações são consequência desse evento; falha de envio precisa ser registrada e repetida com controle, sem desfazer silenciosamente uma aprovação nem anunciar entrega inexistente.

## 8. Identidade visual e experiência

O guia de março/2023 consultado apresenta turquesa `#00AE9D`, verde escuro `#003641` e branco como base; `#C9D200`, `#7DB61C` e `#49479D` como apoio. Indica Asap como família institucional e orientações de substituição. A própria tabela diverge entre RGB e HEX do turquesa: a especificação digital deve confirmar o padrão vigente com o responsável pela marca, sem conversão silenciosa.[^10]

Para o portal, a proposta é usar fundo claro, texto predominantemente escuro, títulos objetivos, hierarquia de preço/prazo e fotografias consistentes. Cor deve apoiar ações e estados, sem substituir rótulos. A marca precisa de arquivo autorizado e hospedagem controlada, evitando uma logo externa quebrada no acesso.

| Combinação digital calculada | Contraste aproximado | Uso proposto |
|---|---:|---|
| Branco sobre `#00AE9D` | 2,78:1 | Não usar em texto normal de botão |
| `#003641` sobre `#00AE9D` | 4,70:1 | Texto normal pode atingir AA nessa combinação |
| Branco sobre `#003641` | 13,09:1 | Boa base para ações principais |
| `#003641` sobre `#C9D200` | 7,92:1 | Apoio com texto escuro |

Os cálculos usam luminância relativa dos HEX indicados e não representam aprovação visual de toda a interface. WCAG exige ao menos 4,5:1 para texto normal e 3:1 para texto grande, com exceções específicas. O aceite deve incluir foco visível, teclado, mensagens de erro associadas ao campo, ampliação, leitores de tela e estados de carregamento. A tela de login observada usa texto branco de 16 px sobre um turquesa próximo e precisa de ajuste.[^32][^33]

## 9. Plano de evolução e critérios de saída

O plano está organizado por dependências e evidências, sem estimativa de prazo contratual antes da validação de acesso, schema e capacidade da equipe. O backlog acompanha esta análise em formato editável, com prioridades e critérios de aceite. P0 significa bloqueador do piloto; P1, requisito da primeira compra completa; P2, evolução após aprendizado operacional.

| Etapa | Entrega concreta | Critério para avançar |
|---|---|---|
| 0. Conter riscos e identificar ambiente | Funções, credenciais, bancos, domínio e deploy reconciliados | Sem exposição conhecida pendente; destino e responsáveis confirmados |
| 1. Tornar a base confiável | Leitura real do catálogo, autenticação, escopo e contratos | Sessões por papel, isolamento entre cooperativas e gates executados |
| 2. Completar a jornada piloto | Proposta, arte, despesa, pedido, distribuição e recebimento | Cenário completo com exceção, cancelamento e concorrência validados |
| 3. Operar com uma cooperativa piloto | Compra real acompanhada e suporte ativo | Produção com tráfego real, documentação e recebimento conciliados |
| 4. Expandir com configuração | Segunda cooperativa com política diferente | Variação suportada sem copiar telas ou regras por cliente |

Correções devem ser pequenas e revisáveis. O baseline de TypeScript pode apoiar a redução gradual da dívida, mas os módulos críticos da jornada não devem depender de erros conhecidos. Atualizações de dependências precisam considerar versões, alcance e regressões; um comando automático com mudanças incompatíveis não é plano de correção.

A validação mínima inclui: usuário de uma cooperativa tentando ler ou aprovar pedido de outra; aprovador forjado; alteração de arte depois do aceite; duas aprovações disputando saldo; catálogo indisponível; orçamento expirado; entrega parcial; duplicação de requisição; e recuperação de uma notificação que falhou. Testes com escrita devem usar ambiente e massa segregados, não o catálogo mestre.

## 10. Métricas e decisões ainda necessárias

Medir conversão da solicitação em proposta completa, tempo até aprovação de arte, tempo até aprovação de despesa, retrabalho por causa, cumprimento da data contratada, divergências de entrega e recompra concluída. Cada indicador precisa de evento de origem, denominador, período e responsável. Não existe baseline confiável nesta análise; metas numéricas devem ser definidas após a primeira operação observada.

O tamanho do sistema Sicoob não permite calcular receita potencial de brindes sem gasto por cooperativa, frequência, participação de fornecedores e elegibilidade comercial. Tampouco as publicações de marketing demonstram causalidade entre brinde e resultado financeiro. O piloto deve produzir evidência de redução de trabalho e previsibilidade antes de sustentar projeções comerciais.

As decisões de negócio pendentes são: cooperativas piloto e responsáveis; política vigente e alçadas de cada uma; autorização e ativos atuais de marca; quem vende, fatura e atende; origem do preço comercial e regras de personalização/frete; condição de pagamento e reconfirmação de estoque; operação de produção e transporte; e necessidade de exportação ou integração homologada com ERP/SISBR. A existência de uso do SISBR em uma política não comprova API pública ou autorização de integração.[^4]

A análise não substitui auditoria contábil, teste de intrusão, homologação da marca ou aceite de produção. Não houve login com compradores reais, acesso administrativo seguro aos dois schemas nem confirmação de tráfego. Os anexos preservam essa distinção e fornecem evidências suficientes para iniciar as correções e o desenho do piloto sem descartar o investimento já realizado.

## Fontes

As referências numeradas abaixo identificam a fonte exata e sua limitação. O inventário completo está em `fontes.csv` e `fontes.json`; os 15 perfis têm referências individuais no anexo profissional. Documentos locais são identificados por nome, página ou seção nos anexos, sem endereço público inventado.

<!-- FONTES_GERADAS -->

1. Sicoob. [Sistema Sicoob](https://www.sicoob.com.br/web/sicoob/sistema-sicoob). Página institucional sem data editorial. Consulta: 11/09/2026. Contadores atuais não devem ser combinados com balanços de outros períodos.

2. Sicoob Coopemata. [Regulamento interno de fornecedores — 2ª edição](https://www.sicoob.com.br/documents/2344927/157115247/regulamento-interno-de-fornecedores.pdf). 2023-02-27. Consulta: 11/09/2026. Documento de uma cooperativa; vigência atual não confirmada.

3. Sicoob Credesp. [Política de compras](https://www.sicoob.com.br/documents/16988371/72409350/Pol%C3%ADtica%2Bde%2BCompras%2B2023.01.09.pdf/a697d627-f3ef-b016-a893-8de60ba6b531?download=true&t=1753725009710). 2023-01-09. Consulta: 11/09/2026. Não é política única de todo o Sicoob.

4. Sicoob União Centro-Oeste. [Política de gestão de compras e fornecedores](https://www.sicoob.com.br/documents/2442568/72810281/POL%C3%8DTICA%2BDE%2BGEST%C3%83O%2BDE%2BCOMPRAS%2BE%2BFORNECEDORES.pdf/20df1f05-7646-26c4-b86c-31b60391b737?download=true&t=1639579966390&version=1.0). 2021-06-23. Consulta: 11/09/2026. Histórica e local; não comprova API disponível.

5. Sicoob Centro. Manual do fornecedor — arquivo local: Manual-do-Fornecedor-SICOOB-Centro-1.pdf. Metadados do PDF: 2021-08-12. Consulta: 11/09/2026. Fonte fornecida; regras locais, não sistêmicas.

6. BR Supply. [Portal Intra E-Commerce](https://www.brsupply.com.br/gestao-de-suprimentos/portal-intra-e-commerce). Página comercial sem data editorial. Consulta: 11/09/2026. Declaração do fornecedor; sem teste autenticado ou contrato específico.

7. BR Supply. [Cases e clientes](https://www.brsupply.com.br/gestao-de-suprimentos/cases-e-clientes). Página comercial sem data editorial. Consulta: 11/09/2026. Não comprova abrangência nacional nem exclusividade.

8. BR Supply. [Líder global em alimentação corporativa e facilities é case de sucesso](https://www.brsupply.com.br/gestao-de-suprimentos/cases-e-clientes/lider-global-em-alimentacao-corporativa-e-facilities-e-case-de-sucesso-na-gestao-de-suprimentos-corporativos). Página sem data editorial. Consulta: 11/09/2026. Não generalizar o contrato ou SLA desse cliente.

9. Pratic Brindes. [Loja Sicoob](https://sicoob.praticbrindes.com.br/). Página comercial sem data editorial. Consulta: 11/09/2026. Não comprova homologação institucional nem funções após login.

10. Sicoob; cópia hospedada no Portal Credicope. [Guia da marca Sicoob](https://portalcredicope.com.br/uploads/DOCUMENTOS/GUIA_DA_MARCA_-SICOOB_marco_23.pdf). 2023-03. Consulta: 11/09/2026. Versão vigente em 2026 não confirmada; RGB e HEX turquesa divergem na própria tabela.

11. Sicoob Integrado. [Pré-assembleia 2026](https://www.sicoob.com.br/web/sicoobintegrado/pre-assembleia). 2026-03-25. Consulta: 11/09/2026. Exemplo local; regras da campanha não devem virar padrão universal.

12. Sicoob Crediauc. [Pré-assembleia digital: votação segue até 12 de abril](https://www.sicoob.com.br/web/sicoobcrediauc/noticias/-/asset_publisher/xAioIawpOI5S/content/sicoob-crediauc-realiza-pr%C3%A9-assembleia-digital-vota%C3%A7%C3%A3o-segue-aberta-at%C3%A9-dia-12-de-abril). 2026-04-08. Consulta: 11/09/2026. Não é pesquisa representativa de preferências.

13. Sicoob Credimepi. [Integralizou, ganhou 2026](https://www.sicoob.com.br/web/sicoobcredimepi/noticias/-/asset_publisher/xAioIawpOI5S/content/integralizou-ganhou-2026). 2026. Consulta: 11/09/2026. Não abrange regras de outras campanhas.

14. Sicoob / LinkedIn. [Estágio em suprimentos](https://br.linkedin.com/jobs/view/est%C3%A1gio-em-suprimentos-at-sicoob-4382154873). Data editorial não confirmada. Consulta: 11/09/2026. Anúncio indexado; acesso direto redirecionou para vaga expirada.

15. Sicoob UniCentro BR / LinkedIn. [Analista de marketing — designer](https://br.linkedin.com/jobs/view/analista-de-marketing-designer-at-sicoob-unicentro-br-4438708243). Data editorial não confirmada. Consulta: 11/09/2026. Anúncio público indexado, sem confirmação de vaga aberta.

16. Sicoob Credicitrus / LinkedIn. [Oportunidade na sede administrativa — compras](https://pt.linkedin.com/posts/sicoob-credicitrus_oportunidade-de-atua%C3%A7%C3%A3o-na-sede-administrativa-activity-7085215757034225664-ixfB). Publicação histórica, aproximadamente 2023. Consulta: 11/09/2026. Usada para atribuições; não para contratação atual.

17. LinkedIn / autor do perfil. [Perfil e publicações públicas de Valdir Farias](https://br.linkedin.com/in/valdir-farias). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

18. LinkedIn / autor do perfil. [Perfil e publicações públicas de Flávio dos Santos](https://br.linkedin.com/in/flaviosantoss23). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

19. LinkedIn / autor do perfil. [Perfil e publicações públicas de Renato Alves da Silva](https://br.linkedin.com/in/renatoalvesdasilva). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

20. LinkedIn / autor do perfil. [Perfil e publicações públicas de Stephany Vieira](https://br.linkedin.com/in/stephany-vieira-3a329177). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

21. LinkedIn / autor do perfil. [Perfil e publicações públicas de Rafael Buglioli](https://br.linkedin.com/in/rafael-buglioli-1a034335). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

22. LinkedIn / autor do perfil. [Perfil e publicações públicas de Daniel Costa](https://br.linkedin.com/in/danielcosta98). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

23. LinkedIn / autor do perfil. [Perfil e publicações públicas de Valternan Lopes](https://br.linkedin.com/in/valternan-lopes-067a7b90). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

24. LinkedIn / autor do perfil. [Perfil e publicações públicas de Tassiana Sousa](https://br.linkedin.com/in/tassiana-sousa). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

25. LinkedIn / autor do perfil. [Perfil e publicações públicas de Michelle Maria](https://br.linkedin.com/in/michelle-maria-27362b146). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

26. LinkedIn / autor do perfil. [Perfil e publicações públicas de Priscilla Rezende](https://br.linkedin.com/in/priscilla-rezende-38441260). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

27. LinkedIn / autor do perfil. [Perfil e publicações públicas de Ilana Dutra](https://br.linkedin.com/in/ilanadutra). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

28. LinkedIn / autor do perfil. [Perfil e publicações públicas de Michael Nathan](https://br.linkedin.com/in/michaelnathann). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

29. LinkedIn / autor do perfil. [Perfil e publicações públicas de Morgana G. Ramos](https://br.linkedin.com/in/morganaramos). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

30. LinkedIn / autor do perfil. [Perfil e publicações públicas de Patricia M.](https://br.linkedin.com/in/patriciamrxa). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

31. LinkedIn / autor do perfil. [Perfil e publicações públicas de Danielle Rocha](https://br.linkedin.com/in/daniellecrocha). Conteúdo de períodos diversos. Consulta: 11/09/2026. Amostra qualitativa pública indexada; sem entrevista, verificação de cargo atual ou alçada individual.

32. W3C WAI. [Understanding Success Criterion 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum). Documentação técnica corrente. Consulta: 11/09/2026. Cálculo local não substitui auditoria integral de acessibilidade.

33. W3C. [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/). Recomendação WCAG 2.2. Consulta: 11/09/2026. Conformidade requer verificar todos os critérios aplicáveis, não só contraste.

34. Supabase. [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). Documentação técnica corrente. Consulta: 11/09/2026. Não prova configuração dos projetos analisados.

35. Supabase. [Database Functions](https://supabase.com/docs/guides/database/functions). Documentação técnica corrente. Consulta: 11/09/2026. Não prova quais migrations foram aplicadas.

36. GitHub / Brindes_Sicoob_V2. [Execução de CI 33192891133](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/33192891133). Consultada em 2026-09-11. Consulta: 11/09/2026. Repositório privado; falha de orçamento não é teste de código.

37. Brindes_Sicoob_V2. [Código auditado](https://github.com/adm01-debug/Brindes_Sicoob_V2/tree/d75459d28da0c8164c26861cd6358b147930425a). Commit d75459d28da0c8164c26861cd6358b147930425a. Consulta: 11/09/2026. Não equivale ao código efetivamente publicado.

38. Diversos; inventário no Anexo A. Acervo documental fornecido — arquivo local: Brindes Sicoob V2 - Docs. Diversas, incluindo 2007, 2017, 2019 e 2021. Consulta: 11/09/2026. Histórico; não importar preços, SLA, regras de outro cliente ou contatos como atuais.

[^1]: Sicoob. [Sistema Sicoob](https://www.sicoob.com.br/web/sicoob/sistema-sicoob). Página institucional sem data editorial. Consulta: 11/09/2026. Contadores atuais não devem ser combinados com balanços de outros períodos.
[^2]: Sicoob Coopemata. [Regulamento interno de fornecedores — 2ª edição](https://www.sicoob.com.br/documents/2344927/157115247/regulamento-interno-de-fornecedores.pdf). 2023-02-27. Consulta: 11/09/2026. Documento de uma cooperativa; vigência atual não confirmada.
[^3]: Sicoob Credesp. [Política de compras](https://www.sicoob.com.br/documents/16988371/72409350/Pol%C3%ADtica%2Bde%2BCompras%2B2023.01.09.pdf/a697d627-f3ef-b016-a893-8de60ba6b531?download=true&t=1753725009710). 2023-01-09. Consulta: 11/09/2026. Não é política única de todo o Sicoob.
[^4]: Sicoob União Centro-Oeste. [Política de gestão de compras e fornecedores](https://www.sicoob.com.br/documents/2442568/72810281/POL%C3%8DTICA%2BDE%2BGEST%C3%83O%2BDE%2BCOMPRAS%2BE%2BFORNECEDORES.pdf/20df1f05-7646-26c4-b86c-31b60391b737?download=true&t=1639579966390&version=1.0). 2021-06-23. Consulta: 11/09/2026. Histórica e local; não comprova API disponível.
[^5]: Sicoob Centro. Manual do fornecedor — arquivo local: Manual-do-Fornecedor-SICOOB-Centro-1.pdf. Metadados do PDF: 2021-08-12. Consulta: 11/09/2026. Fonte fornecida; regras locais, não sistêmicas.
[^6]: BR Supply. [Portal Intra E-Commerce](https://www.brsupply.com.br/gestao-de-suprimentos/portal-intra-e-commerce). Página comercial sem data editorial. Consulta: 11/09/2026. Declaração do fornecedor; sem teste autenticado ou contrato específico.
[^7]: BR Supply. [Cases e clientes](https://www.brsupply.com.br/gestao-de-suprimentos/cases-e-clientes). Página comercial sem data editorial. Consulta: 11/09/2026. Não comprova abrangência nacional nem exclusividade.
[^8]: BR Supply. [Líder global em alimentação corporativa e facilities é case de sucesso](https://www.brsupply.com.br/gestao-de-suprimentos/cases-e-clientes/lider-global-em-alimentacao-corporativa-e-facilities-e-case-de-sucesso-na-gestao-de-suprimentos-corporativos). Página sem data editorial. Consulta: 11/09/2026. Não generalizar o contrato ou SLA desse cliente.
[^9]: Pratic Brindes. [Loja Sicoob](https://sicoob.praticbrindes.com.br/). Página comercial sem data editorial. Consulta: 11/09/2026. Não comprova homologação institucional nem funções após login.
[^10]: Sicoob; cópia hospedada no Portal Credicope. [Guia da marca Sicoob](https://portalcredicope.com.br/uploads/DOCUMENTOS/GUIA_DA_MARCA_-SICOOB_marco_23.pdf). 2023-03. Consulta: 11/09/2026. Versão vigente em 2026 não confirmada; RGB e HEX turquesa divergem na própria tabela.
[^11]: Sicoob Integrado. [Pré-assembleia 2026](https://www.sicoob.com.br/web/sicoobintegrado/pre-assembleia). 2026-03-25. Consulta: 11/09/2026. Exemplo local; regras da campanha não devem virar padrão universal.
[^12]: Sicoob Crediauc. [Pré-assembleia digital: votação segue até 12 de abril](https://www.sicoob.com.br/web/sicoobcrediauc/noticias/-/asset_publisher/xAioIawpOI5S/content/sicoob-crediauc-realiza-pr%C3%A9-assembleia-digital-vota%C3%A7%C3%A3o-segue-aberta-at%C3%A9-dia-12-de-abril). 2026-04-08. Consulta: 11/09/2026. Não é pesquisa representativa de preferências.
[^13]: Sicoob Credimepi. [Integralizou, ganhou 2026](https://www.sicoob.com.br/web/sicoobcredimepi/noticias/-/asset_publisher/xAioIawpOI5S/content/integralizou-ganhou-2026). 2026. Consulta: 11/09/2026. Não abrange regras de outras campanhas.
[^14]: Sicoob / LinkedIn. [Estágio em suprimentos](https://br.linkedin.com/jobs/view/est%C3%A1gio-em-suprimentos-at-sicoob-4382154873). Data editorial não confirmada. Consulta: 11/09/2026. Anúncio indexado; acesso direto redirecionou para vaga expirada.
[^15]: Sicoob UniCentro BR / LinkedIn. [Analista de marketing — designer](https://br.linkedin.com/jobs/view/analista-de-marketing-designer-at-sicoob-unicentro-br-4438708243). Data editorial não confirmada. Consulta: 11/09/2026. Anúncio público indexado, sem confirmação de vaga aberta.
[^16]: Sicoob Credicitrus / LinkedIn. [Oportunidade na sede administrativa — compras](https://pt.linkedin.com/posts/sicoob-credicitrus_oportunidade-de-atua%C3%A7%C3%A3o-na-sede-administrativa-activity-7085215757034225664-ixfB). Publicação histórica, aproximadamente 2023. Consulta: 11/09/2026. Usada para atribuições; não para contratação atual.
[^32]: W3C WAI. [Understanding Success Criterion 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum). Documentação técnica corrente. Consulta: 11/09/2026. Cálculo local não substitui auditoria integral de acessibilidade.
[^33]: W3C. [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/). Recomendação WCAG 2.2. Consulta: 11/09/2026. Conformidade requer verificar todos os critérios aplicáveis, não só contraste.
[^34]: Supabase. [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). Documentação técnica corrente. Consulta: 11/09/2026. Não prova configuração dos projetos analisados.
[^35]: Supabase. [Database Functions](https://supabase.com/docs/guides/database/functions). Documentação técnica corrente. Consulta: 11/09/2026. Não prova quais migrations foram aplicadas.
[^36]: GitHub / Brindes_Sicoob_V2. [Execução de CI 33192891133](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/33192891133). Consultada em 2026-09-11. Consulta: 11/09/2026. Repositório privado; falha de orçamento não é teste de código.
[^37]: Brindes_Sicoob_V2. [Código auditado](https://github.com/adm01-debug/Brindes_Sicoob_V2/tree/d75459d28da0c8164c26861cd6358b147930425a). Commit d75459d28da0c8164c26861cd6358b147930425a. Consulta: 11/09/2026. Não equivale ao código efetivamente publicado.
[^38]: Diversos; inventário no Anexo A. Acervo documental fornecido — arquivo local: Brindes Sicoob V2 - Docs. Diversas, incluindo 2007, 2017, 2019 e 2021. Consulta: 11/09/2026. Histórico; não importar preços, SLA, regras de outro cliente ou contatos como atuais.
