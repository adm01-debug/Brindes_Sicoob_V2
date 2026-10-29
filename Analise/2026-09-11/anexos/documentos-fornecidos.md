# Análise dos documentos fornecidos — Portal de Brindes Sicoob

Data da análise: **11/09/2026**. Corpus: **13 arquivos úteis, sendo 12 PDFs (298 páginas) e uma planilha Excel**. Os arquivos `:Zone.Identifier` são metadados de transferência do Windows e foram ignorados. A numeração de página abaixo é a do PDF, iniciada em 1; não é a numeração impressa dos cadernos diagramados em páginas duplas.

Os documentos de operação mostram que um portal corporativo reúne aprovação, verba, entrega, nota fiscal, rastreio e atendimento, além de expor produtos. A personalização Sicoob aparece em campanhas e no contexto de marca; a evidência mais direta de compra é uma política do **Sicoob Centro**, que não pode ser transformada em regra universal do sistema.

## 1. Conclusões que mudam decisões do projeto

1. **A maioria dos documentos é histórica.** Há material de 2007, 2012, 2013, 2017, 2019–2021 e arquivos cuja publicação não pôde ser datada. Nenhum deles comprova um contrato comercial ou política sistêmica vigente em setembro de 2026.
2. **Não existe um único comprador Sicoob nestas fontes.** A cartilha distingue estrutura sistêmica e local; o manual do Centro define escolhas regionais. O portal precisa preservar autonomia da cooperativa, escopo do PA e aprovação da marca, e não somente trocar a cor de um sistema de vendedores.
3. **BR Supply deve ser estudado como operação completa.** Os manuais demonstram catálogo por usuário, locais autorizados, alçadas, verba, tratamento parcial, documentos, recompra, SAC e aceite. Esses são fundamentos de paridade operacional, não diferenciais exclusivos já demonstrados para Sicoob.
4. **Regras variam mesmo quando a interface é igual.** UFMA e IFRO usam o mesmo padrão visual, mas possuem janelas mensais diferentes; IFSULDEMINAS e Magazine Luiza indicam 30 dias para ocorrência, contra 15 em UFMA/IFRO. Prazos, mínimos e bloqueios precisam ser parâmetros de contrato/cooperativa.
5. **A maior oportunidade específica é ligar campanha → arte → verba → entrega no evento.** Campanha histórica Sicoob, calendário de assembleias, materiais do Instituto e catálogo de brindes mostram as peças dessa jornada. A conexão é uma hipótese de produto fortemente sustentada, não funcionalidade comprovada nas fontes.
6. **A planilha é um índice de pesquisa.** Uma aba, quatro linhas utilizadas, seis células não vazias e cinco links. Ela não é especificação do portal nem contém credenciais.
7. **`output.pdf` é Magazine Luiza.** O arquivo é rasterizado; OCR e visualização identificam um portal BR Supply de outro cliente. `ARKnA15FLk5gh10.pdf` é o manual UFMA.
8. **Preços não podem ser reutilizados.** O catálogo de presentes afirma validade até outubro/2017. Nenhum preço atual, estoque atual ou correspondência entre códigos antigos e o banco existente foi inferido.

## 2. Método e limites de evidência

Foram lidos `README.md` e `docs/SCOPE_ALIGNMENT.md` da worktree antes da produção dos artefatos. Foi executada extração nativa integral dos 12 PDFs, totalizando 577.285 caracteres no resultado bruto; como `output.pdf` não contém texto útil, todas as suas 20 páginas receberam OCR em português. Os demais PDFs foram inspecionados visualmente em páginas relevantes a identidade, tela, processo, tabela ou contradição. O inventário informa quais páginas foram vistas; as 20 páginas de `output.pdf` foram vistas. A planilha foi lida integralmente como OOXML, incluindo todas as células não vazias e metadados.

Os achados distinguem **conteúdo explícito** de **implicação proposta para o portal**. Data de geração, modificação ou conversão do arquivo não é tratada como vigência normativa. No relatório anual de 2007, todas as seções foram triadas; o aprofundamento foi institucional e não uma auditoria dos números contábeis. OCR de telas pequenas pode errar números e letras; nenhuma decisão de preço, cadastro de pessoa ou contrato foi baseada nesses trechos.

Os manuais UFMA, IFRO e IFSULDEMINAS compartilham telas, exemplos e organização de conteúdo. Foram tratados como uma família de implantação BR Supply, não como três provas independentes de demanda Sicoob. O manual Magalu e o SAPORE ampliam a comparação histórica, mas também não substituem observação de usuários atuais.

Esta frente é documental: não fez login em portais externos, não enviou mensagens, não verificou LinkedIn, não consultou os bancos Supabase e não auditou o código. Essas conclusões devem ser integradas às frentes de pesquisa atual e auditoria técnica, sem se substituir a elas.

## 3. Inventário, data real e autoridade

| Arquivo | Instituição / uso | Páginas | Data de conteúdo ou proveniência | Adequação |
|---|---|---:|---|---|
| ARKnA15FLk5gh10.pdf | UFMA; BR Supply | 20 | Não declarada no conteúdo; PDF gerado em 27/07/2021 | Histórico; inadequado como regra Sicoob |
| Cartilha-do-Cooperado-janeiro.pdf | Sicoob Metropolitano; Sicoob Central Unicoob | 37 | Janeiro de 2019 | Histórico; princípios úteis, números, contatos, organograma e aplicações exigem atualização |
| Exercício findo em 31 de dezembro de 2007.pdf | Banco Cooperativo do Brasil — Bancoob | 46 | Exercício findo em 31/12/2007 | Histórico remoto; baixa utilidade para decisões atuais de portal |
| MANUAL DO-COOPERADO_ALIANÇA_WEB_REV00.pdf | Sicoob Aliança; Sicoob Central Unicoob | 28 | Não declarada no conteúdo; PDF gerado em 31/03/2020 | Histórico; útil para tom e valores, inadequado para métricas atuais |
| Manual-do-Fornecedor-SICOOB-Centro-1.pdf | Sicoob Centro | 6 | Sem vigência declarada; PDF gerado em 12/08/2021 | Fonte local mais forte sobre compras; confirmar versão antes de parametrizar |
| Opcoes_Brindes_Campanha_SICOOB_Dia_da_Secretaria.pdf | Campanha identificada como Sicoob; unidade emissora não comprovada | 3 | Não declarada no corpo; PDF gerado em 09/09/2013 | Histórico remoto; demonstra ocasião e atributos, não catálogo/estoque atual |
| Portal de Compras SAPORE.pdf | SAPORE; BR Supply | 13 | Não declarada no corpo; PDF gerado em 22/05/2012 | Histórico; relevante ao processo, interface e navegadores obsoletos |
| Presentes Final de Ano - Br Supply.pdf | BR Supply | 40 | Campanha 2017, preços válidos até outubro/2017 ou enquanto durar estoque | Expirado para preço, estoque, códigos, mínimo e SLA |
| manual-avn-brs-v1-2.pdf | Almoxarifado Virtual Nacional; Central de Compras do Ministério da Economia; BR Supply | 47 | Sem data de publicação identificável | Vigência não estabelecida; regras contratuais públicas não se aplicam automaticamente ao Sicoob |
| manual_IFRO.pdf | IFRO; BR Supply | 20 | Não declarada no conteúdo; PDF gerado em 27/07/2021 | Histórico; implantação distinta da UFMA |
| manual_ifsuldeminas.pdf | Instituto Federal do Sul de Minas Gerais; BR Supply | 18 | Não declarada no conteúdo; PDF gerado em 26/05/2020 | Histórico; prazo de ocorrência difere dos manuais UFMA/IFRO |
| output.pdf | Magazine Luiza; BR Supply | 20 | Data editorial desconhecida; captura/conversão em 31/07/2022 | Histórico; não é documento Sicoob e não comprova produto BR Supply atual |
| Portal de Compras - Sicoob.xlsx | Coleção particular fornecida pelo usuário | 1 aba | Conteúdo sem data; criado em 31/07/2022 e modificado em 29/12/2025 | Lista de links; atualização do arquivo não valida os sites nem implica endosso Sicoob |

