# Validação do plano por cenários

A simulação antecedeu as alterações funcionais. Esta matriz registra falhas observadas, cenários que orientam os testes e dependências que exigem validação externa. Não classifica uma simulação planejada como teste executado.

## Gaps encontrados e ajuste da sequência

1. O autorizador compartilhado tinha uma falha adicional à divergência de rotas: valores de papel fora da hierarquia técnica produziam comparação com `undefined`, permitindo privilégios indevidos. A correção comum e seus testes antecedem a liberação de qualquer função técnica.
2. Bloquear botões de edição não garante catálogo somente leitura. A proteção precisa alcançar contratos, RPCs, lotes, transporte HTTP, origem e identidade no banco. A identidade externa ainda precisa de verificação administrativa de privilégios mínimos.
3. As rotas de PA estavam dentro do guard administrativo. Movê-las exige autorização explícita por rota para não abrir gestão, relatórios ou QA a qualquer comprador.
4. O código usa dois modelos de pedidos e várias colunas de verba. A migração exige inspeção do banco real, testes transacionais e compatibilidade; não basta ajustar a interface.
5. O checklist comprova preenchimento, não veracidade. A homologação não pode confundir testes locais, métricas sintéticas ou jobs pulados com produção.
6. O catálogo está acessível à identidade do CLI por inventário de projeto; o projeto do portal não aparece nessa identidade. O conector Supabase aponta para outro projeto e os gateways alternativos recusaram acesso. Nenhuma credencial foi exportada do endpoint vulnerável.

## Matriz de cenários

