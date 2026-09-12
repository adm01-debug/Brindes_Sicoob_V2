# Revisão da implementação — plano Sicoob V2

**Não implementamos todas as melhorias.** Existe uma base relevante de catálogo, interface, permissões e transações locais, mas há funções incompletas, integrações incompatíveis e validações operacionais ainda ausentes. A aplicação não reúne evidências para declarar a meta 10/10 ou liberar a compra integral em produção.

Código auditado: [`6f1c5f94f612c13071b8dbe61b500b915e50b123`](https://github.com/adm01-debug/Brindes_Sicoob_V2/commit/6f1c5f94f612c13071b8dbe61b500b915e50b123), candidato da [PR #5](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/5). Data da revisão: 11/09/2026. Não foram aplicadas migrations remotas, realizadas compras nem efetuadas escritas no catálogo mestre nesta revisão.

## Resultado dos 1.000 requisitos

| Classificação | Subetapas | Interpretação |
|---|---:|---|
| L — evidência local suficiente no escopo descrito | 76 | Reconhece código, teste ou documento delimitado; não concede aceite formal. |
| P — atendimento parcial | 622 | Há implementação, estrutura ou estudo aproveitável, mas a ação inteira não está comprovada. |
| N — não localizado ou não demonstrado | 157 | Não foi encontrada evidência suficiente do atendimento no material revisado. Não prova inexistência absoluta em processos externos. |
| V — validação externa necessária | 145 | Depende de ambiente real, participantes, operação, política vigente ou aceite ainda não obtido. |
| **Total revisado** | **1.000** | **100 etapas, com dez diagnósticos individuais por etapa.** |

**0 de 100 etapas formalmente concluídas.** O arquivo oficial mantém 1.000 subetapas pendentes, sem evidência de baixa, responsáveis nominais, revisores ou aceite validado. Isso não significa que não houve trabalho: significa que os critérios de encerramento não foram satisfeitos. As contagens acima não são uma nota de qualidade nem um percentual de implantação; os requisitos têm pesos e naturezas diferentes.

Arquivos para conferência:

- [Consulta pesquisável dos 1.000 itens](revisao-implementacao/consulta.html), para abrir localmente no navegador.
- [Matriz completa em Markdown](revisao-implementacao/matriz.md), [CSV](revisao-implementacao/matriz.csv) e [JSON](revisao-implementacao/matriz.json), preservando a ação original de cada ID.
- [Resumo das 100 etapas](revisao-implementacao/resumo-100-etapas.md), com contagens por classificação.
- [Revisão das 32 melhorias do benchmark Promo Gifts](revisao-implementacao/benchmark-32-melhorias.md).
- [16 achados com evidência, reprodução e condição de fechamento](revisao-implementacao/achados.md).
- [Metodologia e limites](revisao-implementacao/metadados.json), [fontes e hashes](revisao-implementacao/fontes.json), [validação dos artefatos](revisao-implementacao/validacao.json).

## O que podemos aproveitar

A experiência de loja já avançou: vitrine orientada a ocasiões, busca ampliada, atalhos por orçamento unitário, cards comerciais, rolagem progressiva, ações móveis e um orçamento principal no cabeçalho. Login e demonstrações têm evidências visuais em três larguras. Isso atende parte importante da direção de UI/UX; ainda falta comprovar a jornada autenticada do comprador e estender a consistência visual às propostas, aprovações e entregas.

O projeto também contém galerias, comparação de produtos, favoritos, templates e montagem de kits, personalização, versões de orçamento, PDFs e compartilhamentos com validade/revogação. Muitos são recursos herdados do fluxo de vendedor. Devem ser adaptados e integrados ao domínio Sicoob, não reimplementados automaticamente nem contados como fluxo institucional concluído.

Na integridade, são aproveitáveis o contrato local de consulta do catálogo, os guards revisados, a autorização compartilhada, o manifesto de 101 funções e as transações de aprovação/verba. O PostgreSQL descartável demonstrou bloqueio concorrente, prevenção de consumo repetido e estorno integral. Essas evidências não abrangem toda criação de orçamento, prova de arte, distribuição, cobrança ou configuração do Supabase implantado. Consulte o [checkpoint corrigido](checkpoint-local-2026-09-11.md) e a [simulação transacional](evidencias/verba-atomica.json).

## Falhas concretas e prioridade de correção

P0 significa bloqueador para liberar o fluxo afetado no piloto. A classificação não afirma que houve incidente em produção; o ambiente produtivo não foi inspecionado integralmente.

| Achado | Prioridade | Falha e consequência |
|---|---|---|
| A01 | P0 | Logística omite `currentStatus`; o serviço rejeita. O upload pode anunciar pedido concluído sem aguardar a alteração. |
| A02 | P0 | A tela de `sicoob_orders` usa extensões com FKs para `orders`; logística, notas e pagamentos não têm integração canônica comprovada. |
| A03 | P0 | Recompra chama serviço legado, copia condições antigas e navega para rota inexistente. |
| A04 | P0 | Autosave de kit informa salvamento mesmo com erro retornado pelo Supabase. |
| A05 | P0 | Estoque soma cores diferentes; falta de verde pode ser coberta por azul. Erro de consulta não chega ao consumidor do hook. |
| A06 | P1 | Probabilidades fixas, projeção arbitrária de receita, meta fixa e presença aleatória aparecem em telas reais. |
| A07 | P0 | Versionamento de quote usa várias chamadas e `máximo + 1` no cliente; não garante versão vigente consistente sob falha/concorrência. |
| A08 | P0 | Organização muda antes do papel; resposta atrasada ou erro pode deixar competência de outro contexto na interface. |
| A09 | P1 | Histórico de busca global permanece entre contas no mesmo navegador. |
| A10 | P0 | Redação de campos remove seis nomes, mas preserva `setup_cost` e `unit_cost`; contrato comercial ainda incompleto. |
| A11 | P2 | Exportação de campanhas chama a string `format` como função. Página não localizada no mapa atual: corrigir antes de reaproveitar. |
| A12 | P1 | Auditoria/notificações de outras transições não são atômicas; erros retornados podem ser ignorados. |
| A13 | P1 | SARIF do CodeQL contém 26 alertas de 12 regras; análise concluída não equivale a triagem concluída. |
| A14 | P0 | Quality Gate falhou no ESLint; regressão E2E registrou falhas e atingiu o limite de tempo. |
| A15 | P0 | Aprovação ainda não cobre vínculo ativo, impedimentos locais, versão imutável de proposta/arte e competência específica de marca. |
| A16 | P1 | Consolidação não implementa alocação por destino, remessas parciais e conciliação de quantidades. |

Cada achado está detalhado com caminhos e linhas em [achados.md](revisao-implementacao/achados.md). Há distinção explícita entre reprodução local, contradição de contrato, risco por fluxo estático e evidência de CI. Não foram executadas explorações nem mutações em produção para provar esses casos.

## Funções sugeridas ainda sem fluxo completo

| Necessidade | O que já existe | O que impede concluir | Plano |
|---|---|---|---|
| Política da cooperativa | Papéis, alçadas e documentos históricos | Política vigente versionada; autoaprovação, exceções e mudança de regra durante a compra | E008, E012, E066 |
| Onboarding institucional | Administração de usuários e memberships | Convite com escopo, competência, prazo, revogação e concessão limitada | E016 |
| Comparação de cotações | Comparador de produtos e fornecedores do catálogo | Propostas externas equivalentes, duas/três cotações e exceção de fornecedor único | E060 |
| Aprovação de arte | Upload, mockup, painel de piloto e comentários | Prova técnica imutável, autoridade de marketing e bloqueio de produção após alteração | E053–E054, E065 |
| Verba completa | Débito/estorno transacionais | Planejado, reservado, comprometido e consumido; centro de custo, virada de período e parcial | E017, E062 |
| Delegação temporária | Papéis administrativos genéricos | Competência, vigência, impedimento, expiração e auditoria do substituto | E067 |
| Campanha operacional | CRUD genérico e templates de kit | Briefing, data do evento versus recebimento, marcos regressivos e responsáveis | E051–E052 |
| Distribuição entre PAs | Cadastros e agrupamento de pedidos | Quantidade por item/destino, frete, saldos e redistribuição | E056, E074 |
| Recebimento e ocorrência | Rastreio/foto genéricos | Quantidades recebidas, qualidade, parcial, protocolo, avaria, reposição e reabertura | E075–E077 |
| Conciliação financeira | Notas/pagamentos do modelo legado | Relação canônica pedido-remessa-documento, divergências e ajuste parcial | E078 |
| Recompra confiável | Métodos de duplicação existentes | Reconsultar oferta, destacar mudanças, rever arte/destino/verba e aprovar nova versão | E079 |
| Operação e expansão | Documentação técnica e prévia | Piloto, treinamento, compra real conciliada, métricas de campo e segunda cooperativa | E091–E100 |

Essas lacunas não serão resolvidas apenas com aparência de loja. A direção visual deve continuar, mas precisa representar estados e compromissos comerciais reais.

## O que foi executado para validar a revisão

1. Conferência das 100 etapas e 1.000 ações, com diagnóstico individual, preservando IDs, dependências e critérios originais.
2. Inspeção dirigida de rotas, hooks, serviços, migrations, componentes e evidências; registro de 118 fontes contextuais com hash. Para ausência de fluxo, foram usados também termos relacionados, além de nomes exatos de funcionalidade.
3. Seis simulações sem rede com módulos reais transpilados: status sem estado anterior, autosave com erro, estoque de outra cor, estoque indisponível, redação de custos e destino de recompra. As dependências React/Supabase foram substituídas por retornos controlados; isso não equivale a E2E ou SQL remoto. [Resultados](revisao-implementacao/simulacoes.json).
4. Consulta dos checks do commit auditado, das etapas/logs de E2E e do artefato SARIF do CodeQL. [Estado da CI](revisao-implementacao/ci.json), [26 alertas](revisao-implementacao/resumo-codeql.json).
5. Conferência das 32 melhorias do benchmark, distinguindo capacidade herdada, interface local, integração e validação operacional.
6. Geração e validação dos artefatos, sem baixa automática de conclusão. A consulta HTML possui filtros e não modifica o checklist oficial.

Comandos reproduzíveis, a partir da raiz do worktree:

```bash
node scripts/revisao/simular-lacunas.mjs
python3 scripts/revisao/gerar-matriz.py
python3 scripts/revisao/gerar-benchmark.py
```

O primeiro comando confirma a presença das lacunas no código auditado; não é um gate de aprovação do produto. Após corrigi-las, suas expectativas devem ser substituídas por testes de regressão do comportamento correto. Os geradores recriam artefatos a partir dos diagnósticos curados; não inferem implementação por busca de palavras nem auditam automaticamente um commit futuro.

## CI: evidência e limites

| Verificação do commit auditado | Resultado | Limite |
|---|---|---|
| [Qualidade](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/34643989419) | Falhou | ESLint lançou erro em `max-lines-per-function`; a causa raiz ainda exige reprodução nas condições da CI. |
| [E2E](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/34643989627) | Não aprovado | Falhas de elementos esperados em rotas públicas; job cancelado por limite de 30 minutos, duração total 30m53s. Não é apenas ausência de credenciais. |
| [Verba e visual](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/34643989401) | Passaram | Banco descartável e páginas locais de entrada/demonstração; não comprovam toda a compra real. |
| [Lighthouse](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/34643989461) | Passou | Rota `/login`; sem medição de INP de campo ou navegação autenticada completa. |
| [Bundle](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/34643989562) | Passou | Atende orçamento configurado; recursos opcionais ainda exigem medição em aparelho modesto. |
| [Gitleaks](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/34643989531) | Passou | Escopo de detecção de segredos; não valida regras comerciais, RLS ou todas as exposições. |
| [CodeQL](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/34643989511) | Análise concluída | 26 alertas de 12 regras; alcance e falsos positivos ainda não resolvidos. |
| Vercel | Prévia gerada | Não comprova backend, compra real nem implantação produtiva aprovada. |
| Supabase Preview | Ignorado | Não houve homologação de branch de banco. |
| CodeRabbit | Revisão limitada por taxa | Indicador de sucesso não representa revisão substantiva de todo o código. |

Os resultados locais também precisam de interpretação correta: smoke de **cinco cenários públicos + uma fixture**, com **33 ignorados**, não comprova login real ou compra autenticada. As nove capturas de entrada/demo não comprovam acessibilidade de todas as telas. O baseline de tipos ainda contém 1.246 erros globais; passar uma comparação sem regressão não significa typecheck integral limpo. As suítes locais mencionadas no checkpoint podem se sobrepor e não devem ser somadas como cobertura exclusiva.

## Correções no registro anterior

- Reabertas três marcas do benchmark: histórico seguro entre contextos, remoção integral de custos e atomicidade integral do orçamento/pedido.
- Restringida a afirmação de atomicidade ao que foi efetivamente simulado: decisões críticas e verba; versão comercial/arte continuam pendentes.
- Corrigida a contagem de smoke para separar fixture dos cinco cenários públicos e explicitar os 33 ignorados.
- Corrigida a afirmação de “gate crítico verde”: há testes locais aprovados, mas dois resultados remotos impeditivos.
- Preservados os valores de Lighthouse registrados, inclusive 0,93 na terceira execução local, pois o resumo não contém os relatórios brutos para reconciliar uma descrição anterior divergente. O campo de medianas deixou de afirmar que esse é necessariamente o modo de agregação do gate.
- O README raiz ainda descreve partes do sistema legado Promo Brindes/vendedor. Deve ser reconciliado com o domínio final; não foi reescrito para aparentar funcionalidades ainda ausentes.

## Sequência recomendada para fechar as lacunas

1. **Fixar o contrato operacional:** confrontar o schema real do banco próprio e reconciliar pedido, proposta, PA, organização e extensões. Resolver A02 antes de espalhar adaptações em logística, notas e pagamentos. O catálogo externo continua exclusivamente de consulta.
2. **Concluir integridade:** resolver A01, A03, A04, A05, A07, A08, A10 e A15, preservando as transações que já funcionam. Ensaiar falha intermediária, repetição e concorrência; remover dados fictícios das telas reais.
3. **Fechar uma compra institucional inteira:** briefing, oferta vigente, cotações exigidas, arte versionada, despesa, fornecedor, três destinos, parcial, ocorrência e conciliação. Definir capacidade operacional e política vigente antes de prometer o fluxo.
4. **Estender a qualidade visual:** aplicar a linguagem de loja ao percurso autenticado completo, incluindo custos, estados vazios, erros, foco, dados extensos, teclado, zoom e leitor de tela. Medir as páginas realmente usadas na compra.
5. **Restabelecer gates e homologar:** corrigir CI com diagnóstico, triagem CodeQL e contas segregadas; executar o ensaio integral e obter os aceites de negócio/marca.
6. **Liberar e acompanhar o piloto:** somente com critérios de saída atendidos, observar compra real conciliada e então validar segunda cooperativa. Registrar evidências individualmente no plano.

O próximo trabalho está definido por falhas verificáveis e critérios de fechamento. Esta revisão está concluída no seu escopo documental e técnico local; a implantação do portal continua aberta.
