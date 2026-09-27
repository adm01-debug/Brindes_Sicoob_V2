# Plano de implementação do portal Sicoob em 100 etapas

> **Adendo de 27/09/2026:** [estado de implementação, evidências e limites](../execucao/revisao-do-plano-2026-09-27.md). O checklist original não recebe baixa automática por presença de código.

Este plano organiza **100 etapas, cada uma com 10 subetapas obrigatórias: 1.000 itens de checklist**. A entrega atual é o plano; nenhuma subetapa de implementação foi marcada como executada. Os responsáveis indicados são funções sugeridas, a substituir por nomes durante o planejamento de capacidade.

A direção combina estratégia de serviço, pesquisa com usuários, arquitetura de informação, sistema visual, conteúdo, acessibilidade e execução comercial. O objetivo é aproveitar o investimento existente e tornar a compra institucional clara, confiável e rastreável, da campanha ao recebimento por PA.

## Compromissos do produto

1. O banco `doufsxqlfjyuvxuezpln` permanece exclusivamente de consulta de produtos, estoque e valores; a interface não pode criar uma reserva fictícia ou gravar nesse mestre.
2. O banco `cfmzkthhgliqelozlmwu` concentra dados próprios do portal, vínculos, campanhas, propostas, aprovações, verbas, pedidos e histórico.
3. Políticas de compra variam por cooperativa. Alçada, cotação, calendário e responsáveis devem ser configurados com referência vigente.
4. Aprovar a arte e autorizar a despesa são decisões distintas; produção exige os pré-requisitos aplicáveis.
5. A marca Sicoob orienta a experiência, com ativos e especificações vigentes validados pelo responsável autorizado.
6. Preço, estoque, prazo e indicadores precisam de fonte e limite explícitos. Não publicar números de demonstração como resultados reais.
7. Componentes existentes serão reaproveitados quando seu contrato e comportamento forem demonstrados; alterações devem ser pequenas e revisáveis.
8. Portal pronto significa operação em produção com compras reais e evidências. Artefato de design concluído não equivale a serviço lançado.

## Regra obrigatória para concluir uma etapa

Uma etapa somente poderá ser registrada como **Concluída** quando as dez subetapas estiverem atendidas, cada uma tiver evidência, o entregável existir, o critério específico de aceite estiver validado, o responsável nominal e o revisor estiverem identificados e todas as dependências estiverem concluídas. Se uma condição faltar, a etapa permanece pendente, em andamento ou aguardando revisão/dependência.

Não há opção automática de “não se aplica”. Se o escopo mudar, a equipe precisa revisar a subetapa e seu aceite com justificativa versionada, preservando a rastreabilidade. Uma mesma evidência pode comprovar itens relacionados, desde que indique os trechos ou resultados correspondentes. Um link vazio, uma caixa marcada ou a afirmação “feito” não demonstram execução.

Para pesquisa e design, a evidência pode ser síntese revisada, tarefa observada, especificação ou protótipo validado. Para implementação, deve indicar código, ambiente e verificação pertinente. Para publicação e operação, deve comprovar o estado real do serviço e da compra. Riscos críticos de acesso, credenciais, escrita externa indevida e integridade financeira não podem ser aceitos como mera ressalva para liberar produção.

O checklist interativo e a planilha ajudam a registrar a evidência e aplicar os critérios de fechamento. Eles não inspecionam automaticamente links, testes, produção ou a identidade de quem preenche. A revisão responsável continua obrigatória. Todos os registros começam vazios e todas as subetapas começam pendentes.

## Ordem, dependências e capacidade

Os números são identificadores de trabalho, não dias de execução. As dependências indicam condições para fechar cada etapa; trabalhos exploratórios independentes podem avançar em paralelo. A contenção de risco não deve esperar pelo acabamento visual. O esforço e o calendário serão estimados na etapa 10 com a equipe e os contratos reais; não existe promessa de prazo nesta versão.

O plano pressupõe uma cooperativa piloto e uma segunda cooperativa com política diferente para validar expansão. Seleção, participação, condições comerciais e responsabilidades precisam ser confirmadas nas etapas correspondentes. Convites, contratações e compras futuras exigem as autorizações aplicáveis; este plano não os executa.

## Critérios de qualidade transversais

Clareza, prevenção de erro, consistência e recuperação serão verificadas em tarefas concretas, apoiadas pelas heurísticas de Nielsen, sem confundir avaliação heurística com teste de usuários. [R03]

A meta de acessibilidade é WCAG 2.2 AA nos critérios aplicáveis. Para texto normal, o contraste de referência é 4,5:1; texto grande tem referência de 3:1. Informação visual essencial de controles também precisa de contraste apropriado. O alvo mínimo normativo de interação é 24 × 24 CSS pixels, sujeito às exceções do critério; 44 pixels é uma preferência de projeto para ações principais, não a descrição do mínimo AA. Foco e conteúdo devem permanecer utilizáveis com teclado e ampliação. [R04–R08]

LCP até 2,5 segundos, INP até 200 milissegundos e CLS até 0,1 no percentil 75 são referências para desempenho de campo. O piloto poderá ainda não ter amostra suficiente; nesse caso, registrar essa limitação e usar medições de laboratório identificadas, sem inventar percentis produtivos. [R09]

## Dez blocos de implementação

| Bloco | Etapas | Resultado esperado |
|---|---|---|
| 01. Diagnóstico e estratégia | 001–010 | Contexto, pesquisa e políticas conhecidos; riscos iniciais contidos. |
| 02. Fundamentos e segurança | 011–020 | Dados, acesso, transações e ambiente demonstrados. |
| 03. Estrutura e conteúdo | 021–030 | Navegação, linguagem e fluxos compreendidos pelos participantes. |
| 04. Sistema visual | 031–040 | Marca, componentes e acessibilidade aplicados de forma consistente. |
| 05. Catálogo e decisão | 041–050 | Comprador encontra, avalia e seleciona produtos com informação confiável. |
| 06. Campanhas e propostas | 051–060 | Campanha, distribuição, arte e custo compõem uma proposta verificável. |
| 07. Governança e aprovações | 061–070 | Decisões respeitam política, versão, alçada e verba. |
| 08. Execução e pós-compra | 071–080 | Produção, entrega, ocorrência e conciliação têm responsáveis e evidências. |
| 09. Qualidade e validação | 081–090 | Jornadas críticas homologadas, com falhas impeditivas resolvidas. |
| 10. Produção e expansão | 091–100 | Compras reais concluídas, segunda cooperativa validada e operação transferida. |

## Marcos de liberação

| Marco | Condição obrigatória |
|---|---|
| Base confiável | Contenção, catálogo somente leitura, autorização, verba, RPCs e gates demonstrados nas etapas 1–20 |
| Experiência definida | Fluxos e sistema visual validados nas etapas 21–40 |
| Jornada funcional | Catálogo, proposta, aprovação e pós-compra integrados nas etapas 41–80 |
| Candidata ao piloto | Homologação, ensaio completo, marca, dados e operação aceitos nas etapas 81–95 |
| Piloto operante | Produção confirmada e primeira compra real conciliada nas etapas 96–97 |
| Implantação concluída | Aprendizado incorporado, segunda cooperativa validada e aceite integral nas etapas 98–100 |

## Etapas e checklists


## Bloco 01 — Diagnóstico e estratégia

### E001 — Fixar o ponto de partida verificável

**Responsável funcional:** Liderança técnica e Produto.

**Dependências:** Nenhuma.

**Entregável:** Inventário do ambiente e matriz de capacidades.

**Base e reaproveitamento:** Diagnóstico anterior; README; CI; configuração Supabase.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E001.01** — Registrar o commit de referência e os links do diagnóstico anterior.
- [ ] **E001.02** — Identificar domínio produtivo, prévia e ambiente segregado de testes.
- [ ] **E001.03** — Confirmar os identificadores dos dois bancos com metadados seguros.
- [ ] **E001.04** — Relacionar funções publicadas com as funções presentes no repositório.
- [ ] **E001.05** — Classificar telas entre demonstradas, parcialmente funcionais e sem evidência.
- [ ] **E001.06** — Registrar os resultados reais de build, tipos e testes disponíveis.
- [ ] **E001.07** — Catalogar divergências entre documentação, configuração e comportamento observado.
- [ ] **E001.08** — Mapear responsáveis por produto, marca, compra, operação e infraestrutura.
- [ ] **E001.09** — Criar um registro de decisões com data, justificativa e impacto.
- [ ] **E001.10** — Revisar o inventário e anexar evidências de cada afirmação operacional.

**Critério obrigatório de conclusão:** Cada capacidade possui origem, estado observado e responsável; produção não é inferida pelo README.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E002 — Conter exposição de credenciais e ferramentas de teste

**Responsável funcional:** Engenharia de segurança.

**Dependências:** E001.

**Entregável:** Superfície de acesso emergencial corrigida.

**Base e reaproveitamento:** A01; migrate-helper; QuickTestLogin; gate de autorização.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E002.01** — Verificar por inventário seguro se migrate-helper está publicado.
- [ ] **E002.02** — Inspecionar a configuração de autorização sem invocar retorno de segredos.
- [ ] **E002.03** — Remover o comportamento de exportação de credenciais do código.
- [ ] **E002.04** — Retirar a função publicada ou desativar sua capacidade indevida.
- [ ] **E002.05** — Investigar registros disponíveis para delimitar eventual exposição anterior.
- [ ] **E002.06** — Rotacionar credenciais afetadas conforme a exposição constatada e validar consumidores.
- [ ] **E002.07** — Eliminar acesso rápido e reparação de usuários do build produtivo.
- [ ] **E002.08** — Separar utilitários de diagnóstico dos privilégios do comprador comum.
- [ ] **E002.09** — Executar o gate que identifica retorno de credenciais e manifesto incompleto.
- [ ] **E002.10** — Registrar código, estado publicado e evidência de contenção revisada.

**Critério obrigatório de conclusão:** Nenhuma função publicada devolve segredos; o tratamento da exposição potencial está documentado.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E003 — Garantir catálogo externo exclusivamente de consulta

**Responsável funcional:** Engenharia de dados e Backend.

**Dependências:** E001, E002.

**Entregável:** Contrato de integração somente leitura.

**Base e reaproveitamento:** A02; D02; external-db-bridge; banco doufsxqlfjyuvxuezpln.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E003.01** — Definir doufsxqlfjyuvxuezpln como fonte mestre de produtos e disponibilidade.
- [ ] **E003.02** — Separar responsabilidades comerciais do portal das responsabilidades do catálogo.
- [ ] **E003.03** — Listar tabelas, visões e colunas necessárias à experiência do comprador.
- [ ] **E003.04** — Excluir escrita, exclusão, upsert e importação do contrato dessa integração.
- [ ] **E003.05** — Revisar efeitos de cada RPC antes de permiti-la como consulta.
- [ ] **E003.06** — Configurar identidade de origem com privilégios mínimos de leitura.
- [ ] **E003.07** — Impedir exposição de custo interno e referências restritas ao comprador.
- [ ] **E003.08** — Distinguir integração indisponível, acesso negado e consulta sem resultados.
- [ ] **E003.09** — Validar uma amostra mínima de produto, variante, preço e estoque.
- [ ] **E003.10** — Comprovar restrições por configuração e testes segregados, sem gravar no mestre.

**Critério obrigatório de conclusão:** API e identidade de origem impedem gravações; amostra de leitura identifica corretamente o banco mestre.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E004 — Planejar pesquisa com compradores e marketing

**Responsável funcional:** Pesquisa UX e Produto.

**Dependências:** E001.

**Entregável:** Plano de pesquisa e recrutamento consentido.

**Base e reaproveitamento:** Anexo de perfis públicos; roteiro de entrevistas.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E004.01** — Selecionar perguntas sobre retrabalho, prazo, confiança e tomada de decisão.
- [ ] **E004.02** — Definir amostra inicial de compras, marketing, PAs, financeiro e operação.
- [ ] **E004.03** — Incluir cooperativas com regras de compra diferentes na seleção.
- [ ] **E004.04** — Obter autorização para convites e sessões com participantes reais.
- [ ] **E004.05** — Preparar consentimento e uso mínimo dos registros de pesquisa.
- [ ] **E004.06** — Solicitar exemplos anonimizados de pedidos, propostas e artes anteriores.
- [ ] **E004.07** — Preparar roteiro baseado no último pedido efetivamente realizado.
- [ ] **E004.08** — Conduzir sessões sem transformar sugestões do entrevistador em respostas.
- [ ] **E004.09** — Registrar barreiras observadas, frequência na amostra e contexto de ocorrência.
- [ ] **E004.10** — Revisar a síntese com rastreabilidade, sem generalizar a amostra ao sistema inteiro.

**Critério obrigatório de conclusão:** Amostra cobre papéis e cooperativas distintas; observações são separadas de hipóteses.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E005 — Definir perfis funcionais e trabalhos a realizar

**Responsável funcional:** Pesquisa UX e Estratégia.

**Dependências:** E004.

**Entregável:** Perfis funcionais ligados a tarefas.

**Base e reaproveitamento:** Anexo profissional; resultados da etapa 4.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E005.01** — Descrever o trabalho do solicitante de PA sem associá-lo a um cargo único.
- [ ] **E005.02** — Caracterizar a responsabilidade de compras sobre comparação e contratação.
- [ ] **E005.03** — Caracterizar a responsabilidade de marketing sobre campanha e marca.
- [ ] **E005.04** — Identificar quem autoriza despesa e quais informações fundamentam sua decisão.
- [ ] **E005.05** — Descrever como operação e financeiro acompanham recebimento e cobrança.
- [ ] **E005.06** — Separar papel funcional de cooperativa, unidade e centro de custo.
- [ ] **E005.07** — Mapear uso ocasional, recorrente, móvel e assistido para cada perfil.
- [ ] **E005.08** — Registrar limitações de tempo, acessibilidade e conhecimento observadas.
- [ ] **E005.09** — Priorizar tarefas por frequência, impacto e custo de erro.
- [ ] **E005.10** — Validar os perfis com evidências e registrar pontos ainda desconhecidos.

**Critério obrigatório de conclusão:** Cada perfil tem objetivo, contexto, dificuldade observada e critério de sucesso verificável.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E006 — Mapear a jornada atual e a jornada pretendida

**Responsável funcional:** Estratégia de serviço e UX.

**Dependências:** E004, E005.

**Entregável:** Mapas de jornada atual e futura.

**Base e reaproveitamento:** Dossiê; documentos de compras; pedidos anonimizados.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E006.01** — Descrever o gatilho de compra por campanha, reposição ou evento.
- [ ] **E006.02** — Mapear como os produtos são descobertos e selecionados atualmente.
- [ ] **E006.03** — Registrar a obtenção de preço, personalização e prazo de entrega.
- [ ] **E006.04** — Mapear a comparação de propostas e sua justificativa.
- [ ] **E006.05** — Separar decisões sobre arte das decisões sobre verba.
- [ ] **E006.06** — Identificar transferências entre comprador, fornecedor, produção e transporte.
- [ ] **E006.07** — Mapear recebimento parcial, divergência e encerramento financeiro.
- [ ] **E006.08** — Medir esperas e retrabalho quando houver dados confiáveis.
- [ ] **E006.09** — Desenhar a jornada pretendida com recuperação para falhas relevantes.
- [ ] **E006.10** — Validar o mapa com representantes dos papéis que executam cada passagem.

**Critério obrigatório de conclusão:** Todas as passagens entre solicitação e recebimento têm ator, informação e dificuldade identificados.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E007 — Desenhar o serviço por trás da interface

**Responsável funcional:** Estratégia de serviço e Operação.

**Dependências:** E006.

**Entregável:** Mapa de serviço com responsabilidades.

**Base e reaproveitamento:** Jornada; SCOPE_ALIGNMENT; operação do fornecedor.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E007.01** — Relacionar cada ação do comprador ao processo que a atende.
- [ ] **E007.02** — Identificar tarefas manuais que continuarão necessárias no piloto.
- [ ] **E007.03** — Definir quem confirma personalização, disponibilidade e prazo contratado.
- [ ] **E007.04** — Descrever a passagem de proposta aprovada para produção.
- [ ] **E007.05** — Definir quem informa rastreio e quem corrige informação incorreta.
- [ ] **E007.06** — Mapear o atendimento de avaria, falta, troca e atraso.
- [ ] **E007.07** — Determinar fontes de dados para cada estado mostrado na interface.
- [ ] **E007.08** — Estabelecer responsáveis e escalonamento para pendências sem resposta.
- [ ] **E007.09** — Registrar dependências externas que podem limitar a promessa comercial.
- [ ] **E007.10** — Simular um pedido completo e revisar as passagens sem responsável definido.

**Critério obrigatório de conclusão:** Cada promessa exibida possui processo, sistema responsável e tratamento de falha.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E008 — Configurar governança por cooperativa

**Responsável funcional:** Produto e responsáveis de compras.

**Dependências:** E004, E007.

**Entregável:** Matriz de políticas locais versionadas.

**Base e reaproveitamento:** Coopemata; Credesp; União Centro-Oeste; Sicoob Centro.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E008.01** — Obter a política vigente de cada cooperativa candidata ao piloto.
- [ ] **E008.02** — Registrar a entidade emissora e a validade de cada documento.
- [ ] **E008.03** — Mapear categorias que exigem participação de compras ou marketing.
- [ ] **E008.04** — Identificar exigência de cotações e suas exceções justificáveis.
- [ ] **E008.05** — Definir alçadas, impedimentos e tratamento de autoaprovação.
- [ ] **E008.06** — Mapear calendário, janelas de compra e condições especiais por unidade.
- [ ] **E008.07** — Registrar critérios aplicáveis a fornecedores e documentação comercial.
- [ ] **E008.08** — Definir como mudanças de política afetam solicitações em andamento.
- [ ] **E008.09** — Preservar a versão da política usada em cada decisão de compra.
- [ ] **E008.10** — Validar a matriz com responsáveis locais, sem copiar regras históricas automaticamente.

**Critério obrigatório de conclusão:** Duas políticas distintas podem ser representadas sem criar regra nacional fictícia.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E009 — Definir resultados e instrumentos de medição

**Responsável funcional:** Produto e Dados.

**Dependências:** E005, E006.

**Entregável:** Dicionário inicial de indicadores.