O JSON de inventário inclui caminho absoluto, hash SHA-256, tamanho, metadados, evidências e limitações por arquivo. Uma alteração de arquivo pode ser identificada pelo hash sem confundir revisões.

## 4. Leitura detalhada por arquivo

### 4.1. ARKnA15FLk5gh10.pdf

**Identificação:** Almoxarifado Virtual da UFMA. **Instituição:** UFMA; BR Supply.

**Data:** Não declarada no conteúdo; PDF gerado em 27/07/2021. **Base da data:** Metadados de criação/modificação, sem prova de vigência contratual em 2026.

**Autoridade:** Benchmark de outra organização. Histórico; inadequado como regra Sicoob.

- **Janela mensal da UFMA — p.5.** Evidência: Pedidos e aprovações de 1 a 20; entrega até dia 15 do mês seguinte. **Implicação:** Permitir calendário configurável por organização e contrato; não fixar esta janela para cooperativas.
- **Carrinho com local, verba e prazo — p.8–10.** Evidência: Conferência de faturamento, entrega, itens, quantidades, valor total; verba disponível/consumida e previsão de entrega; salvar carrinho e PDF. **Implicação:** Mostrar destino, orçamento e prazo antes da confirmação; persistir rascunhos por cooperativa/PA.
- **Cancelamento antes da aprovação — p.11.** Evidência: Cancelamento direto apenas enquanto aguarda aprovação; exige motivo; notificações ao solicitante e aprovadores. **Implicação:** Definir cancelamento por fase e registrar motivo, ator e evento; para brindes, avaliar adicionalmente liberação da arte/produção.
- **Aprovação e devolução ao solicitante — p.12, inspeção visual.** Evidência: Tela distingue aprovar, reprovar, devolver ao solicitante, adicionar item e atualizar dados. **Implicação:** Devolução para ajuste deve ser um estado explícito, diferente de rejeição definitiva.
- **Rastreio, ateste e ocorrência — p.14–18.** Evidência: Relatórios de pedidos/notas/consumo/preços; rastreio até entrega; p.16 indica 15 dias para ocorrência; p.17 mostra ateste total/parcial e contestação; SAC aceita anexos. **Implicação:** Modelar recebimento parcial e divergência por item; vincular fotos, notas fiscais e atendimento ao pedido.

**Limites específicos:** Telas contêm dados de demonstração, como UA São Paulo, valores e prazo de sete dias. A política específica da p.5 prevalece como evidência institucional; não tomar números de mockup como contrato. O texto extraído contém placeholders de logotipo que não aparecem como marca final na visualização.

### 4.2. Cartilha-do-Cooperado-janeiro.pdf

**Identificação:** Manual do Cooperado — Sicoob Metropolitano. **Instituição:** Sicoob Metropolitano; Sicoob Central Unicoob.

**Data:** Janeiro de 2019. **Base da data:** Data explícita no expediente, p.36; criação do PDF em 10/04/2019.

**Autoridade:** Contexto institucional Sicoob, sem política de compras. Histórico; princípios úteis, números, contatos, organograma e aplicações exigem atualização.

- **Cooperado e desenvolvimento da comunidade — p.3,6–7,16,19,37.** Evidência: O cooperado participa e é tratado como dono; gestão democrática, cooperação, transparência, educação e desenvolvimento comunitário aparecem no material. **Implicação:** Usar linguagem de cooperativa e cooperado, atendimento próximo e informações claras; evitar reduzir o portal a uma loja genérica.
- **Governança sistêmica da marca — p.12–13.** Evidência: Documento distingue confederação, centrais, singulares e pontos de atendimento; atribui à confederação diretrizes de comunicação, marketing e uso da marca. **Implicação:** Separar identidade sistêmica de personalização local; manter biblioteca de artes com versão e aprovação institucional.
- **Assembleias e calendário cooperativista — p.11 e p.14.** Evidência: Datas do cooperativismo e eventos AGO, AGE e pré-assembleias; AGO descrita nos primeiros quatro meses, com participação de delegados. **Implicação:** Criar campanhas por assembleia e evento, com data desejada e janela de produção; confirmar calendário de cada singular.
- **Educação, voluntariado e interesse comunitário — p.17–18.** Evidência: Instituto Sicoob, Cooperjovem, cooperativas mirins, concurso cultural, educação financeira/ambiental e voluntariado. **Implicação:** Curadoria por objetivo educativo/social, kits por público e evidência verificável de sustentabilidade.
- **Segmentação local de relacionamento — p.15, p.33.** Evidência: Menciona espaços para empreendedor, moda, mulher e jovens e rede em PR/SP; a p.33 distingue futuras inaugurações de 2019. **Implicação:** Segmentar campanhas por objetivo e contexto da cooperativa; não transformar rede histórica em cadastro atual de PAs.
- **Áreas de planejamento, marketing e eventos — p.36.** Evidência: Expediente atribui produção à Área de Planejamento e Desenvolvimento do Metropolitano e Comunicação, Marketing e Eventos da Central Unicoob. **Implicação:** Áreas são pistas documentais para entrevistas; nomes do expediente não comprovam cargos atuais.

**Limites específicos:** São 37 páginas de PDF contendo páginas editoriais duplas (por exemplo PDF p.12 = páginas impressas 22–23); referências deste relatório usam página do PDF. Não é manual oficial vigente de identidade visual; não contém especificação confiável de tokens digitais ou direitos de aplicação da marca. Inclui produtos e contatos de 2019; não publicar como informação financeira ou operacional atual.

### 4.3. Exercício findo em 31 de dezembro de 2007.pdf

**Identificação:** Relatório Anual 2007. **Instituição:** Banco Cooperativo do Brasil — Bancoob.

**Data:** Exercício findo em 31/12/2007. **Base da data:** Título interno, demonstrações p.29 e parecer p.41; geração 11/04/2008, modificação 15/06/2012.

**Autoridade:** Contexto histórico financeiro/institucional. Histórico remoto; baixa utilidade para decisões atuais de portal.

