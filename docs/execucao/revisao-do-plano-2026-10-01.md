# Revisão do plano e das melhorias em 1 de outubro de 2026

**O plano não está integralmente implementado.** Há correções incorporadas à `main`, correções ainda restritas ao PR #75, funcionalidades parciais ou não localizadas e aceites sem comprovação. Esta revisão também reproduziu uma falha de autorização no fluxo de status dos orçamentos. O sistema permanece em construção.

Referência de código: `f1b4e0dd0ff33e5c78742ffa9d2cf5a7385d8e13`. Candidato separado: PR #75, `5d6a392643c3500dac74aca37bf5d4a93134de28`, aberto e com conflito de merge na coleta. A revisão foi realizada em worktree isolado. O checkout original estava 54 commits atrás da `main` remota, com alterações locais e arquivos não rastreados, e foi preservado.

## Escopo e critérios

A [matriz das 150 etapas](revisao-plano-20261001/matriz-150.md) reavalia cada etapa do plano de 27/09 contra as fontes atuais. Preserva ação, cenário, aceite e dependências originais no [JSON](revisao-plano-20261001/matriz-150.json) e oferece [CSV](revisao-plano-20261001/matriz-150.csv) para acompanhamento. A [matriz dos 100 workflows](revisao-plano-20261001/workflows-100.md) trata o plano complementar separado, inclusive premissas superadas.

`I` significa implementação evidenciada no escopo descrito; `P`, implementação parcial; `N`, não localizada no escopo pesquisado; `V`, validação insuficiente; `F`, operação futura. Nenhuma classificação equivale automaticamente a aceite institucional ou publicação comprovada. Uma etapa pode ter avançado e continuar parcial.

| Situação no plano principal | Etapas |
|---|---:|
| Implementação evidenciada no escopo descrito | 19 |
| Parcial | 92 |
| Não localizada | 10 |
| Validação insuficiente | 25 |
| Operação futura | 4 |
| **Total** | **150** |

Em relação à matriz anterior: P043 e P094 avançaram para implementação evidenciada; P057 passou de não localizada para parcial; P030 passou de validação insuficiente para parcial diante das falhas concretas atuais. P034 e P037 voltaram de implementação evidenciada para parcial pela falha de autorização reproduzida. A soma de classificações não representa percentual de produto pronto.

O plano complementar de workflows tem **12 etapas com implementação evidenciada, 27 parciais, 47 não localizadas, sete sem validação suficiente e sete com premissa superada ou solução substituída**. Por exemplo, os runners próprios restabeleceram execução; a proposta antiga de suspender todos os workflows enquanto faltavam minutos precisa ser revista. Premissa superada não é aceite automático.

Os 1.000 subitens do plano original e os diagnósticos históricos estão referenciados pelos planos consolidados, mas não receberam 1.000 novos ensaios individuais nesta rodada. O plano de 150 etapas continua com 150 estados `Planejada`, 900 checkboxes falsos, responsáveis/revisores nominais não preenchidos e nenhuma data de aceite. Isso é uma deficiência de acompanhamento; não significa ausência de todas as funcionalidades. [Inventário](revisao-plano-20261001/inventario-planos.json).

## Correções já incorporadas que devem ser preservadas

O PR #74 foi incorporado. A `main` preserva a versão conhecida pelo editor ao salvar, acrescenta criação idempotente por chave, recupera rascunhos por usuário com envelope e retenção, inclui unidades por item na chave de previsão dos kits e pagina pedidos no relatório logístico com filtro de status no servidor. Os testes de ícones que falhavam na auditoria anterior também passaram nesta rodada.

Esses avanços substituem as respectivas constatações antigas de ausência. Permanecem pendências nas mesmas jornadas: autorização de status, proteção da tabela de idempotência, estabilidade da intenção após timeout, conflito entre abas, identidade dos itens editados e ordenação/paginação das remessas. A matriz indica a diferença entre o avanço e o aceite ainda aberto.

## Falhas e lacunas que impedem o fechamento