**Base e reaproveitamento:** A04; A10; eventos de jornada.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E009.01** — Definir sucesso da solicitação como envio completo e válido.
- [ ] **E009.02** — Separar tempo de aprovação da arte do tempo de aprovação financeira.
- [ ] **E009.03** — Definir categorias observáveis de retrabalho e devolução.
- [ ] **E009.04** — Distinguir prazo desejado, contratado e data efetiva de entrega.
- [ ] **E009.05** — Definir medição de divergências por pedido e por destino.
- [ ] **E009.06** — Especificar eventos de busca sem resultado e abandono recuperável.
- [ ] **E009.07** — Registrar o denominador e a janela temporal de cada indicador.
- [ ] **E009.08** — Identificar quais dados podem ser obtidos antes do primeiro piloto.
- [ ] **E009.09** — Propor metas iniciais como hipóteses, com responsável por revisá-las.
- [ ] **E009.10** — Aprovar o dicionário e impedir percentuais calculados com dados fictícios.

**Critério obrigatório de conclusão:** Cada indicador tem evento de origem, denominador, período e limitação; ausência de medição é explícita.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E010 — Definir escopo e ordem das entregas

**Responsável funcional:** Produto, UX e Liderança técnica.

**Dependências:** E001, E005, E007, E008, E009.

**Entregável:** Plano de releases com critérios de saída.

**Base e reaproveitamento:** Backlog anterior B01–B42; plano de 100 etapas.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E010.01** — Relacionar funcionalidades existentes às tarefas prioritárias do comprador.
- [ ] **E010.02** — Identificar componentes que podem ser aproveitados com alteração pequena.
- [ ] **E010.03** — Separar bloqueadores de segurança de melhorias de conveniência.
- [ ] **E010.04** — Definir a primeira compra completa que o piloto precisa suportar.
- [ ] **E010.05** — Escolher categorias, técnicas e destinos inicialmente atendidos pela operação.
- [ ] **E010.06** — Adiar CRM legado, gamificação e previsões sem dados comprovados.
- [ ] **E010.07** — Estimar esforço por responsável após examinar os contratos de integração.
- [ ] **E010.08** — Montar sequência por dependências, permitindo frentes independentes em paralelo.
- [ ] **E010.09** — Definir revisão de escopo quando uma hipótese comercial for invalidada.
- [ ] **E010.10** — Registrar critérios de saída e capacidade comprometida para a primeira release.

**Critério obrigatório de conclusão:** Escopo preserva a jornada completa, explicita adiamentos e respeita dependências e capacidade.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 02 — Fundamentos e segurança

### E011 — Consolidar o modelo de dados do portal

**Responsável funcional:** Backend e Arquitetura.

**Dependências:** E003, E008, E010.

**Entregável:** Modelo canônico de entidades e contratos.

**Base e reaproveitamento:** D04; tipos Supabase; migrations existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E011.01** — Inspecionar o schema real do banco próprio por acesso administrativo seguro.
- [ ] **E011.02** — Comparar tabelas implantadas com migrations e tipos versionados.
- [ ] **E011.03** — Resolver conceitualmente diferenças entre cooperativa, Singular e organização.
- [ ] **E011.04** — Definir um identificador canônico de PA e seus vínculos válidos.
- [ ] **E011.05** — Modelar centro de custo, período de verba e distribuição por unidade.
- [ ] **E011.06** — Separar requisição, proposta, pedido, entrega e documento financeiro.
- [ ] **E011.07** — Definir snapshots históricos sem duplicar o cadastro mestre de produto.
- [ ] **E011.08** — Mapear dados existentes e regras de reconciliação antes de migrar.
- [ ] **E011.09** — Gerar contratos tipados e validar exemplos consistentes de ponta a ponta.
- [ ] **E011.10** — Revisar o modelo com operações e registrar plano reversível de migração.

**Critério obrigatório de conclusão:** Nomes e vínculos de cooperativa, PA, verba e pedido são consistentes entre schema, serviços e telas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E012 — Unificar permissões por ação e escopo

**Responsável funcional:** Segurança e Backend.

**Dependências:** E008, E011.

**Entregável:** Matriz de autorização implementável.

**Base e reaproveitamento:** A07; D05; AuthContext; user_roles.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E012.01** — Listar ações de leitura, solicitação, edição, aprovação e cancelamento.
- [ ] **E012.02** — Separar aprovação de arte, despesa, recebimento e administração.
- [ ] **E012.03** — Mapear cada papel funcional às ações necessárias no piloto.
- [ ] **E012.04** — Restringir leitura conforme cooperativa, PA e centro de custo aplicáveis.
- [ ] **E012.05** — Definir como uma pessoa com múltiplos vínculos escolhe seu contexto.
- [ ] **E012.06** — Eliminar aliases de papéis que produzem interpretações contraditórias.
- [ ] **E012.07** — Definir precedência para permissões acumuladas e impedimentos explícitos.
- [ ] **E012.08** — Derivar identidade e vínculo de informações verificadas no servidor.
- [ ] **E012.09** — Registrar casos permitidos e negados para cada ação crítica.
- [ ] **E012.10** — Revisar a matriz com segurança e responsáveis das cooperativas piloto.

**Critério obrigatório de conclusão:** Permissões dependem de vínculo ativo e ação; cargo ou valor enviado pelo navegador não concedem acesso.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E013 — Implementar isolamento de dados e anexos

**Responsável funcional:** Segurança e Backend.

**Dependências:** E011, E012.

**Entregável:** Policies e testes entre organizações.

**Base e reaproveitamento:** D07; RLS; Storage; links de aprovação.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E013.01** — Identificar tabelas expostas por API e seus vínculos organizacionais.
- [ ] **E013.02** — Revisar políticas de leitura para usuários autenticados e anônimos.
- [ ] **E013.03** — Revisar inserção e alteração para impedir troca arbitrária de cooperativa.
- [ ] **E013.04** — Restringir buckets e objetos que contêm artes e documentos privados.
- [ ] **E013.05** — Verificar links compartilhados quanto a escopo, validade e revogação.
- [ ] **E013.06** — Auditar funções privilegiadas que podem contornar políticas de linha.
- [ ] **E013.07** — Preparar usuários e dados de teste de duas cooperativas segregadas.
- [ ] **E013.08** — Testar acesso cruzado com papéis iguais em organizações diferentes.
- [ ] **E013.09** — Confirmar que falha de rede não é interpretada como autorização negada bem-sucedida.
- [ ] **E013.10** — Publicar evidências dos casos permitidos e negados vinculadas ao schema testado.

**Critério obrigatório de conclusão:** Usuários de cooperativas distintas não acessam registros, anexos ou funções fora de seu escopo.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E014 — Corrigir rotas e contrato de autenticação

**Responsável funcional:** Frontend e QA.

**Dependências:** E012, E013.

**Entregável:** Navegação autorizada por perfil.

**Base e reaproveitamento:** A03; App; AdminRoute; SicoobRoute; AuthContext.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E014.01** — Identificar todos os wrappers aplicados às rotas do portal.
- [ ] **E014.02** — Padronizar nomes e tipos das propriedades expostas por AuthContext.
- [ ] **E014.03** — Remover dependência de propriedades inexistentes nos guards Sicoob.
- [ ] **E014.04** — Alinhar a barreira administrativa com a matriz de ações autorizadas.
- [ ] **E014.05** — Resolver rotas duplicadas com páginas ou permissões divergentes.
- [ ] **E014.06** — Separar carregamento de sessão, carregamento de permissões e acesso negado.
- [ ] **E014.07** — Preservar destino solicitado ao autenticar quando ele for autorizado.
- [ ] **E014.08** — Impedir loops de redirecionamento e telas vazias em sessão expirada.
- [ ] **E014.09** — Executar navegação real por perfil com verificações negativas.
- [ ] **E014.10** — Registrar a composição final das rotas e resultados do fluxo autenticado.

**Critério obrigatório de conclusão:** Comprador, marketing e aprovador alcançam suas jornadas sem propriedades indefinidas ou barreiras contraditórias.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E015 — Definir autenticação confiável e acessível

**Responsável funcional:** Segurança, Frontend e UX.

**Dependências:** E002, E014.

**Entregável:** Fluxo técnico de entrada e recuperação.

**Base e reaproveitamento:** Auth; D06; configuração de provedores.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E015.01** — Confirmar métodos de autenticação disponíveis no ambiente escolhido.
- [ ] **E015.02** — Definir requisito de proteção adicional para ações administrativas sensíveis.
- [ ] **E015.03** — Retirar passkey incompleta e botões de provedores desativados.
- [ ] **E015.04** — Validar entrada por email e recuperação de acesso com sessão real.
- [ ] **E015.05** — Permitir colagem e uso de gerenciador de senhas nos campos apropriados.
- [ ] **E015.06** — Tratar credencial inválida sem revelar existência de outra pessoa.
- [ ] **E015.07** — Preservar trabalho compatível durante expiração e renovação da sessão.
- [ ] **E015.08** — Definir retorno seguro após logout e troca de vínculo.
- [ ] **E015.09** — Testar teclado, autofill, mensagens e estados de espera na autenticação.
- [ ] **E015.10** — Comprovar sessão, encerramento e recuperação sem mensagens falsas de sucesso.

**Critério obrigatório de conclusão:** Somente métodos realmente configurados aparecem; autenticação concluída corresponde a sessão válida.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E016 — Implementar convites e vínculos organizacionais

**Responsável funcional:** Backend, UX e Administração.

**Dependências:** E011, E012, E015.

**Entregável:** Onboarding controlado da cooperativa.

**Base e reaproveitamento:** Auth fechado; organizações; onboarding existente.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E016.01** — Definir quem pode convidar solicitantes, marketing e aprovadores.
- [ ] **E016.02** — Vincular cada convite à cooperativa e ao papel permitido.
- [ ] **E016.03** — Restringir concessão de privilégios acima da autoridade do convidante.
- [ ] **E016.04** — Definir validade, reenvio e revogação do convite.
- [ ] **E016.05** — Tratar usuário existente que recebe acesso a outra unidade.
- [ ] **E016.06** — Mostrar entidade e responsabilidades antes de aceitar o vínculo.
- [ ] **E016.07** — Evitar duplicação de perfil quando o convite é reenviado.
- [ ] **E016.08** — Registrar aceitação e concessão de acesso no histórico administrativo.
- [ ] **E016.09** — Testar convite adulterado, expirado, revogado e já utilizado.
- [ ] **E016.10** — Homologar onboarding completo com usuário de teste e contexto correto.

**Critério obrigatório de conclusão:** Convite cria apenas o vínculo autorizado; expiração, revogação e duplicidade possuem tratamento claro.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E017 — Tornar verba e compromissos consistentes

**Responsável funcional:** Backend e Financeiro.

**Dependências:** E008, E011, E012.

**Entregável:** Motor transacional de verba.

**Base e reaproveitamento:** A09; D04; budgetService; pa_budgets.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E017.01** — Definir planejado, reservado, comprometido e consumido com financeiro.
- [ ] **E017.02** — Associar cada saldo a período e centro de custo explícitos.
- [ ] **E017.03** — Determinar composição do valor que compromete a verba.
- [ ] **E017.04** — Implementar reserva e liberação conforme a política aprovada.
- [ ] **E017.05** — Executar verificação de saldo e compromisso na mesma transação.
- [ ] **E017.06** — Controlar reenvio por chave de idempotência e versão da operação.
- [ ] **E017.07** — Implementar estorno e ajuste preservando trilha de eventos.
- [ ] **E017.08** — Definir tratamento de pedido parcial e mudança de período.
- [ ] **E017.09** — Testar duas aprovações simultâneas disputando o mesmo saldo.
- [ ] **E017.10** — Conciliar os movimentos de uma amostra com os saldos apresentados.

**Critério obrigatório de conclusão:** Concorrência e repetição não geram consumo duplicado nem saldo negativo fora da política autorizada.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E018 — Corrigir aprovação privilegiada no servidor

**Responsável funcional:** Backend e Segurança.

**Dependências:** E012, E013, E017.

**Entregável:** RPCs de decisão autorizadas e atômicas.

**Base e reaproveitamento:** D01; approve_sicoob_order; reject_sicoob_order.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E018.01** — Obter a definição e os privilégios das RPCs realmente implantadas.
- [ ] **E018.02** — Derivar o ator da sessão autenticada no servidor.
- [ ] **E018.03** — Carregar pedido e requisição por relacionamento verificado.
- [ ] **E018.04** — Validar cooperativa, vínculo ativo e competência de aprovação.
- [ ] **E018.05** — Impedir autoaprovação quando a política local a proibir.
- [ ] **E018.06** — Validar estado anterior e versão da proposta a decidir.
- [ ] **E018.07** — Persistir decisão, verba e auditoria na mesma transação aplicável.
- [ ] **E018.08** — Tratar repetição de chamada sem duplicar decisão ou consumo.
- [ ] **E018.09** — Testar aprovador forjado, pedido cruzado e requisição incompatível.
- [ ] **E018.10** — Registrar testes de concorrência e concessões efetivas após a correção.

**Critério obrigatório de conclusão:** Ator, vínculo, alçada, versão e relação pedido/requisição são validados antes da decisão.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E019 — Restabelecer qualidade de build e testes

**Responsável funcional:** Liderança técnica e QA.

**Dependências:** E002, E003, E014, E018.

**Entregável:** Pipeline executável com resultados reais.

**Base e reaproveitamento:** CI posterior; npm audit; baseline TypeScript.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E019.01** — Reproduzir os gates de autorização e dependências que falharam.
- [ ] **E019.02** — Triar alertas por alcance e contexto de execução dos pacotes.
- [ ] **E019.03** — Atualizar dependências de forma compatível, revisando mudanças necessárias.
- [ ] **E019.04** — Corrigir tipos nos contratos críticos de acesso, catálogo, verba e pedido.
- [ ] **E019.05** — Comparar dívida restante com o baseline sem mascarar novos erros.
- [ ] **E019.06** — Corrigir caminhos inexistentes e identificadores duplicados dos workflows.
- [ ] **E019.07** — Fazer configuração obrigatória ausente produzir falha explícita.
- [ ] **E019.08** — Substituir mocks que impedem verificar a composição real das rotas.
- [ ] **E019.09** — Executar testes significativos das transações e negações de acesso.
- [ ] **E019.10** — Vincular resultados, comando, ambiente e commit no relatório de qualidade.

**Critério obrigatório de conclusão:** Gates críticos passam sem desativação; dívida remanescente possui inventário e não afeta a jornada liberada.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E020 — Preparar ambiente de validação e observabilidade

**Responsável funcional:** Infraestrutura e Operação.

**Dependências:** E001, E013, E019.

**Entregável:** Ambiente homologável e operação monitorada.

**Base e reaproveitamento:** A12; runbooks; logs; configuração de deploy.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E020.01** — Separar variáveis e permissões de desenvolvimento, homologação e produção.
- [ ] **E020.02** — Validar domínio, TLS e redirecionamentos do ambiente de homologação.
- [ ] **E020.03** — Definir correlação de eventos entre interface, API e transação.
- [ ] **E020.04** — Registrar falhas sem incluir segredos ou dados pessoais desnecessários.
- [ ] **E020.05** — Monitorar consulta de catálogo, envio de solicitação e decisão de aprovação.
- [ ] **E020.06** — Definir responsáveis e canais operacionais para alertas aplicáveis.
- [ ] **E020.07** — Configurar backups e procedimentos compatíveis com o banco próprio.
- [ ] **E020.08** — Ensaiar recuperação em ambiente segregado com evidência de resultado.
- [ ] **E020.09** — Documentar rollback de aplicação e compatibilidade de schema.
- [ ] **E020.10** — Executar incidente controlado e comprovar alerta, diagnóstico e recuperação.

**Critério obrigatório de conclusão:** Saúde do catálogo e da compra pode ser observada; falhas têm alerta e responsável verificáveis.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 03 — Estrutura e conteúdo

### E021 — Organizar a arquitetura de informação

**Responsável funcional:** UX e Conteúdo.

**Dependências:** E005, E006, E010.

**Entregável:** Mapa de navegação por tarefa.

**Base e reaproveitamento:** Menus existentes; perfis funcionais; heurísticas de usabilidade.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E021.01** — Inventariar destinos atuais e identificar duplicatas de navegação.
- [ ] **E021.02** — Agrupar conteúdos por necessidade do comprador e do aprovador.
- [ ] **E021.03** — Propor rótulos para catálogo, campanhas, pedidos, verbas e suporte.
- [ ] **E021.04** — Separar administração técnica da navegação diária das cooperativas.
- [ ] **E021.05** — Definir destinos de início adequados a cada papel funcional.
- [ ] **E021.06** — Desenhar hierarquia de páginas com localização reconhecível.
- [ ] **E021.07** — Planejar atalhos úteis sem duplicar ações contraditórias.
- [ ] **E021.08** — Testar encontrabilidade com tarefas e estrutura textual simples.
- [ ] **E021.09** — Revisar rótulos que induzem interpretação comercial incorreta.
- [ ] **E021.10** — Publicar o mapa validado com responsáveis por cada área de conteúdo.

**Critério obrigatório de conclusão:** Participantes encontram catálogo, solicitações, aprovações e entregas sem depender de termos de vendedor.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E022 — Construir taxonomia útil para brindes

**Responsável funcional:** UX, Comercial e Dados.

**Dependências:** E003, E005, E021.

**Entregável:** Taxonomia e mapeamento de atributos.

**Base e reaproveitamento:** Catálogo externo; filtros; exemplos de campanhas Sicoob.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E022.01** — Inspecionar categorias e atributos disponíveis na amostra do catálogo.
- [ ] **E022.02** — Separar categoria de produto, finalidade, material e técnica de impressão.
- [ ] **E022.03** — Mapear sinônimos usados por compradores nas sessões de pesquisa.
- [ ] **E022.04** — Definir unidades e vocabulário consistentes para dimensões e capacidade.
- [ ] **E022.05** — Identificar atributos decisivos por família de produto.
- [ ] **E022.06** — Tratar valores vazios, conflitantes e variantes sem classificação.
- [ ] **E022.07** — Criar curadoria por assembleia, evento, relacionamento e uso interno.
- [ ] **E022.08** — Exigir evidência para selos ambientais ou afirmações de certificação.
- [ ] **E022.09** — Manter classificações editoriais do portal separadas do cadastro mestre.
- [ ] **E022.10** — Validar amostra de buscas e categorias com compras e marketing.