- **Bancoob e cooperativas acionistas em 2007 — p.7–8,43–45.** Evidência: Retrato institucional, organograma e relação de centrais acionistas; indicadores explicitamente referentes àquele exercício. **Implicação:** Preservar apenas contexto histórico; não importar dirigentes, telefones, número de cooperativas ou estrutura de 2007 para o cadastro atual.
- **Estratégia Bancoob 2008–2010 — p.9–11.** Evidência: Mapa estratégico de qualidade, competitividade, força da marca, processos, governança, capacitação e responsabilidade socioambiental. **Implicação:** Há afinidade conceitual com eficiência e transparência; não é fonte de requisitos atuais de compras.
- **Demonstrações e notas históricas — p.24–41.** Evidência: Relatório da administração, demonstrações financeiras, notas explicativas e parecer dos auditores. **Implicação:** Não usar números financeiros históricos para TAM, orçamento de brindes, capacidade de gasto ou perfil de comprador em 2026.
- **Cabeçalho temporal divergente — p.31–40.** Evidência: Notas explicativas exibem cabeçalho 2006 e 2005, enquanto várias tabelas e o parecer tratam de 2007 e 2006. **Implicação:** Priorizar o exercício comprovado pelo documento e registrar inconsistência editorial; não presumir atualização do conteúdo pela data do arquivo.

**Limites específicos:** Extração de texto em todas as 46 páginas e triagem de todas as seções; aprofundamento concentrado no contexto institucional. Não foi realizada auditoria contábil nem validação dos demonstrativos. Documento bilíngue, em páginas duplas, com extração entrelaçada de colunas; evitar citar transcrições longas sem consulta visual.

### 4.4. MANUAL DO-COOPERADO_ALIANÇA_WEB_REV00.pdf

**Identificação:** Manual do Cooperado — Uma cooperativa para chamar de minha. **Instituição:** Sicoob Aliança; Sicoob Central Unicoob.

**Data:** Não declarada no conteúdo; PDF gerado em 31/03/2020. **Base da data:** Metadados de criação/modificação.

**Autoridade:** Contexto institucional e linguagem Sicoob. Histórico; útil para tom e valores, inadequado para métricas atuais.

- **Pertencimento e transformação comunitária — p.1,6,8–9,24.** Evidência: Apresenta vínculo de pertencimento, sociedade de pessoas, gestão democrática e desenvolvimento local. **Implicação:** Mensagem do portal pode associar cada campanha à finalidade para cooperados e comunidade.
- **Princípios e valores cooperativistas — p.11–15.** Evidência: Ética, transparência, respeito, cooperativismo, direitos/deveres e os sete princípios; autonomia e interesse comunitário. **Implicação:** Tornar escolhas de compra e aprovações explicáveis; suportar autonomia da singular dentro da governança de marca.
- **Eixos do Instituto Sicoob no documento — p.14–17.** Evidência: Cooperativismo/empreendedorismo, cidadania financeira e desenvolvimento sustentável. **Implicação:** Criar coleções temáticas e kits educativos com descrição de uso, evitando alegação ambiental sem comprovação.
- **Expressão visual do Sicoob Aliança — p.1,6,13,15, inspeção visual.** Evidência: Combina verde escuro, turquesa, verde-limão, branco, formas orgânicas e triângulos; há roxo em títulos/capa. **Implicação:** Usar como referência de expressão histórica; escolher paleta e tipografia final somente a partir do manual oficial vigente.

**Limites específicos:** Números da p.5 e informações de canais/produtos p.18–25 pertencem ao contexto do arquivo; não foram verificados como atuais. Documento apresenta a cooperativa Aliança; sua linguagem e campanhas não implicam padronização obrigatória para todas as singulares.

### 4.5. Manual-do-Fornecedor-SICOOB-Centro-1.pdf

**Identificação:** Manual do Fornecedor Sicoob Centro. **Instituição:** Sicoob Centro.

**Data:** Sem vigência declarada; PDF gerado em 12/08/2021. **Base da data:** Metadados de criação; documento não identifica revisão ou data de vigência.

**Autoridade:** Política de uma cooperativa Sicoob. Fonte local mais forte sobre compras; confirmar versão antes de parametrizar.

- **Preferência por cooperado, PME e economia regional — p.2.** Evidência: Preferência de até 5% para empresas cooperadas e 5% para pequenas/microempresas de Rondônia, cumuláveis até 10%; desempate considera porte, reciprocidade e tempo de filiação. **Implicação:** Representar qualificações e critérios configuráveis por cooperativa; não aplicar percentuais como regra de todo Sicoob.
- **Cotação registrada e prazo de resposta — p.3.** Evidência: Cotações por e-mail para registro; retorno em três dias úteis; comunicação de aprovação/reprovação a todos participantes; aproveitamento de orçamento anterior até 90 dias. **Implicação:** Versionar propostas, registrar validade e eventos de decisão; permitir prazo e vigência por organização, sem importar limites históricos automaticamente.
- **Conteúdo mínimo da proposta — p.3.** Evidência: Proposta inclui quantidade, modelo, marca, preço, garantia, forma de pagamento, prazo de retorno e previsão de entrega. **Implicação:** PDF/link comercial deve conter especificação completa, preço discriminado, validade, pagamento, entrega e condições de personalização.
- **Qualificação e regularidade do fornecedor — p.3–4.** Evidência: Regularidade municipal, estadual, federal e trabalhista; critérios técnicos, profissionais, éticos, qualidade, localização, associação e sustentabilidade. **Implicação:** Disponibilizar dossiê comercial e documentos com validade e acesso controlado; evitar exigir dados pessoais não necessários à operação.
- **Pontuação no ato da compra — p.5.** Evidência: Produto sustentável e menor preço recebem 20 pontos cada; cooperativa, certificações/declaração ambiental e associado ativo recebem 10 cada; outros seis critérios de cinco pontos completam a tabela. **Implicação:** Permitir comparar custo, conformidade, prazo e evidência ambiental; nenhum selo deve ser atribuído automaticamente por material ou nome do item.
- **Avaliação anual do fornecedor — p.6.** Evidência: Fornecedores com pelo menos cinco compras anuais são avaliados; qualidade material/serviço soma 40%, relacionamento 20% e outros quatro itens 10% cada; mínimo três estrelas. **Implicação:** Conectar histórico de prazo, qualidade, atendimento e documentação a avaliação do fornecedor; ponderação deve ser configurável.
- **Condição de pagamento documentada — p.3.** Evidência: Pagamento no prazo acordado; compra à vista descrita como D+5 dias úteis após apresentação de nota fiscal ou comprovantes. **Implicação:** Explicitar condição acordada na proposta/pedido; não presumir cartão, Pix imediato ou D+5 universal.

**Limites específicos:** O emitente é Sicoob Centro, não Confederação/Centro Cooperativo Sicoob. A política inclui critérios regionais de Rondônia. Não há no arquivo autorização para aplicar regras a outras cooperativas, catálogo homologado de brindes, API, SSO ou política sistêmica de presente.

