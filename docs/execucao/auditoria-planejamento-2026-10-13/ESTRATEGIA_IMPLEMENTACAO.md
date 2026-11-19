# Estratégia para concluir as melhorias auditadas

**Base:** auditoria de 13/10/2026, main `fff0b4cb6`. **Situação:** proposta técnica de execução; este documento não aplica correções nem encerra requisitos.

A melhor abordagem é trabalhar por jornadas completas e dependências, usando as 56 frentes como backlog principal. Os 682 registros preservam as origens; as 100 etapas existentes preservam os critérios de aceite. Não é necessário criar outra lista extensa ou transformar cada repetição documental em um novo ticket.

O primeiro objetivo é demonstrar uma compra sintética íntegra: comprador encontra o produto, monta o orçamento, obtém aprovação, converte em pedido e acompanha arte, entrega e fechamento financeiro, sem acesso entre cooperativas e sem indicadores fictícios apresentados como resultado real.

## 1. Preparação curta e controles permanentes

Antes de modificar o contrato de um módulo:

1. Fixar a referência de código/banco, preservar trabalho local e separar documentos históricos de decisões vigentes.
2. Definir um ticket por resultado verificável, mantendo os IDs Gxx, Txxx e as origens históricas relacionadas.
3. Classificar o requisito como obrigatório, opcional ou retirado formalmente. Preservar o catálogo mestre externo somente leitura. Resolver contradições sobre Bitrix, passkeys, white-label e integrações antes de desenvolvê-las.
4. Preparar personas de duas cooperativas, dados sintéticos e testes negativos. Usar banco descartável para simulações e ambiente segregado para homologação conectada. O canônico continua sendo de construção.
5. Registrar a falha antes do patch, incluindo ator, estado inicial, operação, resposta e efeito persistido.

A preparação documental deve ser curta e ocorrer junto à contenção dos P0. Não precisa esperar a limpeza de todo o legado para corrigir uma exposição de conta ou uma permissão financeira indevida.

## 2. Ordem de implementação

| Onda | Resultado a entregar | Frentes principais | Critério de saída |
|---|---|---|---|
| 1 — Segurança e integridade | Impedir confirmação indevida de e-mail, acesso a verba de outra cooperativa, aumento do próprio limite e alteração indevida de proposta aprovada; acertar a autoridade de papéis/vínculos. | G01, G04, G05, G27 | Negativas demonstradas no servidor para usuário anônimo, inativo, outra cooperativa, outro PA e estado aprovado; positivas legítimas continuam funcionando. |
| 2 — Orçamento até pedido | Corrigir guard/escritores e chave de evidência; conectar detalhe, PDF e link público; preservar seleção, versão, idempotência, regras comerciais, política e verba. | G02, G03, G10, G12, G16, G17, G18, G19 | Orçamento criado e editado, aprovado uma única vez e convertido uma única vez; concorrência e falha intermediária não deixam efeitos parciais. Políticas/saldos são verificáveis. |
| 3 — Serviços que sustentam a jornada | Fechar scanner/quarentena, Realtime, worker, e-mail de negócio, Auth por ambiente, webhooks, agendamentos e autorização das Edge Functions. | G06, G07, G08, G09, G23, G28, G35, G36, G37 | Recibos e erros reconciliáveis; arquivo não inspecionado não é liberado; tentativa não vira confirmação; falha do cron aparece na operação. |
| 4 — Loja, kits e recompra | Corrigir filtros e links, salvar kit com estado válido, verificar capacidade física/prazo, comparar diferenças da recompra e conectar a experiência por papel em desktop e celular. | G11, G13, G20, G21, G29, G30, G31, G32, G48 | Compra a partir do catálogo preserva produto, quantidade, preço, personalização e contexto. Navegação e teclado funcionam. Não há formulário oferecendo escrita no catálogo mestre. |
| 5 — Operação institucional completa | Arte por item/versão, campanha, destinos, expedições parciais, recebimento, avarias/devoluções e conciliação. Integrações financeiras externas entram apenas se mantidas no escopo. | G22, G24, G25, G26, G49 | Um pedido distribuído termina com quantidades, documentos e saldos reconciliados, inclusive no cenário de entrega incompleta. |
| 6 — Inteligência e colaboração | Conectar BI, metas/dossiê, IA/voz e recursos colaborativos aprovados ao dado real e aos provedores escolhidos. | G14, G15, G33, G34 | Dado real, estimativa, vazio, erro e demonstração são distintos; nenhum alerta de negócio nasce de mock; configuração salva produz efeito verificável. |
| 7 — Aceite e piloto | Validar marca e uso com compradores/marketing, operar em duas cooperativas, comprovar recebimento/financeiro e acompanhar a janela de estabilidade exigida. | G56 | Aceites e evidências de uso real registrados por responsáveis. Tempo de observação não decorrido permanece pendente. |

**Durante todas as ondas:** G38–G47 e G50–G55 cobrem ledger, testes, CI, publicação, PWA, observabilidade, recuperação, privacidade, decisões, rastreabilidade, Git, documentação e dívida técnica. O mapeamento das ondas e dessa trilha transversal cobre exatamente as 56 frentes.

Esta ordem admite antecipação por dependência. Por exemplo, o callback de Auth necessário para a aprovação deve ser corrigido na onda 2; a configuração do scanner precisa estar pronta antes de homologar arte; indicadores simulados que possam induzir uma decisão devem ser identificados ou ocultados imediatamente, mesmo que o BI completo fique para a onda 6.