**Critério obrigatório de conclusão:** Categorias e atributos ajudam a decidir; valores desconhecidos não são apresentados como fatos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E023 — Projetar o comportamento da busca

**Responsável funcional:** UX e Engenharia de busca.

**Dependências:** E021, E022.

**Entregável:** Especificação de busca por nome, código e intenção.

**Base e reaproveitamento:** Componentes de busca e bridge; consultas da pesquisa.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E023.01** — Reunir consultas por código, produto, campanha e necessidade de uso.
- [ ] **E023.02** — Definir precedência de correspondência exata de códigos estáveis.
- [ ] **E023.03** — Tratar acentos, variações de escrita e sinônimos relevantes.
- [ ] **E023.04** — Definir sugestões que não revelem histórico de outra cooperativa.
- [ ] **E023.05** — Separar resultado orgânico de curadoria comercial identificada.
- [ ] **E023.06** — Planejar tratamento de erro ortográfico sem substituir intenção silenciosamente.
- [ ] **E023.07** — Definir estados de carregamento, nenhuma correspondência e serviço indisponível.
- [ ] **E023.08** — Especificar como resultados respeitam filtros e contexto ativo.
- [ ] **E023.09** — Criar conjunto de consultas de avaliação com resultado esperado justificável.
- [ ] **E023.10** — Revisar relevância e explicar limites antes de incluir busca semântica adicional.

**Critério obrigatório de conclusão:** Consultas prioritárias retornam opções pertinentes ou recuperação clara, sem inventar atributos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E024 — Projetar filtros e ordenação

**Responsável funcional:** UX e Comercial.

**Dependências:** E022, E023.

**Entregável:** Modelo de refinamento e ordenação.

**Base e reaproveitamento:** Filtros existentes; critérios de quantidade, técnica e prazo.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E024.01** — Escolher filtros úteis por categoria com base em atributos reais.
- [ ] **E024.02** — Separar preço unitário de custo estimado entregue na linguagem do filtro.
- [ ] **E024.03** — Modelar quantidade mínima, múltiplo e técnica de personalização.
- [ ] **E024.04** — Definir tratamento honesto da disponibilidade ainda não reconfirmada.
- [ ] **E024.05** — Projetar seleção de múltiplas opções e combinação entre grupos.
- [ ] **E024.06** — Mostrar contagens somente quando a consulta as sustentar.
- [ ] **E024.07** — Definir limpeza individual e completa dos filtros ativos.
- [ ] **E024.08** — Especificar ordenações com significado e desempate previsível.
- [ ] **E024.09** — Preservar critérios ao abrir produto e retornar à listagem.
- [ ] **E024.10** — Validar tarefas de refinamento incluindo combinações sem resultado.

**Critério obrigatório de conclusão:** Comprador entende critérios ativos, remove restrições e compara resultados sem perder contexto.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E025 — Desenhar navegação entre cooperativas e unidades

**Responsável funcional:** UX, Segurança e Frontend.

**Dependências:** E012, E014, E016, E021.

**Entregável:** Padrão de contexto organizacional.

**Base e reaproveitamento:** AuthContext; vínculos; cabeçalho e layout existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E025.01** — Definir onde cooperativa e unidade ativa aparecem persistentemente.
- [ ] **E025.02** — Listar apenas os vínculos válidos da pessoa autenticada.
- [ ] **E025.03** — Explicar diferença entre trocar unidade e trocar papel autorizado.
- [ ] **E025.04** — Definir destino inicial após selecionar outra cooperativa.
- [ ] **E025.05** — Isolar cache, filtros privados e rascunhos por contexto.
- [ ] **E025.06** — Avisar sobre trabalho não salvo antes de uma troca incompatível.
- [ ] **E025.07** — Preservar informações seguras quando a pessoa retorna ao vínculo anterior.
- [ ] **E025.08** — Tratar vínculo revogado durante uma sessão aberta.
- [ ] **E025.09** — Testar alternância por teclado, tela móvel e nomes extensos.
- [ ] **E025.10** — Comprovar que pedidos e saldos exibidos correspondem ao contexto visível.

**Critério obrigatório de conclusão:** A unidade ativa é inequívoca; trocar contexto não transporta dados privados ou rascunhos incorretos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E026 — Estabelecer linguagem e conteúdo de interface

**Responsável funcional:** Conteúdo UX e Produto.

**Dependências:** E005, E008, E021.

**Entregável:** Guia de linguagem aplicado às jornadas.

**Base e reaproveitamento:** README legado; termos de compras; NN/g.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E026.01** — Definir tom profissional, direto e acolhedor em português brasileiro.
- [ ] **E026.02** — Padronizar solicitação, proposta, pedido, verba e aprovação no glossário.
- [ ] **E026.03** — Substituir termos de vendedor que confundem o comprador institucional.
- [ ] **E026.04** — Definir rótulos de ação que indiquem o resultado esperado.
- [ ] **E026.05** — Escrever instruções curtas junto ao ponto em que são necessárias.
- [ ] **E026.06** — Separar conteúdo obrigatório de ajuda complementar consultável.
- [ ] **E026.07** — Retirar números, selos e afirmações de oficialidade sem origem comprovada.
- [ ] **E026.08** — Explicar limites de preço, disponibilidade e prazo em linguagem comercial.
- [ ] **E026.09** — Revisar compreensão com participantes sem apresentar explicações prévias.
- [ ] **E026.10** — Publicar exemplos aprovados de títulos, mensagens e ações críticas.

**Critério obrigatório de conclusão:** Textos distinguem estimativa, aprovação, contratação e entrega sem promessas não comprovadas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E027 — Padronizar formulários e entrada de dados

**Responsável funcional:** UX, Conteúdo e Frontend.

**Dependências:** E011, E021, E026.

**Entregável:** Padrões de formulários com validação útil.

**Base e reaproveitamento:** Componentes existentes; GOV.UK; contratos do portal.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E027.01** — Inventariar dados exigidos em cadastro, campanha, proposta e entrega.
- [ ] **E027.02** — Justificar cada campo obrigatório por finalidade operacional concreta.
- [ ] **E027.03** — Organizar perguntas na ordem em que o comprador possui a informação.
- [ ] **E027.04** — Definir rótulos persistentes e exemplos compatíveis com o campo.
- [ ] **E027.05** — Padronizar datas, reais, quantidades, CEP e unidades de medida.
- [ ] **E027.06** — Permitir colagem, autofill e correção sem máscaras excessivamente restritivas.
- [ ] **E027.07** — Validar formato no cliente e regras de negócio no servidor.
- [ ] **E027.08** — Mostrar resumo de erros e vínculo com cada campo problemático.
- [ ] **E027.09** — Preservar dados após falha, retorno entre etapas e sessão recuperável.
- [ ] **E027.10** — Testar preenchimento válido, incompleto e incorreto por teclado e toque.

**Critério obrigatório de conclusão:** Campos solicitam apenas dados necessários; erros preservam valores e orientam correção.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E028 — Definir estados vazios, falhas e recuperação

**Responsável funcional:** UX, Frontend e Backend.

**Dependências:** E003, E014, E026, E027.

**Entregável:** Catálogo de estados com comportamento real.

**Base e reaproveitamento:** EmptyState; ErrorBoundary; A10; bridge.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E028.01** — Listar estados possíveis de catálogo, orçamento, aprovação e entrega.
- [ ] **E028.02** — Separar primeira utilização de ausência de resultados após filtros.
- [ ] **E028.03** — Diferenciar permissão negada, sessão expirada e serviço indisponível.
- [ ] **E028.04** — Definir carregamento inicial e atualização parcial sem apagar conteúdo útil.
- [ ] **E028.05** — Projetar nova tentativa somente para operações seguras ou idempotentes.
- [ ] **E028.06** — Explicar conflitos de versão quando outro usuário alterou o registro.
- [ ] **E028.07** — Exibir dados antigos com horário e restrições quando houver cache válido.
- [ ] **E028.08** — Remover sucesso otimista de ações financeiras ainda não confirmadas.
- [ ] **E028.09** — Definir canal de suporte com identificador de ocorrência não sensível.
- [ ] **E028.10** — Simular cada estado e validar clareza, foco e preservação do trabalho.

**Critério obrigatório de conclusão:** Cada falha oferece uma ação segura; carregamento e ausência de dados não ocultam indisponibilidade.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E029 — Planejar avisos e notificações por evento

**Responsável funcional:** UX, Operação e Backend.

**Dependências:** E007, E009, E012, E026.

**Entregável:** Matriz de eventos, destinatários e canais.

**Base e reaproveitamento:** D09; sistema de notificações; histórico de pedidos.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E029.01** — Relacionar eventos que realmente exigem ação de uma pessoa.
- [ ] **E029.02** — Definir destinatário de arte, despesa, atraso e divergência de entrega.
- [ ] **E029.03** — Separar mensagens informativas de pendências que bloqueiam a compra.
- [ ] **E029.04** — Escolher canais suportados e comprovar suas integrações antes de anunciá-los.
- [ ] **E029.05** — Definir agrupamento para evitar múltiplos avisos equivalentes.
- [ ] **E029.06** — Estabelecer preferências permitidas sem suprimir comunicações essenciais.
- [ ] **E029.07** — Respeitar fuso e calendário operacional quando houver agendamento.
- [ ] **E029.08** — Criar links que validem sessão e escopo ao abrir a pendência.
- [ ] **E029.09** — Definir estados criado, enfileirado, enviado e falhou com significado preciso.
- [ ] **E029.10** — Validar a matriz com exemplos de compra, arte e entrega parcial.

**Critério obrigatório de conclusão:** Avisos têm destinatário autorizado e próxima ação; canal inexistente não é anunciado.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E030 — Validar fluxos em protótipos de baixa fidelidade

**Responsável funcional:** UX e Pesquisa.

**Dependências:** E021, E023, E024, E025, E027, E028, E029.

**Entregável:** Fluxos testados antes do acabamento visual.

**Base e reaproveitamento:** Arquitetura de informação; jornadas; GOV.UK.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E030.01** — Prototipar a entrada do comprador e a seleção de contexto.
- [ ] **E030.02** — Representar busca, filtro, detalhe e retorno ao catálogo.
- [ ] **E030.03** — Simular montagem de campanha e definição de destinos.
- [ ] **E030.04** — Representar proposta com valores, validade e pendências.
- [ ] **E030.05** — Separar a aprovação da arte da autorização da despesa.
- [ ] **E030.06** — Incluir rejeição, correção e retomada de trabalho no protótipo.
- [ ] **E030.07** — Representar entrega parcial e abertura de ocorrência.
- [ ] **E030.08** — Conduzir tarefas observadas sem orientar o caminho esperado.
- [ ] **E030.09** — Priorizar falhas por impacto e revisar os fluxos correspondentes.
- [ ] **E030.10** — Registrar evidências da segunda verificação dos problemas críticos encontrados.

**Critério obrigatório de conclusão:** Tarefas críticas são compreendidas; problemas graves têm correção e nova verificação.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 04 — Sistema visual

### E031 — Definir direção visual com a marca Sicoob

**Responsável funcional:** Direção de design e responsável pela marca.

**Dependências:** E010, E026, E030.

**Entregável:** Direção visual e ativos autorizados.

**Base e reaproveitamento:** Guia de marca março/2023; tema Sicoob existente.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E031.01** — Confirmar o manual vigente e o responsável por validar seu uso.
- [ ] **E031.02** — Obter arquivos autorizados de logo, assinaturas e variações necessárias.
- [ ] **E031.03** — Documentar proporção, área de proteção e tamanho mínimo aplicáveis.
- [ ] **E031.04** — Resolver a divergência de RGB e HEX identificada no guia consultado.
- [ ] **E031.05** — Definir relação entre identidade Sicoob e identificação do fornecedor operador.
- [ ] **E031.06** — Escolher referências visuais por clareza, confiança e contexto institucional.
- [ ] **E031.07** — Criar alternativas aplicadas a catálogo, proposta e aprovação reais.
- [ ] **E031.08** — Comparar alternativas por legibilidade e foco na tarefa de compra.
- [ ] **E031.09** — Validar a direção com marketing e participantes do público prioritário.
- [ ] **E031.10** — Registrar ativos, restrições e decisão visual sem declarar homologação inexistente.

**Critério obrigatório de conclusão:** A proposta usa a versão de marca validada e demonstra consistência em telas reais do portal.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E032 — Estabelecer grade, espaçamento e densidade

**Responsável funcional:** Design de interface e Frontend.

**Dependências:** E030, E031.

**Entregável:** Sistema de layout responsivo.

**Base e reaproveitamento:** Layouts existentes; tokens; protótipos aprovados.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E032.01** — Definir contêineres e larguras máximas para conteúdo comercial e tabelas.
- [ ] **E032.02** — Criar escala de espaçamento reutilizável para campos e agrupamentos.
- [ ] **E032.03** — Definir margens e colunas por necessidade do conteúdo.
- [ ] **E032.04** — Estabelecer ritmo vertical entre título, instrução, dados e ação.
- [ ] **E032.05** — Separar densidade de consulta frequente da densidade de preenchimento.
- [ ] **E032.06** — Evitar que cabeçalhos fixos ocupem espaço excessivo em telas pequenas.
- [ ] **E032.07** — Definir quebra de colunas sem alterar a ordem lógica da leitura.
- [ ] **E032.08** — Testar nomes longos de cooperativas, produtos e centros de custo.
- [ ] **E032.09** — Mapear classes existentes para a escala e reduzir exceções locais.
- [ ] **E032.10** — Validar três telas representativas em diferentes larguras e níveis de ampliação.

**Critério obrigatório de conclusão:** Páginas mantêm hierarquia e leitura em larguras pequenas, médias e amplas, sem medidas arbitrárias por tela.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E033 — Definir tipografia e hierarquia de leitura

**Responsável funcional:** Design de interface e Conteúdo.

**Dependências:** E026, E031, E032.

**Entregável:** Escala tipográfica aplicada.

**Base e reaproveitamento:** Guia de marca; Asap; fontes existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E033.01** — Confirmar família institucional licenciada e fontes de substituição.
- [ ] **E033.02** — Definir estilos semânticos para títulos, corpo, legenda e dados.
- [ ] **E033.03** — Dimensionar entrelinha e largura de texto para leitura confortável.
- [ ] **E033.04** — Usar pesos com função clara, evitando excesso de variações.
- [ ] **E033.05** — Padronizar alinhamento e dígitos de preços, quantidades e saldos.
- [ ] **E033.06** — Preservar hierarquia de títulos na estrutura semântica da página.
- [ ] **E033.07** — Evitar textos operacionais pequenos para acomodar mais conteúdo.
- [ ] **E033.08** — Definir carregamento de fontes sem bloquear a apresentação inicial.
- [ ] **E033.09** — Testar substituição de fonte e aumento de tamanho do texto.
- [ ] **E033.10** — Validar leitura de proposta, tabela de pedidos e formulário em telas reais.

**Critério obrigatório de conclusão:** Textos, valores e estados são legíveis; carregamento de fontes não prejudica a tarefa.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E034 — Definir cores semânticas e contraste

**Responsável funcional:** Design de interface e Acessibilidade.

**Dependências:** E031, E033.

**Entregável:** Paleta semântica acessível.

**Base e reaproveitamento:** Paleta Sicoob; W3C contraste de texto e componentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E034.01** — Mapear cores institucionais para superfícies, texto, bordas e ações.
- [ ] **E034.02** — Reservar cores de sucesso, aviso e erro para significados consistentes.
- [ ] **E034.03** — Definir combinações aprovadas para estado normal, foco e seleção.
- [ ] **E034.04** — Evitar texto branco normal sobre o turquesa de contraste insuficiente.
- [ ] **E034.05** — Calcular contraste mínimo de 4,5:1 para texto normal aplicável.
- [ ] **E034.06** — Verificar contraste de texto grande e informação essencial de controles.
- [ ] **E034.07** — Adicionar rótulo ou ícone com texto aos estados relevantes.
- [ ] **E034.08** — Testar visualização sem cor e em configurações de alto contraste.
- [ ] **E034.09** — Documentar combinações proibidas e alternativas para o mesmo uso.
- [ ] **E034.10** — Validar a paleta nas telas de login, catálogo, verba e aprovação.

**Critério obrigatório de conclusão:** Combinações de texto e controles atendem os critérios aplicáveis; estado nunca depende apenas de cor.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E035 — Padronizar imagens, ícones e representação de produto

**Responsável funcional:** Design e Conteúdo de catálogo.

**Dependências:** E022, E031, E034.

**Entregável:** Guia de ativos visuais comerciais.

**Base e reaproveitamento:** Galerias existentes; catálogo; componentes de ícones.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E035.01** — Definir proporção, enquadramento e fundo para imagens de catálogo.
- [ ] **E035.02** — Preservar referência visual de escala, material e detalhes relevantes.
- [ ] **E035.03** — Relacionar imagens corretamente à variante selecionada.
- [ ] **E035.04** — Separar fotografia real de mockup ilustrativo com identificação visível.
- [ ] **E035.05** — Definir imagens de apoio para técnica e área de personalização.
- [ ] **E035.06** — Padronizar um conjunto de ícones compatível com a interface existente.
- [ ] **E035.07** — Evitar depender de ícone sem rótulo em ações pouco familiares.
- [ ] **E035.08** — Escrever textos alternativos adequados à função da imagem.
- [ ] **E035.09** — Preparar fallback de mídia que não pareça produto disponível confirmado.
- [ ] **E035.10** — Revisar amostra de categorias e comprovar carregamento dos ativos autorizados.

**Critério obrigatório de conclusão:** Imagens ajudam a avaliar o produto e distinguem fotografia, simulação e prova de produção.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E036 — Implementar tokens de design

**Responsável funcional:** Frontend e Design de sistemas.

**Dependências:** E032, E033, E034, E035.

**Entregável:** Tokens compartilhados entre especificação e código.