**Detalhe da pontuação do Centro (p.5):** produto sustentável 20; menor preço 20; fornecedor cooperativa 10; certificação/declaração de sustentabilidade 10; associado ativo 10; reciprocidade 5; empresa local 5; selo de qualidade 5; garantia adicional 5; flexibilidade 5; recomendação regional 5. Total: 100. A comparação é documental e local. Não há comprovação de que todos os atributos devam ser coletados dos clientes do portal, nem de que devam ordenar automaticamente o catálogo.

**Avaliação anual (p.6):** qualidade do material e do serviço somam 40% (20% cada se fornece ambos); relacionamento 20%; responsabilidade socioambiental, inovação, pós-venda e consultas cadastrais 10% cada. A escala de estrelas é 0–30%=1, 31–60%=2, 61–80%=3, 81–90%=4, 91–100%=5. A política demanda mínimo de três estrelas para fornecedores avaliados, mas não informa política sistêmica de exclusão automática.

### 4.6. Opcoes_Brindes_Campanha_SICOOB_Dia_da_Secretaria.pdf

**Identificação:** Opções Campanha Sicoob Dia da Secretária. **Instituição:** Campanha identificada como Sicoob; unidade emissora não comprovada.

**Data:** Não declarada no corpo; PDF gerado em 09/09/2013. **Base da data:** Metadados PowerPoint.

**Autoridade:** Catálogo histórico de campanha Sicoob. Histórico remoto; demonstra ocasião e atributos, não catálogo/estoque atual.

- **Campanha de relacionamento por ocasião — p.1–3.** Evidência: Seis opções: nécessaire, porta-bolsa, porta-batom, espelho, kit higiene bucal e porta-cartões. **Implicação:** Organizar descoberta por campanha/objetivo e permitir kit por faixa de investimento sem reproduzir estereótipos como regra do público.
- **Ficha de brinde e personalização — p.2–3.** Evidência: Códigos, materiais, aplicações, embalagem, quantidade por pacote; baixo-relevo, gravação e aplicação monocromática. **Implicação:** Separar produto, variante, unidade comercial, técnica, área de personalização, embalagem e conteúdo do kit.
- **Unidade versus pacote — p.2.** Evidência: Porta-batom apresentado em pacote de cinco unidades; outros itens em unidade. **Implicação:** Exibir unidade de compra e quantidade total entregável; validar múltiplos e conversões no orçamento.
- **Descrições que exigem saneamento — p.2.** Evidência: Nécessaire intitulada em nylon, mas diferenciais citam PVC transparente. **Implicação:** Normalizar atributos com fonte de produto verificável e sinalizar conflito em vez de inventar composição.

**Limites específicos:** Não há preços neste PDF. Códigos 024xxx não foram associados aos IDs do banco de produtos. Uso antigo do logo não constitui licença ou aprovação da personalização no novo portal.

### 4.7. Portal de Compras SAPORE.pdf

**Identificação:** Portal de Compras SAPORE — Guia de início rápido. **Instituição:** SAPORE; BR Supply.

**Data:** Não declarada no corpo; PDF gerado em 22/05/2012. **Base da data:** Metadados de criação.

**Autoridade:** Benchmark histórico de cliente BR Supply. Histórico; relevante ao processo, interface e navegadores obsoletos.

- **Catálogo por cliente/usuário e preço contratado — p.4.** Evidência: Catálogos disponíveis variam por cliente/usuário; indicador de preço contratado. **Implicação:** Definir visibilidade comercial e contratos por cooperativa, sem confundir preço consultado no banco com preço final da proposta.
- **Locais de entrega controlados pelo gestor — p.5–7.** Evidência: Gestor define locais autorizados; carrinho confirma destino; restrições de verba e pedido mínimo podem ser parametrizadas por usuário/local. **Implicação:** Associar usuário a organizações/PAs e endereços permitidos; validar no servidor o contexto escolhido.
- **Uma ou mais alçadas de aprovação — p.8–10.** Evidência: Número de aprovadores depende da parametrização do gestor; aprovador pode alterar itens/quantidades; histórico e notificações registram mudanças; rejeição exige motivo. **Implicação:** Separar solicitação, aprovação financeira e aprovação de arte; alterações relevantes invalidam aprovações anteriores.
- **Faturamento e atendimento parciais — p.9.** Evidência: Estados distinguem liberação comercial, integração WMS, separação, faturamento, atendimento total e parcial; parcial pode gerar duas notas. **Implicação:** Modelar entregas/notas por remessa e quantidades atendidas por item; status global sozinho é insuficiente.
- **Recompra e programação — p.6 e p.9.** Evidência: Salvar carrinho, programação de repetição e copiar itens de pedido para novo carrinho. **Implicação:** Recomprar com revalidação de estoque, preço, prazo e versão da arte.
- **Conferência e divergência na entrega — p.11–12.** Evidência: NF, consumo e rastreio; checklist de volumes, especificações, quantidades e integridade; documentação de divergência. **Implicação:** Oferecer recebimento guiado por item, evidência fotográfica e atendimento vinculado.

**Limites específicos:** Regras são da implantação SAPORE de 2012. Referências a IE6, Firefox 3.6 e tarja SSL-EV não são requisitos técnicos atuais. O documento não comprova a existência atual das mesmas telas ou integrações no BR Supply.

### 4.8. Presentes Final de Ano - Br Supply.pdf

**Identificação:** Presentes Final de Ano — catálogo 2017. **Instituição:** BR Supply.

**Data:** Campanha 2017, preços válidos até outubro/2017 ou enquanto durar estoque. **Base da data:** Título do arquivo-fonte nos metadados e validade explícita p.39; criação 31/07/2017.

**Autoridade:** Benchmark histórico de brindes personalizados. Expirado para preço, estoque, códigos, mínimo e SLA.

- **Curadoria por ocasião e investimento — p.3–4,36–37.** Evidência: Distingue presentes corporativos e Natal; resumo ordenado por investimento. **Implicação:** Criar coleções por ocasião, público e orçamento, sempre recalculadas a partir do catálogo autorizado atual.
- **Personalização de produto e embalagem — p.6–27,30–35.** Evidência: Itens apresentam foto, código, descrição, cores, mínimo e logomarca; alguns incluem embalagem temática, cartão e kits alimentícios. **Implicação:** Precificar composição completa: produto + técnica + preparação + embalagem + montagem + frete; mostrar inclusão/exclusão.
- **Quantidade mínima e variantes — p.6–27,34–37.** Evidência: Exemplos históricos mostram mínimos de 150, 200, 500 e 1.000 unidades, tamanhos P/M/G/GG e cores. **Implicação:** Modelar mínimo e múltiplo por produto/técnica/fornecedor; não copiar quantidades históricas para o banco atual.
- **Prazo de produção, processamento e transporte — p.38.** Evidência: Tabela separa produção de 25 dias, processamento de um dia e transporte regional, resultando em 31 a 41 dias no catálogo. **Implicação:** Mostrar composição do prazo e dependência de arte aprovada; estimar atendimento antes da data do evento com premissas atuais.
- **Validade comercial encerrada em outubro de 2017 — p.39.** Evidência: Validade dos preços termina em outubro/2017 ou término do estoque. **Implicação:** Impedir ingestão como tabela comercial vigente e jamais usar os valores como referência de mercado atual.
- **Inconsistência de descrição e código — p.20,25,37.** Evidência: Código 100016 é conjunto champanheira com espumante na p.20, mas o resumo p.37 o rotula como caixa de som; caixa de som na p.25 usa 100021. **Implicação:** Reconciliar por identificador e fonte; uma importação textual cega herdaria erro de produto.