| Prioridade | Etapas | Constatação atual | Prova necessária para encerrar |
|---|---|---|---|
| P1 | P034/P036/P037/P143 | A RPC de status aceita repetição do status por ator fora do escopo. Em fixture PostgreSQL 17, o usuário de outra Singular tinha zero linhas visíveis e `can_manage_quote_scope=false`; mesmo assim, `sent → sent` incrementou a versão e gravou um evento com esse ator. | Autorizar o orçamento antes de qualquer retorno por mesmo status; provar negação de leitura e escrita para outro vendedor/PA/Singular, inclusive em lote e retry. |
| P1 | P042/P048/P058/P144 | A tabela `quote_save_idempotency` da migration integrada permite INSERT/UPDATE/DELETE ao próprio ator. O PR #75 contém endurecimento, mas não foi integrado. As chaves de recompra ainda são geradas a cada chamada na `main`. | Recusar alteração direta do registro de intenção e manter a mesma chave após timeout; provar resultado único e rejeição de payload divergente. |
| P1 | P044/P045/P102 | O salvamento atômico não encerra preservação de IDs/vínculos de itens nem validação integral de parcelas comerciais recebidas no payload. | Testar arte/pedido já vinculados e adulteração de preços, custos de personalização e totais no servidor. |
| P1 | P124/P125/P126 | O editor consulta verba usando `clientId` como PA e não bloqueia adequadamente erro/ausência. O serviço consulta PA sem competência; a atualização pode atingir várias competências. | Usar PA e período corretos, falhar de forma segura e provar estornos/fechamento por competência. Correções candidatas no PR #75 não contam como entrega integrada. |
| P1 | P014/P141/P144 | O gate TypeScript atual falha: 179 diagnósticos contra baseline 166, com regressão em 15 arquivos. PR #75 está aberto, conflitante e com E2E falho. | Resolver conflitos preservando mudanças recentes, corrigir regressões e validar todos os gates sobre o mesmo candidato. |
| P1 | P021–P028/P144 | SQL remoto indisponível; o workflow de drift de 01/10 falhou por `ENOTFOUND`. O pipeline de aplicação do PR #75 ainda não existe na `main`. | Restabelecer acesso ao projeto canônico, confrontar ledger e definições atuais e aplicar somente diferenças verificadas. Não afirmar aplicação das três migrations sem consulta nova. |
| P1 | P015/P143/P144 | GitHub não exige status checks para merge; bypass administrativo permanece possível. O domínio Vercel responde sem CSP, embora a configuração esteja versionada. | Exigir checks adequados e conferir a configuração efetivamente servida pelo deployment associado ao domínio. |
| P1 | P075/P107/P109 | Ingestão/scanner existem, mas a configuração e homologação atuais do scanner não foram verificadas. A evidência anterior registrava ausência de configuração. | Demonstrar arquivo válido, malicioso sintético, timeout e parecer inválido no serviço autorizado; publicação e HTTP 401 não provam upload operacional. |
| P2 | P061–P070 | Notificação de orçamento continua dependente de escrita posterior do navegador; a outbox de pedidos não prova cobertura desse fluxo. | Criar intenção transacional, deduplicar, observar falhas e conferir paridade individual/lote. |
| P2 | P051–P060/P111/P120 | Autosave e logística avançaram; conflito entre abas, ordenação estável e paginação completa das remessas ainda precisam fechamento. | Ensaiar troca de usuário/unidade, respostas atrasadas, empates de ordenação e volumes acima da primeira página. |
| P2 | P087/P088/P095/P096/P113/P122/P123/P127 | Continuam lacunas em propostas institucionais, exceção de fornecedor, embalagem física, importação de distribuição, marcos de campanha, colaboração Magic Up e consumidores das views administrativas. | Entregar os fluxos completos ou registrar decisão formal de retirada de escopo, sem tratar tabela isolada como funcionalidade pronta. |
| P2 | P118–P130 | Cancelamentos, avarias, créditos, conciliação e fechamento de campanha têm partes implementadas, sem comprovação do ciclo integral. | Percorrer contratado → faturado → entregue → pago, incluindo parcialidades, mudança de competência e compensações. |
| P2 | P131–P140/P145–P150 | Pesquisa com usuários, aceite de marca, acessibilidade integral, compra sintética completa, restauração e piloto ainda não estão certificados. | Ensaios conectados e aceite dos responsáveis; operação real permanece futura. |

### Falha de autorização reproduzida

A causa na `main` é o retorno antecipado de `assert_quote_transition` quando o status já coincide, antes da exigência de autoridade. `bulk_update_quote_status_atomic` continua atualizando a linha e o histórico. No PR #75, o retorno antecipado passou para a própria RPC: evita a escrita, mas devolve ID/status/versão a quem não tem escopo, inclusive com versão esperada inventada.

A [reprodução](revisao-plano-20261001/status-fora-escopo.json) usa dados sintéticos. Uma [revisão independente](revisao-plano-20261001/revisao-independente-status.json) confirmou o defeito no código e a ausência de override posterior. Isso comprova o comportamento das migrations versionadas; **não demonstra que o banco remoto está atualmente com essas mesmas definições**. O PR #75 precisa corrigir esse caminho antes de ser aplicado.

Sonda reproduzível, que cria e remove apenas um contêiner PostgreSQL descartável:

```bash
python3 docs/execucao/revisao-plano-20261001/reproduzir-status-fora-escopo.py
```

## Testes e evidências desta revisão