**Base e reaproveitamento:** Tailwind; CSS variables; componentes ui.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E036.01** — Inventariar cores, fontes, espaçamentos e elevações já existentes.
- [ ] **E036.02** — Definir nomes semânticos para os tokens efetivamente necessários.
- [ ] **E036.03** — Mapear valores institucionais para variáveis centralizadas.
- [ ] **E036.04** — Separar token de marca de token de estado e interação.
- [ ] **E036.05** — Unificar estilos repetidos nas páginas priorizadas sem refatoração ampla.
- [ ] **E036.06** — Documentar contratos de borda, raio e sombra com uso moderado.
- [ ] **E036.07** — Definir tokens para foco e áreas de interação.
- [ ] **E036.08** — Implementar exemplos que demonstrem alteração de tema com consistência.
- [ ] **E036.09** — Verificar contrastes após aplicar tokens aos componentes reais.
- [ ] **E036.10** — Revisar a correspondência entre especificação visual e estilos entregues.

**Critério obrigatório de conclusão:** Mudança de um token atualiza os componentes correspondentes sem divergência visual ou semântica.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E037 — Consolidar componentes de ação e formulário

**Responsável funcional:** Frontend, Design e Acessibilidade.

**Dependências:** E027, E028, E036.

**Entregável:** Biblioteca essencial de interação.

**Base e reaproveitamento:** shadcn/ui; inputs; botões; formulários existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E037.01** — Definir hierarquia de botão principal, secundário e ação destrutiva.
- [ ] **E037.02** — Implementar estados de espera sem permitir envio financeiro duplicado.
- [ ] **E037.03** — Padronizar campo de texto, seleção, quantidade, data e valor monetário.
- [ ] **E037.04** — Associar rótulos, instruções e erros aos campos correspondentes.
- [ ] **E037.05** — Usar elementos nativos quando eles atendem à necessidade de interação.
- [ ] **E037.06** — Definir área de toque preferencial de 44 pixels para ações principais.
- [ ] **E037.07** — Verificar mínimo normativo aplicável e exceções de alvos menores documentadas.
- [ ] **E037.08** — Implementar diálogos com foco inicial, contenção e retorno ao acionador.
- [ ] **E037.09** — Oferecer alternativas a gestos de arrastar e ações exclusivamente por hover.
- [ ] **E037.10** — Validar exemplos com teclado, toque e tecnologia assistiva nas telas do portal.

**Critério obrigatório de conclusão:** Componentes possuem estados, semântica, foco e mensagens consistentes nas jornadas críticas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E038 — Consolidar tabelas, listas e visualização de estados

**Responsável funcional:** Frontend e Design.

**Dependências:** E032, E033, E034, E036.

**Entregável:** Componentes de consulta operacional.

**Base e reaproveitamento:** Tabelas e cards existentes; listagens de pedidos.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E038.01** — Definir quando usar tabela, lista ou card por tarefa do usuário.
- [ ] **E038.02** — Priorizar colunas de identificação, valor, prazo e pendência.
- [ ] **E038.03** — Alinhar números e unidades sem misturar formatos incompatíveis.
- [ ] **E038.04** — Implementar ordenação com indicação textual e estado acessível.
- [ ] **E038.05** — Definir seleção de linha e seleção em lote sem ambiguidade de escopo.
- [ ] **E038.06** — Preservar cabeçalhos e relação entre célula e coluna.
- [ ] **E038.07** — Planejar comportamento móvel com detalhes progressivos ou rolagem localizada.
- [ ] **E038.08** — Mostrar total, página e intervalo sem contagens inventadas.
- [ ] **E038.09** — Representar estados com texto, data e ação pertinente.
- [ ] **E038.10** — Validar consulta, seleção e retorno ao item em volume representativo de dados.

**Critério obrigatório de conclusão:** Dados densos continuam legíveis e operáveis, com seleção e paginação inequívocas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E039 — Projetar feedback e movimento com propósito

**Responsável funcional:** Design de interação e Frontend.

**Dependências:** E028, E036, E037, E038.

**Entregável:** Padrão de transições e feedback.

**Base e reaproveitamento:** Framer Motion; motion-tokens; loading existente.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E039.01** — Relacionar cada animação proposta à informação que ela comunica.
- [ ] **E039.02** — Definir durações discretas para mudança de estado e transição.
- [ ] **E039.03** — Evitar animações contínuas em conteúdo de trabalho e decisão.
- [ ] **E039.04** — Respeitar preferência por redução de movimento do dispositivo.
- [ ] **E039.05** — Preservar foco durante abertura, fechamento e atualização de componentes.
- [ ] **E039.06** — Usar feedback imediato de interação sem simular aprovação concluída.
- [ ] **E039.07** — Reservar mensagens persistentes para resultados que exigem leitura posterior.
- [ ] **E039.08** — Evitar deslocamentos de layout ao carregar imagens e valores.
- [ ] **E039.09** — Testar percepção de carregamento em conexão lenta.
- [ ] **E039.10** — Remover efeitos que dificultem leitura ou não tenham função demonstrável.

**Critério obrigatório de conclusão:** Movimento orienta a tarefa, respeita redução de animação e não encobre confirmação operacional.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E040 — Governar o sistema de design

**Responsável funcional:** Design de sistemas e Liderança técnica.

**Dependências:** E036, E037, E038, E039.

**Entregável:** Catálogo de componentes e processo de evolução.

**Base e reaproveitamento:** Biblioteca ui; tokens; documentação de contribuição.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E040.01** — Documentar cada componente com uso recomendado e limites.
- [ ] **E040.02** — Publicar exemplos de estados preenchido, vazio, inválido e desabilitado.
- [ ] **E040.03** — Associar requisitos de acessibilidade ao contrato do componente.
- [ ] **E040.04** — Registrar correspondência entre especificação visual e implementação.
- [ ] **E040.05** — Definir revisão para inclusão de nova variante ou exceção.
- [ ] **E040.06** — Evitar duplicação de componentes com diferenças apenas cosméticas.
- [ ] **E040.07** — Criar exemplos com nomes longos, dados extremos e múltiplos estados.
- [ ] **E040.08** — Definir versionamento e impacto de mudanças sobre consumidores existentes.
- [ ] **E040.09** — Validar alterações relevantes nas telas representativas do portal.
- [ ] **E040.10** — Formalizar responsáveis por manter consistência e corrigir regressões visuais.

**Critério obrigatório de conclusão:** As páginas novas usam componentes publicados; exceções possuem justificativa e responsável.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 05 — Catálogo e decisão

### E041 — Redesenhar a experiência de acesso

**Responsável funcional:** UX, Frontend e Conteúdo.

**Dependências:** E015, E016, E026, E040.

**Entregável:** Login e recuperação prontos para uso institucional.

**Base e reaproveitamento:** Auth existente; inspeção visual do diagnóstico.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E041.01** — Aplicar a identidade autorizada com logo carregada localmente.
- [ ] **E041.02** — Explicar a finalidade do portal em texto curto e verificável.
- [ ] **E041.03** — Destacar a ação principal de entrada e a recuperação de acesso.
- [ ] **E041.04** — Apresentar apenas provedores configurados e aprovados para o ambiente.
- [ ] **E041.05** — Explicar o acesso por convite quando não houver cadastro público.
- [ ] **E041.06** — Preservar email preenchido em erros recuperáveis.
- [ ] **E041.07** — Evitar distrações comerciais e métricas sem comprovação no login.
- [ ] **E041.08** — Mostrar ajuda para convite expirado ou vínculo ausente.
- [ ] **E041.09** — Validar contraste, teclado, autofill e mensagens em largura móvel.
- [ ] **E041.10** — Homologar entrada e retorno seguro ao destino autorizado solicitado.

**Critério obrigatório de conclusão:** Usuário identifica o serviço, entra ou recupera acesso sem controles de teste ou provedores fictícios.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E042 — Criar início orientado às pendências

**Responsável funcional:** UX, Frontend e Produto.

**Dependências:** E009, E025, E029, E038, E040, E041.

**Entregável:** Página inicial por responsabilidade.

**Base e reaproveitamento:** Dashboard existente; verbas; notificações.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E042.01** — Priorizar pendências de arte, despesa, correção e recebimento.
- [ ] **E042.02** — Exibir cooperativa, unidade e período que contextualizam os dados.
- [ ] **E042.03** — Apresentar saldo apenas quando o contrato de verba estiver consistente.
- [ ] **E042.04** — Criar atalhos para nova solicitação e continuidade de rascunho.
- [ ] **E042.05** — Separar alertas de prazo das mensagens meramente informativas.
- [ ] **E042.06** — Mostrar pedidos recentes com estágio e próxima ação verificáveis.
- [ ] **E042.07** — Omitir previsões, probabilidades e contadores sem origem real.
- [ ] **E042.08** — Projetar primeiro acesso sem dados com orientação acionável.
- [ ] **E042.09** — Respeitar permissões ao consultar indicadores agregados.
- [ ] **E042.10** — Validar que cada perfil identifica sua principal pendência sem ajuda.

**Critério obrigatório de conclusão:** As informações apresentadas correspondem ao contexto ativo e levam diretamente à próxima ação útil.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E043 — Implementar listagem de catálogo útil

**Responsável funcional:** Frontend, UX e Catálogo.

**Dependências:** E003, E022, E024, E035, E038, E040.

**Entregável:** Catálogo responsivo conectado.

**Base e reaproveitamento:** Cards e grid de produtos; TanStack Query; bridge.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E043.01** — Conectar a listagem ao adaptador de leitura autorizado.
- [ ] **E043.02** — Exibir nome, imagem, variante e identificador de produto consistentes.
- [ ] **E043.03** — Informar preço como estimativa ou condição vigente conforme o contrato.
- [ ] **E043.04** — Mostrar mínimo e múltiplo de compra quando conhecidos.
- [ ] **E043.05** — Apresentar disponibilidade com horário e limite de confiabilidade.
- [ ] **E043.06** — Separar produto indisponível de falha de integração.
- [ ] **E043.07** — Permitir abrir detalhes sem perder posição na listagem.
- [ ] **E043.08** — Carregar imagens e próximas páginas conforme necessidade de uso.
- [ ] **E043.09** — Verificar navegação acessível quando houver virtualização de itens.
- [ ] **E043.10** — Validar uma amostra real sem alterações no cadastro mestre.

**Critério obrigatório de conclusão:** Itens exibem dados reais, variante identificável e condições suficientes para iniciar uma seleção.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E044 — Implementar busca com recuperação de intenção

**Responsável funcional:** Frontend e Engenharia de busca.

**Dependências:** E023, E028, E037, E043.

**Entregável:** Busca operacional e mensurável.

**Base e reaproveitamento:** Busca existente; conjunto de consultas da etapa 23.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E044.01** — Disponibilizar campo de busca em posição consistente do catálogo.
- [ ] **E044.02** — Implementar consulta por nome e correspondência exata de código.
- [ ] **E044.03** — Aplicar normalização e sinônimos aprovados ao mecanismo disponível.
- [ ] **E044.04** — Oferecer sugestões navegáveis por teclado com significado explícito.
- [ ] **E044.05** — Preservar a consulta ao abrir produto e voltar aos resultados.
- [ ] **E044.06** — Apresentar correção sugerida sem apagar a busca original.
- [ ] **E044.07** — Mostrar alternativas de refinamento quando não houver correspondência.
- [ ] **E044.08** — Tratar latência e falha sem repetir consulta indefinidamente.
- [ ] **E044.09** — Registrar eventos de busca sem conteúdo pessoal desnecessário.
- [ ] **E044.10** — Executar o conjunto de avaliação e corrigir resultados críticos inadequados.

**Critério obrigatório de conclusão:** Consultas prioritárias encontram itens esperados; ausência ou erro oferece recuperação coerente.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E045 — Implementar filtros acessíveis e persistentes

**Responsável funcional:** Frontend e UX.

**Dependências:** E024, E037, E043, E044.

**Entregável:** Refinamento de catálogo por critérios reais.

**Base e reaproveitamento:** FilterPanel; componentes de seleção; query state.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E045.01** — Conectar grupos de filtros aos atributos autorizados do catálogo.
- [ ] **E045.02** — Mostrar seleção ativa fora dos painéis recolhidos.
- [ ] **E045.03** — Implementar remoção individual e limpeza completa dos critérios.
- [ ] **E045.04** — Diferenciar opção sem resultado de informação indisponível.
- [ ] **E045.05** — Manter ordenação e filtros no retorno da página de produto.
- [ ] **E045.06** — Definir persistência segura por contexto e parâmetros compartilháveis permitidos.
- [ ] **E045.07** — Apresentar painel móvel com aplicar, limpar e fechar compreensíveis.
- [ ] **E045.08** — Restaurar foco após fechar painel ou remover um filtro.
- [ ] **E045.09** — Anunciar atualização dos resultados sem interromper a navegação.
- [ ] **E045.10** — Validar combinações extremas, retorno do navegador e uso apenas por teclado.

**Critério obrigatório de conclusão:** Filtros ativos são visíveis, reversíveis e preservados ao navegar, inclusive em tela móvel.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E046 — Construir página de produto para decisão

**Responsável funcional:** UX, Catálogo e Frontend.

**Dependências:** E019, E035, E040, E043, E045.

**Entregável:** Detalhe comercial e técnico do produto.

**Base e reaproveitamento:** Galeria; variantes; especificações; detalhe existente.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E046.01** — Organizar nome, código, variante e imagens no início da página.
- [ ] **E046.02** — Exibir materiais, dimensões, capacidade e embalagem conforme os dados disponíveis.
- [ ] **E046.03** — Apresentar seletores de cor e tamanho com disponibilidade correspondente.
- [ ] **E046.04** — Mostrar mínimo, múltiplo e faixas comerciais aplicáveis.
- [ ] **E046.05** — Explicar técnicas e áreas de personalização compatíveis.
- [ ] **E046.06** — Identificar limitações relevantes antes de adicionar à proposta.
- [ ] **E046.07** — Mostrar data da consulta de estoque e condição de reconfirmação.
- [ ] **E046.08** — Oferecer ficha técnica e ajuda contextual quando disponíveis.
- [ ] **E046.09** — Preservar seleção ao simular preço e retornar aos detalhes.
- [ ] **E046.10** — Validar decisões com compradores usando produtos de categorias diferentes.

**Critério obrigatório de conclusão:** Comprador entende o item, suas restrições e o próximo passo sem confundir simulação com contratação.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E047 — Especificar personalização sem ambiguidade

**Responsável funcional:** UX, Produção e Frontend.

**Dependências:** E007, E035, E037, E046.

**Entregável:** Configurador de personalização comercialmente válido.

**Base e reaproveitamento:** Motor de personalização; áreas de impressão; mockups.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E047.01** — Relacionar técnicas disponíveis à variante e ao material selecionados.
- [ ] **E047.02** — Mostrar área útil e posição de aplicação com apoio visual.
- [ ] **E047.03** — Informar limites de dimensões e número de cores por técnica.
- [ ] **E047.04** — Explicar preparação, matriz e custos adicionais quando aplicáveis.
- [ ] **E047.05** — Impedir combinações tecnicamente incompatíveis antes de enviar a proposta.
- [ ] **E047.06** — Oferecer análise manual quando a informação do catálogo for insuficiente.
- [ ] **E047.07** — Identificar a prévia como simulação e separar aprovação de produção.
- [ ] **E047.08** — Registrar observações relevantes sem substituir especificações estruturadas.
- [ ] **E047.09** — Preservar configuração na proposta e na versão da arte.
- [ ] **E047.10** — Validar configurações de amostra com produção e documentar as restrições aplicadas.

**Critério obrigatório de conclusão:** Técnica, área, dimensão e quantidade de cores formam uma configuração executável ou exigem análise explícita.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E048 — Implementar simulação transparente de custo e prazo

**Responsável funcional:** Comercial, UX e Backend.

**Dependências:** E003, E017, E019, E046, E047.

**Entregável:** Simulador com condições explícitas.

**Base e reaproveitamento:** Simuladores existentes; B19; contrato comercial.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E048.01** — Separar preço comercial de custo de aquisição interno.
- [ ] **E048.02** — Calcular faixas por quantidade com mínimo e múltiplo válidos.
- [ ] **E048.03** — Discriminar personalização, preparação e embalagem aplicáveis.
- [ ] **E048.04** — Integrar estimativa de frete por destino quando houver fonte confiável.
- [ ] **E048.05** — Explicar tributos e condições incluídos ou ainda pendentes de cálculo.
- [ ] **E048.06** — Separar tempo de análise, produção e transporte.
- [ ] **E048.07** — Indicar dependência de arte aprovada e pagamento quando contratual.
- [ ] **E048.08** — Recalcular valores quando variante, quantidade ou destino mudar.
- [ ] **E048.09** — Bloquear confirmação quando faltar dado necessário à proposta firme.
- [ ] **E048.10** — Conciliar exemplos do simulador com cálculos comerciais revisados.

**Critério obrigatório de conclusão:** Total e prazo exibidos são reproduzíveis; estimativa não é apresentada como proposta firme ou reserva.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E049 — Implementar comparação de alternativas

**Responsável funcional:** UX, Frontend e Compras.

**Dependências:** E038, E046, E048.

**Entregável:** Comparador de propostas de produto.

**Base e reaproveitamento:** Compare existente; fichas de produto; custo total.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E049.01** — Permitir selecionar um conjunto manejável de alternativas do catálogo.
- [ ] **E049.02** — Priorizar preço entregue, mínimo, prazo e personalização na comparação.
- [ ] **E049.03** — Normalizar quantidade e unidade para evitar comparação enganosa.
- [ ] **E049.04** — Evidenciar diferenças de material, embalagem e capacidade.
- [ ] **E049.05** — Marcar informação não disponível sem estimar um valor fictício.
- [ ] **E049.06** — Permitir retirar e substituir alternativas preservando o restante.
- [ ] **E049.07** — Adaptar comparação à tela móvel sem ocultar o nome do item.
- [ ] **E049.08** — Manter foco e cabeçalhos compreensíveis na leitura assistiva.
- [ ] **E049.09** — Permitir levar a alternativa escolhida para a proposta com sua configuração.
- [ ] **E049.10** — Validar uma decisão de compra e registrar dúvidas que ainda exigem atendimento.

**Critério obrigatório de conclusão:** Comparação usa quantidades e bases equivalentes e evidencia informações desconhecidas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E050 — Organizar favoritos e coleções compartilhadas

**Responsável funcional:** UX, Frontend e Segurança.