**Limites específicos:** É catálogo genérico BR Supply, sem prova de acordo comercial com Sicoob ou execução das ofertas em 2026. Fotografias e modelos de arte são referências de análise, sem reprodução de assets no código.

### 4.9. manual-avn-brs-v1-2.pdf

**Identificação:** Manual do Usuário BRSUPPLY versão 1.2 — AVN. **Instituição:** Almoxarifado Virtual Nacional; Central de Compras do Ministério da Economia; BR Supply.

**Data:** Sem data de publicação identificável. **Base da data:** PDF não possui CreationDate/ModDate; versão 1.2 e menção institucional não permitem datar com precisão.

**Autoridade:** Benchmark de contratação pública. Vigência não estabelecida; regras contratuais públicas não se aplicam automaticamente ao Sicoob.

- **AVN exclui produtos personalizados — p.4 e p.16.** Evidência: Material de consumo administrativo; exclui permanentes, personalizados, copa e limpeza. **Implicação:** Aproveitar governança de pedidos; não importar escopo de catálogo que exclui justamente brindes personalizados.
- **Solicitante, aprovador, gestor setorial e administrador — p.5–6,19–20,41–44.** Evidência: Papéis têm responsabilidades diferentes; solicitante/aprovador podem atuar em mais de uma unidade; hierarquia consultável. **Implicação:** Representar permissões por ação e associação usuário-organização; papel do fornecedor é distinto do gestor da cooperativa.
- **Mínimos e janelas regionais do AVN — p.7–8.** Evidência: Mínimos de R$500 Norte/Nordeste e R$300 demais; datas de entrega dependem de quinzena de aprovação e região. **Implicação:** Configurar regras comerciais e calendários quando contratados; não adotar valores ou quinzenas como padrão Sicoob.
- **Ateste, conteste e entrega corretiva — p.9–15 e p.29–38.** Evidência: Solicitante contesta em três dias úteis; aprovador tem janela de cinco; fornecedor responde em dois; contestação pode escalar ao administrador e gerar entrega corretiva. **Implicação:** Separar entrega física de aceite e conclusão; registrar ocorrência por item com responsável, prazo e reentrega.
- **Bloqueio por pendência de ateste — p.9,33,36.** Evidência: Unidades do aprovador podem ficar bloqueadas para novos pedidos até regularização da pendência. **Implicação:** Não habilitar bloqueio em cascata sem regra de negócio explicitamente validada; exibir pendências e seus efeitos com clareza.
- **Revisão e justificativa de reprovação — p.24–28.** Evidência: Aprovador pode alterar, incluir ou excluir; remover único item cancela pedido; recusa exige justificativa e aviso eletrônico. **Implicação:** Exigir trilha de versão e reapresentação do total após alterações; evitar remoção silenciosa de item aprovado.
- **Hierarquia e exportação de dados — p.34,39–46.** Evidência: Acompanhamento de etapas, relatório de hierarquia e exportação inclusive XLSX. **Implicação:** Fornecer exportação e visibilidade por escopo de organização, com filtros de PA/campanha/período.

**Limites específicos:** CPF/SIAPE/SIORG e CATMAT são requisitos daquele sistema público; não importar para o cadastro Sicoob. Não há evidência de relacionamento direto deste AVN com cooperativas Sicoob.

### 4.10. manual_IFRO.pdf

**Identificação:** Almoxarifado Virtual do IFRO. **Instituição:** IFRO; BR Supply.

**Data:** Não declarada no conteúdo; PDF gerado em 27/07/2021. **Base da data:** Metadados de criação/modificação.

**Autoridade:** Benchmark de outra organização. Histórico; implantação distinta da UFMA.

- **Janela mensal do IFRO — p.5.** Evidência: Pedidos/aprovação de 1 a 10; entrega até dia 30 do mesmo mês. **Implicação:** A divergência em relação à UFMA prova necessidade de política por contrato, mesmo com telas quase iguais.
- **Fluxo completo de compra IFRO — p.7–15.** Evidência: Catálogo, carrinho, conferência, PDF, cancelamento com motivo antes de aprovação, aprovar/reprovar/devolver, relatórios e rastreio. **Implicação:** Benchmark funcional de paridade operacional; não confundir o estilo verde do IFRO com identidade Sicoob.
- **Prazo de ocorrência e atendimento IFRO — p.16–18.** Evidência: Ocorrências em até 15 dias; ateste de nota; SAC com tipo de ocorrência, ajuda contextual e anexos. **Implicação:** Anexos e ajuda contextual reduzem retrabalho; prazo de ocorrência deve vir de contrato vigente.

**Limites específicos:** Telas reaproveitam dados e valores de demonstração do manual UFMA; não são medições reais. Cliente é Instituto Federal de Rondônia, não Sicoob Centro apesar da coincidência geográfica.

### 4.11. manual_ifsuldeminas.pdf

**Identificação:** Portal de Suprimentos IFSULDEMINAS. **Instituição:** Instituto Federal do Sul de Minas Gerais; BR Supply.

**Data:** Não declarada no conteúdo; PDF gerado em 26/05/2020. **Base da data:** Metadados de criação/modificação.

**Autoridade:** Benchmark de outra organização. Histórico; prazo de ocorrência difere dos manuais UFMA/IFRO.

- **Carrinho contextual e aprovação IFSULDEMINAS — p.5–10.** Evidência: Busca, quantidade, local de entrega, verba, conferência, PDF e aprovação/retorno ao solicitante. **Implicação:** Priorizar tarefa de compra com contexto fixado; interface precisa mostrar organização/PA ativo em toda a jornada.
- **Relatórios, rastreio e atendimento — p.11–16.** Evidência: Relatórios de pedidos/NF/consumo/preço, rastreio, recebimento e SAC com anexos. **Implicação:** Dar autonomia ao comprador para consultar status e documentos sem depender de contato manual.
- **Ocorrência em 30 dias no IFSULDEMINAS — p.14.** Evidência: Texto indica atendimento de ocorrências dentro de 30 dias após entrega, com ressalva no conhecimento. **Implicação:** Os 30 dias conflitam com 15 dias UFMA/IFRO; preservar a regra como configuração institucional, não norma universal.

**Limites específicos:** Documento não define política Sicoob. Algumas páginas têm texto importante incorporado em imagem. Seu sumário associa aprovação à p.7, mas a seção visual de aprovação aparece na p.10; usar página real do PDF como evidência.

### 4.12. output.pdf

**Identificação:** Portal de Suprimentos Magazine Luiza. **Instituição:** Magazine Luiza; BR Supply.