| ID | Cenário | Etapas | Estado e encaminhamento | Evidência |
|---|---|---|---|---|
| S01 | Chave fixa extraída do código aciona exportação de credenciais | E002 | Reproduzido em VM; endpoint substituído por resposta 410 | [Registro](evidencias/simulacao-credenciais-antes.json) |
| S02 | Papel comprador solicita função técnica | E012, E018 | 13 falhas reproduzidas; 26 cenários passaram após correção | [Registro](evidencias/autorizacao-depois.tap) |
| S03 | Papel desconhecido ou ordem diferente dos papéis | E012 | Reproduzido e corrigido no autorizador compartilhado | [Registro](evidencias/autorizacao-depois.tap) |
| S04 | Escrita direta no catálogo por usuário privilegiado | E003 | Bloqueada no contrato, permissões e transporte local | [Registro](evidencias/catalogo-depois.tap) |
| S05 | Mutação escondida no lote de consultas | E003 | Bloqueada antes de acessar a origem | [Registro](evidencias/catalogo-depois.tap) |
| S06 | RPC com associação ou preenchimento de produtos | E003 | Removida da lista; RPCs de consulta usam GET | [Registro](evidencias/catalogo-depois.tap) |
| S07 | URL externa errada ou redirecionamento do catálogo | E003, E020 | Transporte recusa origem, serviço e método indevidos | [Registro](evidencias/catalogo-depois.tap) |
| S08 | Lote pede tabela sensível ou fornece chave de cache alheia | E003, E086 | Contrato e cache corrigidos localmente; integração real ainda depende da origem | [Registro](evidencias/catalogo-depois.tap) |
| S09 | Catálogo sem configuração retorna lista vazia | E003, E028 | Ponte passou a falhar de forma explícita; cenários locais aprovados | [Registro](evidencias/catalogo-depois.tap) |
| S10 | Comprador PA navega por rota interna ao guard administrativo | E014 | Rotas recompostas por política explícita e verificadas por papel | [Registro](evidencias/rotas-e-permissoes.json) |
| S11 | Papéis carregando, consulta falha ou sessão troca de usuário | E015 | Corrida de sessão, erro e recuperação verificados em três cenários | [Registro](evidencias/rotas-e-permissoes.json) |
| S12 | Comprador edita o perfil e tenta obter acesso administrativo | E012, E013 | Permissão deve usar user_roles; teste de banco pendente | Pendente |
| S13 | Dois pedidos disputam o último saldo de verba | E017, E018, E064 | Bloqueio de linha e débito único aprovados em PostgreSQL descartável | [Registro](evidencias/verba-atomica.json) |
| S14 | Aprovação repetida após timeout da primeira resposta | E018, E064 | Confirmação repetida bloqueada sem segundo débito | [Registro](evidencias/verba-atomica.json) |
| S15 | Preço ou quantidade muda durante a aprovação | E058, E059, E064 | Controle de versão recusa decisão sobre estado antigo | [Registro](evidencias/verba-atomica.json) |
| S16 | Arte alterada depois de autorizada | E054, E065 | Nova versão preserva a anterior, volta a `pending` e bloqueia produção até novo aceite; alteração após logística é recusada | [Registro](evidencias/financeiro-arte-sicoob.json) |
| S17 | Arte aprovada sem despesa autorizada | E064, E065, E072 | Pedido pendente permanece sem liberação mesmo com arte aprovada; pedido confirmado também exige a arte vigente aprovada | [Registro](evidencias/financeiro-arte-sicoob.json) |
| S18 | Cancelamento parcial ou repetido libera verba duas vezes | E017, E069 | Estorno único e repetição bloqueada no teste transacional local | [Registro](evidencias/verba-atomica.json) |
| S19 | Verba ausente, negativa, de outro PA ou período encerrado | E017, E062 | Saldo insuficiente e escopo alheio bloqueados; períodos reais ainda dependem da política vigente | [Registro](evidencias/verba-atomica.json) |
| S20 | Usuário de uma cooperativa fornece UUID de outra | E013, E068, E086 | Políticas usam o pedido pai e o vínculo ativo; leitura e decisão por UUID alheio retornam zero | [Registro](evidencias/rls-cruzada-sicoob.json) |
| S21 | Delegação vence durante a análise | E067 | Vigência, revogação, escopo, autoridade do titular e conflitos são reavaliados no servidor a cada decisão; ator real e origem ficam auditados | [Registro](evidencias/delegacao-aprovacao-sicoob.json) |
| S22 | Recompra reutiliza preço ou estoque antigo | E073, E079 | Nova consulta e validade explícita; nenhuma reserva no catálogo mestre | **Concluído em 2026-09-27** — recompra de pedido ou orçamento reconsulta preço, estoque e mínimos no catálogo externo, registra validade de cinco minutos e diferença de preço, mantém o estoque informativo e sem reserva, bloqueia transição com snapshot vencido e permite revalidação atômica. Simulação PostgreSQL 16 aprovada; migrations confirmadas no PostgreSQL 17.6 canônico; Edge `sicoob-reorder` ativa com JWT obrigatório e smoke autenticado; interface publicada. O smoke também encontrou e corrigiu a tabela de preferências ausente que abortava novos cadastros. Evidência: [`evidencias/recompra-sicoob.json`](./evidencias/recompra-sicoob.json). |
| S23 | Falha entre cabeçalho e itens deixa pedido incompleto | E059, E061 | Criação atômica, validação de totais e recuperação | Pendente |
| S24 | Entrega em vários PAs apresenta divergência de quantidade | E056, E074, E076 | Soma distribuída, recebimento parcial e saldo por destino | Pendente |
| S25 | Upload de arte tem tipo falso ou arquivo malformado | E053, E054, E086 | Edge Function canônica inspeciona assinatura, fechamento e conteúdo ativo antes do hash e do registro | [Registro](evidencias/atomicidade-orcamento-e-inspecao-arte-20260927.md) |
| S26 | Convite expirado ou vínculo removido mantém sessão | E016, E013 | Expiração e revogação precisam valer no servidor | Pendente |
| S27 | Relatório sem dados apresenta confiança ou economia fixa | E009, E089 | Exibir ausência de medição; remover indicadores fabricados | Pendente |
| S28 | Formulário falha com teclado, zoom ou leitor de tela | E027, E037, E081 | Demonstrações passaram axe; teclado, zoom e leitor de tela da jornada real permanecem pendentes | [Resultado visual](evidencias/visual/demo-resultado.json) |
| S29 | Cabeçalho fixo esconde foco ou ações em tela estreita | E032, E082, E083 | Demonstrações sem overflow em 320, 390 e 1440 px; telas reais longas ainda exigem homologação | [Resultado visual](evidencias/visual/demo-resultado.json) |
| S30 | CI aprova porque credencial de teste está ausente | E019, E090 | Simulação local de verba e cenários sem segredos tornaram-se obrigatórios; testes reais continuam bloqueantes na homologação | [.github/workflows/sicoob-ci.yml](../../.github/workflows/sicoob-ci.yml) |
| S31 | Migrations locais divergem do banco publicado | E011, E020, E091 | Comparar inventário antes de aplicar; sem migração cega | Pendente |
| S32 | Deploy compila, mas login ou primeira compra falha | E095, E096, E097 | Build local aprovado; publicação continua condicionada ao smoke test real e à reconciliação | [Checkpoint](checkpoint-local-2026-09-11.md) |
| S33 | Política da segunda cooperativa difere da primeira | E008, E099 | Parâmetros por cooperativa, sem universalizar alçada ou cotação | Pendente |
| S34 | Nota 10/10 é atribuída sem medições ou participantes reais | E009, E090, E100 | Nota só é admissível com evidência em cada dimensão e sem bloqueio crítico | Pendente |

## Critérios para avaliar a meta 10/10

A equipe deverá demonstrar: segurança e isolamento; integridade de verba e decisões; confiabilidade do catálogo; conclusão da jornada de compra; conformidade de marca; usabilidade observada; acessibilidade; desempenho de campo ou limitação de amostra; recuperação e suporte; operação real e expansão. Cada dimensão exige critérios mensuráveis definidos com os responsáveis. Uma dimensão não medida permanece não verificada; risco crítico impede liberação mesmo quando as demais estão aprovadas.

## Dependências externas abertas

- Acesso administrativo ao projeto `cfmzkthhgliqelozlmwu`, para inventário, logs, homologação e implantação.
- Privilégios de leitura confirmados na origem `doufsxqlfjyuvxuezpln`.
- Cooperativa piloto, domínio produtivo e responsáveis por política de compras e marca.
- Participantes consentidos, aceite das políticas comerciais e compras reais para as etapas finais.

Essas dependências não impedem correções e testes locais. Impedem declarar implantação completa e as 100 etapas concluídas.

## Referências técnicas das proteções de leitura

RPCs do Supabase admitem a opção GET, e o PostgREST executa GET/HEAD em transações de leitura. Funções incompatíveis precisam de revisão; não há retorno automático a POST. [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc), [Transações PostgREST](https://postgrest.org/en/stable/references/transactions.html).