**Dependências:** E013, E025, E043, E046, E049.

**Entregável:** Coleções privadas e colaboração autorizada.

**Base e reaproveitamento:** Favoritos; collections-public-share-system; listas existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E050.01** — Permitir salvar produto com variante e contexto de interesse.
- [ ] **E050.02** — Organizar listas por campanha, evento ou necessidade recorrente.
- [ ] **E050.03** — Definir proprietário, colaboradores e permissão de edição da coleção.
- [ ] **E050.04** — Isolar listas entre cooperativas e contextos não compartilhados.
- [ ] **E050.05** — Indicar produtos descontinuados ou condições comerciais alteradas.
- [ ] **E050.06** — Definir comentários úteis à seleção sem simular aprovação formal.
- [ ] **E050.07** — Restringir links externos aos campos e pessoas autorizados.
- [ ] **E050.08** — Implementar validade e revogação dos compartilhamentos permitidos.
- [ ] **E050.09** — Oferecer desfazer remoção quando a ação for reversível.
- [ ] **E050.10** — Validar colaboração, expiração e acesso negado com dois contextos distintos.

**Critério obrigatório de conclusão:** Pessoas compartilham seleções no escopo permitido sem publicar custos internos ou dados de outra cooperativa.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 06 — Campanhas e propostas

### E051 — Criar briefing de campanha e necessidade

**Responsável funcional:** UX, Marketing e Produto.

**Dependências:** E008, E027, E030, E040, E050.

**Entregável:** Formulário de campanha com contexto suficiente.

**Base e reaproveitamento:** Coleções; pesquisa com marketing; exemplos de campanhas.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E051.01** — Definir campanha, necessidade avulsa e reposição como contextos distintos.
- [ ] **E051.02** — Solicitar objetivo da ação em linguagem compreensível para o PA.
- [ ] **E051.03** — Registrar público, quantidade estimada e responsável pela iniciativa.
- [ ] **E051.04** — Diferenciar data do evento de data desejada de recebimento.
- [ ] **E051.05** — Associar cooperativa, unidades e centro de custo autorizados.
- [ ] **E051.06** — Permitir anexar referências com indicação de uso e origem.
- [ ] **E051.07** — Preencher dados conhecidos do contexto sem assumir escolhas comerciais.
- [ ] **E051.08** — Salvar rascunho e permitir colaboração conforme as permissões.
- [ ] **E051.09** — Mostrar informações pendentes antes de encaminhar para cotação.
- [ ] **E051.10** — Validar briefings reais anonimizados com compras, marketing e operação.

**Critério obrigatório de conclusão:** Briefing orienta seleção e operação sem exigir informações que o solicitante ainda não possui.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E052 — Planejar campanhas e marcos de prazo

**Responsável funcional:** Marketing, UX e Operação.

**Dependências:** E007, E029, E048, E051.

**Entregável:** Visão de campanhas com dependências de prazo.

**Base e reaproveitamento:** Campanhas; cronograma de produção; jornada proposta.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E052.01** — Relacionar campanhas à data do evento e aos destinos atendidos.
- [ ] **E052.02** — Definir marcos de escolha, cotação, arte, autorização e produção.
- [ ] **E052.03** — Estimar datas regressivas a partir de condições comerciais verificáveis.
- [ ] **E052.04** — Sinalizar dependências sem prometer prazo ainda não confirmado.
- [ ] **E052.05** — Exibir responsável e próxima ação de cada marco pendente.
- [ ] **E052.06** — Permitir alteração justificada de data preservando o histórico.
- [ ] **E052.07** — Mostrar conflito entre prazo solicitado e prazo viável de entrega.
- [ ] **E052.08** — Oferecer alternativa de produto ou distribuição sujeita a nova validação.
- [ ] **E052.09** — Adaptar agenda para visualização em lista acessível.
- [ ] **E052.10** — Simular campanha com atraso de arte e revisar seus impactos de prazo.

**Critério obrigatório de conclusão:** Agenda separa datas confirmadas de estimadas e evidencia risco de não atender ao evento.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E053 — Organizar biblioteca de marcas e arquivos

**Responsável funcional:** Design, Marketing e Segurança.

**Dependências:** E013, E016, E031, E051.

**Entregável:** Biblioteca privada de ativos por cooperativa.

**Base e reaproveitamento:** Storage; anexos; ativos autorizados da marca.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E053.01** — Definir tipos de arquivo aceitos para logos, referências e artes.
- [ ] **E053.02** — Registrar propriedade e permissão de uso dos ativos enviados.
- [ ] **E053.03** — Separar assinatura institucional de marca local e material de campanha.
- [ ] **E053.04** — Armazenar arquivos em escopo privado com vínculo organizacional.
- [ ] **E053.05** — Validar extensão, conteúdo, tamanho e riscos de processamento do arquivo.
- [ ] **E053.06** — Manter versões e identificar qual ativo está vigente para uso.
- [ ] **E053.07** — Disponibilizar prévia segura e download apenas para pessoas autorizadas.
- [ ] **E053.08** — Tratar substituição de ativo sem alterar pedidos históricos.
- [ ] **E053.09** — Definir retenção e revogação conforme finalidade e responsabilidades aprovadas.
- [ ] **E053.10** — Testar isolamento, arquivo inválido e recuperação de versão anterior.

**Critério obrigatório de conclusão:** Arquivos têm proprietário, versão e permissão; um ativo de outra cooperativa não pode ser aplicado indevidamente.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E054 — Produzir prova técnica da personalização

**Responsável funcional:** Produção, Design e Frontend.

**Dependências:** E047, E051, E053.

**Entregável:** Prova técnica versionada por item.

**Base e reaproveitamento:** Mockups existentes; piloto de arte; especificações técnicas.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E054.01** — Vincular a prova ao item e à variante da proposta.
- [ ] **E054.02** — Identificar técnica, posição e dimensões efetivas de aplicação.
- [ ] **E054.03** — Mostrar cores e limitações relevantes do processo de impressão.
- [ ] **E054.04** — Anexar o arquivo de arte e sua versão imutável.
- [ ] **E054.05** — Distinguir representação ilustrativa de prova técnica validada pela produção.
- [ ] **E054.06** — Registrar embalagem e composição quando afetarem a personalização.
- [ ] **E054.07** — Permitir comentários ancorados no item ou na área correspondente.
- [ ] **E054.08** — Comparar revisões destacando o que mudou entre versões.
- [ ] **E054.09** — Emitir documento legível para revisão em desktop e dispositivo móvel.
- [ ] **E054.10** — Validar prova de amostra com produção antes de habilitar aprovação formal.

**Critério obrigatório de conclusão:** Documento identifica produto, variante, técnica, dimensões e arquivo exato proposto para produção.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E055 — Construir kits com composição verificável

**Responsável funcional:** UX, Comercial e Frontend.

**Dependências:** E046, E047, E048, E051.

**Entregável:** Montador de kits com custo e restrições.

**Base e reaproveitamento:** Kit builder existente; simulador; catálogo de variantes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E055.01** — Permitir adicionar produtos e variantes à composição do kit.
- [ ] **E055.02** — Definir quantidade de cada componente por unidade de kit.
- [ ] **E055.03** — Calcular demanda total a partir da quantidade de kits solicitada.
- [ ] **E055.04** — Validar mínimos e múltiplos de cada componente individualmente.
- [ ] **E055.05** — Exibir personalização e custos adicionais associados aos componentes.
- [ ] **E055.06** — Incluir embalagem e montagem quando fizerem parte do fornecimento.
- [ ] **E055.07** — Sinalizar componente indisponível e permitir substituição revisada.
- [ ] **E055.08** — Oferecer ordenação por botões além de arrastar e soltar.
- [ ] **E055.09** — Preservar composição e imagens como versão da proposta.
- [ ] **E055.10** — Conferir kit de exemplo com comercial e produção antes de liberar uso.

**Critério obrigatório de conclusão:** Composição respeita quantidades, mínimos, disponibilidade e embalagem; preço pode ser reproduzido por item.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E056 — Planejar distribuição por PA e destino

**Responsável funcional:** UX, Compras e Operação.

**Dependências:** E011, E025, E027, E048, E051, E055.

**Entregável:** Distribuição de quantidades e custos por destino.

**Base e reaproveitamento:** PAs; endereços; planilhas de distribuição existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E056.01** — Listar unidades e endereços autorizados no contexto da cooperativa.
- [ ] **E056.02** — Permitir distribuir produtos ou kits por destino.
- [ ] **E056.03** — Validar soma das quantidades e evidenciar saldo ainda não distribuído.
- [ ] **E056.04** — Registrar contato operacional mínimo necessário ao recebimento.
- [ ] **E056.05** — Definir data necessária e restrições de recebimento por unidade.
- [ ] **E056.06** — Calcular ou solicitar frete correspondente a cada distribuição.
- [ ] **E056.07** — Permitir importação assistida de distribuição com prévia e validação.
- [ ] **E056.08** — Tratar unidade inativa, endereço incompleto e duplicidade de destino.
- [ ] **E056.09** — Mostrar impacto da redistribuição sobre custo e prazo.
- [ ] **E056.10** — Validar uma campanha com pelo menos três destinos e quantidades diferentes.

**Critério obrigatório de conclusão:** A soma distribuída confere com o total; cada destino tem identificação, prazo e vínculo autorizado.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E057 — Criar carrinho de solicitação institucional

**Responsável funcional:** UX e Frontend.

**Dependências:** E025, E046, E048, E050, E055, E056.

**Entregável:** Carrinho vinculado ao contexto correto.

**Base e reaproveitamento:** Cart e quote builder existentes; rascunhos.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E057.01** — Identificar claramente se a seleção cria solicitação ou pedido contratado.
- [ ] **E057.02** — Guardar variante, personalização e quantidade de cada item.
- [ ] **E057.03** — Separar carrinhos e rascunhos por cooperativa e responsável.
- [ ] **E057.04** — Mostrar inconsistências que impedem solicitar orçamento.
- [ ] **E057.05** — Permitir editar item sem perder o restante da seleção.
- [ ] **E057.06** — Oferecer remoção reversível quando ainda não houver compromisso comercial.
- [ ] **E057.07** — Preservar distribuição e campanha ao retomar um rascunho.
- [ ] **E057.08** — Revalidar dados antigos do catálogo antes de avançar.
- [ ] **E057.09** — Apresentar total estimado e itens ainda dependentes de cotação.
- [ ] **E057.10** — Testar retomada, troca de contexto e alteração concorrente do rascunho.

**Critério obrigatório de conclusão:** Itens, configurações e destinos persistem corretamente; alterações relevantes exigem recalcular a proposta.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E058 — Apresentar orçamento com custo total claro

**Responsável funcional:** UX, Comercial e Frontend.

**Dependências:** E026, E048, E056, E057.

**Entregável:** Resumo comercial completo e compreensível.

**Base e reaproveitamento:** Simulador; ProposalSections; contratos comerciais.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E058.01** — Exibir produto, variante, quantidade e preço unitário por item.
- [ ] **E058.02** — Discriminar personalização e preparação de produção aplicáveis.
- [ ] **E058.03** — Apresentar embalagem, montagem e frete por destino quando cobrados.
- [ ] **E058.04** — Indicar tributos e condições comerciais incluídos no valor.
- [ ] **E058.05** — Separar desconto autorizado de preço de origem e negociação pendente.
- [ ] **E058.06** — Mostrar total consolidado e distribuição relevante por centro de custo.
- [ ] **E058.07** — Apresentar validade, condição de pagamento e prazo contratado ou estimado.
- [ ] **E058.08** — Evidenciar os dados ainda necessários para uma proposta firme.
- [ ] **E058.09** — Disponibilizar resumo legível antes de qualquer solicitação de aprovação.
- [ ] **E058.10** — Conferir arredondamento e compreensão do total com compras e financeiro.

**Critério obrigatório de conclusão:** A soma de itens e encargos coincide com o total; não há custo obrigatório oculto no avanço.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E059 — Versionar propostas e preservar decisões

**Responsável funcional:** Backend, Comercial e UX.

**Dependências:** E011, E018, E054, E058.

**Entregável:** Proposta versionada com histórico imutável.

**Base e reaproveitamento:** Quotes; snapshots; serviços de aprovação.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E059.01** — Definir identificador e número de versão da proposta.
- [ ] **E059.02** — Guardar fotografia de itens, preços, condições e distribuição.
- [ ] **E059.03** — Associar as versões de arte exigidas por cada item.
- [ ] **E059.04** — Impedir edição silenciosa de proposta já enviada para decisão.
- [ ] **E059.05** — Destacar diferenças entre versão anterior e revisão comercial.
- [ ] **E059.06** — Definir quais mudanças invalidam aprovação de arte ou despesa.
- [ ] **E059.07** — Registrar validade e expiração da proposta independentemente do catálogo.
- [ ] **E059.08** — Gerar documento com identificação inequívoca da versão apresentada.
- [ ] **E059.09** — Preservar vínculo entre proposta aceita e pedido resultante.
- [ ] **E059.10** — Testar alteração de preço e arte sem modificar registros já aprovados.

**Critério obrigatório de conclusão:** Pedido e aprovações referenciam a versão exata; atualização de catálogo não reescreve o histórico.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E060 — Comparar cotações e justificar a escolha

**Responsável funcional:** Compras, UX e Backend.

**Dependências:** E008, E049, E058, E059.

**Entregável:** Comparação comercial conforme política local.

**Base e reaproveitamento:** Políticas locais; anexos de cotação; comparador.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E060.01** — Identificar quantidade de cotações exigida pela política aplicável.
- [ ] **E060.02** — Permitir anexar propostas externas com fornecedor, data e validade.
- [ ] **E060.03** — Normalizar quantidade, personalização, embalagem e destinos comparados.
- [ ] **E060.04** — Exibir diferenças de prazo, pagamento e custo entregue.
- [ ] **E060.05** — Registrar critérios relevantes além do menor preço unitário.
- [ ] **E060.06** — Sinalizar proposta incompleta ou vencida antes da decisão.
- [ ] **E060.07** — Permitir justificativa autorizada para fornecedor único quando aplicável.
- [ ] **E060.08** — Preservar anexos e responsáveis pela análise comercial.
- [ ] **E060.09** — Restringir dados de negociação às pessoas que podem consultá-los.
- [ ] **E060.10** — Validar cenários de duas cotações, três cotações e exceção documentada.

**Critério obrigatório de conclusão:** Escolha considera bases equivalentes e reúne evidências exigidas pela cooperativa, incluindo exceções.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 07 — Governança e aprovações

### E061 — Formalizar a solicitação de compra

**Responsável funcional:** UX, Frontend e Backend.

**Dependências:** E008, E017, E018, E057, E059, E060.

**Entregável:** Solicitação completa e rastreável.

**Base e reaproveitamento:** Requisições Sicoob; quote builder; política local.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E061.01** — Exibir resumo de campanha, itens, destinos e valor antes do envio.
- [ ] **E061.02** — Identificar política, centro de custo e período de verba aplicáveis.
- [ ] **E061.03** — Solicitar justificativa apenas quando a regra ou o contexto exigirem.
- [ ] **E061.04** — Mostrar aprovações necessárias e quem receberá a solicitação.
- [ ] **E061.05** — Validar campos, anexos e cotação obrigatórios no servidor.
- [ ] **E061.06** — Reconfirmar versão e validade da proposta no momento do envio.
- [ ] **E061.07** — Executar envio idempotente e informar o resultado confirmado.
- [ ] **E061.08** — Gerar protocolo e link para acompanhamento da solicitação.
- [ ] **E061.09** — Preservar rascunho e orientar correção quando houver rejeição de validação.
- [ ] **E061.10** — Comprovar envio único com tentativa repetida e sessão recuperada.

**Critério obrigatório de conclusão:** Envio registra contexto, versão, justificativa e destinatário; repetição não cria solicitações duplicadas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E062 — Construir a experiência de verba e saldo

**Responsável funcional:** UX, Financeiro e Frontend.

**Dependências:** E017, E025, E033, E038, E042, E061.

**Entregável:** Carteira de verba compreensível.

**Base e reaproveitamento:** PAWalletPage; budgetService; modelo canônico.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E062.01** — Mostrar cooperativa, unidade, centro de custo e competência selecionados.
- [ ] **E062.02** — Separar verba planejada, reservada, comprometida e consumida.
- [ ] **E062.03** — Explicar o saldo disponível em linguagem de decisão de compra.
- [ ] **E062.04** — Relacionar movimentos aos pedidos e eventos que os originaram.
- [ ] **E062.05** — Permitir consulta de períodos históricos sem alterar saldos anteriores.
- [ ] **E062.06** — Exibir data de atualização e tratar erro de consulta explicitamente.
- [ ] **E062.07** — Sinalizar limite insuficiente antes de encaminhar solicitação incompatível.
- [ ] **E062.08** — Mostrar exceções aprovadas sem ocultar seu efeito sobre o saldo.
- [ ] **E062.09** — Restringir edição e remanejamento aos papéis autorizados.
- [ ] **E062.10** — Conciliar a interface com lançamentos de exemplo e conferir arredondamentos.

**Critério obrigatório de conclusão:** Saldo, período e movimentos conciliam com o contrato financeiro; nenhum número fixo substitui dados reais.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E063 — Criar fila de aprovações orientada a decisão

**Responsável funcional:** UX, Compras e Frontend.

**Dependências:** E012, E029, E038, E059, E061, E062.

**Entregável:** Fila de decisões com contexto e prioridade.

**Base e reaproveitamento:** GestorApprovalsPage; listagens existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E063.01** — Separar pendências de despesa, arte e exceção conforme responsabilidade.
- [ ] **E063.02** — Exibir solicitante, unidade, valor, prazo e idade da pendência.
- [ ] **E063.03** — Oferecer filtros por campanha, cooperativa autorizada e situação.
- [ ] **E063.04** — Ordenar por prazo ou espera com critério explicitado.
- [ ] **E063.05** — Mostrar impedimento ou informação faltante antes de decidir.
- [ ] **E063.06** — Abrir detalhe preservando posição e filtros da fila.
- [ ] **E063.07** — Indicar solicitação alterada desde a última visualização.
- [ ] **E063.08** — Evitar seleção em lote para decisões que exigem análise individual distinta.
- [ ] **E063.09** — Permitir ação em lote somente com validação individual de autorização e resultado.
- [ ] **E063.10** — Validar triagem de uma fila mista e recuperação de item devolvido.