| Verificação | Resultado e limite |
|---|---|
| Vitest | 5.575 testes aprovados; 112 ignorados. 400 arquivos aprovados e oito ignorados. Nenhuma falha nessa execução. |
| Cobertura | 93,95% statements e 86,79% branches **nos nove arquivos configurados**; não representa cobertura global da aplicação. |
| Cenários Node | 202 aprovados, nenhuma falha. |
| TypeScript | Falha: 179 diagnósticos, baseline 166 e 15 arquivos com regressão. |
| Lint | 3.265 erros globais. Gate diferencial passou com zero arquivos de aplicação alterados; não é lint global limpo. |
| Testes críticos ignorados | 41 ocorrências declaradas contra limite 44. Não significa 41 novos testes executados. |
| Referências de runtime | 24 bloqueantes contra inventário de 22/09; 2.064 arquivos e 1.106 referências examinados. Cache antigo não prova ausência real no banco. |
| Build | Passou, com alertas de chunks/imports. Não comprova configuração do artefato remoto. |
| PostgreSQL isolado | Atomicidade de salvamento e RLS de pedidos passaram nos cenários existentes; cenário adversarial de status revelou a falha descrita. |
| HTTP sem sessão | Cinco funções Sicoob responderam 401; Vercel respondeu 200, sem CSP e com meta `noindex`. Não houve jornada autenticada remota nova. |

[Resumo estruturado dos testes](revisao-plano-20261001/verificacoes.json), [TypeScript](revisao-plano-20261001/typecheck.txt), [runtime](revisao-plano-20261001/runtime.json) e [sondagens HTTP](revisao-plano-20261001/http.json).

### Cuidados com a interpretação das evidências

O simulador `simular-rls-cruzada-sicoob.py` executa um banco local sem rede, mas copia `producao_verificada`, `postgres_remoto` e outros campos de um JSON histórico. A saída desta rodada veio com `producao_verificada=true` por essa herança. O [registro desta revisão](revisao-plano-20261001/rls-local.json) separa esses campos e marca a execução atual como local. O simulador de delegação também preserva metadados remotos históricos. Esses campos precisam ter origem/data explícitas; não podem ser usados como nova validação remota.

O workflow “Monthly DB Audit” de 01/10 ficou verde para planos de consultas genéricas com `LIMIT 100`. Isso não equivale a reconciliação do schema ou homologação das jornadas. O compliance falhou ao listar nove tabelas sem policies; seu scan não reportou tabelas sem RLS. Isso não prova vazamento, nem autoriza criar policies permissivas apenas para aprovar o check. [GitHub](revisao-plano-20261001/github.json).

Há ainda caminhos em que um workflow verde não prova execução bem-sucedida de todos os controles: o workflow Sicoob tolera erros de simulação/visual, Lighthouse tolera falha da auditoria, E2E pode ser pulado por ausência de credenciais e o script de performance registra erros de RPC sem falhar o processo. Os testes de smoke que têm checagem explícita posterior de resultado foram distinguidos desses casos na matriz. Os nomes de quatro secrets E2E já existem; isso não demonstra validade das contas nem segregação do ambiente. [Matriz de workflows](revisao-plano-20261001/workflows-100.md) e [metadados GitHub](revisao-plano-20261001/workflows-github.json).

## GitHub e banco canônico

O PR #75 conserva correções úteis de contratos, verba, recompra, notificações e migrações. Contudo, continua aberto, com conflitos e E2E falho. Nesse E2E, o teste do comparador falhou e os uploads também falharam por quota de artefatos. A `main` recebeu depois uma correção do smoke; isso não torna verde o SHA antigo do PR. [Estado do PR](revisao-plano-20261001/pr75.json).

O conector oficial recusou SQL e consulta do projeto por falta de permissão. O MCP customizado inicializou, mas seus testes de saúde/conexão responderam `Management API 401: Unauthorized`. O drift de migrations também está falhando por resolução de host. Não foi possível certificar o ledger, definições de funções, secrets, RLS ou paridade Edge atuais por nova consulta administrativa. [Limite de acesso](revisao-plano-20261001/acesso-banco.json).

Uma das três migrations candidatas já está no código de `main` (`20260928162048`); as de endurecimento e notificação (`20260928173500` e `20260928182000`) estão no PR #75. Presença no GitHub não significa aplicação no banco. A evidência administrativa de 28/09 permanece histórica.

## Ordem de fechamento

1. Corrigir autorização de status, incluindo repetição, lote e acesso de outra Singular; ampliar o teste que deixou esse caminho passar.
2. Revisar e reconciliar o PR #75 com a `main` atual; preservar os avanços do PR #74 e corrigir TypeScript, idempotência e verba.
3. Recuperar a consulta administrativa do banco, comparar estado real e aplicar migrations somente após validar o candidato e suas dependências.
4. Fechar notificações, identidade dos itens, rascunhos, paginação, scanner e integrações operacionais.
5. Completar as funções ausentes e os ciclos financeiros/logísticos, depois executar homologação integral e atualizar cada aceite do plano.

Esta entrega é uma revisão com evidências. Não altera schema, dados remotos, regras de proteção nem aplica as correções candidatas. Não há base para declarar 10/10 ou encerramento integral.