**Data:** Data editorial desconhecida; captura/conversão em 31/07/2022. **Base da data:** Metadados identificam yumpudownload.com; tela de rastreio p.15 contém exemplo de 05/05/2017, que não data a publicação.

**Autoridade:** Benchmark de outra organização, arquivo rasterizado. Histórico; não é documento Sicoob e não comprova produto BR Supply atual.

- **Portal de Suprimentos Magazine Luiza — p.1,5,7,20, inspeção visual/OCR.** Evidência: Capa, introdução e endereço de acesso identificam Magazine Luiza; contracapa BR Supply. **Implicação:** Renomear descritivamente no catálogo de referências; não tratar output.pdf como arquivo Sicoob.
- **Janela de pedidos Magalu — p.6, inspeção visual/OCR.** Evidência: Pedido 1–10, aprovação 11–15 e distribuição 19–30; quadro separado indica SLA matriz/CD Canoas de cinco dias úteis. **Implicação:** Suportar calendários e exceções por destino quando contratados; não inferir abrangência nacional da regra específica do mapa.
- **Verbas, carrinhos e entregas programadas — p.9–14, inspeção visual/OCR.** Evidência: Saldo de verba, salvar carrinho, programação, revisão de local, histórico de login, pedidos e relatórios. **Implicação:** Comprador precisa ver contexto financeiro e reutilizar configuração com atualização de preço/estoque.
- **Atendimento com evidência e recebimento — p.15–18, inspeção visual/OCR.** Evidência: Rastreio, recebimento/recusa, ocorrência em 30 dias, solicitações de boleto e prioridade; fotos de avaria e etiquetas. **Implicação:** Oferecer fluxo de pós-venda ligado a pedido/NF/itens; registrar prioridade por data de evento e justificativa.

**Limites específicos:** OCR tem erros em números, e-mails e telas pequenas; o conteúdo de maior relevância foi confirmado visualmente. A data de conversão não é a data de publicação; o exemplo de 2017 não sustenta vigência das regras.

### 4.13. Portal de Compras - Sicoob.xlsx

**Identificação:** Portal de Compras - Sicoob. **Instituição:** Coleção particular fornecida pelo usuário.

**Data:** Conteúdo sem data; criado em 31/07/2022 e modificado em 29/12/2025. **Base da data:** docProps/core.xml: created 2022-07-31T14:03:09Z; modified 2025-12-29T21:29:42Z.

**Autoridade:** Índice de referências de benchmark. Lista de links; atualização do arquivo não valida os sites nem implica endosso Sicoob.

- **Cinco links de benchmark — Planilha1!A1:A4 e B2.** Evidência: Shopcoopera, página Personalize da BR Supply, login Supply Manager, canal YouTube BR Supply e Oceano B2B. **Implicação:** Usar como trilha de pesquisa pública; não confundir referência salva com fonte atualmente verificada.
- **Anotação sobre acesso ao Supply Manager — Planilha1!C2.** Evidência: A célula contém uma intenção de obter acesso para estudar ideias/padrões. **Implicação:** Tratar como conteúdo documental, sem credenciais, autorização de acesso restrito ou instrução para contornar login.

**Limites específicos:** Não há requisitos detalhados, produtos, preços, quantidades, segmentação de compradores ou credenciais na planilha. Nenhum login ou contato com terceiros foi realizado nesta análise.

| Célula | Conteúdo |
|---|---|
| Planilha1!A1 | https://www.shopcoopera.com.br/ |
| Planilha1!A2 | https://www.brsupply.com.br/supply-manager-personalize/ |
| Planilha1!B2 | https://www.supplymanager.com.br/manager/Login/Index?ReturnUrl=%2Fmanager |
| Planilha1!C2 | Conseguir acesso ao Supply Manager para copiar ideias e padrões |
| Planilha1!A3 | https://www.youtube.com/c/BrSupplySuprimentosCorporativos |
| Planilha1!A4 | https://www.oceanob2b.com/ |

## 5. O que os documentos revelam sobre compradores e marketing

As linhas abaixo descrevem **funções e tarefas observadas ou inferidas**, sem atribuir idade, gênero, renda, senioridade, poder de compra ou comportamento pessoal a indivíduos. Nenhum nome histórico é apresentado como comprador atual.

| Papel de trabalho | Evidência documental | Trabalho que o portal deve facilitar | Validação necessária |
|---|---|---|---|
| Compras/administrativo da singular | Manual Centro p.2–6 | Obter proposta completa, comparar condições, documentar decisão e consultar fornecedor | Fluxo e regras da cooperativa piloto; quem efetivamente emite pedido e contrata |
| Marketing, comunicação e eventos | Cartilha Metropolitano p.12,14,36; campanha Secretária p.1–3 | Selecionar itens para objetivo e público, controlar arte, data do evento e orçamento | Quem aprova marca/campanha; autonomia local; política de distribuição de brindes |
| Solicitante local/PA | Estrutura na Cartilha p.12; analogia de perfis AVN p.5–6 | Solicitar campanha/kit, indicar destino, acompanhar situação e receber | Existência e permissão desse papel em cada singular; não está prescrita pelo material Sicoob |
| Aprovador de verba/gestor | SAPORE p.7–10; analogia de UFMA/IFRO p.12 | Avaliar saldo, justificativa, prazo e diferenças da versão; aprovar ou devolver | Alçadas reais por valor, centro de custo, campanha, substituição e impedimentos |
| Operação do fornecedor | Catálogo BR Supply p.38; manuais de rastreio e SAC | Validar viabilidade, preço, arte, produção e remessas | Sistema operacional que confirma estoque e reserva, transportadoras e emissão de NF |
| Responsável pelo recebimento | AVN p.9–15 e 29–38; Magazine Luiza p.16–18 | Conferir volume/itens, registrar aceite ou divergência, anexar comprovantes | Quem recebe no PA, prazos contratados e fluxo de correção |
| Gestor sistêmico ou da central | Cartilha p.12–13 | Governar marca e consultar agregados quando autorizado | Compartilhamento de dados entre pessoas jurídicas e limites de acesso |

O expediente do Metropolitano (p.36, janeiro/2019) oferece pistas históricas para pesquisa profissional: Planejamento e Desenvolvimento — Daniela Parkuts, Kelly Cristina Tiago, Luciana Pizaia; Comunicação, Marketing e Eventos da Central Unicoob — Deborah Busko, Francyne Sanches, Jackelyne Brites e Júlio Dourado. **São créditos de publicação antiga, não uma lista validada de decisores ou contatos comerciais.** O material não demonstra que tenham comprado brindes. Não foram coletados contatos privados ou contatadas essas pessoas.

Há evidência de mais de uma finalidade para os brindes: relacionamento com cooperados, assembleias, campanhas de data, ações internas, educação e comunidade. Não há evidência suficiente para ranquear frequência ou gasto por finalidade. Uma descoberta inicial pode testar essas necessidades usando entrevistas por papel e pedidos reais anonimizados, em lugar de atribuir uma persona única a todo o Sicoob.

## 6. Marca e experiência: o que aproveitar e o que confirmar