**Critério obrigatório de conclusão:** Aprovador identifica pendência, versão e risco de prazo sem abrir várias telas para obter dados básicos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E064 — Implementar decisão financeira compreensível

**Responsável funcional:** UX, Backend e Aprovadores.

**Dependências:** E018, E058, E060, E062, E063.

**Entregável:** Tela e transação de autorização de despesa.

**Base e reaproveitamento:** RPCs corrigidas; fila de aprovações; snapshots.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E064.01** — Apresentar valor completo, centro de custo e saldo pertinente.
- [ ] **E064.02** — Exibir comparação comercial e justificativa exigidas pela política.
- [ ] **E064.03** — Mostrar versão da proposta, validade e condições de pagamento.
- [ ] **E064.04** — Informar o efeito de aprovar sobre compromisso e saldo.
- [ ] **E064.05** — Disponibilizar aprovação, rejeição e devolução com finalidades distintas.
- [ ] **E064.06** — Solicitar motivo de rejeição ou exceção quando aplicável.
- [ ] **E064.07** — Validar autoridade, impedimento e versão no servidor ao confirmar.
- [ ] **E064.08** — Tratar decisão concorrente com mensagem e atualização do detalhe.
- [ ] **E064.09** — Registrar resultado confirmado e notificar os responsáveis corretos.
- [ ] **E064.10** — Testar negação por falta de alçada e aprovação idempotente com verba conciliada.

**Critério obrigatório de conclusão:** Aprovador decide a versão apresentada dentro da alçada; resultado e impacto na verba são inequívocos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E065 — Implementar aprovação formal da arte

**Responsável funcional:** Marketing, Produção e UX.

**Dependências:** E012, E018, E053, E054, E059, E063.

**Entregável:** Aceite de arte vinculado à produção.

**Base e reaproveitamento:** Piloto de arte; prova técnica; biblioteca de marca.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E065.01** — Exibir produto, técnica, posição e dimensão junto à prova.
- [ ] **E065.02** — Identificar versão, autor e data do arquivo em revisão.
- [ ] **E065.03** — Permitir inspeção ampliada sem substituir a descrição técnica acessível.
- [ ] **E065.04** — Separar comentário de pedido formal de revisão.
- [ ] **E065.05** — Mostrar diferenças quando uma nova arte substituir a anterior.
- [ ] **E065.06** — Exigir confirmação da especificação efetivamente aprovada para produção.
- [ ] **E065.07** — Validar poder de aprovação de marca no escopo da cooperativa.
- [ ] **E065.08** — Registrar aceite ou rejeição com identidade, data e versão.
- [ ] **E065.09** — Impedir liberação de produção com arte alterada após o aceite.
- [ ] **E065.10** — Validar revisão, nova prova e aprovação com equipe de marketing e produção.

**Critério obrigatório de conclusão:** Aprovação referencia arquivo e especificação exatos; não equivale automaticamente a autorização de despesa.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E066 — Tratar exceções sem perder governança

**Responsável funcional:** Produto, Compras e UX.

**Dependências:** E008, E018, E060, E064, E065.

**Entregável:** Fluxo explícito de exceções autorizadas.

**Base e reaproveitamento:** Políticas locais; alçadas; trilhas de aprovação.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E066.01** — Classificar exceções de verba, prazo, quantidade e cotação previstas na política.
- [ ] **E066.02** — Definir quem pode solicitar e quem pode decidir cada exceção.
- [ ] **E066.03** — Exibir a regra original e o motivo da solicitação excepcional.
- [ ] **E066.04** — Solicitar evidências comerciais necessárias à análise.
- [ ] **E066.05** — Impedir que o solicitante aprove sua exceção quando houver impedimento.
- [ ] **E066.06** — Registrar limites e validade da autorização excepcional.
- [ ] **E066.07** — Recalcular aprovações quando a exceção alterar custo ou condições.
- [ ] **E066.08** — Mostrar o resultado no histórico sem rotular regra descumprida como normal.
- [ ] **E066.09** — Preservar controles de segurança independentemente de exceção comercial.
- [ ] **E066.10** — Testar autorização válida, rejeição e tentativa de usar exceção expirada.

**Critério obrigatório de conclusão:** Exceção possui motivo, autoridade, validade e efeito; não contorna isolamento ou proteção de dados.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E067 — Administrar substituições e delegações temporárias

**Responsável funcional:** Segurança, Compras e UX.

**Dependências:** E008, E012, E016, E063, E066.

**Entregável:** Delegação com escopo e prazo definidos.

**Base e reaproveitamento:** Vínculos; matriz de ações; política de alçadas.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E067.01** — Identificar necessidades reais de substituição durante ausências.
- [ ] **E067.02** — Definir quais competências a política permite delegar.
- [ ] **E067.03** — Exigir autoridade para conceder a delegação proposta.
- [ ] **E067.04** — Registrar substituto, unidade, competência, início e término.
- [ ] **E067.05** — Impedir concessão de poderes superiores aos permitidos ao delegante.
- [ ] **E067.06** — Tratar conflitos de interesse e autoaprovação no substituto.
- [ ] **E067.07** — Mostrar claramente quando uma ação usa poder delegado.
- [ ] **E067.08** — Expirar e revogar delegações sem depender de alteração manual de interface.
- [ ] **E067.09** — Registrar ator real e origem da competência na auditoria.
- [ ] **E067.10** — Validar uso permitido, tentativa fora do escopo e expiração durante sessão ativa.

**Critério obrigatório de conclusão:** Substituto só atua nas competências delegadas e dentro da vigência; histórico identifica delegação e ator real.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E068 — Tornar o histórico de decisões auditável

**Responsável funcional:** Backend, UX e Auditoria.

**Dependências:** E017, E018, E059, E064, E065, E066, E067.

**Entregável:** Histórico pesquisável de decisões e versões.

**Base e reaproveitamento:** Logs; triggers; auditorias anteriores sem comprovação.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E068.01** — Definir eventos obrigatórios de solicitação, versão, aprovação e estorno.
- [ ] **E068.02** — Persistir ator, contexto, data e versão no servidor.
- [ ] **E068.03** — Registrar a política e eventual delegação usadas na decisão.
- [ ] **E068.04** — Associar documentos sem replicar dados pessoais desnecessários no log.
- [ ] **E068.05** — Impedir que compradores alterem ou apaguem decisões históricas.
- [ ] **E068.06** — Mostrar linha do tempo com termos compreensíveis para a operação.
- [ ] **E068.07** — Permitir filtrar histórico por tipo de evento e período autorizado.
- [ ] **E068.08** — Oferecer exportação restrita com identificador do pedido e origem.
- [ ] **E068.09** — Tratar falha de auditoria crítica sem concluir ação sem rastro.
- [ ] **E068.10** — Reconstruir um pedido de exemplo a partir do histórico e seus documentos.

**Critério obrigatório de conclusão:** É possível reconstruir o que foi decidido, por quem, em qual contexto e com quais documentos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E069 — Controlar revisões e cancelamentos

**Responsável funcional:** UX, Backend e Operação.

**Dependências:** E017, E059, E064, E065, E068.

**Entregável:** Mudança de pedido com impacto explícito.

**Base e reaproveitamento:** OrderService; política local; histórico transacional.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E069.01** — Definir alterações permitidas em rascunho, aprovação e produção.
- [ ] **E069.02** — Explicar consequências antes de alterar quantidade, arte ou destino.
- [ ] **E069.03** — Identificar quais aprovações deixam de valer após a alteração.
- [ ] **E069.04** — Registrar nova versão sem sobrescrever a decisão histórica.
- [ ] **E069.05** — Solicitar confirmação do fornecedor quando houver compromisso já assumido.
- [ ] **E069.06** — Aplicar estorno ou ajuste de verba conforme evento confirmado.
- [ ] **E069.07** — Tratar cancelamento parcial por item ou destino quando operacionalmente possível.
- [ ] **E069.08** — Mostrar cobrança ou condição pendente apenas com base contratual verificável.
- [ ] **E069.09** — Notificar responsáveis afetados pela revisão aprovada.
- [ ] **E069.10** — Testar cancelamento repetido, mudança concorrente e revisão após início de produção.

**Critério obrigatório de conclusão:** Revisão ou cancelamento respeita estágio operacional, recalcula compromissos e preserva aprovações anteriores.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E070 — Implementar acompanhamento do ciclo do pedido

**Responsável funcional:** UX, Backend e Frontend.

**Dependências:** E007, E029, E061, E064, E065, E068, E069.

**Entregável:** Ciclo operacional com estado e próxima ação.

**Base e reaproveitamento:** Estados Sicoob; orderService; timelines existentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E070.01** — Reconciliar estados de requisição, proposta, pedido e entrega no contrato canônico.
- [ ] **E070.02** — Definir transições válidas e responsáveis por executá-las.
- [ ] **E070.03** — Exibir estado atual sem misturar aprovação comercial e etapa logística.
- [ ] **E070.04** — Mostrar próxima ação e impedimento quando o pedido não puder avançar.
- [ ] **E070.05** — Associar cada mudança a evento, ator e horário verificáveis.
- [ ] **E070.06** — Tratar pedido com itens em estágios diferentes sem simplificação enganosa.
- [ ] **E070.07** — Bloquear transições inválidas no servidor, inclusive por chamadas diretas.
- [ ] **E070.08** — Atualizar a interface após eventos sem perder contexto do usuário.
- [ ] **E070.09** — Registrar notificações derivadas das transições realmente confirmadas.
- [ ] **E070.10** — Percorrer o ciclo completo com rejeição, revisão e retomada em homologação.

**Critério obrigatório de conclusão:** Frontend e backend usam estados compatíveis; uma etapa só avança mediante evento operacional válido.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 08 — Execução e pós-compra

### E071 — Formalizar a passagem do pedido ao fornecedor

**Responsável funcional:** Operação, Comercial e Backend.

**Dependências:** E007, E059, E064, E065, E070.

**Entregável:** Ordem de produção ou fornecimento inequívoca.

**Base e reaproveitamento:** Fluxos comerciais existentes; pedido e prova técnica.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E071.01** — Identificar a entidade fornecedora responsável por cada item contratado.
- [ ] **E071.02** — Reunir versão comercial, arte e especificações aprovadas em um pacote.
- [ ] **E071.03** — Incluir quantidades, embalagem, destinos e datas acordadas.
- [ ] **E071.04** — Mostrar condições que ainda impedem iniciar produção.
- [ ] **E071.05** — Definir canal e formato de recebimento da ordem pelo fornecedor.
- [ ] **E071.06** — Registrar confirmação de recebimento e aceite das condições.
- [ ] **E071.07** — Tratar divergência apontada pelo fornecedor antes de produzir.
- [ ] **E071.08** — Impedir envio de versão substituída ou ainda não aprovada.
- [ ] **E071.09** — Restringir o acesso do fornecedor aos dados necessários ao fornecimento.
- [ ] **E071.10** — Validar uma ordem de exemplo com produção e logística responsáveis.

**Critério obrigatório de conclusão:** Fornecedor recebe a proposta, arte e distribuição aprovadas; aceite operacional é registrado.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E072 — Acompanhar produção e controle de qualidade

**Responsável funcional:** Operação, Produção e UX.

**Dependências:** E054, E065, E070, E071.

**Entregável:** Marcos de produção baseados em confirmação.

**Base e reaproveitamento:** Workflow de produção; pilotos; histórico do pedido.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E072.01** — Definir marcos operacionais que a equipe consegue informar com confiança.
- [ ] **E072.02** — Vincular início de produção aos pré-requisitos comerciais e técnicos.
- [ ] **E072.03** — Registrar confirmação de materiais e configuração de personalização.
- [ ] **E072.04** — Definir necessidade de amostra física por técnica ou risco comercial.
- [ ] **E072.05** — Relacionar inspeção de qualidade à especificação aprovada.
- [ ] **E072.06** — Registrar quantidade produzida, rejeitada e pendente quando disponível.
- [ ] **E072.07** — Tratar atraso ou retrabalho com impacto explícito sobre a entrega.
- [ ] **E072.08** — Impedir que uma simulação de mockup seja usada como inspeção física.
- [ ] **E072.09** — Atualizar responsáveis do portal sobre mudanças confirmadas.
- [ ] **E072.10** — Validar rastreabilidade entre arte aprovada, lote produzido e inspeção realizada.

**Critério obrigatório de conclusão:** Status e previsão refletem eventos reais; desvio relevante gera comunicação e tratamento definidos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E073 — Reconfirmar disponibilidade sem escrever no catálogo

**Responsável funcional:** Comercial, Operação e Backend.

**Dependências:** E003, E048, E059, E069, E071.

**Entregável:** Processo de reconfirmação de oferta.

**Base e reaproveitamento:** Banco mestre somente consulta; bridge; contrato de fornecimento.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E073.01** — Definir em qual momento a disponibilidade precisa ser reconfirmada.
- [ ] **E073.02** — Registrar produto, variante, quantidade e horário da nova consulta.
- [ ] **E073.03** — Separar estoque informado de compromisso assumido pelo fornecedor.
- [ ] **E073.04** — Definir processo operacional autorizado de confirmação fora do catálogo mestre.
- [ ] **E073.05** — Guardar no portal a evidência da confirmação comercial obtida.
- [ ] **E073.06** — Detectar mudança de oferta entre proposta e liberação de produção.
- [ ] **E073.07** — Oferecer alternativa sujeita a nova aprovação de preço e arte.
- [ ] **E073.08** — Comunicar indisponibilidade com ação e responsável claros.
- [ ] **E073.09** — Manter vedada qualquer baixa ou reserva no banco externo por esta integração.
- [ ] **E073.10** — Simular redução de disponibilidade e comprovar tratamento sem gravação no mestre.

**Critério obrigatório de conclusão:** Consulta não é apresentada como reserva; indisponibilidade resulta em revisão autorizada ou alternativa.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E074 — Preparar expedição e entregas por destino

**Responsável funcional:** Logística, UX e Backend.

**Dependências:** E056, E070, E071, E072, E073.

**Entregável:** Plano de expedição por volume e destino.

**Base e reaproveitamento:** Endereços de PA; distribuição; logística existente.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E074.01** — Conferir destinos, responsáveis e restrições de recebimento aprovados.
- [ ] **E074.02** — Relacionar itens e quantidades a cada expedição planejada.
- [ ] **E074.03** — Separar remessas parciais sem perder saldo a expedir.
- [ ] **E074.04** — Registrar transportadora ou modalidade de entrega confirmada.
- [ ] **E074.05** — Validar endereço e contato operacional antes da emissão dos documentos.
- [ ] **E074.06** — Associar volumes, etiquetas e documentos necessários à remessa.
- [ ] **E074.07** — Registrar data de saída e previsão efetiva informada pelo operador.
- [ ] **E074.08** — Restringir alteração de destino após expedição conforme processo contratado.
- [ ] **E074.09** — Tratar erro de endereço com responsável e histórico de correção.
- [ ] **E074.10** — Conferir expedição de exemplo com múltiplos PAs e remessa parcial.

**Critério obrigatório de conclusão:** Quantidades expedidas e documentos correspondem ao pedido; expedição parcial mantém saldo rastreável.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E075 — Oferecer rastreio e previsão confiáveis

**Responsável funcional:** UX, Logística e Frontend.

**Dependências:** E029, E038, E070, E074.

**Entregável:** Acompanhamento por entrega e ocorrência.

**Base e reaproveitamento:** Tracking; transportadoras; timeline do pedido.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E075.01** — Apresentar cada destino com itens, quantidade e situação da entrega.
- [ ] **E075.02** — Vincular código de rastreio e fonte de informação da transportadora.
- [ ] **E075.03** — Mostrar data e horário da última atualização recebida.
- [ ] **E075.04** — Distinguir previsão da transportadora de data necessária para o evento.
- [ ] **E075.05** — Registrar eventos de tentativa, atraso e problema de endereço.
- [ ] **E075.06** — Evitar inferir entrega apenas pela passagem do prazo estimado.
- [ ] **E075.07** — Oferecer acompanhamento alternativo quando a integração estiver indisponível.
- [ ] **E075.08** — Notificar somente alterações relevantes aos destinatários autorizados.
- [ ] **E075.09** — Manter pedido parcialmente entregue enquanto houver destinos pendentes.
- [ ] **E075.10** — Validar rastreio normal, atualização atrasada e transportadora sem integração.

**Critério obrigatório de conclusão:** Dados de rastreio têm origem e atualização identificadas; entrega atrasada não aparece como concluída.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E076 — Registrar recebimento e conferência

**Responsável funcional:** Operação do PA, UX e Backend.

**Dependências:** E012, E068, E074, E075.

**Entregável:** Recebimento por quantidade e destino.

**Base e reaproveitamento:** Entregas; comprovantes; permissões de recebimento.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E076.01** — Definir quem pode confirmar recebimento em cada destino.
- [ ] **E076.02** — Apresentar itens e quantidades esperados na remessa.
- [ ] **E076.03** — Permitir informar quantidade recebida e quantidade pendente.
- [ ] **E076.04** — Registrar data, responsável e documento de comprovação aplicável.
- [ ] **E076.05** — Separar recebimento físico de aceite de qualidade quando necessário.
- [ ] **E076.06** — Permitir evidência de avaria ou diferença sem expor dados desnecessários.
- [ ] **E076.07** — Tratar remessa não reconhecida ou destinatário incorreto.
- [ ] **E076.08** — Atualizar saldos entregues sem duplicar conferência reenviada.
- [ ] **E076.09** — Manter pendências visíveis até sua resolução operacional.
- [ ] **E076.10** — Validar recebimento completo, parcial e confirmação repetida no mesmo destino.

**Critério obrigatório de conclusão:** Conferência registra o que realmente chegou; confirmação indevida não encerra saldo pendente.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E077 — Resolver faltas, avarias e devoluções

**Responsável funcional:** Atendimento, Logística e UX.

**Dependências:** E007, E029, E069, E075, E076.

**Entregável:** Gestão de ocorrências com responsável e solução.

