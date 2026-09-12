# Matriz de revisão das 1.000 subetapas

Diagnóstico individual do commit `6f1c5f94f612c13071b8dbe61b500b915e50b123`. Consulte [metodologia e contagens](metadados.json). Todas as baixas formais continuam pendentes. Referências são contextuais; não equivalem a teste completo de cada requisito.

## E001 — Fixar o ponto de partida verificável

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/auditoria-tecnica-a.md](../../../docs/pesquisa/2026-09-11/anexos/auditoria-tecnica-a.md), [docs/pesquisa/2026-09-11/anexos/auditoria-tecnica-b.md](../../../docs/pesquisa/2026-09-11/anexos/auditoria-tecnica-b.md), [docs/execucao/checkpoint-local-2026-09-11.md](../../../docs/execucao/checkpoint-local-2026-09-11.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E001.01 | Registrar o commit de referência e os links do diagnóstico anterior. | L | Commit e diagnóstico estão versionados. |
| E001.02 | Identificar domínio produtivo, prévia e ambiente segregado de testes. | P | Há prévia Vercel; produção e homologação segregada não foram confirmadas. |
| E001.03 | Confirmar os identificadores dos dois bancos com metadados seguros. | P | IDs dos bancos conhecidos; acesso administrativo do portal indisponível. |
| E001.04 | Relacionar funções publicadas com as funções presentes no repositório. | V | Inventário local de 101 funções não comprova funções publicadas. |
| E001.05 | Classificar telas entre demonstradas, parcialmente funcionais e sem evidência. | L | Classificação de telas e limites registrada nesta revisão. |
| E001.06 | Registrar os resultados reais de build, tipos e testes disponíveis. | L | Resultados locais e falhas remotas registrados com escopo. |
| E001.07 | Catalogar divergências entre documentação, configuração e comportamento observado. | L | Divergências documentais e funcionais catalogadas nesta revisão. |
| E001.08 | Mapear responsáveis por produto, marca, compra, operação e infraestrutura. | N | Responsáveis funcionais sugeridos; nomes e compromisso não registrados. |
| E001.09 | Criar um registro de decisões com data, justificativa e impacto. | P | Há ADRs e decisões no diagnóstico; falta registro consolidado vigente. |
| E001.10 | Revisar o inventário e anexar evidências de cada afirmação operacional. | P | Inventário local revisto; afirmações operacionais externas permanecem abertas. |

**Critério de aceite ainda exigido:** Cada capacidade possui origem, estado observado e responsável; produção não é inferida pelo README.

## E002 — Conter exposição de credenciais e ferramentas de teste

**Referências:** [supabase/functions/_shared/edge-authz-manifest.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/edge-authz-manifest.ts), [supabase/functions/migrate-helper/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/migrate-helper/index.ts), [tests/security/edge-authz-bypass.test.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/security/edge-authz-bypass.test.ts), [docs/SECURITY.md](../../../docs/SECURITY.md), [docs/execucao/checkpoint-local-2026-09-11.md](../../../docs/execucao/checkpoint-local-2026-09-11.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E002.01 | Verificar por inventário seguro se migrate-helper está publicado. | V | Estado publicado de migrate-helper não foi consultado administrativamente. |
| E002.02 | Inspecionar a configuração de autorização sem invocar retorno de segredos. | P | Configuração local revisada; concessões implantadas não confirmadas. |
| E002.03 | Remover o comportamento de exportação de credenciais do código. | L | Handler local retorna 410 sem exportar credenciais; há testes. |
| E002.04 | Retirar a função publicada ou desativar sua capacidade indevida. | V | Desativação no código não demonstra retirada da função remota. |
| E002.05 | Investigar registros disponíveis para delimitar eventual exposição anterior. | V | Logs históricos de acesso indisponíveis nesta revisão. |
| E002.06 | Rotacionar credenciais afetadas conforme a exposição constatada e validar consumidores. | V | Rotação depende de delimitar exposição e validar consumidores reais. |
| E002.07 | Eliminar acesso rápido e reparação de usuários do build produtivo. | L | Acesso rápido e ferramentas de reparo excluídos do caminho produtivo revisado. |
| E002.08 | Separar utilitários de diagnóstico dos privilégios do comprador comum. | P | Guards técnicos melhorados; concessões reais ainda não homologadas. |
| E002.09 | Executar o gate que identifica retorno de credenciais e manifesto incompleto. | L | Gate local cobre exportação indevida e manifesto das funções. |
| E002.10 | Registrar código, estado publicado e evidência de contenção revisada. | P | Contenção local comprovada; fechamento exige estado remoto e revisão responsável. |

**Critério de aceite ainda exigido:** Nenhuma função publicada devolve segredos; o tratamento da exposição potencial está documentado.

## E003 — Garantir catálogo externo exclusivamente de consulta

**Referências:** [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs), [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E003.01 | Definir doufsxqlfjyuvxuezpln como fonte mestre de produtos e disponibilidade. | L | Fonte mestre e proibição de escrita explicitadas no contrato. |
| E003.02 | Separar responsabilidades comerciais do portal das responsabilidades do catálogo. | L | Responsabilidades dos dois bancos documentadas. |
| E003.03 | Listar tabelas, visões e colunas necessárias à experiência do comprador. | P | Lista de tabelas existe, mas inclui estruturas de custo interno. |
| E003.04 | Excluir escrita, exclusão, upsert e importação do contrato dessa integração. | L | Ponte local rejeita mutações e operações fora da lista autorizada. |
| E003.05 | Revisar efeitos de cada RPC antes de permiti-la como consulta. | P | Allowlist de RPCs existe; efeitos das definições remotas não confirmados. |
| E003.06 | Configurar identidade de origem com privilégios mínimos de leitura. | V | Privilégios da identidade de origem não foram inspecionados. |
| E003.07 | Impedir exposição de custo interno e referências restritas ao comprador. | P | A10 reproduz setup_cost/unit_cost preservados pela redação. |
| E003.08 | Distinguir integração indisponível, acesso negado e consulta sem resultados. | P | Erros da ponte são explícitos; consumidores ainda podem ocultá-los. |
| E003.09 | Validar uma amostra mínima de produto, variante, preço e estoque. | V | Mapeamento local existe; falta reconciliação de amostra real atual. |
| E003.10 | Comprovar restrições por configuração e testes segregados, sem gravar no mestre. | P | Testes locais sem escrita existem; falta confirmar ACL de origem. |

**Critério de aceite ainda exigido:** API e identidade de origem impedem gravações; amostra de leitura identifica corretamente o banco mestre.

## E004 — Planejar pesquisa com compradores e marketing

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E004.01 | Selecionar perguntas sobre retrabalho, prazo, confiança e tomada de decisão. | L | Perguntas e hipóteses de pesquisa foram documentadas. |
| E004.02 | Definir amostra inicial de compras, marketing, PAs, financeiro e operação. | P | Papéis propostos; participantes reais não recrutados. |
| E004.03 | Incluir cooperativas com regras de compra diferentes na seleção. | P | Diversidade de políticas reconhecida; segunda cooperativa não selecionada. |
| E004.04 | Obter autorização para convites e sessões com participantes reais. | V | Não há autorização registrada para contatar participantes. |
| E004.05 | Preparar consentimento e uso mínimo dos registros de pesquisa. | N | Termo de consentimento e retenção de sessões não localizado. |
| E004.06 | Solicitar exemplos anonimizados de pedidos, propostas e artes anteriores. | P | Documentos históricos fornecidos; não substituem pedidos recentes anonimizados. |
| E004.07 | Preparar roteiro baseado no último pedido efetivamente realizado. | L | Roteiro por tarefas e último pedido consta na pesquisa. |
| E004.08 | Conduzir sessões sem transformar sugestões do entrevistador em respostas. | N | Sessões com participantes não realizadas nesta execução. |
| E004.09 | Registrar barreiras observadas, frequência na amostra e contexto de ocorrência. | N | Sem observações de sessões para medir frequência e contexto. |
| E004.10 | Revisar a síntese com rastreabilidade, sem generalizar a amostra ao sistema inteiro. | P | Síntese de fontes públicas existe; validação empírica permanece pendente. |

**Critério de aceite ainda exigido:** Amostra cobre papéis e cooperativas distintas; observações são separadas de hipóteses.

## E005 — Definir perfis funcionais e trabalhos a realizar

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E005.01 | Descrever o trabalho do solicitante de PA sem associá-lo a um cargo único. | P | Perfil de solicitante descrito como hipótese. |
| E005.02 | Caracterizar a responsabilidade de compras sobre comparação e contratação. | P | Responsabilidades de compras descritas, sem entrevista de validação. |
| E005.03 | Caracterizar a responsabilidade de marketing sobre campanha e marca. | P | Responsabilidades de marketing descritas, sem validação local. |
| E005.04 | Identificar quem autoriza despesa e quais informações fundamentam sua decisão. | P | Alçadas históricas documentadas; decisores vigentes não confirmados. |
| E005.05 | Descrever como operação e financeiro acompanham recebimento e cobrança. | P | Papéis de operação e financeiro propostos. |
| E005.06 | Separar papel funcional de cooperativa, unidade e centro de custo. | P | Distinção conceitual existe; modelos de organização ainda divergem. |
| E005.07 | Mapear uso ocasional, recorrente, móvel e assistido para cada perfil. | P | Cenários de uso propostos, sem dados observados por perfil. |
| E005.08 | Registrar limitações de tempo, acessibilidade e conhecimento observadas. | N | Limitações observadas de participantes ainda não coletadas. |
| E005.09 | Priorizar tarefas por frequência, impacto e custo de erro. | P | Prioridade inferida de impacto; frequência real desconhecida. |
| E005.10 | Validar os perfis com evidências e registrar pontos ainda desconhecidos. | V | Validação dos perfis exige representantes reais. |

**Critério de aceite ainda exigido:** Cada perfil tem objetivo, contexto, dificuldade observada e critério de sucesso verificável.

## E006 — Mapear a jornada atual e a jornada pretendida

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E006.01 | Descrever o gatilho de compra por campanha, reposição ou evento. | P | Gatilhos de campanha e reposição mapeados como hipóteses. |
| E006.02 | Mapear como os produtos são descobertos e selecionados atualmente. | P | Descoberta atual inferida de referências e documentos. |
| E006.03 | Registrar a obtenção de preço, personalização e prazo de entrega. | P | Passos comerciais descritos; práticas atuais não observadas. |
| E006.04 | Mapear a comparação de propostas e sua justificativa. | P | Comparação proposta; rito real de cada cooperativa não confirmado. |
| E006.05 | Separar decisões sobre arte das decisões sobre verba. | L | Plano distingue claramente decisão de arte e de despesa. |
| E006.06 | Identificar transferências entre comprador, fornecedor, produção e transporte. | P | Passagens operacionais desenhadas sem aceite dos executores. |
| E006.07 | Mapear recebimento parcial, divergência e encerramento financeiro. | P | Entrega parcial prevista; fluxo atual não demonstrado. |
| E006.08 | Medir esperas e retrabalho quando houver dados confiáveis. | N | Tempos reais de espera e retrabalho não medidos. |
| E006.09 | Desenhar a jornada pretendida com recuperação para falhas relevantes. | P | Jornada pretendida e falhas previstas; cobertura funcional incompleta. |
| E006.10 | Validar o mapa com representantes dos papéis que executam cada passagem. | V | Representantes de cada passagem ainda precisam validar o mapa. |

**Critério de aceite ainda exigido:** Todas as passagens entre solicitação e recebimento têm ator, informação e dificuldade identificados.

## E007 — Desenhar o serviço por trás da interface

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E007.01 | Relacionar cada ação do comprador ao processo que a atende. | P | Correspondências de serviço propostas, sem execução completa. |
| E007.02 | Identificar tarefas manuais que continuarão necessárias no piloto. | N | Tarefas manuais do piloto não têm operação designada. |
| E007.03 | Definir quem confirma personalização, disponibilidade e prazo contratado. | V | Responsáveis por confirmar oferta e técnica não atribuídos. |
| E007.04 | Descrever a passagem de proposta aprovada para produção. | P | Passagem para produção descrita; pacote contratual não comprovado. |
| E007.05 | Definir quem informa rastreio e quem corrige informação incorreta. | V | Operador de rastreio e correção não confirmado. |
| E007.06 | Mapear o atendimento de avaria, falta, troca e atraso. | N | Processo operacional de avaria e troca não homologado. |
| E007.07 | Determinar fontes de dados para cada estado mostrado na interface. | P | Fontes parcialmente mapeadas; há métricas fictícias em telas reais. |
| E007.08 | Estabelecer responsáveis e escalonamento para pendências sem resposta. | V | Escalonamento depende de responsáveis e SLA acordados. |
| E007.09 | Registrar dependências externas que podem limitar a promessa comercial. | L | Dependências externas e limites comerciais explicitados. |
| E007.10 | Simular um pedido completo e revisar as passagens sem responsável definido. | P | Simulação transacional existe; não cobre pedido completo e passagens humanas. |

**Critério de aceite ainda exigido:** Cada promessa exibida possui processo, sistema responsável e tratamento de falha.

## E008 — Configurar governança por cooperativa

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E008.01 | Obter a política vigente de cada cooperativa candidata ao piloto. | V | Políticas históricas não comprovam vigência das cooperativas piloto. |
| E008.02 | Registrar a entidade emissora e a validade de cada documento. | P | Origem histórica registrada; validade atual não confirmada. |
| E008.03 | Mapear categorias que exigem participação de compras ou marketing. | P | Participação de compras e marketing prevista sem matriz vigente. |
| E008.04 | Identificar exigência de cotações e suas exceções justificáveis. | P | Cotações e exceções descritas; fluxo institucional não implementado. |
| E008.05 | Definir alçadas, impedimentos e tratamento de autoaprovação. | P | Há limite de alçada; autoaprovação e impedimentos ainda sem política aplicada. |
| E008.06 | Mapear calendário, janelas de compra e condições especiais por unidade. | V | Janelas e condições precisam de definição local vigente. |
| E008.07 | Registrar critérios aplicáveis a fornecedores e documentação comercial. | P | Documentos de fornecedores são referência, não configuração homologada. |
| E008.08 | Definir como mudanças de política afetam solicitações em andamento. | N | Tratamento versionado de mudança de política não localizado. |
| E008.09 | Preservar a versão da política usada em cada decisão de compra. | N | Snapshot da versão da política na decisão não localizado. |
| E008.10 | Validar a matriz com responsáveis locais, sem copiar regras históricas automaticamente. | V | Aceite da matriz pelos responsáveis locais ausente. |

**Critério de aceite ainda exigido:** Duas políticas distintas podem ser representadas sem criar regra nacional fictícia.

## E009 — Definir resultados e instrumentos de medição

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md), [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E009.01 | Definir sucesso da solicitação como envio completo e válido. | P | Definição sugerida; evento de envio válido não conciliado. |
| E009.02 | Separar tempo de aprovação da arte do tempo de aprovação financeira. | N | Medição separada de arte e despesa não localizada. |
| E009.03 | Definir categorias observáveis de retrabalho e devolução. | P | Categorias propostas; instrumentação e dados não demonstrados. |
| E009.04 | Distinguir prazo desejado, contratado e data efetiva de entrega. | P | Campos de prazo existem em modelos distintos; sem dicionário operacional único. |
| E009.05 | Definir medição de divergências por pedido e por destino. | N | Medição de divergência por destino não localizada. |
| E009.06 | Especificar eventos de busca sem resultado e abandono recuperável. | P | Telemetria genérica existe; denominadores e privacidade não homologados. |
| E009.07 | Registrar o denominador e a janela temporal de cada indicador. | P | Dicionário proposto; indicadores implementados usam bases incompletas. |
| E009.08 | Identificar quais dados podem ser obtidos antes do primeiro piloto. | P | Dados possíveis inventariados, sem série observacional do piloto. |
| E009.09 | Propor metas iniciais como hipóteses, com responsável por revisá-las. | P | Metas são hipóteses; responsável nominal ausente. |
| E009.10 | Aprovar o dicionário e impedir percentuais calculados com dados fictícios. | P | Há probabilidades fixas e contadores aleatórios ainda renderizados. |

**Critério de aceite ainda exigido:** Cada indicador tem evento de origem, denominador, período e limitação; ausência de medição é explícita.

## E010 — Definir escopo e ordem das entregas

**Referências:** [docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md](../../../docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md), [docs/execucao/revisao-implementacao/anotacoes.txt](../../../docs/execucao/revisao-implementacao/anotacoes.txt), [docs/execucao/revisao-implementacao/achados.json](../../../docs/execucao/revisao-implementacao/achados.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E010.01 | Relacionar funcionalidades existentes às tarefas prioritárias do comprador. | L | Matriz relaciona recursos existentes, lacunas e tarefas do plano. |
| E010.02 | Identificar componentes que podem ser aproveitados com alteração pequena. | L | Benchmark identifica componentes reaproveitáveis e adaptações. |
| E010.03 | Separar bloqueadores de segurança de melhorias de conveniência. | L | Bloqueadores e conveniências estão separados por prioridade. |
| E010.04 | Definir a primeira compra completa que o piloto precisa suportar. | P | Compra piloto descrita; operação ainda não consegue percorrê-la inteira. |
| E010.05 | Escolher categorias, técnicas e destinos inicialmente atendidos pela operação. | V | Categorias, técnicas e destinos precisam de capacidade comercial confirmada. |
| E010.06 | Adiar CRM legado, gamificação e previsões sem dados comprovados. | P | Navegação ainda contém legado de vendedor e previsões fictícias. |
| E010.07 | Estimar esforço por responsável após examinar os contratos de integração. | N | Estimativa de esforço por responsável não registrada. |
| E010.08 | Montar sequência por dependências, permitindo frentes independentes em paralelo. | L | 100 etapas possuem dependências explícitas verificadas sem ciclos. |
| E010.09 | Definir revisão de escopo quando uma hipótese comercial for invalidada. | P | Plano exige revisão de escopo; processo e decisor não atribuídos. |
| E010.10 | Registrar critérios de saída e capacidade comprometida para a primeira release. | P | Critérios de saída existem; capacidade nominal não comprometida. |

**Critério de aceite ainda exigido:** Escopo preserva a jornada completa, explicita adiamentos e respeita dependências e capacidade.

## E011 — Consolidar o modelo de dados do portal

**Referências:** [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql), [supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [src/hooks/orders/useOrders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/orders/useOrders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E011.01 | Inspecionar o schema real do banco próprio por acesso administrativo seguro. | V | Schema real do portal não acessível à identidade disponível. |
| E011.02 | Comparar tabelas implantadas com migrations e tipos versionados. | V | Não há comparação administrativa entre migrations e banco implantado. |
| E011.03 | Resolver conceitualmente diferenças entre cooperativa, Singular e organização. | P | Organização, Singular e cooperativa coexistem sem contrato único. |
| E011.04 | Definir um identificador canônico de PA e seus vínculos válidos. | P | PA existe, mas vínculos usados por diferentes modelos não reconciliados. |
| E011.05 | Modelar centro de custo, período de verba e distribuição por unidade. | P | Verbas existem; centro de custo e competência não cobrem o fluxo integral. |
| E011.06 | Separar requisição, proposta, pedido, entrega e documento financeiro. | P | Pedidos Sicoob usam extensões com FK para orders legado (A02). |
| E011.07 | Definir snapshots históricos sem duplicar o cadastro mestre de produto. | P | Itens copiam preços; snapshot comercial e técnico completo não garantido. |
| E011.08 | Mapear dados existentes e regras de reconciliação antes de migrar. | N | Reconciliação de dados existentes antes de migração não demonstrada. |
| E011.09 | Gerar contratos tipados e validar exemplos consistentes de ponta a ponta. | P | Contratos críticos melhorados; persistem dívida de tipos e modelos incompatíveis. |
| E011.10 | Revisar o modelo com operações e registrar plano reversível de migração. | V | Plano reversível com operações depende do schema e dos responsáveis reais. |

**Critério de aceite ainda exigido:** Nomes e vínculos de cooperativa, PA, verba e pedido são consistentes entre schema, serviços e telas.

## E012 — Unificar permissões por ação e escopo

**Referências:** [src/lib/roles.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/roles.ts), [src/lib/rbac/route-matrix.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/rbac/route-matrix.ts), [tests/sicoob/route-access-scenarios.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/sicoob/route-access-scenarios.test.tsx), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E012.01 | Listar ações de leitura, solicitação, edição, aprovação e cancelamento. | L | Matriz local de ações e guards foi inventariada. |
| E012.02 | Separar aprovação de arte, despesa, recebimento e administração. | P | Aprovação financeira existe; poder específico de marca não consolidado. |
| E012.03 | Mapear cada papel funcional às ações necessárias no piloto. | P | Papéis técnicos normalizados; papéis de negócio ainda incompletos. |
| E012.04 | Restringir leitura conforme cooperativa, PA e centro de custo aplicáveis. | P | RLS e filtros existem; centro de custo e isolamento real não homologados. |
| E012.05 | Definir como uma pessoa com múltiplos vínculos escolhe seu contexto. | P | Seletor existe, mas contexto e papel podem divergir durante a troca (A08). |
| E012.06 | Eliminar aliases de papéis que produzem interpretações contraditórias. | P | Aliases centrais tratados; profiles.role e user_roles ainda coexistem. |
| E012.07 | Definir precedência para permissões acumuladas e impedimentos explícitos. | P | Negação de papel desconhecido existe; impedimentos acumulados incompletos. |
| E012.08 | Derivar identidade e vínculo de informações verificadas no servidor. | P | RPC deriva auth.uid; vínculo ativo e contexto precisam de ampliação. |
| E012.09 | Registrar casos permitidos e negados para cada ação crítica. | P | Casos negativos críticos testados; matriz inteira não coberta. |
| E012.10 | Revisar a matriz com segurança e responsáveis das cooperativas piloto. | V | Revisão por segurança e cooperativas piloto não registrada. |

**Critério de aceite ainda exigido:** Permissões dependem de vínculo ativo e ação; cargo ou valor enviado pelo navegador não concedem acesso.

## E013 — Implementar isolamento de dados e anexos

**Referências:** [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql), [supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [supabase/functions/_shared/edge-authz-manifest.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/edge-authz-manifest.ts), [supabase/functions/migrate-helper/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/migrate-helper/index.ts), [tests/security/edge-authz-bypass.test.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/security/edge-authz-bypass.test.ts), [docs/SECURITY.md](../../../docs/SECURITY.md), [src/hooks/useFavoriteLists.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useFavoriteLists.ts), [src/hooks/useKitShare.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitShare.ts), [src/stores/useFavoritesStore.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/stores/useFavoritesStore.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E013.01 | Identificar tabelas expostas por API e seus vínculos organizacionais. | P | Tabelas e vínculos inventariados localmente; schema real não reconciliado. |
| E013.02 | Revisar políticas de leitura para usuários autenticados e anônimos. | P | Políticas locais revisadas parcialmente; aplicação remota desconhecida. |
| E013.03 | Revisar inserção e alteração para impedir troca arbitrária de cooperativa. | P | RPCs críticas validam escopo; todas as escritas diretas precisam de teste cruzado. |
| E013.04 | Restringir buckets e objetos que contêm artes e documentos privados. | P | Buckets e URLs públicas coexistem; privacidade ponta a ponta não comprovada. |
| E013.05 | Verificar links compartilhados quanto a escopo, validade e revogação. | P | Tokens com validade/revogação existem; E2E de links públicos falha. |
| E013.06 | Auditar funções privilegiadas que podem contornar políticas de linha. | P | Manifesto e gates ajudam; 26 alertas CodeQL ainda exigem triagem. |
| E013.07 | Preparar usuários e dados de teste de duas cooperativas segregadas. | V | Sem contas reais segregadas para homologação de duas cooperativas. |
| E013.08 | Testar acesso cruzado com papéis iguais em organizações diferentes. | P | Fixture PostgreSQL testa escopo; não substitui RLS/API de duas contas reais. |
| E013.09 | Confirmar que falha de rede não é interpretada como autorização negada bem-sucedida. | P | Distinções de erro melhoradas; suíte de RLS remota não executada. |
| E013.10 | Publicar evidências dos casos permitidos e negados vinculadas ao schema testado. | P | Evidência local publicada; não vinculada ao schema implantado. |

**Critério de aceite ainda exigido:** Usuários de cooperativas distintas não acessam registros, anexos ou funções fora de seu escopo.

## E014 — Corrigir rotas e contrato de autenticação

**Referências:** [src/routes/config/sicoob.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/routes/config/sicoob.ts), [src/routes/config/sicoob-rbac.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/routes/config/sicoob-rbac.ts), [tests/sicoob/route-access-scenarios.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/sicoob/route-access-scenarios.test.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx), [src/components/layout/ProtectedRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/ProtectedRoute.tsx), [src/components/layout/SicoobRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/SicoobRoute.tsx), [src/lib/auth/invoke-full-scope.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/auth/invoke-full-scope.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E014.01 | Identificar todos os wrappers aplicados às rotas do portal. | L | Wrappers e composição de rotas inventariados. |
| E014.02 | Padronizar nomes e tipos das propriedades expostas por AuthContext. | L | Contrato crítico de AuthContext alinhado aos consumidores revisados. |
| E014.03 | Remover dependência de propriedades inexistentes nos guards Sicoob. | L | Guards Sicoob deixaram de depender das propriedades inexistentes. |
| E014.04 | Alinhar a barreira administrativa com a matriz de ações autorizadas. | P | Barreira técnica explícita; matriz completa do negócio ainda pendente. |
| E014.05 | Resolver rotas duplicadas com páginas ou permissões divergentes. | P | Duplicatas críticas tratadas; destinos de recompra continuam inconsistentes. |
| E014.06 | Separar carregamento de sessão, carregamento de permissões e acesso negado. | L | Estados de sessão e permissões cobertos por testes dirigidos. |
| E014.07 | Preservar destino solicitado ao autenticar quando ele for autorizado. | P | Retorno solicitado tem tratamento local; navegação autenticada real não comprovada. |
| E014.08 | Impedir loops de redirecionamento e telas vazias em sessão expirada. | P | Estados de expiração melhorados; rascunhos e ciclos reais não homologados. |
| E014.09 | Executar navegação real por perfil com verificações negativas. | V | Sem contas válidas para navegação por perfil em homologação. |
| E014.10 | Registrar a composição final das rotas e resultados do fluxo autenticado. | P | Testes de composição existem; relatório autenticado real permanece ausente. |

**Critério de aceite ainda exigido:** Comprador, marketing e aprovador alcançam suas jornadas sem propriedades indefinidas ou barreiras contraditórias.

## E015 — Definir autenticação confiável e acessível

**Referências:** [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx), [src/components/layout/ProtectedRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/ProtectedRoute.tsx), [src/components/layout/SicoobRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/SicoobRoute.tsx), [src/lib/auth/invoke-full-scope.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/auth/invoke-full-scope.ts), [src/pages/Auth.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/Auth.tsx), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [tests/components/pages/Auth.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/components/pages/Auth.test.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E015.01 | Confirmar métodos de autenticação disponíveis no ambiente escolhido. | V | Métodos efetivamente habilitados no Supabase remoto não confirmados. |
| E015.02 | Definir requisito de proteção adicional para ações administrativas sensíveis. | P | Há MFA e step-up para funções técnicas; cobertura e exigência do ambiente ainda não homologadas. |
| E015.03 | Retirar passkey incompleta e botões de provedores desativados. | L | Provedores sem configuração e passkey incompleta retirados do login revisado. |
| E015.04 | Validar entrada por email e recuperação de acesso com sessão real. | V | Entrada e recuperação com sessão real ainda não homologadas. |
| E015.05 | Permitir colagem e uso de gerenciador de senhas nos campos apropriados. | L | Campos permitem colagem e possuem autocomplete apropriado no código. |
| E015.06 | Tratar credencial inválida sem revelar existência de outra pessoa. | P | Mensagem genérica testada; resposta do provedor real ainda precisa de verificação. |
| E015.07 | Preservar trabalho compatível durante expiração e renovação da sessão. | P | Renovação de sessão existe; preservação de rascunho não comprovada. |
| E015.08 | Definir retorno seguro após logout e troca de vínculo. | P | Logout limpa parte do estado, mas deixa histórico de busca global. |
| E015.09 | Testar teclado, autofill, mensagens e estados de espera na autenticação. | P | Login tem testes e inspeção visual; autofill real não integralmente comprovado. |
| E015.10 | Comprovar sessão, encerramento e recuperação sem mensagens falsas de sucesso. | V | Fechamento exige sessão, logout e recuperação com contas válidas. |

**Critério de aceite ainda exigido:** Somente métodos realmente configurados aparecem; autenticação concluída corresponde a sessão válida.

## E016 — Implementar convites e vínculos organizacionais

**Referências:** [src/services/sicoob/userService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/userService.ts), [src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E016.01 | Definir quem pode convidar solicitantes, marketing e aprovadores. | P | Administração de usuários existe; fluxo de convite por competência não consolidado. |
| E016.02 | Vincular cada convite à cooperativa e ao papel permitido. | N | Convite ligado simultaneamente à cooperativa e papel não localizado no módulo Sicoob. |
| E016.03 | Restringir concessão de privilégios acima da autoridade do convidante. | N | Regra de autoridade do convidante não demonstrada no fluxo completo. |
| E016.04 | Definir validade, reenvio e revogação do convite. | N | Validade, reenvio e revogação de convite institucional não demonstrados. |
| E016.05 | Tratar usuário existente que recebe acesso a outra unidade. | P | Membership genérica existe; aceitação para segundo vínculo não homologada. |
| E016.06 | Mostrar entidade e responsabilidades antes de aceitar o vínculo. | N | Tela de aceite institucional com entidade e responsabilidades não localizada. |
| E016.07 | Evitar duplicação de perfil quando o convite é reenviado. | N | Idempotência de reenvio de convite não demonstrada. |
| E016.08 | Registrar aceitação e concessão de acesso no histórico administrativo. | P | Auditoria genérica existe; aceitação e concessão de convite não comprovadas. |
| E016.09 | Testar convite adulterado, expirado, revogado e já utilizado. | N | Cenários adversos de convite Sicoob não demonstrados. |
| E016.10 | Homologar onboarding completo com usuário de teste e contexto correto. | V | Onboarding real exige usuário, ambiente e vínculo válidos. |

**Critério de aceite ainda exigido:** Convite cria apenas o vínculo autorizado; expiração, revogação e duplicidade possuem tratamento claro.

## E017 — Tornar verba e compromissos consistentes

**Referências:** [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E017.01 | Definir planejado, reservado, comprometido e consumido com financeiro. | N | Quatro estados financeiros ainda não acordados nem modelados integralmente. |
| E017.02 | Associar cada saldo a período e centro de custo explícitos. | P | Há saldo e alçada; centro de custo e período ainda incompletos. |
| E017.03 | Determinar composição do valor que compromete a verba. | P | Total do pedido consumido; composição entregue não reconciliada. |
| E017.04 | Implementar reserva e liberação conforme a política aprovada. | P | Débito/liberação implementados; reserva segundo política vigente não completa. |
| E017.05 | Executar verificação de saldo e compromisso na mesma transação. | L | Verificação e débito transacionais reproduzidos no PostgreSQL descartável. |
| E017.06 | Controlar reenvio por chave de idempotência e versão da operação. | P | Repetição da aprovação protegida; envio completo e chave de versão ainda parciais. |
| E017.07 | Implementar estorno e ajuste preservando trilha de eventos. | L | Estorno integral e eventos locais testados, inclusive repetição. |
| E017.08 | Definir tratamento de pedido parcial e mudança de período. | N | Pedido parcial e virada de competência não implementados integralmente. |
| E017.09 | Testar duas aprovações simultâneas disputando o mesmo saldo. | L | Concorrência disputando saldo foi simulada em PostgreSQL 17. |
| E017.10 | Conciliar os movimentos de uma amostra com os saldos apresentados. | P | Fixture concilia saldos; amostra operacional e interface real não conciliadas. |

**Critério de aceite ainda exigido:** Concorrência e repetição não geram consumo duplicado nem saldo negativo fora da política autorizada.

## E018 — Corrigir aprovação privilegiada no servidor

**Referências:** [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E018.01 | Obter a definição e os privilégios das RPCs realmente implantadas. | V | Definições e grants realmente implantados não disponíveis. |
| E018.02 | Derivar o ator da sessão autenticada no servidor. | L | Ator da aprovação local deriva de auth.uid, com caso forjado negado. |
| E018.03 | Carregar pedido e requisição por relacionamento verificado. | L | Relação pedido/requisição conferida em testes segregados. |
| E018.04 | Validar cooperativa, vínculo ativo e competência de aprovação. | P | Cooperativa validada; vínculo ativo e competência de marca ainda incompletos. |
| E018.05 | Impedir autoaprovação quando a política local a proibir. | N | Impedimento configurável de autoaprovação não localizado. |
| E018.06 | Validar estado anterior e versão da proposta a decidir. | P | Estado anterior validado; versão imutável da proposta não verificada. |
| E018.07 | Persistir decisão, verba e auditoria na mesma transação aplicável. | L | Transação local une decisão, verba e auditoria aplicável. |
| E018.08 | Tratar repetição de chamada sem duplicar decisão ou consumo. | L | Repetição da decisão e consumo protegida no teste transacional. |
| E018.09 | Testar aprovador forjado, pedido cruzado e requisição incompatível. | L | Cenários de ator forjado e relações cruzadas cobertos localmente. |
| E018.10 | Registrar testes de concorrência e concessões efetivas após a correção. | P | Concorrência local registrada; concessões remotas continuam desconhecidas. |

**Critério de aceite ainda exigido:** Ator, vínculo, alçada, versão e relação pedido/requisição são validados antes da decisão.

## E019 — Restabelecer qualidade de build e testes

**Referências:** [scripts/check-eslint-baseline.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/scripts/check-eslint-baseline.mjs), [scripts/check-typecheck-baseline.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/scripts/check-typecheck-baseline.mjs), [docs/execucao/evidencias/gates-depois.tap](../../../docs/execucao/evidencias/gates-depois.tap), [docs/execucao/evidencias/cenarios-integrados.tap](../../../docs/execucao/evidencias/cenarios-integrados.tap), [docs/execucao/revisao-implementacao/ci.json](../../../docs/execucao/revisao-implementacao/ci.json), [docs/execucao/revisao-implementacao/resumo-codeql.json](../../../docs/execucao/revisao-implementacao/resumo-codeql.json), [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E019.01 | Reproduzir os gates de autorização e dependências que falharam. | L | Gates anteriores reproduzidos e causas locais documentadas. |
| E019.02 | Triar alertas por alcance e contexto de execução dos pacotes. | P | Dependências triadas; alertas CodeQL e suíte histórica ainda pendentes. |
| E019.03 | Atualizar dependências de forma compatível, revisando mudanças necessárias. | L | Atualizações aplicadas com build e auditoria de dependências registrados. |
| E019.04 | Corrigir tipos nos contratos críticos de acesso, catálogo, verba e pedido. | P | Contratos críticos corrigidos; logística ainda omite argumento obrigatório. |
| E019.05 | Comparar dívida restante com o baseline sem mascarar novos erros. | P | Baseline local sem regressão; comparador ESLint falha na CI. |
| E019.06 | Corrigir caminhos inexistentes e identificadores duplicados dos workflows. | L | Caminhos e identificadores críticos de workflows corrigidos e verificados. |
| E019.07 | Fazer configuração obrigatória ausente produzir falha explícita. | P | Ausência de configuração explicitada em módulos críticos; E2E ainda ignora cenários. |
| E019.08 | Substituir mocks que impedem verificar a composição real das rotas. | L | Testes dirigidos passam pela composição real dos guards revisados. |
| E019.09 | Executar testes significativos das transações e negações de acesso. | L | Transações e negações críticas possuem simulações locais significativas. |
| E019.10 | Vincular resultados, comando, ambiente e commit no relatório de qualidade. | P | Resultados vinculados ao commit; dois gates remotos impedem aprovação global. |

**Critério de aceite ainda exigido:** Gates críticos passam sem desativação; dívida remanescente possui inventário e não afeta a jornada liberada.

## E020 — Preparar ambiente de validação e observabilidade

**Referências:** [docs/DR.md](../../../docs/DR.md), [docs/OBSERVABILITY.md](../../../docs/OBSERVABILITY.md), [docs/SECURITY_RUNBOOK.md](../../../docs/SECURITY_RUNBOOK.md), [docs/execucao/revisao-implementacao/ci.json](../../../docs/execucao/revisao-implementacao/ci.json), [docs/execucao/revisao-implementacao/resumo-codeql.json](../../../docs/execucao/revisao-implementacao/resumo-codeql.json), [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E020.01 | Separar variáveis e permissões de desenvolvimento, homologação e produção. | P | Configurações separadas no código; homologação real não disponível. |
| E020.02 | Validar domínio, TLS e redirecionamentos do ambiente de homologação. | P | Prévia Vercel publicada; TLS e redirects autenticados não homologados. |
| E020.03 | Definir correlação de eventos entre interface, API e transação. | P | Telemetria genérica existe; correlação completa da compra não comprovada. |
| E020.04 | Registrar falhas sem incluir segredos ou dados pessoais desnecessários. | P | Redação de segredos melhorada; CodeQL aponta retornos de stack para triagem. |
| E020.05 | Monitorar consulta de catálogo, envio de solicitação e decisão de aprovação. | P | Monitores genéricos existem; jornada crítica não monitorada com tráfego real. |
| E020.06 | Definir responsáveis e canais operacionais para alertas aplicáveis. | V | Responsáveis e canais operacionais ainda não acordados. |
| E020.07 | Configurar backups e procedimentos compatíveis com o banco próprio. | V | Backups do banco próprio não inspecionados. |
| E020.08 | Ensaiar recuperação em ambiente segregado com evidência de resultado. | V | Restauração segregada não realizada nesta execução. |
| E020.09 | Documentar rollback de aplicação e compatibilidade de schema. | P | Runbooks existentes; compatibilidade do schema real não ensaiada. |
| E020.10 | Executar incidente controlado e comprovar alerta, diagnóstico e recuperação. | N | Incidente controlado completo com alerta e recuperação não demonstrado. |

**Critério de aceite ainda exigido:** Saúde do catálogo e da compra pode ser observada; falhas têm alerta e responsável verificáveis.

## E021 — Organizar a arquitetura de informação

**Referências:** [src/components/layout/Header.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/Header.tsx), [src/components/layout/SidebarReorganized.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/SidebarReorganized.tsx), [src/routes/config/sicoob.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/routes/config/sicoob.ts), [docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md](../../../docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E021.01 | Inventariar destinos atuais e identificar duplicatas de navegação. | L | Inventário de destinos e duplicidades integra o diagnóstico. |
| E021.02 | Agrupar conteúdos por necessidade do comprador e do aprovador. | P | Catálogo melhorado; navegação ainda mistura rotinas de vendedor. |
| E021.03 | Propor rótulos para catálogo, campanhas, pedidos, verbas e suporte. | P | Rótulos de compra aplicados nas telas alteradas, não em todo o portal. |
| E021.04 | Separar administração técnica da navegação diária das cooperativas. | P | Guards técnicos existem; separação visual e funcional ainda incompleta. |
| E021.05 | Definir destinos de início adequados a cada papel funcional. | P | Dashboards por papel existem; correspondência com necessidades não validada. |
| E021.06 | Desenhar hierarquia de páginas com localização reconhecível. | P | Hierarquia implantada herdada; mapa do comprador não integralmente revisado. |
| E021.07 | Planejar atalhos úteis sem duplicar ações contraditórias. | P | Carrinho duplicado retirado do cabeçalho; outros atalhos seguem legados. |
| E021.08 | Testar encontrabilidade com tarefas e estrutura textual simples. | N | Teste de encontrabilidade com participantes não realizado. |
| E021.09 | Revisar rótulos que induzem interpretação comercial incorreta. | P | Linguagem corrigida pontualmente; termos comerciais ambíguos persistem. |
| E021.10 | Publicar o mapa validado com responsáveis por cada área de conteúdo. | V | Mapa com responsáveis e validação humana ainda pendente. |

**Critério de aceite ainda exigido:** Participantes encontram catálogo, solicitações, aprovações e entregas sem depender de termos de vendedor.

## E022 — Construir taxonomia útil para brindes

**Referências:** [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs), [src/hooks/useSearch.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSearch.ts), [src/utils/product-search.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/utils/product-search.ts), [tests/hooks/useSearch.test.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/hooks/useSearch.test.ts), [src/components/catalog/CatalogHeader.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogHeader.tsx), [docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md](../../../docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E022.01 | Inspecionar categorias e atributos disponíveis na amostra do catálogo. | P | Atributos mapeados em código; amostra atual da origem não reconciliada. |
| E022.02 | Separar categoria de produto, finalidade, material e técnica de impressão. | P | Filtros existentes misturam facetas reais e referências estáticas. |
| E022.03 | Mapear sinônimos usados por compradores nas sessões de pesquisa. | N | Sinônimos provenientes de sessões reais não coletados. |
| E022.04 | Definir unidades e vocabulário consistentes para dimensões e capacidade. | P | Unidades e formatação existem; catálogo inteiro não normalizado. |
| E022.05 | Identificar atributos decisivos por família de produto. | P | Atributos por família previstos; qualidade real não amostrada. |
| E022.06 | Tratar valores vazios, conflitantes e variantes sem classificação. | P | Fallbacks existem; conflitos e variantes sem classe não integralmente validados. |
| E022.07 | Criar curadoria por assembleia, evento, relacionamento e uso interno. | P | Entradas por ocasião adicionadas; curadoria depende de dados e revisão. |
| E022.08 | Exigir evidência para selos ambientais ou afirmações de certificação. | P | Selos ambientais precisam de comprovação; categoria não prova certificação. |
| E022.09 | Manter classificações editoriais do portal separadas do cadastro mestre. | P | Curadoria na interface preserva mestre; governança editorial ainda ausente. |
| E022.10 | Validar amostra de buscas e categorias com compras e marketing. | V | Busca e categorias precisam de validação de compras e marketing. |

**Critério de aceite ainda exigido:** Categorias e atributos ajudam a decidir; valores desconhecidos não são apresentados como fatos.

## E023 — Projetar o comportamento da busca

**Referências:** [src/hooks/useSearch.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSearch.ts), [src/utils/product-search.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/utils/product-search.ts), [tests/hooks/useSearch.test.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/hooks/useSearch.test.ts), [src/components/catalog/CatalogHeader.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogHeader.tsx), [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E023.01 | Reunir consultas por código, produto, campanha e necessidade de uso. | P | Consultas sintéticas existentes; corpus real do público ainda ausente. |
| E023.02 | Definir precedência de correspondência exata de códigos estáveis. | L | Precedência por código e busca local têm implementação e testes dirigidos. |
| E023.03 | Tratar acentos, variações de escrita e sinônimos relevantes. | P | Normalização existente; sinônimos aprovados não consolidados. |
| E023.04 | Definir sugestões que não revelem histórico de outra cooperativa. | P | Histórico global search-history não isolado por usuário/cooperativa (A09). |
| E023.05 | Separar resultado orgânico de curadoria comercial identificada. | P | Curadoria por intenção existe; classificação orgânica/editorial não completa. |
| E023.06 | Planejar tratamento de erro ortográfico sem substituir intenção silenciosamente. | P | Busca aproximada existe; correção explícita preservando intenção não integral. |
| E023.07 | Definir estados de carregamento, nenhuma correspondência e serviço indisponível. | P | Estados básicos existem; erro de integração não coberto em todos os consumidores. |
| E023.08 | Especificar como resultados respeitam filtros e contexto ativo. | P | Filtros aplicados; contexto ativo não integra todas as chaves de consulta. |
| E023.09 | Criar conjunto de consultas de avaliação com resultado esperado justificável. | P | Testes locais existem; relevância não validada por consultas reais. |
| E023.10 | Revisar relevância e explicar limites antes de incluir busca semântica adicional. | P | Benchmark registra limites; revisão de relevância pelo público pendente. |

**Critério de aceite ainda exigido:** Consultas prioritárias retornam opções pertinentes ou recuperação clara, sem inventar atributos.

## E024 — Projetar filtros e ordenação

**Referências:** [src/hooks/catalog/useCatalogFilters.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/catalog/useCatalogFilters.ts), [src/components/catalog/CatalogActiveFilters.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogActiveFilters.tsx), [tests/components/catalog/CatalogStorefrontExperience.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/components/catalog/CatalogStorefrontExperience.test.tsx), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E024.01 | Escolher filtros úteis por categoria com base em atributos reais. | P | Facetas existentes; utilidade por família não validada em dados reais. |
| E024.02 | Separar preço unitário de custo estimado entregue na linguagem do filtro. | L | Atalhos informam orçamento unitário e ressalvas comerciais. |
| E024.03 | Modelar quantidade mínima, múltiplo e técnica de personalização. | P | Mínimos e múltiplos não têm contrato uniforme nas jornadas. |
| E024.04 | Definir tratamento honesto da disponibilidade ainda não reconfirmada. | P | Estoque exibido; horário e reconfirmação não universais. |
| E024.05 | Projetar seleção de múltiplas opções e combinação entre grupos. | P | Combinação de filtros implementada; cobertura institucional não integral. |
| E024.06 | Mostrar contagens somente quando a consulta as sustentar. | P | Contagem dinâmica existe; completude da consulta real não comprovada. |
| E024.07 | Definir limpeza individual e completa dos filtros ativos. | L | Chips e limpeza são implementados e cobertos no catálogo revisado. |
| E024.08 | Especificar ordenações com significado e desempate previsível. | P | Ordenação existente; desempate e significado comercial não integralmente validados. |
| E024.09 | Preservar critérios ao abrir produto e retornar à listagem. | P | Persistência de filtros existente; retorno autenticado real não homologado. |
| E024.10 | Validar tarefas de refinamento incluindo combinações sem resultado. | P | Testes dirigidos existem; tarefa de refinamento real ainda não validada. |

**Critério de aceite ainda exigido:** Comprador entende critérios ativos, remove restrições e compara resultados sem perder contexto.

## E025 — Desenhar navegação entre cooperativas e unidades

**Referências:** [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx), [src/components/layout/Header.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/Header.tsx), [src/components/layout/SidebarReorganized.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/SidebarReorganized.tsx), [src/routes/config/sicoob.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/routes/config/sicoob.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E025.01 | Definir onde cooperativa e unidade ativa aparecem persistentemente. | P | Seletor genérico existe; PA e organização não são um contexto canônico. |
| E025.02 | Listar apenas os vínculos válidos da pessoa autenticada. | P | Consulta memberships existe; revogação durante sessão não coberta. |
| E025.03 | Explicar diferença entre trocar unidade e trocar papel autorizado. | N | Distinção visual entre troca de unidade e competência não consolidada. |
| E025.04 | Definir destino inicial após selecionar outra cooperativa. | P | Troca de organização existe; destino e contexto podem permanecer legados. |
| E025.05 | Isolar cache, filtros privados e rascunhos por contexto. | P | Cache e armazenamento privado não são integralmente separados por contexto. |
| E025.06 | Avisar sobre trabalho não salvo antes de uma troca incompatível. | N | Proteção de trabalho não salvo durante troca não localizada. |
| E025.07 | Preservar informações seguras quando a pessoa retorna ao vínculo anterior. | P | Persistência global existe; retorno seguro por vínculo não homologado. |
| E025.08 | Tratar vínculo revogado durante uma sessão aberta. | P | Troca assíncrona pode manter papel anterior quando consulta falha (A08). |
| E025.09 | Testar alternância por teclado, tela móvel e nomes extensos. | V | Teclado, móvel e nomes longos não validados nessa jornada real. |
| E025.10 | Comprovar que pedidos e saldos exibidos correspondem ao contexto visível. | P | Modelo de dados divergente impede comprovar coerência entre contexto, pedidos e saldos. |

**Critério de aceite ainda exigido:** A unidade ativa é inequívoca; trocar contexto não transporta dados privados ou rascunhos incorretos.

## E026 — Estabelecer linguagem e conteúdo de interface

**Referências:** [src/components/layout/Header.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/Header.tsx), [src/components/layout/SidebarReorganized.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/SidebarReorganized.tsx), [src/routes/config/sicoob.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/routes/config/sicoob.ts), [src/pages/Auth.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/Auth.tsx), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [tests/components/pages/Auth.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/components/pages/Auth.test.tsx), [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E026.01 | Definir tom profissional, direto e acolhedor em português brasileiro. | L | Textos novos usam linguagem de compra em pt-BR. |
| E026.02 | Padronizar solicitação, proposta, pedido, verba e aprovação no glossário. | P | Termos principais alinhados nas telas alteradas; glossário global ainda incompleto. |
| E026.03 | Substituir termos de vendedor que confundem o comprador institucional. | P | Legado continua com vocabulário de vendedor em várias jornadas. |
| E026.04 | Definir rótulos de ação que indiquem o resultado esperado. | P | Ações do catálogo claras; logística anuncia resultado que pode falhar. |
| E026.05 | Escrever instruções curtas junto ao ponto em que são necessárias. | P | Ajuda contextual existente; contrato comercial ainda não revisado por inteiro. |
| E026.06 | Separar conteúdo obrigatório de ajuda complementar consultável. | P | Progressão de conteúdo existe pontualmente, sem padronização integral. |
| E026.07 | Retirar números, selos e afirmações de oficialidade sem origem comprovada. | P | Login corrigido; A06 identifica probabilidades e contadores fictícios em pedidos. |
| E026.08 | Explicar limites de preço, disponibilidade e prazo em linguagem comercial. | P | Ressalvas comerciais adicionadas; total entregue e reconfirmação ainda parciais. |
| E026.09 | Revisar compreensão com participantes sem apresentar explicações prévias. | V | Compreensão sem orientação exige sessões com participantes reais. |
| E026.10 | Publicar exemplos aprovados de títulos, mensagens e ações críticas. | P | Exemplos locais existem; aceite editorial dos responsáveis ausente. |

**Critério de aceite ainda exigido:** Textos distinguem estimativa, aprovação, contratação e entrega sem promessas não comprovadas.

## E027 — Padronizar formulários e entrada de dados

**Referências:** [src/pages/Auth.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/Auth.tsx), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [tests/components/pages/Auth.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/components/pages/Auth.test.tsx), [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E027.01 | Inventariar dados exigidos em cadastro, campanha, proposta e entrega. | P | Formulários existem; inventário por finalidade não consolidado. |
| E027.02 | Justificar cada campo obrigatório por finalidade operacional concreta. | N | Justificativa operacional de todos os campos obrigatórios não localizada. |
| E027.03 | Organizar perguntas na ordem em que o comprador possui a informação. | P | Fluxos legados reaproveitados; ordem de perguntas não validada com compradores. |
| E027.04 | Definir rótulos persistentes e exemplos compatíveis com o campo. | P | Login tem labels persistentes; demais formulários precisam de revisão integral. |
| E027.05 | Padronizar datas, reais, quantidades, CEP e unidades de medida. | P | Formatadores existentes; consistência entre modelos financeiros não conciliada. |
| E027.06 | Permitir colagem, autofill e correção sem máscaras excessivamente restritivas. | P | Login permite autofill/colagem; máscaras restantes não auditadas integralmente. |
| E027.07 | Validar formato no cliente e regras de negócio no servidor. | P | Validação cliente e RPCs existe; envio completo não protegido integralmente. |
| E027.08 | Mostrar resumo de erros e vínculo com cada campo problemático. | P | Mensagens associadas no login; resumo de erros não uniforme. |
| E027.09 | Preservar dados após falha, retorno entre etapas e sessão recuperável. | P | Kit autosave pode informar sucesso sem persistência (A04). |
| E027.10 | Testar preenchimento válido, incompleto e incorreto por teclado e toque. | P | Testes locais de login não demonstram todos os formulários de compra. |

**Critério de aceite ainda exigido:** Campos solicitam apenas dados necessários; erros preservam valores e orientam correção.

## E028 — Definir estados vazios, falhas e recuperação

**Referências:** [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx), [src/components/layout/ProtectedRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/ProtectedRoute.tsx), [src/components/layout/SicoobRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/SicoobRoute.tsx), [src/lib/auth/invoke-full-scope.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/auth/invoke-full-scope.ts), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs), [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E028.01 | Listar estados possíveis de catálogo, orçamento, aprovação e entrega. | P | Estados críticos inventariados; entrega e aprovação não simuladas integralmente. |
| E028.02 | Separar primeira utilização de ausência de resultados após filtros. | P | Catálogo possui vazio e filtros; demais áreas mantêm estados genéricos. |
| E028.03 | Diferenciar permissão negada, sessão expirada e serviço indisponível. | P | Guards distinguem falhas; hooks de estoque e estatísticas ocultam erros. |
| E028.04 | Definir carregamento inicial e atualização parcial sem apagar conteúdo útil. | P | Carregamentos locais melhorados; persistência em toda a jornada não verificada. |
| E028.05 | Projetar nova tentativa somente para operações seguras ou idempotentes. | P | RPCs críticas idempotentes; autosave e versões ainda inseguros sob repetição. |
| E028.06 | Explicar conflitos de versão quando outro usuário alterou o registro. | P | Status concorrente tratado; conflito de versão comercial ainda não. |
| E028.07 | Exibir dados antigos com horário e restrições quando houver cache válido. | P | Cache existe; idade e restrições não são apresentadas uniformemente. |
| E028.08 | Remover sucesso otimista de ações financeiras ainda não confirmadas. | P | A01/A04 mostram sucesso de interface desvinculado de persistência. |
| E028.09 | Definir canal de suporte com identificador de ocorrência não sensível. | N | Ocorrência com protocolo e canal operacional não consolidada. |
| E028.10 | Simular cada estado e validar clareza, foco e preservação do trabalho. | P | Simulações de lacunas e login existem; matriz completa de estados ainda aberta. |

**Critério de aceite ainda exigido:** Cada falha oferece uma ação segura; carregamento e ausência de dados não ocultam indisponibilidade.

## E029 — Planejar avisos e notificações por evento

**Referências:** [src/hooks/useNotifications.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useNotifications.ts), [src/hooks/useNotificationOmnichannel.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useNotificationOmnichannel.ts), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E029.01 | Relacionar eventos que realmente exigem ação de uma pessoa. | P | Eventos genéricos existem; matriz de decisões da compra incompleta. |
| E029.02 | Definir destinatário de arte, despesa, atraso e divergência de entrega. | P | Email de mudança de status usa ator; destinatário correto depende do evento. |
| E029.03 | Separar mensagens informativas de pendências que bloqueiam a compra. | P | Central existe; bloqueio de compra versus informação ainda não uniforme. |
| E029.04 | Escolher canais suportados e comprovar suas integrações antes de anunciá-los. | V | Canais de envio não foram comprovados no ambiente real. |
| E029.05 | Definir agrupamento para evitar múltiplos avisos equivalentes. | P | Há notificações, sem evidência de deduplicação transacional da compra. |
| E029.06 | Estabelecer preferências permitidas sem suprimir comunicações essenciais. | P | Preferências genéricas existem; essenciais e papéis não homologados. |
| E029.07 | Respeitar fuso e calendário operacional quando houver agendamento. | N | Calendário operacional por cooperativa para avisos não demonstrado. |
| E029.08 | Criar links que validem sessão e escopo ao abrir a pendência. | P | Links usam guards; validação com contas reais ainda ausente. |
| E029.09 | Definir estados criado, enfileirado, enviado e falhou com significado preciso. | P | Chamadas não formam outbox transacional; erros podem ser ignorados. |
| E029.10 | Validar a matriz com exemplos de compra, arte e entrega parcial. | N | Matriz envolvendo arte e entrega parcial não validada. |

**Critério de aceite ainda exigido:** Avisos têm destinatário autorizado e próxima ação; canal inexistente não é anunciado.

## E030 — Validar fluxos em protótipos de baixa fidelidade

**Referências:** [src/pages/sicoob/StorefrontDemoPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/StorefrontDemoPage.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E030.01 | Prototipar a entrada do comprador e a seleção de contexto. | P | Loja e painel demonstrativos existem; seleção real de contexto incompleta. |
| E030.02 | Representar busca, filtro, detalhe e retorno ao catálogo. | P | Descoberta representada; retorno autenticado não validado. |
| E030.03 | Simular montagem de campanha e definição de destinos. | N | Protótipo integrado de campanha e distribuição não demonstrado. |
| E030.04 | Representar proposta com valores, validade e pendências. | P | Resumo comercial legado existe; versão firme não integralmente representada. |
| E030.05 | Separar a aprovação da arte da autorização da despesa. | P | Plano separa decisões; protótipo funcional ainda não demonstra ambas. |
| E030.06 | Incluir rejeição, correção e retomada de trabalho no protótipo. | P | Algumas mensagens simuladas; retomada completa não demonstrada. |
| E030.07 | Representar entrega parcial e abertura de ocorrência. | N | Entrega parcial e ocorrência não representadas em fluxo completo. |
| E030.08 | Conduzir tarefas observadas sem orientar o caminho esperado. | V | Tarefas observadas com participantes não realizadas. |
| E030.09 | Priorizar falhas por impacto e revisar os fluxos correspondentes. | L | Esta revisão prioriza falhas funcionais com evidências e impacto. |
| E030.10 | Registrar evidências da segunda verificação dos problemas críticos encontrados. | P | Simulações técnicas existem; segunda verificação com usuários ainda ausente. |

**Critério de aceite ainda exigido:** Tarefas críticas são compreendidas; problemas graves têm correção e nova verificação.

## E031 — Definir direção visual com a marca Sicoob

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [docs/execucao/ativos-imagegen.json](../../../docs/execucao/ativos-imagegen.json), [src/pages/sicoob/StorefrontDemoPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/StorefrontDemoPage.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E031.01 | Confirmar o manual vigente e o responsável por validar seu uso. | V | Manual consultado não substitui confirmação vigente pelo responsável da marca. |
| E031.02 | Obter arquivos autorizados de logo, assinaturas e variações necessárias. | P | Logo local existe; autorização específica de uso não registrada. |
| E031.03 | Documentar proporção, área de proteção e tamanho mínimo aplicáveis. | P | Regras estudadas; aplicação em todas as assinaturas não homologada. |
| E031.04 | Resolver a divergência de RGB e HEX identificada no guia consultado. | P | Divergência de cores registrada; decisão oficial ainda pendente. |
| E031.05 | Definir relação entre identidade Sicoob e identificação do fornecedor operador. | P | Finalidade do portal explicada; identificação contratual do operador ainda precisa de aceite. |
| E031.06 | Escolher referências visuais por clareza, confiança e contexto institucional. | L | Referências e critérios visuais documentados no benchmark. |
| E031.07 | Criar alternativas aplicadas a catálogo, proposta e aprovação reais. | P | Loja e login demonstrados; alternativas de proposta/aprovação incompletas. |
| E031.08 | Comparar alternativas por legibilidade e foco na tarefa de compra. | P | Legibilidade local medida; comparação de alternativas pelo público não realizada. |
| E031.09 | Validar a direção com marketing e participantes do público prioritário. | V | Marketing e público prioritário ainda não validaram a direção. |
| E031.10 | Registrar ativos, restrições e decisão visual sem declarar homologação inexistente. | L | Proveniência de ativos e limites de homologação registrados. |

**Critério de aceite ainda exigido:** A proposta usa a versão de marca validada e demonstra consistência em telas reais do portal.

## E032 — Estabelecer grade, espaçamento e densidade

**Referências:** [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E032.01 | Definir contêineres e larguras máximas para conteúdo comercial e tabelas. | P | Contêineres melhorados no catálogo/login; tabelas operacionais ainda legadas. |
| E032.02 | Criar escala de espaçamento reutilizável para campos e agrupamentos. | P | Escala Tailwind existe; exceções locais persistem. |
| E032.03 | Definir margens e colunas por necessidade do conteúdo. | P | Grade responsiva aplicada às telas demonstradas. |
| E032.04 | Estabelecer ritmo vertical entre título, instrução, dados e ação. | P | Ritmo visual melhorado; demais jornadas ainda não uniformizadas. |
| E032.05 | Separar densidade de consulta frequente da densidade de preenchimento. | P | Catálogo e painel têm densidades diferentes; formulários não homologados. |
| E032.06 | Evitar que cabeçalhos fixos ocupem espaço excessivo em telas pequenas. | P | Hero móvel compactado; cabeçalho autenticado completo não comprovado. |
| E032.07 | Definir quebra de colunas sem alterar a ordem lógica da leitura. | P | Quebras locais verificadas; todas as páginas não cobertas. |
| E032.08 | Testar nomes longos de cooperativas, produtos e centros de custo. | P | Textos demonstrativos testados; amostra real de nomes extremos ausente. |
| E032.09 | Mapear classes existentes para a escala e reduzir exceções locais. | P | Uso de classes comuns ampliado, sem eliminação integral das exceções. |
| E032.10 | Validar três telas representativas em diferentes larguras e níveis de ampliação. | P | Nove capturas em três larguras; zoom manual e telas financeiras ainda pendentes. |

**Critério de aceite ainda exigido:** Páginas mantêm hierarquia e leitura em larguras pequenas, médias e amplas, sem medidas arbitrárias por tela.

## E033 — Definir tipografia e hierarquia de leitura

**Referências:** [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E033.01 | Confirmar família institucional licenciada e fontes de substituição. | V | Licenciamento e aprovação da família institucional não confirmados. |
| E033.02 | Definir estilos semânticos para títulos, corpo, legenda e dados. | P | Hierarquia local existe; consistência semântica global ainda parcial. |
| E033.03 | Dimensionar entrelinha e largura de texto para leitura confortável. | P | Login e catálogo legíveis nas capturas; formulários extensos não validados. |
| E033.04 | Usar pesos com função clara, evitando excesso de variações. | P | Pesos locais usados com hierarquia; auditoria global não concluída. |
| E033.05 | Padronizar alinhamento e dígitos de preços, quantidades e saldos. | P | Formatação monetária existe; saldos e quantidades entre modelos não conciliados. |
| E033.06 | Preservar hierarquia de títulos na estrutura semântica da página. | P | Login e vitrine revisados; títulos de todas as páginas não cobertos. |
| E033.07 | Evitar textos operacionais pequenos para acomodar mais conteúdo. | P | Textos operacionais de 10px persistem na logística. |
| E033.08 | Definir carregamento de fontes sem bloquear a apresentação inicial. | P | Login tem evidência de desempenho; fontes de jornadas internas não medidas. |
| E033.09 | Testar substituição de fonte e aumento de tamanho do texto. | N | Substituição de fonte e ampliação manual não comprovadas. |
| E033.10 | Validar leitura de proposta, tabela de pedidos e formulário em telas reais. | V | Leitura de proposta e pedido com participantes ainda ausente. |

**Critério de aceite ainda exigido:** Textos, valores e estados são legíveis; carregamento de fontes não prejudica a tarefa.

## E034 — Definir cores semânticas e contraste

**Referências:** [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E034.01 | Mapear cores institucionais para superfícies, texto, bordas e ações. | P | Paleta aplicada às superfícies principais; estilos avulsos persistem. |
| E034.02 | Reservar cores de sucesso, aviso e erro para significados consistentes. | P | Cores semânticas existentes; consistência entre módulos ainda parcial. |
| E034.03 | Definir combinações aprovadas para estado normal, foco e seleção. | P | Foco e seleção revistos localmente; matriz completa não aprovada. |
| E034.04 | Evitar texto branco normal sobre o turquesa de contraste insuficiente. | P | Há botões verdes com texto branco em telas operacionais não homologadas. |
| E034.05 | Calcular contraste mínimo de 4,5:1 para texto normal aplicável. | P | Axe sem violações nas telas amostradas; contraste global não comprovado. |
| E034.06 | Verificar contraste de texto grande e informação essencial de controles. | P | Controle local verificado; telas de decisão financeira não cobertas integralmente. |
| E034.07 | Adicionar rótulo ou ícone com texto aos estados relevantes. | P | Badges com texto existem; todos os estados ainda não auditados. |
| E034.08 | Testar visualização sem cor e em configurações de alto contraste. | N | Teste manual sem cor e alto contraste não registrado. |
| E034.09 | Documentar combinações proibidas e alternativas para o mesmo uso. | P | Diretrizes existentes; proibições e substituições não consolidadas por componente. |
| E034.10 | Validar a paleta nas telas de login, catálogo, verba e aprovação. | P | Login/catálogo amostrados; verba/aprovação reais não homologados. |

**Critério de aceite ainda exigido:** Combinações de texto e controles atendem os critérios aplicáveis; estado nunca depende apenas de cor.

## E035 — Padronizar imagens, ícones e representação de produto

**Referências:** [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs), [src/pages/ProductDetail.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/ProductDetail.tsx), [src/pages/product-detail/ProductDetailHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/product-detail/ProductDetailHero.tsx), [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [docs/execucao/ativos-imagegen.json](../../../docs/execucao/ativos-imagegen.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E035.01 | Definir proporção, enquadramento e fundo para imagens de catálogo. | P | Cards e enquadramento melhorados; acervo real não integralmente amostrado. |
| E035.02 | Preservar referência visual de escala, material e detalhes relevantes. | P | Galeria e dimensões existem; fotos de escala e material dependem da origem. |
| E035.03 | Relacionar imagens corretamente à variante selecionada. | P | Seleção de variante existe; associação de mídia real ainda precisa de validação. |
| E035.04 | Separar fotografia real de mockup ilustrativo com identificação visível. | P | Hero conceitual identificado; todas as provas e mockups ainda não revisados. |
| E035.05 | Definir imagens de apoio para técnica e área de personalização. | P | Wizard oferece apoio visual; precisão técnica precisa da produção. |
| E035.06 | Padronizar um conjunto de ícones compatível com a interface existente. | L | Conjunto Lucide já utilizado nas telas revisadas. |
| E035.07 | Evitar depender de ícone sem rótulo em ações pouco familiares. | P | Ações principais ganharam nomes; ícones de todo o portal não verificados. |
| E035.08 | Escrever textos alternativos adequados à função da imagem. | P | Textos alternativos locais existentes; amostra de mídia real incompleta. |
| E035.09 | Preparar fallback de mídia que não pareça produto disponível confirmado. | P | Fallbacks existem; disponibilidade não deve ser inferida da imagem. |
| E035.10 | Revisar amostra de categorias e comprovar carregamento dos ativos autorizados. | V | Ativos autorizados e amostra real precisam de conferência com catálogo/marca. |

**Critério de aceite ainda exigido:** Imagens ajudam a avaliar o produto e distinguem fotografia, simulação e prova de produção.

## E036 — Implementar tokens de design

**Referências:** [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E036.01 | Inventariar cores, fontes, espaçamentos e elevações já existentes. | P | Tokens e valores existentes conhecidos; inventário global não reconciliado. |
| E036.02 | Definir nomes semânticos para os tokens efetivamente necessários. | P | Variáveis semânticas existem; componentes mantêm valores avulsos. |
| E036.03 | Mapear valores institucionais para variáveis centralizadas. | P | Cores centralizadas parcialmente; múltiplas referências de marca persistem. |
| E036.04 | Separar token de marca de token de estado e interação. | P | Marca e estado parcialmente separados; revisão global pendente. |
| E036.05 | Unificar estilos repetidos nas páginas priorizadas sem refatoração ampla. | L | Telas priorizadas receberam alterações localizadas reutilizando componentes. |
| E036.06 | Documentar contratos de borda, raio e sombra com uso moderado. | P | Raios e sombras consistentes localmente; especificação completa não localizada. |
| E036.07 | Definir tokens para foco e áreas de interação. | P | Foco e alvos aplicados em controles revisados, não em todos. |
| E036.08 | Implementar exemplos que demonstrem alteração de tema com consistência. | N | Demonstração formal de troca de tema consistente não localizada. |
| E036.09 | Verificar contrastes após aplicar tokens aos componentes reais. | P | Contraste automatizado local validado; todas as aplicações não cobertas. |
| E036.10 | Revisar a correspondência entre especificação visual e estilos entregues. | P | Comparação visual local existe; correspondência completa ainda não aceita. |

**Critério de aceite ainda exigido:** Mudança de um token atualiza os componentes correspondentes sem divergência visual ou semântica.

## E037 — Consolidar componentes de ação e formulário

**Referências:** [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx), [src/pages/Auth.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/Auth.tsx), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [tests/components/pages/Auth.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/components/pages/Auth.test.tsx), [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E037.01 | Definir hierarquia de botão principal, secundário e ação destrutiva. | P | Variantes de botão existentes; aplicação integral ainda desigual. |
| E037.02 | Implementar estados de espera sem permitir envio financeiro duplicado. | P | RPCs resistem à repetição; ações de logística e rascunho não uniformes. |
| E037.03 | Padronizar campo de texto, seleção, quantidade, data e valor monetário. | P | Controles compartilhados existem; contrato financeiro comum incompleto. |
| E037.04 | Associar rótulos, instruções e erros aos campos correspondentes. | P | Login corrigido; demais formulários ainda sem cobertura integral. |
| E037.05 | Usar elementos nativos quando eles atendem à necessidade de interação. | P | Elementos nativos usados em parte; componentes complexos exigem inspeção. |
| E037.06 | Definir área de toque preferencial de 44 pixels para ações principais. | P | Alvos ampliados nas telas revisadas; jornada completa não medida. |
| E037.07 | Verificar mínimo normativo aplicável e exceções de alvos menores documentadas. | N | Inventário de exceções normativas de alvos pequenos não localizado. |
| E037.08 | Implementar diálogos com foco inicial, contenção e retorno ao acionador. | P | Radix fornece foco básico; composição real de todos os diálogos não validada. |
| E037.09 | Oferecer alternativas a gestos de arrastar e ações exclusivamente por hover. | P | Kit e ordenações possuem drag; alternativa por teclado não comprovada integralmente. |
| E037.10 | Validar exemplos com teclado, toque e tecnologia assistiva nas telas do portal. | V | Tecnologia assistiva em jornadas reais ainda não testada. |

**Critério de aceite ainda exigido:** Componentes possuem estados, semântica, foco e mensagens consistentes nas jornadas críticas.

## E038 — Consolidar tabelas, listas e visualização de estados

**Referências:** [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/pages/ComparePage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/ComparePage.tsx), [src/hooks/useSupplierComparison.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSupplierComparison.ts), [src/components/compare/ComparisonMobileView.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/compare/ComparisonMobileView.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E038.01 | Definir quando usar tabela, lista ou card por tarefa do usuário. | P | Tabelas/cards existem; escolha por tarefa não validada pelo público. |
| E038.02 | Priorizar colunas de identificação, valor, prazo e pendência. | P | Colunas comerciais existem; pendência e prazo ainda dependem de fontes incompletas. |
| E038.03 | Alinhar números e unidades sem misturar formatos incompatíveis. | P | Números formatados; unidades e totais não reconciliados integralmente. |
| E038.04 | Implementar ordenação com indicação textual e estado acessível. | P | Ordenação existe; indicação assistiva não verificada em todas as listas. |
| E038.05 | Definir seleção de linha e seleção em lote sem ambiguidade de escopo. | P | Lote financeiro valida cada pedido; seleção em todos os filtros não homologada. |
| E038.06 | Preservar cabeçalhos e relação entre célula e coluna. | P | Componentes de tabela existem; relações semânticas completas não inspecionadas. |
| E038.07 | Planejar comportamento móvel com detalhes progressivos ou rolagem localizada. | P | Alternativas móveis existentes; volumes e nomes reais não testados. |
| E038.08 | Mostrar total, página e intervalo sem contagens inventadas. | P | Paginação existe; indicadores fictícios permanecem em módulos adjacentes. |
| E038.09 | Representar estados com texto, data e ação pertinente. | P | Estados presentes; próxima ação pode depender de integração quebrada. |
| E038.10 | Validar consulta, seleção e retorno ao item em volume representativo de dados. | V | Volume representativo e tarefa real de consulta ainda não homologados. |

**Critério de aceite ainda exigido:** Dados densos continuam legíveis e operáveis, com seleção e paginação inequívocas.

## E039 — Projetar feedback e movimento com propósito

**Referências:** [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E039.01 | Relacionar cada animação proposta à informação que ela comunica. | P | Movimento de feedback existe; justificativa de cada animação não registrada. |
| E039.02 | Definir durações discretas para mudança de estado e transição. | P | Durações comuns usadas; padronização completa não demonstrada. |
| E039.03 | Evitar animações contínuas em conteúdo de trabalho e decisão. | P | Contador aleatório e efeitos contínuos ainda aparecem em pedidos. |
| E039.04 | Respeitar preferência por redução de movimento do dispositivo. | P | Preferência de movimento reduzido tem suporte parcial; jornada completa não verificada. |
| E039.05 | Preservar foco durante abertura, fechamento e atualização de componentes. | P | Foco local melhorado; atualizações complexas não integralmente testadas. |
| E039.06 | Usar feedback imediato de interação sem simular aprovação concluída. | P | Toast de conclusão logística pode anteceder falha de persistência (A01). |
| E039.07 | Reservar mensagens persistentes para resultados que exigem leitura posterior. | P | Toasts dominam ações; persistência de resultados críticos não uniforme. |
| E039.08 | Evitar deslocamentos de layout ao carregar imagens e valores. | P | CLS zero no login; pedidos e catálogo real sem medição equivalente. |
| E039.09 | Testar percepção de carregamento em conexão lenta. | P | Lighthouse simula rede limitada no login; percepção da compra não validada. |
| E039.10 | Remover efeitos que dificultem leitura ou não tenham função demonstrável. | P | Vitrine simplificada; efeitos sem origem funcional ainda persistem. |

**Critério de aceite ainda exigido:** Movimento orienta a tarefa, respeita redução de animação e não encobre confirmação operacional.

## E040 — Governar o sistema de design

**Referências:** [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E040.01 | Documentar cada componente com uso recomendado e limites. | P | Documentação e componentes existem; catálogo de contratos incompleto. |
| E040.02 | Publicar exemplos de estados preenchido, vazio, inválido e desabilitado. | P | Estados básicos ilustrados; todos os controles sem exemplos homologados. |
| E040.03 | Associar requisitos de acessibilidade ao contrato do componente. | P | Diretrizes de acessibilidade existentes; contrato por componente parcial. |
| E040.04 | Registrar correspondência entre especificação visual e implementação. | P | Capturas e código disponíveis; rastreabilidade visual global incompleta. |
| E040.05 | Definir revisão para inclusão de nova variante ou exceção. | N | Processo com responsável para novas variantes não estabelecido. |
| E040.06 | Evitar duplicação de componentes com diferenças apenas cosméticas. | P | Reuso amplo de UI; duplicações legadas continuam. |
| E040.07 | Criar exemplos com nomes longos, dados extremos e múltiplos estados. | P | Demonstrações locais existem; matriz de dados extremos não integral. |
| E040.08 | Definir versionamento e impacto de mudanças sobre consumidores existentes. | P | Git versiona alterações; política de compatibilidade de componentes não consolidada. |
| E040.09 | Validar alterações relevantes nas telas representativas do portal. | P | Nove capturas locais; telas de toda a compra não validadas. |
| E040.10 | Formalizar responsáveis por manter consistência e corrigir regressões visuais. | V | Responsáveis nominais pela governança visual ainda não definidos. |

**Critério de aceite ainda exigido:** As páginas novas usam componentes publicados; exceções possuem justificativa e responsável.

## E041 — Redesenhar a experiência de acesso

**Referências:** [src/pages/Auth.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/Auth.tsx), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [tests/components/pages/Auth.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/components/pages/Auth.test.tsx), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/execucao/ativos-imagegen.json](../../../docs/execucao/ativos-imagegen.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E041.01 | Aplicar a identidade autorizada com logo carregada localmente. | P | Logo local aplicada; autorização da identidade ainda pendente. |
| E041.02 | Explicar a finalidade do portal em texto curto e verificável. | L | Finalidade de solicitar brindes descrita sem alegação indevida de oficialidade. |
| E041.03 | Destacar a ação principal de entrada e a recuperação de acesso. | L | Entrada e recuperação têm ações explícitas no login revisado. |
| E041.04 | Apresentar apenas provedores configurados e aprovados para o ambiente. | P | Botões incompletos removidos; configuração efetiva do provedor remoto desconhecida. |
| E041.05 | Explicar o acesso por convite quando não houver cadastro público. | P | Orientação de acesso existe; convite institucional ainda incompleto. |
| E041.06 | Preservar email preenchido em erros recuperáveis. | L | Estado do email é preservado nos erros locais revisados. |
| E041.07 | Evitar distrações comerciais e métricas sem comprovação no login. | L | Login revisado não apresenta métricas fictícias nem provas sociais inventadas. |
| E041.08 | Mostrar ajuda para convite expirado ou vínculo ausente. | P | Ajuda genérica existe; convite expirado e vínculo ausente sem fluxo completo. |
| E041.09 | Validar contraste, teclado, autofill e mensagens em largura móvel. | P | Capturas e testes de labels/contraste; autofill real ainda não homologado. |
| E041.10 | Homologar entrada e retorno seguro ao destino autorizado solicitado. | V | Entrada com sessão real e retorno autorizado continuam sem evidência. |

**Critério de aceite ainda exigido:** Usuário identifica o serviço, entra ou recupera acesso sem controles de teste ou provedores fictícios.

## E042 — Criar início orientado às pendências

**Referências:** [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx), [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E042.01 | Priorizar pendências de arte, despesa, correção e recebimento. | P | Painéis por papel existem; arte e recebimento não formam fila completa. |
| E042.02 | Exibir cooperativa, unidade e período que contextualizam os dados. | P | Contexto exibido; modelos de PA/organização e período ainda divergem. |
| E042.03 | Apresentar saldo apenas quando o contrato de verba estiver consistente. | P | Saldo calculado localmente; contrato dos quatro estados ainda não implementado. |
| E042.04 | Criar atalhos para nova solicitação e continuidade de rascunho. | P | Atalhos existentes; retomada segura de rascunho prejudicada pelo autosave. |
| E042.05 | Separar alertas de prazo das mensagens meramente informativas. | P | Alertas genéricos existem; fontes e prioridades ainda não reconciliadas. |
| E042.06 | Mostrar pedidos recentes com estágio e próxima ação verificáveis. | P | Pedidos aparecem, mas logística e recompra possuem falhas concretas. |
| E042.07 | Omitir previsões, probabilidades e contadores sem origem real. | P | Probabilidades fixas e contadores aleatórios permanecem (A06). |
| E042.08 | Projetar primeiro acesso sem dados com orientação acionável. | P | Estados vazios existem; primeiro acesso com vínculo real não testado. |
| E042.09 | Respeitar permissões ao consultar indicadores agregados. | P | Filtros e RLS existem; agregados de duas cooperativas não homologados. |
| E042.10 | Validar que cada perfil identifica sua principal pendência sem ajuda. | V | Identificação da principal pendência exige teste com cada perfil. |

**Critério de aceite ainda exigido:** As informações apresentadas correspondem ao contexto ativo e levam diretamente à próxima ação útil.

## E043 — Implementar listagem de catálogo útil

**Referências:** [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs), [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E043.01 | Conectar a listagem ao adaptador de leitura autorizado. | L | Listagem utiliza adaptador de consulta autorizado no código revisado. |
| E043.02 | Exibir nome, imagem, variante e identificador de produto consistentes. | P | Cards possuem dados essenciais; consistência da amostra real não conciliada. |
| E043.03 | Informar preço como estimativa ou condição vigente conforme o contrato. | P | Preço inicial com ressalvas; contrato de oferta firme ainda incompleto. |
| E043.04 | Mostrar mínimo e múltiplo de compra quando conhecidos. | P | Mínimos e múltiplos não garantidos em todos os produtos e ações. |
| E043.05 | Apresentar disponibilidade com horário e limite de confiabilidade. | P | Disponibilidade exibida; idade e limite de confiança não uniformes. |
| E043.06 | Separar produto indisponível de falha de integração. | P | Ponte distingue erros; consumidores ainda precisam de cobertura integral. |
| E043.07 | Permitir abrir detalhes sem perder posição na listagem. | P | Estado de navegação existe; retorno com conta real não homologado. |
| E043.08 | Carregar imagens e próximas páginas conforme necessidade de uso. | L | Imagens e grade progressiva implementadas com testes dirigidos locais. |
| E043.09 | Verificar navegação acessível quando houver virtualização de itens. | P | Rolagem natural reduz barreiras; navegação assistiva integral não comprovada. |
| E043.10 | Validar uma amostra real sem alterações no cadastro mestre. | V | Falta amostra atual reconciliada com preço/variante/estoque reais. |

**Critério de aceite ainda exigido:** Itens exibem dados reais, variante identificável e condições suficientes para iniciar uma seleção.

## E044 — Implementar busca com recuperação de intenção

**Referências:** [src/hooks/useSearch.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSearch.ts), [src/utils/product-search.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/utils/product-search.ts), [tests/hooks/useSearch.test.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/hooks/useSearch.test.ts), [src/components/catalog/CatalogHeader.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogHeader.tsx), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E044.01 | Disponibilizar campo de busca em posição consistente do catálogo. | L | Busca principal ampliada e consistente no cabeçalho do catálogo. |
| E044.02 | Implementar consulta por nome e correspondência exata de código. | L | Nome e correspondência por código possuem implementação e testes locais. |
| E044.03 | Aplicar normalização e sinônimos aprovados ao mecanismo disponível. | P | Normalização existente; vocabulário aprovado pelo público ausente. |
| E044.04 | Oferecer sugestões navegáveis por teclado com significado explícito. | P | Sugestões existentes; acessibilidade completa e dados estáticos precisam revisão. |
| E044.05 | Preservar a consulta ao abrir produto e voltar aos resultados. | P | Estado da consulta persistido; histórico ainda global e sem isolamento. |
| E044.06 | Apresentar correção sugerida sem apagar a busca original. | P | Busca aproximada existente; sugestão explícita sem substituir intenção incompleta. |
| E044.07 | Mostrar alternativas de refinamento quando não houver correspondência. | P | Estado vazio oferece alternativas; utilidade não validada com compradores. |
| E044.08 | Tratar latência e falha sem repetir consulta indefinidamente. | P | Ponte trata erros; retentativas dos consumidores não auditadas integralmente. |
| E044.09 | Registrar eventos de busca sem conteúdo pessoal desnecessário. | P | Telemetria existe; minimização e escopo do histórico precisam correção. |
| E044.10 | Executar o conjunto de avaliação e corrigir resultados críticos inadequados. | P | Testes sintéticos passam; conjunto de consultas reais não validado. |

**Critério de aceite ainda exigido:** Consultas prioritárias encontram itens esperados; ausência ou erro oferece recuperação coerente.

## E045 — Implementar filtros acessíveis e persistentes

**Referências:** [src/hooks/catalog/useCatalogFilters.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/catalog/useCatalogFilters.ts), [src/components/catalog/CatalogActiveFilters.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogActiveFilters.tsx), [tests/components/catalog/CatalogStorefrontExperience.test.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/components/catalog/CatalogStorefrontExperience.test.tsx), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E045.01 | Conectar grupos de filtros aos atributos autorizados do catálogo. | P | Facetas ligadas ao catálogo; referências estáticas e dados incompletos persistem. |
| E045.02 | Mostrar seleção ativa fora dos painéis recolhidos. | L | Chips de filtros ativos são exibidos fora do painel. |
| E045.03 | Implementar remoção individual e limpeza completa dos critérios. | L | Remoção e limpeza completa têm implementação no catálogo revisado. |
| E045.04 | Diferenciar opção sem resultado de informação indisponível. | P | Sem resultado e sem informação ainda não uniformes em todas as facetas. |
| E045.05 | Manter ordenação e filtros no retorno da página de produto. | P | Persistência existente; retorno autenticado ainda não homologado. |
| E045.06 | Definir persistência segura por contexto e parâmetros compartilháveis permitidos. | P | Parâmetros compartilháveis existem; dados privados não integram contexto canônico. |
| E045.07 | Apresentar painel móvel com aplicar, limpar e fechar compreensíveis. | P | Painel móvel implementado; tarefa completa ainda não observada. |
| E045.08 | Restaurar foco após fechar painel ou remover um filtro. | P | Componentes acessíveis usados; retorno de foco em todos os caminhos não comprovado. |
| E045.09 | Anunciar atualização dos resultados sem interromper a navegação. | P | Resultados atualizam; anúncio assistivo integral não confirmado. |
| E045.10 | Validar combinações extremas, retorno do navegador e uso apenas por teclado. | P | Testes locais parciais; extremos e teclado em todo o fluxo ainda pendentes. |

**Critério de aceite ainda exigido:** Filtros ativos são visíveis, reversíveis e preservados ao navegar, inclusive em tela móvel.

## E046 — Construir página de produto para decisão

**Referências:** [src/pages/ProductDetail.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/ProductDetail.tsx), [src/pages/product-detail/ProductDetailHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/product-detail/ProductDetailHero.tsx), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E046.01 | Organizar nome, código, variante e imagens no início da página. | P | Estrutura essencial existe; amostra real de variantes não reconciliada. |
| E046.02 | Exibir materiais, dimensões, capacidade e embalagem conforme os dados disponíveis. | P | Atributos disponíveis são exibidos; completude depende da origem. |
| E046.03 | Apresentar seletores de cor e tamanho com disponibilidade correspondente. | P | Seletores existem; estoque por variante apresenta gaps em jornadas de kit. |
| E046.04 | Mostrar mínimo, múltiplo e faixas comerciais aplicáveis. | P | Faixas presentes em módulos comerciais; mínimo/múltiplo não uniformes. |
| E046.05 | Explicar técnicas e áreas de personalização compatíveis. | P | Técnicas e áreas existem; validade técnica requer confirmação de produção. |
| E046.06 | Identificar limitações relevantes antes de adicionar à proposta. | P | Restrições parciais; servidor não garante toda configuração comercial. |
| E046.07 | Mostrar data da consulta de estoque e condição de reconfirmação. | P | Atualidade de estoque não explicitada de forma uniforme. |
| E046.08 | Oferecer ficha técnica e ajuda contextual quando disponíveis. | P | Ficha e ajuda existem; fontes reais e links ainda não integralmente validados. |
| E046.09 | Preservar seleção ao simular preço e retornar aos detalhes. | P | Estado local de configuração existe; round-trip completo não homologado. |
| E046.10 | Validar decisões com compradores usando produtos de categorias diferentes. | V | Decisões com compradores de categorias distintas não validadas. |

**Critério de aceite ainda exigido:** Comprador entende o item, suas restrições e o próximo passo sem confundir simulação com contratação.

## E047 — Especificar personalização sem ambiguidade

**Referências:** [src/pages/PersonalizationSimulator.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/PersonalizationSimulator.tsx), [src/components/kit-builder/PersonalizationConfig.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/kit-builder/PersonalizationConfig.tsx), [src/lib/external-db/techniques.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/external-db/techniques.ts), [src/pages/ProductDetail.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/ProductDetail.tsx), [src/pages/product-detail/ProductDetailHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/product-detail/ProductDetailHero.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E047.01 | Relacionar técnicas disponíveis à variante e ao material selecionados. | P | Associação técnica/material existe; dados atuais precisam de conferência. |
| E047.02 | Mostrar área útil e posição de aplicação com apoio visual. | P | Prévia visual existe; área útil ainda requer validação técnica. |
| E047.03 | Informar limites de dimensões e número de cores por técnica. | P | Limites disponíveis no catálogo; enforcement completo não demonstrado. |
| E047.04 | Explicar preparação, matriz e custos adicionais quando aplicáveis. | P | Custos e preparação modelados; distinção custo interno/preço apresenta A10. |
| E047.05 | Impedir combinações tecnicamente incompatíveis antes de enviar a proposta. | P | Cliente filtra técnicas; validação completa no servidor não comprovada. |
| E047.06 | Oferecer análise manual quando a informação do catálogo for insuficiente. | N | Encaminhamento manual com protocolo para insuficiência técnica não localizado. |
| E047.07 | Identificar a prévia como simulação e separar aprovação de produção. | P | Hero ilustrativo identificado; todas as prévias precisam de distinção equivalente. |
| E047.08 | Registrar observações relevantes sem substituir especificações estruturadas. | P | Observações e campos estruturados existem; especificação contratual incompleta. |
| E047.09 | Preservar configuração na proposta e na versão da arte. | P | Configuração é copiada; versão imutável de arte não assegurada. |
| E047.10 | Validar configurações de amostra com produção e documentar as restrições aplicadas. | V | Produção ainda precisa homologar configurações e restrições reais. |

**Critério de aceite ainda exigido:** Técnica, área, dimensão e quantidade de cores formam uma configuração executável ou exigem análise explícita.

## E048 — Implementar simulação transparente de custo e prazo

**Referências:** [src/pages/PersonalizationSimulator.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/PersonalizationSimulator.tsx), [src/components/kit-builder/PersonalizationConfig.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/kit-builder/PersonalizationConfig.tsx), [src/lib/external-db/techniques.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/external-db/techniques.ts), [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E048.01 | Separar preço comercial de custo de aquisição interno. | P | A10 reproduz campos de custo interno fora da lista de redação. |
| E048.02 | Calcular faixas por quantidade com mínimo e múltiplo válidos. | P | Faixas calculadas; mínimo/múltiplo não garantidos no contrato inteiro. |
| E048.03 | Discriminar personalização, preparação e embalagem aplicáveis. | P | Itens de personalização existentes; valores firmes não conciliados. |
| E048.04 | Integrar estimativa de frete por destino quando houver fonte confiável. | P | Frete genérico existe; cálculo por distribuição real não demonstrado. |
| E048.05 | Explicar tributos e condições incluídos ou ainda pendentes de cálculo. | N | Composição tributária revisada e explícita da oferta não comprovada. |
| E048.06 | Separar tempo de análise, produção e transporte. | P | Prazos genéricos existem; etapas de análise/produção/transporte não reconciliadas. |
| E048.07 | Indicar dependência de arte aprovada e pagamento quando contratual. | P | Dependências descritas; trava contratual de produção não demonstrada. |
| E048.08 | Recalcular valores quando variante, quantidade ou destino mudar. | P | Recálculos locais existem; destino e condições versionadas incompletos. |
| E048.09 | Bloquear confirmação quando faltar dado necessário à proposta firme. | P | Cliente valida parcialmente; confirmação firme ainda tem lacunas de servidor. |
| E048.10 | Conciliar exemplos do simulador com cálculos comerciais revisados. | V | Exemplos comerciais precisam de conferência com responsável autorizado. |

**Critério de aceite ainda exigido:** Total e prazo exibidos são reproduzíveis; estimativa não é apresentada como proposta firme ou reserva.

## E049 — Implementar comparação de alternativas

**Referências:** [src/pages/ComparePage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/ComparePage.tsx), [src/hooks/useSupplierComparison.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSupplierComparison.ts), [src/components/compare/ComparisonMobileView.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/compare/ComparisonMobileView.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E049.01 | Permitir selecionar um conjunto manejável de alternativas do catálogo. | P | Seleção de produtos para comparação implementada; tarefa institucional não homologada. |
| E049.02 | Priorizar preço entregue, mínimo, prazo e personalização na comparação. | P | Comparador rico; custo entregue e prazo equivalente ainda não normalizados. |
| E049.03 | Normalizar quantidade e unidade para evitar comparação enganosa. | P | Pesos e preços existem; quantidades distintas podem impedir comparação justa. |
| E049.04 | Evidenciar diferenças de material, embalagem e capacidade. | P | Atributos comparados; qualidade da amostra de origem não confirmada. |
| E049.05 | Marcar informação não disponível sem estimar um valor fictício. | P | Fallbacks existem; sugestões e scores não têm base operacional validada. |
| E049.06 | Permitir retirar e substituir alternativas preservando o restante. | P | Remoção/substituição existentes; configuração preservada precisa de E2E. |
| E049.07 | Adaptar comparação à tela móvel sem ocultar o nome do item. | P | Visualização móvel existe; volume e nomes reais ainda não testados. |
| E049.08 | Manter foco e cabeçalhos compreensíveis na leitura assistiva. | P | Tabelas existentes; leitor de tela e foco completo não verificados. |
| E049.09 | Permitir levar a alternativa escolhida para a proposta com sua configuração. | P | Seleção comercial existente; vínculo com proposta Sicoob canônica incompleto. |
| E049.10 | Validar uma decisão de compra e registrar dúvidas que ainda exigem atendimento. | V | Decisão observada e dúvidas do comprador ainda não registradas. |

**Critério de aceite ainda exigido:** Comparação usa quantidades e bases equivalentes e evidencia informações desconhecidas.

## E050 — Organizar favoritos e coleções compartilhadas

**Referências:** [src/hooks/useFavoriteLists.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useFavoriteLists.ts), [src/hooks/useKitShare.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitShare.ts), [src/stores/useFavoritesStore.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/stores/useFavoritesStore.ts), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E050.01 | Permitir salvar produto com variante e contexto de interesse. | P | Favoritos existem; variante/contexto de interesse não íntegros em todos os caminhos. |
| E050.02 | Organizar listas por campanha, evento ou necessidade recorrente. | P | Listas genéricas existem; campanhas institucionais não integradas completamente. |
| E050.03 | Definir proprietário, colaboradores e permissão de edição da coleção. | P | Ownership por usuário existe; colaboração por cooperativa ainda não comprovada. |
| E050.04 | Isolar listas entre cooperativas e contextos não compartilhados. | P | Armazenamento global e membership exigem teste de isolamento por contexto. |
| E050.05 | Indicar produtos descontinuados ou condições comerciais alteradas. | P | Produtos atualizados via catálogo; condições alteradas não revalidadas uniformemente. |
| E050.06 | Definir comentários úteis à seleção sem simular aprovação formal. | P | Comentários genéricos existem; separação de decisão formal precisa de UX completa. |
| E050.07 | Restringir links externos aos campos e pessoas autorizados. | P | Token de compartilhamento existe; minimização de campos precisa de revisão. |
| E050.08 | Implementar validade e revogação dos compartilhamentos permitidos. | P | Validade e revogação existem; regressão remota de links públicos falha. |
| E050.09 | Oferecer desfazer remoção quando a ação for reversível. | P | Remoção reversível existe em favoritos; coerência remota não homologada. |
| E050.10 | Validar colaboração, expiração e acesso negado com dois contextos distintos. | V | Dois contextos reais, expiração e negação ainda não validados ponta a ponta. |

**Critério de aceite ainda exigido:** Pessoas compartilham seleções no escopo permitido sem publicar custos internos ou dados de outra cooperativa.

## E051 — Criar briefing de campanha e necessidade

**Referências:** [src/pages/admin/AdminCampanhasPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/admin/AdminCampanhasPage.tsx), [src/pages/KitBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/KitBuilderPage.tsx), [src/hooks/useKitAutoSave.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitAutoSave.ts), [src/hooks/useKitStockValidation.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitStockValidation.ts), [src/lib/kit-builder/types.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/kit-builder/types.ts), [src/components/kit-builder/VariantSelector.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/kit-builder/VariantSelector.tsx), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E051.01 | Definir campanha, necessidade avulsa e reposição como contextos distintos. | P | Campanhas genéricas existem; contexto institucional não distingue todos os gatilhos. |
| E051.02 | Solicitar objetivo da ação em linguagem compreensível para o PA. | P | Campo de descrição existe; briefing orientado ao PA não consolidado. |
| E051.03 | Registrar público, quantidade estimada e responsável pela iniciativa. | P | Público e orçamento existem; responsabilidade e estimativa não integradas integralmente. |
| E051.04 | Diferenciar data do evento de data desejada de recebimento. | N | Data de evento e recebimento não separadas no briefing completo. |
| E051.05 | Associar cooperativa, unidades e centro de custo autorizados. | P | Organização existe; centro de custo e distribuição não integrados. |
| E051.06 | Permitir anexar referências com indicação de uso e origem. | P | Uploads genéricos existem; origem e autorização de referências incompletas. |
| E051.07 | Preencher dados conhecidos do contexto sem assumir escolhas comerciais. | P | Contexto parcialmente reaproveitado; modelos de PA e organização divergem. |
| E051.08 | Salvar rascunho e permitir colaboração conforme as permissões. | P | Rascunhos existem; colaboração e autosave confiável ainda incompletos. |
| E051.09 | Mostrar informações pendentes antes de encaminhar para cotação. | N | Validação de briefing para cotação institucional não demonstrada. |
| E051.10 | Validar briefings reais anonimizados com compras, marketing e operação. | V | Briefings reais precisam de validação conjunta com as áreas. |

**Critério de aceite ainda exigido:** Briefing orienta seleção e operação sem exigir informações que o solicitante ainda não possui.

## E052 — Planejar campanhas e marcos de prazo

**Referências:** [src/pages/admin/AdminCampanhasPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/admin/AdminCampanhasPage.tsx), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E052.01 | Relacionar campanhas à data do evento e aos destinos atendidos. | P | Datas genéricas de campanhas existem; destinos não integrados. |
| E052.02 | Definir marcos de escolha, cotação, arte, autorização e produção. | N | Marcos encadeados de cotação, arte e produção não localizados. |
| E052.03 | Estimar datas regressivas a partir de condições comerciais verificáveis. | N | Planejamento regressivo com condições verificadas não implementado. |
| E052.04 | Sinalizar dependências sem prometer prazo ainda não confirmado. | P | Datas exibidas; compromisso e dependências não formalizados. |
| E052.05 | Exibir responsável e próxima ação de cada marco pendente. | N | Responsável e próxima ação por marco não localizados. |
| E052.06 | Permitir alteração justificada de data preservando o histórico. | P | CRUD altera datas; justificativa e histórico de marcos não comprovados. |
| E052.07 | Mostrar conflito entre prazo solicitado e prazo viável de entrega. | N | Conflito entre prazo necessário e viável não calculado integralmente. |
| E052.08 | Oferecer alternativa de produto ou distribuição sujeita a nova validação. | P | Produtos alternativos existem; redistribuição e nova validação não integradas. |
| E052.09 | Adaptar agenda para visualização em lista acessível. | P | Listagem de campanhas existe; agenda institucional acessível não homologada. |
| E052.10 | Simular campanha com atraso de arte e revisar seus impactos de prazo. | N | Simulação integrada de atraso de arte e marcos não demonstrada. |

**Critério de aceite ainda exigido:** Agenda separa datas confirmadas de estimadas e evidencia risco de não atender ao evento.

## E053 — Organizar biblioteca de marcas e arquivos

**Referências:** [src/components/mockup/ArtFileUpload.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/mockup/ArtFileUpload.tsx), [src/components/magic-up/MagicUpBrandKitPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/magic-up/MagicUpBrandKitPanel.tsx), [src/components/orders/PilotApprovalPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/orders/PilotApprovalPanel.tsx), [src/hooks/usePilotApprovals.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/usePilotApprovals.ts), [src/hooks/useFavoriteLists.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useFavoriteLists.ts), [src/hooks/useKitShare.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitShare.ts), [src/stores/useFavoritesStore.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/stores/useFavoritesStore.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E053.01 | Definir tipos de arquivo aceitos para logos, referências e artes. | P | Uploads aceitam tipos definidos; biblioteca governada ainda incompleta. |
| E053.02 | Registrar propriedade e permissão de uso dos ativos enviados. | N | Registro de propriedade e permissão de uso não consolidado. |
| E053.03 | Separar assinatura institucional de marca local e material de campanha. | P | Brand kit genérico existe; assinaturas locais e institucionais não governadas. |
| E053.04 | Armazenar arquivos em escopo privado com vínculo organizacional. | P | Storage existe; isolamento privado entre organizações não comprovado. |
| E053.05 | Validar extensão, conteúdo, tamanho e riscos de processamento do arquivo. | P | Validações de upload parciais; conteúdo e processamento precisam de verificação integral. |
| E053.06 | Manter versões e identificar qual ativo está vigente para uso. | P | Ativos persistidos; vigência/versionamento institucional incompletos. |
| E053.07 | Disponibilizar prévia segura e download apenas para pessoas autorizadas. | P | Prévia/download existem; URLs públicas e escopo requerem auditoria real. |
| E053.08 | Tratar substituição de ativo sem alterar pedidos históricos. | N | Substituição de marca preservando snapshot histórico não assegurada. |
| E053.09 | Definir retenção e revogação conforme finalidade e responsabilidades aprovadas. | V | Retenção e revogação precisam de finalidade e responsável aprovados. |
| E053.10 | Testar isolamento, arquivo inválido e recuperação de versão anterior. | P | Testes genéricos não comprovam isolamento e recuperação de versão de marca. |

**Critério de aceite ainda exigido:** Arquivos têm proprietário, versão e permissão; um ativo de outra cooperativa não pode ser aplicado indevidamente.

## E054 — Produzir prova técnica da personalização

**Referências:** [src/components/mockup/ArtFileUpload.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/mockup/ArtFileUpload.tsx), [src/components/magic-up/MagicUpBrandKitPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/magic-up/MagicUpBrandKitPanel.tsx), [src/components/orders/PilotApprovalPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/orders/PilotApprovalPanel.tsx), [src/hooks/usePilotApprovals.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/usePilotApprovals.ts), [src/pages/PersonalizationSimulator.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/PersonalizationSimulator.tsx), [src/components/kit-builder/PersonalizationConfig.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/kit-builder/PersonalizationConfig.tsx), [src/lib/external-db/techniques.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/external-db/techniques.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E054.01 | Vincular a prova ao item e à variante da proposta. | P | Mockup vincula produto; versão comercial e variante imutáveis incompletas. |
| E054.02 | Identificar técnica, posição e dimensões efetivas de aplicação. | P | Áreas/técnicas exibidas; medidas efetivas não homologadas por produção. |
| E054.03 | Mostrar cores e limitações relevantes do processo de impressão. | P | Cores simuladas; limites do processo precisam de validação técnica. |
| E054.04 | Anexar o arquivo de arte e sua versão imutável. | N | Arquivo de prova imutável vinculado à decisão não assegurado. |
| E054.05 | Distinguir representação ilustrativa de prova técnica validada pela produção. | P | Ilustração existe; prova técnica homologada ainda ausente. |
| E054.06 | Registrar embalagem e composição quando afetarem a personalização. | P | Kit representa composição; embalagem da prova contratual não integral. |
| E054.07 | Permitir comentários ancorados no item ou na área correspondente. | P | Comentários de mockup existem; ancoragem técnica por área não comprovada. |
| E054.08 | Comparar revisões destacando o que mudou entre versões. | P | Comparação visual disponível; revisão com semântica contratual incompleta. |
| E054.09 | Emitir documento legível para revisão em desktop e dispositivo móvel. | P | Exportação existe; identificação da prova/versão não homologada. |
| E054.10 | Validar prova de amostra com produção antes de habilitar aprovação formal. | V | Produção ainda não validou prova de amostra para aprovação formal. |

**Critério de aceite ainda exigido:** Documento identifica produto, variante, técnica, dimensões e arquivo exato proposto para produção.

## E055 — Construir kits com composição verificável

**Referências:** [src/pages/KitBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/KitBuilderPage.tsx), [src/hooks/useKitAutoSave.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitAutoSave.ts), [src/hooks/useKitStockValidation.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitStockValidation.ts), [src/lib/kit-builder/types.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/kit-builder/types.ts), [src/components/kit-builder/VariantSelector.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/kit-builder/VariantSelector.tsx), [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E055.01 | Permitir adicionar produtos e variantes à composição do kit. | P | KitBuilder adiciona produtos; identidade da variante exige correção de estoque. |
| E055.02 | Definir quantidade de cada componente por unidade de kit. | P | Quantidade por componente existe; persistência confiável falha em A04. |
| E055.03 | Calcular demanda total a partir da quantidade de kits solicitada. | P | Multiplicação da demanda existe; soma por cor produz falso disponível em A05. |
| E055.04 | Validar mínimos e múltiplos de cada componente individualmente. | P | Mínimos e múltiplos não validados integralmente por componente no servidor. |
| E055.05 | Exibir personalização e custos adicionais associados aos componentes. | P | Personalização calculada; separação custo/preço e validade comercial incompletas. |
| E055.06 | Incluir embalagem e montagem quando fizerem parte do fornecimento. | P | Caixa e montagem representadas; composição real não conciliada. |
| E055.07 | Sinalizar componente indisponível e permitir substituição revisada. | P | A05/A05b ocultam falta de cor e erro de consulta. |
| E055.08 | Oferecer ordenação por botões além de arrastar e soltar. | P | Arrastar existe; alternativa por botões não demonstrada integralmente. |
| E055.09 | Preservar composição e imagens como versão da proposta. | P | Composição salva; A04 e ausência de snapshot imutável impedem fechamento. |
| E055.10 | Conferir kit de exemplo com comercial e produção antes de liberar uso. | V | Kit físico/comercial precisa de conferência com produção. |

**Critério de aceite ainda exigido:** Composição respeita quantidades, mínimos, disponibilidade e embalagem; preço pode ser reproduzido por item.

## E056 — Planejar distribuição por PA e destino

**Referências:** [supabase/migrations/20260503000002_sicoob_consolidation_logic.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260503000002_sicoob_consolidation_logic.sql), [src/pages/sicoob/GestorConsolidatedOrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/GestorConsolidatedOrdersPage.tsx), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E056.01 | Listar unidades e endereços autorizados no contexto da cooperativa. | P | PAs cadastrados; endereços autorizados não integram distribuição canônica. |
| E056.02 | Permitir distribuir produtos ou kits por destino. | N | Distribuição transacional de itens por destino não localizada. |
| E056.03 | Validar soma das quantidades e evidenciar saldo ainda não distribuído. | N | Soma de destinos e saldo por item não implementados integralmente. |
| E056.04 | Registrar contato operacional mínimo necessário ao recebimento. | P | Contatos genéricos existem; vínculo mínimo por recebimento não consolidado. |
| E056.05 | Definir data necessária e restrições de recebimento por unidade. | N | Data necessária e restrições por destino não modeladas na jornada. |
| E056.06 | Calcular ou solicitar frete correspondente a cada distribuição. | P | Frete genérico existe; composição por distribuição não demonstrada. |
| E056.07 | Permitir importação assistida de distribuição com prévia e validação. | N | Importação assistida de distribuição com prévia não localizada. |
| E056.08 | Tratar unidade inativa, endereço incompleto e duplicidade de destino. | P | Cadastros têm estados; validação de distribuição completa ainda ausente. |
| E056.09 | Mostrar impacto da redistribuição sobre custo e prazo. | N | Recálculo de custo/prazo por redistribuição não demonstrado. |
| E056.10 | Validar uma campanha com pelo menos três destinos e quantidades diferentes. | V | Ensaio de três destinos não realizado. |

**Critério de aceite ainda exigido:** A soma distribuída confere com o total; cada destino tem identificação, prazo e vínculo autorizado.

## E057 — Criar carrinho de solicitação institucional

**Referências:** [src/components/cart/CartHeaderButton.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/cart/CartHeaderButton.tsx), [src/components/layout/Header.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/Header.tsx), [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E057.01 | Identificar claramente se a seleção cria solicitação ou pedido contratado. | L | Cabeçalho revisado comunica orçamento, com ação principal única. |
| E057.02 | Guardar variante, personalização e quantidade de cada item. | P | Itens guardam seleção; variante e personalização precisam de round-trip completo. |
| E057.03 | Separar carrinhos e rascunhos por cooperativa e responsável. | P | Carrinhos existentes não comprovam isolamento por cooperativa e responsável. |
| E057.04 | Mostrar inconsistências que impedem solicitar orçamento. | P | Validações locais existem; mínimo, estoque e política ainda incompletos. |
| E057.05 | Permitir editar item sem perder o restante da seleção. | P | Edição existe; preservação completa precisa de teste com dados reais. |
| E057.06 | Oferecer remoção reversível quando ainda não houver compromisso comercial. | P | Remoção existe; desfazer consistente entre cliente e servidor não comprovado. |
| E057.07 | Preservar distribuição e campanha ao retomar um rascunho. | N | Campanha/distribuição não preservadas por fluxo institucional completo. |
| E057.08 | Revalidar dados antigos do catálogo antes de avançar. | P | Catálogo consultado; revalidação obrigatória antes de enviar não integral. |
| E057.09 | Apresentar total estimado e itens ainda dependentes de cotação. | P | Total estimado exibido; itens sem cotação firme não uniformes. |
| E057.10 | Testar retomada, troca de contexto e alteração concorrente do rascunho. | P | Rascunhos têm A04; contexto e concorrência ainda não homologados. |

**Critério de aceite ainda exigido:** Itens, configurações e destinos persistem corretamente; alterações relevantes exigem recalcular a proposta.

## E058 — Apresentar orçamento com custo total claro

**Referências:** [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts), [src/pages/PersonalizationSimulator.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/PersonalizationSimulator.tsx), [src/components/kit-builder/PersonalizationConfig.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/kit-builder/PersonalizationConfig.tsx), [src/lib/external-db/techniques.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/external-db/techniques.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E058.01 | Exibir produto, variante, quantidade e preço unitário por item. | P | Itens comerciais exibidos; modelo Sicoob e legado não reconciliados. |
| E058.02 | Discriminar personalização e preparação de produção aplicáveis. | P | Personalização discriminada; custo versus preço ainda apresenta lacunas. |
| E058.03 | Apresentar embalagem, montagem e frete por destino quando cobrados. | P | Frete global existe; distribuição por destino incompleta. |
| E058.04 | Indicar tributos e condições comerciais incluídos no valor. | N | Composição tributária incluída versus pendente não validada integralmente. |
| E058.05 | Separar desconto autorizado de preço de origem e negociação pendente. | P | Descontos existem no legado; autoridade comercial não consolidada por política. |
| E058.06 | Mostrar total consolidado e distribuição relevante por centro de custo. | P | Total exibido; rateio por centro de custo não integral. |
| E058.07 | Apresentar validade, condição de pagamento e prazo contratado ou estimado. | P | Validade/pagamento existentes; prazo contratado não reconfirmado no fluxo completo. |
| E058.08 | Evidenciar os dados ainda necessários para uma proposta firme. | P | Campos obrigatórios existem; proposta firme no servidor não assegurada. |
| E058.09 | Disponibilizar resumo legível antes de qualquer solicitação de aprovação. | P | Resumo/PDF existem; versão inequívoca e legibilidade precisam de homologação. |
| E058.10 | Conferir arredondamento e compreensão do total com compras e financeiro. | V | Arredondamento e compreensão exigem conferência comercial/financeira. |

**Critério de aceite ainda exigido:** A soma de itens e encargos coincide com o total; não há custo obrigatório oculto no avanço.

## E059 — Versionar propostas e preservar decisões

**Referências:** [src/hooks/useQuoteVersions.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useQuoteVersions.ts), [src/components/quotes/QuoteVersionCompare.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/quotes/QuoteVersionCompare.tsx), [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E059.01 | Definir identificador e número de versão da proposta. | P | Numeração usa máximo+1 no cliente, sujeita a concorrência (A07). |
| E059.02 | Guardar fotografia de itens, preços, condições e distribuição. | P | Itens/preços copiados; distribuição e condições completas não preservadas. |
| E059.03 | Associar as versões de arte exigidas por cada item. | N | Versão imutável de arte por item não assegurada. |
| E059.04 | Impedir edição silenciosa de proposta já enviada para decisão. | P | Edição e nova versão existem; trava de proposta enviada não comprovada. |
| E059.05 | Destacar diferenças entre versão anterior e revisão comercial. | P | Comparador de versões existe; diferenças contratuais incompletas. |
| E059.06 | Definir quais mudanças invalidam aprovação de arte ou despesa. | N | Invalidação de aprovação por mudança de arte/preço não integral. |
| E059.07 | Registrar validade e expiração da proposta independentemente do catálogo. | P | Validade separada existe; comportamento remoto de links falha na regressão. |
| E059.08 | Gerar documento com identificação inequívoca da versão apresentada. | P | PDF existe; identidade inequívoca de versão ainda não homologada. |
| E059.09 | Preservar vínculo entre proposta aceita e pedido resultante. | P | Conversão de proposta existe; modelos orders/sicoob_orders divergem. |
| E059.10 | Testar alteração de preço e arte sem modificar registros já aprovados. | N | Cenário concorrente de preço/arte sem alterar aceite não comprovado. |

**Critério de aceite ainda exigido:** Pedido e aprovações referenciam a versão exata; atualização de catálogo não reescreve o histórico.

## E060 — Comparar cotações e justificar a escolha

**Referências:** [src/pages/ComparePage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/ComparePage.tsx), [src/hooks/useSupplierComparison.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSupplierComparison.ts), [src/components/compare/ComparisonMobileView.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/compare/ComparisonMobileView.tsx), [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E060.01 | Identificar quantidade de cotações exigida pela política aplicável. | V | Quantidade obrigatória depende da política vigente de cada cooperativa. |
| E060.02 | Permitir anexar propostas externas com fornecedor, data e validade. | N | Fluxo de cotações externas com fornecedor/validade não localizado integralmente. |
| E060.03 | Normalizar quantidade, personalização, embalagem e destinos comparados. | P | Comparação de catálogo existe; equivalência de propostas não implementada. |
| E060.04 | Exibir diferenças de prazo, pagamento e custo entregue. | P | Preços de produtos comparados; custo entregue/pagamento/prazo não normalizados. |
| E060.05 | Registrar critérios relevantes além do menor preço unitário. | P | Scores genéricos existem; critérios formais da decisão não consolidados. |
| E060.06 | Sinalizar proposta incompleta ou vencida antes da decisão. | P | Validade de quote existe; cotação externa e completude ainda não integradas. |
| E060.07 | Permitir justificativa autorizada para fornecedor único quando aplicável. | N | Exceção de fornecedor único com autoridade e evidência não localizada. |
| E060.08 | Preservar anexos e responsáveis pela análise comercial. | P | Anexos genéricos existem; autoria da análise comercial não formalizada. |
| E060.09 | Restringir dados de negociação às pessoas que podem consultá-los. | P | RLS genérica existe; negociação por competência não homologada. |
| E060.10 | Validar cenários de duas cotações, três cotações e exceção documentada. | N | Cenários institucionais de duas/três cotações e exceção não demonstrados. |

**Critério de aceite ainda exigido:** Escolha considera bases equivalentes e reúne evidências exigidas pela cooperativa, incluindo exceções.

## E061 — Formalizar a solicitação de compra

**Referências:** [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E061.01 | Exibir resumo de campanha, itens, destinos e valor antes do envio. | P | Resumo comercial existe; campanha e destinos não completos. |
| E061.02 | Identificar política, centro de custo e período de verba aplicáveis. | P | PA/alçada existem; política versionada, centro e competência incompletos. |
| E061.03 | Solicitar justificativa apenas quando a regra ou o contexto exigirem. | P | Motivo de aumento de limite existe; regras de justificativa incompletas. |
| E061.04 | Mostrar aprovações necessárias e quem receberá a solicitação. | P | Pedido de aprovação existe; cadeia arte/despesa não íntegra. |
| E061.05 | Validar campos, anexos e cotação obrigatórios no servidor. | P | RPC valida decisão; pré-condições de envio completo ainda não garantidas. |
| E061.06 | Reconfirmar versão e validade da proposta no momento do envio. | N | Reconfirmação de versão imutável/validade ao enviar não comprovada. |
| E061.07 | Executar envio idempotente e informar o resultado confirmado. | P | Decisão idempotente; criação integral da solicitação não demonstrada. |
| E061.08 | Gerar protocolo e link para acompanhamento da solicitação. | P | Identificadores e links existem; protocolo institucional ainda parcial. |
| E061.09 | Preservar rascunho e orientar correção quando houver rejeição de validação. | P | Rascunho existe, mas autosave pode falhar silenciosamente. |
| E061.10 | Comprovar envio único com tentativa repetida e sessão recuperada. | N | Reenvio da solicitação completa com sessão recuperada não comprovado. |

**Critério de aceite ainda exigido:** Envio registra contexto, versão, justificativa e destinatário; repetição não cria solicitações duplicadas.

## E062 — Construir a experiência de verba e saldo

**Referências:** [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json), [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E062.01 | Mostrar cooperativa, unidade, centro de custo e competência selecionados. | P | PA e cooperativa presentes; centro de custo e competência incompletos. |
| E062.02 | Separar verba planejada, reservada, comprometida e consumida. | N | Quatro estados financeiros não implementados integralmente. |
| E062.03 | Explicar o saldo disponível em linguagem de decisão de compra. | P | Saldo exibido; composição e erros não explicados de forma consistente. |
| E062.04 | Relacionar movimentos aos pedidos e eventos que os originaram. | P | Eventos de verba locais existem; interface real não conciliada. |
| E062.05 | Permitir consulta de períodos históricos sem alterar saldos anteriores. | P | Períodos parciais; histórico íntegro entre competências não comprovado. |
| E062.06 | Exibir data de atualização e tratar erro de consulta explicitamente. | P | Estatísticas podem converter erro em zero; atualização não uniforme. |
| E062.07 | Sinalizar limite insuficiente antes de encaminhar solicitação incompatível. | P | Transação impede débito sem saldo; orientação antecipada depende de contrato incompleto. |
| E062.08 | Mostrar exceções aprovadas sem ocultar seu efeito sobre o saldo. | P | Aumento de limite existe; efeitos e exceções não reconciliados. |
| E062.09 | Restringir edição e remanejamento aos papéis autorizados. | P | Papéis e RPCs ajudam; todas as alterações diretas ainda não homologadas. |
| E062.10 | Conciliar a interface com lançamentos de exemplo e conferir arredondamentos. | P | Fixture de verba conciliada; interface com lançamentos reais não validada. |

**Critério de aceite ainda exigido:** Saldo, período e movimentos conciliam com o contrato financeiro; nenhum número fixo substitui dados reais.

## E063 — Criar fila de aprovações orientada a decisão

**Referências:** [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E063.01 | Separar pendências de despesa, arte e exceção conforme responsabilidade. | P | Fila financeira existe; arte e exceção não separadas integralmente. |
| E063.02 | Exibir solicitante, unidade, valor, prazo e idade da pendência. | P | Campos básicos presentes; idade/prazo dependem do modelo legado. |
| E063.03 | Oferecer filtros por campanha, cooperativa autorizada e situação. | P | Filtros existem; contexto canônico e campanha ainda incompletos. |
| E063.04 | Ordenar por prazo ou espera com critério explicitado. | P | Ordenação por data existente; significado de prioridade não homologado. |
| E063.05 | Mostrar impedimento ou informação faltante antes de decidir. | P | Dados de pedido exibidos; pré-condições completas não formalizadas. |
| E063.06 | Abrir detalhe preservando posição e filtros da fila. | P | Navegação existe; retorno com posição/filtros não comprovado em sessão real. |
| E063.07 | Indicar solicitação alterada desde a última visualização. | P | Status esperado protege alteração; revisão comercial não indicada integralmente. |
| E063.08 | Evitar seleção em lote para decisões que exigem análise individual distinta. | P | Lote existe; elegibilidade por decisão de negócio ainda não completa. |
| E063.09 | Permitir ação em lote somente com validação individual de autorização e resultado. | L | Serviço valida cada pedido e retorna sucessos/falhas individuais. |
| E063.10 | Validar triagem de uma fila mista e recuperação de item devolvido. | V | Fila mista e devolução precisam de teste com representantes reais. |

**Critério de aceite ainda exigido:** Aprovador identifica pendência, versão e risco de prazo sem abrir várias telas para obter dados básicos.

## E064 — Implementar decisão financeira compreensível

**Referências:** [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json), [src/hooks/useQuoteVersions.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useQuoteVersions.ts), [src/components/quotes/QuoteVersionCompare.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/quotes/QuoteVersionCompare.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E064.01 | Apresentar valor completo, centro de custo e saldo pertinente. | P | Valor e saldo existentes; centro de custo/composição completos ainda ausentes. |
| E064.02 | Exibir comparação comercial e justificativa exigidas pela política. | N | Comparação comercial obrigatória por política não integrada. |
| E064.03 | Mostrar versão da proposta, validade e condições de pagamento. | P | Quote tem validade/versão; decisão Sicoob não vincula tudo imutavelmente. |
| E064.04 | Informar o efeito de aprovar sobre compromisso e saldo. | P | Débito transacional existe; explicação dos quatro estados financeiros incompleta. |
| E064.05 | Disponibilizar aprovação, rejeição e devolução com finalidades distintas. | P | Aprovar/rejeitar existem; devolução distinta não consolidada. |
| E064.06 | Solicitar motivo de rejeição ou exceção quando aplicável. | P | Rejeição exige motivo; exceções ainda não seguem regra versionada. |
| E064.07 | Validar autoridade, impedimento e versão no servidor ao confirmar. | P | RPC valida ator/escopo; impedimento, vínculo ativo e versão ainda parciais. |
| E064.08 | Tratar decisão concorrente com mensagem e atualização do detalhe. | L | Estado esperado e transação tratam concorrência nos casos críticos locais. |
| E064.09 | Registrar resultado confirmado e notificar os responsáveis corretos. | P | Decisão confirmada; notificações sem outbox e destinatários precisam correção. |
| E064.10 | Testar negação por falta de alçada e aprovação idempotente com verba conciliada. | P | Idempotência/alçada locais testadas; política real e interface não homologadas. |

**Critério de aceite ainda exigido:** Aprovador decide a versão apresentada dentro da alçada; resultado e impacto na verba são inequívocos.

## E065 — Implementar aprovação formal da arte

**Referências:** [src/components/mockup/ArtFileUpload.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/mockup/ArtFileUpload.tsx), [src/components/magic-up/MagicUpBrandKitPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/magic-up/MagicUpBrandKitPanel.tsx), [src/components/orders/PilotApprovalPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/orders/PilotApprovalPanel.tsx), [src/hooks/usePilotApprovals.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/usePilotApprovals.ts), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E065.01 | Exibir produto, técnica, posição e dimensão junto à prova. | P | Painel de piloto existe; especificação técnica ligada à versão incompleta. |
| E065.02 | Identificar versão, autor e data do arquivo em revisão. | P | Arquivos têm identificação; autoria e versão imutáveis não garantidas. |
| E065.03 | Permitir inspeção ampliada sem substituir a descrição técnica acessível. | P | Ampliação de mockup existe; descrição técnica acessível não homologada. |
| E065.04 | Separar comentário de pedido formal de revisão. | P | Comentários/status existem; revisão formal distinta incompleta. |
| E065.05 | Mostrar diferenças quando uma nova arte substituir a anterior. | P | Comparação visual existe; vínculo com aprovação formal incompleto. |
| E065.06 | Exigir confirmação da especificação efetivamente aprovada para produção. | N | Confirmação da especificação técnica imutável não implementada integralmente. |
| E065.07 | Validar poder de aprovação de marca no escopo da cooperativa. | N | Competência específica de marca por cooperativa não consolidada no servidor. |
| E065.08 | Registrar aceite ou rejeição com identidade, data e versão. | P | Status de piloto existe; identidade/data/versão não formam prova íntegra. |
| E065.09 | Impedir liberação de produção com arte alterada após o aceite. | N | Trava de produção após alteração de arte não assegurada. |
| E065.10 | Validar revisão, nova prova e aprovação com equipe de marketing e produção. | V | Marketing e produção ainda não homologaram o ciclo de revisão. |

**Critério de aceite ainda exigido:** Aprovação referencia arquivo e especificação exatos; não equivale automaticamente a autorização de despesa.

## E066 — Tratar exceções sem perder governança

**Referências:** [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E066.01 | Classificar exceções de verba, prazo, quantidade e cotação previstas na política. | P | Aumento de limite existe; prazo/quantidade/cotação não cobertos por política versionada. |
| E066.02 | Definir quem pode solicitar e quem pode decidir cada exceção. | P | Papéis aprovam limite; matriz por tipo de exceção incompleta. |
| E066.03 | Exibir a regra original e o motivo da solicitação excepcional. | P | Motivo registrado; regra original e versão não preservadas. |
| E066.04 | Solicitar evidências comerciais necessárias à análise. | P | Anexos genéricos existem; exigências comerciais por exceção não aplicadas. |
| E066.05 | Impedir que o solicitante aprove sua exceção quando houver impedimento. | N | Impedimento de autoaprovação configurável não localizado. |
| E066.06 | Registrar limites e validade da autorização excepcional. | N | Validade e limites por autorização excepcional não consolidados. |
| E066.07 | Recalcular aprovações quando a exceção alterar custo ou condições. | N | Recálculo de cadeia após exceção não implementado integralmente. |
| E066.08 | Mostrar o resultado no histórico sem rotular regra descumprida como normal. | P | Histórico genérico existe; sinalização de exceção incompleta. |
| E066.09 | Preservar controles de segurança independentemente de exceção comercial. | P | Segurança compartilhada existe; todos os atalhos comerciais não homologados. |
| E066.10 | Testar autorização válida, rejeição e tentativa de usar exceção expirada. | N | Exceção expirada e rejeição por política não testadas integralmente. |

**Critério de aceite ainda exigido:** Exceção possui motivo, autoridade, validade e efeito; não contorna isolamento ou proteção de dados.

## E067 — Administrar substituições e delegações temporárias

**Referências:** [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [src/services/sicoob/userService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/userService.ts), [src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E067.01 | Identificar necessidades reais de substituição durante ausências. | V | Necessidades reais de substituição ainda não coletadas. |
| E067.02 | Definir quais competências a política permite delegar. | V | Competências delegáveis dependem da política vigente. |
| E067.03 | Exigir autoridade para conceder a delegação proposta. | N | Concessão formal de delegação não localizada. |
| E067.04 | Registrar substituto, unidade, competência, início e término. | N | Registro de substituto, escopo e validade não localizado. |
| E067.05 | Impedir concessão de poderes superiores aos permitidos ao delegante. | N | Limite de poderes delegados não implementado. |
| E067.06 | Tratar conflitos de interesse e autoaprovação no substituto. | N | Conflito de interesse do substituto não implementado. |
| E067.07 | Mostrar claramente quando uma ação usa poder delegado. | N | Indicação de ação por delegação não localizada. |
| E067.08 | Expirar e revogar delegações sem depender de alteração manual de interface. | N | Expiração/revogação de delegação no servidor não localizada. |
| E067.09 | Registrar ator real e origem da competência na auditoria. | N | Auditoria de origem da competência delegada não localizada. |
| E067.10 | Validar uso permitido, tentativa fora do escopo e expiração durante sessão ativa. | N | Testes de delegação temporária não demonstrados. |

**Critério de aceite ainda exigido:** Substituto só atua nas competências delegadas e dentro da vigência; histórico identifica delegação e ator real.

## E068 — Tornar o histórico de decisões auditável

**Referências:** [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E068.01 | Definir eventos obrigatórios de solicitação, versão, aprovação e estorno. | P | Eventos críticos existem; versão/arte/delegação ainda ausentes. |
| E068.02 | Persistir ator, contexto, data e versão no servidor. | P | RPCs críticas persistem ator/data; outros status auditam no cliente. |
| E068.03 | Registrar a política e eventual delegação usadas na decisão. | N | Política e delegação não associadas às decisões. |
| E068.04 | Associar documentos sem replicar dados pessoais desnecessários no log. | P | Anexos existem; minimização e vínculo histórico precisam revisão. |
| E068.05 | Impedir que compradores alterem ou apaguem decisões históricas. | P | Políticas locais existem; imutabilidade remota não comprovada. |
| E068.06 | Mostrar linha do tempo com termos compreensíveis para a operação. | P | Linha do tempo existe; estados legados não reconciliados. |
| E068.07 | Permitir filtrar histórico por tipo de evento e período autorizado. | P | Filtros de histórico existem; escopo real não homologado. |
| E068.08 | Oferecer exportação restrita com identificador do pedido e origem. | P | Dossiê exportável existe; completude/versão e autorização precisam validação. |
| E068.09 | Tratar falha de auditoria crítica sem concluir ação sem rastro. | P | Status não confirmado tem auditoria posterior com erro ignorável (A12). |
| E068.10 | Reconstruir um pedido de exemplo a partir do histórico e seus documentos. | N | Reconstrução integral de pedido e documentos não demonstrada. |

**Critério de aceite ainda exigido:** É possível reconstruir o que foi decidido, por quem, em qual contexto e com quais documentos.

## E069 — Controlar revisões e cancelamentos

**Referências:** [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json), [src/hooks/useQuoteVersions.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useQuoteVersions.ts), [src/components/quotes/QuoteVersionCompare.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/quotes/QuoteVersionCompare.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E069.01 | Definir alterações permitidas em rascunho, aprovação e produção. | P | Transições definidas; revisões comerciais e produção ainda incompletas. |
| E069.02 | Explicar consequências antes de alterar quantidade, arte ou destino. | P | Confirmações locais existem; efeito sobre arte/destino não explicitado integralmente. |
| E069.03 | Identificar quais aprovações deixam de valer após a alteração. | N | Invalidação de aprovações por revisão não consolidada. |
| E069.04 | Registrar nova versão sem sobrescrever a decisão histórica. | P | Versões existem; A07 permite corrida e estado latest inconsistente. |
| E069.05 | Solicitar confirmação do fornecedor quando houver compromisso já assumido. | N | Aceite do fornecedor para alteração contratada não integrado. |
| E069.06 | Aplicar estorno ou ajuste de verba conforme evento confirmado. | L | Estorno integral local foi simulado com idempotência e trilha. |
| E069.07 | Tratar cancelamento parcial por item ou destino quando operacionalmente possível. | N | Cancelamento por item/destino não implementado integralmente. |
| E069.08 | Mostrar cobrança ou condição pendente apenas com base contratual verificável. | V | Condições contratuais de cobrança precisam de confirmação comercial. |
| E069.09 | Notificar responsáveis afetados pela revisão aprovada. | P | Notificações existentes; confirmação/destinatários não transacionais. |
| E069.10 | Testar cancelamento repetido, mudança concorrente e revisão após início de produção. | P | Repetição de estorno testada; revisão em produção e parcial não demonstradas. |

**Critério de aceite ainda exigido:** Revisão ou cancelamento respeita estágio operacional, recalcula compromissos e preserva aprovações anteriores.

## E070 — Implementar acompanhamento do ciclo do pedido

**Referências:** [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql), [supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E070.01 | Reconciliar estados de requisição, proposta, pedido e entrega no contrato canônico. | P | Estados locais existem; pedidos Sicoob e extensões legadas não reconciliados. |
| E070.02 | Definir transições válidas e responsáveis por executá-las. | P | Máquina de estados existe; responsabilidades operacionais não homologadas. |
| E070.03 | Exibir estado atual sem misturar aprovação comercial e etapa logística. | P | Interface distingue etapas; persistência logística falha por contrato/FK. |
| E070.04 | Mostrar próxima ação e impedimento quando o pedido não puder avançar. | P | Próxima ação aparece; bloqueios reais ainda não tratados integralmente. |
| E070.05 | Associar cada mudança a evento, ator e horário verificáveis. | P | RPC crítica registra eventos; demais mudanças não são atômicas com auditoria. |
| E070.06 | Tratar pedido com itens em estágios diferentes sem simplificação enganosa. | N | Estados por item e destino não consolidados. |
| E070.07 | Bloquear transições inválidas no servidor, inclusive por chamadas diretas. | P | Guards e SQL locais existem; todas as transições remotas não comprovadas. |
| E070.08 | Atualizar a interface após eventos sem perder contexto do usuário. | P | Mutations invalidam consultas; falhas de logística e papel persistem. |
| E070.09 | Registrar notificações derivadas das transições realmente confirmadas. | P | Notificações derivadas no cliente podem falhar silenciosamente. |
| E070.10 | Percorrer o ciclo completo com rejeição, revisão e retomada em homologação. | V | Ciclo real com rejeição/revisão/retomada não homologado. |

**Critério de aceite ainda exigido:** Frontend e backend usam estados compatíveis; uma etapa só avança mediante evento operacional válido.

## E071 — Formalizar a passagem do pedido ao fornecedor

**Referências:** [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/pages/QuoteBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/QuoteBuilderPage.tsx), [src/services/QuoteService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/QuoteService.ts), [src/hooks/quotes/useQuotes.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/quotes/useQuotes.ts), [src/components/mockup/ArtFileUpload.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/mockup/ArtFileUpload.tsx), [src/components/magic-up/MagicUpBrandKitPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/magic-up/MagicUpBrandKitPanel.tsx), [src/components/orders/PilotApprovalPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/orders/PilotApprovalPanel.tsx), [src/hooks/usePilotApprovals.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/usePilotApprovals.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E071.01 | Identificar a entidade fornecedora responsável por cada item contratado. | P | Fornecedores existem no catálogo; responsável contratual por item não consolidado. |
| E071.02 | Reunir versão comercial, arte e especificações aprovadas em um pacote. | P | Dossiê/PDF existem; pacote de versões aprovadas não imutável. |
| E071.03 | Incluir quantidades, embalagem, destinos e datas acordadas. | P | Itens exportáveis existem; distribuição/datas acordadas incompletas. |
| E071.04 | Mostrar condições que ainda impedem iniciar produção. | P | Estados de aprovação existem; pré-requisitos técnicos completos ausentes. |
| E071.05 | Definir canal e formato de recebimento da ordem pelo fornecedor. | V | Canal e formato aceitos pelo fornecedor não homologados. |
| E071.06 | Registrar confirmação de recebimento e aceite das condições. | N | Recebimento e aceite contratual pelo fornecedor não comprovados. |
| E071.07 | Tratar divergência apontada pelo fornecedor antes de produzir. | N | Tratamento formal de divergência pré-produção não integrado. |
| E071.08 | Impedir envio de versão substituída ou ainda não aprovada. | N | Bloqueio de pacote substituído não assegurado. |
| E071.09 | Restringir o acesso do fornecedor aos dados necessários ao fornecimento. | P | Permissões genéricas existem; portal/compartilhamento do fornecedor não homologado. |
| E071.10 | Validar uma ordem de exemplo com produção e logística responsáveis. | V | Ordem de exemplo precisa de aceite de produção e logística. |

**Critério de aceite ainda exigido:** Fornecedor recebe a proposta, arte e distribuição aprovadas; aceite operacional é registrado.

## E072 — Acompanhar produção e controle de qualidade

**Referências:** [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/components/mockup/ArtFileUpload.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/mockup/ArtFileUpload.tsx), [src/components/magic-up/MagicUpBrandKitPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/magic-up/MagicUpBrandKitPanel.tsx), [src/components/orders/PilotApprovalPanel.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/orders/PilotApprovalPanel.tsx), [src/hooks/usePilotApprovals.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/usePilotApprovals.ts), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E072.01 | Definir marcos operacionais que a equipe consegue informar com confiança. | V | Marcos dependem da capacidade real da equipe operacional. |
| E072.02 | Vincular início de produção aos pré-requisitos comerciais e técnicos. | P | Status de produção existe; pré-condições técnicas/comerciais não completas. |
| E072.03 | Registrar confirmação de materiais e configuração de personalização. | N | Confirmação operacional de materiais e técnica não integrada. |
| E072.04 | Definir necessidade de amostra física por técnica ou risco comercial. | V | Critério de amostra física não definido com produção. |
| E072.05 | Relacionar inspeção de qualidade à especificação aprovada. | N | Inspeção ligada à versão aprovada não localizada. |
| E072.06 | Registrar quantidade produzida, rejeitada e pendente quando disponível. | N | Quantidade produzida/rejeitada/pendente por lote não consolidada. |
| E072.07 | Tratar atraso ou retrabalho com impacto explícito sobre a entrega. | P | Status genérico existe; impacto de retrabalho na entrega não calculado. |
| E072.08 | Impedir que uma simulação de mockup seja usada como inspeção física. | P | Mockup existe; fluxo ainda não distingue integralmente inspeção física homologada. |
| E072.09 | Atualizar responsáveis do portal sobre mudanças confirmadas. | P | Notificações genéricas existem; fontes operacionais não confirmadas. |
| E072.10 | Validar rastreabilidade entre arte aprovada, lote produzido e inspeção realizada. | N | Rastreabilidade arte-lote-inspeção não demonstrada. |

**Critério de aceite ainda exigido:** Status e previsão refletem eventos reais; desvio relevante gera comunicação e tratamento definidos.

## E073 — Reconfirmar disponibilidade sem escrever no catálogo

**Referências:** [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs), [src/pages/KitBuilderPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/KitBuilderPage.tsx), [src/hooks/useKitAutoSave.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitAutoSave.ts), [src/hooks/useKitStockValidation.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitStockValidation.ts), [src/lib/kit-builder/types.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/kit-builder/types.ts), [src/components/kit-builder/VariantSelector.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/kit-builder/VariantSelector.tsx), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E073.01 | Definir em qual momento a disponibilidade precisa ser reconfirmada. | P | Plano prevê reconfirmação; momento obrigatório no fluxo não implementado. |
| E073.02 | Registrar produto, variante, quantidade e horário da nova consulta. | P | Consulta de estoque existe; cor e timestamp não preservados corretamente. |
| E073.03 | Separar estoque informado de compromisso assumido pelo fornecedor. | P | Termos comerciais melhorados; reserva versus informação não uniforme. |
| E073.04 | Definir processo operacional autorizado de confirmação fora do catálogo mestre. | V | Processo autorizado do fornecedor não confirmado. |
| E073.05 | Guardar no portal a evidência da confirmação comercial obtida. | N | Evidência de compromisso comercial da oferta não consolidada. |
| E073.06 | Detectar mudança de oferta entre proposta e liberação de produção. | P | Consultas existem; comparação obrigatória entre proposta e produção ausente. |
| E073.07 | Oferecer alternativa sujeita a nova aprovação de preço e arte. | P | Alternativas de produto existem; nova cadeia de arte/preço incompleta. |
| E073.08 | Comunicar indisponibilidade com ação e responsável claros. | P | Alertas de estoque existem; A05/A05b podem indicar disponibilidade indevida. |
| E073.09 | Manter vedada qualquer baixa ou reserva no banco externo por esta integração. | L | Contrato local da ponte veda baixa/reserva no catálogo externo. |
| E073.10 | Simular redução de disponibilidade e comprovar tratamento sem gravação no mestre. | P | Proibição de escrita testada; tratamento operacional da redução ainda incompleto. |

**Critério de aceite ainda exigido:** Consulta não é apresentada como reserva; indisponibilidade resulta em revisão autorizada ou alternativa.

## E074 — Preparar expedição e entregas por destino

**Referências:** [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [supabase/migrations/20260503000002_sicoob_consolidation_logic.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260503000002_sicoob_consolidation_logic.sql), [src/pages/sicoob/GestorConsolidatedOrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/GestorConsolidatedOrdersPage.tsx), [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql), [supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E074.01 | Conferir destinos, responsáveis e restrições de recebimento aprovados. | P | Dados genéricos de endereço existem; distribuição aprovada não completa. |
| E074.02 | Relacionar itens e quantidades a cada expedição planejada. | N | Itens e quantidades por expedição não consolidados. |
| E074.03 | Separar remessas parciais sem perder saldo a expedir. | N | Remessa parcial e saldo a expedir não implementados integralmente. |
| E074.04 | Registrar transportadora ou modalidade de entrega confirmada. | P | Transportadora/código existem; persistência usa FK do modelo legado. |
| E074.05 | Validar endereço e contato operacional antes da emissão dos documentos. | P | Cadastros permitem endereço; validação pré-expedição não demonstrada. |
| E074.06 | Associar volumes, etiquetas e documentos necessários à remessa. | P | Anexos genéricos existem; volumes/etiquetas por remessa não integrados. |
| E074.07 | Registrar data de saída e previsão efetiva informada pelo operador. | P | Datas existem; origem efetiva e update de status falham em A01/A02. |
| E074.08 | Restringir alteração de destino após expedição conforme processo contratado. | N | Restrição de mudança de destino após expedição não consolidada. |
| E074.09 | Tratar erro de endereço com responsável e histórico de correção. | N | Correção de endereço com processo operacional não integrada. |
| E074.10 | Conferir expedição de exemplo com múltiplos PAs e remessa parcial. | V | Ensaio com múltiplos PAs e parcial não realizado. |

**Critério de aceite ainda exigido:** Quantidades expedidas e documentos correspondem ao pedido; expedição parcial mantém saldo rastreável.

## E075 — Oferecer rastreio e previsão confiáveis

**Referências:** [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E075.01 | Apresentar cada destino com itens, quantidade e situação da entrega. | N | Entrega por destino com itens/quantidade não implementada integralmente. |
| E075.02 | Vincular código de rastreio e fonte de informação da transportadora. | P | Código e transportadora manuais existem; vínculo canônico falha em A02. |
| E075.03 | Mostrar data e horário da última atualização recebida. | P | Campos de data genéricos existem; atualização da fonte não explicitada. |
| E075.04 | Distinguir previsão da transportadora de data necessária para o evento. | P | Previsão genérica existe; necessidade do evento não integrada. |
| E075.05 | Registrar eventos de tentativa, atraso e problema de endereço. | N | Eventos de tentativa/atraso/endereço por remessa não consolidados. |
| E075.06 | Evitar inferir entrega apenas pela passagem do prazo estimado. | P | Entrega usa ação manual, mas foto pode concluir sem conferir quantidades. |
| E075.07 | Oferecer acompanhamento alternativo quando a integração estiver indisponível. | P | Entrada manual existe; processo alternativo com responsável não homologado. |
| E075.08 | Notificar somente alterações relevantes aos destinatários autorizados. | P | Notificações genéricas existem; relevância e destinatários precisam revisão. |
| E075.09 | Manter pedido parcialmente entregue enquanto houver destinos pendentes. | N | Estado parcialmente entregue por destino não consolidado. |
| E075.10 | Validar rastreio normal, atualização atrasada e transportadora sem integração. | V | Cenários com transportadora real e atualização atrasada não validados. |

**Critério de aceite ainda exigido:** Dados de rastreio têm origem e atualização identificadas; entrega atrasada não aparece como concluída.

## E076 — Registrar recebimento e conferência

**Referências:** [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql), [supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E076.01 | Definir quem pode confirmar recebimento em cada destino. | P | Permissão genérica existe; autoridade de recebimento por destino não definida. |
| E076.02 | Apresentar itens e quantidades esperados na remessa. | P | Pedido lista itens; remessa por destino não consolidada. |
| E076.03 | Permitir informar quantidade recebida e quantidade pendente. | N | Quantidades recebidas/pendentes por remessa não implementadas. |
| E076.04 | Registrar data, responsável e documento de comprovação aplicável. | P | Upload de foto existe; conclusão pode falhar apesar do toast positivo. |
| E076.05 | Separar recebimento físico de aceite de qualidade quando necessário. | N | Aceite físico e qualidade não separados no fluxo. |
| E076.06 | Permitir evidência de avaria ou diferença sem expor dados desnecessários. | P | Upload genérico existe; evidência proporcional/privada não homologada. |
| E076.07 | Tratar remessa não reconhecida ou destinatário incorreto. | N | Tratamento de remessa desconhecida ou destinatário errado não integrado. |
| E076.08 | Atualizar saldos entregues sem duplicar conferência reenviada. | N | Conferência idempotente por quantidade/destino não demonstrada. |
| E076.09 | Manter pendências visíveis até sua resolução operacional. | P | Status geral existe; conclusão por foto pode ocultar pendências. |
| E076.10 | Validar recebimento completo, parcial e confirmação repetida no mesmo destino. | N | Recebimento completo/parcial/repetido por destino não validado. |

**Critério de aceite ainda exigido:** Conferência registra o que realmente chegou; confirmação indevida não encerra saldo pendente.

## E077 — Resolver faltas, avarias e devoluções

**Referências:** [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E077.01 | Definir categorias de ocorrência compreensíveis para o recebedor. | N | Categorias operacionais de ocorrência não localizadas na jornada. |
| E077.02 | Vincular reclamação ao item, quantidade e destino afetados. | N | Reclamação por item/quantidade/destino não consolidada. |
| E077.03 | Solicitar descrição e evidência proporcionais ao problema informado. | P | Upload genérico existe; formulário de ocorrência proporcional não integrado. |
| E077.04 | Gerar protocolo sem obrigar o comprador a repetir dados do pedido. | N | Protocolo de ocorrência com contexto herdado não localizado. |
| E077.05 | Definir responsável e prazo de retorno conforme o atendimento contratado. | V | Responsável e prazo de retorno precisam de acordo operacional. |
| E077.06 | Registrar investigação, comunicação e proposta de solução. | N | Investigação e solução rastreáveis por ocorrência não localizadas. |
| E077.07 | Tratar reposição, coleta, crédito ou ajuste conforme autorização comercial. | N | Reposição/coleta/crédito por autorização não integrados. |
| E077.08 | Atualizar pedido e verba apenas quando o evento correspondente for confirmado. | P | Estorno de cancelamento existe; eventos de ocorrência não ligados à verba. |
| E077.09 | Permitir discordância ou reabertura justificada da solução proposta. | N | Discordância e reabertura de ocorrência não localizadas. |
| E077.10 | Validar uma avaria e uma falta parcial até sua resolução documentada. | N | Avaria e falta parcial não percorridas até resolução. |

**Critério de aceite ainda exigido:** Comprador acompanha a resolução; ocorrência só encerra quando a solução acordada está registrada.

## E078 — Conciliar documentos financeiros e entrega

**Referências:** [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [src/hooks/orders/useOrders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/orders/useOrders.ts), [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql), [supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql), [src/contexts/OrganizationContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx), [src/components/sicoob/orders/OrderLogisticsTab.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E078.01 | Definir documentos exigidos pela condição comercial de cada cooperativa. | V | Documentos exigidos dependem da condição comercial da cooperativa. |
| E078.02 | Relacionar nota fiscal, fornecedor, pedido e remessa correspondentes. | P | Notas/pagamentos legados existem; FK aponta orders, não sicoob_orders. |
| E078.03 | Conferir quantidades, valores e dados de faturamento aprovados. | P | Totais de documentos existem; conciliação por item/remessa não demonstrada. |
| E078.04 | Separar condição de pagamento de situação efetiva de liquidação. | P | Pagamento tem estado próprio no legado; integração Sicoob não validada. |
| E078.05 | Registrar recebimento parcial sem pressupor quitação integral. | N | Recebimento parcial versus quitação não reconciliados. |
| E078.06 | Identificar divergências entre proposta, entrega e documento financeiro. | N | Conciliação tripla proposta/entrega/documento não implementada integralmente. |
| E078.07 | Encaminhar correção ao responsável mantendo os documentos anteriores rastreáveis. | P | Uploads existem; correção rastreável com documentos anteriores não demonstrada. |
| E078.08 | Restringir acesso a anexos e informações financeiras por permissão. | P | RLS local foi endurecida; acesso remoto entre organizações não testado. |
| E078.09 | Definir exportação ou processo manual até haver integração homologada. | P | Exportações legadas existem; processo manual homologado não definido. |
| E078.10 | Conciliar um pedido completo e um pedido com ajuste documentado. | V | Pedido completo e ajuste precisam de conciliação com financeiro. |

**Critério de aceite ainda exigido:** Valores e documentos têm vínculo verificável; divergência impede encerramento financeiro indevido.

## E079 — Facilitar recompra com revalidação

**Referências:** [src/components/orders/OneClickReorder.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/orders/OneClickReorder.tsx), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts), [src/services/OrderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/types/sicoob/orders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/types/sicoob/orders.ts), [src/hooks/orders/useOrders.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/orders/useOrders.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E079.01 | Permitir iniciar nova solicitação a partir de pedido anterior autorizado. | P | Botão existe, mas usa serviço legado e destino inexistente (A03). |
| E079.02 | Copiar configuração e referências sem alterar o registro histórico. | P | Serviços copiam itens; versões de arte e histórico completo não assegurados. |
| E079.03 | Verificar existência e situação atual de produtos e variantes. | N | Revalidação obrigatória de produto/variante ativa ausente na duplicação revisada. |
| E079.04 | Reconsultar preço de origem e condições comerciais vigentes. | N | Preços antigos copiados sem nova consulta obrigatória. |
| E079.05 | Reconfirmar mínimo, múltiplo e disponibilidade da quantidade pretendida. | N | Mínimo/múltiplo/estoque não reconfirmados na duplicação. |
| E079.06 | Indicar arte antiga que depende de nova validação de marca. | N | Arte antiga não exige nova validação formal de marca. |
| E079.07 | Solicitar confirmação de destinos, campanha e período de verba. | P | Rascunho pode ser criado; destinos/campanha/competência não revalidados. |
| E079.08 | Destacar diferenças em relação à compra anterior. | N | Diferenças comerciais com a compra original não demonstradas. |
| E079.09 | Encaminhar a nova versão ao fluxo normal de aprovação. | P | Há criação de quote alternativa no serviço Sicoob; botão usa caminho legado. |
| E079.10 | Validar recompra com produto inativo, preço alterado e endereço diferente. | N | Cenários de inativo/preço/endereço não comprovados. |

**Critério de aceite ainda exigido:** Histórico acelera a seleção, mas preço, disponibilidade, arte e prazo são verificados novamente.

## E080 — Oferecer ajuda contextual e atendimento

**Referências:** [src/components/ai/AIChat.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ai/AIChat.tsx), [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E080.01 | Mapear dúvidas recorrentes observadas na pesquisa e no teste das jornadas. | P | Dúvidas inferidas de pesquisa documental; não observadas em sessões. |
| E080.02 | Escrever respostas curtas sobre quantidade, arte, verba e entrega. | P | Ajuda genérica existe; respostas comerciais vigentes não homologadas. |
| E080.03 | Disponibilizar ajuda junto ao campo ou decisão que gera a dúvida. | P | Tooltips e ajuda contextual existentes; cobertura da compra ainda parcial. |
| E080.04 | Criar páginas de apoio acessíveis e pesquisáveis. | P | Páginas de apoio existem; busca e acessibilidade real não integralmente validadas. |
| E080.05 | Oferecer atendimento humano com horário e expectativa de retorno reais. | V | Atendimento humano, horário e retorno não confirmados. |
| E080.06 | Transmitir contexto permitido do pedido sem incluir segredos ou excesso de dados. | P | Links contextuais existem; minimização no suporte não comprovada. |
| E080.07 | Permitir acompanhar solicitações de suporte pelo protocolo. | N | Protocolo de suporte acompanhável não consolidado no módulo. |
| E080.08 | Separar recomendação automática de informação confirmada pela operação. | P | Sugestões automáticas ainda usam probabilidades fixas em pedidos. |
| E080.09 | Revisar conteúdo quando políticas ou condições de fornecimento mudarem. | V | Revisão de conteúdo depende de responsáveis e políticas vigentes. |
| E080.10 | Testar obtenção de ajuda e continuidade da compra após uma dúvida resolvida. | V | Tarefa de obter ajuda e retomar compra não observada. |

**Critério de aceite ainda exigido:** Usuário encontra orientação e atendimento no contexto correto, com retorno rastreável.

## E081 — Auditar acessibilidade da jornada completa

**Referências:** [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E081.01 | Definir escopo de páginas, componentes e critérios WCAG aplicáveis. | P | Escopo automatizado cobre demo/login, não toda a jornada WCAG. |
| E081.02 | Verificar estrutura semântica, títulos, regiões e nomes acessíveis. | P | Semântica local verificada; páginas financeiras/logísticas não cobertas integralmente. |
| E081.03 | Percorrer compra, aprovação e recebimento inteiramente por teclado. | N | Compra/aprovação/recebimento completos por teclado não demonstrados. |
| E081.04 | Conferir foco visível e ausência de encobrimento por elementos fixos. | P | Foco local revisado; overlays e cabeçalhos reais não integralmente validados. |
| E081.05 | Validar contraste de texto, estados e informação essencial dos controles. | P | Axe local sem violações; paleta operacional inteira não homologada. |
| E081.06 | Testar rótulos, instruções, erros e mensagens dinâmicas com leitor de tela. | N | Leitor de tela em formulários e mensagens dinâmicas não testado integralmente. |
| E081.07 | Verificar alvos de interação e alternativas a arrastar elementos. | P | Alvos locais revistos; drag alternativo na jornada completa não comprovado. |
| E081.08 | Testar ampliação, espaçamento de texto e redistribuição do conteúdo. | N | Zoom/espaçamento/reflow manual da compra inteira não registrado. |
| E081.09 | Corrigir achados e repetir os cenários que apresentaram falha. | P | Correções locais revalidadas; achados da revisão ainda abertos. |
| E081.10 | Publicar matriz de critérios, ambientes testados e limitações remanescentes. | P | Resultados e limites publicados; matriz normativa completa ainda ausente. |

**Critério de aceite ainda exigido:** Critérios aplicáveis são verificados por automação e avaliação manual; falhas impeditivas estão resolvidas.

## E082 — Validar uso móvel em situações reais

**Referências:** [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E082.01 | Selecionar aparelhos e navegadores usados pelos participantes do piloto. | V | Aparelhos reais do público piloto ainda não selecionados. |
| E082.02 | Testar entrada, busca e seleção com teclado virtual aberto. | P | Emulação móvel existe; teclado virtual em aparelho real não testado. |
| E082.03 | Verificar campos numéricos, datas e endereços no dispositivo móvel. | N | Datas/endereços da compra em dispositivo real não validados. |
| E082.04 | Conferir área de toque e separação entre ações adjacentes. | P | Alvos conferidos em capturas; precisão de toque real não comprovada. |
| E082.05 | Testar leitura de proposta e arte sem perder acesso aos comandos. | P | Comparação móvel existe; proposta e arte reais ainda não homologadas. |
| E082.06 | Validar envio de foto de ocorrência com tamanho e orientação variados. | N | Fotos com orientação/tamanho variados no recebimento real não testadas. |
| E082.07 | Simular interrupção por ligação, bloqueio de tela e retorno ao navegador. | N | Interrupção por chamada/bloqueio de tela não ensaiada. |
| E082.08 | Verificar conexões lentas e retomada de tarefas interrompidas. | P | Rede simulada no login; retomada móvel da compra não demonstrada. |
| E082.09 | Corrigir problemas que impeçam concluir tarefas prioritárias no aparelho. | P | Ajustes responsivos aplicados; não comprovam conclusão em aparelho real. |
| E082.10 | Registrar modelos, versões e resultados observados com suas limitações. | P | Viewports registrados; modelos e versões de dispositivos reais ausentes. |

**Critério de aceite ainda exigido:** Solicitar, aprovar e receber são possíveis sem gestos exclusivos ou conteúdo essencial oculto.

## E083 — Testar responsividade e conteúdo extremo

**Referências:** [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [src/index.css](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/index.css), [tailwind.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tailwind.config.ts), [docs/ACCESSIBILITY.md](../../../docs/ACCESSIBILITY.md), [src/components/ui/button.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/button.tsx), [src/components/ui/dialog.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ui/dialog.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E083.01 | Preparar nomes extensos de produtos, cooperativas e centros de custo. | P | Dados demonstrativos existentes; matriz de nomes extremos incompleta. |
| E083.02 | Testar valores altos, quantidades grandes e textos de justificativa longos. | N | Valores altos e justificativas extensas não validados na jornada completa. |
| E083.03 | Validar endereços com complementos extensos e destinos múltiplos. | N | Endereços extensos com distribuição múltipla não demonstrados. |
| E083.04 | Verificar ausência, quebra e substituição de imagens e fontes. | P | Fallbacks existem; falha de mídia/fonte não coberta integralmente. |
| E083.05 | Conferir larguras pequenas, intermediárias e amplas definidas no layout. | L | Nove capturas cobrem login, loja e painel em 320, 390 e 1440px. |
| E083.06 | Testar orientação paisagem e janelas redimensionadas durante a tarefa. | N | Paisagem e redimensionamento durante tarefa não comprovados. |
| E083.07 | Restringir rolagem horizontal aos componentes que realmente a exigem. | P | Sem overflow nas amostras; páginas operacionais inteiras não cobertas. |
| E083.08 | Garantir acesso ao conteúdo completo quando houver truncamento visual. | P | Tooltips/detalhes existentes; todo conteúdo truncado não verificado. |
| E083.09 | Comparar telas implementadas com a especificação aprovada usando dados reais permitidos. | V | Especificação aprovada e dados reais permitidos ainda pendentes. |
| E083.10 | Resolver regressões visuais críticas e registrar a matriz validada. | P | Regressões locais corrigidas; matriz visual do portal inteiro incompleta. |

**Critério de aceite ainda exigido:** Conteúdo continua compreensível sem cortes indevidos, sobreposição ou perda de ações importantes.

## E084 — Otimizar desempenho percebido e carregamento

**Referências:** [.lighthouserc.cjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.lighthouserc.cjs), [scripts/qa/check-bundle-budget.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/scripts/qa/check-bundle-budget.mjs), [docs/execucao/evidencias/lighthouse-login.json](../../../docs/execucao/evidencias/lighthouse-login.json), [docs/execucao/revisao-implementacao/ci.json](../../../docs/execucao/revisao-implementacao/ci.json), [docs/execucao/revisao-implementacao/resumo-codeql.json](../../../docs/execucao/revisao-implementacao/resumo-codeql.json), [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E084.01 | Medir carregamento, interação e estabilidade nas páginas prioritárias. | P | Login medido em laboratório; compra/aprovação ainda sem métricas equivalentes. |
| E084.02 | Definir orçamento de JavaScript e imagens com base na conexão do piloto. | P | Limite de bundle definido; conexão/aparelho do piloto não observados. |
| E084.03 | Separar recursos administrativos e pesados das rotas do comprador. | L | Divisão por rota reduz bundle administrativo e foi validada no build. |
| E084.04 | Carregar PDF, voz e recursos opcionais somente quando necessários. | P | Módulos opcionais lazy; dois chunks permanecem acima de 500KB brutos. |
| E084.05 | Dimensionar imagens e reservar seu espaço para evitar deslocamentos. | P | Imagens dimensionadas e CLS zero no login; catálogo real não medido integralmente. |
| E084.06 | Reduzir consultas repetidas respeitando escopo, validade e atualização dos dados. | P | Cache existe; escopo por contexto e erro/atualização ainda têm lacunas. |
| E084.07 | Eliminar trabalho síncrono que atrase interação de busca e formulário. | P | Busca e listagem melhoradas; interação real em aparelho modesto não medida. |
| E084.08 | Adotar como referência de campo LCP até 2,5 segundos, INP até 200 ms e CLS até 0,1 no percentil 75. | P | Referências de campo definidas; não há amostra INP/p75 em produção. |
| E084.09 | Medir laboratório com cenário documentado e preparar coleta de campo após lançamento. | P | Laboratório registrado; coleta de campo ainda não opera com tráfego real. |
| E084.10 | Repetir medições após otimização e registrar orçamento atendido e limitações de amostra. | L | Medições locais repetidas e limitações de amostra registradas. |

**Critério de aceite ainda exigido:** Jornadas atendem o orçamento definido em homologação; métricas de campo permanecem separadas das medições de laboratório.

## E085 — Validar resiliência e preservação do trabalho

**Referências:** [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx), [src/components/layout/ProtectedRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/ProtectedRoute.tsx), [src/components/layout/SicoobRoute.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/layout/SicoobRoute.tsx), [src/lib/auth/invoke-full-scope.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/lib/auth/invoke-full-scope.ts), [src/components/catalog/CatalogStorefrontHero.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogStorefrontHero.tsx), [src/components/catalog/CatalogContent.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/catalog/CatalogContent.tsx), [supabase/functions/external-db-bridge/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts), [supabase/functions/_shared/catalog-redaction.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/_shared/external-db-config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts), [tests/scenarios/catalogo-somente-leitura.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/scenarios/catalogo-somente-leitura.mjs)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E085.01 | Simular catálogo fora do ar durante busca e montagem de proposta. | P | Ponte simulada com erro; proposta inteira offline não percorrida. |
| E085.02 | Testar expiração de cache sem exibir disponibilidade antiga como confirmada. | P | Cache existe; A05b oculta indisponibilidade como ausência de alerta. |
| E085.03 | Interromper conexão antes e depois do envio de uma solicitação. | N | Interrupção antes/depois de envio integral não demonstrada. |
| E085.04 | Verificar repetição controlada de chamadas idempotentes. | L | Repetição de operações financeiras críticas coberta no PostgreSQL local. |
| E085.05 | Simular sessão expirada durante preenchimento e decisão. | P | Guards tratam sessão; preservação completa de rascunho não homologada. |
| E085.06 | Testar conflito de versão com dois usuários atuando no mesmo pedido. | P | Concorrência de status/verba testada; versão comercial tem A07. |
| E085.07 | Validar retomada após atualização da aplicação e falha de carregamento de rota. | P | Lazy retry existe; retomada de rascunho após release não comprovada. |
| E085.08 | Impedir aprovação financeira offline ou sem resposta confirmada do servidor. | P | RPC depende do servidor; todas as mensagens/ações offline não validadas. |
| E085.09 | Garantir mensagem com próxima ação segura em cada falha observada. | P | Erros locais melhorados; A01/A04/A05b ainda confundem o resultado. |
| E085.10 | Registrar recuperação e conciliação dos dados após os cenários de interrupção. | P | Conciliação transacional local existe; recuperação integral de compra não demonstrada. |

**Critério de aceite ainda exigido:** Indisponibilidade e reenvio não perdem rascunhos nem duplicam compromissos de compra.

## E086 — Verificar segurança das jornadas integradas

**Referências:** [supabase/functions/_shared/edge-authz-manifest.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/edge-authz-manifest.ts), [supabase/functions/migrate-helper/index.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/migrate-helper/index.ts), [tests/security/edge-authz-bypass.test.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/tests/security/edge-authz-bypass.test.ts), [docs/SECURITY.md](../../../docs/SECURITY.md), [src/services/sicoob/approvalService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [scripts/revisao/simular-lacunas.mjs](../../../scripts/revisao/simular-lacunas.mjs), [docs/execucao/revisao-implementacao/simulacoes.json](../../../docs/execucao/revisao-implementacao/simulacoes.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E086.01 | Definir matriz de ataque com duas cooperativas e múltiplos papéis. | P | Matriz local de papéis e fixtures existe; duas contas reais não disponíveis. |
| E086.02 | Testar leitura e alteração direta de IDs fora do escopo autorizado. | P | RPCs críticas testadas; tabelas/anexos via API real não homologados. |
| E086.03 | Tentar aprovar pedido com ator ou vínculo adulterado. | L | Ator forjado e relacionamento cruzado negados nas simulações críticas. |
| E086.04 | Verificar reaproveitamento de token expirado ou link revogado. | P | Expiração/revogação têm código; E2E público remoto falha. |
| E086.05 | Validar acesso a arte, nota fiscal e comprovante de outra organização. | V | RLS de artes/notas/comprovantes exige contas reais segregadas. |
| E086.06 | Inspecionar exposição de custos internos, segredos e diagnósticos no navegador. | P | A10 preserva custo interno; CodeQL possui 26 alertas ainda em triagem. |
| E086.07 | Testar concessão indevida de papel e delegação fora da competência. | N | Delegação e concessão de convite fora da competência não cobertas integralmente. |
| E086.08 | Verificar proteção contra repetição e corrida nas decisões financeiras. | L | Corridas de aprovação e estorno foram simuladas em banco descartável. |
| E086.09 | Corrigir falhas e repetir os casos negativos que as demonstraram. | P | Falhas anteriores corrigidas; achados desta revisão ainda não resolvidos. |
| E086.10 | Publicar evidências revisadas sem divulgar segredos ou instruções operacionais de exploração. | P | Evidências locais publicadas sem segredos; revisão operacional externa pendente. |

**Critério de aceite ainda exigido:** Tentativas de acesso cruzado, alteração de ator ou manipulação de versão são negadas no servidor.

## E087 — Validar privacidade e ciclo de vida dos dados

**Referências:** [docs/SECURITY.md](../../../docs/SECURITY.md), [src/contexts/AuthContext.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx), [src/hooks/useSearch.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSearch.ts), [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E087.01 | Inventariar dados pessoais realmente tratados nas jornadas propostas. | P | Dados e riscos principais descritos; inventário de tratamento completo ausente. |
| E087.02 | Relacionar cada dado à finalidade operacional e ao responsável pelo tratamento. | P | Finalidades propostas; responsáveis formais não designados. |
| E087.03 | Revisar necessidade de contatos pessoais e dados de destinatários individuais. | P | Minimização indicada; contatos reais e distribuição não validados. |
| E087.04 | Evitar importar cadastro de cooperados sem finalidade e escopo aprovados. | L | Esta execução não importou cadastro de cooperados nem gravou no catálogo mestre. |
| E087.05 | Definir acesso a documentos e logs conforme a necessidade de trabalho. | P | Permissões locais existem; anexos e logs remotos não homologados. |
| E087.06 | Validar com o responsável competente bases, avisos e procedimentos aplicáveis. | V | Bases/avisos/procedimentos exigem responsável competente. |
| E087.07 | Estabelecer retenção e exclusão compatíveis com documentos e obrigações reais. | V | Retenção e exclusão dependem de obrigações e documentos reais. |
| E087.08 | Minimizar dados coletados por métricas, suporte e ferramentas externas. | P | Noindex e redação ajudam; histórico global e telemetria requerem revisão. |
| E087.09 | Ensaiar atendimento de solicitação e revogação de acesso em ambiente segregado. | N | Atendimento de solicitação e revogação não ensaiados integralmente. |
| E087.10 | Registrar aprovação das práticas e incorporar apenas avisos úteis ao usuário. | V | Aprovação das práticas e responsáveis não registrada. |

**Critério de aceite ainda exigido:** Coleta, acesso, retenção e atendimento de solicitações possuem finalidade e responsabilidade definidas.

## E088 — Conduzir testes de usabilidade com tarefas completas

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E088.01 | Preparar tarefas realistas de campanha, cotação, aprovação e recebimento. | P | Tarefas propostas; não aplicadas em sessões completas. |
| E088.02 | Selecionar participantes dos papéis prioritários com consentimento adequado. | V | Participantes e consentimento ainda não obtidos. |
| E088.03 | Definir sucesso da tarefa, erros e necessidade de ajuda antes das sessões. | P | Critérios previstos; roteiro operacional de sessão ainda não validado. |
| E088.04 | Observar execução sem ensinar a sequência de ações desejada. | N | Sessões observadas sem orientação não realizadas. |
| E088.05 | Registrar dúvidas de custo, prazo, política e versão de arte. | N | Dúvidas observadas de custo/prazo/arte ainda não coletadas. |
| E088.06 | Incluir cenário de devolução, saldo insuficiente e entrega parcial. | P | Cenários previstos; devolução e parcial não exercitados com usuários. |
| E088.07 | Comparar problemas por severidade sem generalizar percentuais da amostra pequena. | N | Sem amostra observada para comparar severidades de usabilidade. |
| E088.08 | Priorizar correções que diminuem risco de compra errada ou retrabalho. | P | Esta revisão prioriza risco técnico; falta confrontar comportamento dos compradores. |
| E088.09 | Testar novamente os fluxos modificados com evidência de resultado. | N | Reteste com participantes dos fluxos modificados não realizado. |
| E088.10 | Publicar aprendizados e decisões de design rastreáveis às observações. | P | Decisões documentadas são técnicas/documentais, não evidência de observação. |

**Critério de aceite ainda exigido:** Problemas que impedem concluir tarefas críticas estão resolvidos e reavaliados com participantes adequados.

## E089 — Construir indicadores operacionais verdadeiros

**Referências:** [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts), [src/hooks/useNotifications.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useNotifications.ts), [src/hooks/useNotificationOmnichannel.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useNotificationOmnichannel.ts), [src/services/sicoob/orderService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E089.01 | Implementar eventos e agregações previstos no dicionário de indicadores. | P | Agregações genéricas existem; dicionário da jornada não implementado integralmente. |
| E089.02 | Restringir métricas ao escopo de cada cooperativa e papel. | P | Filtros de papel existem; contexto e RLS reais não homologados. |
| E089.03 | Mostrar período, atualização e tamanho da amostra relevante. | P | Período parcial; atualização e tamanho da amostra não consistentes. |
| E089.04 | Separar tempo em espera de tempo efetivo de processamento. | N | Espera versus processamento não medidos separadamente. |
| E089.05 | Medir devoluções de arte e despesa por motivos registrados. | N | Devoluções de arte e despesa por motivo não medidas integralmente. |
| E089.06 | Comparar entrega contratada e recebida por destino. | N | Entrega contratada/recebida por destino não reconciliada. |
| E089.07 | Identificar pendências sem atribuir causalidade não demonstrada. | P | Painéis existentes; probabilidades fixas sugerem informação sem base. |
| E089.08 | Remover probabilidades fixas e percentuais de fallback do painel. | P | A06 confirma percentuais fixos, meta fixa e contador aleatório ainda presentes. |
| E089.09 | Conciliar indicadores com uma seleção rastreável de pedidos. | N | Indicadores não conciliados com amostra rastreável de pedidos reais. |
| E089.10 | Validar interpretação do painel com compras, marketing e operação. | V | Interpretação conjunta por compras/marketing/operação não validada. |

**Critério de aceite ainda exigido:** Indicadores reconciliam com eventos e amostra de pedidos; dados insuficientes aparecem como não medidos.

## E090 — Concluir homologação funcional e de conteúdo

**Referências:** [scripts/check-eslint-baseline.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/scripts/check-eslint-baseline.mjs), [scripts/check-typecheck-baseline.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/scripts/check-typecheck-baseline.mjs), [docs/execucao/evidencias/gates-depois.tap](../../../docs/execucao/evidencias/gates-depois.tap), [docs/execucao/evidencias/cenarios-integrados.tap](../../../docs/execucao/evidencias/cenarios-integrados.tap), [docs/execucao/revisao-implementacao/ci.json](../../../docs/execucao/revisao-implementacao/ci.json), [docs/execucao/revisao-implementacao/resumo-codeql.json](../../../docs/execucao/revisao-implementacao/resumo-codeql.json), [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml), [docs/execucao/revisao-implementacao/anotacoes.txt](../../../docs/execucao/revisao-implementacao/anotacoes.txt), [docs/execucao/revisao-implementacao/achados.json](../../../docs/execucao/revisao-implementacao/achados.json)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E090.01 | Consolidar cenários de negócio, permissão, falha e concorrência do piloto. | L | Cenários e lacunas consolidados com referências e condições de fechamento. |
| E090.02 | Verificar formatos pt-BR de data, moeda, quantidade e documentos. | P | Formatadores pt-BR existem; campanha contém colisão de nome na exportação (A11). |
| E090.03 | Conferir consistência entre textos, estados da API e transações reais. | P | A01/A02 mostram divergência entre mensagem, contrato e persistência. |
| E090.04 | Validar exportações de proposta e relatórios com versões corretas. | P | Exportações existem; A07/A11 impedem assegurar versão e funcionamento completos. |
| E090.05 | Executar a suíte pertinente sem considerar testes pulados como aprovados. | P | Testes dirigidos passam; 33 ignorados e regressão E2E falha não contam como aprovação. |
| E090.06 | Revisar acessibilidade dos fluxos alterados após as últimas correções. | P | Amostras locais acessíveis; fluxos financeiros/logísticos não revalidados integralmente. |
| E090.07 | Conferir desempenho e preservação do trabalho no build candidato. | P | Build/login medidos; autosave e jornadas internas permanecem incompletos. |
| E090.08 | Registrar defeitos por severidade, responsável e condição de liberação. | P | Severidades e responsáveis funcionais definidos; nomes não atribuídos. |
| E090.09 | Corrigir e revalidar os defeitos que bloqueiam a compra segura. | P | Correções anteriores validadas; bloqueadores desta revisão permanecem abertos. |
| E090.10 | Emitir relatório de homologação com ambiente, commit e evidências verificáveis. | P | Relatório desta revisão identifica commit/limites; não é homologação aprovada. |

**Critério de aceite ainda exigido:** Cenários críticos passam; conteúdo, formatos e estados refletem regras e dados do ambiente testado.

## E091 — Ensaiar a compra integral antes do piloto

**Referências:** [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md), [src/services/sicoob/budgetService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/budgetService.ts), [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql), [docs/execucao/evidencias/verba-atomica.json](../../../docs/execucao/evidencias/verba-atomica.json), [supabase/migrations/20260503000002_sicoob_consolidation_logic.sql](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260503000002_sicoob_consolidation_logic.sql), [src/pages/sicoob/GestorConsolidatedOrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/GestorConsolidatedOrdersPage.tsx)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E091.01 | Preparar campanha de teste com produtos reais consultados e dados segregados. | V | Campanha segregada com dados reais do piloto não preparada. |
| E091.02 | Montar proposta com personalização e distribuição por três destinos. | N | Proposta integrada com três destinos não ensaiada. |
| E091.03 | Executar comparação comercial conforme a política escolhida. | V | Política comercial vigente não selecionada/validada. |
| E091.04 | Solicitar revisão de arte e aprovar a versão corrigida. | N | Revisão e aprovação formal de arte imutável não ensaiadas. |
| E091.05 | Autorizar despesa dentro da alçada e conferir compromisso de verba. | P | Alçada/verba simuladas isoladamente; não numa compra completa. |
| E091.06 | Reconfirmar oferta e formalizar a passagem para o fornecedor de teste. | N | Reconfirmação e passagem ao fornecedor de teste não realizadas. |
| E091.07 | Simular produção, expedição e recebimento parcial com responsáveis definidos. | N | Produção/expedição/parcial com responsáveis não ensaiadas. |
| E091.08 | Resolver uma divergência e conciliar os documentos correspondentes. | N | Divergência e conciliação completa não percorridas. |
| E091.09 | Reconstruir a jornada pelo histórico sem depender de explicação do desenvolvedor. | N | Histórico não reconstrói ensaio integral inexistente. |
| E091.10 | Obter aceite funcional dos representantes das áreas envolvidas no ensaio. | V | Aceite dos representantes ainda não obtido. |

**Critério de aceite ainda exigido:** Uma compra atravessa todas as áreas e concilia valores e quantidades, sem intervenção técnica oculta.

## E092 — Revisar a experiência final e a aplicação da marca

**Referências:** [docs/execucao/evidencias/visual/demo-resultado.json](../../../docs/execucao/evidencias/visual/demo-resultado.json), [docs/execucao/evidencias/visual/resultado.json](../../../docs/execucao/evidencias/visual/resultado.json), [docs/execucao/evidencias/visual/login-390.png](../../../docs/execucao/evidencias/visual/login-390.png), [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [src/pages/auth/AuthBranding.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/auth/AuthBranding.tsx), [docs/execucao/ativos-imagegen.json](../../../docs/execucao/ativos-imagegen.json), [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E092.01 | Comparar telas implementadas com os padrões visuais aprovados. | P | Capturas comparáveis existem; padrões ainda sem aceite da marca. |
| E092.02 | Conferir logos, assinatura da cooperativa e identificação do fornecedor. | P | Logo local; assinatura específica e operador ainda não homologados. |
| E092.03 | Verificar consistência de títulos, ações, estados e documentos exportados. | P | Textos locais revisados; documentos e estados têm lacunas identificadas. |
| E092.04 | Revisar foco visual em preço, prazo, versão e próxima ação. | P | Vitrine focada em compra; versão e próxima ação operacional ainda incompletas. |
| E092.05 | Remover elementos decorativos ou legados que prejudiquem a tarefa. | P | Legado reduzido no catálogo; métricas e funções de vendedor permanecem. |
| E092.06 | Conferir contraste e legibilidade após ajustes finais de marca. | P | Contraste local medido; aplicação final de marca ainda não aprovada. |
| E092.07 | Revisar mensagens de suporte, erro e notificação em português brasileiro. | P | Pt-BR usado nas alterações; mensagens operacionais inconsistentes persistem. |
| E092.08 | Confirmar que limites comerciais e operacionais permanecem visíveis. | P | Ressalvas do catálogo visíveis; oferta firme e logística não completas. |
| E092.09 | Obter revisão do responsável autorizado pela marca no escopo aplicável. | V | Responsável autorizado pela marca ainda não revisou a entrega. |
| E092.10 | Registrar aceite da experiência e eventuais limitações que não bloqueiam o piloto. | V | Aceite final da experiência não registrado. |

**Critério de aceite ainda exigido:** Telas, documentos e comunicações seguem a direção aprovada e suportam as tarefas prioritárias.

## E093 — Preparar a cooperativa piloto e seus dados

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E093.01 | Confirmar cooperativa piloto, responsáveis e escopo de participação. | V | Cooperativa piloto e participantes não confirmados. |
| E093.02 | Validar política vigente e alçadas que serão aplicadas ao piloto. | V | Política vigente e alçadas do piloto não aceitas. |
| E093.03 | Cadastrar ou reconciliar PAs, centros de custo e endereços autorizados. | V | Cadastros reais de PAs/centros/destinos não reconciliados. |
| E093.04 | Conferir período e valores de verba com o responsável financeiro. | V | Competência e saldo iniciais dependem de validação financeira. |
| E093.05 | Preparar usuários e convites com mínimo privilégio necessário. | V | Usuários/convidados do piloto ainda não preparados. |
| E093.06 | Definir fornecedores, categorias e destinos efetivamente atendidos. | V | Capacidade real de fornecedores/categorias/destinos não confirmada. |
| E093.07 | Validar ativos de marca e modelos de arte permitidos. | V | Ativos e artes do piloto dependem de autorização vigente. |
| E093.08 | Preparar plano reversível para qualquer migração de dados próprios necessária. | P | Diretriz reversível existe; plano depende do schema real inacessível. |
| E093.09 | Conferir amostra dos cadastros com os responsáveis de cada área. | V | Amostra de cadastros não validada pelos responsáveis. |
| E093.10 | Registrar prontidão dos dados sem importar informações desnecessárias do catálogo mestre. | V | Prontidão operacional dos dados não comprovada. |

**Critério de aceite ainda exigido:** Unidades, papéis, políticas, endereços e verbas estão conferidos antes de receber compras reais.

## E094 — Preparar operação, suporte e treinamento

**Referências:** [docs/DR.md](../../../docs/DR.md), [docs/OBSERVABILITY.md](../../../docs/OBSERVABILITY.md), [docs/SECURITY_RUNBOOK.md](../../../docs/SECURITY_RUNBOOK.md), [src/components/ai/AIChat.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/ai/AIChat.tsx), [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E094.01 | Definir responsáveis de compras, marketing, produção, logística e suporte. | V | Responsáveis de todas as áreas ainda não atribuídos. |
| E094.02 | Preparar guias curtos por tarefa e papel funcional. | P | Documentação técnica existe; guias por papel do piloto incompletos. |
| E094.03 | Demonstrar solicitação, revisão, aprovação e recebimento com dados de teste. | P | Demonstrações visuais existem; treinamento da compra completa não realizado. |
| E094.04 | Treinar identificação de proposta expirada e versão de arte incorreta. | N | Treinamento de versão de arte/proposta expirada não realizado. |
| E094.05 | Ensaiar atendimento de atraso, avaria e divergência de cobrança. | N | Ensaio de atendimento de avaria/atraso/cobrança não realizado. |
| E094.06 | Definir escalonamento quando uma integração ou etapa operacional falhar. | P | Runbooks genéricos existem; escalonamento nominal não validado. |
| E094.07 | Publicar horários e compromissos de atendimento realmente suportados. | V | Horários e SLA reais ainda não confirmados. |
| E094.08 | Garantir acesso aos documentos e sistemas necessários a cada responsável. | V | Acessos dos responsáveis não preparados/homologados. |
| E094.09 | Observar execução independente das tarefas após a orientação inicial. | N | Execução independente após treinamento não observada. |
| E094.10 | Registrar lacunas de treinamento corrigidas e responsáveis de plantão do piloto. | V | Plantão e lacunas de treinamento não registrados. |

**Critério de aceite ainda exigido:** Responsáveis conseguem concluir suas tarefas e encaminhar falhas pelos procedimentos documentados.

## E095 — Preparar release e decisão de lançamento

**Referências:** [docs/execucao/revisao-implementacao/ci.json](../../../docs/execucao/revisao-implementacao/ci.json), [docs/execucao/revisao-implementacao/resumo-codeql.json](../../../docs/execucao/revisao-implementacao/resumo-codeql.json), [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml), [docs/execucao/checkpoint-local-2026-09-11.md](../../../docs/execucao/checkpoint-local-2026-09-11.md), [docs/DR.md](../../../docs/DR.md), [docs/OBSERVABILITY.md](../../../docs/OBSERVABILITY.md), [docs/SECURITY_RUNBOOK.md](../../../docs/SECURITY_RUNBOOK.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E095.01 | Fixar commit candidato e mudanças incluídas na release. | L | Commit auditado 6f1c5f94f612c13071b8dbe61b500b915e50b123 e mudanças identificados. |
| E095.02 | Executar gates obrigatórios no artefato que será implantado. | P | Gates executados; qualidade e E2E falharam no commit auditado. |
| E095.03 | Conferir variáveis, domínios, provedores e destinos dos dois bancos. | P | IDs/configuração local conhecidos; configuração real dos dois bancos incompleta. |
| E095.04 | Validar compatibilidade e reversibilidade de migrations próprias aplicáveis. | P | SQL testado isoladamente; migrations remotas e reversibilidade não homologadas. |
| E095.05 | Confirmar ausência de utilitários de teste e segredos no build público. | P | Gitleaks e exclusão de demo passam; 26 alertas CodeQL ainda precisam triagem. |
| E095.06 | Registrar limitações conhecidas e seu impacto sobre o escopo do piloto. | L | Limitações e impacto no piloto explicitados nesta revisão. |
| E095.07 | Preparar critérios objetivos de interrupção e rollback. | P | Runbooks existem; critérios operacionais de rollback não ensaiados no ambiente alvo. |
| E095.08 | Confirmar responsáveis e meios de diagnóstico durante a abertura. | V | Equipe de diagnóstico e abertura não confirmada. |
| E095.09 | Obter decisão de lançamento conforme a governança e autorizações já estabelecidas. | V | Decisão de lançamento ainda não obtida; há bloqueadores concretos. |
| E095.10 | Registrar aceite da release com evidências e sem desativar controles que falharam. | N | Não há aceite de release apta; controles falhos permanecem visíveis. |

**Critério de aceite ainda exigido:** Não existem bloqueadores críticos pendentes; deploy, rollback, suporte e autorização operacional estão preparados.

## E096 — Publicar o piloto e verificar produção

**Referências:** [docs/execucao/revisao-implementacao/ci.json](../../../docs/execucao/revisao-implementacao/ci.json), [docs/execucao/revisao-implementacao/resumo-codeql.json](../../../docs/execucao/revisao-implementacao/resumo-codeql.json), [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml), [docs/DR.md](../../../docs/DR.md), [docs/OBSERVABILITY.md](../../../docs/OBSERVABILITY.md), [docs/SECURITY_RUNBOOK.md](../../../docs/SECURITY_RUNBOOK.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E096.01 | Implantar o artefato aprovado pelo procedimento documentado. | V | Há prévia Vercel; artefato aprovado do piloto não publicado. |
| E096.02 | Confirmar domínio, certificado e commit efetivamente publicados. | P | Commit da prévia conhecido; domínio produtivo não confirmado. |
| E096.03 | Verificar leitura real do catálogo com identidade de privilégio mínimo. | V | Leitura real com identidade mínima da origem ainda não homologada. |
| E096.04 | Confirmar que métodos de autenticação exibidos funcionam em produção. | V | Autenticação em produção não comprovada. |
| E096.05 | Validar contexto e permissões dos usuários autorizados do piloto. | V | Usuários, papéis e contexto do piloto não validados. |
| E096.06 | Checar acesso a artes, documentos e arquivos privados necessários. | V | Arquivos privados em produção não verificados. |
| E096.07 | Confirmar alertas e correlação de eventos no ambiente produtivo. | V | Alertas/correlação produtiva sem evidência. |
| E096.08 | Executar smoke test autorizado sem gerar compra ou cobrança acidental. | V | Smoke autenticado autorizado do piloto não executado. |
| E096.09 | Aplicar critérios de interrupção se ocorrer bloqueador de segurança ou integridade. | P | PR mantida sem merge diante de falhas; rollback produtivo não aplicável ainda. |
| E096.10 | Registrar evidências de produção e liberar uso ao grupo piloto autorizado. | V | Uso do piloto não liberado com evidências de produção. |

**Critério de aceite ainda exigido:** Domínio e commit produtivos estão confirmados; fluxos essenciais funcionam com responsáveis reais e monitoramento ativo.

## E097 — Acompanhar a primeira compra real até o recebimento

**Referências:** [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md), [docs/execucao/checkpoint-local-2026-09-11.md](../../../docs/execucao/checkpoint-local-2026-09-11.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E097.01 | Selecionar uma necessidade real aprovada pela cooperativa participante. | V | Necessidade real da cooperativa ainda não selecionada. |
| E097.02 | Montar proposta vigente com itens, personalização, verba e destinos confirmados. | V | Proposta real com condições/itens confirmados não montada. |
| E097.03 | Executar aprovações reais de arte e despesa pelas pessoas competentes. | V | Aprovações reais de arte/despesa não realizadas. |
| E097.04 | Conferir compromisso de verba e versão liberada ao fornecedor. | V | Compromisso real e versão ao fornecedor não conferidos. |
| E097.05 | Obter reconfirmação operacional de disponibilidade e prazo contratado. | V | Oferta/prazo reais não reconfirmados. |
| E097.06 | Acompanhar produção e eventuais alterações pelo fluxo autorizado. | V | Produção de compra real não acompanhada. |
| E097.07 | Registrar expedição, rastreio e recebimento de cada destino. | V | Expedição/rastreio/recebimentos reais não registrados. |
| E097.08 | Resolver divergências da compra sem apagar seu histórico. | V | Não há compra real acompanhada para resolver divergências. |
| E097.09 | Conciliar documentação, quantidades, condições financeiras e saldo final. | V | Conciliação de documentos e saldo real não realizada. |
| E097.10 | Obter confirmação dos responsáveis de que a compra foi concluída na operação real. | V | Confirmação de conclusão operacional não obtida. |

**Critério de aceite ainda exigido:** Pedido real autorizado é produzido, entregue e conciliado, com histórico e saldo verificáveis.

## E098 — Medir o piloto e corrigir fricções comprovadas

**Referências:** [src/hooks/sicoob/useAIOrderPredictor.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts), [src/pages/sicoob/orders/OrdersPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/sicoob/statsService.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E098.01 | Fixar janela de avaliação e conjunto de pedidos considerados. | V | Sem pedidos reais de piloto para fixar janela. |
| E098.02 | Medir tempos de solicitação, arte, despesa e entrega com seus denominadores. | V | Sem tempos observados para medir etapas com denominadores. |
| E098.03 | Registrar intervenções humanas necessárias para concluir a compra. | V | Intervenções humanas do piloto ainda não observadas. |
| E098.04 | Coletar dúvidas e fricções de compradores, marketing e recebedores. | V | Dúvidas de participantes reais não coletadas. |
| E098.05 | Comparar previsão e entrega sem atribuir causas não investigadas. | V | Previsão versus entrega real não comparada. |
| E098.06 | Medir desempenho de campo quando a amostra permitir interpretação. | V | Não há amostra de tráfego real para desempenho de campo. |
| E098.07 | Priorizar correções por impacto observado e risco operacional. | P | Prioridade técnica registrada; ainda não deriva de piloto observado. |
| E098.08 | Implementar correções pequenas pelo fluxo normal de revisão e validação. | P | Correções locais anteriores existem; ciclo de correção do piloto ainda não ocorreu. |
| E098.09 | Rever os cenários afetados e registrar o efeito das mudanças. | P | Retestes técnicos existem; efeito em usuários reais desconhecido. |
| E098.10 | Decidir expansão ou novo ciclo de ajuste com base nas evidências do piloto. | V | Decisão de expansão depende de evidências do piloto ausentes. |

**Critério de aceite ainda exigido:** Resultados têm amostra e período definidos; ajustes prioritários demonstram melhoria ou limitação explicitamente registrada.

## E099 — Validar uma segunda cooperativa com regras diferentes

**Referências:** [docs/pesquisa/2026-09-11/dossie.md](../../../docs/pesquisa/2026-09-11/dossie.md), [docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md](../../../docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md), [docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md](../../../docs/pesquisa/2026-09-11/anexos/documentos-fornecidos.md), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E099.01 | Selecionar segunda cooperativa e confirmar autorização para participação. | V | Segunda cooperativa e autorização não confirmadas. |
| E099.02 | Documentar diferenças de alçada, cotação, categoria e calendário. | V | Regras vigentes do segundo contexto não documentadas. |
| E099.03 | Configurar vínculos, unidades e centros de custo correspondentes. | V | Vínculos/unidades/centros reais não configurados. |
| E099.04 | Aplicar políticas por configuração, evitando cópias de código por cliente. | N | Política versionada configurável sem bifurcação por cliente ainda incompleta. |
| E099.05 | Validar identidade local e ativos autorizados dessa cooperativa. | V | Marca local do segundo contexto não homologada. |
| E099.06 | Repetir testes de isolamento entre as duas organizações ativas. | P | Fixtures segregadas existem; duas organizações ativas reais não testadas. |
| E099.07 | Ensaiar aprovação e delegação com as regras diferentes. | N | Delegação não implementada; regras distintas não ensaiadas. |
| E099.08 | Treinar responsáveis nas diferenças operacionais relevantes. | V | Responsáveis do segundo contexto não treinados. |
| E099.09 | Acompanhar uma compra autorizada no segundo contexto até sua conciliação. | V | Compra autorizada no segundo contexto não acompanhada. |
| E099.10 | Registrar evidências de expansão e limitações que ainda exigem evolução do produto. | V | Não há expansão operacional para registrar como concluída. |

**Critério de aceite ainda exigido:** Variação de política funciona sem duplicar aplicação; isolamento e diferenças de regra são demonstrados.

## E100 — Encerrar a implantação e estabelecer evolução contínua

**Referências:** [docs/execucao/revisao-implementacao/anotacoes.txt](../../../docs/execucao/revisao-implementacao/anotacoes.txt), [docs/execucao/revisao-implementacao/achados.json](../../../docs/execucao/revisao-implementacao/achados.json), [docs/plano-implementacao/plano.json](../../../docs/plano-implementacao/plano.json), [docs/execucao/validacao-do-plano.md](../../../docs/execucao/validacao-do-plano.md), [docs/execucao/revisao-implementacao/ci.json](../../../docs/execucao/revisao-implementacao/ci.json), [docs/execucao/revisao-implementacao/resumo-codeql.json](../../../docs/execucao/revisao-implementacao/resumo-codeql.json), [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml)

| ID | Ação original | Situação | Diagnóstico individual |
|---|---|---|---|
| E100.01 | Conferir as mil subetapas e investigar registros sem evidência suficiente. | L | Esta revisão cobre os 1.000 IDs e explicita evidências insuficientes. |
| E100.02 | Verificar critérios de aceite e revisores de todas as etapas anteriores. | L | Critérios e campos conferidos; zero etapas com aceite/revisores preenchidos. |
| E100.03 | Confirmar compras reais conciliadas e ambiente produtivo identificado. | V | Compras reais conciliadas e produção identificada não comprovadas. |
| E100.04 | Reconciliar documentação, permissões e configuração com o estado publicado. | P | Documentação local revisada; configuração publicada continua parcialmente desconhecida. |
| E100.05 | Consolidar indicadores observados e limitações de amostra do período. | V | Indicadores observados dependem de piloto real ainda ausente. |
| E100.06 | Transferir manutenção do sistema visual e conteúdo aos responsáveis definidos. | V | Transferência para responsáveis do design/conteúdo não realizada. |
| E100.07 | Formalizar operação, suporte, recuperação e gestão de acessos recorrentes. | V | Operação, suporte e gestão recorrente de acessos não formalizados. |
| E100.08 | Priorizar o próximo ciclo com base em problemas e oportunidades demonstrados. | L | Próximo ciclo priorizado pelas falhas concretas encontradas na revisão. |
| E100.09 | Definir calendário de revisão de usabilidade, acessibilidade, segurança e desempenho. | V | Calendário e responsáveis de revisão recorrente não definidos. |
| E100.10 | Registrar o aceite final da implantação com responsáveis, data e evidências verificáveis. | V | Aceite final da implantação não obtido; critérios de encerramento não satisfeitos. |

**Critério de aceite ainda exigido:** As 100 etapas têm evidência e revisão; operação real, responsabilidades e manutenção estão formalmente transferidas.