A Cartilha do Metropolitano (capa e p.3,9,20,34) usa base verde escura, turquesa, verde-limão e branco, com ilustração linear de pessoas e objetos. O manual Aliança (p.1,6,13,15) explora pertencimento, formas orgânicas e variação de cor; o Manual Centro (p.1,5–6) usa hierarquia informacional mais administrativa. A campanha Secretária (p.1–3) aplica triângulos e marca nos produtos. A semelhança é uma referência visual histórica consistente; a variação confirma que cor isolada não define um sistema de design vigente.

**Direção proposta:** fundo claro para leitura de produto e preços, verde escuro para hierarquia principal, turquesa como cor de apoio, verde-limão em destaque pontual, fotos de produto com área de marca visível e linguagem próxima. Os códigos exatos de cor, fontes, área de proteção, redução mínima, combinações proibidas e assinaturas por singular devem vir da fonte oficial vigente. Não foram amostrados valores HEX de PDFs como se fossem norma.

O portal deve tornar visíveis cooperativa e PA ativos, finalidade da campanha, destino, data desejada e situação de orçamento. A diferenciação por Sicoob vem do fluxo e dos dados, além da aparência. A marca de uma cooperativa aplicada no kit não pode ser substituída automaticamente por logo genérico quando faltar a arte local; é uma pendência de aprovação explícita.

## 7. Benchmark BR Supply: paridade e diferenciação proposta

| Capacidade observada | Evidência | Decisão para o portal Sicoob |
|---|---|---|
| Catálogo por cliente/usuário e indicação de preço contratado | SAPORE p.4 | Paridade: visibilidade por contrato/cooperativa e preço claramente contextualizado |
| Destinos autorizados e verba no carrinho | SAPORE p.5–7; UFMA/IFRO p.8 | Paridade: cooperativa/PA, centro de custo e saldo na solicitação |
| Alçadas, justificativa e mudanças do aprovador | SAPORE p.8–10; AVN p.24–28 | Paridade: aprovação auditável; melhorar visualização das diferenças e devolução para ajuste |
| Salvar carrinho, copiar pedido e programar entrega | SAPORE p.6,9; AVN p.21–23; Magalu p.13 | Paridade: rascunho e recompra revalidados; recorrência depois de política confirmada |
| Rastreio, NF, faturamento e atendimento parcial | SAPORE p.9–12; UFMA p.14–17 | Paridade: remessas/NFs e recebido/pendente por item |
| SAC com ajuda, tipo de ocorrência e foto | IFRO p.18; IFSULDEMINAS p.16; Magalu p.18 | Paridade: caso ligado ao pedido, com prova e responsável |
| Catálogo por ocasião, quantidade mínima e embalagem | Presentes Final de Ano p.3–4,6–37 | Paridade: curadoria e preço completo; usar somente dados atuais autorizados |
| Produção e transporte separados | Presentes Final de Ano p.38 | Melhorar: simular chegada antes do evento, com prazo de aprovação da arte explícito |
| Arte institucional Sicoob e contexto comunitário | Campanha Secretária p.1–3; Cartilha p.11–18 | Diferenciação proposta: biblioteca de artes homologadas, campanhas cooperativistas e kits por objetivo |
| Qualificação e sustentabilidade documentada | Manual Centro p.3–6 | Diferenciação proposta: mostrar evidências de materiais/certificações e dossiê comercial quando relevante |

Os documentos demonstram capacidades históricas; não permitem afirmar lacunas da versão atual do concorrente. Portanto, termos como “melhor que BR Supply” só devem ser usados após testar a experiência atual e medir tarefas equivalentes. A superioridade proposta aqui é uma hipótese de entrega e validação.

## 8. Requisitos derivados e critérios de aceite

Prioridade P0 = base para piloto transacional; P1 = diferenciação e expansão após base validada; P2 = exploração posterior. “Derivado” significa recomendação desta análise, não cláusula oficial Sicoob.

| ID | Prioridade | Requisito derivado | Critério de aceite verificável | Fonte documental |
|---|---|---|---|---|
| DOC-01 | P0 | Contexto explícito de cooperativa/PA | Trocar PA muda destinos e permissões permitidos; pedido mantém origem histórica; servidor rejeita acesso cruzado | Cartilha p.12; SAPORE p.5; AVN p.19–20 |
| DOC-02 | P0 | Papel por ação, com aprovação independente | Solicitante não aprova além da alçada; gestor só vê organizações autorizadas; substituições ficam registradas | SAPORE p.10; AVN p.5–6 |
| DOC-03 | P0 | Proposta comercial completa | Quantidade, variante, personalização, embalagem, valores, garantia, pagamento, validade e entrega constam do orçamento exportado | Manual Centro p.3; catálogo 2017 p.6–38 |
| DOC-04 | P0 | Unidade, múltiplo e mínimo comercial | Pacote de cinco mostra unidades entregues corretamente; mínimo é específico da técnica/fornecedor; erro não cria pedido | Secretária p.2; catálogo p.34–37 |
| DOC-05 | P0 | Verba com estado auditável | Total e comprometimento apresentados na solicitação; aprovação/rejeição/cancelamento têm efeitos consistentes e sem dupla contabilização | SAPORE p.7–10; UFMA p.8 |
| DOC-06 | P0 | Versão de pedido e decisão | Mudança de item, arte, quantidade, valor ou destino cria revisão, mostra diferenças e aplica política de reaprovação | SAPORE p.8–10; AVN p.25–28 |
| DOC-07 | P0 | Aprovação de arte distinta de verba | Produção só é liberada com arte identificada e aprovada, responsável e data; mockup gerado não equivale a aprovação | Secretária p.2–3; Cartilha p.12; derivação de risco de personalização |
| DOC-08 | P0 | Prazo ligado à data do evento | Exibir aprovação da arte + produção + processamento + transporte e sinalizar quando data desejada não é viável | Catálogo p.38; Cartilha p.14 |
| DOC-09 | P0 | Estados claros de solicitação a recebimento | Cada transição tem ator, data e motivo; distinguir entregue, recebido com pendência e concluído | AVN p.9–15,39–40; manuais UFMA/IFRO p.15–17 |
| DOC-10 | P0 | Entrega e nota parcial | Dois faturamentos/remessas não duplicam o pedido; totais por item conciliam pedido, entregue, recebido e corrigido | SAPORE p.9; UFMA p.17 visual |
| DOC-11 | P0 | Cancelamento e devolução para ajuste | Cancelamento informa efeitos e motivo; devolução preserva histórico e permite corrigir; produção iniciada segue regra específica validada | UFMA/IFRO p.11–12 |
| DOC-12 | P0 | Atendimento ligado ao pedido | Solicitação recebe identificador, tipo, itens, anexos e histórico; usuário acompanha resposta e correção | IFRO p.18; Magalu p.18 |
| DOC-13 | P0 | Regras por organização/contrato | Janelas e prazos de duas organizações coexistem sem alterar uma à outra; nenhuma regra de órgão público é padrão global | UFMA p.5; IFRO p.5; IFSULDEMINAS p.14 |
| DOC-14 | P0 | Integridade do catálogo e origem do dado | Cada preço/estoque tem fonte e momento de consulta; indisponível não vira zero; código antigo não gera correspondência automática | Erros Secretária p.2 e catálogo p.20/25/37; instrução do usuário sobre banco somente consulta |
| DOC-15 | P1 | Biblioteca de marca e campanha | Arte tem titular, cooperativa, versão, usos e estado de aprovação; usuário encontra campanhas permitidas | Cartilha p.12–18; Aliança p.13–17 |
| DOC-16 | P1 | Curadoria por objetivo e público | Filtros por ocasião, orçamento, prazo, sustentabilidade comprovada e público produzem opções viáveis | Catálogo p.3–4; Secretária p.1–3; Manual Centro p.4–5 |
| DOC-17 | P1 | Dossiê de fornecedor | Documento mostra emissor, validade e acesso permitido; declaração não vira certificação independente | Manual Centro p.3–6 |
| DOC-18 | P1 | Recompra sem reutilizar promessa expirada | Repetir pedido cria rascunho e reconsulta estoque/preço/prazo; arte antiga requer validade de uso | SAPORE p.6,9; AVN p.23 |
| DOC-19 | P1 | Relatórios de consumo e desempenho | Exportação por campanha/PA/período concilia totais com pedidos, inclusive cancelados e parciais | SAPORE p.11; AVN p.45–46; Manual Centro p.6 |
| DOC-20 | P2 | Calendário e pedido recorrente | Agenda informa próxima execução, permite suspensão e revalida dados antes de assumir compromisso | SAPORE p.6; Magalu p.13 |