**Base e reaproveitamento:** SAC; histórico; regras de fornecimento.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E077.01** — Definir categorias de ocorrência compreensíveis para o recebedor.
- [ ] **E077.02** — Vincular reclamação ao item, quantidade e destino afetados.
- [ ] **E077.03** — Solicitar descrição e evidência proporcionais ao problema informado.
- [ ] **E077.04** — Gerar protocolo sem obrigar o comprador a repetir dados do pedido.
- [ ] **E077.05** — Definir responsável e prazo de retorno conforme o atendimento contratado.
- [ ] **E077.06** — Registrar investigação, comunicação e proposta de solução.
- [ ] **E077.07** — Tratar reposição, coleta, crédito ou ajuste conforme autorização comercial.
- [ ] **E077.08** — Atualizar pedido e verba apenas quando o evento correspondente for confirmado.
- [ ] **E077.09** — Permitir discordância ou reabertura justificada da solução proposta.
- [ ] **E077.10** — Validar uma avaria e uma falta parcial até sua resolução documentada.

**Critério obrigatório de conclusão:** Comprador acompanha a resolução; ocorrência só encerra quando a solução acordada está registrada.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E078 — Conciliar documentos financeiros e entrega

**Responsável funcional:** Financeiro, Compras e Backend.

**Dependências:** E017, E058, E068, E069, E076, E077.

**Entregável:** Conciliação entre contratação, recebimento e cobrança.

**Base e reaproveitamento:** Anexos; notas fiscais; políticas locais.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E078.01** — Definir documentos exigidos pela condição comercial de cada cooperativa.
- [ ] **E078.02** — Relacionar nota fiscal, fornecedor, pedido e remessa correspondentes.
- [ ] **E078.03** — Conferir quantidades, valores e dados de faturamento aprovados.
- [ ] **E078.04** — Separar condição de pagamento de situação efetiva de liquidação.
- [ ] **E078.05** — Registrar recebimento parcial sem pressupor quitação integral.
- [ ] **E078.06** — Identificar divergências entre proposta, entrega e documento financeiro.
- [ ] **E078.07** — Encaminhar correção ao responsável mantendo os documentos anteriores rastreáveis.
- [ ] **E078.08** — Restringir acesso a anexos e informações financeiras por permissão.
- [ ] **E078.09** — Definir exportação ou processo manual até haver integração homologada.
- [ ] **E078.10** — Conciliar um pedido completo e um pedido com ajuste documentado.

**Critério obrigatório de conclusão:** Valores e documentos têm vínculo verificável; divergência impede encerramento financeiro indevido.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E079 — Facilitar recompra com revalidação

**Responsável funcional:** UX, Comercial e Frontend.

**Dependências:** E003, E050, E059, E073, E076, E078.

**Entregável:** Recompra que cria nova proposta.

**Base e reaproveitamento:** Favoritos; duplicação de orçamento; snapshots de pedido.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E079.01** — Permitir iniciar nova solicitação a partir de pedido anterior autorizado.
- [ ] **E079.02** — Copiar configuração e referências sem alterar o registro histórico.
- [ ] **E079.03** — Verificar existência e situação atual de produtos e variantes.
- [ ] **E079.04** — Reconsultar preço de origem e condições comerciais vigentes.
- [ ] **E079.05** — Reconfirmar mínimo, múltiplo e disponibilidade da quantidade pretendida.
- [ ] **E079.06** — Indicar arte antiga que depende de nova validação de marca.
- [ ] **E079.07** — Solicitar confirmação de destinos, campanha e período de verba.
- [ ] **E079.08** — Destacar diferenças em relação à compra anterior.
- [ ] **E079.09** — Encaminhar a nova versão ao fluxo normal de aprovação.
- [ ] **E079.10** — Validar recompra com produto inativo, preço alterado e endereço diferente.

**Critério obrigatório de conclusão:** Histórico acelera a seleção, mas preço, disponibilidade, arte e prazo são verificados novamente.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E080 — Oferecer ajuda contextual e atendimento

**Responsável funcional:** Conteúdo UX, Atendimento e Frontend.

**Dependências:** E026, E028, E029, E061, E070, E077, E079.

**Entregável:** Ajuda integrada à tarefa.

**Base e reaproveitamento:** Componentes de ajuda; FAQ; notificações.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E080.01** — Mapear dúvidas recorrentes observadas na pesquisa e no teste das jornadas.
- [ ] **E080.02** — Escrever respostas curtas sobre quantidade, arte, verba e entrega.
- [ ] **E080.03** — Disponibilizar ajuda junto ao campo ou decisão que gera a dúvida.
- [ ] **E080.04** — Criar páginas de apoio acessíveis e pesquisáveis.
- [ ] **E080.05** — Oferecer atendimento humano com horário e expectativa de retorno reais.
- [ ] **E080.06** — Transmitir contexto permitido do pedido sem incluir segredos ou excesso de dados.
- [ ] **E080.07** — Permitir acompanhar solicitações de suporte pelo protocolo.
- [ ] **E080.08** — Separar recomendação automática de informação confirmada pela operação.
- [ ] **E080.09** — Revisar conteúdo quando políticas ou condições de fornecimento mudarem.
- [ ] **E080.10** — Testar obtenção de ajuda e continuidade da compra após uma dúvida resolvida.

**Critério obrigatório de conclusão:** Usuário encontra orientação e atendimento no contexto correto, com retorno rastreável.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 09 — Qualidade e validação

### E081 — Auditar acessibilidade da jornada completa

**Responsável funcional:** Especialista em acessibilidade e QA.

**Dependências:** E040, E041, E046, E061, E064, E065, E076, E080.

**Entregável:** Relatório WCAG com evidências e correções.

**Base e reaproveitamento:** WCAG 2.2 AA; componentes reais; fluxos do piloto.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E081.01** — Definir escopo de páginas, componentes e critérios WCAG aplicáveis.
- [ ] **E081.02** — Verificar estrutura semântica, títulos, regiões e nomes acessíveis.
- [ ] **E081.03** — Percorrer compra, aprovação e recebimento inteiramente por teclado.
- [ ] **E081.04** — Conferir foco visível e ausência de encobrimento por elementos fixos.
- [ ] **E081.05** — Validar contraste de texto, estados e informação essencial dos controles.
- [ ] **E081.06** — Testar rótulos, instruções, erros e mensagens dinâmicas com leitor de tela.
- [ ] **E081.07** — Verificar alvos de interação e alternativas a arrastar elementos.
- [ ] **E081.08** — Testar ampliação, espaçamento de texto e redistribuição do conteúdo.
- [ ] **E081.09** — Corrigir achados e repetir os cenários que apresentaram falha.
- [ ] **E081.10** — Publicar matriz de critérios, ambientes testados e limitações remanescentes.

**Critério obrigatório de conclusão:** Critérios aplicáveis são verificados por automação e avaliação manual; falhas impeditivas estão resolvidas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E082 — Validar uso móvel em situações reais

**Responsável funcional:** Pesquisa UX, Frontend e QA.

**Dependências:** E041, E045, E046, E061, E063, E065, E075, E076, E081.

**Entregável:** Jornadas móveis verificadas.

**Base e reaproveitamento:** Pesquisa de uso; componentes responsivos; dispositivos do piloto.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E082.01** — Selecionar aparelhos e navegadores usados pelos participantes do piloto.
- [ ] **E082.02** — Testar entrada, busca e seleção com teclado virtual aberto.
- [ ] **E082.03** — Verificar campos numéricos, datas e endereços no dispositivo móvel.
- [ ] **E082.04** — Conferir área de toque e separação entre ações adjacentes.
- [ ] **E082.05** — Testar leitura de proposta e arte sem perder acesso aos comandos.
- [ ] **E082.06** — Validar envio de foto de ocorrência com tamanho e orientação variados.
- [ ] **E082.07** — Simular interrupção por ligação, bloqueio de tela e retorno ao navegador.
- [ ] **E082.08** — Verificar conexões lentas e retomada de tarefas interrompidas.
- [ ] **E082.09** — Corrigir problemas que impeçam concluir tarefas prioritárias no aparelho.
- [ ] **E082.10** — Registrar modelos, versões e resultados observados com suas limitações.

**Critério obrigatório de conclusão:** Solicitar, aprovar e receber são possíveis sem gestos exclusivos ou conteúdo essencial oculto.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E083 — Testar responsividade e conteúdo extremo

**Responsável funcional:** Design, Frontend e QA.

**Dependências:** E032, E033, E038, E081, E082.

**Entregável:** Matriz visual com dados extremos.

**Base e reaproveitamento:** Layouts; tabelas; tipografia; nomes de entidades.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E083.01** — Preparar nomes extensos de produtos, cooperativas e centros de custo.
- [ ] **E083.02** — Testar valores altos, quantidades grandes e textos de justificativa longos.
- [ ] **E083.03** — Validar endereços com complementos extensos e destinos múltiplos.
- [ ] **E083.04** — Verificar ausência, quebra e substituição de imagens e fontes.
- [ ] **E083.05** — Conferir larguras pequenas, intermediárias e amplas definidas no layout.
- [ ] **E083.06** — Testar orientação paisagem e janelas redimensionadas durante a tarefa.
- [ ] **E083.07** — Restringir rolagem horizontal aos componentes que realmente a exigem.
- [ ] **E083.08** — Garantir acesso ao conteúdo completo quando houver truncamento visual.
- [ ] **E083.09** — Comparar telas implementadas com a especificação aprovada usando dados reais permitidos.
- [ ] **E083.10** — Resolver regressões visuais críticas e registrar a matriz validada.

**Critério obrigatório de conclusão:** Conteúdo continua compreensível sem cortes indevidos, sobreposição ou perda de ações importantes.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E084 — Otimizar desempenho percebido e carregamento

**Responsável funcional:** Frontend, Infraestrutura e UX.

**Dependências:** E019, E020, E039, E043, E046, E061, E083.

**Entregável:** Orçamento de desempenho e medições reproduzíveis.

**Base e reaproveitamento:** Bundles existentes; Web Vitals; TanStack Query.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E084.01** — Medir carregamento, interação e estabilidade nas páginas prioritárias.
- [ ] **E084.02** — Definir orçamento de JavaScript e imagens com base na conexão do piloto.
- [ ] **E084.03** — Separar recursos administrativos e pesados das rotas do comprador.
- [ ] **E084.04** — Carregar PDF, voz e recursos opcionais somente quando necessários.
- [ ] **E084.05** — Dimensionar imagens e reservar seu espaço para evitar deslocamentos.
- [ ] **E084.06** — Reduzir consultas repetidas respeitando escopo, validade e atualização dos dados.
- [ ] **E084.07** — Eliminar trabalho síncrono que atrase interação de busca e formulário.
- [ ] **E084.08** — Adotar como referência de campo LCP até 2,5 segundos, INP até 200 ms e CLS até 0,1 no percentil 75.
- [ ] **E084.09** — Medir laboratório com cenário documentado e preparar coleta de campo após lançamento.
- [ ] **E084.10** — Repetir medições após otimização e registrar orçamento atendido e limitações de amostra.

**Critério obrigatório de conclusão:** Jornadas atendem o orçamento definido em homologação; métricas de campo permanecem separadas das medições de laboratório.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E085 — Validar resiliência e preservação do trabalho

**Responsável funcional:** Backend, Frontend e QA.

**Dependências:** E020, E028, E057, E061, E064, E070, E084.

**Entregável:** Fluxos recuperáveis sob falha.

**Base e reaproveitamento:** ErrorBoundary; retries; cache; operações idempotentes.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E085.01** — Simular catálogo fora do ar durante busca e montagem de proposta.
- [ ] **E085.02** — Testar expiração de cache sem exibir disponibilidade antiga como confirmada.
- [ ] **E085.03** — Interromper conexão antes e depois do envio de uma solicitação.
- [ ] **E085.04** — Verificar repetição controlada de chamadas idempotentes.
- [ ] **E085.05** — Simular sessão expirada durante preenchimento e decisão.
- [ ] **E085.06** — Testar conflito de versão com dois usuários atuando no mesmo pedido.
- [ ] **E085.07** — Validar retomada após atualização da aplicação e falha de carregamento de rota.
- [ ] **E085.08** — Impedir aprovação financeira offline ou sem resposta confirmada do servidor.
- [ ] **E085.09** — Garantir mensagem com próxima ação segura em cada falha observada.
- [ ] **E085.10** — Registrar recuperação e conciliação dos dados após os cenários de interrupção.

**Critério obrigatório de conclusão:** Indisponibilidade e reenvio não perdem rascunhos nem duplicam compromissos de compra.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E086 — Verificar segurança das jornadas integradas

**Responsável funcional:** Segurança, Backend e QA.

**Dependências:** E013, E018, E053, E064, E065, E067, E068, E085.

**Entregável:** Validação de autorização ponta a ponta.

**Base e reaproveitamento:** Matriz RBAC; RLS; RPCs; anexos e links privados.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E086.01** — Definir matriz de ataque com duas cooperativas e múltiplos papéis.
- [ ] **E086.02** — Testar leitura e alteração direta de IDs fora do escopo autorizado.
- [ ] **E086.03** — Tentar aprovar pedido com ator ou vínculo adulterado.
- [ ] **E086.04** — Verificar reaproveitamento de token expirado ou link revogado.
- [ ] **E086.05** — Validar acesso a arte, nota fiscal e comprovante de outra organização.
- [ ] **E086.06** — Inspecionar exposição de custos internos, segredos e diagnósticos no navegador.
- [ ] **E086.07** — Testar concessão indevida de papel e delegação fora da competência.
- [ ] **E086.08** — Verificar proteção contra repetição e corrida nas decisões financeiras.
- [ ] **E086.09** — Corrigir falhas e repetir os casos negativos que as demonstraram.
- [ ] **E086.10** — Publicar evidências revisadas sem divulgar segredos ou instruções operacionais de exploração.

**Critério obrigatório de conclusão:** Tentativas de acesso cruzado, alteração de ator ou manipulação de versão são negadas no servidor.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E087 — Validar privacidade e ciclo de vida dos dados

**Responsável funcional:** Responsável por privacidade, Produto e Segurança.

**Dependências:** E008, E011, E020, E053, E068, E078, E080, E086.

**Entregável:** Mapa de dados e práticas aprovadas.

**Base e reaproveitamento:** Campos do portal; políticas internas; armazenamento de anexos.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E087.01** — Inventariar dados pessoais realmente tratados nas jornadas propostas.
- [ ] **E087.02** — Relacionar cada dado à finalidade operacional e ao responsável pelo tratamento.
- [ ] **E087.03** — Revisar necessidade de contatos pessoais e dados de destinatários individuais.
- [ ] **E087.04** — Evitar importar cadastro de cooperados sem finalidade e escopo aprovados.
- [ ] **E087.05** — Definir acesso a documentos e logs conforme a necessidade de trabalho.
- [ ] **E087.06** — Validar com o responsável competente bases, avisos e procedimentos aplicáveis.
- [ ] **E087.07** — Estabelecer retenção e exclusão compatíveis com documentos e obrigações reais.
- [ ] **E087.08** — Minimizar dados coletados por métricas, suporte e ferramentas externas.
- [ ] **E087.09** — Ensaiar atendimento de solicitação e revogação de acesso em ambiente segregado.
- [ ] **E087.10** — Registrar aprovação das práticas e incorporar apenas avisos úteis ao usuário.

**Critério obrigatório de conclusão:** Coleta, acesso, retenção e atendimento de solicitações possuem finalidade e responsabilidade definidas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E088 — Conduzir testes de usabilidade com tarefas completas

**Responsável funcional:** Pesquisa UX, Compras e Marketing.

**Dependências:** E005, E030, E061, E064, E065, E076, E079, E081, E082, E085.

**Entregável:** Resultados observados e correções priorizadas.

**Base e reaproveitamento:** Roteiros de pesquisa; protótipo implementado; perfis funcionais.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E088.01** — Preparar tarefas realistas de campanha, cotação, aprovação e recebimento.
- [ ] **E088.02** — Selecionar participantes dos papéis prioritários com consentimento adequado.
- [ ] **E088.03** — Definir sucesso da tarefa, erros e necessidade de ajuda antes das sessões.
- [ ] **E088.04** — Observar execução sem ensinar a sequência de ações desejada.
- [ ] **E088.05** — Registrar dúvidas de custo, prazo, política e versão de arte.
- [ ] **E088.06** — Incluir cenário de devolução, saldo insuficiente e entrega parcial.
- [ ] **E088.07** — Comparar problemas por severidade sem generalizar percentuais da amostra pequena.
- [ ] **E088.08** — Priorizar correções que diminuem risco de compra errada ou retrabalho.
- [ ] **E088.09** — Testar novamente os fluxos modificados com evidência de resultado.
- [ ] **E088.10** — Publicar aprendizados e decisões de design rastreáveis às observações.

**Critério obrigatório de conclusão:** Problemas que impedem concluir tarefas críticas estão resolvidos e reavaliados com participantes adequados.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E089 — Construir indicadores operacionais verdadeiros

**Responsável funcional:** Dados, Produto e UX.

**Dependências:** E009, E020, E062, E068, E076, E077, E078, E088.

**Entregável:** Painel de operação com origem demonstrável.

**Base e reaproveitamento:** Dashboards existentes; eventos de compra; A04 e A10.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E089.01** — Implementar eventos e agregações previstos no dicionário de indicadores.
- [ ] **E089.02** — Restringir métricas ao escopo de cada cooperativa e papel.
- [ ] **E089.03** — Mostrar período, atualização e tamanho da amostra relevante.
- [ ] **E089.04** — Separar tempo em espera de tempo efetivo de processamento.
- [ ] **E089.05** — Medir devoluções de arte e despesa por motivos registrados.
- [ ] **E089.06** — Comparar entrega contratada e recebida por destino.
- [ ] **E089.07** — Identificar pendências sem atribuir causalidade não demonstrada.
- [ ] **E089.08** — Remover probabilidades fixas e percentuais de fallback do painel.
- [ ] **E089.09** — Conciliar indicadores com uma seleção rastreável de pedidos.
- [ ] **E089.10** — Validar interpretação do painel com compras, marketing e operação.

**Critério obrigatório de conclusão:** Indicadores reconciliam com eventos e amostra de pedidos; dados insuficientes aparecem como não medidos.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E090 — Concluir homologação funcional e de conteúdo