## 3. Tamanho e conteúdo de cada lote

Cada lote deve produzir um resultado revisável e uma mudança coerente. Evitar juntar permissões, redesign completo e vários módulos comerciais no mesmo PR. Uma jornada grande pode exigir vários PRs dependentes, ligados ao mesmo aceite final.

Cada ticket precisa conter:

- IDs da frente, etapa e requisitos de origem;
- comportamento atual, comportamento esperado e ator autorizado;
- tabelas, funções, triggers, Edge Functions, rotas e consumidores afetados;
- cenários positivo, negativo, repetição, concorrência e falha parcial aplicáveis;
- migration necessária, ordem de publicação e contingência;
- evidência esperada para código, banco, interface e operação;
- executor e revisor, com decisão de negócio identificada quando necessária.

Use os estados **a implementar → em desenvolvimento → validado localmente → aplicado em construção → homologado → aceito**. Um commit não pula as etapas seguintes. Retirada formal é um estado separado, com justificativa e tratamento da promessa que aparecia na interface/documentação.

## 4. Como evoluir o banco

1. Reproduzir o comportamento sobre o contrato cumulativo pertinente, incluindo triggers e policies posteriores. O defeito de aprovação/conversão mostrou que uma fixture antiga incompleta pode aprovar um teste enganoso.
2. Criar uma migration nova para cada mudança coerente; manter imutáveis as já aplicadas. Validar seu efeito, não apenas a presença de um marcador textual.
3. Ensaiar permissões, dados sintéticos, concorrência, rollback transacional e compatibilidade antes de aplicar no canônico de construção.
4. Publicar mudanças compatíveis primeiro, migrar consumidores depois e retirar contratos antigos apenas quando não forem mais usados. Preparar restauração/contingência para alterações que mudem dados existentes.
5. Após revisão e integração do PR, aplicar o lote exato validado e conferir ledger, funções, triggers, RLS, grants e efeitos. Publicar as Edge Functions e o frontend correspondentes na ordem necessária.
6. Repetir a jornada conectada e suas negativas no destino autorizado. Registrar SHA, versão da migration, versão/hash da função, data e resultado persistido.

As **491 diferenças históricas do ledger não são uma fila de 491 migrations prontas para aplicar**. Cada uma exige comparação do efeito já existente e decisão de reconciliação. Nunca reaplicar o histórico inteiro nem marcar uma migration como aplicada apenas para fazer o gate passar.

## 5. Testes que realmente encerram uma correção

Para cada jornada crítica, cobrir:

- **Quem:** anônimo, papel permitido, papel negado, inativo, outra cooperativa, outro PA e privilégios elevados quando aplicáveis.
- **Quando:** antes/depois da aprovação, versão antiga, token expirado/consumido, sessão encerrada e contexto trocado.
- **Repetição:** clique duplo, retry após timeout, resposta repetida do provedor e eventos fora de ordem.
- **Concorrência:** dois usuários aprovando ou consumindo a mesma verba, duas abas e disputa pelo mesmo documento.
- **Falha:** rollback sem efeitos parciais, provedor indisponível, scanner inconclusivo, erro de Storage, entrega incerta e recuperação.
- **Uso:** caminho pelo menu e pelo produto, informação compreensível, estado vazio, feedback de erro e acesso por teclado/celular.

Transformar as reproduções exploratórias da auditoria em regressões que reprovem quando a regra do negócio falhar. Não usar a mera produção de um JSON ou um HTTP 200 como aprovação. Expandir cobertura por risco e contrato; o percentual medido em nove arquivos não representa o produto inteiro.

## 6. Coordenação e paralelismo

Manter uma coordenação responsável pela ordem dos contratos, um executor por lote e revisão independente das alterações críticas. Cada frente de trabalho usa worktree/branch isolados.

É possível paralelizar componentes independentes, documentação e preparação de testes depois de definir os contratos. **Serializar a aplicação de migrations e as mudanças de configuração no banco canônico.** Evitar dois lotes alterando simultaneamente papéis, status do orçamento ou ciclo da verba sem reconciliação prévia.

O fluxo é branch → commit → PR → checks → revisão → integração → aplicação/publicação do lote → prova conectada. Checks de uma auditoria documental não certificam as correções de negócio ainda não feitas.

## 7. Critério de conclusão

Uma frente só pode ser encerrada quando o requisito obrigatório estiver acessível pelo consumidor previsto, autorizado no servidor, persistindo corretamente e funcionando no destino adequado, com testes positivos/negativos e aceite específico. A matriz recebe links de evidência e a data; números e checkboxes não substituem esses links.

O relatório de progresso deve mostrar: P0 abertos, jornadas homologadas, falhas/regressões, migrations aplicadas e verificadas, dependências externas e requisitos retirados formalmente. Evitar uma nota subjetiva “10/10” ou um percentual calculado pela quantidade de arquivos/checklists.

**Primeiro lote recomendado:** corrigir a confirmação alternativa de e-mail e as permissões de verba, com regressões de duas cooperativas e gerente/inativo. Em seguida, congelamento da proposta aprovada e compatibilidade guard → aprovação → conversão, até obter a primeira jornada comercial íntegra. Esse lote é a recomendação de início, não uma afirmação de execução.
