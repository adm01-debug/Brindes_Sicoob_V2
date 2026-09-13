# Plano de implementação do portal Sicoob

**100 etapas × 10 subetapas = 1.000 itens obrigatórios.** Todos começam pendentes. O plano combina estratégia de serviço, UI/UX, identidade visual, acessibilidade e operação de compras das cooperativas.

## Arquivos

- [Plano completo em PDF — 108 páginas](plano-100-etapas.pdf).
- [Plano em Markdown](plano-100-etapas.md) e [versão de leitura em HTML](plano-100-etapas.html).
- [Checklist interativo](checklist.html), com busca, filtros, evidências, dependências e exportação do progresso.
- [Planilha de acompanhamento](plano-100-etapas.xlsx), com cinco abas e fórmulas de fechamento.
- [Dados estruturados](plano.json), [etapas em CSV](etapas.csv) e [subetapas em CSV](subetapas.csv).
- [Fontes e limites de aplicação](referencias.json), [metadados da definição](metadados.json) e [verificação dos artefatos](validacao.md).

## Como acompanhar

1. Baixe a pasta e abra `checklist.html` no navegador. O GitHub mostra o código-fonte; a interação ocorre ao abrir o arquivo baixado.
2. Expanda uma etapa e registre a evidência correspondente a cada subetapa antes de marcá-la. A referência deve permitir revisão do resultado.
3. Preencha responsável nominal, revisor e evidência do entregável. Registre a validação do critério específico de aceite.
4. A etapa será concluída quando seus dez itens e todas as dependências estiverem concluídos, com os campos obrigatórios preenchidos.
5. Use **Exportar progresso** para guardar uma cópia. **Importar progresso** aceita arquivos da mesma definição e recalcula o fechamento. Importar substitui o registro local após confirmação quando ele já contém dados.

O checklist salva os registros no armazenamento local do navegador. Mudar de navegador, limpar os dados ou mover o arquivo pode exigir reimportar a cópia exportada. Não há sincronização com GitHub, bancos ou a planilha. Escolha um registro oficial para a equipe e mantenha suas cópias.

Na planilha, preencha as células verdes das abas **Subetapas** e **Etapas**. As fórmulas recalculam ao abrir em um aplicativo compatível com XLSX. Uma subetapa informada como concluída sem evidência não conta como verificada. Colunas de fórmulas e identificadores devem ser preservadas. A planilha confere preenchimento e dependências; a qualidade da evidência e a identidade dos responsáveis exigem revisão humana.

## Regra de conclusão

Cada etapa exige dez evidências, entregável verificável, responsável nominal, revisor, aceite específico validado e dependências concluídas. Revogar um requisito reabre o fechamento. Não existe dispensa automática: mudanças de escopo precisam de revisão versionada e justificativa. Marcar uma caixa ou fornecer qualquer texto não prova a execução.

Os números das etapas são identificadores, não dias. Capacidade, esforço e calendário serão definidos na etapa E010. Os responsáveis funcionais são sugestões; a equipe deve atribuir nomes durante o planejamento.

O catálogo `doufsxqlfjyuvxuezpln` permanece exclusivamente de consulta. O banco `cfmzkthhgliqelozlmwu` concentra a operação do portal. As etapas finais exigem produção e compras reais, com validação da expansão para uma segunda cooperativa.

## Base da proposta

O plano usa o [diagnóstico versionado do projeto](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/ec5cfaf5c2de844458c0105d8ad40c35f1eb9c14/docs/pesquisa/2026-09-11/dossie.md), os documentos fornecidos, referências de marca e fontes de usabilidade, acessibilidade e desempenho. O [benchmark da Promo Gifts V4](../pesquisa/2026-09-11/benchmark-promo-gifts-v4.md) complementa a execução com padrões de catálogo, orçamento e kits classificados para adoção, adaptação ou rejeição. As políticas comerciais e os ativos de marca exigem validação vigente por cooperativa, conforme as etapas correspondentes.

**Esta entrega conclui a elaboração do plano.** O checklist-base mantém as 1.000 subetapas inicialmente pendentes para impedir baixa sem evidência. A implementação local já realizada está registrada no [checkpoint de execução](../execucao/checkpoint-local-2026-09-11.md); cada item só deve ser baixado no controle oficial depois da atribuição de responsável, revisor e evidência exigida pelo próprio plano.

## Revisão atual — 12/09/2026

A [revisão atualizada](../execucao/revisao-implementacao-2026-09-12.md) confronta os 1.000 requisitos e as 32 melhorias do benchmark com o candidato `cfbcd8f`. Resultado: **88 com evidência local delimitada, 622 parciais, 145 não demonstradas/localizadas e 145 dependentes de validação externa**. Nenhuma etapa está formalmente concluída.

Foram atualizados 126 diagnósticos, verificadas 37 regressões e reproduzidas nove lacunas. A CI passou no escopo configurado, com projetos autenticados excluídos, 33 skips no smoke e oito casos flaky. Consulte a [matriz pesquisável atual](../execucao/revisao-implementacao-2026-09-12/consulta.html) e os [20 achados com condições de fechamento](../execucao/revisao-implementacao-2026-09-12/achados.md). O checklist original permanece preservado.

## Revisão histórica — 11/09/2026

A [revisão das 1.000 subetapas](../execucao/revisao-implementacao-2026-09-11.md) confronta o plano com código, evidências locais e CI do commit `6f1c5f9`. O resultado é: **76 com evidência local delimitada, 622 parciais, 157 não demonstradas/localizadas e 145 dependentes de validação externa**. Nenhuma etapa está formalmente encerrada. Esses números não são uma nota de qualidade nem um percentual de implantação.

Consulte a [matriz pesquisável](../execucao/revisao-implementacao/consulta.html), a [matriz em Markdown](../execucao/revisao-implementacao/matriz.md) ou o [CSV com os 1.000 diagnósticos](../execucao/revisao-implementacao/matriz.csv). A revisão preserva IDs, ações e checkboxes originais; registra também correções de afirmações excessivas do checkpoint e do benchmark.