Os critérios de aceite são recomendações de engenharia de produto. Exemplos de concorrente não demonstram como seus servidores funcionam, nem garantem a consistência contábil/segurança descrita nos critérios acima.

## 9. Consequências para os dois bancos indicados pelo usuário

Esta parte deriva da instrução do usuário combinada às necessidades documentais; não é resultado de consulta aos bancos.

- **Base de produtos externa (`doufsxqlfjyuvxuezpln`):** consultar identificador, atributos, preço-base, disponibilidade e estoque conforme contrato de dados existente. O portal não deve escrever, reservar, descontar estoque, alterar preço ou atualizar cadastro nessa base. Nenhum arquivo fornece credenciais, esquema, política de acesso ou mecanismo de reserva.
- **Base própria do portal (`cfmzkthhgliqelozlmwu`):** guardar organizações, vínculos de usuário/PA, pedidos e seus itens, referências de produtos externos, versões comerciais, arte, aprovações, verbas, documentos, eventos, remessas e chamados. São propostas de responsabilidade de dados; a implementação depende da auditoria do esquema atual, evitando duplicar o que já existe.
- **Preservação do compromisso comercial:** conservar na base própria um retrato do que foi cotado/aprovado (descrição, variante, técnica, valor, data e origem da consulta). Isso não muda a fonte mestre de produto e evita reescrever o passado quando preço ou descrição externa mudarem.
- **Disponibilidade consultada não é reserva.** Para impedir promessa impossível, uma etapa operacional precisa confirmar atendimento antes de liberar compromisso final. A fonte externa somente leitura não fornece, por si, garantia de estoque reservado.
- **Preço-base não é necessariamente preço final.** O corpus mostra personalização, embalagem, composição de kit, mínimos e frete. A formação de preço final precisa respeitar as regras comerciais aprovadas e permanecer separada do valor bruto consultado.

## 10. Inconsistências e riscos concretos da documentação

| Evidência | Risco de leitura automática | Tratamento correto |
|---|---|---|
| Nome `output.pdf` e apenas páginas-imagem | Arquivo ignorado ou atribuído ao Sicoob | OCR + confirmação visual: Magazine Luiza |
| `ARKnA15FLk5gh10.pdf` | Nome opaco esconde instituição | Conteúdo e capa confirmam UFMA |
| Cartilha criada em abril/2019, expediente janeiro/2019 | Inventar atualização em abril | Data do conteúdo é janeiro/2019 |
| Relatório anual modificado em 2012 | Tratar indicadores como 2012 | Exercício é 2007; cabeçalhos das notas têm divergência editorial |
| Valores visíveis de carrinho repetidos em IFRO/UFMA/IFSUL | Inferir gasto, contrato ou SLA real por tela | São exemplos de interface; separar da regra textual institucional |
| AVN exclui personalizados na p.4 | Usar AVN como modelo integral do negócio | Reaproveitar processo; excluir restrição incompatível com brindes |
| Campanha Secretária mistura nylon/PVC | Cadastrar atributo incorreto | Confirmar fonte de produto, não completar por inferência |
| Catálogo BR Supply associa 100016 a rótulo conflitante na p.37 | Associar item errado por descrição | Validar código e ficha detalhada; não importar para catálogo atual |
| Catálogo com validade até outubro/2017 | Reutilizar preço, mínimo ou prazo em venda de 2026 | Manter somente como referência histórica |
| SLA/ocorrência divergem entre clientes | Criar um prazo universal | Parametrização por contrato/cooperativa |
| Créditos de pessoas em 2019 | Tratar nomes como decisores atuais | Verificação profissional atual separada; nenhum contato automático |
| Manual Centro contém percentuais regionais | Aplicar preferência e pontuação ao Sicoob inteiro | Escopo local e versão a confirmar |

## 11. O que falta para transformar a pesquisa em operação

Os documentos não entregam: manual oficial vigente da marca; autorização de uso e aplicação por singular; contrato comercial atual de brindes; lista de cooperativas/PAs alvo; políticas de aprovação/verba por cliente; regras para estoque e reserva na integração; composição do preço final; fonte de prazo/frete; quem fatura; padrões de arte aprovada; critérios de sustentabilidade verificáveis por produto; responsáveis reais por recebimento; SSO disponível; schema/API/permissões de ambos os bancos; situação atual do BR Supply. Também não comprovam que qualquer capacidade do README está funcionando em produção.

A sequência recomendada é usar as hipóteses acima para auditar o código existente, validar uma cooperativa piloto e testar tarefas completas: planejar uma campanha, cotar, aprovar verba e arte, confirmar viabilidade, produzir, entregar, registrar recebimento e resolver eventual divergência. Só então os critérios podem ser avaliados com tempo de tarefa, erros, retrabalho e cumprimento de data real.

## 12. Artefatos e rastreabilidade

- `documentos-fornecidos.md`: esta análise com evidências por página/célula e requisitos derivados.
- `documentos-fornecidos.json`: inventário completo, metadados, hashes e achados por arquivo.
- `semantica-fornecidos.json`: fragmento no esquema graphify, conceitos em pt-BR, ligações explícitas e inferidas e duas ambiguidades de aplicabilidade.

A extração semântica foi conduzida com **DEEP_MODE=true**. Relações `EXTRACTED` indicam que o documento apresenta o conceito; relações `INFERRED` conectam temas entre arquivos. As ambiguidades impedem transformar semelhança de marca/política em vínculo normativo não comprovado. `input_tokens` e `output_tokens` estão em **0 porque a medição não está disponível**, não como alegação de consumo zero. Nenhum código, branch ou banco foi alterado por esta frente.