**Responsável funcional:** QA, Conteúdo, UX e Engenharia.

**Dependências:** E019, E041, E060, E070, E078, E081, E083, E084, E085, E086, E087, E088, E089.

**Entregável:** Relatório integrado de homologação.

**Base e reaproveitamento:** Suítes existentes; matriz de papéis; conteúdos pt-BR.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E090.01** — Consolidar cenários de negócio, permissão, falha e concorrência do piloto.
- [ ] **E090.02** — Verificar formatos pt-BR de data, moeda, quantidade e documentos.
- [ ] **E090.03** — Conferir consistência entre textos, estados da API e transações reais.
- [ ] **E090.04** — Validar exportações de proposta e relatórios com versões corretas.
- [ ] **E090.05** — Executar a suíte pertinente sem considerar testes pulados como aprovados.
- [ ] **E090.06** — Revisar acessibilidade dos fluxos alterados após as últimas correções.
- [ ] **E090.07** — Conferir desempenho e preservação do trabalho no build candidato.
- [ ] **E090.08** — Registrar defeitos por severidade, responsável e condição de liberação.
- [ ] **E090.09** — Corrigir e revalidar os defeitos que bloqueiam a compra segura.
- [ ] **E090.10** — Emitir relatório de homologação com ambiente, commit e evidências verificáveis.

**Critério obrigatório de conclusão:** Cenários críticos passam; conteúdo, formatos e estados refletem regras e dados do ambiente testado.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Bloco 10 — Produção e expansão

### E091 — Ensaiar a compra integral antes do piloto

**Responsável funcional:** Produto, Compras, Marketing e Operação.

**Dependências:** E007, E017, E018, E056, E060, E064, E065, E071, E073, E076, E078, E090.

**Entregável:** Ensaio completo com exceções.

**Base e reaproveitamento:** Jornada futura; cenário de kits e três PAs.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E091.01** — Preparar campanha de teste com produtos reais consultados e dados segregados.
- [ ] **E091.02** — Montar proposta com personalização e distribuição por três destinos.
- [ ] **E091.03** — Executar comparação comercial conforme a política escolhida.
- [ ] **E091.04** — Solicitar revisão de arte e aprovar a versão corrigida.
- [ ] **E091.05** — Autorizar despesa dentro da alçada e conferir compromisso de verba.
- [ ] **E091.06** — Reconfirmar oferta e formalizar a passagem para o fornecedor de teste.
- [ ] **E091.07** — Simular produção, expedição e recebimento parcial com responsáveis definidos.
- [ ] **E091.08** — Resolver uma divergência e conciliar os documentos correspondentes.
- [ ] **E091.09** — Reconstruir a jornada pelo histórico sem depender de explicação do desenvolvedor.
- [ ] **E091.10** — Obter aceite funcional dos representantes das áreas envolvidas no ensaio.

**Critério obrigatório de conclusão:** Uma compra atravessa todas as áreas e concilia valores e quantidades, sem intervenção técnica oculta.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E092 — Revisar a experiência final e a aplicação da marca

**Responsável funcional:** Direção de design, Marca e Produto.

**Dependências:** E031, E040, E081, E082, E083, E088, E090, E091.

**Entregável:** Aceite de experiência e identidade da release.

**Base e reaproveitamento:** Guia validado; sistema de design; evidências de usabilidade.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E092.01** — Comparar telas implementadas com os padrões visuais aprovados.
- [ ] **E092.02** — Conferir logos, assinatura da cooperativa e identificação do fornecedor.
- [ ] **E092.03** — Verificar consistência de títulos, ações, estados e documentos exportados.
- [ ] **E092.04** — Revisar foco visual em preço, prazo, versão e próxima ação.
- [ ] **E092.05** — Remover elementos decorativos ou legados que prejudiquem a tarefa.
- [ ] **E092.06** — Conferir contraste e legibilidade após ajustes finais de marca.
- [ ] **E092.07** — Revisar mensagens de suporte, erro e notificação em português brasileiro.
- [ ] **E092.08** — Confirmar que limites comerciais e operacionais permanecem visíveis.
- [ ] **E092.09** — Obter revisão do responsável autorizado pela marca no escopo aplicável.
- [ ] **E092.10** — Registrar aceite da experiência e eventuais limitações que não bloqueiam o piloto.

**Critério obrigatório de conclusão:** Telas, documentos e comunicações seguem a direção aprovada e suportam as tarefas prioritárias.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E093 — Preparar a cooperativa piloto e seus dados

**Responsável funcional:** Produto, Administração e Dados.

**Dependências:** E008, E011, E012, E016, E017, E087, E091, E092.

**Entregável:** Cadastro reconciliado da cooperativa piloto.

**Base e reaproveitamento:** Modelo canônico; onboarding; política local vigente.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E093.01** — Confirmar cooperativa piloto, responsáveis e escopo de participação.
- [ ] **E093.02** — Validar política vigente e alçadas que serão aplicadas ao piloto.
- [ ] **E093.03** — Cadastrar ou reconciliar PAs, centros de custo e endereços autorizados.
- [ ] **E093.04** — Conferir período e valores de verba com o responsável financeiro.
- [ ] **E093.05** — Preparar usuários e convites com mínimo privilégio necessário.
- [ ] **E093.06** — Definir fornecedores, categorias e destinos efetivamente atendidos.
- [ ] **E093.07** — Validar ativos de marca e modelos de arte permitidos.
- [ ] **E093.08** — Preparar plano reversível para qualquer migração de dados próprios necessária.
- [ ] **E093.09** — Conferir amostra dos cadastros com os responsáveis de cada área.
- [ ] **E093.10** — Registrar prontidão dos dados sem importar informações desnecessárias do catálogo mestre.

**Critério obrigatório de conclusão:** Unidades, papéis, políticas, endereços e verbas estão conferidos antes de receber compras reais.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E094 — Preparar operação, suporte e treinamento

**Responsável funcional:** Operação, Atendimento e UX.

**Dependências:** E007, E029, E070, E077, E078, E080, E091, E093.

**Entregável:** Equipe preparada para executar e apoiar o piloto.

**Base e reaproveitamento:** Runbooks; ajuda contextual; matriz de responsabilidades.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E094.01** — Definir responsáveis de compras, marketing, produção, logística e suporte.
- [ ] **E094.02** — Preparar guias curtos por tarefa e papel funcional.
- [ ] **E094.03** — Demonstrar solicitação, revisão, aprovação e recebimento com dados de teste.
- [ ] **E094.04** — Treinar identificação de proposta expirada e versão de arte incorreta.
- [ ] **E094.05** — Ensaiar atendimento de atraso, avaria e divergência de cobrança.
- [ ] **E094.06** — Definir escalonamento quando uma integração ou etapa operacional falhar.
- [ ] **E094.07** — Publicar horários e compromissos de atendimento realmente suportados.
- [ ] **E094.08** — Garantir acesso aos documentos e sistemas necessários a cada responsável.
- [ ] **E094.09** — Observar execução independente das tarefas após a orientação inicial.
- [ ] **E094.10** — Registrar lacunas de treinamento corrigidas e responsáveis de plantão do piloto.

**Critério obrigatório de conclusão:** Responsáveis conseguem concluir suas tarefas e encaminhar falhas pelos procedimentos documentados.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E095 — Preparar release e decisão de lançamento

**Responsável funcional:** Liderança técnica, Produto e Operação.

**Dependências:** E019, E020, E086, E087, E090, E091, E092, E093, E094.

**Entregável:** Release candidata e decisão registrada.

**Base e reaproveitamento:** Fluxo de PR; CI; runbooks; evidências de homologação.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E095.01** — Fixar commit candidato e mudanças incluídas na release.
- [ ] **E095.02** — Executar gates obrigatórios no artefato que será implantado.
- [ ] **E095.03** — Conferir variáveis, domínios, provedores e destinos dos dois bancos.
- [ ] **E095.04** — Validar compatibilidade e reversibilidade de migrations próprias aplicáveis.
- [ ] **E095.05** — Confirmar ausência de utilitários de teste e segredos no build público.
- [ ] **E095.06** — Registrar limitações conhecidas e seu impacto sobre o escopo do piloto.
- [ ] **E095.07** — Preparar critérios objetivos de interrupção e rollback.
- [ ] **E095.08** — Confirmar responsáveis e meios de diagnóstico durante a abertura.
- [ ] **E095.09** — Obter decisão de lançamento conforme a governança e autorizações já estabelecidas.
- [ ] **E095.10** — Registrar aceite da release com evidências e sem desativar controles que falharam.

**Critério obrigatório de conclusão:** Não existem bloqueadores críticos pendentes; deploy, rollback, suporte e autorização operacional estão preparados.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E096 — Publicar o piloto e verificar produção

**Responsável funcional:** Infraestrutura, Produto e Operação.

**Dependências:** E095.

**Entregável:** Portal piloto publicado e verificável.

**Base e reaproveitamento:** Pipeline de deploy; banco próprio; catálogo somente consulta.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E096.01** — Implantar o artefato aprovado pelo procedimento documentado.
- [ ] **E096.02** — Confirmar domínio, certificado e commit efetivamente publicados.
- [ ] **E096.03** — Verificar leitura real do catálogo com identidade de privilégio mínimo.
- [ ] **E096.04** — Confirmar que métodos de autenticação exibidos funcionam em produção.
- [ ] **E096.05** — Validar contexto e permissões dos usuários autorizados do piloto.
- [ ] **E096.06** — Checar acesso a artes, documentos e arquivos privados necessários.
- [ ] **E096.07** — Confirmar alertas e correlação de eventos no ambiente produtivo.
- [ ] **E096.08** — Executar smoke test autorizado sem gerar compra ou cobrança acidental.
- [ ] **E096.09** — Aplicar critérios de interrupção se ocorrer bloqueador de segurança ou integridade.
- [ ] **E096.10** — Registrar evidências de produção e liberar uso ao grupo piloto autorizado.

**Critério obrigatório de conclusão:** Domínio e commit produtivos estão confirmados; fluxos essenciais funcionam com responsáveis reais e monitoramento ativo.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E097 — Acompanhar a primeira compra real até o recebimento

**Responsável funcional:** Produto, Cooperativa piloto e Operação.

**Dependências:** E064, E065, E073, E076, E078, E094, E096.

**Entregável:** Primeira compra real conciliada.

**Base e reaproveitamento:** Jornada implantada; acordo comercial do piloto.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E097.01** — Selecionar uma necessidade real aprovada pela cooperativa participante.
- [ ] **E097.02** — Montar proposta vigente com itens, personalização, verba e destinos confirmados.
- [ ] **E097.03** — Executar aprovações reais de arte e despesa pelas pessoas competentes.
- [ ] **E097.04** — Conferir compromisso de verba e versão liberada ao fornecedor.
- [ ] **E097.05** — Obter reconfirmação operacional de disponibilidade e prazo contratado.
- [ ] **E097.06** — Acompanhar produção e eventuais alterações pelo fluxo autorizado.
- [ ] **E097.07** — Registrar expedição, rastreio e recebimento de cada destino.
- [ ] **E097.08** — Resolver divergências da compra sem apagar seu histórico.
- [ ] **E097.09** — Conciliar documentação, quantidades, condições financeiras e saldo final.
- [ ] **E097.10** — Obter confirmação dos responsáveis de que a compra foi concluída na operação real.

**Critério obrigatório de conclusão:** Pedido real autorizado é produzido, entregue e conciliado, com histórico e saldo verificáveis.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E098 — Medir o piloto e corrigir fricções comprovadas

**Responsável funcional:** Produto, Dados, UX e Operação.

**Dependências:** E009, E084, E088, E089, E097.

**Entregável:** Avaliação do piloto com correções verificadas.

**Base e reaproveitamento:** Eventos produtivos; pesquisa com participantes; indicadores.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E098.01** — Fixar janela de avaliação e conjunto de pedidos considerados.
- [ ] **E098.02** — Medir tempos de solicitação, arte, despesa e entrega com seus denominadores.
- [ ] **E098.03** — Registrar intervenções humanas necessárias para concluir a compra.
- [ ] **E098.04** — Coletar dúvidas e fricções de compradores, marketing e recebedores.
- [ ] **E098.05** — Comparar previsão e entrega sem atribuir causas não investigadas.
- [ ] **E098.06** — Medir desempenho de campo quando a amostra permitir interpretação.
- [ ] **E098.07** — Priorizar correções por impacto observado e risco operacional.
- [ ] **E098.08** — Implementar correções pequenas pelo fluxo normal de revisão e validação.
- [ ] **E098.09** — Rever os cenários afetados e registrar o efeito das mudanças.
- [ ] **E098.10** — Decidir expansão ou novo ciclo de ajuste com base nas evidências do piloto.

**Critério obrigatório de conclusão:** Resultados têm amostra e período definidos; ajustes prioritários demonstram melhoria ou limitação explicitamente registrada.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E099 — Validar uma segunda cooperativa com regras diferentes

**Responsável funcional:** Produto, Compras e Engenharia.

**Dependências:** E008, E012, E013, E017, E067, E093, E098.

**Entregável:** Configuração e operação de segunda cooperativa.

**Base e reaproveitamento:** Políticas configuráveis; piloto avaliado; modelo multicooperativa.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E099.01** — Selecionar segunda cooperativa e confirmar autorização para participação.
- [ ] **E099.02** — Documentar diferenças de alçada, cotação, categoria e calendário.
- [ ] **E099.03** — Configurar vínculos, unidades e centros de custo correspondentes.
- [ ] **E099.04** — Aplicar políticas por configuração, evitando cópias de código por cliente.
- [ ] **E099.05** — Validar identidade local e ativos autorizados dessa cooperativa.
- [ ] **E099.06** — Repetir testes de isolamento entre as duas organizações ativas.
- [ ] **E099.07** — Ensaiar aprovação e delegação com as regras diferentes.
- [ ] **E099.08** — Treinar responsáveis nas diferenças operacionais relevantes.
- [ ] **E099.09** — Acompanhar uma compra autorizada no segundo contexto até sua conciliação.
- [ ] **E099.10** — Registrar evidências de expansão e limitações que ainda exigem evolução do produto.

**Critério obrigatório de conclusão:** Variação de política funciona sem duplicar aplicação; isolamento e diferenças de regra são demonstrados.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.

### E100 — Encerrar a implantação e estabelecer evolução contínua

**Responsável funcional:** Produto, Design, Engenharia e Operação.

**Dependências:** E001–E099: todas as etapas anteriores.

**Entregável:** Aceite final e próximo ciclo priorizado.

**Base e reaproveitamento:** Checklist integral; dois contextos operacionais; documentação atualizada.

**Checklist obrigatório — 10 subetapas:**

- [ ] **E100.01** — Conferir as mil subetapas e investigar registros sem evidência suficiente.
- [ ] **E100.02** — Verificar critérios de aceite e revisores de todas as etapas anteriores.
- [ ] **E100.03** — Confirmar compras reais conciliadas e ambiente produtivo identificado.
- [ ] **E100.04** — Reconciliar documentação, permissões e configuração com o estado publicado.
- [ ] **E100.05** — Consolidar indicadores observados e limitações de amostra do período.
- [ ] **E100.06** — Transferir manutenção do sistema visual e conteúdo aos responsáveis definidos.
- [ ] **E100.07** — Formalizar operação, suporte, recuperação e gestão de acessos recorrentes.
- [ ] **E100.08** — Priorizar o próximo ciclo com base em problemas e oportunidades demonstrados.
- [ ] **E100.09** — Definir calendário de revisão de usabilidade, acessibilidade, segurança e desempenho.
- [ ] **E100.10** — Registrar o aceite final da implantação com responsáveis, data e evidências verificáveis.

**Critério obrigatório de conclusão:** As 100 etapas têm evidência e revisão; operação real, responsabilidades e manutenção estão formalmente transferidas.

**Registro de fechamento:** responsável nominal: __________; revisor: __________; evidência do entregável: __________; data: __________. Estado inicial: **Pendente**.


## Referências

Referências consultadas em 11/09/2026. As atividades são uma proposta aplicada ao diagnóstico do portal; os critérios comerciais e de marca exigem validação local vigente.

- **R01** — [Diagnóstico do portal Sicoob e anexos](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/ec5cfaf5c2de844458c0105d8ad40c35f1eb9c14/docs/pesquisa/2026-09-11/dossie.md). Pesquisa do projeto, 11/09/2026. Reaproveitamento, riscos, políticas locais e perfis funcionais; não certifica produção.
- **R02** — [Guia da marca Sicoob](https://portalcredicope.com.br/uploads/DOCUMENTOS/GUIA_DA_MARCA_-SICOOB_marco_23.pdf). Março/2023; versão vigente a confirmar. Direção visual; a etapa 31 exige validação atual dos ativos e da especificação.
- **R03** — [Heurísticas de usabilidade de Jakob Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/). NN/g; revisão de 30/01/2024. Revisão de clareza, consistência, controle, prevenção e recuperação de erros.
- **R04** — [WCAG 2.2](https://www.w3.org/TR/WCAG22/). W3C; referência normativa consultada em 11/09/2026. Meta de conformidade AA; exige verificar todos os critérios aplicáveis, não apenas automação.
- **R05** — [Contraste mínimo de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum). W3C WAI; consultado em 11/09/2026. 4,5:1 para texto normal e 3:1 para texto grande, com exceções normativas.
- **R06** — [Contraste de informação não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). W3C WAI; consultado em 11/09/2026. Verificação de informação visual essencial de controles e gráficos.
- **R07** — [Tamanho mínimo de alvo de interação](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). W3C WAI; consultado em 11/09/2026. Mínimo de 24 × 24 CSS px ou condições de exceção; 44 px é preferência proposta para ações principais.
- **R08** — [Foco não encoberto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html). W3C WAI; consultado em 11/09/2026. Evitar que conteúdo fixo esconda o componente com foco, observadas as condições do critério.
- **R09** — [Web Vitals](https://web.dev/articles/vitals). Google web.dev; consultado em 11/09/2026. Referências de campo: LCP 2,5 s, INP 200 ms e CLS 0,1 no percentil 75; laboratório é outra evidência.
- **R10** — [Concluir múltiplas tarefas](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/). GOV.UK Design System; consultado em 11/09/2026. Organização de tarefas e estados; aplicação adaptada às jornadas institucionais do portal.
